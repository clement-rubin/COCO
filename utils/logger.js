/**
 * Système de logging centralisé pour COCO
 * Gère tous les types d'erreurs, performances, interactions utilisateur et événements système
 */

// Configuration du logger
const LOG_CONFIG = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  maxEntries: 1000,
  persistLogs: typeof window !== 'undefined',
  enableStackTrace: process.env.NODE_ENV !== 'production',
  enablePerformanceTracking: true,
  enableUserTracking: true,
  autoSendErrors: process.env.NODE_ENV === 'production'
}

// Types d'erreurs exhaustifs
export const ERROR_TYPES = {
  // Erreurs Frontend
  FRONTEND_ERROR: 'frontend_error',
  COMPONENT_ERROR: 'component_error',
  RENDER_ERROR: 'render_error',
  STATE_ERROR: 'state_error',
  PROPS_ERROR: 'props_error',
  HOOK_ERROR: 'hook_error',
  CONTEXT_ERROR: 'context_error',
  ROUTER_ERROR: 'router_error',
  
  // Erreurs Network & API
  NETWORK_ERROR: 'network_error',
  API_ERROR: 'api_error',
  HTTP_ERROR: 'http_error',
  CORS_ERROR: 'cors_error',
  TIMEOUT_ERROR: 'timeout_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  
  // Erreurs Authentication
  AUTH_ERROR: 'auth_error',
  LOGIN_ERROR: 'login_error',
  SIGNUP_ERROR: 'signup_error',
  TOKEN_ERROR: 'token_error',
  SESSION_ERROR: 'session_error',
  PERMISSION_ERROR: 'permission_error',
  
  // Erreurs Database
  DATABASE_ERROR: 'database_error',
  QUERY_ERROR: 'query_error',
  CONNECTION_ERROR: 'connection_error',
  TRANSACTION_ERROR: 'transaction_error',
  CONSTRAINT_ERROR: 'constraint_error',
  
  // Erreurs Upload & Files
  UPLOAD_ERROR: 'upload_error',
  FILE_ERROR: 'file_error',
  IMAGE_ERROR: 'image_error',
  VIDEO_ERROR: 'video_error',
  SIZE_ERROR: 'file_size_error',
  FORMAT_ERROR: 'file_format_error',
  
  // Erreurs Validation
  VALIDATION_ERROR: 'validation_error',
  FORM_ERROR: 'form_error',
  INPUT_ERROR: 'input_error',
  SCHEMA_ERROR: 'schema_error',
  
  // Erreurs Business Logic
  RECIPE_ERROR: 'recipe_error',
  USER_ERROR: 'user_error',
  FRIEND_ERROR: 'friend_error',
  SEARCH_ERROR: 'search_error',
  FILTER_ERROR: 'filter_error',
  
  // Erreurs System
  MEMORY_ERROR: 'memory_error',
  PERFORMANCE_ERROR: 'performance_error',
  STORAGE_ERROR: 'storage_error',
  CACHE_ERROR: 'cache_error',
  
  // Erreurs External Services
  SUPABASE_ERROR: 'supabase_error',
  NETLIFY_ERROR: 'netlify_error',
  THIRD_PARTY_ERROR: 'third_party_error',
  
  // Erreurs critiques
  CRITICAL_ERROR: 'critical_error',
  FATAL_ERROR: 'fatal_error',
  SECURITY_ERROR: 'security_error'
}

// Niveaux de sévérité
export const SEVERITY_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info', 
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
}

// Storage pour les logs
let logBuffer = []
let errorQueue = []
let performanceMetrics = {}

// Utilitaires pour environnement
const isClient = typeof window !== 'undefined'
const isServer = typeof window === 'undefined'
const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

/**
 * Génère un ID unique pour chaque log
 */
