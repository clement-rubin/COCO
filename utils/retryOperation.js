import { logInfo, logWarning, logError } from './logger'

/**
 * Exécute une opération avec retry automatique
 * @param {Function} operation - Fonction async à exécuter
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {number} delay - Délai entre les tentatives (ms)
 * @returns {Promise} Résultat de l'opération
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`Tentative ${attempt}/${maxRetries}`, {
        operation: operation.name || 'anonymous',
        attempt,
        maxRetries
      })
      
      const result = await operation()
      
      if (attempt > 1) {
        logInfo('Opération réussie après retry', {
          attempt,
          totalAttempts: attempt
        })
      }
      
      return result
    } catch (error) {
      lastError = error
      
      logWarning(`Tentative ${attempt} échouée`, {
        error: error.message,
        attempt,
        maxRetries,
        willRetry: attempt < maxRetries
      })
      
      if (attempt === maxRetries) {
        logError('Toutes les tentatives ont échoué', error, {
          totalAttempts: attempt,
          maxRetries
        })
        break
      }
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  
  throw lastError
}
