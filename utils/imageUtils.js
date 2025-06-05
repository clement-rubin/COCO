import { logDebug, logError, logWarning } from './logger'
import { supabase } from '../lib/supabase'

/**
 * Process image data from various formats (base64, URL, bytea array) into a usable URL
 * @param {*} imageData - The image data from database (could be string, array, or object)
 * @param {string} fallbackUrl - Fallback URL if processing fails
 * @returns {string} URL that can be used in <img> src
 */
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  try {
    logDebug('Processing image data', {
      dataType: typeof imageData,
      isArray: Array.isArray(imageData),
      hasData: !!imageData,
      dataLength: imageData?.length,
      isString: typeof imageData === 'string'
    })

    // Cas 1: Données nulles ou undefined
    if (!imageData) {
      logDebug('No image data provided, using fallback')
      return fallbackUrl
    }

    // Cas 2: String (URL ou base64)
    if (typeof imageData === 'string') {
      // URL HTTP(S) standard
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        logDebug('HTTP URL detected', { url: imageData.substring(0, 50) + '...' })
        return imageData
      }
      
      // Data URL (base64)
      if (imageData.startsWith('data:image/')) {
        logDebug('Data URL detected', { length: imageData.length })
        return imageData
      }
      
      // Base64 sans préfixe data:
      if (isBase64String(imageData)) {
        const dataUrl = `data:image/jpeg;base64,${imageData}`
        logDebug('Base64 string converted to data URL', { 
          originalLength: imageData.length,
          newLength: dataUrl.length 
        })
        return dataUrl
      }
      
      // Blob URL
      if (imageData.startsWith('blob:')) {
        logDebug('Blob URL detected')
        return imageData
      }

      logWarning('Unknown string format for image data', { 
        start: imageData.substring(0, 20),
        length: imageData.length 
      })
      return fallbackUrl
    }

    // Cas 3: Array (bytea from PostgreSQL)
    if (Array.isArray(imageData)) {
      logDebug('Array detected (bytea), converting to base64', { arrayLength: imageData.length })
      
      if (imageData.length === 0) {
        logWarning('Empty array provided')
        return fallbackUrl
      }
      
      try {
        // Convertir le tableau d'octets en base64
        const base64 = arrayToBase64(imageData)
        const dataUrl = `data:image/jpeg;base64,${base64}`
        
        logDebug('Bytea array converted to data URL', {
          arrayLength: imageData.length,
          base64Length: base64.length,
          dataUrlLength: dataUrl.length
        })
        
        return dataUrl
      } catch (conversionError) {
        logError('Failed to convert bytea array to base64', conversionError, {
          arrayLength: imageData.length,
          firstFewBytes: imageData.slice(0, 10)
        })
        return fallbackUrl
      }
    }

    // Cas 4: Object avec propriétés d'image
    if (typeof imageData === 'object') {
      // Vérifier les propriétés communes
      if (imageData.url) {
        logDebug('Object with url property detected')
        return processImageData(imageData.url, fallbackUrl)
      }
      
      if (imageData.data) {
        logDebug('Object with data property detected')
        return processImageData(imageData.data, fallbackUrl)
      }
      
      if (imageData.imageUrl) {
        logDebug('Object with imageUrl property detected')
        return processImageData(imageData.imageUrl, fallbackUrl)
      }

      logWarning('Object without recognizable image properties', {
        keys: Object.keys(imageData)
      })
      return fallbackUrl
    }

    logWarning('Unhandled image data type', {
      type: typeof imageData,
      constructor: imageData?.constructor?.name
    })
    return fallbackUrl

  } catch (error) {
    logError('Error processing image data', error, {
      dataType: typeof imageData,
      hasData: !!imageData
    })
    return fallbackUrl
  }
}

/**
 * Convert byte array to base64 string
 * @param {Array<number>} byteArray - Array of bytes
 * @returns {string} Base64 encoded string
 */
