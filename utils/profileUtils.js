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

    // Utiliser la fonction SQL corrigée pour obtenir les statistiques d'amitié
    const { data: friendshipStats, error: friendshipError } = await supabase
      .rpc('get_friendship_stats', { target_user_id: userId })

    let totalFriendsCount = 0
    let pendingSent = 0
    let pendingReceived = 0
    
    if (!friendshipError && friendshipStats && friendshipStats.length > 0) {
      totalFriendsCount = friendshipStats[0].friends_count || 0
      pendingSent = friendshipStats[0].pending_sent || 0
      pendingReceived = friendshipStats[0].pending_received || 0
    } else if (friendshipError) {
      logWarning('Error getting friendship stats, using fallback', friendshipError)
      // Fallback direct query
      try {
        const { count: friendsCount } = await supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .or(`and(user_id.eq.${userId},status.eq.accepted),and(friend_id.eq.${userId},status.eq.accepted)`)
        totalFriendsCount = friendsCount || 0
      } catch (fallbackError) {
        logError('Fallback friends count failed', fallbackError)
      }
    }

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

    return {
      recipesCount: recipesCount || 0,
      friendsCount: totalFriendsCount,
      profileCompleteness,
      pendingSent,
      pendingReceived
    }

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
 * Obtient les statistiques d'un utilisateur (version corrigée)
 * @param {string} userId - L'ID de l'utilisateur (auth.users.id)
 * @returns {Promise<Object>} Statistiques de l'utilisateur
 */
