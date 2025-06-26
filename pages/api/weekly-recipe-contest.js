import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `weekly-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    logInfo('Weekly recipe contest API called', { 
      requestId, 
      method: req.method, 
      query: req.query 
    })

    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        logWarning('Weekly contest GET: missing user_id', { requestId })
        return res.status(400).json({ 
          error: 'user_id parameter is required',
          requestId 
        })
      }

      // Obtenir la semaine courante
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      logInfo('Weekly contest: calculated week dates', {
        requestId,
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString()
      })

      // Obtenir ou créer le concours de la semaine
      let { data: weeklyContest, error: contestError } = await supabase
        .from('weekly_recipe_contest')
        .select('*')
        .eq('week_start', startOfWeek.toISOString().split('T')[0])
        .single()

      logInfo('Weekly contest query result', {
        requestId,
        hasData: !!weeklyContest,
        hasError: !!contestError,
        errorCode: contestError?.code,
        errorMessage: contestError?.message
      })

      if (contestError && contestError.code === 'PGRST116') {
        logInfo('Creating new weekly contest', { requestId })
        // Créer un nouveau concours si il n'existe pas
        const { data: newContest, error: createError } = await supabase
          .from('weekly_recipe_contest')
          .insert({
            week_start: startOfWeek.toISOString().split('T')[0],
            week_end: endOfWeek.toISOString().split('T')[0],
            status: 'active',
            total_votes: 0,
            total_candidates: 0
          })
          .select()
          .single()

        if (createError) {
          logError('Error creating weekly contest', createError, { requestId })
          throw createError
        }
        weeklyContest = newContest

        // Sélectionner automatiquement les candidats de la semaine
        await selectWeeklyCandiates(weeklyContest.id, startOfWeek, endOfWeek, requestId)
      } else if (contestError) {
        logError('Error fetching weekly contest', contestError, { requestId })
        throw contestError
      }

      // Récupérer les candidats avec leurs votes
      const { data: candidates, error: candidatesError } = await supabase
        .from('weekly_recipe_candidates')
        .select(`
          id,
          recipe_id,
          user_id,
          votes_received,
          is_manual_entry,
          added_at,
          recipes!inner (
            id,
            title,
            description,
            image,
            author,
            user_id,
            created_at,
            category,
            difficulty_level
          ),
          profiles!user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('weekly_contest_id', weeklyContest.id)
        .order('votes_received', { ascending: false })

      if (candidatesError) {
        logError('Error fetching candidates', candidatesError, { requestId })
        throw candidatesError
      }

      // Vérifier si l'utilisateur a déjà voté
      let hasUserVoted = false
      if (user_id) {
        const { data: userVote, error: voteError } = await supabase
          .from('weekly_recipe_votes')
          .select('id')
          .eq('weekly_contest_id', weeklyContest.id)
          .eq('voter_id', user_id)
          .single()

        if (voteError && voteError.code !== 'PGRST116') {
          logError('Error checking user vote', voteError, { requestId })
        }

        hasUserVoted = !!userVote
      }

      // Enrichir les candidats avec des informations supplémentaires
      const enrichedCandidates = candidates?.map(candidate => ({
        ...candidate,
        recipe: candidate.recipes,
        author: candidate.profiles,
        hasUserVoted: hasUserVoted
      })) || []

      logInfo('Weekly recipe contest data retrieved successfully', {
        requestId,
        contestId: weeklyContest.id,
        candidatesCount: enrichedCandidates.length,
        totalVotes: weeklyContest.total_votes,
        hasUserVoted,
        userId: user_id?.substring(0, 8) + '...'
      })

      return res.status(200).json({
        contest: weeklyContest,
        candidates: enrichedCandidates,
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
        totalVotes: weeklyContest.total_votes || 0,
        hasUserVoted,
        requestId
      })
    }

    if (req.method === 'POST') {
      const { action, ...data } = req.body

      if (action === 'vote') {
        const { candidate_id, voter_id } = data

        if (!candidate_id || !voter_id) {
          return res.status(400).json({
            error: 'candidate_id et voter_id sont requis'
          })
        }

        // Obtenir les informations du candidat
        const { data: candidate, error: candidateError } = await supabase
          .from('weekly_recipe_candidates')
          .select('weekly_contest_id, user_id')
          .eq('id', candidate_id)
          .single()

        if (candidateError || !candidate) {
          return res.status(404).json({ error: 'Candidat introuvable' })
        }

        // Vérifier que l'utilisateur ne vote pas pour lui-même
        if (candidate.user_id === voter_id) {
          return res.status(400).json({ 
            error: 'Vous ne pouvez pas voter pour votre propre recette' 
          })
        }

        // Créer le vote
        const { error: voteError } = await supabase
          .from('weekly_recipe_votes')
          .insert({
            weekly_contest_id: candidate.weekly_contest_id,
            candidate_id,
            voter_id
          })

        if (voteError) {
          if (voteError.code === '23505') {
            return res.status(400).json({ 
              error: 'Vous avez déjà voté cette semaine' 
            })
          }
          throw voteError
        }

        // Incrémenter le compteur de votes
        const { error: updateError } = await supabase
          .from('weekly_recipe_candidates')
          .update({ 
            votes_received: supabase.raw('votes_received + 1')
          })
          .eq('id', candidate_id)

        if (updateError) {
          logError('Error updating candidate votes', updateError)
        }

        // Mettre à jour le total du concours
        const { error: contestUpdateError } = await supabase
          .from('weekly_recipe_contest')
          .update({ 
            total_votes: supabase.raw('total_votes + 1')
          })
          .eq('id', candidate.weekly_contest_id)

        if (contestUpdateError) {
          logError('Error updating contest total votes', contestUpdateError)
        }

        logInfo('Weekly contest vote registered', { 
          requestId, 
          candidateId: candidate_id, 
          voterId: voter_id,
          contestId: candidate.weekly_contest_id
        })

        return res.status(200).json({ message: 'Vote enregistré avec succès' })
      }

      if (action === 'participate') {
        const { recipe_id, user_id } = data

        if (!recipe_id || !user_id) {
          return res.status(400).json({
            error: 'recipe_id et user_id sont requis'
          })
        }

        // Obtenir le concours de la semaine courante
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        const { data: weeklyContest, error: contestError } = await supabase
          .from('weekly_recipe_contest')
          .select('id, status')
          .eq('week_start', startOfWeek.toISOString().split('T')[0])
          .single()

        if (contestError || !weeklyContest) {
          return res.status(404).json({ error: 'Concours de la semaine introuvable' })
        }

        if (weeklyContest.status !== 'active') {
          return res.status(400).json({ error: 'Le concours n\'est plus actif' })
        }

        // Ajouter la participation
        const { data: participation, error: participationError } = await supabase
          .from('weekly_recipe_candidates')
          .insert({
            weekly_contest_id: weeklyContest.id,
            recipe_id,
            user_id,
            is_manual_entry: true
          })
          .select()
          .single()

        if (participationError) {
          if (participationError.code === '23505') {
            return res.status(400).json({ 
              error: 'Cette recette participe déjà au concours' 
            })
          }
          throw participationError
        }

        // Mettre à jour le nombre de candidats
        const { error: updateCountError } = await supabase
          .from('weekly_recipe_contest')
          .update({ 
            total_candidates: supabase.raw('total_candidates + 1')
          })
          .eq('id', weeklyContest.id)

        if (updateCountError) {
          logError('Error updating candidates count', updateCountError)
        }

        logInfo('Weekly contest participation added', {
          requestId,
          participationId: participation.id,
          recipeId: recipe_id,
          userId: user_id,
          contestId: weeklyContest.id
        })

        return res.status(201).json(participation)
      }

      return res.status(400).json({ error: 'Action non reconnue' })
    }

    return res.status(405).json({
      error: 'Méthode non autorisée',
      allowedMethods: ['GET', 'POST'],
      requestId
    })

  } catch (error) {
    logError('Weekly recipe contest API error', error, { 
      requestId, 
      method: req.method, 
      query: req.query 
    })
    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message,
      requestId
    })
  }
}

