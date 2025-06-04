import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { useAuth } from '../components/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'

export default function SubmitRecipe() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [photos, setPhotos] = useState([])

  // Logger hook to capture logs
  const addLog = (level, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    }
    setLogs(prev => [logEntry, ...prev].slice(0, 100)) // Keep last 100 logs
    
    // Call original logger
    switch(level) {
      case 'debug': logDebug(message, data); break;
      case 'info': logInfo(message, data); break;
      case 'warning': logWarning(message, data); break;
      case 'error': logError(message, null, data); break;
      case 'interaction': logUserInteraction(message, 'submit-recipe', data); break;
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    addLog('debug', `Changement de champ: ${name}`, { 
      fieldName: name, 
      valueLength: value.length,
      isEmpty: !value.trim()
    })
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    addLog('info', 'Début de la validation du formulaire recette')
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le nom de la recette est obligatoire'
      addLog('warning', 'Validation échouée: nom de la recette manquant')
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire'
      addLog('warning', 'Validation échouée: description manquante')
    }
    if (!formData.ingredients.trim()) {
      newErrors.ingredients = 'Les ingrédients sont obligatoires'
      addLog('warning', 'Validation échouée: ingrédients manquants')
    }
    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Les instructions sont obligatoires'
      logWarning('Form validation failed: missing instructions', { component: 'submit-recipe' })
    }
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est obligatoire'
      logWarning('Form validation failed: no photos', { component: 'submit-recipe' })
    }
    
    // Validation des photos traitées
    if (photos.length > 0) {
      const processingPhotos = photos.filter(photo => photo.processing)
      const errorPhotos = photos.filter(photo => photo.error)
      const processedPhotos = photos.filter(photo => 
        photo.processed && 
        photo.imageBytes && 
        Array.isArray(photo.imageBytes) &&
        photo.imageBytes.length > 0
      )
      
      if (processingPhotos.length > 0) {
        newErrors.photos = `Attendez que ${processingPhotos.length} photo(s) finissent d'être traitées`
      } else if (errorPhotos.length > 0) {
        newErrors.photos = `${errorPhotos.length} photo(s) ont échoué. Supprimez-les et réessayez.`
      } else if (processedPhotos.length === 0) {
        newErrors.photos = 'Aucune photo n\'a été correctement traitée. Veuillez réessayer.'
      }
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    addLog('info', 'Résultat de la validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      photosCount: photos.length,
      processedPhotosCount: photos.filter(p => p.processed).length
    })
    
    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    addLog('info', 'Début de soumission de recette')
    
    if (!validateForm()) {
      addLog('interaction', 'ECHEC_VALIDATION', {
        errorsCount: Object.keys(errors).length,
        errors: Object.keys(errors),
        titleMissing: !formData.title.trim(),
        descriptionMissing: !formData.description.trim()
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Préparer les photos validées (avec imageUrl)
      const validPhotos = photos.filter(photo => 
        photo.processed && 
        photo.imageUrl && 
        typeof photo.imageUrl === 'string' &&
        photo.imageUrl.length > 0 &&
        !photo.error
      )
      
      if (validPhotos.length === 0) {
        logError('Aucune photo valide trouvée pour partage', null, {
          totalPhotos: photos.length,
          photosState: photos.map(p => ({
            processed: p.processed,
            hasImageUrl: !!p.imageUrl,
            imageUrlType: typeof p.imageUrl,
            imageUrlLength: p.imageUrl?.length,
            error: p.error,
            errorMessage: p.errorMessage
          }))
        })
        throw new Error('Aucune photo valide trouvée. Veuillez réessayer le traitement.')
      }
      
      // Préparer les données selon le schéma Data URL
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: ['Photo partagée sans liste d\'ingrédients'],
        instructions: [{ step: 1, instruction: 'Voir la photo pour inspiration' }],
        author: user?.user_metadata?.display_name || user?.email || 'Anonyme',
        image: validPhotos[0].imageUrl, // Image en Data URL
        category: 'Photo partagée',
        prepTime: null,
        cookTime: null,
        difficulty: 'Facile'
        // Note: servings omitted to handle tables without this column
      }
      
      logDebug('Données de photo préparées pour API', {
        hasTitle: !!recipeData.title,
        hasDescription: !!recipeData.description,
        photosCount: photos.length,
        validPhotosCount: validPhotos.length,
        mainImageUrlLength: recipeData.image.length,
        category: recipeData.category,
        author: recipeData.author
      })
      
      // Valider que les données sont complètes avant l'envoi
      if (!recipeData.image || typeof recipeData.image !== 'string' || recipeData.image.length === 0) {
        throw new Error('Image principale manquante ou invalide')
      }
      
      // Call API to submit photo as recipe
      logInfo('Envoi des données vers l\'API /api/recipes')
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      logDebug('Réponse de l\'API reçue', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      })
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      let result
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json()
      } else {
        // Server returned HTML or other content - likely an error page
        const textContent = await response.text()
        addLog('error', 'API a retourné du contenu non-JSON', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          contentPreview: textContent.substring(0, 500)
        })
        
        if (response.status === 500) {
          throw new Error('Erreur serveur interne. Vérifiez la configuration de la base de données et les variables d\'environnement.')
        } else if (response.status === 404) {
          throw new Error('API non trouvée. Vérifiez que le fichier /api/recipes.js existe.')
        } else {
          throw new Error(`Erreur serveur (${response.status}): Le serveur a retourné une page d'erreur au lieu d'une réponse JSON.`)
        }
      }
      
      logDebug('Contenu de la réponse API', {
        hasResult: !!result,
        resultKeys: Object.keys(result || {}),
        message: result?.message,
        id: result?.id,
        error: result?.error
      })
      
      if (!response.ok) {
        const errorMessage = result?.message || result?.error || `Erreur HTTP ${response.status}: ${response.statusText}`
        logError('Erreur de l\'API lors du partage de photo', null, {
          status: response.status,
          statusText: response.statusText,
          responseBody: result,
          errorMessage
        })
        throw new Error(errorMessage)
      }
      
      addLog('interaction', 'PHOTO_SOUMISE', {
        title: recipeData.title,
        photosCount: validPhotos.length,
        recipeId: result.id,
        imageBytesLength: recipeData.image.length
      })
      
      // Afficher le message de succès
      setShowSuccessMessage(true)
      
      // Redirection après 3 secondes
      setTimeout(() => {
        router.push('/?success=photo-shared')
      }, 3000)
      
    } catch (error) {
      addLog('error', 'Erreur lors de la soumission de photo', {
        errorName: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        formData: {
          title: formData.title,
          hasDescription: !!formData.description
        },
        photosState: {
          total: photos.length,
          processed: photos.filter(p => p.processed).length,
          withBytes: photos.filter(p => p.imageBytes?.length > 0).length,
          withErrors: photos.filter(p => p.error).length
        }
      })
      
      // Amélioration du diagnostic et des messages d'erreur
      let errorMessage = 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
      
      // Analyse plus précise des erreurs API
      if (error.message.includes('structure de base de données')) {
        errorMessage = 'Problème de configuration de la base de données. La table recipes n\'a pas toutes les colonnes requises. Contactez l\'administrateur.'
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur serveur: Le serveur a retourné une réponse invalide. Vérifiez la configuration du serveur et de la base de données.'
      } else if (error.message.includes('serveur interne')) {
        errorMessage = 'Erreur de base de données. Vérifiez la configuration Supabase dans les variables d\'environnement.'
      } else if (error.message.includes('API non trouvée')) {
        errorMessage = 'Configuration manquante: L\'API de recettes n\'est pas configurée correctement.'
      } else if (error.message.includes('photo')) {
        errorMessage = 'Problème avec la photo. Veuillez la recharger et réessayer.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Problème de connexion. Vérifiez votre connexion internet et réessayez.'
      } else if (error.message.includes('Données manquantes')) {
        errorMessage = 'Erreur de validation: Certaines données requises sont manquantes.'
      } else if (error.message.includes('Données trop longues')) {
        errorMessage = 'Le titre ou la description est trop long. Veuillez raccourcir votre texte.'
      } else if (error.message.includes('bytes')) {
        errorMessage = 'Problème avec le format de l\'image. L\'image est peut-être trop volumineuse ou dans un format non supporté.'
      } else if (error.message.includes('RangeError') || error.message.includes('JSON.stringify')) {
        errorMessage = 'L\'image est trop volumineuse pour être envoyée. Essayez une image plus petite ou compressée.'
      } else if (error.message.includes('403')) {
        errorMessage = 'Vous n\'avez pas l\'autorisation d\'effectuer cette action. Veuillez vous reconnecter.'
      } else if (error.message.includes('429')) {
        errorMessage = 'Trop de requêtes. Veuillez attendre quelques instants avant de réessayer.'
      } else if (error.message.includes('creation')) {
        errorMessage = 'Erreur lors de la sauvegarde de la recette. Vérifiez que tous les champs sont correctement remplis.'
      } else if (error.message) {
        // Si on a un message d'erreur précis, on l'affiche directement
        errorMessage = `Erreur: ${error.message}`
      }
      
      // Tentative de reconnexion à la base de données en cas d'erreur
      if (
        error.message.includes('serveur interne') ||
        error.message.includes('base de données') ||
        error.message.includes('500')
      ) {
        // Log supplémentaire pour diagnostic
        addLog('warning', 'Tentative de reconnexion à la base de données')
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculer l'état des uploads
  const processingPhotosCount = photos.filter(photo => photo.processing).length
  const allPhotosProcessed = photos.length > 0 && photos.every(photo => 
    photo.processed && 
    photo.imageBytes && 
    Array.isArray(photo.imageBytes)
  )

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    setIsLoading(false)
    addLog('info', 'Page de partage de photo chargée', { userId: user?.id })
  }, [user, router])

  // Message de confirmation de soumission
  if (showSuccessMessage) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>📸</div>
          <h1>Photo partagée avec succès !</h1>
          <p>Votre délicieuse photo "<strong>{formData.title}</strong>" a été ajoutée à COCO.</p>
          <p>Redirection en cours vers l'accueil...</p>
          <div className={styles.successSpinner}></div>
        </div>
      </div>
    )
  }

  // Logs component
  const LogsDisplay = () => (
    <div className={styles.logsContainer}>
      <div className={styles.logsHeader}>
        <h3>📋 Logs en temps réel</h3>
        <div className={styles.logsControls}>
          <button 
            onClick={() => setLogs([])} 
            className={styles.clearLogsBtn}
          >
            🗑️ Vider
          </button>
          <button 
            onClick={() => setShowLogs(false)} 
            className={styles.closeLogsBtn}
          >
            ✕
          </button>
        </div>
      </div>
      <div className={styles.logsList}>
        {logs.length === 0 ? (
          <div className={styles.noLogs}>Aucun log pour le moment</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className={`${styles.logEntry} ${styles[`log${log.level.charAt(0).toUpperCase() + log.level.slice(1)}`]}`}>
              <div className={styles.logMeta}>
                <span className={styles.logTime}>{log.timestamp}</span>
                <span className={styles.logLevel}>{log.level.toUpperCase()}</span>
              </div>
              <div className={styles.logMessage}>{log.message}</div>
              {log.data && (
                <pre className={styles.logData}>{log.data}</pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <p>Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Partager une photo - COCO</title>
        <meta name="description" content="Partagez une photo de votre plat avec la communauté COCO" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.push('/')} className={styles.backBtn}>
            ← Retour
          </button>
          <div className={styles.headerTop}>
            <h1>📸 Partager une photo</h1>
            <button 
              onClick={() => setShowLogs(!showLogs)} 
              className={styles.debugBtn}
              title="Afficher/Masquer les logs"
            >
              {showLogs ? '📋' : '🔍'} Debug
            </button>
          </div>
          <p className={styles.subtitle}>
            Partagez rapidement une photo de votre création culinaire
          </p>
        </div>

        {showLogs && <LogsDisplay />}

        <div className={styles.content}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Section Photos */}
            <div className={styles.section}>
              <h2>📷 Photo de votre plat</h2>
              <PhotoUpload 
                onPhotoSelect={setPhotos}
                maxFiles={3}
              />
              {errors.photos && <span className={styles.error}>{errors.photos}</span>}
              
              {processingPhotosCount > 0 && (
                <div className={styles.uploadStatus}>
                  ⏳ {processingPhotosCount} photo(s) en cours de traitement...
                </div>
              )}
              
              {allPhotosProcessed && photos.length > 0 && (
                <div className={styles.uploadSuccess}>
                  ✅ Toutes les photos sont prêtes !
                </div>
              )}
            </div>

            {/* Informations de base */}
            <div className={styles.section}>
              <h2>📝 Informations de base</h2>
              
              <div className={styles.formGroup}>
                <label htmlFor="title">Nom de votre plat *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ex: Tarte aux pommes de grand-mère"
                  className={errors.title ? styles.inputError : ''}
                />
                {errors.title && <span className={styles.error}>{errors.title}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Décrivez brièvement votre plat, ce qui le rend spécial..."
                  rows={4}
                  className={errors.description ? styles.inputError : ''}
                />
                {errors.description && <span className={styles.error}>{errors.description}</span>}
              </div>
            </div>

            {errors.submit && (
              <div className={styles.submitError}>
                {errors.submit}
              </div>
            )}
          </form>
        </div>

        <div className={styles.navigation}>
          <button onClick={() => router.back()} className={styles.secondaryBtn}>
            Annuler
          </button>
          
          <button
            onClick={handleSubmit}
            className={`${styles.submitBtn} ${isSubmitting || processingPhotosCount > 0 ? styles.disabled : ''}`}
            disabled={isSubmitting || processingPhotosCount > 0}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner}></span>
                Partage en cours...
              </>
            ) : processingPhotosCount > 0 ? (
              <>
                ⏳ Traitement en cours ({processingPhotosCount} photo(s))
              </>
            ) : (
              <>
                📸 Partager ma photo
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
