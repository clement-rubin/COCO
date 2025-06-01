/**
 * Utilitaire de journalisation pour les erreurs et informations
 * Version améliorée avec plus de détails en production
 */

// Configuration des niveaux de log
export const LOG_LEVELS = {
  ERROR: 0,
  WARNING: 1,
  INFO: 2,
  DEBUG: 3
};

// Niveau de log actuel basé sur l'environnement
export const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'development' 
  ? LOG_LEVELS.DEBUG 
  : (process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LOG_LEVELS.INFO);

// Journalisation d'erreur détaillée
export function logError(message, error, req = null) {
  const timestamp = new Date().toISOString();
  const errorId = `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Créer un objet de journalisation sécurisé pour la sérialisation JSON
  const logObject = {
    id: errorId,
    timestamp,
    message,
    type: 'ERROR',
    error: error ? {
      name: error.name || 'Inconnu',
      message: error.message || 'Pas de message',
      code: error.code,
      statusCode: error.statusCode,
    } : null
  };

  // Ajouter des informations sur la requête si disponibles
  if (req) {
    logObject.request = {
      url: req.url,
      method: req.method,
      query: req.query,
      headers: {
        referer: req.headers?.referer,
        'user-agent': req.headers?.['user-agent']
      }
    };
  }

  // Ajouter la stack trace en développement ou si la journalisation d'erreur complète est activée
  if (process.env.NODE_ENV === 'development' || process.env.ERROR_LOG_DETAIL === 'full') {
    if (error?.stack) {
      logObject.error.stack = error.stack;
    }
    if (error?.details) {
      logObject.error.details = error.details;
    }
  }

  // Journaliser dans la console avec un formatage optionnel
  console.error(`[${timestamp}] ❌ ERREUR: ${message}`);
  console.error(JSON.stringify(logObject, null, 2));

  return logObject;
}

/**
 * Journaliser les messages d'information
 */
export function logInfo(message, details = null) {
  if (CURRENT_LOG_LEVEL < LOG_LEVELS.INFO) return;
  
  console.log(`[${new Date().toISOString()}] ℹ️ INFO: ${message}`);
  
  if (details && CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
    console.log(details);
  }
}

/**
 * Journaliser les messages d'avertissement
 */
export function logWarning(message, details = null) {
  if (CURRENT_LOG_LEVEL < LOG_LEVELS.WARNING) return;
  
  console.warn(`[${new Date().toISOString()}] ⚠️ AVERTISSEMENT: ${message}`);
  
  if (details) {
    console.warn(details);
  }
}

/**
 * Journaliser les messages de débogage (niveau le plus verbeux)
 */
export function logDebug(message, details = null) {
  if (CURRENT_LOG_LEVEL < LOG_LEVELS.DEBUG) return;
  
  console.log(`[${new Date().toISOString()}] 🔍 DEBUG: ${message}`);
  
  if (details) {
    console.log(details);
  }
}

/**
 * Logger spécialisé pour les composants React
 */
export function logComponentEvent(componentName, eventType, details = null) {
  if (CURRENT_LOG_LEVEL < LOG_LEVELS.DEBUG) return;
  
  console.log(`[${new Date().toISOString()}] 🔧 COMPONENT [${componentName}] ${eventType}`);
  
  if (details) {
    console.log(details);
  }
}

/**
 * Logger pour les interactions utilisateur
 */
export function logUserInteraction(action, element, details = null) {
  if (CURRENT_LOG_LEVEL < LOG_LEVELS.DEBUG) return;
  
  console.log(`[${new Date().toISOString()}] 👤 USER: ${action} sur ${element}`);
  
  if (details) {
    console.log(details);
  }
}

/**
 * Logger pour les erreurs frontend avec contexte complet
 */
export function logFrontendError(error, context = {}) {
  const errorId = `fe-err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  const logObject = {
    id: errorId,
    timestamp: new Date().toISOString(),
    type: 'FRONTEND_ERROR',
    error: {
      name: error?.name || 'UnknownError',
      message: error?.message || 'Pas de message',
      stack: error?.stack,
      fileName: error?.fileName,
      lineNumber: error?.lineNumber,
      columnNumber: error?.columnNumber
    },
    context: {
      url: typeof window !== 'undefined' ? window.location.href : 'N/A',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      timestamp: new Date().toISOString(),
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight
      } : null,
      ...context
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      netlifyCommit: process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF || 'Non disponible'
    }
  };

  console.error(`🚨 ERREUR FRONTEND [${errorId}]`);
  console.error('Message:', error?.message);
  console.error('Stack:', error?.stack);
  console.error('Contexte complet:', logObject);
  
  return logObject;
}
