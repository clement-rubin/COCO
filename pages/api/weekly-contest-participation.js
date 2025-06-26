import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  
  try {
    console.log(`[${requestId}] Weekly contest participation API called`, {
      method: req.method,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString()
    })

    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        console.log(`[${requestId}] Missing user_id parameter`)
        return res.status(400).json({ 
          error: 'user_id is required',
          requestId 
        })
      }

      console.log(`[${requestId}] Getting weekly contest for user:`, user_id?.substring(0, 8) + '...')

      // Obtenir ou créer le concours de la semaine actuelle
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      console.log(`[${requestId}] Weekly contest RPC result:`, {
        hasData: !!contest,
        dataLength: contest?.length || 0,
        hasError: !!contestError,
        errorMessage: contestError?.message,
        errorCode: contestError?.code
      })

      if (contestError) {
        console.error(`[${requestId}] Error getting current weekly contest:`, contestError)
        return res.status(500).json({ 
          error: 'Failed to get weekly contest',
          details: contestError.message,
          requestId 
        })
      }

      if (!contest || contest.length === 0) {
        console.log(`[${requestId}] No weekly contest found, creating default response`)
        return res.status(200).json({
          contest: {
            id: null,
            week_start: new Date().toISOString(),
            week_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            total_candidates: 0
          },
          userCandidates: [],
          requestId
        })
      }

      const currentContest = contest[0]
      console.log(`[${requestId}] Found contest:`, {
        id: currentContest.id,
        weekStart: currentContest.week_start,
        weekEnd: currentContest.week_end,
        totalCandidates: currentContest.total_candidates
      })

      // Obtenir les candidatures de l'utilisateur pour cette semaine
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
        .eq('weekly_contest_id', currentContest.id)
        .eq('user_id', user_id)

      console.log(`[${requestId}] User candidates query result:`, {
        hasData: !!userCandidates,
        candidatesCount: userCandidates?.length || 0,
        hasError: !!candidatesError,
        errorMessage: candidatesError?.message
      })

      if (candidatesError) {
        console.error(`[${requestId}] Error getting user candidates:`, candidatesError)
        return res.status(500).json({ 
          error: 'Failed to get user candidates',
          details: candidatesError.message,
          requestId 
        })
      }

      console.log(`[${requestId}] Returning successful response with ${userCandidates?.length || 0} candidates`)

      return res.status(200).json({
        contest: currentContest,
        userCandidates: userCandidates || [],
        requestId
      })
    }

    if (req.method === 'POST') {
      const { recipe_id, user_id, is_manual_entry = true } = req.body

      console.log(`[${requestId}] POST request to add recipe to contest:`, {
        recipeId: recipe_id,
        userId: user_id?.substring(0, 8) + '...',
        isManualEntry: is_manual_entry
      })

      if (!recipe_id || !user_id) {
        console.log(`[${requestId}] Missing required parameters for POST`)
        return res.status(400).json({ 
          error: 'recipe_id and user_id are required',
          requestId 
        })
      }

      // Obtenir le concours actuel
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError || !contest || contest.length === 0) {
        console.error(`[${requestId}] Failed to get current weekly contest for POST:`, contestError)
        return res.status(500).json({ 
          error: 'Failed to get current weekly contest',
          details: contestError?.message,
          requestId 
        })
      }

      const currentContest = contest[0]

      // Vérifier si l'utilisateur n'a pas déjà trop de candidatures
      const { data: existingCandidates, error: countError } = await supabase
        .from('weekly_recipe_candidates')
        .select('id')
        .eq('weekly_contest_id', currentContest.id)
        .eq('user_id', user_id)

      if (countError) {
        console.error(`[${requestId}] Failed to check existing candidates:`, countError)
        return res.status(500).json({ 
          error: 'Failed to check existing candidates',
          details: countError.message,
          requestId 
        })
      }

      if (existingCandidates.length >= 5) {
        console.log(`[${requestId}] User has reached maximum candidates limit:`, existingCandidates.length)
        return res.status(400).json({ 
          error: 'Maximum number of candidates reached',
          message: 'Vous ne pouvez pas inscrire plus de 5 recettes par semaine',
          requestId
        })
      }

      // Vérifier que la recette appartient à l'utilisateur
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, user_id, title')
        .eq('id', recipe_id)
        .eq('user_id', user_id)
        .single()

      if (recipeError || !recipe) {
        console.error(`[${requestId}] Recipe validation failed:`, recipeError)
        return res.status(403).json({ 
          error: 'Recipe not found or not owned by user',
          message: 'Cette recette ne vous appartient pas ou n\'existe pas',
          requestId
        })
      }

      // Ajouter la candidature
      const { data: candidate, error: insertError } = await supabase
        .from('weekly_recipe_candidates')
        .insert({
          weekly_contest_id: currentContest.id,
          recipe_id: recipe_id,
          user_id: user_id,
          is_manual_entry: is_manual_entry
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          console.log(`[${requestId}] Recipe already registered:`, recipe_id)
          return res.status(400).json({ 
            error: 'Recipe already registered',
            message: 'Cette recette est déjà inscrite au concours',
            requestId
          })
        }
        console.error(`[${requestId}] Error inserting candidate:`, insertError)
        return res.status(500).json({ 
          error: 'Failed to register recipe',
          details: insertError.message,
          requestId 
        })
      }

      // Mettre à jour le compteur dans le concours
      await supabase
        .from('weekly_recipe_contest')
        .update({
          total_candidates: existingCandidates.length + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentContest.id)

      console.log(`[${requestId}] Recipe successfully registered for contest`)

      return res.status(201).json({
        message: 'Recipe registered successfully',
        candidate: candidate,
        requestId
      })
    }

    if (req.method === 'DELETE') {
      const { recipe_id, user_id } = req.body

      console.log(`[${requestId}] DELETE request to remove recipe from contest:`, {
        recipeId: recipe_id,
        userId: user_id?.substring(0, 8) + '...'
      })

      if (!recipe_id || !user_id) {
        console.log(`[${requestId}] Missing required parameters for DELETE`)
        return res.status(400).json({ 
          error: 'recipe_id and user_id are required',
          requestId 
        })
      }

      // Obtenir le concours actuel
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError || !contest || contest.length === 0) {
        console.error(`[${requestId}] Failed to get current weekly contest for DELETE:`, contestError)
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
        console.error(`[${requestId}] Error deleting candidate:`, deleteError)
        return res.status(500).json({ 
          error: 'Failed to remove recipe from contest',
          details: deleteError.message,
          requestId 
        })
      }

      if (!deleted || deleted.length === 0) {
        console.log(`[${requestId}] No candidate found to delete`)
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

      console.log(`[${requestId}] Recipe successfully removed from contest`)

      return res.status(200).json({
        message: 'Recipe removed from contest successfully',
        requestId
      })
    }

    console.log(`[${requestId}] Method not allowed:`, req.method)
    return res.status(405).json({ 
      error: 'Method not allowed',
      requestId 
    })

  } catch (error) {
    console.error(`[${requestId}] API Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      requestId
    })
  }
}
