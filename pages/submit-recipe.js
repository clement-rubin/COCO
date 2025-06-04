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
        setErrors(prev => ({
          ...prev,
          photos: 'Au moins une photo traitée est requise'
        }))
        return
      }
      
      // Get user's display name from profile or email
      let authorName = user?.email || 'Utilisateur anonyme'
      try {
        const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          authorName = profileData.display_name || user?.email || 'Utilisateur anonyme'
        }
      } catch (profileError) {
        addLog('warning', 'Impossible de récupérer le nom d\'utilisateur, utilisation de l\'email', { error: profileError.message })
      }
      
      // Préparer les données selon le schéma Data URL
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: 'Photo partagée',
        difficulty: 'Facile',
        author: authorName,
        user_id: user.id,
        image: validPhotos[0].imageUrl, // Utiliser la première photo comme image principale
        ingredients: [],
        instructions: [],
        prepTime: null,
        cookTime: null
      }
      
      addLog('info', 'Données de recette préparées', {
        title: recipeData.title,
        author: recipeData.author,
        user_id: recipeData.user_id,
        hasImage: !!recipeData.image,
        category: recipeData.category
      })
      
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Erreur ${response.status}`)
      }
      
      const result = await response.json()
      
      addLog('info', 'Photo partagée avec succès', {
        recipeId: result.id,
        title: result.title,
        author: result.author
      })
      
      // Afficher le message de succès
      setShowSuccessMessage(true)
      
      // Redirection après 3 secondes
      setTimeout(() => {
        router.push('/')
      }, 3000)
      
    } catch (error) {
      addLog('error', 'Erreur lors du partage de photo', {
        error: error.message,
        stack: error.stack
      })
      
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Erreur lors du partage de la photo'
      }))
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
