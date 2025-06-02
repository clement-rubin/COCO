/**
 * Système de logging centralisé pour l'application COCO
 * Gère tous les types de logs : erreurs, interactions utilisateur, événements composants, etc.
 */

// Niveaux de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Configuration du logger
const CONFIG = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
  enableConsole: true,
  enableStorage: typeof window !== 'undefined',
  maxStoredLogs: 100
};

// Générateur d'ID unique pour les logs
function generateLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// Fonction de base pour créer un log
function createLog(level, message, error = null, context = {}) {
  const timestamp = new Date().toISOString();
  const id = generateLogId();
  
  const logEntry = {
    id,
    timestamp,
    level,
    message,
    context: {
      ...context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server',
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  };

  // Ajouter les détails d'erreur si fournis
  if (error) {
    logEntry.error = {
      name: error.name || 'Error',
      message: error.message || 'No message',
      stack: error.stack || 'No stack trace',
      code: error.code,
      cause: error.cause
    };
  }

  return logEntry;
}

// Fonction pour afficher les logs dans la console
function outputToConsole(logEntry) {
  if (!CONFIG.enableConsole) return;

  const { level, timestamp, message, error, context } = logEntry;
  const timeStr = new Date(timestamp).toLocaleTimeString();
  
  const levelEmojis = {
    [LOG_LEVELS.ERROR]: '❌',
    [LOG_LEVELS.WARN]: '⚠️',
    [LOG_LEVELS.INFO]: 'ℹ️',
    [LOG_LEVELS.DEBUG]: '🔍'
  };

  const emoji = levelEmojis[level] || 'ℹ️';
  const prefix = `[${timeStr}] ${emoji}`;

  if (level === LOG_LEVELS.ERROR) {
    console.error(`${prefix} ${message}`, error || '', context);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(`${prefix} ${message}`, context);
  } else {
    console.log(`${prefix} ${message}`, context);
  }
}

// Fonction pour stocker les logs localement
function storeLog(logEntry) {
  if (!CONFIG.enableStorage) return;

  try {
    const stored = JSON.parse(localStorage.getItem('coco_logs') || '[]');
    stored.push(logEntry);
    
    // Limiter le nombre de logs stockés
    if (stored.length > CONFIG.maxStoredLogs) {
      stored.splice(0, stored.length - CONFIG.maxStoredLogs);
    }
    
    localStorage.setItem('coco_logs', JSON.stringify(stored));
  } catch (err) {
    console.error('Erreur lors du stockage des logs:', err);
  }
}

// Fonction principale de logging
function log(level, message, error = null, context = {}) {
  if (level > CONFIG.level) return null;

  const logEntry = createLog(level, message, error, context);
  
  outputToConsole(logEntry);
  storeLog(logEntry);
  
  return logEntry;
}

// Fonctions publiques pour différents types de logs
export function logError(message, error = null, context = {}) {
  return log(LOG_LEVELS.ERROR, message, error, { ...context, type: 'ERROR' });
}

export function logWarning(message, context = {}) {
  return log(LOG_LEVELS.WARN, message, null, { ...context, type: 'WARNING' });
}

export function logInfo(message, context = {}) {
  return log(LOG_LEVELS.INFO, message, null, { ...context, type: 'INFO' });
}

export function logDebug(message, context = {}) {
  return log(LOG_LEVELS.DEBUG, message, null, { ...context, type: 'DEBUG' });
}

// Logs spécifiques pour les erreurs frontend
export function logFrontendError(error, context = {}) {
  return logError('Erreur frontend détectée', error, {
    ...context,
    category: 'FRONTEND_ERROR',
    timestamp: new Date().toISOString()
  });
}

// Logs pour les événements de composants
export function logComponentEvent(componentName, eventType, context = {}) {
  return logDebug(`${componentName} - ${eventType}`, {
    ...context,
    category: 'COMPONENT_EVENT',
    component: componentName,
    event: eventType
  });
}

// Logs pour les interactions utilisateur
export function logUserInteraction(action, element, details = null) {
  const timestamp = new Date().toISOString()
  const context = {
    action,
    element,
    timestamp,
    url: typeof window !== 'undefined' ? window.location.href : 'Server',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    ...details
  }
  
  return log(LOG_LEVELS.INFO, `Interaction utilisateur: ${action}`, null, { 
    ...context, 
    type: 'USER_INTERACTION',
    category: 'USER_INTERACTION'
  })
}

// Fonction pour récupérer les logs stockés
export function getStoredLogs() {
  if (!CONFIG.enableStorage) return [];
  
  try {
    return JSON.parse(localStorage.getItem('coco_logs') || '[]');
  } catch (err) {
    console.error('Erreur lors de la récupération des logs:', err);
    return [];
  }
}

// Fonction pour vider les logs stockés
export function clearStoredLogs() {
  if (!CONFIG.enableStorage) return;
  
  try {
    localStorage.removeItem('coco_logs');
    logInfo('Logs locaux vidés');
  } catch (err) {
    console.error('Erreur lors du vidage des logs:', err);
  }
}

// Fonction pour exporter les logs
export function exportLogs() {
  const logs = getStoredLogs();
  const dataStr = JSON.stringify(logs, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `coco-logs-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  logInfo('Logs exportés', { filename: exportFileDefaultName, logsCount: logs.length });
}

// Configuration du niveau de log
export function setLogLevel(level) {
  CONFIG.level = level;
  logInfo('Niveau de log modifié', { newLevel: level });
}
