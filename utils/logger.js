/**
 * Système de journalisation centralisé
 */

// Configuration du logger
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
}

const LOG_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARNING : LOG_LEVELS.DEBUG

// Types de logs spécialisés
const LOG_TYPES = {
  USER_INTERACTION: 'USER_INTERACTION',
  API_CALL: 'API_CALL', 
  COMPONENT_EVENT: 'COMPONENT_EVENT',
  PERFORMANCE: 'PERFORMANCE',
  RECIPE_ACTION: 'RECIPE_ACTION',
  FRONTEND_ERROR: 'FRONTEND_ERROR',
  DATABASE: 'DATABASE',
  AUTH: 'AUTH',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
}

// Stockage des logs en mémoire (pour debug)
let logHistory = []
const MAX_LOG_HISTORY = 1000

// Fonction utilitaire pour créer un ID unique de log
const generateLogId = () => {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

// Fonction principale de logging avec safeguards
const createLog = (level, type, message, data = {}, error = null) => {
  const timestamp = new Date().toISOString()
  const logId = generateLogId()
  
  // Safeguard pour les types de logs
  const safeType = type || 'GENERAL'
  const safeLevel = typeof level === 'number' ? level : LOG_LEVELS.INFO
  
  const logEntry = {
    id: logId,
    timestamp,
    level: Object.keys(LOG_LEVELS)[safeLevel] || 'INFO',
    type: safeType,
    message: message || 'No message provided',
    data: data ? JSON.parse(JSON.stringify(data)) : {}, // Deep clone pour éviter les mutations
    error: error ? {
      name: error.name || 'Unknown Error',
      message: error.message || 'No error message',
      stack: error.stack || 'No stack trace',
      cause: error.cause,
      // Capturer des détails supplémentaires pour les erreurs HTTP
      status: error.status,
      statusText: error.statusText,
      code: error.code,
      requestId: error.requestId,
      // Capturer les détails de la réponse si disponibles
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.response.url,
        headers: error.response.headers ? Object.fromEntries(error.response.headers.entries?.() || []) : undefined
      } : undefined,
      // Capturer les détails de la requête si disponibles
      request: error.request ? {
        method: error.request.method,
        url: error.request.url,
        headers: error.request.headers
      } : undefined
    } : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'Server'
  }

  // Ajouter à l'historique
  logHistory.push(logEntry)
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory = logHistory.slice(-MAX_LOG_HISTORY)
  }

  // Logger en console si le niveau est suffisant
  if (level >= LOG_LEVEL) {
    const consoleMethod = level >= LOG_LEVELS.ERROR ? 'error' : 
                         level >= LOG_LEVELS.WARNING ? 'warn' : 
                         level >= LOG_LEVELS.INFO ? 'info' : 'log'
    
    const prefix = `[${logEntry.level}][${type}]`
    const fullMessage = `${prefix} ${message}`
    
    if (error) {
      console[consoleMethod](fullMessage, { data, error: logEntry.error })
    } else if (Object.keys(data).length > 0) {
      console[consoleMethod](fullMessage, data)
    } else {
      console[consoleMethod](fullMessage)
    }
  }

  return logEntry
}

// Fonctions de logging spécialisées avec safeguards
export const logDebug = (message, data = {}) => {
  return createLog(LOG_LEVELS.DEBUG, LOG_TYPES.DEBUG, message, data)
}

export const logInfo = (message, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.INFO, message, data)
}

export const logWarning = (message, data = {}) => {
  return createLog(LOG_LEVELS.WARNING, LOG_TYPES.WARNING, message, data)
}

export const logError = (message, error = null, data = {}) => {
  return createLog(LOG_LEVELS.ERROR, LOG_TYPES.ERROR, message, data, error)
}

export const logCritical = (message, error = null, data = {}) => {
  return createLog(LOG_LEVELS.CRITICAL, LOG_TYPES.ERROR, message, data, error)
}

// Logs spécialisés
export const logUserInteraction = (action, element, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.USER_INTERACTION, `User ${action} on ${element}`, {
    action,
    element,
    ...data
  })
}

export const logApiCall = (method, url, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.API_CALL, `${method} ${url}`, data)
}

