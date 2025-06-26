import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' })
      }

      // Obtenir ou créer le concours de la semaine actuelle
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError) {
        console.error('Error getting current weekly contest:', contestError)
        return res.status(500).json({ error: 'Failed to get weekly contest' })
      }

      if (!contest || contest.length === 0) {
        return res.status(404).json({ error: 'No weekly contest found' })
      }

      const currentContest = contest[0]

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

      if (candidatesError) {
        console.error('Error getting user candidates:', candidatesError)
        return res.status(500).json({ error: 'Failed to get user candidates' })
      }

      return res.status(200).json({
        contest: currentContest,
        userCandidates: userCandidates || []
      })
    }

    if (req.method === 'POST') {
      const { recipe_id, user_id, is_manual_entry = true } = req.body

      if (!recipe_id || !user_id) {
        return res.status(400).json({ error: 'recipe_id and user_id are required' })
      }

      // Obtenir le concours actuel
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError || !contest || contest.length === 0) {
        return res.status(500).json({ error: 'Failed to get current weekly contest' })
      }

      const currentContest = contest[0]

      // Vérifier si l'utilisateur n'a pas déjà trop de candidatures
      const { data: existingCandidates, error: countError } = await supabase
        .from('weekly_recipe_candidates')
        .select('id')
        .eq('weekly_contest_id', currentContest.id)
        .eq('user_id', user_id)

      if (countError) {
        return res.status(500).json({ error: 'Failed to check existing candidates' })
      }

      if (existingCandidates.length >= 5) {
        return res.status(400).json({ 
          error: 'Maximum number of candidates reached',
          message: 'Vous ne pouvez pas inscrire plus de 5 recettes par semaine'
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
        return res.status(403).json({ 
          error: 'Recipe not found or not owned by user',
          message: 'Cette recette ne vous appartient pas ou n\'existe pas'
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
          return res.status(400).json({ 
            error: 'Recipe already registered',
            message: 'Cette recette est déjà inscrite au concours'
          })
        }
        console.error('Error inserting candidate:', insertError)
        return res.status(500).json({ error: 'Failed to register recipe' })
      }

      // Mettre à jour le compteur dans le concours
      await supabase
        .from('weekly_recipe_contest')
        .update({
          total_candidates: existingCandidates.length + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentContest.id)

      return res.status(201).json({
        message: 'Recipe registered successfully',
        candidate: candidate
      })
    }

    if (req.method === 'DELETE') {
      const { recipe_id, user_id } = req.body

      if (!recipe_id || !user_id) {
        return res.status(400).json({ error: 'recipe_id and user_id are required' })
      }

      // Obtenir le concours actuel
      const { data: contest, error: contestError } = await supabase
        .rpc('get_current_weekly_contest')

      if (contestError || !contest || contest.length === 0) {
        return res.status(500).json({ error: 'Failed to get current weekly contest' })
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
        console.error('Error deleting candidate:', deleteError)
        return res.status(500).json({ error: 'Failed to remove recipe from contest' })
      }

      if (!deleted || deleted.length === 0) {
        return res.status(404).json({ 
          error: 'Candidate not found',
          message: 'Cette recette n\'était pas inscrite au concours'
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

      return res.status(200).json({
        message: 'Recipe removed from contest successfully'
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
