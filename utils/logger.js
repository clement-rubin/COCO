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
    if (level > currentLogLevel) return // Fix: ajouter le return manquant

    const timestamp = new Date().toLocaleTimeString()
    const prefix = `${emoji} [${timestamp}]`
    
    if (typeof window !== 'undefined') {
      // Côté client - log coloré avec détails
      const logStyle = `color: ${color}; font-weight: bold;`
      console.log(`%c${prefix} ${message}`, logStyle)
      
      if (data || Object.keys(context).length > 0) {
        console.groupCollapsed('Détails du log')
        if (data) {
          console.log('Data:', data)
        }
        if (Object.keys(context).length > 0) {
          console.log('Context:', context)
        }
        console.log('Stack Trace:', new Error().stack)
        console.groupEnd()
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
  logInfo(`USER_INTERACTION: ${action}`, data, { 
    component,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  })
}

// Logger pour les performances
export const logPerformance = (operation, duration, data = {}) => {
  const level = duration > 1000 ? LOG_LEVELS.WARNING : LOG_LEVELS.DEBUG
  const emoji = duration > 1000 ? '🐌' : '⚡'
  
  createLogger(level, emoji, duration > 1000 ? '#ff9900' : '#00cc66')(
    `PERFORMANCE: ${operation} took ${duration}ms`, 
    data, 
    { 
      operation, 
      duration, 
      timestamp: new Date().toISOString()
    }
  )
}

// Logger pour les erreurs réseau
export const logNetworkError = (url, error, retryCount = 0) => {
  logError(`NETWORK_ERROR: ${url}`, error, {
    url,
    retryCount,
    errorType: error.name,
    errorMessage: error.message,
    timestamp: new Date().toISOString(),
    networkInfo: typeof navigator !== 'undefined' ? {
      onLine: navigator.onLine,
      connection: navigator.connection?.effectiveType
    } : null
  })
}

// Logger pour le cycle de vie des composants React
export const logComponentLifecycle = (componentName, phase, props = {}) => {
  logDebug(`COMPONENT_LIFECYCLE: ${componentName} - ${phase}`, props, {
    componentName,
    phase,
    timestamp: new Date().toISOString()
  })
}

// Logger pour les API calls
export const logApiCall = (method, url, data = null, response = null) => {
  const status = response?.status
  const isError = status >= 400
  const logger = isError ? logError : logInfo
  
  logger(`API_${method.toUpperCase()}: ${url}`, {
    method,
    url,
    requestData: data,
    responseStatus: status,
    responseData: response?.data || response
  }, {
    timestamp: new Date().toISOString(),
    isError,
    responseTime: response?.responseTime
  })
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
