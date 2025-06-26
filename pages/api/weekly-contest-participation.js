import { createClient } from '@supabase/supabase-js'
import { logInfo, logError, logWarning } from '../../utils/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  
  try {
    logInfo('Weekly contest participation API called', {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })

    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        logWarning('Missing user_id parameter', { requestId })
        return res.status(400).json({ 
          error: 'user_id is required',
          requestId 
        })
      }

      logInfo('Getting weekly contest for user', { 
        requestId, 
        userId: user_id?.substring(0, 8) + '...' 
      })

      // Get current week dates
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Get or create current weekly contest
      let { data: contest, error: contestError } = await supabase
        .from('weekly_recipe_contest')
        .select('*')
        .eq('week_start', startOfWeek.toISOString().split('T')[0])
        .single()

      logInfo('Weekly contest query result', {
        requestId,
        hasData: !!contest,
        hasError: !!contestError,
        errorCode: contestError?.code,
        errorMessage: contestError?.message
      })

      if (contestError && contestError.code === 'PGRST116') {
        // Create new contest if it doesn't exist
        logInfo('Creating new weekly contest', { requestId })
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
          return res.status(500).json({ 
            error: 'Failed to create weekly contest',
            details: createError.message,
            requestId 
          })
        }
        contest = newContest
      } else if (contestError) {
        logError('Error getting current weekly contest', contestError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to get weekly contest',
          details: contestError.message,
          requestId 
        })
      }

      if (!contest) {
        logWarning('No weekly contest found', { requestId })
        return res.status(200).json({
          contest: {
            id: null,
            week_start: startOfWeek.toISOString(),
            week_end: endOfWeek.toISOString(),
            total_candidates: 0
          },
          userCandidates: [],
          requestId
        })
      }

      logInfo('Found contest', {
        requestId,
        contestId: contest.id,
        weekStart: contest.week_start,
        weekEnd: contest.week_end,
        totalCandidates: contest.total_candidates
      })

      // Get user's candidates for this week
      const { data: userCandidates, error: candidatesError } = await supabase
        .from('weekly_recipe_candidates')
        .select(`
          id,
          recipe_id,
          votes_received,
          is_manual_entry,
          added_at,
          recipes (
            id,
            title,
            image,
            category,
            created_at
          )
        `)
        .eq('weekly_contest_id', contest.id)
        .eq('user_id', user_id)

      logInfo('User candidates query result', {
        requestId,
        hasData: !!userCandidates,
        candidatesCount: userCandidates?.length || 0,
        hasError: !!candidatesError,
        errorMessage: candidatesError?.message
      })

      if (candidatesError) {
        logError('Error getting user candidates', candidatesError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to get user candidates',
          details: candidatesError.message,
          requestId 
        })
      }

      logInfo('Returning successful response', { 
        requestId, 
        candidatesCount: userCandidates?.length || 0 
      })

      return res.status(200).json({
        contest: contest,
        userCandidates: userCandidates || [],
        requestId
      })
    }

    if (req.method === 'POST') {
      const { recipe_id, user_id, is_manual_entry = true } = req.body

      logInfo('POST request to add recipe to contest', {
        requestId,
        recipeId: recipe_id,
        userId: user_id?.substring(0, 8) + '...',
        isManualEntry: is_manual_entry
      })

      if (!recipe_id || !user_id) {
        logWarning('Missing required parameters for POST', { requestId })
        return res.status(400).json({ 
          error: 'recipe_id and user_id are required',
          requestId 
        })
      }

      // Get current week dates
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Get or create current weekly contest
      let { data: contest, error: contestError } = await supabase
        .from('weekly_recipe_contest')
        .select('*')
        .eq('week_start', startOfWeek.toISOString().split('T')[0])
        .single()

      if (contestError && contestError.code === 'PGRST116') {
        // Create new contest if it doesn't exist
        logInfo('Creating new weekly contest for POST', { requestId })
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
          return res.status(500).json({ 
            error: 'Failed to create weekly contest',
            details: createError.message,
            requestId 
          })
        }
        contest = newContest
      } else if (contestError) {
        logError('Error getting current weekly contest', contestError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to get weekly contest',
          details: contestError.message,
          requestId 
        })
      }

      if (!contest) {
        logWarning('No weekly contest found when adding recipe', { requestId })
        return res.status(400).json({ 
          error: 'No active weekly contest found',
          requestId 
        })
      }

      // Check if user already has max candidates
      const { data: existingCandidates, error: countError } = await supabase
        .from('weekly_recipe_candidates')
        .select('id')
        .eq('weekly_contest_id', contest.id)
        .eq('user_id', user_id)

      if (countError) {
        logError('Failed to check existing candidates', countError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to check existing candidates',
          details: countError.message,
          requestId 
        })
      }

      if (existingCandidates.length >= 5) {
        logWarning('User has reached maximum candidates limit', { 
          requestId, 
          userId: user_id, 
          candidatesCount: existingCandidates.length 
        })
        return res.status(400).json({ 
          error: 'Maximum number of candidates reached',
          message: 'Vous ne pouvez pas inscrire plus de 5 recettes par semaine',
          requestId
        })
      }

      // Check that recipe belongs to user
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, user_id, title')
        .eq('id', recipe_id)
        .eq('user_id', user_id)
        .single()

      if (recipeError || !recipe) {
        logError('Recipe validation failed', recipeError, { requestId })
        return res.status(403).json({ 
          error: 'Recipe not found or not owned by user',
          message: 'Cette recette ne vous appartient pas ou n\'existe pas',
          requestId
        })
      }

      // Add candidate
      const { data: candidate, error: insertError } = await supabase
        .from('weekly_recipe_candidates')
        .insert({
          weekly_contest_id: contest.id,
          recipe_id: recipe_id,
          user_id: user_id,
          is_manual_entry: is_manual_entry
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          logWarning('Recipe already registered', { requestId, recipeId: recipe_id })
          return res.status(400).json({ 
            error: 'Recipe already registered',
            message: 'Cette recette est déjà inscrite au concours',
            requestId
          })
        }
        logError('Error inserting candidate', insertError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to register recipe',
          details: insertError.message,
          requestId 
        })
      }

      // Update contest total_candidates
      await supabase
        .from('weekly_recipe_contest')
        .update({
          total_candidates: existingCandidates.length + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', contest.id)

      logInfo('Recipe successfully registered for contest', {
        requestId,
        candidateId: candidate.id,
        contestId: contest.id
      })

      return res.status(201).json({
        message: 'Recipe registered successfully',
        candidate: candidate,
        requestId
      })
    }

    if (req.method === 'DELETE') {
      const { recipe_id, user_id } = req.body

      logInfo('DELETE request to remove recipe from contest', {
        requestId,
        recipeId: recipe_id,
        userId: user_id?.substring(0, 8) + '...'
      })

      if (!recipe_id || !user_id) {
        logWarning('Missing required parameters for DELETE', { requestId })
        return res.status(400).json({ 
          error: 'recipe_id and user_id are required',
          requestId 
        })
      }

      // Obtenir le concours actuel
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError || !contest || contest.length === 0) {
        logError('Failed to get current weekly contest for DELETE', contestError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to get current weekly contest',
          details: contestError?.message,
          requestId 
        })
      }

      const currentContest = contest[0]

      // Supprimer la candidature
      const { data: deleted, error: deleteError } = await supabase
        .from('weekly_recipe_candidates')
        .delete()
        .eq('weekly_contest_id', currentContest.id)
        .eq('recipe_id', recipe_id)
        .eq('user_id', user_id)
        .select()

      if (deleteError) {
        logError('Error deleting candidate', deleteError, { requestId })
        return res.status(500).json({ 
          error: 'Failed to remove recipe from contest',
          details: deleteError.message,
          requestId 
        })
      }

      if (!deleted || deleted.length === 0) {
        logWarning('No candidate found to delete', { requestId })
        return res.status(404).json({ 
          error: 'Candidate not found',
          message: 'Cette recette n\'était pas inscrite au concours',
          requestId
        })
      }

      // Mettre à jour le compteur dans le concours
      const { data: remainingCandidates } = await supabase
        .from('weekly_recipe_candidates')
        .select('id')
        .eq('weekly_contest_id', currentContest.id)

      await supabase
        .from('weekly_recipe_contest')
        .update({
          total_candidates: remainingCandidates.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentContest.id)

      logInfo('Recipe successfully removed from contest', {
        requestId,
        recipeId: recipe_id,
        contestId: currentContest.id
      })

      return res.status(200).json({
        message: 'Recipe removed from contest successfully',
        requestId
      })
    }

    logWarning('Method not allowed', { requestId, method: req.method })
    return res.status(405).json({ 
      error: 'Method not allowed',
      requestId 
    })

  } catch (error) {
    logError('Weekly contest participation API error', error, { 
      requestId, 
      method: req.method, 
      query: req.query 
    })
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      requestId
    })
  }
}
