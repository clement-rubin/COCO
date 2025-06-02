/**
 * Gestionnaire d'erreurs centralisé avec récupération automatique et reporting
 */

import { useState, useCallback } from 'react'
import { logError, logWarning, logInfo } from './logger'

// Types d'erreurs
export const ERROR_TYPES = {
  VALIDATION: 'validation_error',
  AUTH: 'auth_error',
  NETWORK: 'network_error',
  CAPTCHA: 'captcha_error',
  SERVER: 'server_error',
  UPLOAD: 'upload_error',
  UNKNOWN: 'unknown_error'
}

// Stratégies de récupération
export const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  REDIRECT: 'redirect',
  MANUAL: 'manual',
  CAPTCHA: 'captcha',
  RESEND_EMAIL: 'resend_email'
}

// Hook pour gérer les erreurs dans les composants
export const useErrorHandler = () => {
  const [lastError, setLastError] = useState(null)
  const [lastAction, setLastAction] = useState(null)

  const handleError = useCallback((error, context = {}) => {
    const errorResult = processError(error, context)
    setLastError(errorResult)
    setLastAction(context.action || null)
    return errorResult
  }, [])

  const clearError = useCallback(() => {
    setLastError(null)
    setLastAction(null)
  }, [])

  const retryLastAction = useCallback((actionCallback) => {
    if (lastAction && actionCallback) {
      clearError()
      actionCallback()
    }
  }, [lastAction, clearError])

  return {
    lastError,
    handleError,
    clearError,
    retryLastAction
  }
}

// Traitement principal des erreurs
export const processError = (error, context = {}) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    originalError: error
  }

  // Déterminer le type d'erreur
  const errorType = determineErrorType(error)
  const userMessage = getUserMessage(error, errorType)
  const recoveryStrategy = getRecoveryStrategy(error, errorType)

  const processedError = {
    type: errorType,
    message: error.message || 'Une erreur inconnue est survenue',
    userMessage,
    recoveryStrategy,
    details: extractErrorDetails(error),
    stack: error.stack,
    context: errorInfo.context,
    timestamp: errorInfo.timestamp
  }

  // Logger l'erreur
  logError('Erreur traitée par errorHandler', error, {
    processedError,
    context
  })

  return {
    error: processedError,
    shouldShowToUser: true,
    shouldLog: true
  }
}

// Déterminer le type d'erreur
const determineErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN

  const message = error.message?.toLowerCase() || ''
  const code = error.code?.toLowerCase() || ''

  // Erreurs de captcha
  if (message.includes('captcha') || code.includes('captcha')) {
    return ERROR_TYPES.CAPTCHA
  }

  // Erreurs d'authentification
  if (code.includes('auth') || message.includes('invalid_credentials') || 
      message.includes('email not confirmed') || message.includes('weak_password')) {
    return ERROR_TYPES.AUTH
  }

  // Erreurs de validation
  if (message.includes('validation') || message.includes('required') || 
      message.includes('invalid format') || code.includes('invalid_input')) {
    return ERROR_TYPES.VALIDATION
  }

  // Erreurs réseau
  if (message.includes('network') || message.includes('fetch') || 
      code.includes('network_error') || error.name === 'NetworkError') {
    return ERROR_TYPES.NETWORK
  }

  // Erreurs d'upload
  if (message.includes('upload') || message.includes('file') || 
      message.includes('image') || code.includes('storage')) {
    return ERROR_TYPES.UPLOAD
  }

  // Erreurs serveur
  if (error.status >= 500 || code.includes('server_error')) {
    return ERROR_TYPES.SERVER
  }

  return ERROR_TYPES.UNKNOWN
}

// Messages utilisateur personnalisés
const getUserMessage = (error, errorType) => {
  switch (errorType) {
    case ERROR_TYPES.CAPTCHA:
      return 'Vérification de sécurité échouée. Veuillez compléter le captcha.'
    
    case ERROR_TYPES.AUTH:
      if (error.message?.includes('invalid_credentials')) {
        return 'Email ou mot de passe incorrect.'
      }
      if (error.message?.includes('email not confirmed')) {
        return 'Veuillez confirmer votre email avant de vous connecter.'
      }
      if (error.message?.includes('weak_password')) {
        return 'Le mot de passe doit contenir au moins 6 caractères.'
      }
      return 'Erreur d\'authentification. Vérifiez vos identifiants.'
    
    case ERROR_TYPES.VALIDATION:
      return 'Veuillez vérifier les informations saisies.'
    
    case ERROR_TYPES.NETWORK:
      return 'Problème de connexion. Vérifiez votre réseau et réessayez.'
    
    case ERROR_TYPES.UPLOAD:
      return 'Erreur lors de l\'envoi du fichier. Vérifiez le format et la taille.'
    
    case ERROR_TYPES.SERVER:
      return 'Erreur du serveur. Veuillez réessayer plus tard.'
    
    default:
      return error.message || 'Une erreur inattendue est survenue.'
  }
}

// Stratégies de récupération
const getRecoveryStrategy = (error, errorType) => {
  switch (errorType) {
    case ERROR_TYPES.CAPTCHA:
      return RECOVERY_STRATEGIES.CAPTCHA
    
    case ERROR_TYPES.VALIDATION:
      return RECOVERY_STRATEGIES.MANUAL
    
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.SERVER:
      return RECOVERY_STRATEGIES.RETRY
    
    case ERROR_TYPES.AUTH:
      if (error.message?.includes('email not confirmed')) {
        return RECOVERY_STRATEGIES.REDIRECT
      }
      return RECOVERY_STRATEGIES.MANUAL
    
    default:
      return RECOVERY_STRATEGIES.RETRY
  }
}

// Extraire les détails de l'erreur
const extractErrorDetails = (error) => {
  const details = {}

  if (error.code) details.code = error.code
  if (error.status) details.status = error.status
  if (error.statusText) details.statusText = error.statusText
  if (error.details) details.details = error.details

  return details
}

// Gestionnaire d'erreurs d'authentification spécialisé
export const handleAuthError = (error) => {
  const context = { component: 'Auth', action: 'authentication' }
  
  // Erreurs Supabase spécifiques
  if (error.message === 'Invalid login credentials') {
    return {
      userError: {
        message: 'Email ou mot de passe incorrect',
        type: ERROR_TYPES.AUTH,
        recoveryStrategy: RECOVERY_STRATEGIES.MANUAL
      }
    }
  }

  if (error.message === 'Email not confirmed') {
    return {
      userError: {
        message: 'Veuillez confirmer votre email avant de vous connecter',
        type: ERROR_TYPES.AUTH,
        recoveryStrategy: RECOVERY_STRATEGIES.RESEND_EMAIL,
        redirectUrl: '/auth/confirm'
      }
    }
  }

  if (error.message.includes('Password should be at least 6 characters')) {
    return {
      userError: {
        message: 'Le mot de passe doit contenir au moins 6 caractères',
        type: ERROR_TYPES.VALIDATION,
        recoveryStrategy: RECOVERY_STRATEGIES.MANUAL
      }
    }
  }

  // Erreur générique
  return processError(error, context)
}

// Wrapper pour les fonctions avec gestion d'erreur
export const withErrorHandling = (fn, context = {}) => {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (error) {
      const errorResult = processError(error, context)
      throw errorResult.error
    }
  }
}

// Gestionnaire d'erreur global pour les composants
export const handleError = (error, context = {}) => {
  return processError(error, context)
}

// Export des utilitaires
export default {
  handleError,
  handleAuthError,
  withErrorHandling,
  ERROR_TYPES,
  RECOVERY_STRATEGIES,
  useErrorHandler
};
