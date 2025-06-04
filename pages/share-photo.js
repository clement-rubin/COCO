import React, { useState, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SharePhoto.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'

export default function SharePhoto() {
  const router = useRouter()
  const { user } = useAuth()
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

  // Logger hook amélioré
  const addLog = (level, message, data = null) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null,
      step: currentStep,
      photosCount: photos.length,
      hasFormData: !!(formData.title || formData.description)
    }
    setLogs(prev => [logEntry, ...prev].slice(0, 100))
    
    // Appeler les loggers centralisés
    switch(level) {
      case 'DEBUG': logDebug(message, data); break;
      case 'INFO': logInfo(message, data); break;
      case 'WARNING': logWarning(message, data); break;
      case 'ERROR': logError(message, new Error(message), data); break;
      case 'INTERACTION': logUserInteraction(message, 'share-photo', data); break;
    }
  }

  // Log du montage du composant
  React.useEffect(() => {
    addLog('INFO', 'Composant SharePhoto monté', {
      pathname: router.pathname,
      query: router.query,
      userAgent: navigator.userAgent.substring(0, 100),
      screenSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    })
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Only log significant changes to reduce noise
    if (Math.abs(value.length - (formData[name]?.length || 0)) > 10) {
      addLog('DEBUG', `Changement de champ: ${name}`, {
        fieldName: name,
        valueLength: value.length,
        isEmpty: !value.trim(),
        step: currentStep
      })
    }
    
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    
    // Only log user interactions for significant changes
    if (value.length > 0 && value.length.length % 50 === 0) {
      logUserInteraction('FORM_FIELD_CHANGE', `champ-${name}`, {
        fieldName: name,
        valueLength: value.length,
        step: currentStep
      })
    }
  }

  const validateForm = () => {
    addLog('INFO', 'Début de la validation du formulaire photo')
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire'
      addLog('WARNING', 'Validation échouée: titre manquant')
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire'
      addLog('WARNING', 'Validation échouée: description manquante')
    }
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est obligatoire'
      addLog('WARNING', 'Validation échouée: aucune photo')
    }
    
    const hasProcessingPhotos = photos.some(photo => photo.processing)
    const hasErrorPhotos = photos.some(photo => photo.error)
    
    if (hasProcessingPhotos) {
      newErrors.photos = 'Attendez que toutes les photos soient traitées'
      addLog('WARNING', 'Validation échouée: photos en cours de traitement', {
        processingCount: photos.filter(p => p.processed).length
      })
    }
    
    if (hasErrorPhotos) {
      newErrors.photos = 'Certaines photos ont des erreurs, veuillez les corriger'
      addLog('WARNING', 'Validation échouée: photos avec erreurs', {
        errorCount: photos.filter(p => p.error).length,
        errorPhotos: photos.filter(p => p.error).map(p => ({ id: p.id, name: p.name, error: p.errorMessage }))
      })
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    addLog('INFO', 'Résultat de validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      step: currentStep
    })
    
    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!user) {
      addLog('WARNING', 'Utilisateur non connecté, redirection vers login')
      router.push('/login')
      return
    }

    setIsSubmitting(true)
    addLog('info', 'Début de soumission de photo partagée', {
      formData: {
        title: formData.title,
        description: formData.description,
        photosCount: photos.length
      },
      user: {
        id: user.id.substring(0, 8) + '...',
        email: user.email
      }
    })

    try {
      // Récupérer le display_name depuis la table profiles
      let authorName = 'Chef Anonyme'
      try {
        addLog('info', 'Récupération du display_name depuis profiles', { userId: user.id.substring(0, 8) + '...' })
        
        const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData?.display_name) {
            authorName = profileData.display_name
            addLog('info', 'Display_name récupéré avec succès', { authorName })
          } else {
            addLog('warning', 'Aucun display_name trouvé dans le profil', { profileData })
          }
        } else {
          addLog('warning', 'Impossible de récupérer le profil', { 
            status: profileResponse.status,
            statusText: profileResponse.statusText 
          })
        }
      } catch (profileError) {
        addLog('error', 'Erreur lors de la récupération du profil', { error: profileError.message })
      }

      const recipeData = {
        title: formData.title,
        description: formData.description,
        author: authorName, // Utilisation du display_name récupéré
        user_id: user.id,
        category: 'Photo partagée',
        difficulty: 'Facile',
        ingredients: ['Photo instantanée partagée'],
        instructions: [{ step: 1, instruction: 'Savourez cette délicieuse création !' }],
        image: photos.length > 0 ? photos[0].imageUrl : null
      }

      addLog('info', 'Données de recette préparées', {
        ...recipeData,
        author: authorName,
        imageSize: recipeData.image?.length || 0,
        user_id: user.id.substring(0, 8) + '...'
      })

      // Estimer la taille totale du payload
      const payloadSize = JSON.stringify(recipeData).length
      const payloadSizeKB = Math.round(payloadSize / 1024)
      const imageSizeKB = recipeData.image ? Math.round(recipeData.image.length / 1024) : 0
      
      addLog('INFO', 'Données préparées pour envoi API', {
        title: recipeData.title,
        titleLength: recipeData.title.length,
        hasDescription: !!recipeData.description,
        descriptionLength: recipeData.description.length,
        imageLength: recipeData.image?.length || 0,
        imageSizeKB,
        payloadSizeKB,
        imagePrefix: recipeData.image ? recipeData.image.substring(0, 50) + '...' : 'no image',
        imageType: typeof recipeData.image,
        isDataUrl: recipeData.image ? recipeData.image.startsWith('data:image/') : false,
        category: recipeData.category,
        author: recipeData.author
      })
      
      if (payloadSizeKB > 800) {
        throw new Error(`Données trop volumineuses: ${payloadSizeKB}KB. L'image doit être compressée davantage.`)
      }
      
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      addLog('INFO', 'Réponse API reçue', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        
        addLog('ERROR', 'Erreur de soumission API', { 
          status: response.status, 
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          errorData,
          responseHeaders: Object.fromEntries(response.headers.entries())
        })
        
        throw new Error(errorData.error || errorText || `Erreur HTTP ${response.status}`)
      }
      
      const result = await response.json()
      
      addLog('INFO', 'Photo partagée avec succès', {
        recipeId: result.id,
        message: result.message,
        responseKeys: Object.keys(result),
        submissionTime: new Date().toISOString()
      })
      
      logUserInteraction('PHOTO_SHARED_SUCCESS', 'soumission-photo', {
        recipeId: result.id,
        title: formData.title,
        photosCount: photos.length,
        step: currentStep
      })
      
      setShowSuccessMessage(true)
      
    } catch (error) {
      addLog('ERROR', 'Erreur lors de la soumission', { 
        errorName: error.name,
        errorMessage: error.message, 
        errorStack: error.stack,
        step: currentStep,
        photosCount: photos.length,
        formDataState: {
          hasTitle: !!formData.title,
          hasDescription: !!formData.description
        }
      })
      
      logError('Erreur soumission SharePhoto', error, {
        component: 'SharePhoto',
        action: 'handleSubmit',
        step: currentStep,
        photosCount: photos.length
      })
      
      // Messages d'erreur plus spécifiques
      let errorMessage = error.message
      if (error.message.includes('Body exceeded 1mb limit')) {
        errorMessage = 'L\'image est trop volumineuse. Veuillez utiliser une image plus petite ou la compresser davantage.'
      } else if (error.message.includes('trop volumineuse')) {
        errorMessage = error.message + ' Essayez de prendre une photo avec une résolution plus faible.'
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
      addLog('DEBUG', 'Fin de processus de soumission', {
        isSubmitting: false,
        step: currentStep
      })
    }
  }

  const nextStep = () => {
    addLog('INFO', `Tentative de passage à l'étape suivante (${currentStep} -> ${currentStep + 1})`, {
      currentStep,
      hasTitle: !!formData.title.trim(),
      photosCount: photos.length
    })
    
    if (currentStep === 1) {
      // Validation pour l'étape 1: photo ET titre requis
      const newErrors = {}
      
      if (photos.length === 0) {
        newErrors.photos = 'Une photo est requise pour continuer'
      }
      
      if (!formData.title.trim()) {
        newErrors.title = 'Le titre est requis pour continuer'
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        addLog('WARNING', 'Impossible de passer à l\'étape suivante', {
          errors: Object.keys(newErrors),
          hasPhoto: photos.length > 0,
          hasTitle: !!formData.title.trim()
        })
        return
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
      setErrors({})
      
      addLog('INFO', `Passage à l'étape ${currentStep + 1} réussi`)
      
      logUserInteraction('STEP_CHANGE', 'navigation-etapes', {
        fromStep: currentStep,
        toStep: currentStep + 1,
        direction: 'next'
      })
    }
  }

  const prevStep = () => {
    addLog('INFO', `Retour à l'étape précédente (${currentStep} -> ${currentStep - 1})`, {
      currentStep
    })
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
      
      logUserInteraction('STEP_CHANGE', 'navigation-etapes', {
        fromStep: currentStep,
        toStep: currentStep - 1,
        direction: 'previous'
      })
    }
  }

  // Logs pour les changements de photos
  React.useEffect(() => {
    addLog('DEBUG', 'État des photos mis à jour', {
      photosCount: photos.length,
      processed: photos.filter(p => p.processed).length,
      processing: photos.filter(p => p.processing).length,
      errors: photos.filter(p => p.error).length,
      step: currentStep
    })
  }, [photos, currentStep])

  // Message de confirmation de soumission
  if (showSuccessMessage) {
    return (
      <div className={styles.successMessage}>
        <div className={styles.successCard}>
          <div style={{ 
            fontSize: '5rem', 
            marginBottom: '1.5rem',
            animation: 'bounce 1s ease-in-out infinite alternate'
          }}>
            🎉
          </div>
          <h1 style={{ 
            fontSize: '2.2rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            letterSpacing: '-0.02em'
          }}>
            Photo partagée avec succès !
          </h1>
          <p style={{ 
            color: '#64748b',
            lineHeight: '1.6',
            marginBottom: '2rem',
            fontSize: '1.1rem',
            fontWeight: '500'
          }}>
            Votre délicieux plat <strong>"{formData.title}"</strong> est maintenant visible par toute la communauté COCO !
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexDirection: 'column'
          }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px) scale(1.02)'
                e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'none'
                e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              🏠 Retour à l'accueil
            </button>
            <button
              onClick={() => router.push('/share-photo')}
              style={{
                padding: '0.75rem 2rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#059669',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(16, 185, 129, 0.1)'
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
              }}
            >
              📸 Partager une autre photo
            </button>
          </div>
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
        maxWidth: '900px',
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
          <h3 style={{ margin: 0 }}>🔍 Logs de débogage SharePhoto ({logs.length})</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              Étape: {currentStep} | Photos: {photos.length}
            </span>
            <button 
              onClick={() => setLogs([])}
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '5px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Vider
            </button>
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
        </div>
        
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px'
        }}>
          {logs.map(log => (
            <div key={log.id} style={{
              marginBottom: '15px',
              padding: '12px',
              borderRadius: '8px',
              background: log.level === 'ERROR' ? '#ffebee' : 
                         log.level === 'WARNING' ? '#fff3e0' :
                         log.level === 'INFO' ? '#e3f2fd' :
                         log.level === 'INTERACTION' ? '#e8f5e8' : '#f5f5f5',
              borderLeft: `4px solid ${
                log.level === 'ERROR' ? '#f44336' : 
                log.level === 'WARNING' ? '#ff9800' :
                log.level === 'INFO' ? '#2196f3' :
                log.level === 'INTERACTION' ? '#4caf50' : '#9e9e9e'
              }`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    color: log.level === 'ERROR' ? '#f44336' : 
                          log.level === 'WARNING' ? '#ff9800' :
                          log.level === 'INFO' ? '#2196f3' :
                          log.level === 'INTERACTION' ? '#4caf50' : '#9e9e9e'
                  }}>
                    {log.level}
                  </span>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#666',
                    background: 'rgba(0,0,0,0.1)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    Étape {log.step}
                  </span>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: '#666',
                    background: 'rgba(0,0,0,0.1)',
                    padding: '2px 6px',
                    borderRadius: '3px'
                  }}>
                    Photos: {log.photosCount}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div style={{ marginBottom: '8px', fontWeight: '500' }}>{log.message}</div>
              {log.data && (
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    color: '#666',
                    userSelect: 'none'
                  }}>
                    Voir les détails
                  </summary>
                  <pre style={{
                    background: 'rgba(0, 0, 0, 0.05)',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '8px'
                  }}>
                    {log.data}
                  </pre>
                </details>
              )}
            </div>
          ))}
          
          {logs.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic',
              padding: '40px'
            }}>
              Aucun log disponible. Les actions seront enregistrées ici.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Step components
  const StepIndicator = () => (
    <div className={styles.stepIndicator}>
      <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>1</span>
        <span className={styles.stepLabel}>Photo & Titre</span>
      </div>
      <div className={styles.stepLine}></div>
      <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}>
        <span className={styles.stepNumber}>2</span>
        <span className={styles.stepLabel}>Description</span>
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
        <h2>📸 Votre plat en image</h2>
        <p>Sélectionnez une photo et donnez-lui un nom appétissant</p>
      </div>

      <div className={styles.photoSection}>
        <PhotoUpload 
          onPhotoSelect={setPhotos}
          maxFiles={1}
          compact={true}
        />

        {photos.length > 0 && (
          <div className={styles.photoPreview}>
            <div className={styles.previewBadge}>
              <span className={styles.checkIcon}>✅</span>
              Photo sélectionnée avec succès !
            </div>
            <div className={styles.previewGrid}>
              {photos.map((photo, index) => (
                <div key={photo.id || index} className={styles.previewItem}>
                  <img src={photo.preview} alt="Aperçu" className={styles.previewImage} />
                  <button 
                    onClick={() => setPhotos([])} 
                    className={styles.removeBtn}
                    title="Supprimer cette photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.photos && <div className={styles.errorMessage}>{errors.photos}</div>}
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.modernLabel}>
            <span className={styles.labelIcon}>🍽️</span>
            <span className={styles.labelText}>
              Nom de votre plat <span className={styles.required}>*</span>
            </span>
          </label>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Ex: Tarte aux pommes de grand-mère"
              className={`${styles.modernInput} ${errors.title ? styles.inputError : ''}`}
              maxLength={80}
            />
            <div className={styles.inputAccent}></div>
            <div className={styles.charCount}>
              {formData.title.length}/80
            </div>
          </div>
          {errors.title && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {errors.title}
            </div>
          )}
          <div className={styles.inputHint}>
            💡 Choisissez un nom qui donne envie de déguster votre plat !
          </div>
        </div>
      </div>
    </div>
  )

  const Step2Details = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>📝 Parlez-nous en plus</h2>
        <p>Ajoutez une description pour rendre votre plat encore plus appétissant</p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.modernLabel}>
            <span className={styles.labelIcon}>✨</span>
            <span className={styles.labelText}>
              Description de votre plat <span className={styles.optional}>(optionnel)</span>
            </span>
          </label>
          <div className={styles.textareaWrapper}>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Décrivez votre délicieux plat : les ingrédients spéciaux, l'histoire derrière cette recette, ce qui la rend unique..."
              rows={6}
              className={styles.modernTextarea}
              maxLength={500}
            />
            <div className={styles.inputAccent}></div>
            <div className={styles.charCount}>
              {formData.description.length}/500
            </div>
          </div>
          <div className={styles.inputHint}>
            💡 Plus votre description est détaillée et personnelle, plus elle inspirera les autres gourmets !
          </div>
        </div>

        <div className={styles.inspirationBox}>
          <h4>🌟 Idées de description</h4>
          <ul>
            <li>Partagez l'histoire de cette recette (famille, voyage, découverte...)</li>
            <li>Mentionnez les ingrédients qui font la différence</li>
            <li>Décrivez les saveurs et textures</li>
            <li>Ajoutez vos astuces de préparation</li>
          </ul>
        </div>
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
              disabled={currentStep === 1 && (photos.length === 0 || !formData.title.trim())}
            >
              {currentStep === 3 ? 'Publier' : 'Suivant →'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
