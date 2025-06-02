import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SharePhoto.module.css'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'

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
    
    // Validation des photos uploadées
    if (photos.length > 0) {
      const uploadingPhotos = photos.filter(photo => photo.uploading)
      const errorPhotos = photos.filter(photo => photo.error)
      const uploadedPhotos = photos.filter(photo => 
        photo.uploaded && 
        photo.supabaseUrl && 
        photo.supabasePath &&
        photo.supabaseUrl.includes('supabase')
      )
      
      if (uploadingPhotos.length > 0) {
        newErrors.photos = `Attendez que ${uploadingPhotos.length} photo(s) finissent d'être uploadées`
      } else if (errorPhotos.length > 0) {
        newErrors.photos = `${errorPhotos.length} photo(s) ont échoué. Supprimez-les et réessayez.`
      } else if (uploadedPhotos.length === 0) {
        newErrors.photos = 'Aucune photo n\'a été correctement uploadée vers Supabase. Veuillez réessayer.'
      }
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    logInfo('Résultat de la validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      photosCount: photos.length,
      uploadedPhotosCount: photos.filter(p => p.uploaded).length
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
      // Préparer les URLs des images validées
      const validPhotos = photos.filter(photo => 
        photo.uploaded && 
        photo.supabaseUrl && 
        photo.supabasePath &&
        photo.supabaseUrl.includes('supabase') &&
        !photo.error
      )
      
      const imageUrls = validPhotos.map(photo => photo.supabaseUrl)
      
      if (imageUrls.length === 0) {
        throw new Error('Aucune photo valide trouvée dans Supabase. Veuillez réessayer l\'upload.')
      }
      
      // Préparer les données selon le schéma de la base - version simplifiée
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: ['Photo partagée sans liste d\'ingrédients'], // Valeur par défaut car obligatoire en DB
        instructions: [{ step: 1, instruction: 'Voir la photo pour inspiration' }], // Valeur par défaut car obligatoire en DB
        author: formData.author.trim() || 'Anonyme',
        image: imageUrls[0], // Image principale obligatoire
        photos: imageUrls, // Toutes les photos
        category: 'Photo partagée', // Catégorie spéciale pour les photos
        difficulty: 'Non spécifiée',
        prepTime: null,
        cookTime: null
      }
      
      logDebug('Données de photo préparées', {
        hasTitle: !!recipeData.title,
        hasDescription: !!recipeData.description,
        photosCount: photos.length,
        imageUrlsCount: imageUrls.length,
        category: recipeData.category,
        mainImageUrl: recipeData.image
      })
      
      // Call API to submit photo as recipe
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la soumission')
      }
      
      logUserInteraction('PHOTO_SOUMISE', 'formulaire-photo', {
        title: recipeData.title,
        photosCount: imageUrls.length,
        recipeId: result.id
      })
      
      // Afficher le message de succès
      setShowSuccessMessage(true)
      
      // Redirection après 3 secondes
      setTimeout(() => {
        router.push('/?success=photo-shared')
      }, 3000)
      
    } catch (error) {
      logError('Erreur lors de la soumission de photo', error, {
        formData: {
          title: formData.title,
          hasDescription: !!formData.description
        },
        photosState: {
          total: photos.length,
          uploaded: photos.filter(p => p.uploaded).length,
          withSupabaseUrls: photos.filter(p => p.supabaseUrl).length
        }
      })
      
      setErrors({ submit: 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculer l'état des uploads
  const uploadingPhotosCount = photos.filter(photo => photo.uploading).length
  const allPhotosUploaded = photos.length > 0 && photos.every(photo => 
    photo.uploaded && 
    photo.supabaseUrl && 
    photo.supabaseUrl.includes('supabase')
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
            
            {uploadingPhotosCount > 0 && (
              <div className={styles.uploadStatus}>
                ⏳ {uploadingPhotosCount} photo(s) en cours d'upload...
              </div>
            )}
            
            {allPhotosUploaded && photos.length > 0 && (
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
              disabled={isSubmitting || uploadingPhotosCount > 0}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Partage en cours...
                </>
              ) : uploadingPhotosCount > 0 ? (
                <>
                  ⏳ Upload en cours ({uploadingPhotosCount} photo(s))
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
