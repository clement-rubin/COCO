import { supabase } from '../lib/supabase'
import { logInfo, logError, logDebug } from './logger'
import { safeGetRecipeLikesStats } from './safeLikesUtils'

/**
 * Obtenir les statistiques de likes d'une recette avec fallback sécurisé
 * @param {string} recipeId - ID de la recette
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, likes_count: number, user_has_liked: boolean}>}
 */
export async function getRecipeLikesStats(recipeId, userId = null) {
  try {
    logDebug('Getting recipe likes stats', { recipeId, hasUserId: !!userId })

    // Essayer d'abord l'API optimisée
    try {
      let apiUrl = `/api/recipe-likes?recipe_id=${recipeId}`
      if (userId) {
        apiUrl += `&user_id=${userId}`
      }

      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        logDebug('Recipe likes stats from API', { 
          recipeId, 
          likes_count: data.likes_count,
          user_has_liked: data.user_has_liked 
        })
        
        return {
          success: true,
          likes_count: data.likes_count || 0,
          user_has_liked: data.user_has_liked || false
        }
      }
    } catch (apiError) {
      logError('API call failed, using fallback', apiError, { recipeId })
    }

    // Fallback vers la méthode sécurisée directe
    const stats = await safeGetRecipeLikesStats(recipeId, userId)
    
    return {
      success: true,
      likes_count: stats.likes_count,
      user_has_liked: stats.user_has_liked
    }

  } catch (error) {
    logError('Error getting recipe likes stats', error, { recipeId, userId })
    return {
      success: false,
      likes_count: 0,
      user_has_liked: false
    }
  }
}

/**
 * Toggle le like d'une recette avec synchronisation complète
 * @param {string} recipeId - ID de la recette
 * @param {string} userId - ID de l'utilisateur
 * @param {boolean} currentlyLiked - État actuel du like
 * @param {Object} recipeData - Données de la recette (optionnel)
 * @param {Object} userData - Données de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, stats: Object, error?: string}>}
 */
export async function toggleRecipeLike(recipeId, userId, currentlyLiked, recipeData = null, userData = null) {
  try {
    logInfo('Toggling recipe like', { 
      recipeId, 
      userId: userId?.substring(0, 8) + '...',
      currentlyLiked,
      action: currentlyLiked ? 'unlike' : 'like'
    })

    const method = currentlyLiked ? 'DELETE' : 'POST'
    const apiUrl = currentlyLiked 
      ? `/api/recipe-likes?recipe_id=${recipeId}&user_id=${userId}`
      : '/api/recipe-likes'

    const requestBody = currentlyLiked ? undefined : {
      recipe_id: recipeId,
      user_id: userId
    }

    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    })

    const result = await response.json()

    if (!response.ok) {
      logError('API error toggling like', new Error(result.message || 'API Error'), {
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        status: response.status,
        error: result
      })
      
      return {
        success: false,
        error: result.message || 'Erreur lors de la modification du like',
        stats: null
      }
    }

    // Récupérer les stats mises à jour
    const updatedStats = result.stats || {
      likes_count: result.recipe?.likes_count || 0,
      user_has_liked: !currentlyLiked
    }

    logInfo('Recipe like toggled successfully', {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      newLikesCount: updatedStats.likes_count,
      newUserHasLiked: updatedStats.user_has_liked
    })

    return {
      success: true,
      stats: updatedStats,
      error: null
    }

  } catch (error) {
    logError('Exception toggling recipe like', error, { recipeId, userId })
    
    return {
      success: false,
      error: 'Erreur de connexion lors de la modification du like',
      stats: null
    }
  }
}

/**
 * Récupérer les statistiques d'engagement complètes (likes + commentaires)
 * @param {string} recipeId - ID de la recette
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, likes_count: number, user_has_liked: boolean, comments_count: number}>}
 */
export async function getRecipeEngagementStats(recipeId, userId = null) {
  try {
    // Récupérer les likes
    const likesStats = await getRecipeLikesStats(recipeId, userId)
    
    // Pour l'instant, les commentaires sont à 0 (à implémenter plus tard)
    const commentsCount = 0

    return {
      success: likesStats.success,
      likes_count: likesStats.likes_count,
      user_has_liked: likesStats.user_has_liked,
      comments_count: commentsCount
    }

  } catch (error) {
    logError('Error getting recipe engagement stats', error, { recipeId, userId })
    return {
      success: false,
      likes_count: 0,
      user_has_liked: false,
      comments_count: 0
    }
  }
}

