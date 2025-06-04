import { logDebug, logInfo, logError, logWarning } from './logger'

// Fonction pour estimer la taille d'une Data URL
export function estimateDataUrlSize(fileSizeBytes, compressionRatio = 0.7) {
  // Base64 ajoute ~33% à la taille + préfixe data:image
  const base64Size = (fileSizeBytes * compressionRatio * 4) / 3
  const dataUrlOverhead = 50 // "data:image/jpeg;base64,"
  return Math.round((base64Size + dataUrlOverhead) / 1024) // en KB
}

// Compression d'image avec options flexibles
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
    maxSizeKB = 300
  } = options

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Compression d\'image disponible uniquement côté client'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculer les nouvelles dimensions
        let { width, height } = img
        const aspectRatio = width / height

        if (width > maxWidth) {
          width = maxWidth
          height = width / aspectRatio
        }
        if (height > maxHeight) {
          height = maxHeight
          width = height * aspectRatio
        }

        canvas.width = width
        canvas.height = height

        // Dessiner avec options de qualité
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Essayer différents niveaux de qualité si nécessaire
        let currentQuality = quality
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Impossible de compresser l\'image'))
              return
            }

            const sizeKB = blob.size / 1024
            logDebug('Compression terminée', {
              originalSize: `${Math.round(file.size / 1024)}KB`,
              compressedSize: `${Math.round(sizeKB)}KB`,
              quality: currentQuality,
              dimensions: `${width}x${height}`
            })

            // Si l'image est encore trop grosse et qu'on peut réduire la qualité
            if (sizeKB > maxSizeKB && currentQuality > 0.3) {
              currentQuality -= 0.1
              logDebug('Image encore trop grosse, réduction qualité', { 
                newQuality: currentQuality 
              })
              tryCompress()
              return
            }

            resolve({
              blob,
              width,
              height,
              sizeKB: Math.round(sizeKB),
              quality: currentQuality,
              compressionRatio: file.size / blob.size
            })
          }, 'image/jpeg', currentQuality)
        }

        tryCompress()
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Impossible de charger l\'image'))
    img.src = URL.createObjectURL(file)
  })
}

// Convertir un fichier en Data URL avec compression
export async function processImageToUrl(file, options = {}) {
  try {
    logInfo('Début conversion image vers Data URL', {
      fileName: file.name,
      originalSize: `${Math.round(file.size / 1024)}KB`,
      type: file.type
    })

    // Compression d'abord
    const compressed = await compressImage(file, options)
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = () => {
        const dataUrl = reader.result
        const finalSizeKB = Math.round(dataUrl.length * 0.75 / 1024)
        
        logInfo('Conversion Data URL terminée', {
          fileName: file.name,
          finalSize: `${finalSizeKB}KB`,
          originalSize: `${Math.round(file.size / 1024)}KB`,
          compressionRatio: compressed.compressionRatio
        })

        resolve({
          url: dataUrl,
          originalSize: file.size,
          compressedSize: compressed.blob.size,
          finalSizeKB,
          mimeType: file.type,
          compressionRatio: compressed.compressionRatio
        })
      }
      
      reader.onerror = () => reject(new Error('Erreur lecture fichier'))
      reader.readAsDataURL(compressed.blob)
    })
  } catch (error) {
    logError('Erreur conversion image', error, { fileName: file.name })
    throw error
  }
}

// Traiter les données d'image (Data URL ou bytes) pour l'affichage
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  if (!imageData) {
    logDebug('Aucune donnée image, utilisation du fallback', { fallbackUrl })
    return fallbackUrl
  }

  // Si c'est déjà une Data URL
  if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
    logDebug('Data URL détectée', { 
      size: `${Math.round(imageData.length / 1024)}KB`,
      type: imageData.substring(5, imageData.indexOf(';'))
    })
    return imageData
  }

  // Si c'est une URL HTTP
  if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('/'))) {
    logDebug('URL HTTP détectée', { url: imageData.substring(0, 50) + '...' })
    return imageData
  }

  // Si c'est un tableau de bytes (ancien format)
  if (Array.isArray(imageData)) {
    try {
      const uint8Array = new Uint8Array(imageData)
      const base64 = btoa(String.fromCharCode.apply(null, uint8Array))
      const dataUrl = `data:image/jpeg;base64,${base64}`
      
      logDebug('Conversion bytes vers Data URL', {
        bytesLength: imageData.length,
        resultSize: `${Math.round(dataUrl.length / 1024)}KB`
      })
      
      return dataUrl
    } catch (error) {
      logError('Erreur conversion bytes vers Data URL', error)
      return fallbackUrl
    }
  }

  // Si c'est une chaîne JSON de bytes
  if (typeof imageData === 'string' && imageData.startsWith('[') && imageData.endsWith(']')) {
    try {
      const bytesArray = JSON.parse(imageData)
      return processImageData(bytesArray, fallbackUrl)
    } catch (error) {
      logError('Erreur parsing JSON bytes', error)
      return fallbackUrl
    }
  }

  logWarning('Format d\'image non reconnu', { 
    type: typeof imageData,
    isArray: Array.isArray(imageData),
    length: imageData?.length,
    preview: typeof imageData === 'string' ? imageData.substring(0, 100) : 'non-string'
  })
  
  return fallbackUrl
}

// Valider une Data URL
export function validateDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { isValid: false, error: 'Data URL invalide ou manquante' }
  }

  if (!dataUrl.startsWith('data:image/')) {
    return { isValid: false, error: 'N\'est pas une Data URL d\'image' }
  }

  const sizeKB = Math.round(dataUrl.length * 0.75 / 1024)
  
  if (sizeKB > 500) {
    return { 
      isValid: false, 
      error: `Data URL trop volumineuse: ${sizeKB}KB (max: 500KB)` 
    }
  }

  return { 
    isValid: true, 
    sizeKB,
    mimeType: dataUrl.substring(5, dataUrl.indexOf(';'))
  }
}

export default {
  estimateDataUrlSize,
  compressImage,
  processImageToUrl,
  processImageData,
  validateDataUrl
}
