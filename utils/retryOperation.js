import { logDebug, logError } from './logger'

/**
 * Exécute une opération avec retry automatique
 * @param {Function} operation - Fonction async à exécuter
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {number} delay - Délai entre les tentatives (ms)
 * @returns {Promise} Résultat de l'opération
 */
export const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logDebug(`Tentative ${attempt}/${maxRetries}`, { operation: operation.name })
      const result = await operation()
      
      if (attempt > 1) {
        logDebug(`Opération réussie après ${attempt} tentatives`)
      }
      
      return result
    } catch (error) {
      logError(`Tentative ${attempt}/${maxRetries} échouée`, error)
      
      if (attempt === maxRetries) {
        throw new Error(`Opération échouée après ${maxRetries} tentatives: ${error.message}`)
      }
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
}
