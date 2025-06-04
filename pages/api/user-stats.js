import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'

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

    // Compter le nombre de recettes de l'utilisateur
    const { count: recipesCount, error: recipesError } = await supabase
      .from('recipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)

    if (recipesError) {
      logError('Error counting user recipes', recipesError, { requestId, user_id })
    }

    // Pour l'instant, retourner des stats basiques
    // Plus tard, on pourra ajouter des tables pour les likes, commentaires, etc.
    const stats = {
      recipesCount: recipesCount || 0,
      likesReceived: 0, // À implémenter avec une table likes
      friendsCount: 0,  // À implémenter avec la table friendships
      viewsTotal: 0,    // À implémenter avec une table views
      commentsReceived: 0 // À implémenter avec une table comments
    }

    // Essayer de récupérer le nombre d'amis si la table friendships existe
    try {
      const { count: friendsCount, error: friendsError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('status', 'accepted')

      if (!friendsError) {
        stats.friendsCount = friendsCount || 0
      }
    } catch (friendsErr) {
      // Table friendships n'existe pas encore, ignorer
      logInfo('Friendships table not available yet', { requestId })
    }

    logInfo('User stats retrieved', { 
      requestId, 
      user_id: user_id.substring(0, 8) + '...',
      stats 
    })

    return res.status(200).json(stats)

  } catch (error) {
    logError('Unexpected error in user-stats API', error, { requestId, user_id })
    return res.status(500).json({ 
      error: 'Erreur serveur interne',
      message: 'Erreur lors de la récupération des statistiques'
    })
  }
}
