import { useState, useRef, useCallback } from 'react'
import { uploadImageWithRetry, uploadImage, getImageUrl } from '../lib/supabase'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'
import styles from '../styles/PhotoUpload.module.css'

export default function PhotoUpload({ onPhotoSelect, maxFiles = 5 }) {
  const [photos, setPhotos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [globalProgress, setGlobalProgress] = useState(0)
  const fileInputRef = useRef(null)

  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const uploadToSupabase = async (file, photoId) => {
    try {
      // Vérifier que le bucket est disponible avant de commencer
      logDebug('Vérification du bucket avant upload', { photoId, fileName: file.name });
      
      const bucketAvailable = await createImageStorageBucket();
      if (!bucketAvailable) {
        throw new Error('❌ Bucket de stockage non disponible. Veuillez configurer Supabase Storage selon les instructions du README.');
      }

      // Générer un nom de fichier unique et sécurisé
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const fileExtension = file.name.split('.').pop().toLowerCase()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50)
      const fileName = `recipe_${timestamp}_${randomString}_${safeName}.${fileExtension}`
      
      logDebug('Début upload Supabase', { 
        photoId, 
        fileName, 
        fileSize: file.size,
        fileType: file.type
      })
      
      setUploadProgress(prev => ({ ...prev, [photoId]: 0 }))
      
      // Simuler la progression d'upload avec des étapes plus réalistes
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[photoId] || 0
          if (current < 85) {
            return { ...prev, [photoId]: current + Math.random() * 15 }
          }
          return prev
        })
      }, 300)
      
      // Upload avec retry automatique
      const uploadData = await uploadImageWithRetry(file, fileName)
      const publicUrl = getImageUrl(uploadData.path)
      
      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [photoId]: 100 }))
      
      // Validation de l'URL générée
      if (!publicUrl || !uploadData.path) {
        throw new Error('URL de l\'image non générée correctement')
      }
      
      logInfo('Upload Supabase réussi', { 
        photoId, 
        fileName, 
        path: uploadData.path,
        url: publicUrl,
        fileSize: file.size
      })
      
      return {
        path: uploadData.path,
        url: publicUrl,
        fileName: fileName
      }
    } catch (error) {
      logError('Erreur upload Supabase', error, { 
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

    const uploadedPhotos = photos.filter(photo => photo.uploaded).length
    const uploadingPhotos = photos.filter(photo => photo.uploading)
    
    let progressSum = uploadedPhotos * 100
    
    uploadingPhotos.forEach(photo => {
      const progress = uploadProgress[photo.id] || 0
      progressSum += progress
    })
    
    const globalPercent = Math.round(progressSum / totalPhotos)
    setGlobalProgress(globalPercent)
    
    logDebug('Progression globale mise à jour', {
      totalPhotos,
      uploadedPhotos,
      uploadingCount: uploadingPhotos.length,
      globalPercent
    })
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

    // Validation des fichiers avant traitement
    const validFiles = Array.from(files).filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 6 * 1024 * 1024 // 6MB max selon Supabase
      
      if (!isValidType) {
        logWarning('Fichier ignoré - type invalide', { fileName: file.name, type: file.type })
      }
      if (!isValidSize) {
        logWarning('Fichier ignoré - trop volumineux', { fileName: file.name, size: file.size })
      }
      
      return isValidType && isValidSize
    })

    if (validFiles.length === 0) {
      setUploading(false)
      logError('Aucun fichier valide trouvé', new Error('No valid files'), { 
        originalCount: files.length,
        validCount: validFiles.length 
      })
      return
    }

    // Étape 1: Préparer toutes les photos avec compression
    for (let i = 0; i < Math.min(validFiles.length, maxFiles - photos.length); i++) {
      const file = validFiles[i]
      
      try {
        const photoId = Date.now() + i
        const compressedFile = await compressImage(file)
        const preview = URL.createObjectURL(compressedFile)
        
        const photoData = {
          id: photoId,
          file: compressedFile,
          preview,
          name: file.name,
          size: compressedFile.size,
          uploading: true,
          uploaded: false,
          error: false,
          supabaseUrl: null,
          supabasePath: null
        }
        
        newPhotos.push(photoData)
        
        logDebug('Photo préparée pour upload', { 
          photoId, 
          fileName: file.name, 
          originalSize: file.size,
          compressedSize: compressedFile.size 
        })
        
      } catch (error) {
        logError('Erreur lors de la compression', error, { fileName: file.name })
      }
    }

    // Étape 2: Mettre à jour immédiatement l'état avec les nouvelles photos
    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
    updateGlobalProgress(updatedPhotos)

    // Étape 3: Upload séquentiel pour éviter la surcharge
    for (const photoData of newPhotos) {
      try {
        const uploadResult = await uploadToSupabase(photoData.file, photoData.id)
        
        // Mettre à jour la photo avec les données d'upload
        photoData.uploading = false
        photoData.uploaded = true
        photoData.supabasePath = uploadResult.path
        photoData.supabaseUrl = uploadResult.url
        photoData.error = false
        
        logInfo('Photo uploadée avec succès', { 
          photoId: photoData.id, 
          fileName: uploadResult.fileName,
          url: uploadResult.url 
        })
        
        // Mettre à jour l'état après chaque upload réussi
        setPhotos(prevPhotos => {
          const updated = prevPhotos.map(p => p.id === photoData.id ? photoData : p)
          updateGlobalProgress(updated)
          onPhotoSelect && onPhotoSelect(updated)
          return updated
        })
        
      } catch (error) {
        photoData.uploading = false
        photoData.uploaded = false
        photoData.error = true
        photoData.errorMessage = error.message || 'Erreur d\'upload'
        
        logError('Échec upload photo', error, { 
          photoId: photoData.id, 
          fileName: photoData.name 
        })
        
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
    
    const successCount = newPhotos.filter(p => p.uploaded).length
    const errorCount = newPhotos.filter(p => p.error).length
    
    logUserInteraction('UPLOAD_PHOTOS_COMPLETED', 'photo-upload', {
      totalPhotos: newPhotos.length,
      successCount,
      errorCount
    })
    
    if (errorCount > 0) {
      logError('Certains uploads ont échoué', new Error('Upload partiel'), {
        successCount,
        errorCount,
        totalPhotos: newPhotos.length
      })
    }
    
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
    
    // Si la photo a été uploadée, la supprimer de Supabase
    if (photoToRemove?.supabasePath) {
      // Note: On pourrait implémenter la suppression ici si nécessaire
      console.log('Photo supprimée:', photoToRemove.supabasePath)
    }
    
    const updatedPhotos = photos.filter(photo => photo.id !== id)
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
  }

  const reorderPhotos = (dragIndex, hoverIndex) => {
    const draggedPhoto = photos[dragIndex]
    const newPhotos = [...photos]
    newPhotos.splice(dragIndex, 1)
    newPhotos.splice(hoverIndex, 0, draggedPhoto)
    setPhotos(newPhotos)
    onPhotoSelect && onPhotoSelect(newPhotos)
  }

  // Calculer l'état global des uploads
  const hasUploadingPhotos = photos.some(photo => photo.uploading)
  const hasErrorPhotos = photos.some(photo => photo.error)
  const allPhotosUploaded = photos.length > 0 && photos.every(photo => photo.uploaded)
  const readyForSubmission = photos.length > 0 && !hasUploadingPhotos && !hasErrorPhotos && allPhotosUploaded

  return (
    <div className={styles.photoUpload}>
      {/* Barre de progression globale */}
      {(hasUploadingPhotos || uploading) && (
        <div className={styles.globalProgress}>
          <div className={styles.progressHeader}>
            <span>📤 Upload en cours...</span>
            <span>{globalProgress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${globalProgress}%` }}
            ></div>
          </div>
          <div className={styles.progressDetails}>
            {photos.filter(p => p.uploaded).length} sur {photos.length} photos uploadées
          </div>
        </div>
      )}

      {/* Message de confirmation quand tout est uploadé */}
      {readyForSubmission && (
        <div className={styles.uploadSuccess}>
          ✅ Toutes les photos ont été uploadées avec succès ! Vous pouvez maintenant soumettre votre recette.
        </div>
      )}

      {/* Message d'erreur s'il y a des erreurs */}
      {hasErrorPhotos && (
        <div className={styles.uploadError}>
          ❌ Certaines photos n'ont pas pu être uploadées. Veuillez les supprimer et réessayer.
          <br />
          <small>Vérifiez votre connexion internet et que les fichiers ne sont pas corrompus.</small>
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
            <p>Upload et optimisation en cours...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.uploadIcon}>📷</div>
            <h3>Ajoutez des photos de votre plat</h3>
            <p>Glissez-déposez vos images ou cliquez pour les sélectionner</p>
            <div className={styles.uploadTips}>
              <span>✓ Format JPEG/PNG</span>
              <span>✓ Max {maxFiles} photos</span>
              <span>✓ Upload automatique</span>
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
                  {photo.uploading && (
                    <div className={styles.uploadingStatus}>
                      <span className={styles.uploading}>⏳ Upload...</span>
                      <div className={styles.individualProgress}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${uploadProgress[photo.id] || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  {photo.uploaded && (
                    <span className={styles.uploaded}>✅ Uploadé</span>
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
          <p>☁️ Les images sont automatiquement sauvegardées</p>
        </div>
      )}
    </div>
  )
}
