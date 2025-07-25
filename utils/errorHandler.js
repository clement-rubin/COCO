/**
 * Gestionnaire d'erreurs centralisé avec récupération automatique et reporting
 */

import { useState, useCallback } from 'react'
import { logError, logWarning, logInfo } from './logger'

export const ERROR_TYPES = {
  NETWORK: 'network_error',
  VALIDATION: 'validation_error',
  AUTH: 'auth_error',
  UPLOAD: 'upload_error',
  NOT_FOUND: 'not_found_error',
  SERVER: 'server_error',
  PERMISSION: 'permission_error',
  DATABASE: 'database_error',  // Added database error type
  API: 'api_error'            // Added API error type
}

export const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  RELOAD: 'reload',
  LOGIN: 'login',
  CONTACT_SUPPORT: 'contact_support',
  RESEND_EMAIL: 'resend_email',
  CHECK_CONNECTION: 'check_connection',
  WAIT: 'wait'
}

/**
 * Messages d'erreur conviviaux pour l'utilisateur
 */
const USER_FRIENDLY_MESSAGES = {
  // Erreurs réseau
  'Failed to fetch': 'Problème de connexion. Vérifiez votre internet.',
  'Network Error': 'Connexion interrompue. Réessayez dans un moment.',
  'ERR_NETWORK': 'Impossible de joindre le serveur. Vérifiez votre connexion.',
  
  // Erreurs d'authentification
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter.',
  'User not found': 'Aucun compte associé à cet email.',
  'Password is too weak': 'Le mot de passe doit contenir au moins 8 caractères.',
  'Database error saving new user': 'Problème lors de la création de votre profil. Veuillez réessayer avec un nom d\'utilisateur différent.',
  
  // Erreurs de validation
  'Title is required': 'Le titre de la recette est obligatoire.',
  'Description is required': 'La description de la recette est obligatoire.',
  'At least one photo is required': 'Au moins une photo est obligatoire.',
  'Recipe title cannot be empty': 'Le titre de la recette ne peut pas être vide.',
  'Recipe description cannot be empty': 'La description de la recette ne peut pas être vide.',
  'Form validation failed': 'Veuillez remplir tous les champs obligatoires.',
  'Required fields missing': 'Des champs obligatoires sont manquants.',
  
  // Messages pour les images
  'Image processing failed': 'Échec du traitement de l\'image.',
  'Image too small': 'L\'image est trop petite.',
  'Image format not supported': 'Format d\'image non supporté.',
  'Image upload timeout': 'Délai d\'attente dépassé pour l\'upload de l\'image.',
  
  // Erreurs de téléchargement
  'File too large': 'Fichier trop volumineux (max 6MB).',
  'Invalid file type': 'Type de fichier non supporté.',
  
  // Erreurs d'amis
  'Friend request already sent': 'Demande d\'ami déjà envoyée.',
  'Cannot add yourself as friend': 'Vous ne pouvez pas vous ajouter comme ami.',
  'Friend request not found': 'Demande d\'ami non trouvée.',
  'Already friends': 'Vous êtes déjà amis.',
  'User not found for friendship': 'Utilisateur introuvable.',
  'Friendship removed successfully': 'Ami supprimé avec succès.',
  'Cannot remove yourself as friend': 'Vous ne pouvez pas vous supprimer comme ami.',
  'Friendship removal failed': 'Impossible de supprimer cet ami.',
  'Friend removed from list': 'Ami retiré de votre liste.',
  'Remove friend confirmation required': 'Confirmation requise pour supprimer cet ami.',
  'Friendship already removed': 'Cette amitié a déjà été supprimée.',
  'Cannot remove non-friend': 'Vous ne pouvez supprimer que vos amis actuels.',
  'Friend removal error': 'Erreur lors de la suppression de l\'ami.',
  'Friendship stats unavailable': 'Statistiques d\'amitié temporairement indisponibles.',
  'Friendship stats fallback used': 'Statistiques d\'amitié calculées avec méthode de secours.',
  'Advanced search failed': 'La recherche avancée a échoué.',
  'Search filters too restrictive': 'Les filtres de recherche sont trop restrictifs.',
  'User search timeout': 'La recherche d\'utilisateur a pris trop de temps.',
  'Profile visibility limited': 'Certains profils ne sont pas visibles.',
  'Friend list refresh needed': 'Veuillez actualiser votre liste d\'amis.',
  'Friendship status changed': 'Le statut de cette amitié a changé.',
  'Multiple friendship requests': 'Plusieurs demandes d\'amitié détectées.',
  'Friendship verification failed': 'Impossible de vérifier le statut d\'amitié.',
  'User profile outdated': 'Le profil utilisateur doit être mis à jour.',
  'Friend request expired': 'Cette demande d\'amitié a expiré.',
  'Friendship limit reached': 'Limite d\'amis atteinte (max 500).',
  'Cannot modify friendship': 'Impossible de modifier cette amitié.',
  'Friend interaction blocked': 'Interaction avec cet ami bloquée.',
  'Friendship requires confirmation': 'Cette action nécessite une confirmation.',
  'Mutual friends calculation failed': 'Impossible de calculer les amis en commun.',
  'Friend recommendation unavailable': 'Recommandations d\'amis indisponibles.',
  
  // Erreurs serveur
  'Internal Server Error': 'Erreur temporaire du serveur. Réessayez dans quelques instants.',
  'Service Unavailable': 'Service temporairement indisponible.',
  'Too Many Requests': 'Trop de tentatives. Attendez avant de réessayer.',

  // Database/API errors
  'Failed to fetch data': 'Impossible de récupérer les données. Réessayez plus tard.',
  'Database error': 'Problème d\'accès aux données. Réessayez dans quelques instants.',
  'Connection timeout': 'La connexion au serveur a été trop longue. Vérifiez votre internet.',
  'Query timeout': 'La recherche a pris trop de temps. Réessayez avec un filtre plus précis.',
  'API endpoint not found': 'Cette fonctionnalité n\'est pas disponible actuellement.',
  'API rate limit exceeded': 'Trop de requêtes. Attendez un moment avant de réessayer.',
  
  // Supabase specific errors
  'JWSError': 'Erreur d\'authentification. Reconnectez-vous.',
  'JWTExpired': 'Votre session a expiré. Reconnectez-vous.',
  'JWTInvalid': 'Session invalide. Reconnectez-vous.',
  'PGRST': 'Erreur de base de données. Réessayez ultérieurement.',

  // Erreurs spécifiques au système d'amitié
  'Friendship already exists': 'Une relation d\'amitié existe déjà.',
  'Cannot send friend request to yourself': 'Vous ne pouvez pas vous envoyer une demande d\'ami.',
  'Friend request not found': 'Demande d\'ami introuvable.',
  'User already friends': 'Vous êtes déjà amis avec cette personne.',
  'Invalid friendship status': 'Statut d\'amitié invalide.',
  'Friendship not found': 'Relation d\'amitié introuvable.',
  'Unauthorized friendship action': 'Action non autorisée sur cette amitié.',
  'Profile not found': 'Profil utilisateur introuvable.',
  'User profile required': 'Un profil utilisateur est requis.',
  'Search query too short': 'La recherche doit contenir au moins 2 caractères.',
  'No users found': 'Aucun utilisateur trouvé.',
  'Profile creation failed': 'Impossible de créer le profil utilisateur.',
  'Invalid user data': 'Données utilisateur invalides.',
  'Display name already taken': 'Ce nom d\'utilisateur est déjà pris.',
  'Display name too short': 'Le nom d\'utilisateur doit contenir au moins 2 caractères.',
  'Display name too long': 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères.',
  'Invalid characters in display name': 'Le nom d\'utilisateur contient des caractères non autorisés.',
  'Invalid profile ID': 'Identifiant de profil invalide.',
  'Profile required for friendship': 'Un profil est requis pour établir des relations d\'amitié.',
  'Invalid friendship reference': 'Référence d\'amitié invalide - vérifiez les profils.',
  'Friendship constraint violation': 'Violation des contraintes d\'amitié.',
  'Profile not linked to user': 'Le profil n\'est pas lié à un utilisateur valide.',
  'Circular friendship detected': 'Relation d\'amitié circulaire détectée.',
  'Profile relationship error': 'Erreur dans les relations de profil.',
  'Missing profile reference': 'Référence de profil manquante.',
  'Profile ID mismatch': 'Les identifiants de profil ne correspondent pas.',
  'Invalid profile structure': 'Structure de profil invalide.',

  // Erreurs de contraintes de base de données
  '23503': 'Référence manquante - certains profils sont requis.',
  '23505': 'Cette action a déjà été effectuée.',
  '23514': 'Données non valides pour cette opération.',
  '42P01': 'Table non trouvée - le système est en cours d\'initialisation.',
  'PGRST301': 'Requête mal formée. Veuillez réessayer.',
  '406': 'Format de requête non acceptable - veuillez réessayer.',
  '409': 'Conflit - cette relation existe déjà.',

  // Erreurs spécifiques aux contraintes d'amitié
  'unique_friendship': 'Cette relation d\'amitié existe déjà.',
  'no_self_friendship': 'Vous ne pouvez pas vous ajouter comme ami.',
  'foreign key violation': 'Profil utilisateur requis pour cette action.',

  // Erreurs spécifiques aux nouvelles fonctionnalités
  'User already blocked': 'Cet utilisateur est déjà bloqué.',
  'Cannot block yourself': 'Vous ne pouvez pas vous bloquer vous-même.',
  'User not blocked': 'Cet utilisateur n\'est pas bloqué.',
  'Block limit exceeded': 'Limite de blocages atteinte (max 100).',
  'Group name already exists': 'Un groupe avec ce nom existe déjà.',
  'Group not found': 'Groupe introuvable.',
  'Cannot delete default group': 'Impossible de supprimer le groupe par défaut.',
  'Group member limit exceeded': 'Limite de membres du groupe atteinte.',
  'Friend not in group': 'Cet ami n\'est pas dans ce groupe.',
  'Notification not found': 'Notification introuvable.',
  'Invalid notification type': 'Type de notification invalide.',
  'Search query too complex': 'Requête de recherche trop complexe.',
  'Advanced search not available': 'Recherche avancée temporairement indisponible.',
  'Suggestion generation failed': 'Impossible de générer des suggestions.',
  'Online status update failed': 'Échec de la mise à jour du statut en ligne.',
  'Interaction history full': 'Historique des interactions plein.',
  'Invalid interaction type': 'Type d\'interaction invalide.',
  'Notification permission denied': 'Permission de notification refusée.',
  'Notification not supported': 'Notifications non supportées par ce navigateur.',
  'Notification send failed': 'Échec de l\'envoi de la notification.',
  'Notification service unavailable': 'Service de notifications temporairement indisponible.',
  'Push notification failed': 'Échec de la notification push.',
  'Notification display error': 'Erreur d\'affichage de la notification.',
  'Notification sound failed': 'Impossible de jouer le son de notification.',
  'Notification icon failed': 'Impossible de charger l\'icône de notification.',
  'Notification timeout': 'Délai d\'attente de la notification dépassé.',
  'Notification queue full': 'File d\'attente des notifications pleine.',
  'Notification format invalid': 'Format de notification invalide.',
  'Notification permission required': 'Permission de notification requise.',
  'Browser notification blocked': 'Notifications bloquées par le navigateur.',
  'Notification center unavailable': 'Centre de notifications temporairement indisponible.',
  'Notification storage full': 'Stockage des notifications plein.',
  'Notification center error': 'Erreur du centre de notifications.',
  'Failed to load notifications': 'Impossible de charger les notifications.',
  'Notification sync failed': 'Échec de la synchronisation des notifications.',
  'Notification display timeout': 'Délai d\'affichage des notifications dépassé.'
}

