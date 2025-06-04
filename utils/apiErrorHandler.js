/**
 * Centralized API Error Handler
 * Provides utilities for consistent error handling in API routes
 */

import { logError, logWarning, logInfo } from './logger';
import { createUserFriendlyError } from './errorHandler';

/**
 * Creates a standardized API error response
 * @param {Error} error - The original error
 * @param {Object} options - Additional options
 * @param {string} options.operation - The API operation that failed
 * @param {string} options.reference - Request reference ID
 * @param {Object} options.context - Additional context about the error
 * @param {boolean} options.includeDetails - Whether to include detailed error info
 * @returns {Object} Standardized error response object
 */
export function createApiErrorResponse(error, options = {}) {
  const { 
    operation = 'api_operation', 
    reference = `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    context = {},
    includeDetails = process.env.NODE_ENV === 'development'
  } = options;
  
  // Create a user-friendly error with suggestions
  const friendlyError = createUserFriendlyError(error, {
    ...context,
    source: 'api',
    operation
  });
  
  // Log the error with context
  logError(`API Error in ${operation}`, error, {
    reference,
    friendlyError,
    context,
    errorDetails: {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      status: error?.status
    }
  });
  
  // Create standardized response
  const errorResponse = {
    error: friendlyError.message,
    message: error?.message || 'Une erreur est survenue',
    code: error?.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    reference, // Reference ID for tracking
    suggestions: friendlyError.suggestions,
    success: false
  };
  
  // Include technical details only in development
  if (includeDetails) {
    errorResponse.details = {
      stack: error?.stack,
      originalMessage: error?.message,
      operation,
      context
    };
  }
  
  return errorResponse;
}

/**
 * Safely sends an API response and handles any errors in the response process
 * @param {Object} res - Express/Next.js response object
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 * @param {string} reference - Request reference ID for logging
 * @returns {boolean} Whether the response was sent successfully
 */
export function safeApiResponse(res, statusCode, data, reference) {
  try {
    // Prevent sending response if headers already sent
    if (res.writableEnded) {
      logWarning('Attempted to send response after headers sent', {
        reference,
        statusCode,
        dataType: typeof data
      });
      return false;
    }
    
    // Send the response
    res.status(statusCode).json(data);
    return true;
  } catch (responseError) {
    logError('Error sending API response', responseError, {
      reference,
      statusCode,
      dataType: typeof data,
      error: responseError?.message,
      stackTrace: responseError?.stack
    });
    
    // Last attempt to send an error if headers not sent
    try {
      if (!res.writableEnded) {
        res.status(500).json({
          error: 'Error sending API response',
          message: 'The server encountered an error while sending response',
          reference,
          timestamp: new Date().toISOString()
        });
      }
    } catch (finalError) {
      // Cannot do anything more at this point
      logError('Fatal error sending API response', finalError);
    }
    
    return false;
  }
}

/**
 * Wraps an API handler function with standardized error handling
 * @param {Function} handler - Original API handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    const requestReference = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const startTime = Date.now();
    
    try {
      logInfo(`API Request: ${req.method} ${req.url}`, {
        reference: requestReference,
        method: req.method,
        path: req.url,
        query: req.query,
        hasBody: !!req.body
      });
      
      // Call the original handler
      await handler(req, res, requestReference);
      
    } catch (error) {
      const errorResponse = createApiErrorResponse(error, {
        operation: `${req.method}_${req.url}`,
        reference: requestReference,
        context: {
          method: req.method,
          path: req.url,
          query: req.query,
          bodyKeys: req.body ? Object.keys(req.body) : []
        }
      });
      
      // Send error response
      safeApiResponse(res, error.status || 500, errorResponse, requestReference);
      
    } finally {
      const duration = Date.now() - startTime;
      logInfo(`API Request completed: ${req.method} ${req.url}`, {
        reference: requestReference,
        duration: `${duration}ms`,
        statusSent: res.statusCode
      });
    }
  };
}
