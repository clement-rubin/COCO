import { useState, useRef, useCallback, useEffect } from 'react'
import { processImageToUrl } from '../utils/imageUtils'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'
import { getRecipeImageUrl } from '../lib/supabase'
import styles from '../styles/PhotoUpload.module.css'

export default function PhotoUpload({ onPhotoSelect, maxFiles = 5, compact = false }) {
  const [photos, setPhotos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  // États spécifiques pour mobile/Android
  const [isMobile, setIsMobile] = useState(false)
  const [supportsCameraCapture, setSupportsCameraCapture] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Détection de l'environnement mobile au chargement
  useEffect(() => {
    const checkMobileEnvironment = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
      const isAndroid = /android/i.test(userAgent.toLowerCase())
      
      setIsMobile(isMobileDevice)
      
      // Correction: toujours activer supportsCameraCapture sur Android/iOS
      let hasCameraCapture = false
      try {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.capture = 'environment'
        hasCameraCapture = 'capture' in input || isAndroid || /iphone|ipad|ipod/i.test(userAgent.toLowerCase())
      } catch {
        hasCameraCapture = isAndroid // fallback
      }
      setSupportsCameraCapture(hasCameraCapture)

      logInfo('Mobile environment detected', {
        isMobile: isMobileDevice,
        isAndroid,
        supportsCameraCapture: hasCameraCapture,
        userAgent: userAgent.substring(0, 100)
      })
    }
    
    checkMobileEnvironment()
  }, [])

  const processImageToDataUrl = async (file, photoId) => {
    try {
      logDebug('Traitement de l\'image mobile', { 
        photoId, 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type,
        isMobile
      })
      
      // Compression optimisée pour mobile Android
      const compressionOptions = isMobile ? {
        maxWidth: 1200, // Plus élevé pour Android qui gère bien
        maxHeight: 900,
        quality: 0.85, // Qualité légèrement meilleure sur mobile
        maxSizeKB: 500, // Taille plus généreuse pour éviter la sur-compression
        format: 'jpeg' // Forcer JPEG pour compatibilité Android
      } : {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        maxSizeKB: 300
      }
      
      const result = await processImageToUrl(file, compressionOptions)
      
      logInfo('Image mobile traitée avec succès', { 
        photoId, 
        fileName: file.name, 
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        isMobile
      })
      
      return {
        ...result,
        originalFile: file
      }
    } catch (error) {
      logError('Erreur traitement image mobile', error, { 
        photoId, 
        fileName: file.name,
        fileSize: file.size,
        isMobile
      })
      throw error
    }
  }

  const processFiles = useCallback(async (files) => {
    setUploading(true)
    const newPhotos = []

    logUserInteraction('UPLOAD_PHOTOS_STARTED', 'photo-upload-mobile', {
      filesCount: files.length,
      maxFiles,
      currentPhotosCount: photos.length,
      isMobile,
      supportsCameraCapture
    })

    // Validation et préparation des fichiers avec support Android étendu
    const validFiles = Array.from(files)
      .filter(file => {
        // Support étendu des formats Android
        const isValidImage = file.type.startsWith('image/') || 
                           file.type === '' && /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name)
        return isValidImage
      })
      .filter(file => file.size <= 15 * 1024 * 1024) // 15MB max pour Android
      .slice(0, maxFiles - photos.length)

    if (validFiles.length === 0) {
      setUploading(false)
      logError('Aucun fichier valide trouvé', new Error('No valid files'), {
        originalFilesCount: files.length,
        isMobile
      })
      return
    }

    // Traitement de chaque fichier
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      const photoId = Date.now() + i
      
      try {
        const result = await processImageToDataUrl(file, photoId)
        
        const photoData = {
          id: photoId,
          file: result.originalFile,
          preview: result.url,
          name: file.name || `photo_${photoId}.jpg`,
          size: file.size,
          processing: false,
          processed: true,
          error: false,
          imageUrl: result.url,
          imageFile: result.originalFile,
          mimeType: result.mimeType || 'image/jpeg',
          originalSize: result.originalSize,
          isMobile: isMobile
        }
        
        newPhotos.push(photoData)
        
      } catch (error) {
        logError('Erreur lors du traitement d\'un fichier mobile', error, { 
          fileName: file.name,
          isMobile
        })
        // On continue avec les autres fichiers
      }
    }

    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
    
    setUploading(false)
    
    logUserInteraction('UPLOAD_PHOTOS_COMPLETED', 'photo-upload-mobile', {
      totalPhotos: newPhotos.length,
      successCount: newPhotos.length,
      isMobile
    })
    
  }, [photos, maxFiles, onPhotoSelect, isMobile, supportsCameraCapture])

  // Gestion du drag & drop (désactivé sur mobile)
  const handleDrag = useCallback((e) => {
    if (isMobile) return // Pas de drag & drop sur mobile
    
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [isMobile])

  const handleDrop = useCallback((e) => {
    if (isMobile) return // Pas de drag & drop sur mobile
    
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }, [processFiles, isMobile])

  // Gestion de la sélection de fichiers avec optimisations Android
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      logInfo('Fichiers sélectionnés depuis mobile', {
        filesCount: e.target.files.length,
        isMobile,
        inputType: e.target === cameraInputRef.current ? 'camera' : 'gallery'
      })
      
      processFiles(Array.from(e.target.files))
    }
    // Reset input pour permettre la sélection du même fichier
    e.target.value = ''
  }

  // Fonction pour ouvrir la caméra spécifiquement
  const openCamera = useCallback(() => {
    if (cameraInputRef.current) {
      logUserInteraction('OPEN_CAMERA', 'photo-upload-mobile', { isMobile })
      cameraInputRef.current.click()
    }
  }, [isMobile])

  // Fonction pour ouvrir la galerie
  const openGallery = useCallback(() => {
    if (fileInputRef.current) {
      logUserInteraction('OPEN_GALLERY', 'photo-upload-mobile', { isMobile })
      fileInputRef.current.click()
    }
  }, [isMobile])

  const removePhoto = (id) => {
    const photoToRemove = photos.find(photo => photo.id === id)
    if (photoToRemove && photoToRemove.preview && photoToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.preview)
    }
    
    const updatedPhotos = photos.filter(photo => photo.id !== id)
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
  }

  return (
    <div className={`${styles.photoUpload} ${isMobile ? styles.mobileOptimized : ''}`}>
      {/* Message de succès */}
      {photos.length > 0 && !uploading && (
        <div className={styles.uploadSuccess}>
          ✅ {photos.length} photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''} avec succès !
        </div>
      )}

      {/* Inputs cachés pour mobile */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={!compact}
        accept="image/*,image/heic,image/heif"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Input spécifique pour caméra Android */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Interface adaptée mobile vs desktop */}
      {isMobile ? (
        /* Interface mobile optimisée */
        <div className={styles.mobileUploadZone}>
          {uploading ? (
            <div className={styles.uploading}>
              <div className={styles.spinner}></div>
              <p>Optimisation en cours...</p>
            </div>
          ) : (
            <div className={styles.mobileActions}>
              <div className={styles.mobileHeader}>
                <div className={styles.uploadIcon}>📸</div>
                <h3>Ajoutez des photos</h3>
                <p>Prenez une photo ou choisissez dans votre galerie</p>
              </div>
              
              <div className={styles.mobileButtons}>
                {/* Toujours afficher le bouton caméra si supporté */}
                {supportsCameraCapture && (
                  <button 
                    type="button"
                    onClick={openCamera}
                    className={`${styles.mobileBtn} ${styles.cameraBtn}`}
                    disabled={photos.length >= maxFiles}
                  >
                    <span className={styles.btnIcon}>📷</span>
                    <span className={styles.btnText}>Prendre une photo</span>
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={openGallery}
                  className={`${styles.mobileBtn} ${styles.galleryBtn}`}
                  disabled={photos.length >= maxFiles}
                >
                  <span className={styles.btnIcon}>🖼️</span>
                  <span className={styles.btnText}>Choisir dans la galerie</span>
                </button>
              </div>
              
              <div className={styles.mobileTips}>
                <span>📱 Optimisé pour Android</span>
                <span>Max {maxFiles} photos</span>
                <span>JPEG, PNG, HEIC supportés</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Interface desktop classique */
        <div 
          className={`${styles.dropZone} ${dragActive ? styles.active : ''} ${photos.length >= maxFiles ? styles.disabled : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => photos.length < maxFiles && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className={styles.uploading}>
              <div className={styles.spinner}></div>
              <p>Optimisation en cours...</p>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.uploadIcon}>📸</div>
              <h3>Ajoutez des photos de votre plat</h3>
              <p>Glissez-déposez vos images ici ou cliquez pour les sélectionner</p>
              <div className={styles.uploadTips}>
                <span>Format JPEG/PNG</span>
                <span>Max {maxFiles} photos</span>
                <span>Optimisation automatique</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grille des photos */}
      {photos.length > 0 && (
        <div className={`${styles.photoGrid} ${isMobile ? styles.mobileGrid : ''}`}>
          {photos.map((photo, index) => (
            <div key={photo.id} className={`${styles.photoItem} ${isMobile ? styles.mobilePhotoItem : ''}`}>
              <img src={photo.preview} alt={photo.name} className={styles.photo} />
              <div className={styles.photoOverlay}>
                <button 
                  className={`${styles.removeBtn} ${isMobile ? styles.mobileRemoveBtn : ''}`}
                  onClick={() => removePhoto(photo.id)}
                  aria-label="Supprimer cette photo"
                >
                  ✕
                </button>
                {index === 0 && photos.length > 1 && (
                  <div className={styles.primaryBadge}>Principale</div>
                )}
                {photo.isMobile && (
                  <div className={styles.mobileBadge}>📱</div>
                )}
              </div>
              <div className={styles.photoInfo}>
                <span className={styles.fileName}>{photo.name}</span>
                <div className={styles.uploadStatus}>
                  <span className={styles.uploaded}>✅ Optimisée</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conseils adaptés */}
      {photos.length > 0 && (
        <div className={styles.photoTips}>
          <p>💡 La première photo sera utilisée comme image principale</p>
          {isMobile ? (
            <>
              <p>📱 Images optimisées automatiquement pour mobile</p>
              <p>🔋 Compression intelligente pour économiser la batterie</p>
            </>
          ) : (
            <>
              <p>🎨 Assurez-vous que vos photos montrent bien votre délicieux plat</p>
              <p>📱 Les images sont automatiquement optimisées pour un chargement rapide</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
