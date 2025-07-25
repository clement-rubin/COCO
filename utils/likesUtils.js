import { logInfo, logError, logDebug, logHttpError } from './logger'
import { showRecipeLikeInteractionNotification } from './notificationUtils'
import { useState, useEffect, useCallback } from 'react'

/**
 * Utility functions pour gérer les likes des recettes
 */

/**
 * Obtenir les statistiques de likes pour une recette
 */
export async function getRecipeLikesStats(recipeId) {
  try {
    // Récupérer directement depuis la table recipes avec le compteur automatique
    const [recipeResponse, userLikeResponse] = await Promise.all([
      fetch(`/api/recipes/${recipeId}/stats`),
      fetch(`/api/recipe-likes/user-status?recipe_id=${recipeId}`)
    ])
    
    if (!recipeResponse.ok) {
      throw new Error(`HTTP ${recipeResponse.status}: ${recipeResponse.statusText}`)
    }
    
    const recipeData = await recipeResponse.json()
    const userLikeData = userLikeResponse.ok ? await userLikeResponse.json() : { user_has_liked: false }
    
    return {
      success: true,
      likes_count: recipeData.likes_count || 0,
      user_has_liked: userLikeData.user_has_liked || false
    }
  } catch (error) {
    logError('Error getting recipe likes stats', error, { recipeId })
    return {
      success: false,
      likes_count: 0,
      user_has_liked: false,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques de likes pour plusieurs recettes
 */
export const getMultipleRecipesLikesStats = async (recipeIds) => {
  if (!recipeIds || recipeIds.length === 0) {
    return { success: true, data: {} }
  }

  try {
    const response = await fetch('/api/recipe-likes?' + new URLSearchParams({
      recipe_ids: recipeIds.join(',')
    }))

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    return {
      success: true,
      data: data || {}
    }
  } catch (error) {
    logError('Error getting multiple recipes likes stats', error, {
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

/**
 * Ajouter un like à une recette
 */
export async function addRecipeLike(recipeId, userId, recipe = null, user = null) {
  const requestId = `add-like-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const requestDetails = {
    method: 'POST',
    url: '/api/recipe-likes',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id: recipeId, user_id: userId })
  }

  try {
    // Validation des paramètres côté client
    if (!recipeId || !userId) {
      throw new Error('recipeId et userId sont requis')
    }

    logDebug('Adding like to recipe', {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      hasRecipeData: !!recipe,
      hasUserData: !!user,
      currentLikesCount: recipe?.likes_count || 0
    })

    const response = await fetch('/api/recipe-likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe_id: recipeId,
        user_id: userId
      })
    })

    // Parse response before checking ok status to get error details
    let data
    let responseText
    try {
      responseText = await response.text()
      data = responseText ? JSON.parse(responseText) : {}
    } catch (parseError) {
      logHttpError('Error parsing response JSON', parseError, requestDetails, {
        requestId,
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseText: responseText?.substring(0, 500),
        responseHeaders: Object.fromEntries(response.headers.entries())
      })
      throw new Error('Réponse serveur invalide')
    }

    if (!response.ok) {
      const errorDetails = {
        requestId,
        recipeId,
        userId: userId?.substring(0, 8) + '...',
        status: response.status,
        statusText: response.statusText,
        responseData: data,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        requestBody: requestDetails.body,
        url: response.url,
        timestamp: new Date().toISOString()
      }

      logHttpError('API error response when adding like', {
        name: 'HTTPError',
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        code: data.code,
        requestId: data.requestId,
        response: response
      }, requestDetails, errorDetails)

      // Provide more specific error messages based on status code
      let errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`
      
      if (response.status === 400) {
        errorMessage = 'Paramètres invalides: ' + errorMessage
      } else if (response.status === 404) {
        errorMessage = 'Recette non trouvée'
      } else if (response.status === 409) {
        errorMessage = 'Vous avez déjà liké cette recette'
      } else if (response.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.'
      }

      const error = new Error(errorMessage)
      error.status = response.status
      error.code = data.code
      error.requestId = data.requestId
      error.response = response
      throw error
    }

    // Déclencher une notification si les données sont disponibles
    if (recipe && user && recipe.user_id && recipe.user_id !== userId) {
      try {
        showRecipeLikeInteractionNotification({
          ...recipe,
          likes_count: data.stats?.likes_count || recipe.likes_count || 0
        }, user)
      } catch (notificationError) {
        logError('Error showing like notification', notificationError, {
          recipeId,
          userId: userId?.substring(0, 8) + '...'
        })
      }
    }

    logInfo('Like added successfully', {
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      newLikesCount: data.stats?.likes_count,
      previousCount: recipe?.likes_count || 0,
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
        username: user.username
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
  try {
    const response = await fetch(`/api/comments?recipe_id=${recipeId}&count_only=true`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      comments_count: Array.isArray(data) ? data.length : (data.count || 0)
    }
  } catch (error) {
    logError('Error getting recipe comments stats', error, { recipeId })
    return {
      success: false,
      comments_count: 0,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques d'engagement pour plusieurs recettes
 */
export async function getMultipleRecipesEngagementStats(recipeIds) {
  if (!recipeIds || recipeIds.length === 0) {
    return { success: true, data: {} }
  }

  try {
    // Charger les likes
    const likesResult = await getMultipleRecipesLikesStats(recipeIds)
    
    // Charger les commentaires pour chaque recette
    const commentsPromises = recipeIds.map(async (recipeId) => {
      const commentsResult = await getRecipeCommentsStats(recipeId)
      return {
        recipeId,
        comments_count: commentsResult.success ? commentsResult.comments_count : 0
      }
    })
    
    const commentsResults = await Promise.all(commentsPromises)
    
    // Combiner les données
    const combinedData = {}
    recipeIds.forEach(recipeId => {
      const likesData = likesResult.data[recipeId] || { likes_count: 0, user_has_liked: false }
      const commentsData = commentsResults.find(c => c.recipeId === recipeId) || { comments_count: 0 }
      
      combinedData[recipeId] = {
        likes_count: likesData.likes_count,
        user_has_liked: likesData.user_has_liked,
        comments_count: commentsData.comments_count,
        engagement_score: likesData.likes_count + (commentsData.comments_count * 2)
      }
    })
    
    return {
      success: true,
      data: combinedData
    }
  } catch (error) {
    logError('Error getting multiple recipes engagement stats', error, {
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

/**
 * Hook React pour gérer les likes d'une recette
 */
export function useRecipeLikes(recipeId, initialStats = null) {
  const [loading, setLoading] = useState(false)
  const [optimisticLoading, setOptimisticLoading] = useState(false)
  const [stats, setStats] = useState(initialStats || { likes_count: 0, user_has_liked: false })
  const [error, setError] = useState(null)
  const [lastAction, setLastAction] = useState(null)

  // Animation states
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 })

  const createHeartAnimation = useCallback((event) => {
    if (event?.target) {
      const rect = event.target.getBoundingClientRect()
      setHeartPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 1000)
    }
  }, [])

  const toggleLike = useCallback(async (event, user, recipeData) => {
    if (loading || optimisticLoading) return

    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
      return
    }

    // Validation des paramètres
    if (!recipeId || !user.id) {
      setError('Paramètres manquants pour effectuer cette action')
      return
    }

    const isCurrentlyLiked = stats.user_has_liked
    const action = isCurrentlyLiked ? 'remove' : 'add'
    const toggleRequestId = `toggle-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    
    setOptimisticLoading(true)
    setError(null)
    setLastAction(action)

    // Optimistic update
    setStats(prev => ({
      likes_count: prev.likes_count + (isCurrentlyLiked ? -1 : 1),
      user_has_liked: !isCurrentlyLiked
    }))

    // Create animation for like action
    if (!isCurrentlyLiked) {
      createHeartAnimation(event)
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate([30])
      }
    }

    try {
      setLoading(true)
      
      let result
      if (isCurrentlyLiked) {
        result = await removeRecipeLike(recipeId, user.id)
      } else {
        result = await addRecipeLike(recipeId, user.id, recipeData, user)
      }

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du like')
      }
      
      // Update with real data from server
      setStats({
        likes_count: result.stats?.likes_count || stats.likes_count,
        user_has_liked: !isCurrentlyLiked
      })

    } catch (err) {
      // Log complet de l'erreur dans le hook
      logHttpError('Complete error details in toggleLike hook', err, {
        method: action === 'add' ? 'POST' : 'DELETE',
        url: action === 'add' ? '/api/recipe-likes' : `/api/recipe-likes?recipe_id=${recipeId}&user_id=${user.id}`,
        action
      }, {
        toggleRequestId,
        recipeId,
        userId: user.id?.substring(0, 8) + '...',
        action,
        isCurrentlyLiked,
        currentStats: stats,
        recipeData: recipeData ? {
          id: recipeData.id,
          title: recipeData.title?.substring(0, 50),
          user_id: recipeData.user_id,
          likes_count: recipeData.likes_count
        } : null,
        userData: {
          id: user.id?.substring(0, 8) + '...',
          username: user.username
        },
        errorDetails: {
          name: err.name,
          message: err.message,
          stack: err.stack?.substring(0, 1000),
          status: err.status,
          code: err.code,
          requestId: err.requestId
        },
        browserContext: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        eventDetails: event ? {
          type: event.type,
          target: event.target?.tagName,
          clientX: event.clientX,
          clientY: event.clientY
        } : null
      })
      
      // Revert optimistic update on error
      setStats(prev => ({
        likes_count: prev.likes_count + (isCurrentlyLiked ? 1 : -1),
        user_has_liked: isCurrentlyLiked
      }))
      
      // Show more specific error messages
      let errorMessage = 'Impossible de mettre à jour le like. Réessayez.'
      if (err.status === 404) {
        errorMessage = 'Cette recette n\'existe plus.'
      } else if (err.status === 400) {
        errorMessage = 'Paramètres invalides. Rechargez la page.'
      } else if (err.status >= 500) {
        errorMessage = 'Erreur serveur. Réessayez plus tard.'
      }
      
      setError(errorMessage)
      
      // Show error animation
      if (event?.target) {
        event.target.style.animation = 'shake 0.3s ease-in-out'
        setTimeout(() => {
          if (event.target) event.target.style.animation = ''
        }, 300)
      }
    } finally {
      setLoading(false)
      setOptimisticLoading(false)
      setTimeout(() => setLastAction(null), 2000)
    }
  }, [loading, optimisticLoading, stats, recipeId, createHeartAnimation])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    optimisticLoading,
    stats,
    error,
    lastAction,
    toggleLike,
    clearError,
    showHeartAnimation,
    heartPosition
  }
}

// Component for floating heart animation
export function FloatingHeart({ show, position, onComplete }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 1000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        fontSize: '2rem',
        pointerEvents: 'none',
        zIndex: 10000,
        transform: 'translate(-50%, -50%)',
        animation: 'floatingHeart 1s ease-out forwards'
      }}
    >
      ❤️
    </div>
  )
}

/**
 * Detect suspicious like activity patterns
 * @param {Array} likes - Array of like objects with timestamps
 * @returns {Object} Analysis result with suspicious flag and reasons
 */
export function detectSuspiciousLikeActivity(likes) {
  let suspicious = false;
  const reasons = [];
  
  // Analyze timing patterns between consecutive likes
  const timestamps = likes.map(like => new Date(like.created_at).getTime()).sort();
  const timeDiffs = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    timeDiffs.push(timestamps[i] - timestamps[i-1]);
  }
  
  // Check for suspiciously regular intervals
  const avgDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
  const standardDeviation = Math.sqrt(
    timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / timeDiffs.length
  );
  
  // If standard deviation is very low compared to average, timing might be suspiciously regular
  const suspiciouslyRegular = standardDeviation / avgDiff < 0.1;
  
  if (suspiciouslyRegular && timeDiffs.length > 5) {
    suspicious = true
    reasons.push('Suspiciously regular timing')
  }

  return { suspicious, reasons, confidence: suspicious ? 'high' : 'low' }
}

/**
 * Format like count for display with appropriate abbreviations
 * @param {number} count - Number of likes
 * @returns {string} Formatted like count
 */
export function formatLikeCount(count) {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}k`
  return `${(count / 1000000).toFixed(1)}M`
}

/**
 * Get like insights for content creators
 * @param {Object} content - Content with like data
 * @returns {Object} Actionable insights
 */
export function getLikeInsights(content) {
  const { likes_count = 0, created_at, category } = content
  
  const insights = {
    performance: 'normal',
    recommendations: [],
    metrics: {
      likes_per_day: 0,
      engagement_rate: 0,
      category_performance: 'average'
    }
  }
  
  // Calculate likes per day since creation
  if (created_at) {
    const createdDate = new Date(created_at)
    const now = new Date()
    const daysSinceCreation = Math.max(1, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)))
    insights.metrics.likes_per_day = (likes_count / daysSinceCreation).toFixed(2)
  }
  
  // Performance analysis
  if (likes_count === 0) {
    insights.performance = 'needs_attention'
    insights.recommendations.push('Améliorer la présentation visuelle')
    insights.recommendations.push('Ajouter des hashtags pertinents')
  } else if (likes_count < 5) {
    insights.performance = 'growing'
    insights.recommendations.push('Partager sur les réseaux sociaux')
  } else if (likes_count >= 20) {
    insights.performance = 'excellent'
    insights.recommendations.push('Créer plus de contenu similaire')
  }
  
  return insights
}

/**
 * Fonction pour vérifier et corriger les incohérences de compteurs
 */
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
