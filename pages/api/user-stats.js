import { supabase } from '../../lib/supabase'
import { logError, logInfo, logApiCall } from '../../utils/logger'
import { getUserStats } from '../../utils/profileUtils'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  try {
    logApiCall(req.method, '/api/user-stats', req.query, null)
    
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { user_id } = req.query
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Utiliser la fonction optimisée
    const stats = await getUserStatsOptimized(user_id)
    
    const responseTime = Date.now() - startTime
    
    logInfo('User stats retrieved successfully', {
      requestId,
      userId: user_id.substring(0, 8) + '...',
      responseTime,
      statsKeys: Object.keys(stats)
    })

    return res.status(200).json(stats)

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logError('Error in user-stats API', error, {
      requestId,
      responseTime,
      query: req.query
    })
    
    return res.status(500).json({
      error: 'Internal server error',
      reference: `user-stats-${requestId}`,
      timestamp: new Date().toISOString()
    })
  }
}

async function getUserStatsOptimized(userId) {
  try {
    // Exécuter toutes les requêtes en parallèle pour optimiser les performances
    const [
      recipesResult,
      friendshipResult,
      profileResult,
      userAuthResult
    ] = await Promise.allSettled([
      // CORRECTION: Utiliser select normal au lieu de count avec head
      supabase
        .from('recipes')
        .select('id')
        .eq('user_id', userId),
      
      // Compter les vrais amis (relations acceptées)
      supabase
        .from('friendships')
        .select('id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted'),
      
      // Profil pour complétude
      supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, location, website, created_at')
        .eq('user_id', userId)
        .single(),
      
      // Informations utilisateur pour calcul des jours
      supabase.auth.admin.getUserById(userId)
    ])

    // Traiter les résultats avec gestion d'erreur
    const stats = {
      recipesCount: 0,
      friendsCount: 0,
      pendingSent: 0,
      pendingReceived: 0,
      profileCompleteness: 0,
      daysSinceRegistration: 0,
      memberSince: null,
      hasProfile: false
    }

    // CORRECTION: Compter manuellement les recettes
    if (recipesResult.status === 'fulfilled' && !recipesResult.value.error) {
      stats.recipesCount = recipesResult.value.data?.length || 0
    }

    // Amitié - compter le vrai nombre d'amis
    if (friendshipResult.status === 'fulfilled' && !friendshipResult.value.error) {
      stats.friendsCount = friendshipResult.value.data?.length || 0
      
      // Calculer aussi les demandes en attente si besoin
      try {
        const { data: pendingSent } = await supabase
          .from('friendships')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'pending')
        
        const { data: pendingReceived } = await supabase
          .from('friendships')
          .select('id')
          .eq('friend_id', userId)
          .eq('status', 'pending')
        
        stats.pendingSent = pendingSent?.length || 0
        stats.pendingReceived = pendingReceived?.length || 0
      } catch (pendingError) {
        // Ignorer les erreurs pour les demandes en attente
      }
    }

    // Profil
    if (profileResult.status === 'fulfilled' && !profileResult.value.error) {
      const profile = profileResult.value.data
      if (profile) {
        stats.hasProfile = true
        stats.memberSince = profile.created_at
        
        // Calculer complétude
        const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website']
        const filledFields = fields.filter(field => 
          profile[field] && 
          typeof profile[field] === 'string' && 
          profile[field].trim().length > 0
        )
        stats.profileCompleteness = Math.round((filledFields.length / fields.length) * 100)
      }
    }

    // Jours depuis inscription
    if (userAuthResult.status === 'fulfilled' && userAuthResult.value.data?.user) {
      const registrationDate = new Date(userAuthResult.value.data.user.created_at)
      stats.daysSinceRegistration = Math.floor(
        (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (!stats.memberSince) {
        stats.memberSince = userAuthResult.value.data.user.created_at
      }
    }

    return stats

  } catch (error) {
    logError('Error in getUserStatsOptimized', error, { userId })
    return {
      recipesCount: 0,
      friendsCount: 0,
      pendingSent: 0,
      pendingReceived: 0,
      profileCompleteness: 0,
      daysSinceRegistration: 0,
      memberSince: null,
      hasProfile: false
    }
  }
}