function generateLogId() {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Obtient des informations sur l'environnement
 */
function getEnvironmentInfo() {
  const baseInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    platform: isClient ? 'client' : 'server'
  }

  if (isClient) {
    return {
      ...baseInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      connection: navigator.connection ? {
        type: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null,
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      online: navigator.onLine,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  return {
    ...baseInfo,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  }
}

/**
 * Nettoie et sérialise les données pour le logging
 */
function sanitizeData(data, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '[Max Depth Reached]'
  if (data === null) return null
  if (data === undefined) return undefined
  
  if (typeof data === 'string') return data.length > 1000 ? data.substring(0, 1000) + '...' : data
  if (typeof data === 'number' || typeof data === 'boolean') return data
  
  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
      cause: data.cause,
      code: data.code
    }
  }
  
  if (data instanceof Date) return data.toISOString()
  
  if (Array.isArray(data)) {
    return data.slice(0, 50).map(item => sanitizeData(item, maxDepth, currentDepth + 1))
  }
  
  if (typeof data === 'object') {
    const sanitized = {}
    let count = 0
    for (const [key, value] of Object.entries(data)) {
      if (count >= 50) break // Limite le nombre de propriétés
      sanitized[key] = sanitizeData(value, maxDepth, currentDepth + 1)
      count++
    }
    return sanitized
  }
  
  return String(data)
}

/**
 * Créer une entrée de log standardisée
 */
function createLogEntry(level, message, error = null, context = {}) {
  const id = generateLogId()
  const environment = getEnvironmentInfo()
  
  const entry = {
    id,
    timestamp: environment.timestamp,
    level,
    message,
    error: error ? sanitizeData(error) : null,
    context: sanitizeData(context),
    environment,
    session: getSessionInfo(),
    performance: getPerformanceSnapshot()
  }
  
  // Ajouter au buffer
  logBuffer.push(entry)
  
  // Limiter la taille du buffer
  if (logBuffer.length > LOG_CONFIG.maxEntries) {
    logBuffer = logBuffer.slice(-LOG_CONFIG.maxEntries)
  }
  
  // Persister si activé
  if (LOG_CONFIG.persistLogs && isClient) {
    try {
      localStorage.setItem('coco_logs', JSON.stringify(logBuffer.slice(-100)))
    } catch (e) {
      console.warn('Impossible de persister les logs:', e)
    }
  }
  
  return entry
}

/**
 * Obtient les informations de session
 */
function getSessionInfo() {
  if (!isClient) return null
  
  return {
    sessionId: sessionStorage.getItem('coco_session_id') || generateSessionId(),
    visitStart: sessionStorage.getItem('coco_visit_start') || new Date().toISOString(),
    pageViews: parseInt(sessionStorage.getItem('coco_page_views') || '0'),
    errors: parseInt(sessionStorage.getItem('coco_errors') || '0')
  }
}

/**
 * Génère un ID de session
 */
function generateSessionId() {
  const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  if (isClient) {
    sessionStorage.setItem('coco_session_id', id)
    sessionStorage.setItem('coco_visit_start', new Date().toISOString())
  }
  return id
}

/**
 * Obtient un snapshot des performances
 */
function getPerformanceSnapshot() {
  if (!isClient || !performance) return null
  
  const navigation = performance.getEntriesByType('navigation')[0]
  const paint = performance.getEntriesByType('paint')
  
  return {
    loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : null,
    domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : null,
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
    memoryUsage: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize
    } : null
  }
}

/**
 * Envoie les erreurs critiques au serveur
 */