export async function getUserStatsCorrected(userId) {
  if (!userId) {
    logWarning('getUserStatsCorrected called without userId')
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0
    }
  }

  try {
    // Obtenir l'ID du profil
    const profileId = await getProfileIdFromUserId(userId)
    
    if (!profileId) {
      return {
        recipesCount: 0,
        friendsCount: 0,
        profileCompleteness: 0
      }
    }

    // Compter les recettes
    const { count: recipesCount } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Compter les amis - utiliser profiles.id
    const { count: friendsCount1 } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('status', 'accepted')

    const { count: friendsCount2 } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('friend_id', profileId)
      .eq('status', 'accepted')

    const totalFriendsCount = (friendsCount1 || 0) + (friendsCount2 || 0)

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
      friendsCount: totalFriendsCount,
      profileCompleteness
    }

    logInfo('User stats retrieved (corrected)', {
      userId: userId.substring(0, 8) + '...',
      stats
    })

    return stats

  } catch (error) {
    logError('Error getting user stats (corrected)', error, {
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
 * Bloque un utilisateur
 * @param {string} fromUserId - ID de l'utilisateur qui bloque (auth.users.id)
 * @param {string} toUserId - ID de l'utilisateur à bloquer (auth.users.id)
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function blockUser(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { success: false, error: 'Invalid user IDs' }
  }

  try {
    // Vérifier si une relation existe déjà
    const { data: existingFriendship, error: checkError } = await supabase
      .rpc('check_friendship_status', {
        user1_id: fromUserId,
        user2_id: toUserId
      })

    if (existingFriendship && existingFriendship.length > 0) {
      // Mettre à jour la relation existante
      const { error: updateError } = await supabase
        .from('friendships')
        .update({ 
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFriendship[0].friendship_id)

      if (updateError) {
        throw updateError
      }
    } else {
      // Créer une nouvelle relation de blocage
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: fromUserId,
          friend_id: toUserId,
          status: 'blocked',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        throw insertError
      }
    }

    logInfo('User blocked successfully', { fromUserId, toUserId })
    return { success: true }

  } catch (error) {
    logError('Error blocking user', error, { fromUserId, toUserId })
    return { success: false, error: error.message }
  }
}

/**
 * Débloque un utilisateur
 * @param {string} fromUserId - ID de l'utilisateur qui débloque (auth.users.id)
 * @param {string} toUserId - ID de l'utilisateur à débloquer (auth.users.id)
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function unblockUser(fromUserId, toUserId) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return { success: false, error: 'Invalid user IDs' }
  }

  try {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', fromUserId)
      .eq('friend_id', toUserId)
      .eq('status', 'blocked')

    if (error) {
      throw error
    }

    logInfo('User unblocked successfully', { fromUserId, toUserId })
    return { success: true }

  } catch (error) {
    logError('Error unblocking user', error, { fromUserId, toUserId })
    return { success: false, error: error.message }
  }
}

/**
 * Obtient la liste des utilisateurs bloqués
 * @param {string} userId - L'ID de l'utilisateur (auth.users.id)
 * @returns {Promise<Array>} Liste des utilisateurs bloqués
 */
export async function getBlockedUsers(userId) {
  if (!userId) {
    return []
  }

  try {
    const { data, error } = await supabase
      .rpc('get_blocked_users', { user_id_param: userId })

    if (error) {
      logError('Error getting blocked users', error, { userId })
      return []
    }

    return data || []

  } catch (error) {
    logError('Exception getting blocked users', error, { userId })
    return []
  }
}

/**
 * Vérifie si un utilisateur est bloqué
 * @param {string} fromUserId - Premier utilisateur (auth.users.id)
 * @param {string} toUserId - Deuxième utilisateur (auth.users.id)
 * @returns {Promise<boolean>} True si bloqué
 */
export async function isUserBlocked(fromUserId, toUserId) {
  if (!fromUserId || !toUserId) {
    return false
  }

  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId},status.eq.blocked),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId},status.eq.blocked)`)
      .maybeSingle()

    if (error) {
      logError('Error checking if user is blocked', error)
      return false
    }

    return !!data

  } catch (error) {
    logError('Exception checking if user is blocked', error)
    return false
  }
}

/**
 * Crée une notification pour un utilisateur
 * @param {string} userId - ID de l'utilisateur destinataire
 * @param {string} type - Type de notification
 * @param {string} message - Message de la notification
 * @param {Object} metadata - Métadonnées additionnelles
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function createNotification(userId, type, message, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        message,
        metadata,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    logInfo('Notification created', { userId, type, notificationId: data.id })
    return { success: true, notification: data }

  } catch (error) {
    logError('Error creating notification', error, { userId, type })
    return { success: false, error: error.message }
  }
}

/**
 * Obtient les notifications non lues d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @param {number} limit - Limite de résultats
 * @returns {Promise<Array>} Liste des notifications
 */
export async function getUnreadNotifications(userId, limit = 20) {
  if (!userId) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return data || []

  } catch (error) {
    logError('Error getting unread notifications', error, { userId })
    return []
  }
}

/**
 * Marque une notification comme lue
 * @param {string} notificationId - ID de la notification
 * @returns {Promise<Object>} Résultat de l'opération
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      throw error
    }

    return { success: true }

  } catch (error) {
    logError('Error marking notification as read', error, { notificationId })
    return { success: false, error: error.message }
  }
}

/**
 * Recherche avancée d'utilisateurs avec filtres
 * @param {string} query - Terme de recherche
 * @param {Object} filters - Filtres de recherche
 * @param {number} limit - Nombre maximum de résultats
 * @returns {Promise<Array>} Liste des utilisateurs trouvés
 */
export async function searchUsersAdvanced(query, filters = {}, limit = 20) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return []
  }

  try {
    const {
      location = null,
      hasAvatar = null,
      isOnline = null,
      excludeBlocked = true,
      sortBy = 'display_name'
    } = filters

    let queryBuilder = supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        bio,
        avatar_url,
        location,
        is_private,
        last_seen,
        created_at
      `)
      .eq('is_private', false)
      .ilike('display_name', `%${query.trim()}%`)

    // Appliquer les filtres
    if (location) {
      queryBuilder = queryBuilder.ilike('location', `%${location}%`)
    }

    if (hasAvatar !== null) {
      if (hasAvatar) {
        queryBuilder = queryBuilder.not('avatar_url', 'is', null)
      } else {
        queryBuilder = queryBuilder.is('avatar_url', null)
      }
    }

    if (isOnline !== null) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      if (isOnline) {
        queryBuilder = queryBuilder.gte('last_seen', fiveMinutesAgo)
      } else {
        queryBuilder = queryBuilder.lt('last_seen', fiveMinutesAgo)
      }
    }

    // Trier les résultats
    queryBuilder = queryBuilder.order(sortBy, { ascending: true }).limit(limit)

    const { data, error } = await queryBuilder

    if (error) {
      throw error
    }

    let results = data || []

    // Exclure les utilisateurs bloqués si demandé
    if (excludeBlocked && results.length > 0) {
      const currentUser = await supabase.auth.getUser()
      if (currentUser.data.user) {
        const blockedUsers = await getBlockedUsers(currentUser.data.user.id)
        const blockedUserIds = blockedUsers.map(u => u.user_id)
        results = results.filter(user => !blockedUserIds.includes(user.user_id))
      }
    }

    return results

  } catch (error) {
    logError('Error in advanced user search', error, { query, filters })
    return []
  }
}

