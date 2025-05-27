/**
 * Utilitaire de journalisation pour les erreurs et informations
 */

// Journalisation d'erreur détaillée
export function logError(message, error, req = null) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack: error?.stack || 'Pas de stack trace',
    name: error?.name || 'Erreur inconnue',
    path: req?.url || 'Non disponible',
    method: req?.method || 'Non disponible',
    query: req?.query || {},
    headers: req?.headers ? sanitizeHeaders(req.headers) : {},
    body: sanitizeBody(req?.body),
    environment: process.env.NODE_ENV || 'development',
    deploymentId: process.env.NETLIFY_DEPLOY_ID || 'Local',
    siteName: process.env.NETLIFY_SITE_NAME || 'Local'
  };

  // Nettoyer pour Netlify logs
  const cleanedLog = JSON.stringify(errorLog)
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ');
    
  console.error('==== ERREUR DÉTAILLÉE ====');
  console.error(cleanedLog);
  console.error('========================');
  
  return errorLog;
}

// Journalisation d'information
export function logInfo(message, data = {}) {
  const infoLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    data,
    environment: process.env.NODE_ENV || 'development'
  };
  
  console.log(`[INFO] ${infoLog.timestamp}: ${message}`);
  
  return infoLog;
}

// Fonction utilitaire pour nettoyer les en-têtes (pas de données sensibles)
function sanitizeHeaders(headers) {
  if (!headers) return {};
  
  // Créer une copie des en-têtes
  const sanitized = {...headers};
  
  // Supprimer les en-têtes sensibles
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) sanitized[header] = '[REDACTED]';
  });
  
  return sanitized;
}

// Fonction utilitaire pour nettoyer le corps de la requête (pas de données trop volumineuses)
function sanitizeBody(body) {
  if (!body) return null;
  
  if (typeof body === 'object') {
    // Pour les objets volumineux, limiter la taille
    const stringified = JSON.stringify(body);
    if (stringified.length > 1000) {
      return {
        _sanitized: true,
        _originalSize: stringified.length,
        _excerpt: JSON.stringify(body).substring(0, 200) + '...'
      };
    }
    return body;
  }
  
  return body;
}
