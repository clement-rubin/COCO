/**
 * Utilitaire de journalisation pour les erreurs et informations
 * Version améliorée avec plus de détails en production
 */

// Journalisation d'erreur détaillée
export function logError(message, error, req = null) {
  // Extraire plus d'informations de l'erreur
  const errorDetails = getDetailedErrorInfo(error);
  
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    error: errorDetails,
    request: req ? getRequestInfo(req) : null,
    environment: process.env.NODE_ENV || 'development',
    deploymentInfo: getDeploymentInfo(),
    runtime: getRuntimeInfo()
  };

  // Nettoyer pour les logs
  const cleanedLog = JSON.stringify(errorLog)
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ');
    
  console.error('==== ERREUR DÉTAILLÉE ====');
  
  // En production, afficher tous les détails disponibles
  if (process.env.NODE_ENV === 'production') {
    console.error(cleanedLog);
    // Afficher la stack trace séparément pour une meilleure lisibilité
    if (error?.stack) {
      console.error('==== STACK TRACE ====');
      console.error(error.stack);
    }
  } else {
    // En développement, format plus concis
    console.error(`${message}: ${error?.message || 'Erreur inconnue'}`);
    if (error?.stack) console.error(error.stack);
  }
  
  console.error('========================');
  
  return errorLog;
}

// Journalisation d'information
export function logInfo(message, data = {}, showDetails = false) {
  const infoLog = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    data,
    environment: process.env.NODE_ENV || 'development'
  };
  
  if (showDetails || process.env.LOG_LEVEL === 'verbose') {
    console.log(`[INFO] ${infoLog.timestamp}: ${message}`, data);
  } else {
    console.log(`[INFO] ${infoLog.timestamp}: ${message}`);
  }
  
  return infoLog;
}

// Fonction pour extraire plus de détails d'une erreur
function getDetailedErrorInfo(error) {
  if (!error) return { message: 'Erreur non spécifiée' };
  
  return {
    message: error.message || 'Pas de message d\'erreur',
    name: error.name || 'Type d\'erreur inconnu',
    stack: error.stack || 'Pas de stack trace',
    code: error.code || null,
    errno: error.errno || null,
    syscall: error.syscall || null,
    statusCode: error.statusCode || null,
    details: error.details || null,
    cause: error.cause ? getDetailedErrorInfo(error.cause) : null
  };
}

// Fonction pour extraire des informations de la requête
function getRequestInfo(req) {
  if (!req) return null;
  
  return {
    url: req.url || 'Non disponible',
    method: req.method || 'Non disponible',
    path: req.path || req.url || 'Non disponible',
    query: req.query || {},
    params: req.params || {},
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    ip: req.ip || req.connection?.remoteAddress || 'Non disponible',
    userAgent: req.headers?.['user-agent'] || 'Non disponible'
  };
}

// Informations sur le déploiement
function getDeploymentInfo() {
  return {
    deploymentId: process.env.NETLIFY_DEPLOY_ID || 'Local',
    siteName: process.env.NETLIFY_SITE_NAME || 'Local',
    buildId: process.env.BUILD_ID || null,
    commitRef: process.env.COMMIT_REF || null,
    context: process.env.CONTEXT || 'development'
  };
}

// Informations sur l'environnement d'exécution
function getRuntimeInfo() {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage ? {
      rss: formatBytes(process.memoryUsage().rss),
      heapTotal: formatBytes(process.memoryUsage().heapTotal),
      heapUsed: formatBytes(process.memoryUsage().heapUsed),
    } : null,
    uptime: formatUptime(process.uptime())
  };
}

// Fonction utilitaire pour formater les bytes
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Fonction utilitaire pour formater le uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
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
