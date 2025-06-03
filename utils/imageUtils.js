import { logDebug, logError, logInfo } from './logger'

// Fonction pour valider si des données représentent une image valide
export function isValidImageData(imageData) {
  if (!imageData) return false
  
  // URL ou base64 existant
  if (typeof imageData === 'string') {
    return imageData.startsWith('http') || 
           imageData.startsWith('data:image/') || 
           imageData.length > 100 // Probablement du base64
  }
  
  // Tableau de bytes
  if (Array.isArray(imageData)) {
    return imageData.length > 0 && 
           imageData.every(byte => typeof byte === 'number' && byte >= 0 && byte <= 255)
  }
  
  return false
}

// Fonction pour obtenir des informations sur les données d'image
export function getImageDataInfo(imageData) {
  const info = {
    type: typeof imageData,
    isValid: false,
    format: 'unknown',
    size: 0,
    details: {}
  }
  
  if (!imageData) {
    info.format = 'null'
    return info
  }
  
  if (typeof imageData === 'string') {
    info.size = imageData.length
    if (imageData.startsWith('http')) {
      info.format = 'url'
      info.isValid = true
    } else if (imageData.startsWith('data:image/')) {
      info.format = 'data-url'
      info.isValid = true
      info.details.mimeType = imageData.split(';')[0].split(':')[1]
    } else if (imageData.length > 100) {
      info.format = 'base64'
      info.isValid = true
    }
  } else if (Array.isArray(imageData)) {
    info.size = imageData.length
    info.format = 'bytes-array'
    info.isValid = imageData.length > 0 && 
                   imageData.every(byte => typeof byte === 'number' && byte >= 0 && byte <= 255)
  }
  
  return info
}

// Fonction pour créer une image de test/debug
export function createDebugImageDataUrl(text = 'DEBUG', width = 200, height = 200) {
  if (typeof window === 'undefined') return '/placeholder-recipe.jpg'
  
  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext('2d')
    
    // Fond coloré
    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, width, height)
    
    // Bordure
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, width - 2, height - 2)
    
    // Texte
    ctx.fillStyle = '#1f2937'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, height / 2)
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    logError('Erreur création image debug', error)
    return '/placeholder-recipe.jpg'
  }
}

// Test de conversion pour debug
export function testImageConversion(imageData) {
  const info = getImageDataInfo(imageData)
  
  logInfo('Test de conversion d\'image', {
    originalInfo: info,
    isValid: info.isValid
  })
  
  if (!info.isValid) {
    logError('Données d\'image invalides pour le test', new Error('Invalid image data'), info)
    return null
  }
  
  try {
    if (info.format === 'bytes-array') {
      const uint8Array = new Uint8Array(imageData)
      const base64 = btoa(String.fromCharCode.apply(null, uint8Array))
      const dataUrl = `data:image/jpeg;base64,${base64}`
      
      logInfo('Conversion bytes-array réussie', {
        originalLength: imageData.length,
        base64Length: base64.length,
        dataUrlLength: dataUrl.length
      })
      
      return dataUrl
    }
    
    return imageData // Déjà dans un format utilisable
  } catch (error) {
    logError('Erreur lors du test de conversion', error, { originalInfo: info })
    return null
  }
}
