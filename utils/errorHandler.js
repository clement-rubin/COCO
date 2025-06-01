/**
 * Utility for standardized error handling throughout the application
 */

import { logError, logFrontendError } from './logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.id = `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      id: this.id,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Common error handler for API endpoints
 */
export function handleApiError(error, res) {
  // Log l'erreur avec le logger centralisé
  logError('Erreur API interceptée', error, res?.req);
  
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    message: error.message || 'Une erreur est survenue',
    id: error.id || `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    timestamp: error.timestamp || new Date().toISOString()
  };
  
  // Include additional details in development mode or if specifically allowed
  if (process.env.NODE_ENV === 'development' || process.env.ERROR_LOG_DETAIL === 'full') {
    errorResponse.details = error.details || null;
    errorResponse.stack = error.stack?.split('\n') || null;
  }
  
  return res.status(statusCode).json(errorResponse);
}

/**
 * Create an error with standardized format
 */
export function createError(message, statusCode = 500, details = null) {
  const error = new AppError(message, statusCode, details);
  
  // Log la création de l'erreur
  logError('Nouvelle erreur créée', error);
  
  return error;
}

/**
 * Handler spécialisé pour les erreurs frontend
 */
export function handleFrontendError(error, context = {}) {
  return logFrontendError(error, context);
}