async function sendErrorToServer(logEntry) {
  if (!LOG_CONFIG.autoSendErrors || !isClient) return
  
  try {
    await fetch('/api/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    })
  } catch (e) {
    console.warn('Impossible d\'envoyer l\'erreur au serveur:', e)
  }
}

// =================
// FONCTIONS DE LOG PRINCIPALES
// =================

/**
 * Log debug - informations de développement
 */
export function logDebug(message, context = {}) {
  if (LOG_CONFIG.level === 'debug' || isDev) {
    const entry = createLogEntry(SEVERITY_LEVELS.DEBUG, message, null, context)
    console.log(`🔍 [DEBUG] ${message}`, context)
    return entry
  }
}

/**
 * Log info - informations générales
 */
export function logInfo(message, context = {}) {
  const entry = createLogEntry(SEVERITY_LEVELS.INFO, message, null, context)
  console.log(`ℹ️ [INFO] ${message}`, context)
  return entry
}

/**
 * Log warning - situations potentiellement problématiques
 */
export function logWarning(message, context = {}) {
  const entry = createLogEntry(SEVERITY_LEVELS.WARN, message, null, context)
  console.warn(`⚠️ [WARN] ${message}`, context)
  return entry
}

/**
 * Log error - erreurs générales
 */
export function logError(message, error = null, context = {}) {
  const entry = createLogEntry(SEVERITY_LEVELS.ERROR, message, error, {
    ...context,
    errorType: context.errorType || ERROR_TYPES.FRONTEND_ERROR
  })
  
  console.error(`❌ [ERROR] ${message}`, error, context)
  
  // Incrémenter le compteur d'erreurs de session
  if (isClient) {
    const currentErrors = parseInt(sessionStorage.getItem('coco_errors') || '0')
    sessionStorage.setItem('coco_errors', String(currentErrors + 1))
  }
  
  // Envoyer les erreurs critiques
  if (context.severity === 'high' || context.errorType === ERROR_TYPES.CRITICAL_ERROR) {
    sendErrorToServer(entry)
  }
  
  return entry
}

/**
 * Log fatal - erreurs critiques qui cassent l'application
 */
export function logFatal(message, error = null, context = {}) {
  const entry = createLogEntry(SEVERITY_LEVELS.FATAL, message, error, {
    ...context,
    errorType: context.errorType || ERROR_TYPES.FATAL_ERROR
  })
  
  console.error(`💀 [FATAL] ${message}`, error, context)
  
  // Toujours envoyer les erreurs fatales
  sendErrorToServer(entry)
  
  return entry
}

// =================
// FONCTIONS SPÉCIALISÉES
// =================

/**
 * Log les erreurs frontend avec contexte React
 */
export function logFrontendError(error, context = {}) {
  return logError('Frontend Error', error, {
    ...context,
    errorType: ERROR_TYPES.FRONTEND_ERROR,
    severity: 'high',
    component: context.component || 'Unknown',
    action: context.action || 'Unknown'
  })
}

/**
 * Log les erreurs d'API avec détails de requête
 */
export function logApiError(message, error, requestDetails = {}) {
  return logError(message, error, {
    ...requestDetails,
    errorType: ERROR_TYPES.API_ERROR,
    severity: 'high',
    endpoint: requestDetails.endpoint,
    method: requestDetails.method,
    status: requestDetails.status,
    responseTime: requestDetails.responseTime
  })
}

/**
 * Log les erreurs de base de données
 */
export function logDatabaseError(operation, error, queryDetails = {}) {
  return logError(`Database Error: ${operation}`, error, {
    ...queryDetails,
    errorType: ERROR_TYPES.DATABASE_ERROR,
    severity: 'high',
    operation,
    table: queryDetails.table,
    query: queryDetails.query
  })
}

/**
 * Log les erreurs d'authentification
 */
export function logAuthError(action, error, userContext = {}) {
  return logError(`Auth Error: ${action}`, error, {
    ...userContext,
    errorType: ERROR_TYPES.AUTH_ERROR,
    severity: 'high',
    action,
    userId: userContext.userId,
    email: userContext.email
  })
}

/**
 * Log les erreurs d'upload
 */
export function logUploadError(fileName, error, uploadDetails = {}) {
  return logError(`Upload Error: ${fileName}`, error, {
    ...uploadDetails,
    errorType: ERROR_TYPES.UPLOAD_ERROR,
    severity: 'medium',
    fileName,
    fileSize: uploadDetails.fileSize,
    fileType: uploadDetails.fileType
  })
}

/**
 * Log les interactions utilisateur
 */
export function logUserInteraction(action, element, details = {}) {
  return logInfo(`User Interaction: ${action}`, {
    ...details,
    action,
    element,
    interactionType: 'user_interaction',
    timestamp: new Date().toISOString()
  })
}

/**
 * Log les événements de cycle de vie des composants
 */
export function logComponentLifecycle(component, event, details = {}) {
  return logDebug(`Component Lifecycle: ${component} - ${event}`, {
    ...details,
    component,
    event,
    lifecycleType: 'component_lifecycle'
  })
}

/**
 * Log les événements de composants
 */
export function logComponentEvent(component, event, details = {}) {
  return logDebug(`Component Event: ${component} - ${event}`, {
    ...details,
    component,
    event,
    eventType: 'component_event'
  })
}

/**
 * Log les appels d'API
 */
export function logApiCall(method, url, requestData, responseData) {
  return logInfo(`API Call: ${method} ${url}`, {
    method,
    url,
    requestData: sanitizeData(requestData),
    responseData: sanitizeData(responseData),
    callType: 'api_call',
    timestamp: new Date().toISOString()
  })
}

/**
 * Log les métriques de performance
 */
export function logPerformance(operation, duration, details = {}) {
  performanceMetrics[operation] = {
    duration,
    timestamp: new Date().toISOString(),
    ...details
  }
  
  return logInfo(`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...details,
    metricType: 'performance'
  })
}

/**
 * Log les changements d'état
 */
export function logStateChange(component, previousState, newState, action = '') {
  return logDebug(`State Change: ${component}${action ? ` - ${action}` : ''}`, {
    component,
    previousState: sanitizeData(previousState),
    newState: sanitizeData(newState),
    action,
    stateChangeType: 'state_change'
  })
}

// =================
// UTILITAIRES DE RÉCUPÉRATION
// =================

/**
 * Récupère tous les logs
 */
export function getAllLogs() {
  return [...logBuffer]
}

/**
 * Récupère les logs par niveau
 */
export function getLogsByLevel(level) {
  return logBuffer.filter(log => log.level === level)
}

/**
 * Récupère les logs d'erreur
 */
export function getErrorLogs() {
  return logBuffer.filter(log => 
    log.level === SEVERITY_LEVELS.ERROR || 
    log.level === SEVERITY_LEVELS.FATAL
  )
}

/**
 * Récupère les métriques de performance
 */
export function getPerformanceMetrics() {
  return { ...performanceMetrics }
}

/**
 * Exporte tous les logs au format JSON
 */
export function exportLogs() {
  return {
    logs: getAllLogs(),
    performance: getPerformanceMetrics(),
    session: getSessionInfo(),
    environment: getEnvironmentInfo(),
    exportTime: new Date().toISOString()
  }
}

/**
 * Vide le buffer de logs
 */
export function clearLogs() {
  logBuffer = []
  performanceMetrics = {}
  if (isClient) {
    try {
      localStorage.removeItem('coco_logs')
      sessionStorage.removeItem('coco_errors')
    } catch (e) {
      console.warn('Impossible de vider les logs persistés:', e)
    }
  }
}

/**
 * Envoie un rapport d'erreur complet
 */
export async function sendErrorReport(error, context = {}) {
  const report = {
    error: sanitizeData(error),
    context: sanitizeData(context),
    logs: getErrorLogs().slice(-10), // Dernières 10 erreurs
    performance: getPerformanceMetrics(),
    session: getSessionInfo(),
    environment: getEnvironmentInfo(),
    timestamp: new Date().toISOString()
  }
  
  try {
    const response = await fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    })
    
    if (response.ok) {
      logInfo('Error report sent successfully')
    } else {
      logWarning('Failed to send error report', { status: response.status })
    }
  } catch (e) {
    logError('Failed to send error report', e)
  }
}