function arrayToBase64(byteArray) {
  try {
    // Méthode optimisée pour les gros tableaux
    let binary = ''
    const chunkSize = 8192 // Traiter par chunks pour éviter les stack overflow
    
    for (let i = 0; i < byteArray.length; i += chunkSize) {
      const chunk = byteArray.slice(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk)
    }
    
    return btoa(binary)
  } catch (error) {
    logError('Error converting array to base64', error, {
      arrayLength: byteArray?.length
    })
    
    // Fallback: méthode alternative
    try {
      const uint8Array = new Uint8Array(byteArray)
      let binary = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i])
      }
      return btoa(binary)
    } catch (fallbackError) {
      logError('Fallback conversion also failed', fallbackError)
      throw new Error('Failed to convert byte array to base64')
    }
  }
}

/**
 * Check if string is valid base64
 * @param {string} str - String to check
 * @returns {boolean} True if valid base64
 */
function isBase64String(str) {
  try {
    // Vérifications basiques
    if (!str || typeof str !== 'string') {
      return false
    }
    
    // Les chaînes base64 valides ont une longueur multiple de 4 (avec padding)
    if (str.length % 4 !== 0) {
      return false
    }
    
    // Vérifier les caractères autorisés
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Regex.test(str)) {
      return false
    }
    
    // Essayer de décoder pour vérifier
    const decoded = atob(str)
    return decoded.length > 0
  } catch (error) {
    return false
  }
}

/**
 * Process image file to data URL with compression
 * @param {File} file - Image file
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Processed image data
 */
export async function processImageToUrl(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 0.85,
    maxSizeKB = 500
  } = options

  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        try {
          // Calculer les nouvelles dimensions
          let { width, height } = img
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width *= ratio
            height *= ratio
          }
          
          canvas.width = width
          canvas.height = height
          
          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convertir en data URL avec compression
          let dataUrl = canvas.toDataURL('image/jpeg', quality)
          
          // Vérifier la taille et réduire la qualité si nécessaire
          let currentQuality = quality
          while (dataUrl.length > maxSizeKB * 1024 * 1.37 && currentQuality > 0.1) { // 1.37 = facteur base64
            currentQuality -= 0.1
            dataUrl = canvas.toDataURL('image/jpeg', currentQuality)
          }
          
          const result = {
            url: dataUrl,
            mimeType: 'image/jpeg',
            originalSize: file.size,
            compressedSize: Math.round(dataUrl.length / 1.37), // Estimation taille réelle
            compressionRatio: Math.round((1 - (dataUrl.length / 1.37) / file.size) * 100),
            width,
            height,
            quality: currentQuality
          }
          
          logDebug('Image processed successfully', result)
          resolve(result)
        } catch (canvasError) {
          logError('Canvas processing error', canvasError)
          reject(canvasError)
        }
      }
      
      img.onerror = (error) => {
        logError('Image load error', error)
        reject(new Error('Failed to load image'))
      }
      
      img.src = URL.createObjectURL(file)
    } catch (error) {
      logError('Image processing setup error', error)
      reject(error)
    }
  })
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export function validateImageFile(file) {
  const result = {
    valid: true,
    errors: []
  }
  
  // Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    result.valid = false
    result.errors.push(`Type de fichier non supporté: ${file.type}`)
  }
  
  // Vérifier la taille (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    result.valid = false
    result.errors.push(`Fichier trop volumineux: ${Math.round(file.size / 1024 / 1024)}MB (max: 10MB)`)
  }
  
  // Vérifier la taille minimale
  if (file.size < 1024) { // 1KB min
    result.valid = false
    result.errors.push('Fichier trop petit (minimum 1KB)')
  }
  
  return result
}

/**
 * Create optimized image URL for display
 * @param {*} imageData - Raw image data
 * @param {Object} options - Display options
 * @returns {string} Optimized image URL
 */
