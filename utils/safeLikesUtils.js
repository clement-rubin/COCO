import { supabase } from '../lib/supabase'
import { logError, logDebug, logInfo } from './logger'

/**
 * Vérifier si un utilisateur a liké une recette de façon sécurisée
 * @param {string} recipeId 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function safeCheckUserLike(recipeId, userId) {
  if (!recipeId || !userId) {
    return false
  }

  try {
    // Utiliser count pour éviter les erreurs 406
    const { count, error } = await supabase
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)

    if (error) {
      logError('Error checking user like safely', error, { recipeId, userId })
      return false
    }

    return (count || 0) > 0
  } catch (err) {
    logError('Exception checking user like safely', err, { recipeId, userId })
    return false
  }
}

/**
 * Compter les likes d'une recette de façon sécurisée
 * @param {string} recipeId 
 * @returns {Promise<number>}
 */
export async function safeCountRecipeLikes(recipeId) {
  if (!recipeId) {
    return 0
  }

  try {
    const { count, error } = await supabase
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipeId)

    if (error) {
      logError('Error counting recipe likes safely', error, { recipeId })
      return 0
    }

    return count || 0
  } catch (err) {
    logError('Exception counting recipe likes safely', err, { recipeId })
    return 0
  }
}

/**
 * Obtenir les statistiques de likes de façon sécurisée
 * @param {string} recipeId 
 * @param {string} userId - Optionnel
 * @returns {Promise<{likes_count: number, user_has_liked: boolean}>}
 */
export async function safeGetRecipeLikesStats(recipeId, userId = null) {
  try {
    const [likesCount, userHasLiked] = await Promise.all([
      safeCountRecipeLikes(recipeId),
      userId ? safeCheckUserLike(recipeId, userId) : Promise.resolve(false)
    ])

    return {
      likes_count: likesCount,
      user_has_liked: userHasLiked
    }
  } catch (err) {
    logError('Error getting recipe likes stats safely', err, { recipeId, userId })
    return {
      likes_count: 0,
      user_has_liked: false
    }
  }
}

/**
 * Obtenir les détails des likes pour une recette (qui a liké, quand)
 * @param {string} recipeId 
 * @param {number} limit 
 * @returns {Promise<{success: boolean, likes: Array, error?: string}>}
 */
export async function getRecipeLikesDetails(recipeId, limit = 10) {
  try {
    const response = await fetch(`/api/recipe-likes/details?recipe_id=${recipeId}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      success: true,
      likes: data.likes || [],
      total_count: data.total_count || 0
    }
  } catch (error) {
    logError('Error getting recipe likes details', error, { recipeId, limit })
    return {
      success: false,
      likes: [],
      total_count: 0,
      error: error.message
    }
  }
}

/**
 * Obtenir les statistiques de likes avec détails des derniers likeurs
 * @param {string} recipeId 
 * @param {string} userId - Optionnel
 * @returns {Promise<{likes_count: number, user_has_liked: boolean, recent_likers: Array}>}
 */
export async function safeGetRecipeLikesWithDetails(recipeId, userId = null) {
  try {
    const [stats, details] = await Promise.all([
      safeGetRecipeLikesStats(recipeId, userId),
      getRecipeLikesDetails(recipeId, 5) // Les 5 derniers likes
    ])

    return {
      likes_count: stats.likes_count,
      user_has_liked: stats.user_has_liked,
      recent_likers: details.success ? details.likes : [],
      total_likers: details.success ? details.total_count : 0
    }
  } catch (err) {
    logError('Error getting recipe likes with details safely', err, { recipeId, userId })
    return {
      likes_count: 0,
      user_has_liked: false,
      recent_likers: [],
      total_likers: 0
    }
  }
}
