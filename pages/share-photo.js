import { useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SharePhoto.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'

export default function SharePhoto() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: ''
  })
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState([])
  const [cameraMode, setCameraMode] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)

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
      case 'interaction': logUserInteraction(message, 'share-photo', data); break;
    }
  }

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraMode(true)
      addLog('info', 'Caméra activée avec succès')
    } catch (error) {
      addLog('error', 'Erreur activation caméra', { error: error.message })
      alert('Impossible d\'accéder à la caméra. Utilisez l\'upload de fichier.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraMode(false)
    addLog('info', 'Caméra désactivée')
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const fakeEvent = {
          target: {
            files: [file]
          }
        }
        // Simulate file upload
        setPhotos([{
          id: Date.now(),
          file: file,
          preview: URL.createObjectURL(blob),
          processing: false,
          processed: true,
          imageBytes: null // Will be processed by PhotoUpload component
        }])
        stopCamera()
        setCurrentStep(2)
        addLog('interaction', 'PHOTO_CAPTUREE', { method: 'camera' })
      }, 'image/jpeg', 0.8)
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
    addLog('info', 'Début de la validation du formulaire photo')
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le nom du plat est obligatoire'
      addLog('warning', 'Validation échouée: nom du plat manquant')
    }
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est obligatoire'
      addLog('warning', 'Validation échouée: aucune photo')
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
    
    addLog('info', 'Début de soumission de photo de recette')
    
    if (!validateForm()) {
      addLog('interaction', 'ECHEC_VALIDATION', {
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
        description: formData.description.trim() || 'Photo partagée sans description',
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
        errorStack: error.stack
      })
      
      // Amélioration du diagnostic et des messages d'erreur
      let errorMessage = 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
      
      // Analyse plus précise des erreurs API
      if (error.message.includes('structure de base de données')) {
        errorMessage = 'Problème de configuration de la base de données.'
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur serveur: Le serveur a retourné une réponse invalide.'
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && photos.length === 0) {
      setErrors({ photos: 'Veuillez ajouter au moins une photo' })
      return
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  // Message de confirmation de soumission
  if (showSuccessMessage) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>🎉</div>
          <h1>Photo partagée !</h1>
          <p>Votre délicieuse photo "<strong>{formData.title}</strong>" a été ajoutée à COCO.</p>
          <p>Redirection vers l'accueil...</p>
          <div className={styles.successSpinner}></div>
        </div>
      </div>
    )
  }

  // Logs component
  const LogsDisplay = () => (
    <div className={styles.logsContainer}>
      <div className={styles.logsHeader}>
        <h3>📋 Logs</h3>
        <div className={styles.logsControls}>
          <button onClick={() => setLogs([])} className={styles.clearLogsBtn}>
            🗑️ Vider
          </button>
          <button onClick={() => setShowLogs(false)} className={styles.closeLogsBtn}>
            ✕
          </button>
        </div>
      </div>
      <div className={styles.logsList}>
        {logs.length === 0 ? (
          <div className={styles.noLogs}>Aucun log</div>
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

  // Step components
  const StepIndicator = () => (
    <div className={styles.stepIndicator}>
      <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>1</span>
        <span className={styles.stepLabel}>Photo</span>
      </div>
      <div className={styles.stepLine}></div>
      <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>2</span>
        <span className={styles.stepLabel}>Détails</span>
      </div>
      <div className={styles.stepLine}></div>
      <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''}`}>
        <span className={styles.stepNumber}>3</span>
        <span className={styles.stepLabel}>Publier</span>
      </div>
    </div>
  )

  const Step1PhotoCapture = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>📸 Prenez une photo de votre plat</h2>
        <p>Capturez directement avec votre appareil photo ou choisissez une image</p>
      </div>

      <div className={styles.photoOptions}>
        <div className={styles.cameraSection}>
          {!cameraMode ? (
            <button onClick={startCamera} className={styles.cameraBtn}>
              📷 Utiliser l'appareil photo
            </button>
          ) : (
            <div className={styles.cameraContainer}>
              <video ref={videoRef} autoPlay playsInline className={styles.cameraVideo}></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              <div className={styles.cameraControls}>
                <button onClick={capturePhoto} className={styles.captureBtn}>
                  📸 Capturer
                </button>
                <button onClick={stopCamera} className={styles.cancelBtn}>
                  ✕ Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.divider}>
          <span>ou</span>
        </div>

        <div className={styles.uploadSection}>
          <PhotoUpload 
            onPhotoSelect={setPhotos}
            maxFiles={1}
            compact={true}
          />
        </div>
      </div>

      {errors.photos && <div className={styles.error}>{errors.photos}</div>}

      {photos.length > 0 && (
        <div className={styles.photoPreview}>
          <h3>✅ Photo sélectionnée</h3>
          <div className={styles.previewGrid}>
            {photos.map((photo, index) => (
              <div key={photo.id || index} className={styles.previewItem}>
                <img src={photo.preview} alt="Aperçu" className={styles.previewImage} />
                <button 
                  onClick={() => setPhotos([])} 
                  className={styles.removeBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const Step2Details = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>📝 Décrivez votre plat</h2>
        <p>Quelques détails pour que votre photo soit encore plus appétissante</p>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="title" className={styles.label}>
          <span className={styles.required}>*</span> Nom de votre plat
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Ex: Tarte aux pommes maison"
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
        />
        {errors.title && <span className={styles.error}>{errors.title}</span>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="description" className={styles.label}>
          Description (optionnel)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Qu'est-ce qui rend ce plat spécial ?"
          rows={3}
          className={styles.textarea}
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="author" className={styles.label}>
          Votre nom ou pseudo (optionnel)
        </label>
        <input
          type="text"
          id="author"
          name="author"
          value={formData.author}
          onChange={handleInputChange}
          placeholder="Comment souhaitez-vous être crédité ?"
          className={styles.input}
        />
      </div>
    </div>
  )

  const Step3Publish = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>🚀 Prêt à publier ?</h2>
        <p>Vérifiez une dernière fois avant de partager</p>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryPhoto}>
          {photos[0] && (
            <img src={photos[0].preview} alt="Aperçu final" className={styles.summaryImage} />
          )}
        </div>
        <div className={styles.summaryDetails}>
          <h3>{formData.title || 'Sans titre'}</h3>
          {formData.description && <p>{formData.description}</p>}
          <div className={styles.summaryAuthor}>
            Par {formData.author || 'Anonyme'}
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className={styles.submitError}>
          {errors.submit}
        </div>
      )}

      <button 
        onClick={handleSubmit}
        className={styles.publishBtn}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className={styles.spinner}></span>
            Publication en cours...
          </>
        ) : (
          <>
            🎉 Publier ma photo
          </>
        )}
      </button>

      <p className={styles.disclaimer}>
        En publiant, vous acceptez que votre photo soit visible par tous les utilisateurs de COCO.
      </p>
    </div>
  )

  return (
    <>
      <Head>
        <title>Partager une photo - COCO</title>
        <meta name="description" content="Partagez une photo de votre plat en quelques étapes simples" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← Retour
          </button>
          <div className={styles.headerContent}>
            <h1>📸 Partager une photo</h1>
            <button 
              onClick={() => setShowLogs(!showLogs)} 
              className={styles.debugBtn}
              title="Debug"
            >
              🔍
            </button>
          </div>
        </div>

        {showLogs && <LogsDisplay />}

        <StepIndicator />

        <div className={styles.wizard}>
          {currentStep === 1 && <Step1PhotoCapture />}
          {currentStep === 2 && <Step2Details />}
          {currentStep === 3 && <Step3Publish />}
        </div>

        {currentStep < 3 && (
          <div className={styles.navigation}>
            {currentStep > 1 && (
              <button onClick={prevStep} className={styles.prevBtn}>
                ← Précédent
              </button>
            )}
            <button 
              onClick={nextStep} 
              className={styles.nextBtn}
              disabled={currentStep === 1 && photos.length === 0}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