export function createOptimizedImageUrl(imageData, options = {}) {
  const {
    width = 400,
    height = 300,
    quality = 80,
    fallback = '/placeholder-recipe.jpg'
  } = options
  
  try {
    const baseUrl = processImageData(imageData, fallback)
    
    // Si c'est déjà une URL optimisée ou un placeholder, la retourner directement
    if (baseUrl === fallback || baseUrl.startsWith('http')) {
      return baseUrl
    }
    
    // Pour les data URLs, on peut les retourner directement
    // (l'optimisation a normalement déjà été faite lors de l'upload)
    return baseUrl
  } catch (error) {
    logError('Error creating optimized image URL', error)
    return fallback
  }
}

/**
 * Convert image data to bytes array for storage
 * @param {File} file - Image file
 * @returns {Promise<Object>} Bytes data and metadata
 */
export async function uploadImageAsBytes(file) {
  try {
    logDebug('Converting image to bytes', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    
    // Valider le fichier
    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Traiter l'image pour optimisation
    const processed = await processImageToUrl(file, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8,
      maxSizeKB: 300
    })
    
    // Convertir le data URL en bytes array
    const base64Data = processed.url.split(',')[1] // Enlever le préfixe data:image/jpeg;base64,
    const binaryString = atob(base64Data)
    const bytes = new Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    const result = {
      bytes,
      originalSize: file.size,
      processedSize: bytes.length,
      mimeType: 'image/jpeg',
      width: processed.width,
      height: processed.height,
      quality: processed.quality
    }
    
    logDebug('Image converted to bytes successfully', {
      originalSize: result.originalSize,
      processedSize: result.processedSize,
      bytesLength: result.bytes.length,
      compressionRatio: Math.round((1 - result.processedSize / result.originalSize) * 100)
    })
    
    return result
  } catch (error) {
    logError('Error converting image to bytes', error, {
      fileName: file?.name,
      fileSize: file?.size
    })
    throw error
  }
}

/**
 * Uploads a base64 image to Supabase storage
 * @param {string} base64Data - Base64 image data
 * @returns {Promise<string>} - URL to the uploaded image
 */
export async function uploadBase64Image(base64Data) {
  try {
    // Extract file data and mime type
    const [mimeTypeHeader, base64Content] = base64Data.split(',')
    const mimeType = mimeTypeHeader.match(/:(.*?);/)[1]
    const fileExt = mimeType.split('/')[1]
    
    // Convert base64 to blob
    const byteString = atob(base64Content)
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    
    const blob = new Blob([ab], { type: mimeType })
    
    // Generate a unique filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `images/${fileName}`
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        contentType: mimeType,
        cacheControl: '3600'
      })
    
    if (error) {
      throw error
    }
    
    logInfo('Image uploaded successfully', { filePath: data.path })
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    logError('Failed to upload base64 image', error)
    throw error
  }
}

/**
 * Uploads a File object to Supabase storage
 * @param {File} file - File object
 * @returns {Promise<string>} - URL to the uploaded image
 */
export async function uploadFileImage(file) {
  try {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `images/${fileName}`
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600'
      })
    
    if (error) {
      throw error
    }
    
    logInfo('Image file uploaded successfully', { 
      filePath: data.path,
      fileName: file.name,
      fileSize: file.size
    })
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)
    
    return publicUrl
  } catch (error) {
    logError('Failed to upload file image', error)
    throw error
  }
}

/**
 * Try to determine the MIME type from file signature bytes
 * @param {Uint8Array} bytes 
 * @returns {string} - MIME type
 */
function determineMimeType(bytes) {
  // Check for JPEG signature (FF D8 FF)
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }
  
  // Check for PNG signature (89 50 4E 47)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png'
  }
  
  // Check for GIF signature (47 49 46)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }
  
  // Check for WebP signature (52 49 46 46 ... 57 45 42 50)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }
  
  // Default to octet-stream if unknown
  return 'application/octet-stream'
}
