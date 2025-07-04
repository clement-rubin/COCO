import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { useAuth } from '../components/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'
import { uploadImageToSupabaseAndGetUrl } from '../utils/imageUtils'

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
    description: '',
    ingredients: '',
    instructions: ''
  })
  const [photos, setPhotos] = useState([])
  
  // Nouveaux états pour le choix du mode
  const [formMode, setFormMode] = useState(null) // 'quick' ou 'complete'
  const [showModeSelector, setShowModeSelector] = useState(true)

  // Nouveaux états pour le mode express
  const [quickStep, setQuickStep] = useState(1) // 1: photo, 2: titre, 3: prêt
  const [quickProgress, setQuickProgress] = useState(0)
  const [isPublishing, setIsPublishing] = useState(false)

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

  // Modifier la validation pour être encore plus permissive
  const validateForm = () => {
    const newErrors = {}
    
    // SEUL le titre est obligatoire
    if (!formData.title.trim()) {
      newErrors.title = 'Le nom de votre plat est obligatoire'
      addLog('warning', 'Validation échouée: nom de la recette manquant')
    }
    
    // Tout le reste est complètement optionnel, même la description
    // Photos recommandées mais pas obligatoires
    if (photos.length === 0) {
      addLog('info', 'Aucune photo fournie - création de recette sans photo')
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    addLog('info', 'Résultat de la validation simplifiée', {
      isValid,
      formMode,
      hasTitle: !!formData.title.trim(),
      hasPhotos: photos.length > 0,
      validationMode: 'ultra-simplified'
    })
    
    setErrors(newErrors)
    return isValid
  }

  // Simplifier le processus de soumission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    addLog('info', 'Début de soumission rapide', { formMode })
    
    if (!validateForm()) {
      addLog('warning', 'Validation du formulaire échouée')
      return
    }
    if (!user) {
      router.push('/login')
      return
    }

    setIsSubmitting(true)

    try {
      // Récupération du display_name - plus rapide avec cache
      let authorName = 'Chef Anonyme'
      try {
        const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData?.display_name) {
            authorName = profileData.display_name
          }
        }
      } catch (profileError) {
        // Ignorer l'erreur, utiliser le nom par défaut
        addLog('warning', 'Profil non trouvé, utilisation du nom par défaut')
      }

      // Upload d'image uniquement si présente - pas d'attente
      let mainImageUrl = null
      if (photos.length > 0) {
        const photoWithFile = photos.find(photo => photo.imageFile instanceof File)
        if (photoWithFile) {
          try {
            // Upload en arrière-plan, pas d'attente si ça échoue
            mainImageUrl = await Promise.race([
              uploadImageToSupabaseAndGetUrl(photoWithFile.imageFile),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ])
          } catch (uploadError) {
            addLog('warning', 'Upload d\'image échoué mais on continue', { error: uploadError.message })
            // Continuer sans image plutôt que d'échouer
          }
        }
      }

      // Données minimales pour soumission rapide
      const recipeData = {
        title: formData.title.trim(),
        author: authorName,
        user_id: user.id,
        image: mainImageUrl,
        formMode: formMode,
        // Valeurs par défaut optimisées pour mode rapide
        description: formData.description?.trim() || '',
        ingredients: [],
        instructions: [],
        category: 'Photo partagée',
        difficulty: 'Facile',
        // Initialiser les likes à 0
        likes_count: 0
      }

      // Soumission avec timeout court
      const response = await Promise.race([
        fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipeData)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de soumission')), 10000)
        )
      ])

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Erreur lors de la soumission')
      }

      // Succès - redirection immédiate
      setShowSuccessMessage(true)
      setTimeout(() => router.push('/'), 2000) // Réduit à 2 secondes

    } catch (error) {
      addLog('error', 'Erreur lors de la soumission rapide', {
        errorMessage: error.message
      })
      
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Une erreur est survenue. Réessayez.'
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculer le progrès du mode express
  useEffect(() => {
    if (formMode === 'quick') {
      let progress = 0
      if (photos.length > 0) progress += 50
      if (formData.title.trim()) progress += 50
      setQuickProgress(progress)
      
      // Mettre à jour l'étape
      if (photos.length > 0 && formData.title.trim()) {
        setQuickStep(3)
      } else if (photos.length > 0) {
        setQuickStep(2)
      } else {
        setQuickStep(1)
      }
    }
  }, [photos, formData.title, formMode])

  // Gestion du drag & drop pour le mode express
  const handleQuickDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleQuickDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      // Simuler le clic sur PhotoUpload pour le premier fichier
      addLog('interaction', 'Photo déposée en mode express', { fileName: imageFiles[0].name })
    }
  }

  // Version optimisée du handleSubmit pour le mode express
  const handleQuickSubmit = async () => {
    if (!formData.title.trim()) {
      setErrors({ title: 'Un titre est requis pour partager votre photo' })
      return
    }

    setIsPublishing(true)
    addLog('info', 'Début de publication express')

    try {
      // Récupération rapide du profil
      let authorName = 'Chef Anonyme'
      try {
        const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          authorName = profileData?.display_name || authorName
        }
      } catch {
        // Ignorer les erreurs de profil
      }

      // Upload image si présente
      let mainImageUrl = null
      if (photos.length > 0) {
        const photoWithFile = photos.find(photo => photo.imageFile instanceof File)
        if (photoWithFile) {
          try {
            mainImageUrl = await uploadImageToSupabaseAndGetUrl(photoWithFile.imageFile)
          } catch (uploadError) {
            addLog('warning', 'Upload image échoué, continuation sans image')
          }
        }
      }

      // Données optimisées pour mode express
      const recipeData = {
        title: formData.title.trim(),
        author: authorName,
        user_id: user.id,
        image: mainImageUrl,
        description: '',
        ingredients: [],
        instructions: [],
        category: 'Partage Express',
        difficulty: 'Facile',
        formMode: 'quick'
      }

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la publication')
      }

      addLog('info', 'Publication express réussie')
      setShowSuccessMessage(true)
      
      // Redirection après 3 secondes
      setTimeout(() => router.push('/'), 3000)

    } catch (error) {
      addLog('error', 'Erreur publication express', { error: error.message })
      setErrors({ submit: error.message })
    } finally {
      setIsPublishing(false)
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
          <div className={styles.successIcon}>
            {formMode === 'quick' ? '📸' : '🍳'}
          </div>
          <h1>
            {formMode === 'quick' ? 'Photo partagée avec succès !' : 'Recette partagée avec succès !'}
          </h1>
          <p>
            Votre délicieux{formMode === 'quick' ? 'e photo' : 'e recette'} "<strong>{formData.title}</strong>" a été ajoutée à COCO.
          </p>
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

  // Composant de sélection du mode
  const ModeSelector = () => (
    <div className={styles.modeSelector}>
      <div className={styles.modeSelectorHeader}>
        <h2>Partager votre création</h2>
        <p>Choisissez comment partager rapidement</p>
      </div>
      
      <div className={styles.modeOptions}>
        {/* Mode rapide en premier et plus visible */}
        <div 
          className={`${styles.modeOption} ${styles.recommended}`}
          onClick={() => {
            setFormMode('quick')
            setShowModeSelector(false)
            addLog('interaction', 'Mode rapide sélectionné')
          }}
        >
          <div className={styles.modeIcon}>⚡</div>
          <div className={styles.recommendedBadge}>RECOMMANDÉ</div>
          <h3>Partage Express</h3>
          <p>Photo + titre = c'est parti !</p>
          <div className={styles.modeFeatures}>
            <span>📸 Juste une photo</span>
            <span>✏️ Un titre</span>
            <span>🚀 Envoi en 10 secondes</span>
          </div>
          <div className={styles.modeButton}>Partir maintenant</div>
        </div>

        <div 
          className={styles.modeOption}
          onClick={() => {
            setFormMode('complete')
            setShowModeSelector(false)
            addLog('interaction', 'Mode complet sélectionné')
          }}
        >
          <div className={styles.modeIcon}>📝</div>
          <h3>Recette Détaillée</h3>
          <p>Pour les vrais chefs</p>
          <div className={styles.modeFeatures}>
            <span>🍳 Tous les ingrédients</span>
            <span>📋 Étapes détaillées</span>
            <span>⏱️ Plus long mais complet</span>
          </div>
          <div className={styles.modeButton}>Prendre le temps</div>
        </div>
      </div>
    </div>
  )

  // Composant du mode express complètement refondu
  const QuickModeInterface = () => {
    if (isPublishing || showSuccessMessage) {
      return (
        <div className={styles.quickSuccessContainer}>
          {isPublishing ? (
            <div className={styles.quickLoadingContainer}>
              <div className={styles.quickLoadingSpinner}></div>
              <div className={styles.quickLoadingText}>Publication en cours...</div>
              <div className={styles.quickLoadingSubtext}>
                Votre délicieuse création sera bientôt partagée ! 🍳✨
              </div>
            </div>
          ) : (
            <>
              <div className={styles.quickSuccessIcon}>🎉</div>
              <h1 className={styles.quickSuccessTitle}>Photo partagée !</h1>
              <p className={styles.quickSuccessMessage}>
                Votre délicieuse création
                <span className={styles.quickSuccessRecipeTitle}>{formData.title}</span>
                a été ajoutée à COCO avec succès !
              </p>
              <div className={styles.quickSuccessSpinner}></div>
            </>
          )}
        </div>
      )
    }

    // Nouveau design du mode express
    return (
      <div className="quickModeContainer">
        <StickyHeader />
        <div className="quickProgressBar">
          <div className="quickProgressFill" style={{ width: `${quickProgress}%` }} />
        </div>
        <div className="quickSteps">
          <div className={`quickStep ${quickStep >= 1 ? 'active' : ''}`}>1. Photo</div>
          <div className={`quickStep ${quickStep >= 2 ? 'active' : ''}`}>2. Titre</div>
          <div className={`quickStep ${quickStep >= 3 ? 'active' : ''}`}>3. Partager</div>
        </div>
        <div className="quickFormZone">
          {/* Zone photo */}
          <div
            className={`quickPhotoZone${photos.length > 0 ? ' hasPhoto' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0]
                if (file) setPhotos([{ imageFile: file, processed: true }])
              }}
            />
            {photos.length > 0 ? (
              <img
                src={URL.createObjectURL(photos[0].imageFile)}
                alt="Aperçu"
                className="quickPhotoPreview"
              />
            ) : (
              <div className="quickPhotoPlaceholder">
                <span className="quickPhotoIcon">📷</span>
                <span>Ajouter une photo</span>
              </div>
            )}
          </div>
          {/* Zone titre */}
          <input
            className="quickTitleInput"
            type="text"
            placeholder="Nom de votre plat..."
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            maxLength={60}
            autoFocus={quickStep === 2}
          />
          {/* Bouton publier */}
          <button
            className="quickPublishBtn"
            disabled={isPublishing || !formData.title.trim()}
            onClick={handleQuickSubmit}
          >
            {isPublishing ? 'Envoi...' : '🚀 Partager maintenant'}
          </button>
        </div>
      </div>
    )
  }

  // Ajout d'un header sticky pour la page de publication
  const StickyHeader = () => (
    <header className="submitHeader">
      <button className="backBtn" onClick={() => router.back()} aria-label="Retour">
        ←
      </button>
      <h1 className="submitTitle">Partager une création</h1>
    </header>
  )

  // Ajout d'un wrapper avec padding-top pour éviter la navbar
  return (
    <div className="submitRecipePage">
      {showModeSelector ? <ModeSelector /> : (
        formMode === 'quick' ? <QuickModeInterface /> : /* ...mode complet... */
        <div className="completeModeContainer">
          <StickyHeader />
          {/* ...formulaire complet amélioré à styliser... */}
        </div>
      )}
      {showLogs && <LogsDisplay />}
      <style jsx>{`
        .submitRecipePage {
          min-height: 100vh;
          background: linear-gradient(135deg, #fff7f0 0%, #f8fafc 100%);
          padding-top: 72px; /* Pour la navbar sticky */
        }
        .submitHeader {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: #fff;
          border-bottom: 1.5px solid #f1f5f9;
          display: flex;
          align-items: center;
          z-index: 100;
          padding: 0 18px;
          box-shadow: 0 2px 12px rgba(255,107,53,0.05);
        }
        .backBtn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #ff6b35;
          margin-right: 12px;
          cursor: pointer;
        }
        .submitTitle {
          font-size: 1.2rem;
          font-weight: 700;
          color: #ff6b35;
          margin: 0;
        }
        .quickModeContainer {
          max-width: 420px;
          margin: 0 auto;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px #ff6b3522;
          padding: 32px 20px 24px 20px;
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .quickProgressBar {
          width: 100%;
          height: 8px;
          background: #f1f5f9;
          border-radius: 6px;
          overflow: hidden;
        }
        .quickProgressFill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b35, #f7931e);
          transition: width 0.4s cubic-bezier(.4,1.4,.6,1);
        }
        .quickSteps {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .quickStep {
          flex: 1;
          text-align: center;
          font-size: 0.98rem;
          color: #bdbdbd;
          font-weight: 600;
          padding: 6px 0;
          border-radius: 8px;
          background: #f8fafc;
          transition: color 0.2s, background 0.2s;
        }
        .quickStep.active {
          color: #ff6b35;
          background: #fff3e6;
        }
        .quickFormZone {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .quickPhotoZone {
          width: 100%;
          aspect-ratio: 1.5/1;
          background: #f8fafc;
          border: 2.5px dashed #ff6b35;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: border-color 0.2s;
          position: relative;
          overflow: hidden;
        }
        .quickPhotoZone.hasPhoto {
          border-style: solid;
          border-color: #f7931e;
        }
        .quickPhotoPlaceholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #ff6b35;
          font-size: 1.2rem;
          gap: 6px;
        }
        .quickPhotoIcon {
          font-size: 2.2rem;
        }
        .quickPhotoPreview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
        }
        .quickTitleInput {
          font-size: 1.1rem;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1.5px solid #f1f5f9;
          background: #f8fafc;
          outline: none;
          font-weight: 600;
          color: #333;
          transition: border-color 0.2s;
        }
        .quickTitleInput:focus {
          border-color: #ff6b35;
        }
        .quickPublishBtn {
          width: 100%;
          background: linear-gradient(90deg, #ff6b35, #f7931e);
          color: #fff;
          font-size: 1.15rem;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          padding: 16px 0;
          box-shadow: 0 2px 12px #ff6b3533;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .quickPublishBtn:active {
          transform: scale(0.97);
        }
        @media (max-width: 600px) {
          .quickModeContainer {
            padding: 18px 6px 18px 6px;
            margin-top: 8px;
            border-radius: 0;
            box-shadow: none;
          }
          .submitRecipePage {
            padding-top: 56px;
          }
        }
      `}</style>
    </div>
  )
}
