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
    description: ''
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
    const timestamp = new Date().toISOString()
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    }
    setLogs(prev => [logEntry, ...prev].slice(0, 50)) // Garder les 50 derniers logs
  }

  // Camera functions
  const startCamera = async () => {
    try {
      addLog('INFO', 'Démarrage de la caméra')
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setCameraMode(true)
      addLog('SUCCESS', 'Caméra démarrée avec succès')
    } catch (error) {
      addLog('ERROR', 'Erreur démarrage caméra', { error: error.message })
      alert('Impossible d\'accéder à la caméra: ' + error.message)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setCameraMode(false)
    addLog('INFO', 'Caméra arrêtée')
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      // Convertir en Data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      
      // Créer un objet photo compatible
      const photoData = {
        id: Date.now(),
        name: `photo-${Date.now()}.jpg`,
        size: Math.round(dataUrl.length * 0.75), // Estimation de la taille
        preview: dataUrl,
        imageUrl: dataUrl, // Nouvelle propriété pour l'URL
        processed: true,
        processing: false,
        error: false,
        mimeType: 'image/jpeg'
      }
      
      setPhotos(prev => [...prev, photoData])
      addLog('SUCCESS', 'Photo capturée', { photoId: photoData.id })
      stopCamera()
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis'
    }
    
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est requise'
    }
    
    const hasProcessingPhotos = photos.some(photo => photo.processing)
    const hasErrorPhotos = photos.some(photo => photo.error)
    
    if (hasProcessingPhotos) {
      newErrors.photos = 'Attendez que toutes les photos soient traitées'
    }
    
    if (hasErrorPhotos) {
      newErrors.photos = 'Certaines photos ont des erreurs, veuillez les corriger'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      addLog('ERROR', 'Validation du formulaire échouée', errors)
      return
    }
    
    setIsSubmitting(true)
    addLog('INFO', 'Début de la soumission', { 
      title: formData.title, 
      photosCount: photos.length 
    })
    
    try {
      // Préparer les données pour la soumission
      const submitData = {
        title: formData.title,
        description: formData.description || `Photo partagée: ${formData.title}`,
        category: 'Photo partagée',
        author: 'Utilisateur anonyme',
        image: photos[0]?.imageUrl || photos[0]?.preview, // Utiliser imageUrl en priorité
        ingredients: ['Photo partagée sans recette détaillée'],
        instructions: [{ step: 1, instruction: 'Voir la photo pour inspiration' }],
        prepTime: null,
        cookTime: null,
        difficulty: 'Facile'
      }
      
      addLog('INFO', 'Envoi des données', {
        hasTitle: !!submitData.title,
        hasImage: !!submitData.image,
        imageType: typeof submitData.image,
        imageLength: submitData.image?.length
      })
      
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })
      
      addLog('INFO', 'Réponse reçue', { 
        status: response.status, 
        statusText: response.statusText 
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        
        addLog('ERROR', 'Erreur de soumission', { 
          status: response.status, 
          error: errorData 
        })
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }
      
      const result = await response.json()
      addLog('SUCCESS', 'Photo partagée avec succès', result)
      
      setShowSuccessMessage(true)
      
    } catch (error) {
      addLog('ERROR', 'Erreur lors de la soumission', { 
        message: error.message, 
        stack: error.stack 
      })
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && !formData.title.trim()) {
      setErrors({ title: 'Le titre est requis pour continuer' })
      return
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      setErrors({})
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  // Message de confirmation de soumission
  if (showSuccessMessage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: '#333', marginBottom: '15px' }}>Photo partagée !</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Votre photo a été partagée avec succès dans la communauté COCO.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              marginRight: '10px'
            }}
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => router.push('/mes-recettes')}
            style={{
              background: 'transparent',
              color: '#667eea',
              border: '2px solid #667eea',
              padding: '15px 30px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem'
            }}
          >
            Voir mes photos
          </button>
        </div>
      </div>
    )
  }

  // Logs component
  const LogsComponent = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        width: '90%',
        maxWidth: '800px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>Logs de débogage</h3>
          <button 
            onClick={() => setShowLogs(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {logs.map(log => (
            <div key={log.id} style={{
              marginBottom: '15px',
              padding: '10px',
              borderRadius: '5px',
              background: log.level === 'ERROR' ? '#ffebee' : 
                         log.level === 'SUCCESS' ? '#e8f5e8' : '#f5f5f5',
              borderLeft: `4px solid ${
                log.level === 'ERROR' ? '#f44336' : 
                log.level === 'SUCCESS' ? '#4caf50' : '#2196f3'
              }`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '5px'
              }}>
                <span style={{
                  fontWeight: 'bold',
                  color: log.level === 'ERROR' ? '#f44336' : 
                        log.level === 'SUCCESS' ? '#4caf50' : '#2196f3'
                }}>
                  {log.level}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ marginBottom: '5px' }}>{log.message}</div>
              {log.data && (
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  padding: '10px',
                  borderRadius: '3px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {log.data}
                </pre>
              )}
            </div>
          ))}
        </div>
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
            Photo partagée par un membre de COCO
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

        {showLogs && <LogsComponent />}

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