/**
 * Récupérer les statistiques pour plusieurs recettes
 * @param {Array<string>} recipeIds - Liste des IDs de recettes
 * @param {string} userId - ID de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export async function getMultipleRecipesEngagementStats(recipeIds, userId = null) {
  try {
    if (!recipeIds || recipeIds.length === 0) {
      return { success: true, data: {} }
    }

    logDebug('Getting multiple recipes engagement stats', { 
      recipesCount: recipeIds.length,
      hasUserId: !!userId 
    })

    // Essayer l'API batch d'abord
    try {
      let apiUrl = `/api/recipe-likes?recipe_ids=${recipeIds.join(',')}`
      if (userId) {
        apiUrl += `&user_id=${userId}`
      }

      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        
        // Ajouter les commentaires (pour l'instant 0)
        const enrichedData = {}
        Object.keys(data).forEach(recipeId => {
          enrichedData[recipeId] = {
            ...data[recipeId],
            comments_count: 0
          }
        })
        
        return { success: true, data: enrichedData }
      }
    } catch (apiError) {
      logError('Batch API failed, using individual calls', apiError)
    }

    // Fallback: appels individuels
    const results = {}
    const promises = recipeIds.map(async recipeId => {
      const stats = await getRecipeEngagementStats(recipeId, userId)
      results[recipeId] = {
        likes_count: stats.likes_count,
        user_has_liked: stats.user_has_liked,
        comments_count: stats.comments_count
      }
    })

    await Promise.all(promises)

    return { success: true, data: results }

  } catch (error) {
    logError('Error getting multiple recipes engagement stats', error)
    return { success: false, data: {} }
  }
}

/**
 * Ajouter un like à une recette
 */
