/**
 * Gestionnaire d'erreurs centralisé avec récupération automatique et reporting
 */

import { logError, logWarning, logInfo } from './logger';

// Types d'erreurs courantes
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHZ_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Messages d'erreur utilisateur conviviaux
const USER_FRIENDLY_MESSAGES = {
  [ERROR_TYPES.NETWORK]: "Problème de connexion. Vérifiez votre connexion internet.",
  [ERROR_TYPES.VALIDATION]: "Certaines informations saisies ne sont pas valides.",
  [ERROR_TYPES.AUTHENTICATION]: "Vous devez vous connecter pour accéder à cette fonctionnalité.",
  [ERROR_TYPES.AUTHORIZATION]: "Vous n'avez pas les permissions nécessaires.",
  [ERROR_TYPES.NOT_FOUND]: "La ressource demandée n'a pas été trouvée.",
  [ERROR_TYPES.SERVER]: "Erreur du serveur. Nos équipes ont été notifiées.",
  [ERROR_TYPES.CLIENT]: "Une erreur s'est produite dans l'application.",
  [ERROR_TYPES.TIMEOUT]: "L'opération a pris trop de temps. Veuillez réessayer.",
  [ERROR_TYPES.UNKNOWN]: "Une erreur inattendue s'est produite."
};

// Stratégies de récupération
const RECOVERY_STRATEGIES = {
  [ERROR_TYPES.NETWORK]: 'retry',
  [ERROR_TYPES.VALIDATION]: 'user_action',
  [ERROR_TYPES.AUTHENTICATION]: 'redirect_login',
  [ERROR_TYPES.AUTHORIZATION]: 'redirect_home',
  [ERROR_TYPES.NOT_FOUND]: 'redirect_home',
  [ERROR_TYPES.SERVER]: 'retry',
  [ERROR_TYPES.CLIENT]: 'reload',
  [ERROR_TYPES.TIMEOUT]: 'retry',
  [ERROR_TYPES.UNKNOWN]: 'user_action'
};

// Classe d'erreur enrichie
export class EnhancedError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, originalError = null, context = null) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.userMessage = USER_FRIENDLY_MESSAGES[type] || message;
    this.recoveryStrategy = RECOVERY_STRATEGIES[type] || 'user_action';
  }
}

// Fonction pour détecter le type d'erreur
export const detectErrorType = (error) => {
  if (!error) return ERROR_TYPES.UNKNOWN;
  
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.response?.status;
  
  // Erreurs réseau
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('connection') || error.code === 'NETWORK_ERROR') {
    return ERROR_TYPES.NETWORK;
  }
  
  // Erreurs de timeout
  if (message.includes('timeout') || error.code === 'TIMEOUT') {
    return ERROR_TYPES.TIMEOUT;
  }
  
  // Erreurs HTTP par status code
  if (status) {
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status >= 400 && status < 500) return ERROR_TYPES.CLIENT;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }
  
  // Erreurs de validation
  if (message.includes('validation') || message.includes('invalid') || 
      message.includes('required') || error.name === 'ValidationError') {
    return ERROR_TYPES.VALIDATION;
  }
  
  return ERROR_TYPES.UNKNOWN;
};

// Gestionnaire principal d'erreurs
export const handleError = (error, context = null, options = {}) => {
  const {
    silent = false,
    showToUser = true,
    allowRetry = true,
    maxRetries = 3
  } = options;
  
  // Créer une erreur enrichie si nécessaire
  let enhancedError;
  if (error instanceof EnhancedError) {
    enhancedError = error;
  } else {
    const errorType = detectErrorType(error);
    enhancedError = new EnhancedError(
      error.message || 'Erreur inconnue',
      errorType,
      error,
      context
    );
  }
  
  // Logger l'erreur
  if (!silent) {
    logError(`[${enhancedError.type}] ${enhancedError.message}`, enhancedError.originalError, {
      errorId: enhancedError.id,
      type: enhancedError.type,
      userMessage: enhancedError.userMessage,
      context: enhancedError.context,
      recoveryStrategy: enhancedError.recoveryStrategy
    });
  }
  
  // Déterminer l'action de récupération
  const recovery = createRecoveryAction(enhancedError, { allowRetry, maxRetries });
  
  return {
    error: enhancedError,
    recovery,
    shouldShowToUser: showToUser,
    userMessage: enhancedError.userMessage
  };
};

