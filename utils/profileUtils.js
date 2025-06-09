import { supabase } from '../lib/supabase'
import { logInfo, logWarning, logError, logDebug } from './logger'
import { checkAndUnlockTrophies, triggerTrophyCheck, checkTrophiesAfterProfileUpdate, getTrophyStats, syncTrophiesAfterAction } from './trophyUtils'

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
    // Essayer d'utiliser l'API optimisée si disponible
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/user-stats?user_id=${userId}`)
        if (response.ok) {
          const stats = await response.json()
          return {
            recipesCount: stats.recipesCount || 0,
            friendsCount: stats.friendsCount || 0,
            profileCompleteness: stats.profileCompleteness || 0,
            pendingSent: stats.pendingSent || 0,
            pendingReceived: stats.pendingReceived || 0
          }
        }
      } catch (apiError) {
        logWarning('API user-stats not available, using direct queries', apiError)
      }
    }

    // Fallback vers les requêtes directes optimisées
    const [recipesResult, friendshipResult, profileResult] = await Promise.allSettled([
      supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      supabase
        .rpc('get_friendship_stats', { target_user_id: userId }),
      
      supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, location, website')
        .eq('user_id', userId)
        .single()
    ])

    const stats = {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0,
      pendingSent: 0,
      pendingReceived: 0
    }

    // Traiter les résultats
    if (recipesResult.status === 'fulfilled' && !recipesResult.value.error) {
      stats.recipesCount = recipesResult.value.count || 0
    }

    if (friendshipResult.status === 'fulfilled' && !friendshipResult.value.error) {
      const friendshipData = friendshipResult.value.data
      if (friendshipData && friendshipData.length > 0) {
        stats.friendsCount = friendshipData[0].friends_count || 0
        stats.pendingSent = friendshipData[0].pending_sent || 0
        stats.pendingReceived = friendshipData[0].pending_received || 0
      }
    }

    if (profileResult.status === 'fulfilled' && !profileResult.value.error) {
      const profile = profileResult.value.data
      if (profile) {
        const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website']
        const filledFields = fields.filter(field => profile[field] && profile[field].trim())
        const profileCompleteness = Math.round((filledFields.length / fields.length) * 100)
        stats.profileCompleteness = profileCompleteness
      }
    }

    logInfo('User stats retrieved', {
      userId: userId.substring(0, 8) + '...',
      stats
    })

    return stats

  } catch (error) {
    logError('Error in getUserStats', error, { userId })
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

/**
 * Obtient l'ID du profil à partir de l'ID utilisateur
 * @param {string} userId - L'ID de l'utilisateur auth
 * @returns {Promise<string|null>} L'ID du profil ou null
 */
export async function getProfileIdFromUserId(userId) {
  if (!userId) {
    logWarning('getProfileIdFromUserId called without userId')
    return null
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Pas de profil trouvé, créer un profil par défaut
        const displayName = await getUserDisplayName(userId)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: displayName,
            is_private: false
          })
          .select('id')
          .single()

        if (createError) {
          logError('Error creating profile for user', createError, { userId })
          return null
        }

        return newProfile.id
      }
      
      logError('Error getting profile ID', error, { userId })
      return null
    }

    return profile.id
  } catch (error) {
    logError('Exception getting profile ID', error, { userId })
    return null
  }
}

/**
 * Vérifie si deux utilisateurs sont amis (version corrigée pour profiles.id)
 * @param {string} userId1 - Premier utilisateur (auth.users.id)
 * @param {string} userId2 - Deuxième utilisateur (auth.users.id)
 * @returns {Promise<Object>} Statut de l'amitié
 */
export async function getFriendshipStatusCorrected(userId1, userId2) {
  if (!userId1 || !userId2 || userId1 === userId2) {
    return { status: 'none', canSendRequest: false }
  }

  try {
    // Obtenir les IDs de profil
    const profileId1 = await getProfileIdFromUserId(userId1)
    const profileId2 = await getProfileIdFromUserId(userId2)

    if (!profileId1 || !profileId2) {
      logError('Could not get profile IDs for friendship check', null, { userId1, userId2 })
      return { status: 'error', canSendRequest: false }
    }

    const { data: friendship, error } = await supabase
      .from('friendships')
      .select('id, status, user_id, friend_id')
      .or(`and(user_id.eq.${profileId1},friend_id.eq.${profileId2}),and(user_id.eq.${profileId2},friend_id.eq.${profileId1})`)
      .maybeSingle()

    if (error) {
      logError('Error checking friendship status', error)
      return { status: 'error', canSendRequest: false }
    }

    if (!friendship) {
      return { status: 'none', canSendRequest: true }
    }

    return {
      status: friendship.status,
      canSendRequest: friendship.status === 'rejected',
      isRequester: friendship.user_id === profileId1,
      friendshipId: friendship.id
    }

  } catch (error) {
    logError('Exception while checking friendship status', error)
    return { status: 'error', canSendRequest: false }
  }
}

/**
 * Envoie une demande d'amitié (version corrigée)
 * @param {string} fromUserId - ID de l'utilisateur qui envoie (auth.users.id)
 * @param {string} toUserId - ID de l'utilisateur qui reçoit (auth.users.id)
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function sendFriendRequestCorrected(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { success: false, error: 'Invalid user IDs' }
  }

  try {
    // Obtenir les IDs de profil
    const fromProfileId = await getProfileIdFromUserId(fromUserId)
    const toProfileId = await getProfileIdFromUserId(toUserId)

    if (!fromProfileId || !toProfileId) {
      logError('Could not get profile IDs for friend request', null, { fromUserId, toUserId })
      return { success: false, error: 'Profile IDs not found' }
    }

    // Vérifier s'il existe déjà une relation
    const existingStatus = await getFriendshipStatusCorrected(fromUserId, toUserId)
    
    if (existingStatus.status !== 'none') {
      return { success: false, error: 'Friendship already exists' }
    }

    // Créer la demande d'amitié
    const { data: friendship, error } = await supabase
      .from('friendships')
      .insert({
        user_id: fromProfileId,
        friend_id: toProfileId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      logError('Error creating friendship', error, { fromProfileId, toProfileId })
      return { success: false, error: error.message }
    }

    logInfo('Friend request sent successfully', {
      friendshipId: friendship.id,
      fromUser: fromUserId.substring(0, 8) + '...',
      toUser: toUserId.substring(0, 8) + '...'
    })

    return { success: true, friendship }

  } catch (error) {
    logError('Exception while sending friend request', error, { fromUserId, toUserId })
    return { success: false, error: 'Server error' }
  }
}

/**
 * Obtient les statistiques complètes d'un utilisateur incluant les trophées
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques utilisateur avec trophées
 */
export async function getUserStatsComplete(userId) {
  try {
    // Statistiques de base
    const stats = {
      recipesCount: 0,
      likesReceived: 0,
      friendsCount: 0,
      profileCompleteness: 0,
      trophyPoints: 0,
      trophiesUnlocked: 0,
      latestTrophy: null
    }

    // Compter les recettes
    try {
      const { count: recipesCount, error: recipesError } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (!recipesError) {
        stats.recipesCount = recipesCount || 0
      }
    } catch (recipesErr) {
      logWarning('Could not fetch recipes count', recipesErr)
    }

    // Compter les amis
    try {
      const { count: friendsCount, error: friendsError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted')

      if (!friendsError) {
        stats.friendsCount = friendsCount || 0
      }
    } catch (friendsErr) {
      logWarning('Could not fetch friends count', friendsErr)
    }

    // Calculer complétude du profil
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, location, website')
        .eq('user_id', userId)
        .single()

      if (!profileError && profile) {
        const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website']
        const filledFields = fields.filter(field => profile[field] && profile[field].trim())
        stats.profileCompleteness = Math.round((filledFields.length / fields.length) * 100)
      }
    } catch (profileErr) {
      logWarning('Could not fetch profile completeness', profileErr)
    }

    // Statistiques des trophées améliorées
    try {
      const trophyStats = await getTrophyStats(userId)
      stats.trophyPoints = trophyStats.totalPoints
      stats.trophiesUnlocked = trophyStats.trophiesUnlocked
      stats.latestTrophy = trophyStats.latestTrophy
    } catch (trophyErr) {
      logWarning('Could not fetch trophy stats', trophyErr)
    }

    // Vérifier les nouveaux trophées automatiquement
    await checkAndUnlockTrophies(userId)

    return stats

  } catch (error) {
    logError('Error in getUserStatsComplete', error)
    return {
      recipesCount: 0,
      likesReceived: 0,
      friendsCount: 0,
      profileCompleteness: 0,
      trophyPoints: 0,
      trophiesUnlocked: 0,
      latestTrophy: null
    }
  }
}

/**
 * Met à jour le profil et synchronise les trophées
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} profileData - Données du profil à mettre à jour
 * @returns {Promise<{success: boolean, profile?: Object, newTrophies?: Array, error?: string}>}
 */
export async function updateProfileWithTrophySync(userId, profileData) {
  if (!userId || !profileData) {
    return { success: false, error: 'Invalid parameters' }
  }

  try {
    // Mettre à jour le profil
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      logError('Error updating profile', updateError)
      return { success: false, error: updateError.message }
    }

    // Synchroniser les trophées après mise à jour du profil
    const newTrophies = await syncTrophiesAfterAction(userId, 'profile_updated', profileData)

    logInfo('Profile updated with trophy sync', {
      userId: userId.substring(0, 8) + '...',
      newTrophiesCount: newTrophies.length
    })

    return {
      success: true,
      profile: updatedProfile,
      newTrophies
    }

  } catch (error) {
    logError('Error in updateProfileWithTrophySync', error)
    return { success: false, error: 'Server error' }
  }
}

/**
 * Envoie une demande d'amitié avec synchronisation des trophées
 * @param {string} fromUserId - ID de l'utilisateur qui envoie
 * @param {string} toUserId - ID de l'utilisateur qui reçoit
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function sendFriendRequestWithTrophySync(fromUserId, toUserId) {
  try {
    const result = await sendFriendRequestCorrected(fromUserId, toUserId)
    
    if (result.success) {
      // Synchroniser les trophées après l'envoi de la demande d'amitié
      const newTrophies = await syncTrophiesAfterAction(fromUserId, 'friend_request_sent', { toUserId })
      
      logInfo('Friend request sent with trophy sync', {
        fromUser: fromUserId.substring(0, 8) + '...',
        toUser: toUserId.substring(0, 8) + '...',
        newTrophiesCount: newTrophies.length
      })

      return {
        ...result,
        newTrophies
      }
    }

    return result

  } catch (error) {
    logError('Error in sendFriendRequestWithTrophySync', error)
    return { success: false, error: 'Server error' }
  }
}

/**
 * Vérifie si un utilisateur peut modifier/supprimer une recette
 * @param {string} recipeUserId - L'ID du propriétaire de la recette
 * @param {string} currentUserId - L'ID de l'utilisateur actuel
 * @returns {boolean} True si l'utilisateur peut modifier la recette
 */
export function canUserEditRecipe(recipeUserId, currentUserId) {
  if (!recipeUserId || !currentUserId) {
    logWarning('canUserEditRecipe called with missing parameters', { recipeUserId, currentUserId })
    return false
  }

  const canEdit = recipeUserId === currentUserId
  
  logDebug('Recipe edit permission check', {
    recipeUserId: recipeUserId.substring(0, 8) + '...',
    currentUserId: currentUserId.substring(0, 8) + '...',
    canEdit
  })

  return canEdit
}

/**
 * Vérifie si un utilisateur peut commenter (actuellement tous les utilisateurs connectés)
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {boolean} True si l'utilisateur peut commenter
 */
export function canUserComment(userId) {
  if (!userId) {
    logWarning('canUserComment called with missing userId')
    return false
  }
  
  // Tous les utilisateurs connectés peuvent commenter
  return true
}

/**
 * Supprime une recette de l'utilisateur
 * @param {string} recipeId - L'ID de la recette
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteUserRecipe(recipeId, userId) {
  if (!recipeId || !userId) {
    logWarning('deleteUserRecipe called with missing parameters', { recipeId, userId })
    return false
  }

  try {
    // Vérifier que la recette appartient bien à l'utilisateur
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select('user_id, title')
      .eq('id', recipeId)
      .single()

    if (fetchError) {
      logError('Error fetching recipe for deletion', fetchError, { recipeId, userId })
      return false
    }

    if (!recipe || recipe.user_id !== userId) {
      logWarning('User attempted to delete recipe they do not own', {
        recipeId,
        recipeOwnerId: recipe?.user_id,
        requestingUserId: userId
      })
      return false
    }

    // Supprimer la recette
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId) // Double vérification

    if (deleteError) {
      logError('Error deleting recipe', deleteError, { recipeId, userId })
      return false
    }

    logInfo('Recipe deleted successfully', {
      recipeId,
      userId: userId.substring(0, 8) + '...',
      recipeTitle: recipe.title
    })

    return true

  } catch (error) {
    logError('Exception while deleting recipe', error, { recipeId, userId })
    return false
  }
}
