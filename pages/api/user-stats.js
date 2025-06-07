import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'
import { getUserStatsComplete, getUserStatsCorrected } from '../../utils/profileUtils'
import { getTrophyStats } from '../../utils/trophyUtils'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Méthode non autorisée',
      message: 'Seule la méthode GET est supportée'
    })
  }

  const { user_id } = req.query
  const requestId = `stats-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  if (!user_id) {
    return res.status(400).json({ 
      error: 'user_id est requis',
      message: 'Veuillez fournir un user_id valide'
    })
  }

  try {
    logInfo('Getting user stats', { requestId, user_id: user_id.substring(0, 8) + '...' })

    // Utiliser la fonction complète pour les statistiques incluant les trophées
    const statsData = await getUserStatsComplete(user_id)
    
    const stats = {
      recipesCount: statsData.recipesCount || 0,
      likesReceived: statsData.likesReceived || 0,
      friendsCount: statsData.friendsCount || 0,
      viewsTotal: 0,    // À implémenter avec une table views
      commentsReceived: 0, // À implémenter avec une table comments
      profileCompleteness: statsData.profileCompleteness || 0,
      pendingFriendRequests: 0, // Sera calculé séparément
      trophyPoints: statsData.trophyPoints || 0,
      trophiesUnlocked: statsData.trophiesUnlocked || 0,
      latestTrophy: statsData.latestTrophy
    }

    // Récupérer les demandes d'amitié en attente
    try {
      const { count: pendingRequestsCount, error: pendingError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user_id)
        .eq('status', 'pending')

      if (!pendingError) {
        stats.pendingFriendRequests = pendingRequestsCount || 0
      }
    } catch (friendsErr) {
      logInfo('Friendships table not available yet', { requestId })
      stats.pendingFriendRequests = 0
    }

    logInfo('User stats retrieved with trophies', { 
      requestId, 
      user_id: user_id.substring(0, 8) + '...',
      stats: {
        ...stats,
        latestTrophy: stats.latestTrophy ? stats.latestTrophy.id : null
      }
    })

    return res.status(200).json(stats)

  } catch (error) {
    logError('Unexpected error in user-stats API', error, { requestId, user_id })
    return res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques',
      message: 'Veuillez réessayer plus tard'
    })
  }
}
