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
