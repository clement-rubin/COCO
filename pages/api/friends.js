import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug, logWarning, logApiCall, logPerformance } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const startTime = Date.now()
  const requestReference = `friends-api-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

  logInfo(`API friends - ${req.method} request started`, {
    reference: requestReference,
    method: req.method,
    query: req.query,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']?.substring(0, 100),
    timestamp: new Date().toISOString()
  })

  try {
    const { user_id, friend_id, action, query } = req.body || req.query

    logDebug('Friends API - Request parameters', {
      reference: requestReference,
      hasUserId: !!user_id,
      hasFriendId: !!friend_id,
      hasAction: !!action,
      hasQuery: !!query,
      userIdType: typeof user_id,
      friendIdType: typeof friend_id,
      actionType: typeof action,
      queryType: typeof query,
      step: 'parameter_extraction'
    })

    if (req.method === 'GET') {
      logInfo('Friends API - GET request processing', {
        reference: requestReference,
        hasQuery: !!query,
        hasUserId: !!user_id,
        queryValue: query,
        userIdValue: user_id?.substring(0, 8) + '...',
        step: 'get_request_start'
      })

      // Recherche d'utilisateurs ou récupération d'amis
      if (query) {
        logInfo('Friends API - User search request', {
          reference: requestReference,
          query: query,
          queryLength: query.length,
          step: 'user_search_start'
        })

        const searchStartTime = Date.now()

        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, created_at')
          .ilike('display_name', `%${query}%`)
          .limit(10)

        const searchDuration = Date.now() - searchStartTime

        logInfo('Friends API - User search query executed', {
          reference: requestReference,
          query: query,
          success: !error,
          resultsCount: data?.length || 0,
          searchDuration,
          step: 'user_search_executed',
          error: error?.message
        })

        logPerformance('User search query', searchDuration, {
          query: query,
          resultsCount: data?.length || 0,
          success: !error
        })

        if (error) {
          logError('Friends API - User search error', error, {
            reference: requestReference,
            query: query,
            errorCode: error.code,
            errorDetails: error.details
          })
          throw error
        }

        logApiCall('GET', '/api/friends', { query }, {
          status: 200,
          ok: true,
          responseTime: searchDuration,
          data: { resultsCount: data?.length || 0 }
        })

        logInfo('Friends API - User search completed successfully', {
          reference: requestReference,
          query: query,
          resultsCount: data?.length || 0,
          totalDuration: Date.now() - startTime,
          step: 'user_search_completed'
        })

        return res.status(200).json(data || [])
      }

      if (user_id) {
        logInfo('Friends API - Load user friends request', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          step: 'load_friends_start'
        })

        const friendsStartTime = Date.now()

        // Récupérer les amis d'un utilisateur
        logDebug('Friends API - Fetching friends list', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          step: 'friends_query_start'
        })

        const { data: friends, error: friendsError } = await supabase
          .from('friendships')
          .select(`
            id,
            friend_id,
            profiles!friendships_friend_id_fkey (
              id,
              display_name,
              avatar_url,
              created_at
            )
          `)
          .eq('user_id', user_id)
          .eq('status', 'accepted')

        const friendsQueryDuration = Date.now() - friendsStartTime

        logInfo('Friends API - Friends query executed', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          success: !friendsError,
          friendsCount: friends?.length || 0,
          friendsQueryDuration,
          step: 'friends_query_executed',
          error: friendsError?.message
        })

        if (friendsError) {
          logError('Friends API - Friends query error', friendsError, {
            reference: requestReference,
            userId: user_id?.substring(0, 8) + '...',
            errorCode: friendsError.code,
            errorDetails: friendsError.details
          })
          throw friendsError
        }

        // Récupérer les demandes en attente
        logDebug('Friends API - Fetching pending requests', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          step: 'pending_requests_query_start'
        })

        const pendingStartTime = Date.now()

        const { data: pendingRequests, error: pendingError } = await supabase
          .from('friendships')
          .select(`
            id,
            user_id,
            profiles!friendships_user_id_fkey (
              id,
              display_name,
              avatar_url
            )
          `)
          .eq('friend_id', user_id)
          .eq('status', 'pending')

        const pendingQueryDuration = Date.now() - pendingStartTime

        logInfo('Friends API - Pending requests query executed', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          success: !pendingError,
          pendingRequestsCount: pendingRequests?.length || 0,
          pendingQueryDuration,
          step: 'pending_requests_query_executed',
          error: pendingError?.message
        })

        if (pendingError) {
          logError('Friends API - Pending requests query error', pendingError, {
            reference: requestReference,
            userId: user_id?.substring(0, 8) + '...',
            errorCode: pendingError.code,
            errorDetails: pendingError.details
          })
          throw pendingError
        }

        logPerformance('Load friends data', Date.now() - friendsStartTime, {
          userId: user_id?.substring(0, 8) + '...',
          friendsCount: friends?.length || 0,
          pendingRequestsCount: pendingRequests?.length || 0
        })

        const responseData = {
          friends: friends || [],
          pendingRequests: pendingRequests || []
        }

        logApiCall('GET', '/api/friends', { user_id }, {
          status: 200,
          ok: true,
          responseTime: Date.now() - startTime,
          data: {
            friendsCount: friends?.length || 0,
            pendingRequestsCount: pendingRequests?.length || 0
          }
        })

        logInfo('Friends API - Load friends completed successfully', {
          reference: requestReference,
          userId: user_id?.substring(0, 8) + '...',
          friendsCount: friends?.length || 0,
          pendingRequestsCount: pendingRequests?.length || 0,
          totalDuration: Date.now() - startTime,
          step: 'load_friends_completed'
        })

        return res.status(200).json(responseData)
      }
    }

    if (req.method === 'POST') {
      const { action, user_id, friend_id, request_id } = req.body

      logInfo('Friends API - POST request processing', {
        reference: requestReference,
        action: action,
        hasUserId: !!user_id,
        hasFriendId: !!friend_id,
        hasRequestId: !!request_id,
        userIdType: typeof user_id,
        friendIdType: typeof friend_id,
        requestIdType: typeof request_id,
        step: 'post_request_start'
      })

      switch (action) {
        case 'send_request':
          logInfo('Friends API - Send friend request', {
            requestId,
            userId: user_id?.substring(0, 8) + '...',
            friendId: friend_id?.substring(0, 8) + '...',
            step: 'send_request_start'
          })

          // Use the SQL function instead of manual insertion
          const { data: sendResult, error: sendError } = await supabase.rpc('send_friend_request', {
            target_user_id: friend_id
          })

          if (sendError) {
            logError('Friends API - Send request error', sendError, {
              requestId,
              userId: user_id?.substring(0, 8) + '...',
              friendId: friend_id?.substring(0, 8) + '...'
            })
            throw sendError
          }

          if (sendResult.error) {
            return res.status(400).json({ 
              error: sendResult.error,
              reference: requestId
            })
          }

          logInfo('Friends API - Friend request sent successfully', {
            requestId,
            friendshipId: sendResult.friendship_id,
            status: sendResult.status
          })

          return res.status(201).json({
            message: 'Demande d\'ami envoyée',
            friendship: sendResult,
            reference: requestId
          })

        case 'accept_request':
          logInfo('Friends API - Accept friend request', {
            requestId,
            friendshipRequestId: request_id,
            step: 'accept_request_start'
          })

          // Use the SQL function
          const { data: acceptResult, error: acceptError } = await supabase.rpc('accept_friend_request', {
            friendship_id: request_id
          })

          if (acceptError) {
            logError('Friends API - Accept request error', acceptError, {
              requestId,
              friendshipRequestId: request_id
            })
            throw acceptError
          }

          if (acceptResult.error) {
            return res.status(400).json({ 
              error: acceptResult.error,
              reference: requestId
            })
          }

          logInfo('Friends API - Friend request accepted successfully', {
            requestId,
            friendshipRequestId: request_id,
            status: acceptResult.status
          })

          return res.status(200).json({
            message: 'Demande d\'ami acceptée',
            result: acceptResult,
            reference: requestId
          })

        case 'reject_request':
          logInfo('Friends API - Reject friend request', {
            requestId,
            friendshipRequestId: request_id,
            step: 'reject_request_start'
          })

          // Use the SQL function
          const { data: rejectResult, error: rejectError } = await supabase.rpc('reject_friend_request', {
            friendship_id: request_id
          })

          if (rejectError) {
            logError('Friends API - Reject request error', rejectError, {
              requestId,
              friendshipRequestId: request_id
            })
            throw rejectError
          }

          if (rejectResult.error) {
            return res.status(400).json({ 
              error: rejectResult.error,
              reference: requestId
            })
          }

          logInfo('Friends API - Friend request rejected successfully', {
            requestId,
            friendshipRequestId: request_id,
            status: rejectResult.status
          })

          return res.status(200).json({
            message: 'Demande d\'ami refusée',
            result: rejectResult,
            reference: requestId
          })

        default:
          logWarning('Friends API - Unknown action', {
            requestId,
            action,
            allowedActions: ['send_request', 'accept_request', 'reject_request']
          })

          return res.status(400).json({ 
            error: 'Action non reconnue',
            allowedActions: ['send_request', 'accept_request', 'reject_request'],
            reference: requestId
          })
      }
    }

    logWarning('Friends API - Method not allowed', {
      reference: requestReference,
      method: req.method,
      allowedMethods: ['GET', 'POST']
    })

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    const totalDuration = Date.now() - startTime

    logError('Friends API - General error', error, {
      reference: requestReference,
      method: req.method,
      query: req.query,
      body: req.body,
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500),
      errorName: error.name,
      totalDuration,
      timestamp: new Date().toISOString(),
      supabaseError: error?.code ? {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      } : null
    })

    logApiCall(req.method, '/api/friends', req.body || req.query, {
      status: 500,
      ok: false,
      responseTime: totalDuration,
      error: error.message
    })

    res.status(500).json({ 
      error: 'Erreur serveur interne',
      message: error.message,
      reference: requestReference,
      timestamp: new Date().toISOString()
    })
  } finally {
    const totalDuration = Date.now() - startTime

    logInfo(`Friends API - ${req.method} completed`, {
      reference: requestReference,
      method: req.method,
      totalDuration,
      timestamp: new Date().toISOString()
    })

    logPerformance(`Friends API ${req.method}`, totalDuration, {
      reference: requestReference,
      method: req.method
    })
  }
}