/**
 * Détermine la stratégie de récupération appropriée
 */
function getRecoveryStrategy(error, context = {}) {
  // Erreurs réseau
  if (error.name === 'NetworkError' || error.message.includes('fetch')) {
    return RECOVERY_STRATEGIES.RETRY
  }
  
  // Erreurs d'authentification
  if (error.message.includes('login credentials') || error.status === 401) {
    return RECOVERY_STRATEGIES.LOGIN
  }
  
  if (error.message.includes('Email not confirmed')) {
    return RECOVERY_STRATEGIES.RESEND_EMAIL
  }
  
  // Erreurs de validation
  if (error.status === 400 || error.message.includes('required')) {
    return null // Pas de stratégie automatique, l'utilisateur doit corriger
  }
  
  // Erreurs de permissions
  if (error.status === 403) {
    return RECOVERY_STRATEGIES.LOGIN
  }
  
  // Erreurs 404
  if (error.status === 404) {
    return RECOVERY_STRATEGIES.RELOAD
  }
  
  // Erreurs serveur
  if (error.status >= 500) {
    return RECOVERY_STRATEGIES.RETRY
  }
  
  // Database/Query errors
  if (error.message?.includes('timeout') || 
      error.message?.includes('connection') || 
      error.code?.includes('PGRST')) {
    return RECOVERY_STRATEGIES.RETRY
  }
  
  // Rate limiting
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return RECOVERY_STRATEGIES.WAIT
  }
  
  // JWT/Auth errors
  if (error.message?.includes('JWT') || error.code?.includes('JW')) {
    return RECOVERY_STRATEGIES.LOGIN
  }

  // Erreurs spécifiques aux amis
  if (error.message?.includes('friendship') || 
      error.message?.includes('friend request') ||
      error.message?.includes('Profile not found')) {
    return RECOVERY_STRATEGIES.RELOAD
  }
  
  return RECOVERY_STRATEGIES.CONTACT_SUPPORT
}

