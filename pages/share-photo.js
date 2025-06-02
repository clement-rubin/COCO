import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SharePhoto.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'

export default function SharePhoto() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: ''
  })
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    logDebug(`Changement de champ: ${name}`, { 
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
    logInfo('Début de la validation du formulaire photo')
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le nom du plat est obligatoire'
      logWarning('Validation échouée: nom du plat manquant')
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire'
      logWarning('Validation échouée: description manquante')
    }
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est obligatoire'
      logWarning('Validation échouée: aucune photo')
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
    
    logInfo('Résultat de la validation', {
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
    
    logInfo('Début de soumission de photo de recette')
    
    if (!validateForm()) {
      logUserInteraction('ECHEC_VALIDATION', 'formulaire-photo', {
        errorsCount: Object.keys(errors).length,
        errors: Object.keys(errors)
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Préparer les photos validées (avec bytes)
      const validPhotos = photos.filter(photo => 
        photo.processed && 
        photo.imageBytes && 
        Array.isArray(photo.imageBytes) &&
        photo.imageBytes.length > 0 &&
        !photo.error
      )
      
      if (validPhotos.length === 0) {
        logError('Aucune photo valide trouvée pour partage', null, {
          totalPhotos: photos.length,
          photosState: photos.map(p => ({
            processed: p.processed,
            hasImageBytes: !!p.imageBytes,
            imageBytesType: typeof p.imageBytes,
            imageBytesIsArray: Array.isArray(p.imageBytes),
            imageBytesLength: p.imageBytes?.length,
            error: p.error,
            errorMessage: p.errorMessage
          }))
        })
        throw new Error('Aucune photo valide trouvée. Veuillez réessayer le traitement.')
      }
      
      // Préparer les données selon le schéma bytea
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: ['Photo partagée sans liste d\'ingrédients'],
        instructions: [{ step: 1, instruction: 'Voir la photo pour inspiration' }],
        author: formData.author.trim() || 'Anonyme',
        image: validPhotos[0].imageBytes, // Image en bytea
        category: 'Photo partagée',
        prepTime: null,
        cookTime: null
      }
      
      logDebug('Données de photo préparées pour API', {
        hasTitle: !!recipeData.title,
        hasDescription: !!recipeData.description,
        photosCount: photos.length,
        validPhotosCount: validPhotos.length,
        mainImageBytesLength: recipeData.image.length,
        category: recipeData.category,
        author: recipeData.author
      })
      
      // Valider que les données sont complètes avant l'envoi
      if (!recipeData.image || !Array.isArray(recipeData.image) || recipeData.image.length === 0) {
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
        ok: response.ok
      })
      
      const result = await response.json()
      
      logDebug('Contenu de la réponse API', {
        hasResult: !!result,
        resultKeys: Object.keys(result || {}),
        message: result?.message,
        id: result?.id,
        error: result?.error
      })
      
      if (!response.ok) {
        const errorMessage = result.message || result.error || `Erreur HTTP ${response.status}: ${response.statusText}`
        logError('Erreur de l\'API lors du partage de photo', null, {
          status: response.status,
          statusText: response.statusText,
          responseBody: result,
          errorMessage
        })
        throw new Error(errorMessage)
      }
      
      logUserInteraction('PHOTO_SOUMISE', 'formulaire-photo', {
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
      logError('Erreur lors de la soumission de photo', error, {
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
      
      // Fournir un message d'erreur plus spécifique
      let errorMessage = 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
      
      if (error.message.includes('photo')) {
        errorMessage = 'Problème avec la photo. Veuillez la recharger et réessayer.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Problème de connexion. Vérifiez votre connexion internet et réessayez.'
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur de format des données. Veuillez recharger la page et réessayer.'
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`
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

  return (
    <>
      <Head>
        <title>Partager une photo - COCO</title>
        <meta name="description" content="Partagez une photo de votre plat avec la communauté COCO" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← Retour
          </button>
          <h1>📸 Partager une photo</h1>
          <p className={styles.subtitle}>
            Partagez rapidement une photo de votre création culinaire
          </p>
        </div>

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

            <div className={styles.formGroup}>
              <label htmlFor="author">Votre nom ou pseudo</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Comment souhaitez-vous être crédité ?"
              />
            </div>
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          <div className={styles.submitSection}>
            <button 
              type="submit" 
              className={styles.submitBtn}
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
            
            <p className={styles.submitNote}>
              En partageant votre photo, vous acceptez qu'elle soit visible par tous les utilisateurs de COCO.
            </p>
          </div>
        </form>
      </div>
    </>
  )
}
