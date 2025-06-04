import { logDebug, logInfo, logError, logWarning } from './logger'

/**
 * Compresse une image en réduisant sa qualité et/ou ses dimensions
 * @param {File} file - Le fichier image à compresser
 * @param {Object} options - Options de compression
 * @returns {Promise<Blob>} - L'image compressée
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.7,
    maxSizeKB = 500, // Taille max en KB
    format = 'image/jpeg'
  } = options

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image compression only available in browser'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculer les nouvelles dimensions en conservant le ratio
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        
        if (ratio < 1) {
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height)

        // Fonction pour ajuster la qualité si nécessaire
        const tryCompress = (currentQuality) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Échec de la compression'))
              return
            }

            const sizeKB = blob.size / 1024
            logDebug('Compression tentative', {
              originalSize: file.size,
              compressedSize: blob.size,
              sizeKB: Math.round(sizeKB),
              quality: currentQuality,
              dimensions: `${width}x${height}`
            })

            // Si la taille est acceptable ou si on ne peut plus compresser
            if (sizeKB <= maxSizeKB || currentQuality <= 0.1) {
              resolve(blob)
            } else {
              // Réduire la qualité et réessayer
              tryCompress(Math.max(0.1, currentQuality - 0.1))
            }
          }, format, currentQuality)
        }

        tryCompress(quality)

      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Impossible de charger l\'image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convertit un fichier image en Data URL optimisée
 * @param {File} file - Le fichier image
 * @param {Object} options - Options de traitement
 * @returns {Promise<Object>} - Objet contenant l'URL et les métadonnées
 */
export async function processImageToUrl(file, options = {}) {
  const processId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  
  try {
    logInfo(`[${processId}] Début traitement image`, {
      fileName: file.name,
      originalSize: file.size,
      type: file.type
    })

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier n\'est pas une image valide')
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      throw new Error('L\'image est trop volumineuse (max 10MB)')
    }

    // Options par défaut pour optimiser la taille
    const compressionOptions = {
      maxWidth: 1200,
      maxHeight: 900,
      quality: 0.8,
      maxSizeKB: 300, // Limite à 300KB pour éviter les erreurs 1MB
      format: 'image/jpeg',
      ...options
    }

    // Compresser l'image
    const compressedBlob = await compressImage(file, compressionOptions)
    
    // Convertir en Data URL
    const dataUrl = await blobToDataUrl(compressedBlob)
    
    // Vérifier la taille finale de la Data URL
    const dataUrlSizeKB = Math.round(dataUrl.length * 0.75 / 1024) // Approximation base64
    
    if (dataUrlSizeKB > 400) { // Si encore trop volumineux
      logWarning(`[${processId}] Data URL encore volumineuse, re-compression`, {
        dataUrlSizeKB
      })
      
      // Re-compresser avec des paramètres plus agressifs
      const aggressiveOptions = {
        ...compressionOptions,
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.6,
        maxSizeKB: 200
      }
      
      const recompressedBlob = await compressImage(file, aggressiveOptions)
      const finalDataUrl = await blobToDataUrl(recompressedBlob)
      
      logInfo(`[${processId}] Image recompressée avec succès`, {
        originalSize: file.size,
        finalBlobSize: recompressedBlob.size,
        finalDataUrlSizeKB: Math.round(finalDataUrl.length * 0.75 / 1024)
      })
      
      return {
        url: finalDataUrl,
        originalSize: file.size,
        compressedSize: recompressedBlob.size,
        mimeType: recompressedBlob.type,
        compressionRatio: Math.round((1 - recompressedBlob.size / file.size) * 100)
      }
    }

    logInfo(`[${processId}] Image traitée avec succès`, {
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      dataUrlSizeKB,
      compressionRatio: Math.round((1 - compressedBlob.size / file.size) * 100)
    })

    return {
      url: dataUrl,
      originalSize: file.size,
      compressedSize: compressedBlob.size,
      mimeType: compressedBlob.type,
      compressionRatio: Math.round((1 - compressedBlob.size / file.size) * 100)
    }

  } catch (error) {
    logError(`[${processId}] Erreur traitement image`, error, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    throw error
  }
}

/**
 * Convertit un Blob en Data URL
 * @param {Blob} blob - Le blob à convertir
 * @returns {Promise<string>} - La Data URL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Erreur lors de la conversion en Data URL'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Traite les données d'image pour l'affichage (rétrocompatibilité)
 * @param {string|Array|null} imageData - Données image
 * @param {string} fallbackUrl - URL de fallback
 * @returns {string} - URL d'affichage
 */
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  if (!imageData) {
    return fallbackUrl
  }

  // Si c'est déjà une Data URL ou une URL
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image/') || imageData.startsWith('http') || imageData.startsWith('/')) {
      return imageData
    }
    
    // Peut-être un JSON stringifié
    try {
      const parsed = JSON.parse(imageData)
      return processImageData(parsed, fallbackUrl)
    } catch {
      return fallbackUrl
    }
  }

  // Si c'est un tableau de bytes (ancienne méthode)
  if (Array.isArray(imageData) && imageData.length > 0) {
    try {
      const uint8Array = new Uint8Array(imageData)
      const blob = new Blob([uint8Array], { type: 'image/jpeg' })
      return URL.createObjectURL(blob)
    } catch (error) {
      logError('Erreur conversion bytes vers URL', error)
      return fallbackUrl
    }
  }

  return fallbackUrl
}

/**
 * Valide les dimensions et le poids d'une image
 * @param {File} file - Le fichier à valider
 * @returns {Promise<Object>} - Résultat de la validation
 */
export async function validateImageFile(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({
        isValid: false,
        error: 'Le fichier n\'est pas une image'
      })
      return
    }

    const img = new Image()
    img.onload = () => {
      const validation = {
        isValid: true,
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type,
        warnings: []
      }

      // Vérifications
      if (file.size > 10 * 1024 * 1024) {
        validation.isValid = false
        validation.error = 'Image trop volumineuse (max 10MB)'
      } else if (file.size > 5 * 1024 * 1024) {
        validation.warnings.push('Image volumineuse, compression recommandée')
      }

      if (img.width > 4000 || img.height > 4000) {
        validation.warnings.push('Très haute résolution, redimensionnement recommandé')
      }

      resolve(validation)
    }

    img.onerror = () => {
      resolve({
        isValid: false,
        error: 'Impossible de lire l\'image'
      })
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Estime la taille finale d'une Data URL
 * @param {number} fileSizeBytes - Taille du fichier en bytes
 * @param {number} compressionRatio - Ratio de compression (0-1)
 * @returns {number} - Taille estimée de la Data URL en KB
 */
export function estimateDataUrlSize(fileSizeBytes, compressionRatio = 0.7) {
  const compressedSize = fileSizeBytes * compressionRatio
  // Base64 augmente la taille de ~33%
  const base64Size = compressedSize * 1.33
  return Math.round(base64Size / 1024)
}