/**
 * Obtient des suggestions d'actions pour l'utilisateur
 */
function getActionSuggestions(error, recoveryStrategy) {
  const suggestions = []
  
  switch (recoveryStrategy) {
    case RECOVERY_STRATEGIES.RETRY:
      suggestions.push('Réessayez dans quelques instants')
      suggestions.push('Vérifiez votre connexion internet')
      break
      
    case RECOVERY_STRATEGIES.LOGIN:
      suggestions.push('Reconnectez-vous à votre compte')
      suggestions.push('Vérifiez vos identifiants')
      break
      
    case RECOVERY_STRATEGIES.RELOAD:
      suggestions.push('Rafraîchissez la page')
      suggestions.push('Videz le cache de votre navigateur')
      break
      
    case RECOVERY_STRATEGIES.WAIT:
      suggestions.push('Attendez quelques minutes avant de réessayer')
      suggestions.push('Réduisez votre fréquence d\'utilisation')
      break
      
    case RECOVERY_STRATEGIES.RESEND_EMAIL:
      suggestions.push('Vérifiez votre boîte email')
      suggestions.push('Demandez un nouvel email de confirmation')
      break
      
    default:
      suggestions.push('Contactez le support technique')
      suggestions.push('Décrivez ce que vous faisiez quand l\'erreur s\'est produite')
  }
  
  // Additional suggestions for database/API errors
  if (error.code?.includes('PGRST') || error.message?.includes('database')) {
    suggestions.push('Réessayez dans quelques instants')
    suggestions.push('Rafraîchissez la page')
  }
  
  if (error.message?.includes('timeout')) {
    suggestions.push('Vérifiez votre connexion internet')
    suggestions.push('Essayez une recherche plus simple')
  }
  
  return suggestions
}