/**
 * Obtient des suggestions d'amis intelligentes
 * @param {string} userId - L'ID de l'utilisateur
 * @param {number} limit - Nombre de suggestions
 * @returns {Promise<Array>} Liste des suggestions
 */
export async function getIntelligentFriendSuggestions(userId, limit = 10) {
  if (!userId) {
    return []
  }

  try {
    // Utiliser une fonction SQL pour des suggestions intelligentes
    const { data, error } = await supabase
      .rpc('get_intelligent_friend_suggestions', {
        user_id_param: userId,
        limit_param: limit
      })

    if (error) {
      // Fallback vers des suggestions simples
      return await getSimpleFriendSuggestions(userId, limit)
    }

    return data || []

  } catch (error) {
    logError('Error getting intelligent friend suggestions', error, { userId })
    return await getSimpleFriendSuggestions(userId, limit)
  }
}

/**
 * Suggestions d'amis simples (fallback)
 * @param {string} userId - L'ID de l'utilisateur
 * @param {number} limit - Nombre de suggestions
 * @returns {Promise<Array>} Liste des suggestions
 */
async function getSimpleFriendSuggestions(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio, avatar_url, location')
      .neq('user_id', userId)
      .eq('is_private', false)
      .limit(limit)

    if (error) {
      throw error
    }

    return data || []

  } catch (error) {
    logError('Error getting simple friend suggestions', error, { userId })
    return []
  }
}

/**
 * Met à jour le statut "dernière vue" d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<void>}
 */
export async function updateLastSeen(userId) {
  if (!userId) return

  try {
    await supabase
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', userId)

  } catch (error) {
    logError('Error updating last seen', error, { userId })
  }
}

/**
 * Vérifie si un utilisateur est en ligne
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<boolean>} True si en ligne
 */
export async function isUserOnline(userId) {
  if (!userId) return false

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_seen')
      .eq('user_id', userId)
      .single()

    if (error || !data.last_seen) {
      return false
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const lastSeen = new Date(data.last_seen)

    return lastSeen > fiveMinutesAgo

  } catch (error) {
    logError('Error checking if user is online', error, { userId })
    return false
  }
}

/**
 * Ajoute une interaction à l'historique
 * @param {string} userId - ID de l'utilisateur qui initie
 * @param {string} targetUserId - ID de l'utilisateur cible
 * @param {string} type - Type d'interaction
 * @param {Object} metadata - Métadonnées
 * @returns {Promise<void>}
 */
export async function addInteractionHistory(userId, targetUserId, type, metadata = {}) {
  try {
    await supabase
      .from('interaction_history')
      .insert({
        user_id: userId,
        target_user_id: targetUserId,
        interaction_type: type,
        metadata,
        created_at: new Date().toISOString()
      })

  } catch (error) {
    logError('Error adding interaction history', error, { userId, targetUserId, type })
  }
}
