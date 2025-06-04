import { supabase } from '../../lib/supabase'
import { logError, logInfo, logApiCall } from '../../utils/logger'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  try {
    logApiCall(req.method, '/api/user-stats', req.body || req.query, null)
    
    if (req.method === 'GET') {
      return await handleGetUserStats(req, res, requestId)
    } else {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logError('Erreur dans l\'API user-stats', error, {
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
      reference: `user-stats-api-${Date.now()}-${requestId}`,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleGetUserStats(req, res, requestId) {
  const { user_id } = req.query
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }
  
  try {
    // Count user recipes
    const { count: recipesCount, error: recipesError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
    
    if (recipesError) {
      logError('Erreur comptage recettes', recipesError, { requestId, user_id })
    }
    
    // Count likes received (if you have a likes table)
    // For now, we'll set it to 0 since the table structure is not clear
    const likesReceived = 0
    
    // Count friends
    const { count: friendsCount, error: friendsError } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('status', 'accepted')
    
    if (friendsError) {
      logError('Erreur comptage amis', friendsError, { requestId, user_id })
    }
    
    const stats = {
      recipesCount: recipesCount || 0,
      likesReceived: likesReceived,
      friendsCount: friendsCount || 0
    }
    
    logInfo('Statistiques utilisateur récupérées', {
      requestId,
      user_id: user_id.substring(0, 8) + '...',
      stats
    })
    
    return res.status(200).json(stats)
    
  } catch (error) {
    logError('Erreur dans handleGetUserStats', error, { requestId, user_id })
    throw error
  }
}