// Créer une action de récupération
const createRecoveryAction = (error, options = {}) => {
  const { allowRetry = true } = options
  const baseRecovery = {
    actions: []
  }
  
  switch (error.recoveryStrategy) {
    case 'retry':
      if (allowRetry) {
        baseRecovery.actions.push({
          label: 'Réessayer',
          action: 'retry',
          primary: true
        });
      }
      baseRecovery.actions.push({
        label: 'Fermer',
        action: 'dismiss',
        primary: false
      });
      break;
      
    case 'redirect_login':
      baseRecovery.actions.push({
        label: 'Se connecter',
        action: 'redirect',
        url: '/login',
        primary: true
      });
      baseRecovery.actions.push({
        label: 'Retour',
        action: 'dismiss',
        primary: false
      });
      break;
      
    case 'redirect_home':
      baseRecovery.actions.push({
        label: 'Retour à l\'accueil',
        action: 'redirect',
        url: '/',
        primary: true
      });
      baseRecovery.actions.push({
        label: 'Fermer',
        action: 'dismiss',
        primary: false
      });
      break;
      
    case 'reload':
      baseRecovery.actions.push({
        label: 'Recharger la page',
        action: 'reload',
        primary: true
      });
      baseRecovery.actions.push({
        label: 'Fermer',
        action: 'dismiss',
        primary: false
      });
      break;

    case 'auth_required':
      baseRecovery.actions.push({
        label: 'Se connecter',
        action: 'redirect',
        url: '/login',
        primary: true
      });
      baseRecovery.actions.push({
        label: 'Créer un compte',
        action: 'redirect',
        url: '/signup',
        primary: false
      });
      break;

    case 'invalid_credentials':
      baseRecovery.actions.push({
        label: 'Réessayer',
        action: 'retry',
        primary: true
      });
      baseRecovery.actions.push({
        label: 'Mot de passe oublié',
        action: 'redirect',
        url: '/forgot-password',
        primary: false
      });
      break;
      
    default:
      baseRecovery.actions.push({
        label: 'Fermer',
        action: 'dismiss',
        primary: true
      });
  }

  return baseRecovery
};

// Gestionnaire d'erreurs pour les requêtes API
export const handleApiError = async (response, context = null) => {
  let errorMessage = 'Erreur de communication avec le serveur';
  let errorData = null;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } else {
      errorMessage = `Erreur ${response.status}: ${response.statusText}`;
    }
  } catch (parseError) {
    logWarning('Impossible de parser la réponse d\'erreur', parseError);
  }
  
  const apiError = new Error(errorMessage);
  apiError.status = response.status;
  apiError.response = { status: response.status, data: errorData };
  
  return handleError(apiError, {
    type: 'api_error',
    url: response.url,
    status: response.status,
    ...context
  });
};

// Wrapper pour les fonctions async avec gestion d'erreurs
export const withErrorHandling = (asyncFn, context = null, options = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const errorResult = handleError(error, context, options);
      
      // Re-throw l'erreur enrichie pour que l'appelant puisse la gérer
      throw errorResult.error;
    }
  };
};

// Hook React pour la gestion d'erreurs dans les composants
export const useErrorHandler = () => {
  const [lastError, setLastError] = useState(null);
  
  const handleComponentError = useCallback((error, context = null, options = {}) => {
    const errorResult = handleError(error, {
      component: 'unknown',
      ...context
    }, options);
    
    setLastError(errorResult);
    return errorResult;
  }, []);
  
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);
  
  const retryLastAction = useCallback((retryFn) => {
    if (lastError && retryFn) {
      clearError();
      return retryFn();
    }
  }, [lastError, clearError]);
  
  return {
    lastError,
    handleError: handleComponentError,
    clearError,
    retryLastAction
  };
};

// Gestionnaire global pour les erreurs non capturées
export const setupGlobalErrorHandling = () => {
  if (typeof window === 'undefined') return;
  
  // Erreurs JavaScript non capturées
  window.addEventListener('error', (event) => {
    handleError(event.error, {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }, { silent: false });
  });
  
  // Promesses rejetées non gérées
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, {
      type: 'unhandled_promise_rejection'
    }, { silent: false });
  });
  
  logInfo('Gestionnaire d\'erreurs global configuré');
};

// Export des utilitaires
export default {
  handleError,
  handleApiError,
  withErrorHandling,
  detectErrorType,
  EnhancedError,
  ERROR_TYPES,
  setupGlobalErrorHandling
};
