import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    const { user_id, friend_id, action, query } = req.body || req.query

    if (req.method === 'GET') {
      // Recherche d'utilisateurs ou récupération d'amis
      if (query) {
        // Recherche d'utilisateurs
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, created_at')
          .ilike('display_name', `%${query}%`)
          .limit(10)

        if (error) throw error
        return res.status(200).json(data || [])
      }

      if (user_id) {
        // Récupérer les amis d'un utilisateur
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

        if (friendsError) throw friendsError

        // Récupérer les demandes en attente
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

        if (pendingError) throw pendingError

        return res.status(200).json({
          friends: friends || [],
          pendingRequests: pendingRequests || []
        })
      }
    }

    if (req.method === 'POST') {
      const { action, user_id, friend_id, request_id } = req.body

      switch (action) {
        case 'send_request':
          // Envoyer une demande d'ami
          const { error: sendError } = await supabase
            .from('friendships')
            .insert({
              user_id,
              friend_id,
              status: 'pending'
            })

          if (sendError) throw sendError
          return res.status(201).json({ message: 'Demande d\'ami envoyée' })

        case 'accept_request':
          // Accepter une demande d'ami
          const { error: acceptError } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', request_id)

          if (acceptError) throw acceptError
          return res.status(200).json({ message: 'Demande acceptée' })

        case 'reject_request':
          // Rejeter une demande d'ami
          const { error: rejectError } = await supabase
            .from('friendships')
            .delete()
            .eq('id', request_id)

          if (rejectError) throw rejectError
          return res.status(200).json({ message: 'Demande rejetée' })

        case 'remove_friend':
          // Supprimer un ami
          const { error: removeError } = await supabase
            .from('friendships')
            .delete()
            .or(`user_id.eq.${user_id},friend_id.eq.${user_id}`)
            .or(`user_id.eq.${friend_id},friend_id.eq.${friend_id}`)

          if (removeError) throw removeError
          return res.status(200).json({ message: 'Ami supprimé' })

        default:
          return res.status(400).json({ error: 'Action non reconnue' })
      }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    logError('Erreur dans l\'API friends', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
}