/**
 * Logs error to persistent storage for the error logs page
 */
async function logErrorToStorage(error, context = {}) {
  try {
    const errorLog = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      error_type: getErrorType(error),
      message: error?.message || 'Erreur inconnue',
      details: {
        stack: error?.stack,
        status: error?.status,
        code: error?.code,
        context,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        ...context
      },
      severity: error?.status >= 500 ? 'high' : error?.status >= 400 ? 'medium' : 'low',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ip_address: null // Will be filled by server if needed
    }

    // Store in localStorage for now (could be enhanced to send to API)
    if (typeof window !== 'undefined') {
      const existingLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      existingLogs.unshift(errorLog)
      
      // Keep only last 100 errors to avoid storage bloat
      if (existingLogs.length > 100) {
        existingLogs.splice(100)
      }
      
      localStorage.setItem('error_logs', JSON.stringify(existingLogs))
    }

    logInfo('Error logged to storage', {
      errorId: errorLog.id,
      errorType: errorLog.error_type,
      severity: errorLog.severity
    })

  } catch (storageError) {
    logError('Failed to log error to storage', storageError)
  }
}

function getErrorType(error) {
  if (error?.status) {
    if (error.status === 401 || error.status === 403) return ERROR_TYPES.AUTH
    if (error.status === 404) return ERROR_TYPES.NOT_FOUND
    if (error.status === 400) return ERROR_TYPES.VALIDATION
    if (error.status >= 500) return ERROR_TYPES.SERVER
    if (error.status === 429) return ERROR_TYPES.NETWORK
  }
  
  if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
    return ERROR_TYPES.NETWORK
  }
  
  if (error?.message?.includes('upload') || error?.message?.includes('file')) {
    return ERROR_TYPES.UPLOAD
  }
  
  // Check for database errors
  if (error?.code?.includes('PGRST') || 
      error?.hint?.includes('database') ||
      error?.message?.includes('database') ||
      error?.message?.includes('query')) {
    return ERROR_TYPES.DATABASE
  }
  
  // Check for API errors
  if (error?.message?.includes('API') || 
      error?.source === 'api' || 
      error?.context?.source === 'api') {
    return ERROR_TYPES.API
  }
  
  return ERROR_TYPES.SERVER
}

/**
 * Transforme une erreur technique en erreur conviviale
 */
