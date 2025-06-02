/**
 * Système de logging centralisé pour COCO
 * Supporte différents niveaux de log et environnements
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
};

const LOG_COLORS = {
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Green
  WARNING: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m',    // Red
  RESET: '\x1b[0m'
};

// Configuration du logger
const config = {
  level: process.env.LOG_LEVEL === 'debug' ? LOG_LEVELS.DEBUG : 
         process.env.NODE_ENV === 'development' ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO,
  enableConsole: true,
  enableStorage: typeof window !== 'undefined',
  maxStoredLogs: 100,
  includeTimestamp: true,
  includeStackTrace: true
};

// Storage pour les logs (côté client)
let logStorage = [];

// Fonction utilitaire pour générer un ID unique
const generateLogId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

// Fonction utilitaire pour formater les timestamps
const formatTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

// Fonction utilitaire pour détecter l'environnement
const getEnvironmentInfo = () => {
  const isClient = typeof window !== 'undefined';
  const isServer = typeof process !== 'undefined';
  
  return {
    isClient,
    isServer,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    platform: isClient ? 'browser' : 'server',
    userAgent: isClient ? navigator.userAgent.substring(0, 100) : 'server',
    url: isClient ? window.location.href : process.env.VERCEL_URL || 'localhost'
  };
};

// Fonction principale de logging
const log = (level, message, data = null, options = {}) => {
  const logLevel = LOG_LEVELS[level];
  
  // Vérifier si ce niveau de log doit être affiché
  if (logLevel < config.level) {
    return null;
  }
  
  const timestamp = formatTimestamp();
  const logId = generateLogId();
  const env = getEnvironmentInfo();
  
  // Créer l'objet de log structuré
  const logEntry = {
    id: logId,
    timestamp,
    level,
    message,
    data,
    environment: env,
    ...options
  };
  
  // Log vers la console si activé
  if (config.enableConsole) {
    const color = LOG_COLORS[level] || '';
    const reset = LOG_COLORS.RESET;
    const prefix = `${color}[${timestamp}] ${level}${reset}`;
    
    console.log(`${prefix}: ${message}`);
    
    if (data) {
      if (level === 'ERROR' && data instanceof Error) {
        console.error('Error Details:', {
          name: data.name,
          message: data.message,
          stack: data.stack,
          ...data
        });
      } else {
        console.log('Data:', data);
      }
    }
  }
  
  // Stocker le log si activé (côté client)
  if (config.enableStorage && env.isClient) {
    logStorage.push(logEntry);
    
    // Limiter le nombre de logs stockés
    if (logStorage.length > config.maxStoredLogs) {
      logStorage = logStorage.slice(-config.maxStoredLogs);
    }
    
    // Sauvegarder dans localStorage pour les erreurs critiques
    if (level === 'ERROR') {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('coco_error_logs') || '[]');
        existingLogs.push(logEntry);
        
        // Garder seulement les 20 dernières erreurs
        const recentLogs = existingLogs.slice(-20);
        localStorage.setItem('coco_error_logs', JSON.stringify(recentLogs));
      } catch (e) {
        console.warn('Impossible de sauvegarder les logs dans localStorage:', e);
      }
    }
  }
  
  return logEntry;
};

// Fonctions spécialisées pour chaque niveau
export const logDebug = (message, data = null) => {
  return log('DEBUG', message, data);
};

export const logInfo = (message, data = null) => {
  return log('INFO', message, data);
};

export const logWarning = (message, data = null) => {
  return log('WARNING', message, data);
};

export const logError = (message, error = null, context = null) => {
  const errorData = {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: config.includeStackTrace ? error.stack : null,
      cause: error.cause
    } : error,
    context
  };
  
  return log('ERROR', message, errorData, { 
    critical: true,
    needsReporting: true 
  });
};

// Fonctions spécialisées pour différents types d'événements
export const logUserInteraction = (action, element, data = null) => {
  return logInfo(`User: ${action}`, {
    type: 'user_interaction',
    action,
    element,
    timestamp: Date.now(),
    ...data
  });
};

export const logAPICall = (method, endpoint, status, duration = null, data = null) => {
  const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARNING' : 'INFO';
  return log(level, `API: ${method} ${endpoint} - ${status}`, {
    type: 'api_call',
    method,
    endpoint,
    status,
    duration,
    ...data
  });
};

export const logComponentEvent = (component, event, data = null) => {
  return logDebug(`Component: ${component} - ${event}`, {
    type: 'component_event',
    component,
    event,
    ...data
  });
};

export const logPerformance = (metric, value, context = null) => {
  return logInfo(`Performance: ${metric}`, {
    type: 'performance',
    metric,
    value,
    unit: typeof value === 'number' ? 'ms' : 'unknown',
    context
  });
};

export const logFrontendError = (error, context = null) => {
  const errorId = generateLogId();
  
  return logError('Frontend Error', error, {
    errorId,
    type: 'frontend_error',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: Date.now(),
    ...context
  });
};

// Fonctions utilitaires pour récupérer les logs
export const getStoredLogs = (level = null) => {
  if (level) {
    return logStorage.filter(log => log.level === level);
  }
  return [...logStorage];
};

export const getErrorLogs = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem('coco_error_logs') || '[]');
  } catch (e) {
    console.warn('Erreur lors de la récupération des logs d\'erreur:', e);
    return [];
  }
};

export const clearStoredLogs = () => {
  logStorage = [];
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('coco_error_logs');
    } catch (e) {
      console.warn('Erreur lors de la suppression des logs:', e);
    }
  }
};

// Fonction pour exporter les logs (pour debugging)
export const exportLogs = () => {
  const allLogs = {
    memoryLogs: logStorage,
    errorLogs: getErrorLogs(),
    environment: getEnvironmentInfo(),
    config,
    exportedAt: new Date().toISOString()
  };
  
  if (typeof window !== 'undefined') {
    const blob = new Blob([JSON.stringify(allLogs, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coco-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  return allLogs;
};

// Configuration du logger pour différents environnements
export const configureLogger = (newConfig) => {
  Object.assign(config, newConfig);
  logInfo('Logger configuration updated', newConfig);
};

// Hook React pour utiliser le logger
export const useLogger = () => {
  return {
    debug: logDebug,
    info: logInfo,
    warning: logWarning,
    error: logError,
    userInteraction: logUserInteraction,
    apiCall: logAPICall,
    componentEvent: logComponentEvent,
    performance: logPerformance,
    frontendError: logFrontendError,
    getStoredLogs,
    clearStoredLogs,
    exportLogs
  };
};

// Export par défaut
export default {
  debug: logDebug,
  info: logInfo,
  warning: logWarning,
  error: logError,
  userInteraction: logUserInteraction,
  apiCall: logAPICall,
  componentEvent: logComponentEvent,
  performance: logPerformance,
  frontendError: logFrontendError,
  getStoredLogs,
  getErrorLogs,
  clearStoredLogs,
  exportLogs,
  configureLogger
};
