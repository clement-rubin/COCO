import { logDebug, logError, logInfo, logWarning } from './logger'

// Fonction pour détecter le format d'une image à partir de ses bytes
export function detectImageFormat(bytes) {
  if (!Array.isArray(bytes) || bytes.length < 4) {
    return 'unknown'
  }
  
  const signatures = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    gif: [0x47, 0x49, 0x46, 0x38],
    webp: [0x52, 0x49, 0x46, 0x46],
    bmp: [0x42, 0x4D]
  }
  
  for (const [format, signature] of Object.entries(signatures)) {
    if (signature.every((byte, index) => bytes[index] === byte)) {
      return format
    }
  }
  
  return 'unknown'
}

// Fonction pour valider si un tableau contient des bytes d'image valides
export function validateImageBytes(bytes) {
  if (!Array.isArray(bytes)) {
    return { valid: false, error: 'Not an array' }
  }
  
  if (bytes.length === 0) {
    return { valid: false, error: 'Empty array' }
  }
  
  // Vérifier que tous les éléments sont des nombres entre 0 et 255
  const invalidBytes = bytes.filter(byte => typeof byte !== 'number' || byte < 0 || byte > 255)
  if (invalidBytes.length > 0) {
    return { 
      valid: false, 
      error: `Invalid bytes found: ${invalidBytes.length} out of ${bytes.length}`,
      samples: invalidBytes.slice(0, 5)
    }
  }
  
  // Vérifier la taille minimum (une image doit faire au moins quelques bytes)
  if (bytes.length < 100) {
    return { valid: false, error: 'Image too small' }
  }
  
  // Essayer de détecter le format
  const format = detectImageFormat(bytes)
  if (format === 'unknown') {
    return { 
      valid: false, 
      error: 'Unknown image format',
      firstBytes: bytes.slice(0, 10)
    }
  }
  
  return { 
    valid: true, 
    format,
    size: bytes.length
  }
}

// Fonction pour convertir des bytes en data URL avec validation
export function convertBytesToDataUrl(bytes) {
  const validation = validateImageBytes(bytes)
  
  if (!validation.valid) {
    logError('Bytes d\'image invalides', new Error(validation.error), {
      validationResult: validation,
      bytesLength: bytes?.length
    })
    return null
  }
  
  logDebug('Conversion bytes vers data URL', {
    bytesLength: bytes.length,
    detectedFormat: validation.format,
    firstBytes: bytes.slice(0, 8)
  })
  
  try {
    const uint8Array = new Uint8Array(bytes)
    
    // Conversion par chunks pour éviter les erreurs de mémoire
    let base64 = ''
    const chunkSize = 8192
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      base64 += btoa(String.fromCharCode.apply(null, chunk))
    }
    
    const mimeType = validation.format === 'jpeg' ? 'image/jpeg' :
                    validation.format === 'png' ? 'image/png' :
                    validation.format === 'gif' ? 'image/gif' :
                    validation.format === 'webp' ? 'image/webp' :
                    validation.format === 'bmp' ? 'image/bmp' :
                    'image/jpeg' // fallback
    
    const dataUrl = `data:${mimeType};base64,${base64}`
    
    logInfo('Data URL créée avec succès', {
      originalSize: bytes.length,
      base64Size: base64.length,
      mimeType,
      urlLength: dataUrl.length
    })
    
    return dataUrl
  } catch (error) {
    logError('Erreur lors de la conversion en data URL', error, {
      bytesLength: bytes.length,
      errorMessage: error.message
    })
    return null
  }
}

// Fonction principale pour traiter n'importe quel format d'image
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  logDebug('Traitement des données d\'image', {
    type: typeof imageData,
    isArray: Array.isArray(imageData),
    isString: typeof imageData === 'string',
    isObject: typeof imageData === 'object',
    length: imageData?.length
  })
  
  if (!imageData) {
    return fallbackUrl
  }
  
  // URL déjà formée
  if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('data:'))) {
    return imageData
  }
  
  // Base64 brut
  if (typeof imageData === 'string' && imageData.length > 100) {
    return `data:image/jpeg;base64,${imageData}`
  }
  
  // Tableau de bytes
  if (Array.isArray(imageData)) {
    return convertBytesToDataUrl(imageData) || fallbackUrl
  }
  
  // Objet avec propriété bytes
  if (imageData && typeof imageData === 'object') {
    if (imageData.bytes && Array.isArray(imageData.bytes)) {
      return convertBytesToDataUrl(imageData.bytes) || fallbackUrl
    }
    if (imageData.data && Array.isArray(imageData.data)) {
      return convertBytesToDataUrl(imageData.data) || fallbackUrl
    }
  }
  
  logWarning('Format d\'image non supporté', {
    type: typeof imageData,
    sample: JSON.stringify(imageData).substring(0, 100)
  })
  
  return fallbackUrl
}
