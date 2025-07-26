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
  if (!recipeId) {
    return { likes_count: 0, user_has_liked: false }
  }

  try {
    // Importer supabase et logError depuis les autres fichiers
    const { supabase } = await import('../lib/supabase')
    const { logError } = await import('./logger')

    // Compter les likes totaux
    const { count, error: countError } = await supabase
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipeId)

    if (countError) {
      logError('Error counting recipe likes safely', countError, { recipeId })
      return { likes_count: 0, user_has_liked: false }
    }

    const likesCount = count || 0
    let userHasLiked = false

    // Vérifier si l'utilisateur a liké (si connecté)
    if (userId) {
      const { data: userLike, error: userError } = await supabase
        .from('recipe_likes')
        .select('id')
        .eq('recipe_id', recipeId)
        .eq('user_id', userId)
        .limit(1)

      if (!userError && userLike && userLike.length > 0) {
        userHasLiked = true
      }
    }

    return {
      likes_count: likesCount,
      user_has_liked: userHasLiked
    }

  } catch (err) {
    const { logError } = await import('./logger')
    logError('Exception getting recipe likes stats safely', err, { recipeId, userId })
    return { likes_count: 0, user_has_liked: false }
  }
}
