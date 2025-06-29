import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `participation-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    logInfo('Weekly contest participation API called', { 
      requestId, 
      method: req.method, 
      query: req.query,
      body: req.body
    })

    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        logWarning('Participation GET: missing user_id', { requestId })
        return res.status(400).json({ 
          error: 'user_id parameter is required',
          requestId 
        })
      }

      try {
        // Obtenir le concours de la semaine courante
        const { data: contest, error: contestError } = await supabase
          .rpc('get_current_weekly_contest')
        
        if (contestError) {
          logError('Error getting current weekly contest', contestError, { requestId })
          return res.status(500).json({
            error: 'Failed to get current contest',
            details: contestError.message,
            requestId
          })
        }

        let currentContest = null
        if (contest && contest.length > 0) {
          currentContest = contest[0]
        }

        if (!currentContest) {
          logWarning('No current weekly contest found', { requestId })
          return res.status(200).json({
            contest: null,
            userCandidates: [],
            requestId
          })
        }

        // Récupérer les participations de l'utilisateur pour ce concours
        const { data: userCandidates, error: candidatesError } = await supabase
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
              created_at,
              category
            )
          `)
          .eq('weekly_contest_id', currentContest.id)
          .eq('user_id', user_id)

        if (candidatesError) {
          logError('Error fetching user candidates', candidatesError, { requestId })
          return res.status(500).json({
            error: 'Failed to fetch user candidates',
            details: candidatesError.message,
            requestId
          })
        }

        logInfo('Weekly contest participation data retrieved', {
          requestId,
          contestId: currentContest.id,
          userCandidatesCount: userCandidates?.length || 0,
          userId: user_id?.substring(0, 8) + '...'
        })

        return res.status(200).json({
          contest: currentContest,
          userCandidates: userCandidates || [],
          requestId
        })

      } catch (dbError) {
        logError('Database error in weekly contest participation', dbError, { requestId })
        return res.status(500).json({
          error: 'Database error',
          details: dbError.message,
          requestId
        })
      }
    }

    if (req.method === 'POST') {
      const { recipe_id, user_id, is_manual_entry = true } = req.body

      if (!recipe_id || !user_id) {
        logWarning('Participation POST: missing required fields', { 
          requestId, 
          hasRecipeId: !!recipe_id, 
          hasUserId: !!user_id 
        })
        return res.status(400).json({
          error: 'recipe_id and user_id are required',
          requestId
        })
      }

      try {
        // Obtenir le concours de la semaine courante
        const { data: contest, error: contestError } = await supabase
          .rpc('get_current_weekly_contest')
        
        if (contestError) {
          logError('Error getting current weekly contest for participation', contestError, { requestId })
          return res.status(500).json({
            error: 'Failed to get current contest',
            details: contestError.message,
            requestId
          })
        }

        let currentContest = null
        if (contest && contest.length > 0) {
          currentContest = contest[0]
        }

        if (!currentContest) {
          logError('No current weekly contest found for participation', null, { requestId })
          return res.status(404).json({
            error: 'No active weekly contest found',
            requestId
          })
        }

        // Vérifier que la recette appartient bien à l'utilisateur
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select('id, user_id, title')
          .eq('id', recipe_id)
          .eq('user_id', user_id)
          .single()

        if (recipeError || !recipe) {
          logError('Recipe not found or not owned by user', recipeError, { 
            requestId, 
            recipeId: recipe_id, 
            userId: user_id?.substring(0, 8) + '...' 
          })
          return res.status(404).json({
            error: 'Recipe not found or not owned by user',
            requestId
          })
        }

        // Ajouter la participation
        const { data: participation, error: participationError } = await supabase
          .from('weekly_recipe_candidates')
          .insert({
            weekly_contest_id: currentContest.id,
            recipe_id,
            user_id,
            is_manual_entry,
            votes_received: 0
          })
          .select()
          .single()

        if (participationError) {
          if (participationError.code === '23505') {
            logWarning('Recipe already participating in contest', participationError, { requestId })
            return res.status(400).json({ 
              error: 'Cette recette participe déjà au concours',
              requestId
            })
          }
          logError('Error inserting participation', participationError, { requestId })
          return res.status(500).json({
            error: 'Failed to add participation',
            details: participationError.message,
            requestId
          })
        }

        logInfo('Weekly contest participation added', {
          requestId,
          participationId: participation.id,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          contestId: currentContest.id,
          recipeTitle: recipe.title
        })

        return res.status(201).json({
          ...participation,
          requestId
        })

      } catch (dbError) {
        logError('Database error in participation POST', dbError, { requestId })
        return res.status(500).json({
          error: 'Database error',
          details: dbError.message,
          requestId
        })
      }
    }

    if (req.method === 'DELETE') {
      const { recipe_id, user_id } = req.body

      if (!recipe_id || !user_id) {
        logWarning('Participation DELETE: missing required fields', { 
          requestId, 
          hasRecipeId: !!recipe_id, 
          hasUserId: !!user_id 
        })
        return res.status(400).json({
          error: 'recipe_id and user_id are required',
          requestId
        })
      }

      try {
        // Obtenir le concours de la semaine courante
        const { data: contest, error: contestError } = await supabase
          .rpc('get_current_weekly_contest')
        
        if (contestError) {
          logError('Error getting current weekly contest for deletion', contestError, { requestId })
          return res.status(500).json({
            error: 'Failed to get current contest',
            details: contestError.message,
            requestId
          })
        }

        let currentContest = null
        if (contest && contest.length > 0) {
          currentContest = contest[0]
        }

        if (!currentContest) {
          logError('No current weekly contest found for deletion', null, { requestId })
          return res.status(404).json({
            error: 'No active weekly contest found',
            requestId
          })
        }

        // Supprimer la participation
        const { data: deletedParticipation, error: deleteError } = await supabase
          .from('weekly_recipe_candidates')
          .delete()
          .eq('weekly_contest_id', currentContest.id)
          .eq('recipe_id', recipe_id)
          .eq('user_id', user_id)
          .select()

        if (deleteError) {
          logError('Error deleting participation', deleteError, { requestId })
          return res.status(500).json({
            error: 'Failed to delete participation',
            details: deleteError.message,
            requestId
          })
        }

        if (!deletedParticipation || deletedParticipation.length === 0) {
          logWarning('No participation found to delete', null, { 
            requestId, 
            recipeId: recipe_id, 
            userId: user_id?.substring(0, 8) + '...',
            contestId: currentContest.id
          })
          return res.status(404).json({
            error: 'Participation not found',
            requestId
          })
        }

        logInfo('Weekly contest participation removed', {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          contestId: currentContest.id,
          deletedCount: deletedParticipation.length
        })

        return res.status(200).json({
          message: 'Participation removed successfully',
          requestId
        })

      } catch (dbError) {
        logError('Database error in participation DELETE', dbError, { requestId })
        return res.status(500).json({
          error: 'Database error',
          details: dbError.message,
          requestId
        })
      }
    }

    return res.status(405).json({
      error: 'Method not allowed',
      allowedMethods: ['GET', 'POST', 'DELETE'],
      requestId
    })

  } catch (error) {
    logError('Weekly contest participation API error', error, { 
      requestId, 
      method: req.method, 
      query: req.query,
      body: req.body
    })
    return res.status(500).json({
      error: 'Server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      requestId
    })
  }
}
