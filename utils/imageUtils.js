import { logDebug, logError, logInfo } from './logger';
import { supabase } from '../lib/supabase';

/**
 * Process image data to a valid URL that can be used in <img> tags
 * Handles different formats: base64, URLs, bytea arrays
 * @param {*} imageData - Image data (could be base64 string, URL, or bytea array)
 * @param {string} fallbackUrl - URL to use if image processing fails
 * @returns {string} - URL that can be used in an <img> tag
 */
export function processImageData(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  try {
    // Case 1: Image is already a URL (http/https)
    if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
      logDebug('Image is already a URL', { urlStart: imageData.substring(0, 30) + '...' })
      return imageData
    }

    // Case 2: Image is a base64 data URL
    if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      logDebug('Image is a base64 data URL', { dataUrlLength: imageData.length })
      return imageData
    }

    // Case 3: Image is a Supabase storage URL (no protocol prefix)
    if (typeof imageData === 'string' && imageData.includes('storage/v1/object/public/')) {
      logDebug('Image is a Supabase storage path', { path: imageData })
      return `${supabase.storageUrl}/object/public/${imageData.split('storage/v1/object/public/')[1]}`
    }

    // Case 4: Image is a UUID reference to a Supabase storage object
    if (typeof imageData === 'string' && 
        (imageData.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
         imageData.startsWith('images/'))) {
      logDebug('Image is a UUID or storage path', { id: imageData })
      return `${supabase.storageUrl}/object/public/images/${imageData.startsWith('images/') ? imageData.substring(7) : imageData}`
    }

    // Case 5: Image is a bytea array (from Postgres)
    if (Array.isArray(imageData) || (typeof imageData === 'object' && imageData !== null)) {
      logDebug('Image is a bytea array or object', { 
        isArray: Array.isArray(imageData),
        length: Array.isArray(imageData) ? imageData.length : 'n/a' 
      })
      
      // Convert bytea to base64
      if (Array.isArray(imageData)) {
        // Convert Uint8Array or regular array to base64
        const bytes = new Uint8Array(imageData)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        
        // Try to determine MIME type from the first few bytes
        const mimeType = determineMimeType(bytes)
        return `data:${mimeType};base64,${base64}`
      }
    }

    // Case 6: Unknown format or null/undefined
    logDebug('Image format unrecognized or null', { 
      type: typeof imageData,
      isNull: imageData === null,
      isUndefined: imageData === undefined 
    })
    return fallbackUrl
    
  } catch (error) {
    logError('Error processing image data', error, {
      imageDataType: typeof imageData,
      hasData: !!imageData,
      isArray: Array.isArray(imageData)
    })
    return fallbackUrl
  }
}

/**
 * Estimate the size in KB of a Data URL given the original file size and compression ratio
 * @param {number} fileSizeBytes 
 * @param {number} compressionRatio (0.0 - 1.0)
 * @returns {number} Estimated size in KB
 */
export function estimateDataUrlSize(fileSizeBytes, compressionRatio = 0.7) {
  // Data URL is base64, so size increases by ~33%
  const estimated = Math.round((fileSizeBytes * compressionRatio * 4 / 3) / 1024)
  return estimated
}

/**
 * Convert an image file to a compressed Data URL (base64) with resizing
 * @param {File|Blob} file 
 * @param {object} options { maxWidth, maxHeight, quality, maxSizeKB }
 * @returns {Promise<{url: string, mimeType: string, originalSize: number, compressedSize: number, compressionRatio: number}>}
 */
export async function processImageToUrl(file, options = {}) {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.7,
    maxSizeKB = 400
  } = options

  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onload = function (e) {
        const img = new window.Image()
        img.onload = function () {
          let { width, height } = img
          let newWidth = width
          let newHeight = height

          // Resize if needed
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            newWidth = Math.round(width * ratio)
            newHeight = Math.round(height * ratio)
          }

          const canvas = document.createElement('canvas')
          canvas.width = newWidth
          canvas.height = newHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          // Try to keep the original mime type if possible
          let mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
          // Always fallback to jpeg for best compression
          if (!/png|jpeg|webp/.test(mimeType)) mimeType = 'image/jpeg'

          let dataUrl = canvas.toDataURL(mimeType, quality)
          let compressedSize = Math.round(dataUrl.length * 0.75 / 1024)
          let compressionRatio = compressedSize / Math.max(1, Math.round(file.size / 1024))

          // If still too big, try to compress more
          if (compressedSize > maxSizeKB && quality > 0.4) {
            let q = quality
            let tries = 0
            while (compressedSize > maxSizeKB && q > 0.4 && tries < 5) {
              q -= 0.1
              dataUrl = canvas.toDataURL(mimeType, q)
              compressedSize = Math.round(dataUrl.length * 0.75 / 1024)
              tries++
            }
          }

          resolve({
            url: dataUrl,
            mimeType,
            originalSize: file.size,
            compressedSize,
            compressionRatio
          })
        }
        img.onerror = function () {
          reject(new Error('Impossible de charger l\'image'))
        }
        img.src = e.target.result
      }
      reader.onerror = function () {
        reject(new Error('Impossible de lire le fichier image'))
      }
      reader.readAsDataURL(file)
    } catch (err) {
      reject(err)
    }
  })
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
