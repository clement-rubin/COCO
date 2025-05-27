/**
 * Utilitaire de journalisation pour les erreurs et informations
 * Version améliorée avec plus de détails en production
 */

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
