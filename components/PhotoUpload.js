import { useState, useRef, useCallback } from 'react'
import { processImageToUrl } from '../utils/imageUtils'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'
import { getRecipeImageUrl } from '../lib/supabase'
import styles from '../styles/PhotoUpload.module.css'

export default function PhotoUpload({ onPhotoSelect, maxFiles = 5, compact = false }) {
  const [photos, setPhotos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const processImageToDataUrl = async (file, photoId) => {
    try {
      logDebug('Traitement de l\'image', { 
        photoId, 
        fileName: file.name, 
        fileSize: file.size,
        fileType: file.type
      })
      
      // Compression optimisée pour éviter les erreurs de taille
      const compressionOptions = {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        maxSizeKB: 300
      }
      
      const result = await processImageToUrl(file, compressionOptions)
      
      logInfo('Image traitée avec succès', { 
        photoId, 
        fileName: file.name, 
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio
      })
      
      return result
    } catch (error) {
      logError('Erreur traitement image', error, { 
        photoId, 
        fileName: file.name,
        fileSize: file.size
      })
      throw error
    }
  }

  const processFiles = useCallback(async (files) => {
    setUploading(true)
    const newPhotos = []

    logUserInteraction('UPLOAD_PHOTOS_STARTED', 'photo-upload', {
      filesCount: files.length,
      maxFiles,
      currentPhotosCount: photos.length
    })

    // Validation et préparation des fichiers
    const validFiles = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .filter(file => file.size <= 10 * 1024 * 1024) // 10MB max
      .slice(0, maxFiles - photos.length)

    if (validFiles.length === 0) {
      setUploading(false)
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
          file: file,
          preview: result.url,
          name: file.name,
          size: file.size,
          processing: false,
          processed: true,
          error: false,
          imageUrl: result.url,
          mimeType: result.mimeType,
          originalSize: result.originalSize
        }
        
        newPhotos.push(photoData)
        
      } catch (error) {
        logError('Erreur lors du traitement d\'un fichier', error, { fileName: file.name })
        // On continue avec les autres fichiers
      }
    }

    // Mettre à jour l'état avec toutes les nouvelles photos
    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
    
    setUploading(false)
    
    logUserInteraction('UPLOAD_PHOTOS_COMPLETED', 'photo-upload', {
      totalPhotos: newPhotos.length,
      successCount: newPhotos.length
    })
    
  }, [photos, maxFiles, onPhotoSelect])

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }, [processFiles])

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files))
    }
    // Reset input pour permettre la sélection du même fichier
    e.target.value = ''
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

  return (
    <div className={styles.photoUpload}>
      {/* Message de succès */}
      {photos.length > 0 && !uploading && (
        <div className={styles.uploadSuccess}>
          ✅ {photos.length} photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''} avec succès !
        </div>
      )}

      {/* Zone de drop */}
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
          multiple={!compact}
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
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

      {/* Grille des photos */}
      {photos.length > 0 && (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <div key={photo.id} className={styles.photoItem}>
              <img src={photo.preview} alt={photo.name} className={styles.photo} />
              <div className={styles.photoOverlay}>
                <button 
                  className={styles.removeBtn}
                  onClick={() => removePhoto(photo.id)}
                  aria-label="Supprimer cette photo"
                >
                  ✕
                </button>
                {index === 0 && photos.length > 1 && (
                  <div className={styles.primaryBadge}>Principale</div>
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

      {/* Conseils */}
      {photos.length > 0 && (
        <div className={styles.photoTips}>
          <p>💡 La première photo sera utilisée comme image principale</p>
          <p>🎨 Assurez-vous que vos photos montrent bien votre délicieux plat</p>
          <p>📱 Les images sont automatiquement optimisées pour un chargement rapide</p>
        </div>
      )}
    </div>
  )
}