// Fonction pour sélectionner automatiquement les candidats de la semaine
async function selectWeeklyCandiates(contestId, startOfWeek, endOfWeek, requestId) {
  try {
    logInfo('Selecting weekly candidates', { requestId, contestId })
    
    // Sélectionner les 10 recettes les plus populaires de la semaine
    const { data: topRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        user_id,
        created_at,
        likes_count
      `)
      .gte('created_at', startOfWeek.toISOString())
      .lt('created_at', endOfWeek.toISOString())
      .order('likes_count', { ascending: false })
      .limit(10)

    if (recipesError) {
      logError('Error selecting weekly candidates', recipesError, { requestId })
      return
    }

    logInfo('Found recipes for weekly selection', {
      requestId,
      recipesCount: topRecipes?.length || 0
    })

    if (topRecipes && topRecipes.length > 0) {
      const candidates = topRecipes.map(recipe => ({
        weekly_contest_id: contestId,
        recipe_id: recipe.id,
        user_id: recipe.user_id,
        is_manual_entry: false,
        votes_received: 0
      }))

      const { error: insertError } = await supabase
        .from('weekly_recipe_candidates')
        .insert(candidates)

      if (insertError) {
        logError('Error inserting weekly candidates', insertError, { requestId })
      } else {
        logInfo('Weekly candidates selected automatically', {
          requestId,
          contestId,
          candidatesCount: candidates.length
        })

        // Mettre à jour le compteur
        await supabase
          .from('weekly_recipe_contest')
          .update({ total_candidates: candidates.length })
          .eq('id', contestId)
      }
    }
  } catch (error) {
    logError('Error in selectWeeklyCandiates', error, { requestId })
  }
}
