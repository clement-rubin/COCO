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
    if (req.method === 'GET') {
      const { status } = req.query

      let query = supabase
        .from('competitions')
        .select(`
          *,
          competition_entries (
            id,
            user_id,
            recipe_id,
            votes_count,
            recipes (
              id,
              title,
              image,
              author,
              created_at
            ),
            profiles (
              display_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data: competitions, error } = await query

      if (error) throw error

      logInfo('Competitions retrieved', {
        requestId,
        count: competitions?.length || 0,
        status
      })

      return res.status(200).json(competitions || [])
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
        const { error: updateError } = await supabase
          .from('competition_entries')
          .update({ 
            votes_count: supabase.raw('votes_count + 1')
          })
          .eq('id', entry_id)

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