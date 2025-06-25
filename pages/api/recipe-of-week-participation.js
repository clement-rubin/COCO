import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'

export default async function handler(req, res) {
  const { method } = req

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        return res.status(400).json({ error: 'user_id requis' })
      }

      // Calculer la période de la semaine courante
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Récupérer TOUTES les recettes de l'utilisateur (pas seulement cette semaine)
      const { data: allRecipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, title, description, image, created_at, category')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(50) // Limiter à 50 recettes max pour les performances

      if (recipesError) throw recipesError

      // Vérifier quelles recettes sont déjà candidates cette semaine
      const { data: existingCandidates, error: candidatesError } = await supabase
        .from('recipe_week_candidates')
        .select('recipe_id')
        .eq('user_id', user_id)
        .gte('created_at', startOfWeek.toISOString())

      if (candidatesError && candidatesError.code !== 'PGRST116') {
        throw candidatesError
      }

      const candidateIds = existingCandidates?.map(c => c.recipe_id) || []

      // Marquer les recettes selon leur statut
      const recipesWithStatus = allRecipes.map(recipe => {
        const isThisWeek = new Date(recipe.created_at) >= startOfWeek
        const isCandidate = candidateIds.includes(recipe.id)
        
        return {
          ...recipe,
          isCandidate,
          canParticipate: !isCandidate,
          isThisWeek, // Indiquer si c'est une recette de cette semaine
          createdThisWeek: isThisWeek
        }
      })

      return res.status(200).json({
        allRecipes: recipesWithStatus,
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
        maxCandidates: 5, // Augmenter la limite à 5 recettes par utilisateur
        currentCandidates: candidateIds.length
      })
    }

    if (method === 'POST') {
      const { recipe_id, user_id } = req.body

      if (!recipe_id || !user_id) {
        return res.status(400).json({ error: 'recipe_id et user_id requis' })
      }

      // Vérifier que la recette appartient à l'utilisateur (peu importe quand elle a été créée)
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, title, user_id, created_at, image')
        .eq('id', recipe_id)
        .eq('user_id', user_id)
        .single()

      if (recipeError) {
        return res.status(404).json({ error: 'Recette non trouvée' })
      }

      // Calculer la semaine courante pour les limites
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      // Vérifier le nombre de candidatures existantes CETTE SEMAINE
      const { data: existingCandidates, error: countError } = await supabase
        .from('recipe_week_candidates')
        .select('id')
        .eq('user_id', user_id)
        .gte('created_at', startOfWeek.toISOString())

      if (countError && countError.code !== 'PGRST116') {
        throw countError
      }

      if (existingCandidates && existingCandidates.length >= 5) {
        return res.status(400).json({ 
          error: 'Limite atteinte',
          message: 'Vous pouvez inscrire maximum 5 recettes par semaine'
        })
      }

      // Vérifier si la recette n'est pas déjà candidate CETTE SEMAINE
      const { data: existingCandidate, error: duplicateError } = await supabase
        .from('recipe_week_candidates')
        .select('id')
        .eq('recipe_id', recipe_id)
        .eq('user_id', user_id)
        .gte('created_at', startOfWeek.toISOString())
        .single()

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        throw duplicateError
      }

      if (existingCandidate) {
        return res.status(409).json({ 
          error: 'Recette déjà candidate',
          message: 'Cette recette participe déjà au concours cette semaine'
        })
      }

      // Inscrire la recette au concours de CETTE semaine
      const { data: candidate, error: insertError } = await supabase
        .from('recipe_week_candidates')
        .insert([{
          recipe_id,
          user_id,
          created_at: new Date().toISOString() // Date d'inscription, pas de création de la recette
        }])
        .select()
        .single()

      if (insertError) throw insertError

      logInfo('Recette inscrite au concours', {
        candidateId: candidate.id,
        recipeId: recipe_id,
        userId: user_id.substring(0, 8) + '...',
        recipeTitle: recipe.title,
        recipeCreatedAt: recipe.created_at,
        inscriptionDate: candidate.created_at
      })

      return res.status(201).json({
        message: 'Recette inscrite au concours avec succès',
        candidate
      })
    }

    if (method === 'DELETE') {
      const { recipe_id, user_id } = req.query

      if (!recipe_id || !user_id) {
        return res.status(400).json({ error: 'recipe_id et user_id requis' })
      }

      // Supprimer la candidature
      const { error: deleteError } = await supabase
        .from('recipe_week_candidates')
        .delete()
        .eq('recipe_id', recipe_id)
        .eq('user_id', user_id)

      if (deleteError) throw deleteError

      return res.status(200).json({
        message: 'Candidature retirée avec succès'
      })
    }

    return res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    logError('Recipe participation API error', error, {
      method,
      body: req.body,
      query: req.query
    })

    return res.status(500).json({
      error: 'Erreur serveur',
      message: error.message
    })
  }
}
