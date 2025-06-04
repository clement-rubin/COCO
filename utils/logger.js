/**
 * Système de logging centralisé pour COCO
 * Supporte différents niveaux de log et environnements
 */

const isDevelopment = typeof window !== 'undefined' 
  ? window.location.hostname === 'localhost' 
  : process.env.NODE_ENV === 'development'

const LOG_LEVELS = {
  ERROR: 0,
  WARNING: 1,
  INFO: 2,
  DEBUG: 3
}

const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO

// Fonction de base pour logger
function createLogger(level, emoji, color) {
  return function(message, data = null, context = {}) {
    if (level > currentLogLevel) return

    const timestamp = new Date().toLocaleTimeString()
    const prefix = `${emoji} [${timestamp}]`
    
    if (typeof window !== 'undefined') {
      // Côté client - utiliser console avec couleurs
      const style = `color: ${color}; font-weight: bold;`
      console.log(`%c${prefix} ${message}`, style)
      
      if (data || Object.keys(context).length > 0) {
        const logData = { ...context }
        if (data) logData.data = data
        console.log('%cDétails:', 'color: #666; font-style: italic;', logData)
      }
    } else {
      // Côté serveur - log simple
      console.log(`${prefix} ${message}`)
      if (data || Object.keys(context).length > 0) {
        console.log('Détails:', { data, context })
      }
    }
  }
}

// Loggers spécialisés
export const logError = createLogger(LOG_LEVELS.ERROR, '❌', '#ff4444')
export const logWarning = createLogger(LOG_LEVELS.WARNING, '⚠️', '#ff9900')
export const logInfo = createLogger(LOG_LEVELS.INFO, 'ℹ️', '#0066cc')
export const logDebug = createLogger(LOG_LEVELS.DEBUG, '🔍', '#666666')

// Logger spécialisé pour les interactions utilisateur
export const logUserInteraction = (action, component, data = {}) => {
  logInfo(`Action utilisateur: ${action}`, data, { 
    component, 
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.pathname : 'server'
  })
}

// Logger spécialisé pour les erreurs de performance
export const logPerformance = (operation, duration, data = {}) => {
  const level = duration > 2000 ? logWarning : logInfo
  level(`Performance ${operation}: ${duration}ms`, data)
}

export default {
  error: logError,
  warning: logWarning,
  info: logInfo,
  debug: logDebug,
  userInteraction: logUserInteraction,
  performance: logPerformance
}
