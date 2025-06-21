/**
 * Système de journalisation centralisé
 */

// Colors for console logging
const COLORS = {
  debug: '#6b7280',
  info: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
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

// Export functions
export default {
  debug: logDebug,
  info: logInfo,
  success: logSuccess,
  warning: logWarning,
  error: logError,
  clear: clearLogs,
  getLogs
};
