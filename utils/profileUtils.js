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
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0
    }
  }

  try {
    // Récupérer le vrai nombre d'amis depuis la base de données
    const { data: friendshipsData, error: friendsError } = await supabase
      .from('friendships')
      .select('id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted')

    // Récupérer le nombre de recettes
    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)

    // Récupérer les données du profil pour calculer la complétude
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, location, website, phone, date_of_birth')
      .eq('user_id', userId)
      .single()

    let profileCompleteness = 0
    if (profileData) {
      const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website', 'phone', 'date_of_birth']
      const completedFields = fields.filter(field => 
        profileData[field] && 
        typeof profileData[field] === 'string' && 
        profileData[field].trim().length > 0
      )
      profileCompleteness = Math.round((completedFields.length / fields.length) * 100)
    }

    return {
      recipesCount: recipesData?.length || 0,
      friendsCount: friendshipsData?.length || 0,
      profileCompleteness,
      likesReceived: 0, // À implémenter plus tard
      trophyPoints: 0,
      trophiesUnlocked: 0
    }
  } catch (error) {
    console.error('Error getting user stats:', error)
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

    // CORRECTION: Utiliser safeCountQuery au lieu de count avec head
    const { safeCountQuery } = await import('./supabaseUtils')
    
    // Compter les recettes
    try {
      const recipesCount = await safeCountQuery('recipes', { user_id: userId })
      stats.recipesCount = recipesCount || 0
    } catch (recipesErr) {
      logWarning('Could not fetch recipes count', recipesErr)
    }

    // Compter les amis
    try {
      const friendsCount = await safeCountQuery('friendships', { 
        user_id: userId, 
        status: 'accepted' 
      })
      // Note: Cette requête pourrait ne pas fonctionner avec OR, donc fallback
      if (friendsCount === 0) {
        // Essayer la méthode alternative
        const { data: friendsData } = await supabase
          .from('friendships')
          .select('id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted')
        
        stats.friendsCount = friendsData?.length || 0
      } else {
        stats.friendsCount = friendsCount
      }
    } catch (friendsErr) {
      logWarning('Could not fetch friends count', friendsErr)
    }

    // Récupérer les données du profil pour calculer la complétude
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, location, website, phone, date_of_birth')
      .eq('user_id', userId)
      .single()

    let profileCompleteness = 0
    if (profileData) {
      const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website', 'phone', 'date_of_birth']
      const completedFields = fields.filter(field => 
        profileData[field] && 
        typeof profileData[field] === 'string' && 
        profileData[field].trim().length > 0
      )
      profileCompleteness = Math.round((completedFields.length / fields.length) * 100)
    }

    return {
      recipesCount: stats.recipesCount,
      friendsCount: stats.friendsCount,
      profileCompleteness,
      likesReceived: 0, // À implémenter plus tard
      trophyPoints: 0,
      trophiesUnlocked: 0
    }
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
 * Met à jour le profil et vérifie les nouveaux trophées
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} profileData - Données du profil à mettre à jour
 * @returns {Promise<{success: boolean, profile?: Object, newTrophies?: Array, error?: string}>}
 */
export async function updateProfileWithTrophySync(userId, profileData) {
  try {
    // Mettre à jour le profil via l'API
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        ...profileData
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update profile')
    }

    const updatedProfile = await response.json()

    // Vérifier les nouveaux trophées après la mise à jour
    let newTrophies = []
    try {
      const { checkAndUnlockTrophies } = await import('./trophyUtils')
      newTrophies = await checkAndUnlockTrophies(userId)
    } catch (trophyError) {
      console.warn('Could not check trophies after profile update:', trophyError)
    }

    return {
      success: true,
      profile: updatedProfile,
      newTrophies: newTrophies || []
    }
  } catch (error) {
    console.error('Error updating profile with trophy sync:', error)
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    }
  }
}

/**
 * Met à jour le profil avec validation avancée
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} profileData - Données du profil à mettre à jour
 * @returns {Promise<{success: boolean, profile?: Object, validation?: Object, error?: string}>}
 */
export async function updateProfileWithValidation(userId, profileData) {
  try {
    // Validation côté client
    const validation = validateProfileData(profileData)
    
    if (!validation.isValid) {
      return {
        success: false,
        validation,
        error: 'Données du profil invalides'
      }
    }

    // Nettoyer et formater les données
    const cleanedData = cleanProfileData(profileData)

    // Mettre à jour le profil
    const result = await updateProfileWithTrophySync(userId, cleanedData)
    
    return {
      ...result,
      validation
    }
  } catch (error) {
    console.error('Error in updateProfileWithValidation:', error)
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    }
  }
}

