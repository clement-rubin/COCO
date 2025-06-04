import { supabase } from '../../lib/supabase'
import { logError, logInfo, logDebug, logApiCall } from '../../utils/logger'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  try {
    logApiCall(req.method, '/api/friends', req.body || req.query, null)
    
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
      message: error.message,
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
    // Récupérer les amis acceptés avec leurs profils
    const { data: friends, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        friend_profile:profiles!friend_id (
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    if (friendsError) {
      logError('Erreur récupération amis', friendsError, { requestId, user_id })
      throw new Error(`Erreur lors de la récupération des amis: ${friendsError.message}`)
    }
    
    // Récupérer les demandes en attente avec les profils des demandeurs
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        requester_profile:profiles!user_id (
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('friend_id', user_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    if (pendingError) {
      logError('Erreur récupération demandes', pendingError, { requestId, user_id })
      throw new Error(`Erreur lors de la récupération des demandes: ${pendingError.message}`)
    }
    
    // Transform data to match expected format
    const transformedFriends = friends?.map(f => ({
      ...f,
      profiles: f.friend_profile
    })) || []
    
    const transformedPendingRequests = pendingRequests?.map(r => ({
      ...r,
      profiles: r.requester_profile
    })) || []
    
    logInfo('Données récupérées avec succès', {
      requestId,
      friendsCount: transformedFriends.length,
      pendingRequestsCount: transformedPendingRequests.length
    })
    
    return res.status(200).json({
      friends: transformedFriends,
      pendingRequests: transformedPendingRequests
    })
    
  } catch (error) {
    logError('Erreur dans handleGetRequest', error, { requestId, user_id })
    throw error
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
    
    // Rechercher dans les profils par nom d'affichage
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
      .limit(20)
    
    if (searchError) {
      logError('Erreur recherche utilisateurs', searchError, { requestId, query })
      throw new Error(`Erreur lors de la recherche: ${searchError.message}`)
    }
    
    logInfo('Recherche terminée', {
      requestId,
      query,
      resultsCount: users?.length || 0
    })
    
    return res.status(200).json(users || [])
    
  } catch (error) {
    logError('Erreur dans searchUsers', error, { requestId, query })
    throw error
  }
}

async function handlePostRequest(req, res, requestId) {
  const { action, user_id, friend_id, request_id } = req.body
  
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
      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    logError('Erreur dans handlePostRequest', error, { requestId, action })
    throw error
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
    
    // Vérifier si une relation existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(user_id.eq.${user_id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user_id})`)
    
    if (checkError) {
      logError('Erreur vérification relation existante', checkError, { requestId })
      throw new Error(`Erreur lors de la vérification: ${checkError.message}`)
    }
    
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Friendship already exists' })
    }
    
    // Créer la demande d'amitié
    const { data: friendship, error: insertError } = await supabase
      .from('friendships')
      .insert({
        user_id,
        friend_id,
        status: 'pending'
      })
      .select()
      .single()
    
    if (insertError) {
      logError('Erreur création demande', insertError, { requestId })
      throw new Error(`Erreur lors de la création: ${insertError.message}`)
    }
    
    logInfo('Demande d\'ami créée', {
      requestId,
      friendshipId: friendship.id
    })
    
    return res.status(200).json({
      success: true,
      friendship_id: friendship.id,
      status: friendship.status
    })
    
  } catch (error) {
    logError('Erreur dans sendFriendRequest', error, { requestId })
    throw error
  }
}

async function acceptFriendRequest(req, res, requestId, request_id) {
  try {
    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' })
    }
    
    // Mettre à jour le statut à 'accepted'
    const { data: friendship, error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', request_id)
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError) {
      logError('Erreur acceptation demande', updateError, { requestId })
      throw new Error(`Erreur lors de l'acceptation: ${updateError.message}`)
    }
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' })
    }
    
    // Créer la relation inverse pour une amitié bidirectionnelle
    const { error: reverseError } = await supabase
      .from('friendships')
      .upsert({
        user_id: friendship.friend_id,
        friend_id: friendship.user_id,
        status: 'accepted'
      })
    
    if (reverseError) {
      logError('Erreur création relation inverse', reverseError, { requestId })
      // Ne pas faire échouer la requête si la relation inverse échoue
    }
    
    logInfo('Demande acceptée', {
      requestId,
      friendshipId: friendship.id
    })
    
    return res.status(200).json({
      success: true,
      status: 'accepted'
    })
    
  } catch (error) {
    logError('Erreur dans acceptFriendRequest', error, { requestId })
    throw error
  }
}

async function rejectFriendRequest(req, res, requestId, request_id) {
  try {
    if (!request_id) {
      return res.status(400).json({ error: 'request_id is required' })
    }
    
    // Mettre à jour le statut à 'rejected'
    const { data: friendship, error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'rejected' })
      .eq('id', request_id)
      .eq('status', 'pending')
      .select()
      .single()
    
    if (updateError) {
      logError('Erreur refus demande', updateError, { requestId })
      throw new Error(`Erreur lors du refus: ${updateError.message}`)
    }
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' })
    }
    
    logInfo('Demande refusée', {
      requestId,
      friendshipId: friendship.id
    })
    
    return res.status(200).json({
      success: true,
      status: 'rejected'
    })
    
  } catch (error) {
    logError('Erreur dans rejectFriendRequest', error, { requestId })
    throw error
  }
}
