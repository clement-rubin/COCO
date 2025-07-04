import { logInfo, logError, logDebug } from './logger'
import { showRecipeLikeInteractionNotification } from './notificationUtils'
import { useState, useEffect } from 'react'

/**
 * Utility functions pour gérer les likes des recettes
 */

/**
 * Obtenir les statistiques de likes pour une recette
 */
export async function getRecipeLikesStats(recipeId) {
  try {
    const response = await fetch(`/api/recipe-likes?recipe_id=${recipeId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      likes_count: data.likes_count || 0,
      user_has_liked: data.user_has_liked || false
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
  try {
    logDebug('Adding like to recipe', {
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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
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
      previousCount: recipe?.likes_count || 0
    })

    return {
      success: true,
      like: data.like,
      stats: data.stats
    }
  } catch (error) {
    logError('Error adding recipe like', error, {
      recipeId,
      userId: userId?.substring(0, 8) + '...'
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Supprimer un like d'une recette
 */
export async function removeRecipeLike(recipeId, userId) {
  try {
    logDebug('Removing like from recipe', {
      recipeId,
      userId: userId?.substring(0, 8) + '...'
    })

    const response = await fetch(`/api/recipe-likes?recipe_id=${recipeId}&user_id=${userId}`, {
      method: 'DELETE'
    })

    const data = await response.json()

    if (!response.ok) {
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
    logError('Error removing recipe like', error, {
      recipeId,
      userId: userId?.substring(0, 8) + '...'
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
 * Hook React pour gérer les likes d'une recette
 */
export function useRecipeLikes(recipeId, initialStats = null) {
  const [likesStats, setLikesStats] = useState(
    initialStats || { likes_count: 0, user_has_liked: false }
  )
  const [loading, setLoading] = useState(false)

  // Charger les statistiques initiales
  useEffect(() => {
    if (recipeId && !initialStats) {
      loadLikesStats()
    }
  }, [recipeId])

  const loadLikesStats = async () => {
    setLoading(true)
    try {
      const result = await getRecipeLikesStats(recipeId)
      if (result.success) {
        setLikesStats({
          likes_count: result.likes_count,
          user_has_liked: result.user_has_liked
        })
      }
    } catch (error) {
      logError('Error loading likes stats in hook', error, { recipeId })
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = async (userId, recipe = null, user = null) => {
    if (loading) return

    setLoading(true)
    try {
      const result = await toggleRecipeLike(
        recipeId, 
        userId, 
        likesStats.user_has_liked,
        recipe,
        user
      )
      
      if (result.success && result.stats) {
        setLikesStats({
          likes_count: result.stats.likes_count,
          user_has_liked: result.stats.user_has_liked
        })
      }
      
      return result
    } finally {
      setLoading(false)
    }
  }
  return {
    likesStats,
    loading,
    toggleLike,
    refresh: loadLikesStats
  }
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
  const { likes = [], views = 0, shares = 0 } = content
  
  const analytics = getLikeAnalytics(likes)
  const velocity = calculateLikeVelocity(likes)
  const engagementRate = views > 0 ? (likes.length / views) * 100 : 0
  
  const insights = []
  
  if (analytics.trend === 'rising') {
    insights.push({
      type: 'positive',
      message: 'Votre contenu gagne en popularité ! 📈',
      suggestion: 'Continuez sur cette lancée en publiant du contenu similaire.'
    })
  }
  
  if (velocity > 5) {
    insights.push({
      type: 'positive',
      message: 'Excellent taux d\'engagement ! 🔥',
      suggestion: 'Votre contenu est viral. Profitez-en pour interagir avec votre audience.'
    })
  }
  
  if (engagementRate < 2) {
    insights.push({
      type: 'improvement',
      message: 'Le taux d\'engagement pourrait être amélioré 🎯',
      suggestion: 'Essayez des titres plus accrocheurs ou publiez à des heures différentes.'
    })
  }
  
  if (analytics.peakHour !== null) {
    insights.push({
      type: 'info',
      message: `Votre audience est plus active à ${analytics.peakHour}h ⏰`,
      suggestion: 'Planifiez vos publications à cette heure pour plus d\'impact.'
    })
  }
  
  return {
    analytics,
    velocity,
    engagementRate: Math.round(engagementRate * 10) / 10,
    insights
  }
}