export function createUserFriendlyError(error, context = {}) {
  // Handle null/undefined error gracefully
  if (!error) {
    error = new Error('Unknown error occurred')
  }
  
  // Handle non-Error objects
  if (!(error instanceof Error)) {
    if (typeof error === 'string') {
      error = new Error(error)
    } else if (typeof error === 'object') {
      error = new Error(error.message || JSON.stringify(error))
      Object.assign(error, error) // Copy properties
    } else {
      error = new Error('Unknown error occurred')
    }
  }
  
  const errorMessage = error?.message || error?.toString() || 'Erreur inconnue'
  const userMessage = USER_FRIENDLY_MESSAGES[errorMessage] || 
                     USER_FRIENDLY_MESSAGES[error?.code] ||
                     'Une erreur inattendue s\'est produite'
  
  const recoveryStrategy = getRecoveryStrategy(error, context)
  const suggestions = getActionSuggestions(error, recoveryStrategy)
  
  // Détermine le type d'erreur
  let errorType = getErrorType(error)

  const friendlyError = {
    id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    message: userMessage,
    originalMessage: errorMessage,
    type: errorType,
    status: error?.status,
    code: error?.code,
    timestamp: new Date().toISOString(),
    recoveryStrategy,
    suggestions,
    context,
    canRetry: recoveryStrategy === RECOVERY_STRATEGIES.RETRY,
    requiresAction: recoveryStrategy !== null,
    severity: error?.status >= 500 ? 'high' : error?.status >= 400 ? 'medium' : 'low'
  }
  
  logError('Erreur transformée pour l\'utilisateur', error, {
    friendlyErrorId: friendlyError.id,
    userMessage,
    recoveryStrategy,
    context,
    originalError: {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      code: error?.code
    }
  })

  // Log to persistent storage
  logErrorToStorage(error, {
    ...context,
    friendlyErrorId: friendlyError.id,
    userMessage,
    recoveryStrategy
  })
  
  return friendlyError
}

/**
 * Gestionnaire spécialisé pour les erreurs d'authentification
 */
export function handleAuthError(error, context = {}) {
  const friendlyError = createUserFriendlyError(error, {
    ...context,
    type: 'auth_operation'
  })
  
  return {
    originalError: error,
    userError: friendlyError
  }
}

/**
 * Hook React pour la gestion d'erreurs
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState([])
  
  const addError = useCallback((error, context = {}) => {
    const friendlyError = createUserFriendlyError(error, context)
    setErrors(prev => [...prev, friendlyError])
    return friendlyError
  }, [])
  
  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(err => err.id !== errorId))
  }, [])
  
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])
  
  const hasErrors = errors.length > 0
  const latestError = errors[errors.length - 1]
  
  return {
    errors,
    hasErrors,
    latestError,
    addError,
    removeError,
    clearErrors
  }
}

/**
 * Gestionnaire d'erreurs global pour les promesses non gérées
 */
export function setupGlobalErrorHandling() {
  if (typeof window === 'undefined') return
  
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    logError('Promesse rejetée non gérée', error)
    
    // Empêcher l'affichage dans la console du navigateur
    event.preventDefault()
    
    // Créer une erreur conviviale
    const friendlyError = createUserFriendlyError(error, {
      type: 'unhandled_promise_rejection',
      url: window.location.href
    })
    
    // Dispatch d'un événement personnalisé pour que l'app puisse réagir
    window.dispatchEvent(new CustomEvent('app-error', {
      detail: friendlyError
    }))
  })
  
  window.addEventListener('error', (event) => {
    const error = event.error
    logError('Erreur JavaScript non gérée', error)
    
    const friendlyError = createUserFriendlyError(error, {
      type: 'javascript_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      url: window.location.href
    })
    
    window.dispatchEvent(new CustomEvent('app-error', {
      detail: friendlyError
    }))
  })
}

// Make sure the error messages are within an object definition like:

const errorMessages = {
  // Authentication errors
  'Invalid credentials': 'Identifiants invalides. Vérifiez votre email et mot de passe.',
  // ...other authentication errors...

  // Rate limiting
  'Too Many Requests': 'Trop de tentatives. Attendez avant de réessayer.',

  // Database/API errors
  'Failed to fetch data': 'Impossible de récupérer les données. Réessayez plus tard.',
  'Database error': 'Problème d\'accès aux données. Réessayez dans quelques instants.',
  'Connection timeout': 'La connexion au serveur a été trop longue. Vérifiez votre internet.',
  'Query timeout': 'La recherche a pris trop de temps. Réessayez avec un filtre plus précis.',
  // ...other errors...
};

// Then export the error messages
export default errorMessages;
