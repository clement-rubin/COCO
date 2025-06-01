import { useState, useRef, useCallback } from 'react'
import styles from '../styles/PhotoUpload.module.css'

export default function PhotoUpload({ onPhotoSelect, maxFiles = 5 }) {
  const [photos, setPhotos] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  const processFiles = useCallback(async (files) => {
    setUploading(true)
    const newPhotos = []

    for (let i = 0; i < Math.min(files.length, maxFiles - photos.length); i++) {
      const file = files[i]
      
      if (file.type.startsWith('image/')) {
        const compressedFile = await compressImage(file)
        const preview = URL.createObjectURL(compressedFile)
        
        newPhotos.push({
          id: Date.now() + i,
          file: compressedFile,
          preview,
          name: file.name,
          size: compressedFile.size
        })
      }
    }

    const updatedPhotos = [...photos, ...newPhotos]
    setPhotos(updatedPhotos)
    onPhotoSelect && onPhotoSelect(updatedPhotos)
    setUploading(false)
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

  return (
    <div className={styles.photoUpload}>
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
            <p>Optimisation des images...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.uploadIcon}>📷</div>
            <h3>Ajoutez des photos de votre plat</h3>
            <p>Glissez-déposez vos images ou cliquez pour les sélectionner</p>
            <div className={styles.uploadTips}>
              <span>✓ Format JPEG/PNG</span>
              <span>✓ Max {maxFiles} photos</span>
              <span>✓ Compression automatique</span>
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
                <span className={styles.fileSize}>
                  {(photo.size / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length > 1 && (
        <div className={styles.photoTips}>
          <p>💡 La première photo sera utilisée comme image principale</p>
          <p>🔄 Glissez-déposez pour réorganiser</p>
        </div>
      )}
    </div>
  )
}
