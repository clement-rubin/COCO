import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    // Fermer automatiquement les compétitions expirées
    await closeExpiredCompetitions()

    if (req.method === 'GET') {
      const { status, type } = req.query

      let query = supabase
        .from('competitions')
        .select(`
          *,
          competition_entries (
            id,
            user_id,
            recipe_id,
            votes_count,
            rank,
            is_winner,
            submitted_at,
            recipes (
              id,
              title,
              description,
              image,
              author,
              created_at,
              category
            ),
            profiles:user_id (
              display_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      if (type) {
        query = query.eq('type', type)
      }

      const { data: competitions, error } = await query

      if (error) throw error

      // Enrichir les données avec des statistiques
      const enrichedCompetitions = competitions?.map(comp => {
        const entries = comp.competition_entries || []
        const totalVotes = entries.reduce((sum, entry) => sum + (entry.votes_count || 0), 0)
        const sortedEntries = entries.sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0))
        
        return {
          ...comp,
          participants_count: entries.length,
          total_votes: totalVotes,
          competition_entries: sortedEntries,
          is_full: entries.length >= comp.max_participants
        }
      })

      logInfo('Competitions retrieved', {
        requestId,
        count: enrichedCompetitions?.length || 0,
        status,
        type
      })

      return res.status(200).json(enrichedCompetitions || [])
    }

    if (req.method === 'POST') {
      const { action, ...data } = req.body

      if (action === 'submit_entry') {
        const { competition_id, user_id, recipe_id } = data

        if (!competition_id || !user_id || !recipe_id) {
          return res.status(400).json({
            error: 'competition_id, user_id et recipe_id sont requis'
          })
        }

        // Vérifier que la compétition est active
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .select('status, end_date')
          .eq('id', competition_id)
          .single()

        if (compError || !competition) {
          return res.status(404).json({ error: 'Compétition introuvable' })
        }

        const now = new Date()
        const endDate = new Date(competition.end_date)

        if (competition.status !== 'active' || now > endDate) {
          return res.status(400).json({ error: 'Cette compétition n\'est plus active' })
        }

        // Créer l'entrée
        const { data: entry, error: entryError } = await supabase
          .from('competition_entries')
          .insert({
            competition_id,
            user_id,
            recipe_id
          })
          .select()
          .single()

        if (entryError) {
          if (entryError.code === '23505') {
            return res.status(400).json({ error: 'Vous participez déjà à cette compétition' })
          }
          throw entryError
        }

        logInfo('Competition entry created', { requestId, entryId: entry.id })
        return res.status(201).json(entry)
      }

      if (action === 'vote') {
        const { competition_id, entry_id, voter_id } = data

        if (!competition_id || !entry_id || !voter_id) {
          return res.status(400).json({
            error: 'competition_id, entry_id et voter_id sont requis'
          })
        }

        // Vérifier que l'utilisateur ne vote pas pour lui-même
        const { data: entry, error: entryError } = await supabase
          .from('competition_entries')
          .select('user_id')
          .eq('id', entry_id)
          .single()

        if (entryError) {
          return res.status(404).json({ error: 'Entrée introuvable' })
        }

        if (entry.user_id === voter_id) {
          return res.status(400).json({ error: 'Vous ne pouvez pas voter pour votre propre recette' })
        }

        // Créer le vote
        const { error: voteError } = await supabase
          .from('competition_votes')
          .insert({
            competition_id,
            entry_id,
            voter_id
          })

        if (voteError) {
          if (voteError.code === '23505') {
            return res.status(400).json({ error: 'Vous avez déjà voté pour cette compétition' })
          }
          throw voteError
        }

        // Mettre à jour le compteur de votes
        const { error: updateError } = await supabase.rpc('increment_competition_vote', {
          p_entry_id: entry_id
        })

        if (updateError) {
          logError('Error updating vote count', updateError)
        }

        logInfo('Vote registered', { requestId, entryId: entry_id, voterId: voter_id })
        return res.status(200).json({ message: 'Vote enregistré' })
      }

      return res.status(400).json({ error: 'Action non reconnue' })
    }

    // Méthode non supportée
    return res.status(405).json({
      error: 'Méthode non autorisée',
      allowedMethods: ['GET', 'POST']
    })

  } catch (error) {
    logError('Competition API error', error, { requestId })
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    })
  }
}

// Fonction pour fermer automatiquement les compétitions expirées
async function closeExpiredCompetitions() {
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('competitions')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lt('end_date', now)
    
    if (error) {
      logError('Error closing expired competitions', error)
    }
  } catch (error) {
    logError('Error in closeExpiredCompetitions', error)
  }
}