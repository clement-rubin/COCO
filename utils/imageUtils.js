import { logDebug, logInfo, logError } from './logger'

/**
 * Convertit un fichier image en Data URL (base64)
 */
export async function processImageToUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Aucun fichier fourni'))
      return
    }

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier doit être une image'))
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max pour Data URLs
      reject(new Error('Fichier trop volumineux (max 10MB)'))
      return
    }

    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const dataUrl = reader.result
        logInfo('Image convertie en Data URL', {
          fileName: file.name,
          originalSize: file.size,
          dataUrlLength: dataUrl.length,
          mimeType: file.type
        })
        
        resolve({
          url: dataUrl,
          originalSize: file.size,
          mimeType: file.type,
          fileName: file.name
        })
      } catch (error) {
        logError('Erreur lors de la conversion en Data URL', error)
        reject(error)
      }
    }
    
    reader.onerror = () => {
      const error = new Error('Erreur lors de la lecture du fichier')
      logError('Erreur FileReader', error)
      reject(error)
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Traite les données d'image pour l'affichage
 */
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  logDebug('processImageData appelée', {
    hasImageData: !!imageData,
    imageDataType: typeof imageData,
    isArray: Array.isArray(imageData),
    isString: typeof imageData === 'string',
    dataLength: imageData?.length
  })

  // Si pas de données d'image, retourner le fallback
  if (!imageData) {
    logDebug('Aucune donnée d\'image, utilisation du fallback')
    return fallbackUrl
  }

  // Si c'est déjà une chaîne (URL ou Data URL)
  if (typeof imageData === 'string') {
    // Vérifier si c'est une Data URL valide
    if (imageData.startsWith('data:image/')) {
      logDebug('Data URL détectée', { urlLength: imageData.length })
      return imageData
    }
    
    // Vérifier si c'est une URL HTTP
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      logDebug('URL HTTP détectée')
      return imageData
    }
    
    // Si c'est une chaîne mais pas une URL valide, utiliser le fallback
    logDebug('Chaîne non reconnue comme URL valide, utilisation du fallback')
    return fallbackUrl
  }

  // Si c'est un tableau de bytes (ancienne méthode)
  if (Array.isArray(imageData) && imageData.length > 0) {
    try {
      logDebug('Tentative de conversion bytes vers Data URL', { bytesLength: imageData.length })
      return bytesToDataUrl(imageData)
    } catch (error) {
      logError('Erreur conversion bytes vers Data URL', error)
      return fallbackUrl
    }
  }

  // Si c'est un autre type d'objet, essayer d'extraire une URL
  if (typeof imageData === 'object' && imageData.url) {
    logDebug('URL extraite d\'un objet')
    return imageData.url
  }

  logDebug('Type de données d\'image non reconnu, utilisation du fallback')
  return fallbackUrl
}

/**
 * Convertit un tableau de bytes en Data URL (rétrocompatibilité)
 */
function bytesToDataUrl(bytesArray, mimeType = 'image/jpeg') {
  try {
    // Créer un Uint8Array à partir du tableau
    const uint8Array = new Uint8Array(bytesArray)
    
    // Créer un blob
    const blob = new Blob([uint8Array], { type: mimeType })
    
    // Convertir en Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    logError('Erreur lors de la conversion bytes vers Data URL', error)
    throw error
  }
}

/**
 * Compresse une image si nécessaire
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Compression disponible uniquement côté client'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculer les nouvelles dimensions
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height)

      // Convertir en blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            logInfo('Image compressée', {
              originalSize: file.size,
              compressedSize: blob.size,
              reduction: Math.round(((file.size - blob.size) / file.size) * 100)
            })
            resolve(blob)
          } else {
            reject(new Error('Erreur lors de la compression'))
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'))
    img.src = URL.createObjectURL(file)
  })
}
