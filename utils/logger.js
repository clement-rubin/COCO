/**
 * Système de journalisation centralisé
 */

// Colors for console logging
const COLORS = {
  debug: '#6b7280',
  info: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  component: '#8b5cf6', // violet pour les événements de composants
  user: '#ec4899',      // rose pour les interactions utilisateur
  api: '#0ea5e9',       // bleu ciel pour les appels API
  performance: '#f59e0b' // orange pour les métriques de performance
};

// Store logs in memory for the DevLogs component
let logHistory = [];
const MAX_LOGS = 500;

// Add log entry to global history
const addLogEntry = (level, message, data = {}) => {
  const timestamp = new Date().toLocaleTimeString();
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    level,
    timestamp,
    message,
    data: JSON.stringify(data, null, 2)
  };
  
  // Add to history
  logHistory.unshift(entry);
  
  // Limit log size
  if (logHistory.length > MAX_LOGS) {
    logHistory.pop();
  }
  
  // Also log to console with colors
  console.log(
    `%c[${timestamp}] ${level.toUpperCase()}:%c ${message}`,
    `color: ${COLORS[level]}; font-weight: bold;`,
    'color: inherit;',
    data
  );
  
  return entry.id;
};

// Debug log function - lowest severity
export const logDebug = (message, data) => addLogEntry('debug', message, data);

// Info log function - normal operations
export const logInfo = (message, data) => addLogEntry('info', message, data);

// Success log function - successful operations
export const logSuccess = (message, data) => addLogEntry('success', message, data);

// Warning log function - potential issues
export const logWarning = (message, data) => addLogEntry('warning', message, data);

// Error log function - actual failures
export const logError = (message, error, additionalData = {}) => {
  // Extract error details if it's an Error object
  const errorDetails = error instanceof Error ? {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...error // Copy any additional properties
  } : error;
  
  // Combine error details with additional data
  const data = {
    ...errorDetails,
    ...additionalData
  };
  
  return addLogEntry('error', message, data);
};

// Clear logs
export const clearLogs = () => {
  logDebug('Logs cleared');
  logHistory = [];
};

// Get all logs
export const getLogs = () => [...logHistory];

// Component event logging
export const logComponentEvent = (componentName, eventType, data = {}) => {
  return addLogEntry('component', `${componentName}: ${eventType}`, data);
};

// User interaction logging
export const logUserInteraction = (action, element, data = {}) => {
  return addLogEntry('user', `User ${action} on ${element}`, data);
};

// API call logging
export const logApiCall = (endpoint, method, data = {}) => {
  return addLogEntry('api', `${method} ${endpoint}`, data);
};

// Performance metrics logging
export const logPerformance = (operation, durationMs, data = {}) => {
  return addLogEntry('performance', `${operation} took ${durationMs}ms`, {
    duration: durationMs,
    ...data
  });
};

// Frontend error logging
export const logFrontendError = (errorType, errorDetails, data = {}) => {
  return addLogEntry('error', `Frontend Error: ${errorType}`, {
    details: errorDetails,
    ...data
  });
};

// Export functions
export default {
  debug: logDebug,
  info: logInfo,
  success: logSuccess,
  warning: logWarning,
  error: logError,
  component: logComponentEvent,
  user: logUserInteraction,
  api: logApiCall,
  performance: logPerformance,
  frontendError: logFrontendError,
  clear: clearLogs,
  getLogs
};
