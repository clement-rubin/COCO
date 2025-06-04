import { useState, useRef, useCallback } from 'react'
import { processImageToUrl, estimateDataUrlSize } from '../utils/imageUtils'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'
import styles from '../styles/PhotoUpload.module.css'

export default function PhotoUpload({ onPhotoSelect, maxFiles = 5 }) {
  const [photos, setPhotos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [globalProgress, setGlobalProgress] = useState(0)
  const fileInputRef = useRef(null)

  const processImageToDataUrl = async (file, photoId) => {
    try {
      logDebug('Conversion en Data URL avec compression', { 
        photoId, 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type
      })
      
      setUploadProgress(prev => ({ ...prev, [photoId]: 0 }))
      
      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[photoId] || 0
          if (current < 85) {
            return { ...prev, [photoId]: current + Math.random() * 15 }
          }
          return prev
        })
      }, 200)
      
      // Utiliser la compression pour éviter l'erreur 1MB
      const compressionOptions = {
        maxWidth: 1000,
        maxHeight: 750,
        quality: 0.75,
        maxSizeKB: 250 // Limite stricte pour éviter les erreurs de taille
      }
      
      // Conversion en Data URL avec compression
      const result = await processImageToUrl(file, compressionOptions)
      
      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [photoId]: 100 }))
      
      // Vérifier la taille finale
      const dataUrlSizeKB = Math.round(result.url.length * 0.75 / 1024)
      
      if (dataUrlSizeKB > 400) {
        throw new Error(`Image encore trop volumineuse après compression: ${dataUrlSizeKB}KB`)
      }
      
      logInfo('Image convertie et compressée avec succès', { 
        photoId, 
        fileName: file.name, 
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        dataUrlSizeKB,
        compressionRatio: result.compressionRatio
      })
      
      return result
    } catch (error) {
      logError('Erreur conversion Data URL', error, { 
        photoId, 
        fileName: file.name,
        fileSize: file.size,
        errorMessage: error.message
      })
      setUploadProgress(prev => ({ ...prev, [photoId]: -1 })) // -1 = erreur
      throw error
    }
  }

  const updateGlobalProgress = (photos) => {
    const totalPhotos = photos.length
    if (totalPhotos === 0) {
      setGlobalProgress(0)
      return
    }

    const processedPhotos = photos.filter(photo => photo.processed).length
    const processingPhotos = photos.filter(photo => photo.processing)
    
    let progressSum = processedPhotos * 100
    
    processingPhotos.forEach(photo => {
      const progress = uploadProgress[photo.id] || 0
      progressSum += progress
    })
    
    const globalPercent = Math.round(progressSum / totalPhotos)
    setGlobalProgress(globalPercent)
  }

  const processFiles = useCallback(async (files) => {
    setUploading(true)
    setGlobalProgress(0)
    const newPhotos = []

    logUserInteraction('UPLOAD_PHOTOS_STARTED', 'photo-upload', {
      filesCount: files.length,
      maxFiles,
      currentPhotosCount: photos.length
    })

    // Validation des fichiers avec estimation de taille
    const validFiles = []
    
    for (const file of Array.from(files)) {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB max
      
      if (!isValidType) {
        logError('Fichier ignoré - type invalide', new Error('Invalid file type'), { fileName: file.name, type: file.type })
        continue
      }
      
      if (!isValidSize) {
        logError('Fichier ignoré - trop volumineux', new Error('File too large'), { fileName: file.name, size: file.size })
        continue
      }
      
      // Estimation de la taille finale
      const estimatedSize = estimateDataUrlSize(file.size, 0.6) // Compression agressive
      if (estimatedSize > 500) {
        logWarning('Fichier volumineux, compression agressive appliquée', { fileName: file.name, estimatedSizeKB: estimatedSize })
      }
      
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      setUploading(false)
      logError('Aucun fichier valide trouvé', new Error('No valid files'))
      return
    }

    // Étape 1: Préparer toutes les photos
    for (let i = 0; i < Math.min(validFiles.length, maxFiles - photos.length); i++) {
      const file = validFiles[i]
      
      const photoId = Date.now() + i
      const preview = URL.createObjectURL(file)
      
      const photoData = {
        id: photoId,
        file: file,
        preview,
        name: file.name,
        size: file.size,
        processing: true,
        processed: false,
        error: false,
        imageUrl: null, // Nouvelle propriété pour stocker l'URL
        mimeType: file.type
      }
      
      newPhotos.push(photoData)
    }

    // Mettre à jour immédiatement l'état
    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
    updateGlobalProgress(updatedPhotos)

    // Étape 2: Traitement séquentiel
    for (const photoData of newPhotos) {
      try {
        const result = await processImageToDataUrl(photoData.file, photoData.id)
        
        // Mettre à jour la photo avec l'URL
        photoData.processing = false
        photoData.processed = true
        photoData.imageUrl = result.url // Stocker l'URL au lieu des bytes
        photoData.mimeType = result.mimeType
        photoData.originalSize = result.originalSize
        photoData.error = false
        
        // Nettoyer l'URL de prévisualisation
        URL.revokeObjectURL(photoData.preview)
        photoData.preview = result.url
        
        // Mettre à jour l'état après chaque traitement
        setPhotos(prevPhotos => {
          const updated = prevPhotos.map(p => p.id === photoData.id ? photoData : p)
          updateGlobalProgress(updated)
          onPhotoSelect && onPhotoSelect(updated)
          return updated
        })
        
      } catch (error) {
        photoData.processing = false
        photoData.processed = false
        photoData.error = true
        photoData.errorMessage = error.message || 'Erreur de traitement'
        
        // Mettre à jour l'état même en cas d'erreur
        setPhotos(prevPhotos => {
          const updated = prevPhotos.map(p => p.id === photoData.id ? photoData : p)
          updateGlobalProgress(updated)
          onPhotoSelect && onPhotoSelect(updated)
          return updated
        })
      }
    }

    setUploading(false)
    
    const successCount = newPhotos.filter(p => p.processed).length
    const errorCount = newPhotos.filter(p => p.error).length
    
    logUserInteraction('UPLOAD_PHOTOS_COMPLETED', 'photo-upload', {
      totalPhotos: newPhotos.length,
      successCount,
      errorCount
    })
    
  }, [photos, maxFiles, onPhotoSelect, uploadProgress])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }, [processFiles])

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(Array.from(e.target.files))
    }
  }

  const removePhoto = (id) => {
    const photoToRemove = photos.find(photo => photo.id === id)
    if (photoToRemove && photoToRemove.preview && photoToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.preview)
    }
    
    const updatedPhotos = photos.filter(photo => photo.id !== id)
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
  }

  // Calculer l'état global
  const hasProcessingPhotos = photos.some(photo => photo.processing)
  const hasErrorPhotos = photos.some(photo => photo.error)
  const allPhotosProcessed = photos.length > 0 && photos.every(photo => photo.processed)
  const readyForSubmission = photos.length > 0 && !hasProcessingPhotos && !hasErrorPhotos && allPhotosProcessed

  return (
    <div className={styles.photoUpload}>
      {/* Barre de progression globale */}
      {(hasProcessingPhotos || uploading) && (
        <div className={styles.globalProgress}>
          <div className={styles.progressHeader}>
            <span>🔄 Traitement en cours...</span>
            <span>{globalProgress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${globalProgress}%` }}
            ></div>
          </div>
          <div className={styles.progressDetails}>
            {photos.filter(p => p.processed).length} sur {photos.length} photos traitées
          </div>
        </div>
      )}

      {/* Message de confirmation */}
      {readyForSubmission && (
        <div className={styles.uploadSuccess}>
          ✅ Toutes les photos ont été optimisées ! Prêtes pour la soumission.
        </div>
      )}

      {/* Message d'erreur */}
      {hasErrorPhotos && (
        <div className={styles.uploadError}>
          ❌ Certaines photos n'ont pas pu être traitées. Veuillez les supprimer et réessayer.
        </div>
      )}

      <div 
        className={`${styles.dropZone} ${dragActive ? styles.active : ''} ${photos.length >= maxFiles ? styles.disabled : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => photos.length < maxFiles && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {uploading ? (
          <div className={styles.uploading}>
            <div className={styles.spinner}></div>
            <p>Traitement et optimisation en cours...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.uploadIcon}>📷</div>
            <h3>Ajoutez des photos de votre plat</h3>
            <p>Glissez-déposez vos images ou cliquez pour les sélectionner</p>
            <div className={styles.uploadTips}>
              <span>✓ Format JPEG/PNG</span>
              <span>✓ Max {maxFiles} photos</span>
              <span>✓ Traitement automatique</span>
            </div>
          </div>
        ) : (
          <div className={styles.addMore}>
            <span className={styles.addIcon}>+</span>
            <p>Ajouter plus de photos ({photos.length}/{maxFiles})</p>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <div key={photo.id} className={styles.photoItem}>
              <img src={photo.preview} alt={photo.name} className={styles.photo} />
              <div className={styles.photoOverlay}>
                <button 
                  className={styles.removeBtn}
                  onClick={() => removePhoto(photo.id)}
                >
                  ✕
                </button>
                {index === 0 && (
                  <div className={styles.primaryBadge}>Photo principale</div>
                )}
              </div>
              <div className={styles.photoInfo}>
                <span className={styles.fileName}>{photo.name}</span>
                <div className={styles.uploadStatus}>
                  {photo.processing && (
                    <div className={styles.uploadingStatus}>
                      <span className={styles.uploading}>⏳ Optimisation...</span>
                      <div className={styles.individualProgress}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${uploadProgress[photo.id] || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {photo.processed && (
                    <span className={styles.uploaded}>✅ Optimisé</span>
                  )}
                  {photo.error && (
                    <span className={styles.error}>❌ Erreur</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length > 1 && (
        <div className={styles.photoTips}>
          <p>💡 La première photo sera utilisée comme image principale</p>
          <p>🔄 Glissez-déposez pour réorganiser</p>
          <p>💾 Les images sont optimisées automatiquement en Data URLs</p>
        </div>
      )}
    </div>
  )
}
