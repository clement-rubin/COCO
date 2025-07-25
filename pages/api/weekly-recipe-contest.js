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

      // Remove the user_id requirement check - make it optional
      // if (!user_id) {
      //   logWarning('Weekly contest GET: missing user_id', { requestId })
      //   return res.status(400).json({ 
      //     error: 'user_id parameter is required',
      //     requestId 
      //   })
      // }

      try {
        // Utiliser la fonction PostgreSQL pour obtenir le concours courant
        const { data: contest, error: contestError } = await supabase
          .rpc('get_current_weekly_contest')

        if (contestError) {
          logError('Error calling get_current_weekly_contest function', contestError, { requestId })
          return res.status(500).json({
            error: 'Failed to get current weekly contest',
            details: contestError.message,
            requestId
          })
        }

        let weeklyContest = null
        if (contest && contest.length > 0) {
          weeklyContest = contest[0]
        }

        if (!weeklyContest) {
          logWarning('No weekly contest returned from function', { requestId })
          return res.status(200).json({
            contest: null,
            candidates: [],
            weekStart: new Date().toISOString(),
            weekEnd: new Date().toISOString(),
            totalVotes: 0,
            hasUserVoted: false,
            requestId
          })
        }

        logInfo('Weekly contest retrieved successfully', {
          requestId,
          contestId: weeklyContest.id,
          weekStart: weeklyContest.week_start,
          weekEnd: weeklyContest.week_end,
          status: weeklyContest.status
        })

        // Récupérer les candidats avec leurs recettes
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
              category
            )
          `)
          .eq('weekly_contest_id', weeklyContest.id)
          .order('votes_received', { ascending: false })

        if (candidatesError) {
          logError('Error fetching candidates with recipes', candidatesError, { requestId })
          // Return partial response instead of failing completely
          return res.status(200).json({
            contest: weeklyContest,
            candidates: [],
            weekStart: weeklyContest.week_start,
            weekEnd: weeklyContest.week_end,
            totalVotes: weeklyContest.total_votes || 0,
            hasUserVoted: false,
            error: 'Could not load candidates',
            requestId
          })
        }

        // Vérifier si l'utilisateur a déjà voté - only if user_id is provided
        let hasUserVoted = false
        if (user_id) {
          const { data: userVote, error: voteError } = await supabase
            .from('weekly_recipe_votes')
            .select('id')
            .eq('weekly_contest_id', weeklyContest.id)
            .eq('voter_id', user_id)
            .limit(1) // CORRECTION: Utiliser limit(1) au lieu de maybeSingle()

          if (voteError) {
            logWarning('Error checking user vote', voteError, { requestId })
          }

          hasUserVoted = !!(userVote && userVote.length > 0) // CORRECTION: Vérifier la longueur du tableau
        }

        // Enrichir les candidats
        const enrichedCandidates = candidates?.map(candidate => ({
          ...candidate,
          recipe: candidate.recipes,
          // Mark if this candidate received a vote from the current user
          hasUserVoted: user_id ? false : false // Will be set correctly below if user voted
        })) || []

        // If user is logged in, check which candidates they voted for
        if (user_id && enrichedCandidates.length > 0) {
          const candidateIds = enrichedCandidates.map(c => c.id)
          const { data: userVotes } = await supabase
            .from('weekly_recipe_votes')
            .select('candidate_id')
            .eq('weekly_contest_id', weeklyContest.id)
            .eq('voter_id', user_id)
            .in('candidate_id', candidateIds)

          const votedCandidateIds = new Set(userVotes?.map(v => v.candidate_id) || [])
          
          enrichedCandidates.forEach(candidate => {
            candidate.hasUserVoted = votedCandidateIds.has(candidate.id)
          })
        }

        logInfo('Weekly recipe contest data retrieved successfully', {
          requestId,
          contestId: weeklyContest.id,
          candidatesCount: enrichedCandidates.length,
          totalVotes: weeklyContest.total_votes,
          hasUserVoted,
          userId: user_id ? user_id.substring(0, 8) + '...' : 'anonymous'
        })

        return res.status(200).json({
          contest: weeklyContest,
          candidates: enrichedCandidates,
          weekStart: weeklyContest.week_start,
          weekEnd: weeklyContest.week_end,
          totalVotes: weeklyContest.total_votes || 0,
          hasUserVoted,
          requestId
        })

      } catch (dbError) {
        logError('Database error in weekly contest GET', dbError, { requestId })
        return res.status(500).json({
          error: 'Database error',
          details: dbError.message,
          requestId
        })
      }
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId
    })
  }
}

// Fonction pour sélectionner automatiquement les candidats de la semaine
async function selectWeeklyCandiates(contestId, startOfWeek, endOfWeek, requestId) {
  try {
    logInfo('Selecting weekly candidates', { requestId, contestId })
    
    // Calculer les dates correctement
    const startDate = new Date(startOfWeek)
    startDate.setDate(startDate.getDate() - 7) // Recettes de la semaine précédente
    
    // Sélectionner les recettes récentes avec user_id valide
    const { data: topRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        user_id,
        created_at,
        title
      `)
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
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

      const { data: insertedCandidates, error: insertError } = await supabase
        .from('weekly_recipe_candidates')
        .insert(candidates)
        .select()

      if (insertError) {
        logError('Error inserting weekly candidates', insertError, { requestId })
      } else {
        logInfo('Weekly candidates selected automatically', {
          requestId,
          contestId,
          candidatesCount: insertedCandidates?.length || 0
        })
      }
    }
  } catch (error) {
    logError('Error in selectWeeklyCandiates', error, { requestId })
  }
}
