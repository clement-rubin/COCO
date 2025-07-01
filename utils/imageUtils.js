import { logDebug, logError, logWarning, logInfo } from './logger'
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
      isString: typeof imageData === 'string',
      imageDataSample: typeof imageData === 'string' ? imageData.substring(0, 100) : null
    })

    // Cas 1: Données nulles ou undefined
    if (!imageData) {
      logDebug('No image data provided, using fallback')
      return fallbackUrl
    }

    // Cas 2: String (URL ou base64)
    if (typeof imageData === 'string') {
      const val = imageData.trim()
      
      // chaîne vide
      if (!val) {
        logDebug('Empty string provided, using fallback')
        return fallbackUrl
      }
      
      // URL HTTP(S) standard (y compris Supabase)
      if (val.startsWith('http://') || val.startsWith('https://')) {
        logDebug('HTTP URL detected', { url: val.substring(0, 80) + '...' })
        return val
      }
      
      // Data URL (base64)
      if (val.startsWith('data:image/')) {
        logDebug('Data URL detected', { length: val.length })
        return val
      }
      
      // Base64 sans préfixe data:
      if (isBase64String(val)) {
        const dataUrl = `data:image/jpeg;base64,${val}`
        logDebug('Base64 string converted to data URL', { 
          originalLength: val.length,
          newLength: dataUrl.length 
        })
        return dataUrl
      }
      
      // Blob URL
      if (val.startsWith('blob:')) {
        logDebug('Blob URL detected')
        return val
      }

      // URL Supabase storage (format: bucket/path)
      if (val.includes('supabase') || val.includes('storage') || val.match(/^[\w-]+\/[\w-]+\.(jpg|jpeg|png|webp|gif)$/i)) {
        logDebug('Supabase storage path detected', { path: val })
        // Si c'est déjà une URL complète Supabase, la retourner
        if (val.includes('supabase.co') || val.includes('supabase.com')) {
          return val
        }
        // Sinon, construire l'URL complète (à adapter selon votre configuration)
        return val.startsWith('/') ? val : `/${val}`
      }

      // Chemin relatif commençant par /
      if (val.startsWith('/')) {
        logDebug('Relative path detected', { path: val })
        return val
      }

      // Si c'est un nom de fichier (ex: "image.jpg"), retourner comme /images/image.jpg
      if (!val.includes('/') && (val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.png') || val.endsWith('.webp') || val.endsWith('.gif'))) {
        logDebug('Filename detected, constructing image URL', { fileName: val })
        return `/images/${val}`
      }

      // Chemins relatifs sans / initial
      if (val.match(/^[\w-]+\/[\w.-]+$/)) {
        logDebug('Relative path without leading slash detected', { path: val })
        return `/${val}`
      }

      logWarning('Unknown string format for image data', { 
        start: val.substring(0, 50),
        length: val.length,
        fullValue: val
      })
      return fallbackUrl
    }

    // Cas 3: Array (bytea from PostgreSQL)
    if (Array.isArray(imageData)) {
      logDebug('Array detected (bytea), converting to base64', { arrayLength: imageData.length })
      
      if (imageData.length === 0) {
        logWarning('Empty array provided')
        return '/placeholder-recipe.jpg'
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
        return '/placeholder-recipe.jpg'
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
      return '/placeholder-recipe.jpg'
    }

    logWarning('Unhandled image data type', {
      type: typeof imageData,
      constructor: imageData?.constructor?.name
    })
    return '/placeholder-recipe.jpg'

  } catch (error) {
    logError('Error processing image data', error, {
      dataType: typeof imageData,
      hasData: !!imageData,
      imageDataSample: typeof imageData === 'string' ? imageData.substring(0, 100) : imageData
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
  const defaults = {
    maxWidth: 800,
    maxHeight: 600,
    quality: 0.8,
    maxSizeKB: 300,
    format: 'jpeg', // Forcer JPEG pour compatibilité Android
    preserveExif: false // Supprimer EXIF pour réduire la taille
  }
  
  const settings = { ...defaults, ...options }
  
  return new Promise((resolve, reject) => {
    // Détection de l'environnement mobile
    const userAgent = navigator.userAgent || ''
    const isAndroid = /android/i.test(userAgent)
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())
    
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          // Calcul des dimensions optimisées pour mobile
          let { width, height } = img
          const aspectRatio = width / height
          
          // Ajustement des dimensions selon l'appareil
          if (isMobile) {
            // Sur mobile, on peut être plus généreux avec la taille
            if (width > settings.maxWidth || height > settings.maxHeight) {
              if (aspectRatio > 1) {
                width = Math.min(width, settings.maxWidth)
                height = width / aspectRatio
              } else {
                height = Math.min(height, settings.maxHeight)
                width = height * aspectRatio
              }
            }
          } else {
            // Sur desktop, on garde les limites classiques
            if (width > settings.maxWidth) {
              width = settings.maxWidth
              height = width / aspectRatio
            }
            if (height > settings.maxHeight) {
              height = settings.maxHeight
              width = height * aspectRatio
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          // Configuration du contexte pour une meilleure qualité sur Android
          if (isAndroid) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
          }
          
          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, width, height)
          
          // Fonction pour obtenir la data URL avec compression adaptive
          const getOptimizedDataUrl = (quality) => {
            return canvas.toDataURL(`image/${settings.format}`, quality)
          }
          
          // Compression adaptative pour respecter la taille limite
          let quality = settings.quality
          let dataUrl = getOptimizedDataUrl(quality)
          let currentSizeKB = Math.round((dataUrl.length * 3) / 4 / 1024)
          
          // Réduction progressive de la qualité si nécessaire
          while (currentSizeKB > settings.maxSizeKB && quality > 0.1) {
            quality -= 0.1
            dataUrl = getOptimizedDataUrl(quality)
            currentSizeKB = Math.round((dataUrl.length * 3) / 4 / 1024)
          }
          
          // Si encore trop lourd, réduire les dimensions
          if (currentSizeKB > settings.maxSizeKB) {
            const scaleFactor = Math.sqrt(settings.maxSizeKB / currentSizeKB)
            canvas.width = Math.floor(width * scaleFactor)
            canvas.height = Math.floor(height * scaleFactor)
            
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            
            dataUrl = getOptimizedDataUrl(Math.max(quality, 0.6))
            currentSizeKB = Math.round((dataUrl.length * 3) / 4 / 1024)
          }
          
          const result = {
            url: dataUrl,
            originalSize: file.size,
            compressedSize: currentSizeKB * 1024,
            compressionRatio: ((file.size - (currentSizeKB * 1024)) / file.size * 100).toFixed(1),
            dimensions: {
              width: canvas.width,
              height: canvas.height,
              originalWidth: img.width,
              originalHeight: img.height
            },
            quality: quality,
            mimeType: `image/${settings.format}`,
            isMobile,
            isAndroid,
            processingTime: Date.now()
          }
          
          resolve(result)
        } catch (error) {
          reject(new Error(`Erreur lors du traitement de l'image: ${error.message}`))
        }
      }
      
      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'))
      }
      
      img.src = event.target.result
    }
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'))
    }
    
    reader.readAsDataURL(file)
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
  
  // Vérifier la taille minimale (plus permissive)
  if (file.size < 100) { // 100 bytes minimum au lieu de 1024
    result.valid = false
    result.errors.push('Fichier trop petit ou corrompu')
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
 * @param {string} fileName - Name for the file
 * @returns {Promise<string>} - URL to the uploaded image
 */
export async function uploadImageToSupabase(base64Data, fileName = null) {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid base64 data provided')
    }

    // Generate unique filename if not provided
    if (!fileName) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      fileName = `recipe_${timestamp}_${random}.jpg`
    }

    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    logDebug('Uploading image to Supabase storage', {
      fileName,
      blobSize: blob.size,
      base64Length: base64Content.length
    })

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      })

    if (error) {
      logError('Supabase storage upload failed', error, { fileName })
      throw error
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName)

    logInfo('Image uploaded successfully to Supabase', {
      fileName,
      publicUrl: publicUrl?.substring(0, 50) + '...'
    })

    return publicUrl

  } catch (error) {
    logError('Error uploading image to Supabase', error, {
      fileName,
      hasBase64Data: !!base64Data
    })
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

/**
 * Process and compress image for direct storage as data URL in database
 * @param {File|string} fileOrDataUrl - Fichier image ou dataURL
 * @param {string} [filename] - Nom du fichier (optionnel)
 * @returns {Promise<string>} Data URL compressée prête pour stockage
 */
export async function processImageForDirectStorage(fileOrDataUrl, filename = null) {
  try {
    logInfo('processImageForDirectStorage: start', {
      typeofInput: typeof fileOrDataUrl,
      isFile: typeof File !== 'undefined' && fileOrDataUrl instanceof File,
      filename,
      timestamp: new Date().toISOString()
    });

    let file, ext = 'jpg';
    
    // Traitement selon le type d'entrée
    if (typeof File !== 'undefined' && fileOrDataUrl instanceof File) {
      file = fileOrDataUrl;
      ext = file.name.split('.').pop() || 'jpg';
      
      logInfo('File object detected', { 
        name: file.name, 
        size: file.size, 
        type: file.type,
        extension: ext,
        lastModified: file.lastModified
      });
      
      // Validation du fichier
      const validation = validateImageFile(file);
      if (!validation.valid) {
        logError('File validation failed', new Error('Invalid file'), {
          errors: validation.errors,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
        throw new Error(`Fichier invalide: ${validation.errors.join(', ')}`);
      }
      
      logInfo('File validation passed', { fileName: file.name });
      
    } else if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/')) {
      // DataURL déjà fournie
      const matches = fileOrDataUrl.match(/^data:image\/(\w+);base64,/);
      ext = matches ? matches[1] : 'jpg';
      
      logInfo('DataURL detected', { 
        originalLength: fileOrDataUrl.length,
        mimeType: matches ? matches[0] : 'unknown',
        extension: ext,
        base64Length: fileOrDataUrl.split(',')[1]?.length || 0
      });
      
      // Retourner directement si c'est déjà une dataURL valide
      return fileOrDataUrl;
      
    } else {
      const errorMsg = 'Format d\'image non supporté - doit être un File ou une dataURL';
      logError('Unsupported image format', new Error(errorMsg), {
        inputType: typeof fileOrDataUrl,
        isString: typeof fileOrDataUrl === 'string',
        startsWithData: typeof fileOrDataUrl === 'string' ? fileOrDataUrl.startsWith('data:') : false
      });
      throw new Error(errorMsg);
    }

    // Traitement et compression de l'image
    logInfo('Starting image processing and compression', {
      fileName: file.name,
      originalSize: file.size,
      targetMaxWidth: 800,
      targetMaxHeight: 600,
      targetQuality: 0.8
    });

    const processed = await processImageToUrl(file, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8,
      maxSizeKB: 500 // Limite à 500KB pour éviter les données trop volumineuses
    });

    logInfo('Image processing completed successfully', {
      originalSize: file.size,
      compressedSize: processed.compressedSize,
      compressionRatio: processed.compressionRatio + '%',
      finalWidth: processed.width,
      finalHeight: processed.height,
      finalQuality: processed.quality,
      dataUrlLength: processed.url.length,
      estimatedStorageSize: Math.round(processed.url.length / 1024) + 'KB'
    });

    return processed.url;

  } catch (err) {
    logError('processImageForDirectStorage: global error', err, {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.substring(0, 500),
      inputType: typeof fileOrDataUrl,
      filename,
      timestamp: new Date().toISOString()
    });

    // Messages d'erreur plus clairs
    if (err.message?.includes('Canvas')) {
      throw new Error('Erreur de traitement d\'image. Format non supporté ou fichier corrompu.');
    } else if (err.message?.includes('too large')) {
      throw new Error('Image trop volumineuse. Utilisez une image plus petite.');
    } else {
      throw err;
    }
  }
}

/**
 * Uploads a File object to Supabase storage and returns the public URL
 * Now redirects to processImageForDirectStorage for direct database storage
 * @param {File|string} fileOrDataUrl - Fichier image ou dataURL
 * @param {string} [filename] - Nom du fichier (optionnel)
 * @returns {Promise<string>} Data URL prête pour stockage direct en base
 */
export async function uploadImageToSupabaseAndGetUrl(fileOrDataUrl, filename = null) {
  logInfo('uploadImageToSupabaseAndGetUrl called - redirecting to direct storage', {
    inputType: typeof fileOrDataUrl,
    filename
  });
  
  return await processImageForDirectStorage(fileOrDataUrl, filename);
}

/**
 * Specific function to detect and process HEIC/HEIF formats on Android
 * @param {File} file - Image file
 * @returns {Promise<string>} - URL to the processed image
 */
export async function processHeicImage(file) {
  try {
    // Vérifier si le format HEIC est supporté
    if (!isHEICSupported()) {
      throw new Error('HEIC format not supported on this device')
    }
    
    // Convertir HEIC en JPEG pour compatibilité
    const processed = await processImageToUrl(file, {
      maxWidth: 1200,
      maxHeight: 800,
      quality: 0.9,
      maxSizeKB: 500,
      format: 'jpeg'
    })
    
    return processed.url
  } catch (error) {
    logError('Error processing HEIC image', error)
    throw error
  }
}

/**
 * Check if HEIC format is supported
 * @returns {boolean} - True if HEIC is supported
 */
export function isHEICSupported() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Test basique de support
  try {
    const testImg = new Image()
    testImg.src = 'data:image/heic;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGBobHB0eH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A0XqFoOaOqmOjw7QUlNnbMY9IiHkfR3X/2Q=='
    return false
  } catch {
    return false
  }
}

/**
 * Validates if an image URL is safe to use
 * @param {string} url - The URL to validate
 * @returns {boolean} True if the URL is valid and safe
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  // Allow data URLs for base64 images
  if (url.startsWith('data:image/')) {
    // Basic validation for data URLs
    return url.includes(',') && url.length > 50
  }
  
  // Allow HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  // Allow relative paths for local images
  if (url.startsWith('/')) {
    return true
  }
  
  return false
}

/**
 * Create a safe image URL with better error handling and fallback
 * @param {*} imageData - Raw image data
 * @param {string} fallback - Fallback URL
 * @returns {string} Safe image URL
 */
export function createSafeImageUrl(imageData, fallback = '/placeholder-recipe.jpg') {
  try {
    const processedUrl = processImageData(imageData, fallback)
    
    logDebug('Created safe image URL', {
      originalData: typeof imageData === 'string' ? imageData.substring(0, 100) : imageData,
      processedUrl: processedUrl.substring(0, 100),
      isFallback: processedUrl === fallback
    })
    
    return processedUrl
  } catch (error) {
    logError('Error creating safe image URL', error, {
      imageData: typeof imageData === 'string' ? imageData.substring(0, 100) : imageData
    })
    return fallback
  }
}
