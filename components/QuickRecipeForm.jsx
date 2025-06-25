import { useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'
import { uploadImageToSupabaseAndGetUrl } from '../utils/imageUtils'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import styles from '../styles/QuickRecipe.module.css'

export default function QuickRecipeForm() {
  const router = useRouter()
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    image: null
  })
  
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validation rapide
    if (file.size > 5 * 1024 * 1024) {
      setError('Image trop lourde (max 5MB)')
      return
    }

    setFormData(prev => ({ ...prev, image: file }))
    
    // Aperçu immédiat
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
    
    setCurrentStep(2)
    setError('')
  }

  const handleTitleChange = (e) => {
    setFormData(prev => ({ ...prev, title: e.target.value }))
    if (e.target.value.trim() && currentStep < 3) {
      setCurrentStep(3)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Donnez un nom à votre plat !')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Upload image si présente
      let imageUrl = null
      if (formData.image) {
        try {
          imageUrl = await uploadImageToSupabaseAndGetUrl(formData.image)
        } catch (uploadError) {
          console.warn('Upload échoué, on continue sans image')
        }
      }

      // Récupération rapide du profil
      let authorName = 'Chef Anonyme'
      try {
        const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          authorName = profileData?.display_name || authorName
        }
      } catch {}

      // Données minimales
      const recipeData = {
        title: formData.title.trim(),
        description: '',
        author: authorName,
        user_id: user.id,
        image: imageUrl,
        formMode: 'quick',
        ingredients: [],
        instructions: [],
        category: 'Photo partagée',
        difficulty: 'Facile'
      }

      // Soumission avec timeout
      const response = await Promise.race([
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        )
      ])

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de l\'envoi')
      }

      const result = await response.json()

      // Notification de succès
      showRecipeLikeInteractionNotification(
        { id: result.id, title: result.title, image: result.image },
        { display_name: authorName, user_id: user.id }
      )

      // Redirection rapide
      setTimeout(() => router.push('/'), 1500)

    } catch (error) {
      setError(error.message || 'Erreur lors de l\'envoi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercent = (currentStep / 3) * 100

  return (
    <div className={styles.container}>
      {/* Barre de progression */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Instructions visuelles */}
      <div className={styles.instructions}>
        <h3 className={styles.instructionsTitle}>
          ⚡ Partage Express
        </h3>
        <div className={styles.stepsList}>
          <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <span className={styles.stepText}>Photo</span>
          </div>
          <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <span className={styles.stepText}>Titre</span>
          </div>
          <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''}`}>
            <div className={styles.stepNumber}>3</div>
            <span className={styles.stepText}>Envoi</span>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className={styles.form}>
        {/* Upload photo */}
        <div 
          className={`${styles.photoUpload} ${imagePreview ? styles.hasPhoto : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          
          {imagePreview ? (
            <div className={styles.photoPreview}>
              <img src={imagePreview} alt="Aperçu" />
              <div className={styles.changePhoto}>
                📷 Changer la photo
              </div>
            </div>
          ) : (
            <div className={styles.photoPlaceholder}>
              <div className={styles.photoIcon}>📷</div>
              <h4>Ajoutez une photo</h4>
              <p>Cliquez ici pour choisir</p>
            </div>
          )}
        </div>

        {/* Titre */}
        <input
          type="text"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="Nom de votre plat..."
          className={styles.titleInput}
          maxLength={100}
        />

        {/* Bouton d'envoi */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.title.trim()}
          className={`${styles.submitButton} ${isSubmitting ? styles.submitting : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className={styles.spinner}></span>
              Envoi en cours...
            </>
          ) : (
            <>
              🚀 Partager maintenant
            </>
          )}
        </button>

        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  )
}
