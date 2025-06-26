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
  AUTH: 'AUTH'
}

// Stockage des logs en mémoire (pour debug)
let logHistory = []
const MAX_LOG_HISTORY = 1000

// Fonction utilitaire pour créer un ID unique de log
const generateLogId = () => {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

// Fonction principale de logging
const createLog = (level, type, message, data = {}, error = null) => {
  const timestamp = new Date().toISOString()
  const logId = generateLogId()
  
  const logEntry = {
    id: logId,
    timestamp,
    level: Object.keys(LOG_LEVELS)[level],
    type,
    message,
    data: JSON.parse(JSON.stringify(data)), // Deep clone pour éviter les mutations
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
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

// Fonctions de logging spécialisées
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
  userInteraction: logUserInteraction,
  apiCall: logApiCall,
  componentEvent: logComponentEvent,
  performance: logPerformance,
  recipeAction: logRecipeAction,
  frontendError: logFrontendError,
  database: logDatabaseOperation,
  auth: logAuth,
  getLogs,
  clearLogs,
  exportLogs,
  success: logSuccess
}
