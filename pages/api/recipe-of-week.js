import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'

export default async function handler(req, res) {
  const { method } = req

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    if (method === 'GET') {
      // Récupérer les candidats de la semaine et les votes
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      // Récupérer les 5 recettes les plus récentes de la semaine
      const { data: candidates, error: candidatesError } = await supabase
        .from('recipes')
        .select(`
          id,
          title,
          description,
          image,
          author,
          user_id,
          created_at,
          category
        `)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      if (candidatesError) throw candidatesError

      // Récupérer les votes pour ces recettes
      const candidateIds = candidates.map(c => c.id)
      
      const { data: votes, error: votesError } = await supabase
        .from('recipe_week_votes')
        .select('recipe_id, user_id')
        .in('recipe_id', candidateIds)

      if (votesError && votesError.code !== 'PGRST116') {
        throw votesError
      }

      // Compter les votes par recette
      const votesByRecipe = {}
      if (votes) {
        votes.forEach(vote => {
          votesByRecipe[vote.recipe_id] = (votesByRecipe[vote.recipe_id] || 0) + 1
        })
      }

      // Ajouter les votes aux candidats
      const candidatesWithVotes = candidates.map(candidate => ({
        ...candidate,
        votes: votesByRecipe[candidate.id] || 0,
        hasUserVoted: req.query.user_id ? 
          votes?.some(v => v.recipe_id === candidate.id && v.user_id === req.query.user_id) : 
          false
      }))

      // Trier par nombre de votes
      candidatesWithVotes.sort((a, b) => b.votes - a.votes)

      logInfo('Recipe of week candidates retrieved', {
        candidatesCount: candidatesWithVotes.length,
        totalVotes: Object.values(votesByRecipe).reduce((sum, count) => sum + count, 0),
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString()
      })

      return res.status(200).json({
        candidates: candidatesWithVotes,
        weekStart: startOfWeek.toISOString(),
        weekEnd: endOfWeek.toISOString(),
        totalVotes: Object.values(votesByRecipe).reduce((sum, count) => sum + count, 0)
      })
    }

    if (method === 'POST') {
      const { recipe_id, user_id } = req.body

      if (!recipe_id || !user_id) {
        return res.status(400).json({ 
          error: 'recipe_id et user_id requis' 
        })
      }

      // Vérifier si l'utilisateur a déjà voté cette semaine
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      startOfWeek.setHours(0, 0, 0, 0)

      const { data: existingVote, error: checkError } = await supabase
        .from('recipe_week_votes')
        .select('id')
        .eq('user_id', user_id)
        .gte('created_at', startOfWeek.toISOString())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingVote) {
        return res.status(409).json({ 
          error: 'Vous avez déjà voté cette semaine',
          message: 'Un seul vote par utilisateur et par semaine'
        })
      }

      // Vérifier que la recette existe et est éligible (créée cette semaine)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select('id, title, user_id, created_at, image')
        .eq('id', recipe_id)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())
        .single()

      if (recipeError) {
        return res.status(404).json({ 
          error: 'Recette non trouvée ou non éligible',
          message: 'La recette doit avoir été créée cette semaine'
        })
      }

      // Empêcher de voter pour sa propre recette
      if (recipe.user_id === user_id) {
        return res.status(403).json({ 
          error: 'Vote interdit',
          message: 'Vous ne pouvez pas voter pour votre propre recette'
        })
      }

      // Enregistrer le vote
      const { data: vote, error: voteError } = await supabase
        .from('recipe_week_votes')
        .insert([{
          recipe_id,
          user_id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (voteError) throw voteError

      logInfo('Recipe of week vote recorded', {
        voteId: vote.id,
        recipeId: recipe_id,
        userId: user_id.substring(0, 8) + '...',
        recipeTitle: recipe.title
      })

      return res.status(201).json({
        message: 'Vote enregistré avec succès',
        vote: vote
      })
    }

    return res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    logError('Recipe of week API error', error, {
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
