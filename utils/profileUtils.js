import { supabase } from '../lib/supabase'
import { logInfo, logWarning, logError } from './logger'

/**
 * Récupère le nom d'affichage d'un utilisateur depuis son profil
 * @param {string} userId - L'ID de l'utilisateur
 * @param {string} fallbackName - Nom de fallback si aucun profil trouvé
 * @returns {Promise<string>} Le nom d'affichage de l'utilisateur
 */
export async function getUserDisplayName(userId, fallbackName = 'Chef Anonyme') {
  if (!userId || typeof userId !== 'string') {
    logWarning('getUserDisplayName called with invalid userId', { userId, fallbackName })
    return fallbackName
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', userId.trim())
      .single()

    if (error) {
      logWarning('Error fetching user profile for display name', {
        userId: userId.substring(0, 8) + '...',
        error: error.message,
        fallbackUsed: fallbackName
      })
      return fallbackName
    }

    if (!profile) {
      logWarning('No profile found for user', {
        userId: userId.substring(0, 8) + '...',
        fallbackUsed: fallbackName
      })
      return fallbackName
    }

    // Prioriser display_name, puis email (partie avant @), puis fallback
    const displayName = profile.display_name || 
                       (profile.email ? profile.email.split('@')[0] : null) ||
                       fallbackName

    logInfo('User display name retrieved', {
      userId: userId.substring(0, 8) + '...',
      displayName,
      source: profile.display_name ? 'display_name' : profile.email ? 'email' : 'fallback',
      hasDisplayName: !!profile.display_name,
      hasEmail: !!profile.email
    })

    return displayName

  } catch (error) {
    logError('Exception while fetching user display name', error, {
      userId: userId.substring(0, 8) + '...',
      fallbackUsed: fallbackName
    })
    return fallbackName
  }
}

/**
 * Met à jour le champ author d'une recette avec le nom du profil utilisateur
 * @param {string} recipeId - L'ID de la recette
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<boolean>} True si la mise à jour a réussi
 */
export async function updateRecipeAuthor(recipeId, userId) {
  if (!recipeId || !userId) {
    logWarning('updateRecipeAuthor called with missing parameters', { recipeId, userId })
    return false
  }

  try {
    const displayName = await getUserDisplayName(userId)
    
    const { error } = await supabase
      .from('recipes')
      .update({ author: displayName })
      .eq('id', recipeId)

    if (error) {
      logError('Error updating recipe author', error, {
        recipeId,
        userId: userId.substring(0, 8) + '...',
        displayName
      })
      return false
    }

    logInfo('Recipe author updated successfully', {
      recipeId,
      userId: userId.substring(0, 8) + '...',
      newAuthor: displayName
    })

    return true

  } catch (error) {
    logError('Exception while updating recipe author', error, {
      recipeId,
      userId: userId.substring(0, 8) + '...'
    })
    return false
  }
}

/**
 * Batch update des auteurs pour toutes les recettes d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<number>} Nombre de recettes mises à jour
 */
export async function updateAllUserRecipeAuthors(userId) {
  if (!userId) {
    logWarning('updateAllUserRecipeAuthors called without userId')
    return 0
  }

  try {
    const displayName = await getUserDisplayName(userId)
    
    const { count, error } = await supabase
      .from('recipes')
      .update({ author: displayName })
      .eq('user_id', userId)
      .select('*', { count: 'exact', head: true })

    if (error) {
      logError('Error batch updating recipe authors', error, {
        userId: userId.substring(0, 8) + '...',
        displayName
      })
      return 0
    }

    logInfo('Batch update of recipe authors completed', {
      userId: userId.substring(0, 8) + '...',
      updatedCount: count,
      newAuthor: displayName
    })

    return count || 0

  } catch (error) {
    logError('Exception during batch update of recipe authors', error, {
      userId: userId.substring(0, 8) + '...'
    })
    return 0
  }
}

/**
 * Recherche d'utilisateurs par nom d'affichage
 * @param {string} query - Terme de recherche
 * @param {number} limit - Nombre maximum de résultats
 * @returns {Promise<Array>} Liste des utilisateurs trouvés
 */
export async function searchUsersByDisplayName(query, limit = 10) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    logWarning('searchUsersByDisplayName called with invalid query', { query, limit })
    return []
  }

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio, avatar_url, created_at, is_private')
      .ilike('display_name', `%${query.trim()}%`)
      .eq('is_private', false)
      .order('display_name', { ascending: true })
      .limit(limit)

    if (error) {
      logError('Error searching users by display name', error, {
        query: query.substring(0, 20) + '...',
        limit
      })
      return []
    }

    logInfo('User search completed', {
      query: query.substring(0, 20) + '...',
      resultsCount: users?.length || 0,
      limit
    })

    return users || []

  } catch (error) {
    logError('Exception while searching users', error, {
      query: query.substring(0, 20) + '...',
      limit
    })
    return []
  }
}

/**
 * Obtient les statistiques d'un utilisateur incluant ses amis
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques de l'utilisateur
 */
export async function getUserStats(userId) {
  if (!userId) {
    logWarning('getUserStats called without userId')
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0
    }
  }

  try {
    // Compter les recettes
    const { count: recipesCount } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Compter les amis
    const { count: friendsCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted')

    // Obtenir le profil pour calculer la complétude
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, location, website')
      .eq('user_id', userId)
      .single()

    let profileCompleteness = 0
    if (profile) {
      const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website']
      const filledFields = fields.filter(field => profile[field] && profile[field].trim())
      profileCompleteness = Math.round((filledFields.length / fields.length) * 100)
    }

    const stats = {
      recipesCount: recipesCount || 0,
      friendsCount: friendsCount || 0,
      profileCompleteness
    }

    logInfo('User stats retrieved', {
      userId: userId.substring(0, 8) + '...',
      stats
    })

    return stats

  } catch (error) {
    logError('Exception while getting user stats', error, {
      userId: userId.substring(0, 8) + '...'
    })
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0
    }
  }
}

/**
 * Vérifie si deux utilisateurs sont amis
 * @param {string} userId1 - Premier utilisateur
 * @param {string} userId2 - Deuxième utilisateur
 * @returns {Promise<Object>} Statut de l'amitié
 */
export async function getFriendshipStatus(userId1, userId2) {
  if (!userId1 || !userId2 || userId1 === userId2) {
    return { status: 'none', canSendRequest: false }
  }

  try {
    // First check if friendships table exists
    const { data: friendship, error } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`)
      .maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        // Table doesn't exist, return can send request
        return { status: 'none', canSendRequest: true }
      }
      logError('Error checking friendship status', error)
      return { status: 'error', canSendRequest: false }
    }

    if (!friendship) {
      return { status: 'none', canSendRequest: true }
    }

    logInfo('Friendship status checked', {
      user1: userId1.substring(0, 8) + '...',
      user2: userId2.substring(0, 8) + '...',
      status: friendship.status
    })

    return {
      status: friendship.status,
      canSendRequest: friendship.status === 'rejected',
      isRequester: friendship.user_id === userId1,
      friendshipId: friendship.id
    }

  } catch (error) {
    logError('Exception while checking friendship status', error)
    return { status: 'error', canSendRequest: false }
  }
}