export const logComponentEvent = (component, event, data = {}) => {
  return createLog(LOG_LEVELS.DEBUG, LOG_TYPES.COMPONENT_EVENT, `${component}: ${event}`, {
    component,
    event,
    ...data
  })
}

export const logPerformance = (operation, duration, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.PERFORMANCE, `${operation} took ${duration}ms`, {
    operation,
    duration,
    ...data
  })
}

export const logRecipeAction = (action, recipeId, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.RECIPE_ACTION, `Recipe ${action}: ${recipeId}`, {
    action,
    recipeId,
    ...data
  })
}

export const logFrontendError = (error, data = {}) => {
  return createLog(LOG_LEVELS.ERROR, LOG_TYPES.FRONTEND_ERROR, 'Frontend error occurred', data, error)
}

export const logDatabaseOperation = (operation, table, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.DATABASE, `Database ${operation} on ${table}`, {
    operation,
    table,
    ...data
  })
}

export const logAuth = (action, data = {}) => {
  return createLog(LOG_LEVELS.INFO, LOG_TYPES.AUTH, `Auth: ${action}`, data)
}

// Fonction spécialisée pour les logs d'images
export const logImageProcessing = (action, imageData, processedUrl, data = {}) => {
  return createLog(LOG_LEVELS.DEBUG, 'IMAGE_PROCESSING', `Image ${action}`, {
    action,
    originalData: typeof imageData === 'string' ? imageData.substring(0, 100) : imageData,
    originalDataType: typeof imageData,
    processedUrl: processedUrl?.substring(0, 100),
    ...data
  })
}

// Fonction spécialisée pour les erreurs de fetch/HTTP
export const logHttpError = (message, error, requestDetails = {}, data = {}) => {
  const enhancedData = {
    ...data,
    requestDetails: {
      method: requestDetails.method,
      url: requestDetails.url,
      headers: requestDetails.headers,
      body: requestDetails.body ? 
        (typeof requestDetails.body === 'string' ? requestDetails.body.substring(0, 500) : 'Non-string body') 
        : undefined,
      ...requestDetails
    },
    errorContext: {
      type: 'HTTP_ERROR',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    }
  }
  
  return createLog(LOG_LEVELS.ERROR, LOG_TYPES.FRONTEND_ERROR, message, enhancedData, error)
}

// Fonctions utilitaires
export const getLogs = (filter = {}) => {
  let filteredLogs = [...logHistory]
  
  if (filter.level) {
    filteredLogs = filteredLogs.filter(log => log.level === filter.level)
  }
  
  if (filter.type) {
    filteredLogs = filteredLogs.filter(log => log.type === filter.type)
  }
  
  if (filter.since) {
    const sinceDate = new Date(filter.since)
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate)
  }
  
  return filteredLogs.reverse() // Plus récents en premier
}

export const clearLogs = () => {
  logHistory = []
  logInfo('Log history cleared')
}

export const exportLogs = () => {
  const logsData = {
    exportedAt: new Date().toISOString(),
    totalLogs: logHistory.length,
    logs: logHistory
  }
  
  return JSON.stringify(logsData, null, 2)
}

// Export des constantes pour utilisation externe
export { LOG_LEVELS, LOG_TYPES }

// Fonction de logging catch-all pour compatibilité
export const log = (level, message, data = {}, error = null) => {
  return createLog(level, 'GENERAL', message, data, error)
}

// Success log helper
export const logSuccess = (message, data = {}) => {
  return createLog(LOG_LEVELS.INFO, 'SUCCESS', message, data)
}

export default {
  debug: logDebug,
  info: logInfo,
  warning: logWarning,
  error: logError,
  critical: logCritical,
  httpError: logHttpError,
  userInteraction: logUserInteraction,
  apiCall: logApiCall,
  componentEvent: logComponentEvent,
  performance: logPerformance,
  recipeAction: logRecipeAction,
  frontendError: logFrontendError,
  database: logDatabaseOperation,
  auth: logAuth,
  imageProcessing: logImageProcessing,
  getLogs,
  clearLogs,
  exportLogs,
  success: logSuccess
}
