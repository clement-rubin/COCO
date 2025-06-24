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
        description: formData.description?.trim() || 'Partagé rapidement avec COCO ! 📸',
        ingredients: [],
        instructions: [],
        category: 'Photo partagée',
        difficulty: 'Facile'
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

  return (
    <>
      <Head>
        <title>
          {formMode === 'quick' ? 'Partager une photo - COCO' : 'Partager une recette - COCO'}
        </title>
        <meta name="description" content="Partagez votre création culinaire avec la communauté COCO" />
      </Head>
      
      <div className={styles.container}>
        {showModeSelector ? (
          <ModeSelector />
        ) : (
          <>
            <div className={styles.header}>
              <button 
                onClick={() => setShowModeSelector(true)} 
                className={styles.backBtn}
              >
                ← Changer le mode
              </button>
              <div className={styles.headerTop}>
                <h1>
                  {formMode === 'quick' ? '📸 Partage Rapide' : '🍳 Recette Complète'}
                </h1>
                <button 
                  onClick={() => setShowLogs(!showLogs)} 
                  className={styles.debugBtn}
                  title="Afficher/Masquer les logs"
                >
                  {showLogs ? '📋' : '🔍'} Debug
                </button>
              </div>
              <p className={styles.subtitle}>
                {formMode === 'quick' 
                  ? 'Partagez rapidement une photo de votre création'
                  : 'Partagez votre recette complète avec la communauté'
                }
              </p>
            </div>

            {showLogs && <LogsDisplay />}

            <div className={styles.content}>
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Section Photos - toujours présente */}
                <div className={styles.section}>
                  <h2>📷 Photo de votre {formMode === 'quick' ? 'plat' : 'recette'}</h2>
                  <PhotoUpload 
                    onPhotoSelect={setPhotos}
                    maxFiles={formMode === 'quick' ? 1 : 3}
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

                {/* Titre - toujours obligatoire */}
                <div className={styles.section}>
                  <h2>✨ Titre</h2>
                  
                  <div className={styles.formGroup}>
                    <label htmlFor="title">
                      Nom de votre {formMode === 'quick' ? 'plat' : 'recette'} *
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder={formMode === 'quick' 
                        ? "Ex: Mon délicieux plat du jour" 
                        : "Ex: Tarte aux pommes de grand-mère"
                      }
                      className={errors.title ? styles.inputError : ''}
                    />
                    {errors.title && <span className={styles.error}>{errors.title}</span>}
                  </div>
                </div>

                {/* Sections conditionnelles pour le mode complet */}
                {formMode === 'complete' && (
                  <>
                    <div className={styles.section}>
                      <h2>📝 Détails de la recette</h2>
                      
                      <div className={styles.formGroup}>
                        <label htmlFor="description">Description *</label>
                        <textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Décrivez votre recette, ce qui la rend spéciale..."
                          rows={4}
                          className={errors.description ? styles.inputError : ''}
                        />
                        {errors.description && <span className={styles.error}>{errors.description}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="ingredients">Ingrédients (optionnel)</label>
                        <textarea
                          id="ingredients"
                          name="ingredients"
                          value={formData.ingredients}
                          onChange={handleInputChange}
                          placeholder="Listez les ingrédients (un par ligne)&#10;Ex:&#10;- 3 pommes&#10;- 200g de farine&#10;- 100g de beurre"
                          rows={6}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="instructions">Instructions (optionnel)</label>
                        <textarea
                          id="instructions"
                          name="instructions"
                          value={formData.instructions}
                          onChange={handleInputChange}
                          placeholder="Décrivez les étapes de préparation (une par ligne)&#10;Ex:&#10;1. Préchauffer le four à 180°C&#10;2. Éplucher et couper les pommes&#10;3. Mélanger la farine et le beurre"
                          rows={8}
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    {formMode === 'quick' ? '📸 Partager ma photo' : '🍳 Partager ma recette'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label htmlFor="instructions">Instructions (optionnel)</label>
                        <textarea
                          id="instructions"
                          name="instructions"
                          value={formData.instructions}
                          onChange={handleInputChange}
                          placeholder="Décrivez les étapes de préparation (une par ligne)&#10;Ex:&#10;1. Préchauffer le four à 180°C&#10;2. Éplucher et couper les pommes&#10;3. Mélanger la farine et le beurre"
                          rows={8}
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    {formMode === 'quick' ? '📸 Partager ma photo' : '🍳 Partager ma recette'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
