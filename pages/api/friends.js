import { supabase, initializeFriendsSystem, getUserFriends, createOrUpdateProfile } from '../../lib/supabase'
import { logError, logInfo, logDebug, logApiCall } from '../../utils/logger'
import { getProfileIdFromUserId, sendFriendRequestCorrected, removeFriend, getFriendshipStats } from '../../utils/profileUtils'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  try {
    logApiCall(req.method, '/api/friends', req.body || req.query, null)
    
    // Initialize friends system if needed
    const initResult = await initializeFriendsSystem()
    if (!initResult) {
      logError('Failed to initialize friends system', null, { requestId })
      return res.status(503).json({ 
        error: 'Service temporairement indisponible',
        message: 'Le système d\'amis est en cours d\'initialisation'
      })
    }
    
    if (req.method === 'GET') {
      return await handleGetRequest(req, res, requestId)
    } else if (req.method === 'POST') {
      return await handlePostRequest(req, res, requestId)
    } else {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logError('Erreur dans l\'API friends', error, {
      requestId,
      method: req.method,
      url: req.url,
      responseTime,
      query: req.query,
      body: req.body
    })
    
    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: 'Le système d\'amis rencontre des difficultés',
      reference: `friends-api-${Date.now()}-${requestId}`,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleGetRequest(req, res, requestId) {
  const { user_id, query } = req.query
  
  logInfo('Traitement requête GET friends', {
    requestId,
    user_id: user_id?.substring(0, 8) + '...',
    query,
    hasQuery: !!query
  })
  
  // Si c'est une recherche d'utilisateurs
  if (query) {
    return await searchUsers(req, res, requestId, query)
  }
  
  // Sinon, récupérer les amis et demandes en attente
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }
  
  try {
    const result = await getUserFriends(user_id)
    
    if (result.error) {
      logError('Erreur récupération données utilisateur', result.error, { requestId, user_id })
      // Return empty data instead of error for graceful fallback
      return res.status(200).json({
        friends: [],
        pendingRequests: []
      })
    }
    
    // Format data to match expected structure
    const formattedFriends = result.friends.map(f => ({
      ...f,
      profiles: f.friend_profile
    }))
    
    const formattedPendingRequests = result.pendingRequests.map(r => ({
      ...r,
      profiles: r.requester_profile
    }))
    
    logInfo('Données récupérées avec succès', {
      requestId,
      friendsCount: formattedFriends.length,
      pendingRequestsCount: formattedPendingRequests.length
    })
    
    return res.status(200).json({
      friends: formattedFriends,
      pendingRequests: formattedPendingRequests
    })
    
  } catch (error) {
    logError('Erreur dans handleGetRequest', error, { requestId, user_id })
    // Return empty data for graceful fallback
    return res.status(200).json({
      friends: [],
      pendingRequests: []
    })
  }
}

async function searchUsers(req, res, requestId, query) {
  try {
    logInfo('Recherche d\'utilisateurs', {
      requestId,
      query,
      queryLength: query.length
    })
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' })
    }
    
    // Check if profiles table exists and search
    try {
      const { data: users, error: searchError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        `)
        .ilike('display_name', `%${query.trim()}%`)
        .eq('is_private', false)
        .limit(20)
      
      if (searchError) {
        logError('Erreur recherche utilisateurs', searchError, { requestId, query })
        return res.status(200).json([]) // Return empty array for graceful fallback
      }
      
      logInfo('Recherche terminée', {
        requestId,
        query,
        resultsCount: users?.length || 0
      })
      
      return res.status(200).json(users || [])
      
    } catch (tableError) {
      logError('Table profiles not accessible', tableError, { requestId })
      return res.status(200).json([]) // Return empty array
    }
    
  } catch (error) {
    logError('Erreur dans searchUsers', error, { requestId, query })
    return res.status(200).json([]) // Return empty array for graceful fallback
  }
}

async function handlePostRequest(req, res, requestId) {
  const { action, user_id, friend_id, request_id, target_user_id, group_name, notification_id } = req.body
  
  logInfo('Traitement requête POST friends', {
    requestId,
    action,
    user_id: user_id?.substring(0, 8) + '...',
    friend_id: friend_id?.substring(0, 8) + '...',
    request_id
  })
  
  try {
    switch (action) {
      case 'send_request':
        return await sendFriendRequest(req, res, requestId, user_id, friend_id)
      case 'accept_request':
        return await acceptFriendRequest(req, res, requestId, request_id)
      case 'reject_request':
        return await rejectFriendRequest(req, res, requestId, request_id)
      case 'remove_friend':
        return await removeFriendAPI(req, res, requestId, user_id, target_user_id)
      case 'block_user':
        return await blockUser(req, res, requestId, user_id, target_user_id)
      case 'unblock_user':
        return await unblockUser(req, res, requestId, user_id, target_user_id)
      case 'get_stats':
        return await getFriendshipStatsAPI(req, res, requestId, user_id)
      case 'create_group':
        return await createFriendGroup(req, res, requestId, user_id, group_name)
      case 'mark_notification_read':
        return await markNotificationRead(req, res, requestId, notification_id)
      case 'update_online_status':
        return await updateOnlineStatus(req, res, requestId, user_id)
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    logError('Erreur dans handlePostRequest', error, { requestId, action })
    return res.status(500).json({ 
      error: 'Erreur lors de l\'action',
      message: 'Veuillez réessayer plus tard'
    })
  }
}

async function sendFriendRequest(req, res, requestId, user_id, friend_id) {
  try {
    if (!user_id || !friend_id) {
      return res.status(400).json({ error: 'user_id and friend_id are required' })
    }
    
    if (user_id === friend_id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' })
    }
    
    // Utiliser la fonction corrigée
    const result = await sendFriendRequestCorrected(user_id, friend_id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    return res.status(200).json({
      success: true,
      friendship_id: result.friendship.id,
      status: result.friendship.status
    })
    
  } catch (error) {
    logError('Erreur dans sendFriendRequest', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' })
  }
}

async function acceptFriendRequest(req, res, requestId, request_id) {
  try {
    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' })
    }
    
    const { data: friendship, error: updateError } = await supabase
      .from('friendships')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError || !friendship) {
      return res.status(404).json({ error: 'Friend request not found' })
    }
    
    return res.status(200).json({
      success: true,
      status: 'accepted'
    })
    
  } catch (error) {
    logError('Erreur dans acceptFriendRequest', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de l\'acceptation' })
  }
}

async function rejectFriendRequest(req, res, requestId, request_id) {
  try {
    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' })
    }
    
    const { data: friendship, error: updateError } = await supabase
      .from('friendships')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError || !friendship) {
      return res.status(404).json({ error: 'Friend request not found' })
    }
    
    return res.status(200).json({
      success: true,
      status: 'rejected'
    })
    
  } catch (error) {
    logError('Erreur dans rejectFriendRequest', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors du refus' })
  }
}

async function removeFriendAPI(req, res, requestId, user_id, target_user_id) {
  try {
    if (!user_id || !target_user_id) {
      return res.status(400).json({ error: 'user_id and target_user_id are required' })
    }
    
    if (user_id === target_user_id) {
      return res.status(400).json({ error: 'Cannot remove yourself as friend' })
    }
    
    const result = await removeFriend(user_id, target_user_id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Friend removed successfully'
    })
    
  } catch (error) {
    logError('Erreur dans removeFriendAPI', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'ami' })
  }
}

async function blockUser(req, res, requestId, user_id, target_user_id) {
  try {
    if (!user_id || !target_user_id) {
      return res.status(400).json({ error: 'user_id and target_user_id are required' })
    }
    
    if (user_id === target_user_id) {
      return res.status(400).json({ error: 'Cannot block yourself' })
    }
    
    const { blockUser: blockUserFunc } = await import('../../utils/profileUtils')
    const result = await blockUserFunc(user_id, target_user_id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    return res.status(200).json({ success: true })
    
  } catch (error) {
    logError('Erreur dans blockUser', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors du blocage' })
  }
}

async function unblockUser(req, res, requestId, user_id, target_user_id) {
  try {
    if (!user_id || !target_user_id) {
      return res.status(400).json({ error: 'user_id and target_user_id are required' })
    }
    
    const { unblockUser: unblockUserFunc } = await import('../../utils/profileUtils')
    const result = await unblockUserFunc(user_id, target_user_id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    return res.status(200).json({ success: true })
    
  } catch (error) {
    logError('Erreur dans unblockUser', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors du déblocage' })
  }
}

async function createFriendGroup(req, res, requestId, user_id, group_name) {
  try {
    if (!user_id || !group_name) {
      return res.status(400).json({ error: 'user_id and group_name are required' })
    }
    
    const { data: group, error } = await supabase
      .from('friend_groups')
      .insert({
        user_id,
        name: group_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Group name already exists' })
      }
      throw error
    }
    
    return res.status(200).json({ success: true, group })
    
  } catch (error) {
    logError('Erreur dans createFriendGroup', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de la création du groupe' })
  }
}

async function markNotificationRead(req, res, requestId, notification_id) {
  try {
    if (!notification_id) {
      return res.status(400).json({ error: 'notification_id is required' })
    }
    
    const { markNotificationAsRead } = await import('../../utils/profileUtils')
    const result = await markNotificationAsRead(notification_id)
    
    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }
    
    return res.status(200).json({ success: true })
    
  } catch (error) {
    logError('Erreur dans markNotificationRead', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' })
  }
}

async function updateOnlineStatus(req, res, requestId, user_id) {
  try {
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }
    
    const { updateLastSeen } = await import('../../utils/profileUtils')
    await updateLastSeen(user_id)
    
    return res.status(200).json({ success: true })
    
  } catch (error) {
    logError('Erreur dans updateOnlineStatus', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' })
  }
}

async function getFriendshipStatsAPI(req, res, requestId, user_id) {
  try {
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }
    
    const stats = await getFriendshipStats(user_id)
    
    return res.status(200).json({
      success: true,
      stats
    })
    
  } catch (error) {
    logError('Erreur dans getFriendshipStatsAPI', error, { requestId })
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' })
  }
}
