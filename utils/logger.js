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
export const logWarning = createLogger(LOG_LEVELS.WARNING, '⚠️', '#ff9900')
export const logError = createLogger(LOG_LEVELS.ERROR, '❌', '#ff0000')
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

// Logger spécialisé pour les événements de composants
export const logComponentEvent = (componentName, event, data = {}) => {
  logDebug(`[${componentName}] ${event}`, data, {
    component: componentName,
    event,
    timestamp: Date.now()
  })
}

// Logger spécialisé pour le debug des données
export const logDataDebug = (operation, data = {}) => {
  if (isDevelopment) {
    console.group(`🔍 DEBUG: ${operation}`)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Data:', data)
    console.groupEnd()
  }
}

// Logger spécialisé pour les erreurs frontend avec context enrichi
export const logFrontendError = (error, context = {}) => {
  const errorId = `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  const enrichedContext = {
    ...context,
    errorId,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    errorName: error?.name,
    errorMessage: error?.message,
    stackTrace: error?.stack
  }
  
  logError(`Frontend Error: ${error?.message || 'Unknown error'}`, error, enrichedContext)
  
  return { id: errorId, context: enrichedContext }
}

export default {
  error: logError,
  warning: logWarning,
  info: logInfo,
  debug: logDebug,
  userInteraction: logUserInteraction,
  performance: logPerformance,
  componentEvent: logComponentEvent,
  frontendError: logFrontendError
}