/**
 * Valide les données du profil
 * @param {Object} profileData - Données du profil
 * @returns {Object} Résultat de la validation
 */
function validateProfileData(profileData) {
  const errors = {}
  const warnings = []

  // Validation du nom d'affichage
  if (profileData.display_name) {
    const name = profileData.display_name.trim()
    if (name.length < 2) {
      errors.display_name = 'Le nom doit contenir au moins 2 caractères'
    } else if (name.length > 30) {
      errors.display_name = 'Le nom ne peut pas dépasser 30 caractères'
    } else if (!/^[a-zA-ZÀ-ÿ0-9_\-\s]+$/.test(name)) {
      errors.display_name = 'Le nom contient des caractères non autorisés'
    }
  }

  // Validation de la bio
  if (profileData.bio && profileData.bio.trim().length > 500) {
    errors.bio = 'La biographie ne peut pas dépasser 500 caractères'
  }

  // Validation du site web
  if (profileData.website) {
    const website = profileData.website.trim()
    if (website && !isValidUrl(website)) {
      errors.website = 'L\'URL du site web n\'est pas valide'
    }
  }

  // Validation du téléphone
  if (profileData.phone) {
    const phone = profileData.phone.trim()
    if (phone && !isValidPhone(phone)) {
      warnings.push('Le numéro de téléphone semble invalide')
    }
  }

  // Validation de la date de naissance
  if (profileData.date_of_birth) {
    const birthDate = new Date(profileData.date_of_birth)
    const now = new Date()
    const age = now.getFullYear() - birthDate.getFullYear()
    
    if (age < 13) {
      errors.date_of_birth = 'Vous devez avoir au moins 13 ans'
    } else if (age > 120) {
      errors.date_of_birth = 'Date de naissance invalide'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

/**
 * Nettoie et formate les données du profil
 * @param {Object} profileData - Données du profil
 * @returns {Object} Données nettoyées
 */
function cleanProfileData(profileData) {
  const cleaned = {}

  // Nettoyer les chaînes de caractères
  const stringFields = ['display_name', 'bio', 'location', 'website', 'phone']
  stringFields.forEach(field => {
    if (profileData[field] !== undefined) {
      const value = typeof profileData[field] === 'string' 
        ? profileData[field].trim() 
        : profileData[field]
      cleaned[field] = value || null
    }
  })

  // Gérer les booléens
  if (profileData.is_private !== undefined) {
    cleaned.is_private = Boolean(profileData.is_private)
  }

  // Gérer la date de naissance
  if (profileData.date_of_birth) {
    cleaned.date_of_birth = profileData.date_of_birth
  }

  return cleaned
}

/**
 * Vérifie si une URL est valide
 * @param {string} url - URL à vérifier
 * @returns {boolean} True si l'URL est valide
 */
function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Vérifie si un numéro de téléphone est valide
 * @param {string} phone - Numéro de téléphone à vérifier
 * @returns {boolean} True si le numéro semble valide
 */
function isValidPhone(phone) {
  // Regex simple pour les numéros de téléphone internationaux
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

/**
 * Vérifie si un utilisateur peut éditer une recette
 * @param {string} recipeUserId - L'ID de l'utilisateur propriétaire de la recette
 * @param {string} currentUserId - L'ID de l'utilisateur courant
 * @returns {boolean} True si l'utilisateur peut éditer
 */
export function canUserEditRecipe(recipeUserId, currentUserId) {
  if (!recipeUserId || !currentUserId) {
    return false
  }
  return recipeUserId === currentUserId
}

/**
 * Supprime une recette de l'utilisateur
 * @param {string} recipeId - L'ID de la recette
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteUserRecipe(recipeId, userId) {
  if (!recipeId || !userId) {
    return false
  }
  
  try {
    // Vérifier que la recette appartient à l'utilisateur
    if (!canUserEditRecipe(recipeId, userId)) {
      return false
    }
    
    const response = await fetch(`/api/recipes?id=${recipeId}&user_id=${userId}`, {
      method: 'DELETE'
    })
    
    return response.ok
  } catch (error) {
    console.error('Erreur lors de la suppression de la recette:', error)
    return false
  }
}

/**
 * Vérifie si un utilisateur peut participer aux concours
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {boolean} True si l'utilisateur peut participer
 */
export function canUserParticipateInContests(userId) {
  return !!(userId && typeof userId === 'string' && userId.trim().length > 0)
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
 * Vérifie si un utilisateur peut modifier/supprimer un commentaire
 * @param {string} commentUserId - L'ID du propriétaire du commentaire
 * @param {string} currentUserId - L'ID de l'utilisateur actuel
 * @returns {boolean} True si l'utilisateur peut modifier le commentaire
 */
export function canUserEditComment(commentUserId, currentUserId) {
  if (!commentUserId || !currentUserId) {
    logWarning('canUserEditComment called with missing parameters', { commentUserId, currentUserId })
    return false
  }

  const canEdit = commentUserId === currentUserId
  
  logDebug('Comment edit permission check', {
    commentUserId: commentUserId.substring(0, 8) + '...',
    currentUserId: currentUserId.substring(0, 8) + '...',
    canEdit
  })

  return canEdit
}

/**
 * Supprime un commentaire de l'utilisateur
 * @param {string} commentId - L'ID du commentaire
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export async function deleteUserComment(commentId, userId) {
  if (!commentId || !userId) {
    logWarning('deleteUserComment called with missing parameters', { commentId, userId })
    return false
  }

  try {
    // Vérifier que le commentaire appartient bien à l'utilisateur
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id, content')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      logError('Error fetching comment for deletion', fetchError, { commentId, userId })
      return false
    }

    if (!comment || comment.user_id !== userId) {
      logWarning('User attempted to delete comment they do not own', {
        commentId,
        commentOwnerId: comment?.user_id,
        requestingUserId: userId
      })
      return false
    }

    // Supprimer le commentaire
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId) // Double vérification

    if (deleteError) {
      logError('Error deleting comment', deleteError, { commentId, userId })
      return false
    }

    logInfo('Comment deleted successfully', {
      commentId,
      userId: userId.substring(0, 8) + '...',
      contentPreview: comment.content?.substring(0, 50) + '...'
    })

    return true

  } catch (error) {
    logError('Exception while deleting comment', error, { commentId, userId })
    return false
  }
}

/**
 * Crée un profil utilisateur minimal si non existant.
 * @param {string} user_id - L'UUID de l'utilisateur (auth.users.id)
 * @param {string} [display_name] - Nom d'affichage (optionnel)
 * @returns {Promise<{profile: object|null, error: string|null}>}
 */
export async function createProfile(user_id, display_name = null) {
  if (!user_id) return { profile: null, error: 'user_id requis' }
  // Vérifier si le profil existe déjà
  const { data: existing, error: checkError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single()
  if (existing) return { profile: existing, error: null }
  // Créer le profil minimal
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      user_id,
      display_name: display_name || 'Utilisateur'
    }])
    .select()
    .single()
  if (error) return { profile: null, error: error.message }
  return { profile: data, error: null }
}

/**
 * Récupère le nombre d'amis communs entre deux utilisateurs
 * @param {string} userId1 - L'ID du premier utilisateur
 * @param {string} userId2 - L'ID du second utilisateur
 * @returns {Promise<number>} Le nombre d'amis communs
 */
export async function getMutualFriendsCount(userId1, userId2) {
  try {
    if (!userId1 || !userId2 || userId1 === userId2) {
      return 0;
    }
    
    // Récupérer les amis du premier utilisateur
    const { data: user1Friends, error: error1 } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId1)
      .eq('status', 'accepted');
      
    if (error1 || !user1Friends) {
      logError('Erreur lors de la récupération des amis du premier utilisateur', error1);
      return 0;
    }
    
    // Récupérer les amis du second utilisateur
    const { data: user2Friends, error: error2 } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId2)
      .eq('status', 'accepted');
      
    if (error2 || !user2Friends) {
      logError('Erreur lors de la récupération des amis du second utilisateur', error2);
      return 0;
    }
    
    // Extraire les IDs des amis
    const user1FriendIds = user1Friends.map(f => f.friend_id);
    const user2FriendIds = user2Friends.map(f => f.friend_id);
    
    // Compter les amis communs
    const mutualFriends = user1FriendIds.filter(id => user2FriendIds.includes(id));
    return mutualFriends.length;
    
  } catch (error) {
    logError('Erreur lors du calcul des amis communs', error);
    return 0;
  }
}

