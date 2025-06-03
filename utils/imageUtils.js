import { logInfo, logError, logDebug } from './logger'

// Fonction pour compresser et convertir une image en Data URL
export async function compressImageToDataUrl(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Image compression only available in browser environment'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculer les nouvelles dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      const newWidth = Math.floor(img.width * ratio)
      const newHeight = Math.floor(img.height * ratio)
      
      canvas.width = newWidth
      canvas.height = newHeight

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      // Convertir en Data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      
      logInfo('Image compressée et convertie en Data URL', {
        originalSize: file.size,
        originalDimensions: `${img.width}x${img.height}`,
        newDimensions: `${newWidth}x${newHeight}`,
        dataUrlLength: dataUrl.length,
        compressionRatio: ((file.size - dataUrl.length) / file.size * 100).toFixed(2) + '%'
      })
      
      resolve(dataUrl)
    }

    img.onerror = () => {
      logError('Erreur lors du chargement de l\'image pour compression', new Error('Image load failed'))
      reject(new Error('Erreur lors du chargement de l\'image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

// Fonction pour valider un fichier image
export function validateImageFile(file) {
  const errors = []
  const warnings = []

  // Vérifier la taille (max 10MB pour les Data URLs)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    errors.push(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 10MB)`)
  }

  // Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Type de fichier non supporté: ${file.type}`)
  }

  // Vérifier que le fichier n'est pas vide
  if (file.size === 0) {
    errors.push('Fichier vide')
  }

  logDebug('Validation du fichier image', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    isValid: errors.length === 0,
    errors,
    warnings
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Fonction pour traiter une image et retourner une Data URL
export async function processImageToUrl(file) {
  const uploadId = `url_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logInfo(`[${uploadId}] Début traitement image vers URL: ${file.name}`, {
      uploadId,
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name
    })

    // Validation du fichier
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      const errorMsg = `Validation échouée: ${validation.errors.join(', ')}`
      logError(`[${uploadId}] ${errorMsg}`, new Error(errorMsg), {
        uploadId,
        fileName: file.name,
        validationErrors: validation.errors
      })
      throw new Error(errorMsg)
    }

    // Compression et conversion en Data URL
    let dataUrl
    if (file.size > 1024 * 1024) { // Si > 1MB, compresser
      logDebug(`[${uploadId}] Compression de l'image (taille: ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
      dataUrl = await compressImageToDataUrl(file, 800, 0.8)
    } else {
      // Pour les petites images, conversion directe
      dataUrl = await fileToDataUrl(file)
    }
    
    logInfo(`[${uploadId}] Image traitée avec succès`, {
      uploadId,
      originalSize: file.size,
      dataUrlLength: dataUrl.length,
      fileName: file.name
    })

    return {
      url: dataUrl,
      originalName: file.name,
      originalSize: file.size,
      mimeType: file.type
    }

  } catch (error) {
    logError(`[${uploadId}] Erreur lors du traitement de l'image`, error, {
      uploadId,
      fileName: file.name,
      fileSize: file?.size,
      errorMessage: error.message
    })
    throw error
  }
}

// Fonction utilitaire pour convertir un fichier en Data URL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      resolve(reader.result)
    }
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'))
    }
    
    reader.readAsDataURL(file)
  })
}

// Fonction pour traiter les données d'image (compatibilité avec l'ancien système)
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  if (!imageData) {
    logDebug('processImageData: imageData est null/undefined')
    return fallbackUrl
  }

  // Si c'est déjà une URL (nouveau système)
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:image/') || imageData.startsWith('http') || imageData.startsWith('/')) {
      return imageData
    }
    // Si c'est du base64 brut
    return `data:image/jpeg;base64,${imageData}`
  }

  // Ancien système avec bytes (rétrocompatibilité)
  if (Array.isArray(imageData)) {
    return convertBytesToDataUrl(imageData)
  }

  logDebug('processImageData: format non reconnu', { 
    type: typeof imageData,
    isArray: Array.isArray(imageData)
  })
  
  return fallbackUrl
}

// Fonction de rétrocompatibilité pour convertir les bytes en Data URL
function convertBytesToDataUrl(bytesArray) {
  if (!Array.isArray(bytesArray) || bytesArray.length === 0) {
    return null
  }

  try {
    const uint8Array = new Uint8Array(bytesArray)
    
    // Détection du format
    let mimeType = 'image/jpeg'
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
      mimeType = 'image/png'
    } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49) {
      mimeType = 'image/gif'
    }
    
    // Conversion en base64
    let base64 = ''
    const chunkSize = 8192
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      base64 += btoa(String.fromCharCode.apply(null, chunk))
    }
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    logError('Erreur conversion bytes vers Data URL', error)
    return null
  }
}

// Fonction pour optimiser une Data URL (réduire la taille si nécessaire)
export function optimizeDataUrl(dataUrl, maxSizeKB = 500) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl
  }

  const sizeKB = Math.round((dataUrl.length * 3) / 4 / 1024) // Estimation de la taille
  
  if (sizeKB <= maxSizeKB) {
    return dataUrl
  }

  // Si la Data URL est trop grande, on pourrait implémenter une recompression ici
  logDebug('Data URL trop grande, optimisation nécessaire', {
    currentSizeKB: sizeKB,
    maxSizeKB,
    dataUrlLength: dataUrl.length
  })

  return dataUrl // Pour l'instant, on retourne tel quel
}