export async function addRecipeLike(recipeId, userId, recipe = null, user = null) {
  const requestId = `add-like-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const requestDetails = {
    method: 'POST',
    url: '/api/recipe-likes'
  }

  try {
    logDebug('Adding like to recipe', {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...'
    })

    const response = await fetch('/api/recipe-likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipe_id: recipeId,
        user_id: userId
      })
    })

    let data
    let responseText
    try {
      responseText = await response.text()
      data = responseText ? JSON.parse(responseText) : {}
    } catch (parseError) {
      logHttpError('Error parsing response JSON when adding like', parseError, requestDetails, {
        requestId,
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseText: responseText?.substring(0, 500)
      })
      throw new Error('Réponse serveur invalide')
    }

    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
      error.status = response.status
      error.code = data.code
      error.requestId = data.requestId || requestId
      throw error
    }

    logInfo('Like added successfully', {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      newLikesCount: data.stats?.likes_count,
      requestId: data.requestId
    })

    return {
      success: true,
      like: data.like,
      stats: data.stats
    }
  } catch (error) {
    // Log complet de l'erreur avec tous les détails
    logHttpError('Complete error details when adding recipe like', error, requestDetails, {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      status: error.status,
      code: error.code,
      requestIdFromError: error.requestId,
      recipeData: recipe ? {
        id: recipe.id,
        title: recipe.title?.substring(0, 50),
        user_id: recipe.user_id,
        likes_count: recipe.likes_count
      } : null,
      userData: user ? {
        id: user.id?.substring(0, 8) + '...',
        display_name: user.display_name || user.user_metadata?.display_name || 'Unknown'
      } : null,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      currentUrl: typeof window !== 'undefined' ? window.location.href : undefined
    })
    
    return {
      success: false,
      error: error.message,
      status: error.status,
      code: error.code,
      requestId: error.requestId || requestId
    }
  }
}

/**
 * Supprimer un like d'une recette
 */
export async function removeRecipeLike(recipeId, userId) {
  const requestId = `remove-like-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const requestDetails = {
    method: 'DELETE',
    url: `/api/recipe-likes?recipe_id=${recipeId}&user_id=${userId}`
  }

  try {
    logDebug('Removing like from recipe', {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...'
    })

    const response = await fetch(`/api/recipe-likes?recipe_id=${recipeId}&user_id=${userId}`, {
      method: 'DELETE'
    })

    let data
    let responseText
    try {
      responseText = await response.text()
      data = responseText ? JSON.parse(responseText) : {}
    } catch (parseError) {
      logHttpError('Error parsing response JSON when removing like', parseError, requestDetails, {
        requestId,
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseText: responseText?.substring(0, 500)
      })
      throw new Error('Réponse serveur invalide')
    }

    if (!response.ok) {
      logHttpError('API error response when removing like', {
        name: 'HTTPError',
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        response: response
      }, requestDetails, {
        requestId,
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        responseData: data,
        responseHeaders: Object.fromEntries(response.headers.entries())
      })

      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    logInfo('Like removed successfully', {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      newLikesCount: data.stats?.likes_count
    })

    return {
      success: true,
      stats: data.stats
    }
  } catch (error) {
    logHttpError('Complete error details when removing recipe like', error, requestDetails, {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Toggle like sur une recette (ajouter ou supprimer)
 */
export async function toggleRecipeLike(recipeId, userId, currentlyLiked, recipe = null, user = null) {
  try {
    logDebug('Toggling recipe like', {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      currentlyLiked,
      action: currentlyLiked ? 'remove' : 'add'
    })

    if (currentlyLiked) {
      return await removeRecipeLike(recipeId, userId)
    } else {
      return await addRecipeLike(recipeId, userId, recipe, user)
    }
  } catch (error) {
    logError('Error toggling recipe like', error, {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      currentlyLiked
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques complètes de likes et commentaires pour une recette
 */
export async function getRecipeEngagementStats(recipeId) {
  try {
    const [likesResult, commentsResult] = await Promise.all([
      getRecipeLikesStats(recipeId),
      getRecipeCommentsStats(recipeId)
    ])
    
    return {
      success: true,
      likes_count: likesResult.success ? likesResult.likes_count : 0,
      user_has_liked: likesResult.success ? likesResult.user_has_liked : false,
      comments_count: commentsResult.success ? commentsResult.comments_count : 0,
      engagement_score: (likesResult.likes_count || 0) + (commentsResult.comments_count || 0) * 2
    }
  } catch (error) {
    logError('Error getting recipe engagement stats', error, { recipeId })
    return {
      success: false,
      likes_count: 0,
      user_has_liked: false,
      comments_count: 0,
      engagement_score: 0,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques de commentaires pour une recette
 */
export async function getRecipeCommentsStats(recipeId) {
  const startTime = Date.now()
  
  try {
    logCommentAction('load_stats_start', {
      targetId: recipeId,
      targetType: 'recipe'
    })
    
    const response = await fetch(`/api/comments?recipe_id=${recipeId}&count_only=true`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    const commentsCount = Array.isArray(data) ? data.length : (data.count || 0)
    
    logCommentAction('load_stats_success', {
      targetId: recipeId,
      targetType: 'recipe',
      comments_count: commentsCount,
      responseTime,
      dataType: Array.isArray(data) ? 'array' : 'object'
    })
    
    return {
      success: true,
      comments_count: commentsCount
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    logCommentAction('load_stats_error', {
      targetId: recipeId,
      targetType: 'recipe',
      error: error.message,
      responseTime,
      errorName: error.name,
      errorStack: error.stack?.substring(0, 500)
    })
    
    logError('Error getting recipe comments stats', error, { recipeId, responseTime })
    
    return {
      success: false,
      comments_count: 0,
      error: error.message
    }
  }
}

/**
 * Ajouter un commentaire avec logging détaillé
 */
export async function addRecipeComment(recipeId, userId, text, parentId = null) {
  const startTime = Date.now()
  const commentId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
    logCommentAction('add_comment_start', {
      commentId,
      targetId: recipeId,
      targetType: 'recipe',
      userId,
      text,
      parentId,
      hasParent: !!parentId
    })
    
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipe_id: recipeId,
        user_id: userId,
        text,
        parent_id: parentId
      })
    })
    
    const data = await response.json()
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    logCommentAction('add_comment_success', {
      commentId: data.comment?.id,
      targetId: recipeId,
      targetType: 'recipe',
      userId,
      text,
      parentId,
      responseTime,
      serverCommentId: data.comment?.id?.substring(0, 8) + '...',
      commentsCount: data.stats?.comments_count
    })
    
    logSocialInteraction('comment', 'add', {
      targetId: recipeId,
      targetType: 'recipe',
      userId,
      success: true,
      duration: responseTime,
      comments_count: data.stats?.comments_count,
      engagement_score: data.stats?.engagement_score
    })
    
    return {
      success: true,
      comment: data.comment,
      stats: data.stats
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    logCommentAction('add_comment_error', {
      commentId,
      targetId: recipeId,
      targetType: 'recipe',
      userId,
      text: text?.substring(0, 50) + '...',
      parentId,
      error: error.message,
      responseTime,
      errorName: error.name,
      errorStack: error.stack?.substring(0, 500)
    })
    
    logSocialInteraction('comment', 'add', {
      targetId: recipeId,
      targetType: 'recipe',
      userId,
      success: false,
      error: error.message,
      duration: responseTime
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Supprimer un commentaire avec logging détaillé
 */
export async function removeRecipeComment(commentId, userId) {
  const startTime = Date.now()
  
  try {
    logCommentAction('remove_comment_start', {
      commentId,
      userId
    })
    
    const response = await fetch(`/api/comments?comment_id=${commentId}&user_id=${userId}`, {
      method: 'DELETE'
    })

    const data = await response.json()
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    logCommentAction('remove_comment_success', {
      commentId,
      userId,
      responseTime,
      commentsCount: data.stats?.comments_count
    })
    
    logSocialInteraction('comment', 'remove', {
      targetId: data.recipe_id,
      targetType: 'recipe',
      userId,
      success: true,
      duration: responseTime,
      comments_count: data.stats?.comments_count
    })
    
    return {
      success: true,
      stats: data.stats
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    logCommentAction('remove_comment_error', {
      commentId,
      userId,
      error: error.message,
      responseTime,
      errorName: error.name
    })
    
    logSocialInteraction('comment', 'remove', {
      userId,
      success: false,
      error: error.message,
      duration: responseTime
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Charger les commentaires d'une recette avec logging détaillé
 */
export async function loadRecipeComments(recipeId, page = 1, limit = 20) {
  const startTime = Date.now()
  
  try {
    logCommentAction('load_comments_start', {
      targetId: recipeId,
      targetType: 'recipe',
      page,
      limit
    })
    
    const response = await fetch(`/api/comments?recipe_id=${recipeId}&page=${page}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    const comments = Array.isArray(data) ? data : (data.comments || [])
    
    logCommentAction('load_comments_success', {
      targetId: recipeId,
      targetType: 'recipe',
      page,
      limit,
      commentsLoaded: comments.length,
      responseTime,
      hasMore: data.hasMore,
      totalCount: data.totalCount
    })
    
    return {
      success: true,
      comments,
      hasMore: data.hasMore || false,
      totalCount: data.totalCount || comments.length
    }
  } catch (error) {
    const endTime = Date.now()
    const responseTime = endTime - startTime
    
    logCommentAction('load_comments_error', {
      targetId: recipeId,
      targetType: 'recipe',
      page,
      limit,
      error: error.message,
      responseTime,
      errorName: error.name
    })
    
    return {
      success: false,
      comments: [],
      error: error.message
    }
  }
}

/**
 * Fonction de logging spécialisée pour les erreurs HTTP avec détails complets
 */
function logHttpError(message, error, requestDetails, additionalContext = {}) {
  const errorDetails = {
    message,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 2000), // Limiter la stack trace
      status: error.status,
      code: error.code,
      requestId: error.requestId
    },
    request: requestDetails,
    context: additionalContext,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
  }
  
  logError(message, error, errorDetails)
}

/**
 * Fonction de logging détaillé pour les commentaires
 */
export function logCommentAction(action, details) {
  const logData = {
    action,
    timestamp: new Date().toISOString(),
    details: {
      commentId: details.commentId?.substring(0, 8) + '...',
      targetId: details.targetId?.substring(0, 8) + '...',
      targetType: details.targetType,
      userId: details.userId?.substring(0, 8) + '...',
      text: details.text?.substring(0, 100) + (details.text?.length > 100 ? '...' : ''),
      parentId: details.parentId?.substring(0, 8) + '...',
      ...details
    },
    performance: {
      loadTime: details.loadTime,
      responseTime: details.responseTime
    },
    context: {
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    }
  }
  
  logInfo(`Comment ${action}`, logData)
}

/**
 * Fonction de logging pour les interactions sociales (likes + comments)
 */
export function logSocialInteraction(type, action, details) {
  const logData = {
    interactionType: type, // 'like' ou 'comment'
    action, // 'add', 'remove', 'update', 'load'
    timestamp: new Date().toISOString(),
    details: {
      targetId: details.targetId?.substring(0, 8) + '...',
      targetType: details.targetType,
      userId: details.userId?.substring(0, 8) + '...',
      before: details.beforeState,
      after: details.afterState,
      duration: details.duration,
      success: details.success,
      error: details.error?.substring(0, 200)
    },
    metrics: {
      likes_count: details.likes_count,
      comments_count: details.comments_count,
      engagement_score: details.engagement_score
    },
    context: {
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      timestamp: Date.now()
    }
  }
  
  if (details.success) {
    logInfo(`Social ${type} ${action} success`, logData)
  } else {
    logError(`Social ${type} ${action} failed`, new Error(details.error || 'Unknown error'), logData)
  }
}

//# sourceMappingURL=likesUtils.js.map

export async function verifyAndFixLikesCounts() {
  try {
    const response = await fetch('/api/admin/verify-likes-counts', {
      method: 'POST'
    })
    
    if (!response.ok) {
      throw new Error('Erreur lors de la vérification des compteurs')
    }
    
    const result = await response.json()
    
    logInfo('Likes counts verification completed', {
      fixed: result.fixed,
      errors: result.errors
    })
    
    return result
  } catch (error) {
    logError('Error verifying likes counts', error)
    return { success: false, error: error.message }
  }
}

/**
 * Hook React pour gérer les statistiques d'engagement d'une recette
 */
export function useRecipeEngagementStats(recipeId) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    likes_count: 0,
    user_has_liked: false,
    comments_count: 0,
    engagement_score: 0
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (recipeId) {
      loadEngagementStats()
    }
  }, [recipeId])

  const loadEngagementStats = async () => {
    setLoading(true)
    try {
      const result = await getRecipeEngagementStats(recipeId)
      if (result.success) {
        setStats(result)
        setError(null)
      } else {
        setError(result.error || 'Erreur lors du chargement des statistiques')
      }
    } catch (err) {
      setError('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    stats,
    error
  }
}

/**
 * Obtenir les statistiques de partage pour une recette
 */
export async function getRecipeSharesStats(recipeId) {
  try {
    const response = await fetch(`/api/shares?recipe_id=${recipeId}&count_only=true`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      shares_count: Array.isArray(data) ? data.length : (data.count || 0)
    }
  } catch (error) {
    logError('Error getting recipe shares stats', error, { recipeId })
    return {
      success: false,
      shares_count: 0,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques d'engagement complètes pour une recette
 */
export async function getRecipeFullEngagementStats(recipeId) {
  try {
    const [likesStats, commentsStats, sharesStats] = await Promise.all([
      getRecipeLikesStats(recipeId),
      getRecipeCommentsStats(recipeId),
      getRecipeSharesStats(recipeId)
    ])
    
    return {
      success: true,
      likes_count: likesStats.success ? likesStats.likes_count : 0,
      user_has_liked: likesStats.success ? likesStats.user_has_liked : false,
      comments_count: commentsStats.success ? commentsStats.comments_count : 0,
      shares_count: sharesStats.success ? sharesStats.shares_count : 0,
      engagement_score: (likesStats.likes_count || 0) + (commentsStats.comments_count || 0) * 2 + (sharesStats.shares_count || 0) * 3
    }
  } catch (error) {
    logError('Error getting recipe full engagement stats', error, { recipeId })
    return {
      success: false,
      likes_count: 0,
      user_has_liked: false,
      comments_count: 0,
      shares_count: 0,
      engagement_score: 0,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques d'engagement pour plusieurs recettes (version complète)
 */
export async function getMultipleRecipesFullEngagementStats(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) {
    return { success: true, data: {} }
  }

  try {
    // Charger les likes
    const likesResult = await getMultipleRecipesLikesStats(recipeIds)
    
    // Charger les commentaires et partages pour chaque recette
    const engagementPromises = recipeIds.map(async (recipeId) => {
      const [commentsResult, sharesResult] = await Promise.all([
        getRecipeCommentsStats(recipeId),
        getRecipeSharesStats(recipeId)
      ])
      
      return {
        recipeId,
        comments_count: commentsResult.success ? commentsResult.comments_count : 0,
        shares_count: sharesResult.success ? sharesResult.shares_count : 0
      }
    })
    
    const engagementResults = await Promise.all(engagementPromises)
    
    // Combiner les données
    const combinedData = {}
    recipeIds.forEach(recipeId => {
      const likesData = likesResult.data[recipeId] || { likes_count: 0, user_has_liked: false }
      const engagementData = engagementResults.find(e => e.recipeId === recipeId) || { comments_count: 0, shares_count: 0 }
      
      combinedData[recipeId] = {
        likes_count: likesData.likes_count,
        user_has_liked: likesData.user_has_liked,
        comments_count: engagementData.comments_count,
        shares_count: engagementData.shares_count,
        engagement_score: likesData.likes_count + (engagementData.comments_count * 2) + (engagementData.shares_count * 3)
      }
    })
    
    return {
      success: true,
      data: combinedData
    }
  } catch (error) {
    logError('Error getting multiple recipes full engagement stats', error, {
      recipeIds: recipeIds.slice(0, 5),
      recipeIdsCount: recipeIds.length
    })
    
    return {
      success: false,
      error: error.message,
      data: {}
    }
  }
}
