/**
 * Système de logging centralisé pour COCO
 * Supporte différents niveaux de log et environnements
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARNING: 1,
  INFO: 2,
  DEBUG: 3
}

const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG

function createLogEntry(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    id: Math.random().toString(36).substr(2, 9)
  }
}

export function logError(message, error = null, context = {}) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.ERROR) {
    const logEntry = createLogEntry('ERROR', message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    })
    
    console.error(`[ERROR] ${message}`, logEntry)
    return logEntry
  }
}

export function logWarning(message, context = {}) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.WARNING) {
    const logEntry = createLogEntry('WARNING', message, context)
    console.warn(`[WARNING] ${message}`, logEntry)
    return logEntry
  }
}

export function logInfo(message, context = {}) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
    const logEntry = createLogEntry('INFO', message, context)
    console.info(`[INFO] ${message}`, logEntry)
    return logEntry
  }
}

export function logDebug(message, context = {}) {
  if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    const logEntry = createLogEntry('DEBUG', message, context)
    console.debug(`[DEBUG] ${message}`, logEntry)
    return logEntry
  }
}

export function logUserInteraction(action, element, context = {}) {
  return logInfo(`User interaction: ${action}`, {
    action,
    element,
    ...context
  })
}

export function logComponentEvent(component, event, context = {}) {
  return logDebug(`Component event: ${component}.${event}`, {
    component,
    event,
    ...context
  })
}

export function logFrontendError(error, context = {}) {
  return logError('Frontend error', error, context)
}
