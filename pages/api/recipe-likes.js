import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug } from '../../utils/logger'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = `like-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    logInfo(`Recipe likes API - ${req.method} request`, {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    })

    // GET - Obtenir les likes d'une recette ou de plusieurs recettes
    if (req.method === 'GET') {
      const { recipe_id, recipe_ids } = req.query

      if (recipe_ids) {
        // Obtenir les likes de plusieurs recettes
        try {
          const recipeIdsArray = recipe_ids.split(',').filter(id => id.trim())
          
          logDebug('Getting likes for multiple recipes', {
            requestId,
            recipeIdsCount: recipeIdsArray.length,
            recipeIds: recipeIdsArray.slice(0, 5)
          })

          // Récupérer les likes pour chaque recette
          const likesData = {}
          
          for (const recipeId of recipeIdsArray) {
            try {
              // Compter les likes pour cette recette
              const { count, error: countError } = await supabase
                .from('recipe_likes')
                .select('*', { count: 'exact', head: true })
                .eq('recipe_id', recipeId)

              if (countError) {
                logError('Error counting likes for recipe', countError, { recipeId })
                likesData[recipeId] = { likes_count: 0, user_has_liked: false }
                continue
              }

              // Vérifier si l'utilisateur actuel a liké (si connecté)
              let userHasLiked = false
              if (req.headers.authorization || req.headers['x-user-id']) {
                // Dans une vraie app, récupérer l'user_id depuis l'auth
                // Pour l'instant, pas de vérification user_has_liked pour les requêtes multiples
              }

              likesData[recipeId] = {
                likes_count: count || 0,
                user_has_liked: userHasLiked
              }
            } catch (error) {
              logError('Error processing recipe likes', error, { recipeId })
              likesData[recipeId] = { likes_count: 0, user_has_liked: false }
            }
          }

          logInfo('Multiple recipe likes retrieved', {
            requestId,
            recipesCount: Object.keys(likesData).length,
            totalLikes: Object.values(likesData).reduce((sum, item) => sum + item.likes_count, 0)
          })

          return res.status(200).json(likesData)
        } catch (error) {
          logError('Error getting multiple recipe likes', error, { requestId })
          return res.status(500).json({
            error: 'Erreur lors de la récupération des likes',
            message: error.message
          })
        }
      } else if (recipe_id) {
        // Obtenir les likes d'une seule recette
        try {
          logDebug('Getting likes for single recipe', {
            requestId,
            recipeId: recipe_id
          })

          const { data, error } = await supabase.rpc('get_recipe_likes_stats', {
            recipe_uuid: recipe_id
          })

          if (error) {
            throw error
          }

          // Assurer une structure cohérente
          const result = {
            likes_count: data?.likes_count || 0,
            user_has_liked: data?.user_has_liked || false
          }

          logInfo('Single recipe likes retrieved', {
            requestId,
            recipeId: recipe_id,
            likesCount: result.likes_count,
            userHasLiked: result.user_has_liked
          })

          return res.status(200).json(result)
        } catch (error) {
          logError('Error getting single recipe likes', error, { 
            requestId, 
            recipeId: recipe_id 
          })
          return res.status(500).json({
            error: 'Erreur lors de la récupération des likes',
            message: error.message
          })
        }
      } else {
        return res.status(400).json({
          error: 'Paramètre manquant',
          message: 'recipe_id ou recipe_ids requis'
        })
      }
    }

    // POST - Ajouter un like
    if (req.method === 'POST') {
      const { recipe_id, user_id } = req.body

      if (!recipe_id || !user_id) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'recipe_id et user_id sont requis'
        })
      }

      try {
        logDebug('Adding like to recipe', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...'
        })

        // Vérifier si le like existe déjà
        const { data: existingLike, error: checkError } = await supabase
          .from('recipe_likes')
          .select('id')
          .eq('recipe_id', recipe_id)
          .eq('user_id', user_id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingLike) {
          logInfo('Like already exists', {
            requestId,
            recipeId: recipe_id,
            userId: user_id.substring(0, 8) + '...'
          })
          return res.status(409).json({
            error: 'Like déjà existant',
            message: 'Vous avez déjà liké cette recette'
          })
        }

        // Ajouter le like
        const { data: newLike, error: insertError } = await supabase
          .from('recipe_likes')
          .insert([{
            recipe_id,
            user_id,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        // Obtenir les nouvelles statistiques
        const { data: stats, error: statsError } = await supabase.rpc('get_recipe_likes_stats', {
          recipe_uuid: recipe_id
        })

        if (statsError) {
          logError('Error getting updated stats after like', statsError, { requestId })
        }

        logInfo('Like added successfully', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...',
          newLikesCount: stats?.likes_count || 'unknown'
        })

        return res.status(201).json({
          success: true,
          like: newLike,
          stats: stats || { likes_count: 1, user_has_liked: true }
        })

      } catch (error) {
        logError('Error adding like', error, {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...'
        })

        return res.status(500).json({
          error: 'Erreur lors de l\'ajout du like',
          message: error.message
        })
      }
    }

    // DELETE - Supprimer un like
    if (req.method === 'DELETE') {
      const { recipe_id, user_id } = req.query

      if (!recipe_id || !user_id) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'recipe_id et user_id sont requis'
        })
      }

      try {
        logDebug('Removing like from recipe', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...'
        })

        const { data: deletedLike, error: deleteError } = await supabase
          .from('recipe_likes')
          .delete()
          .eq('recipe_id', recipe_id)
          .eq('user_id', user_id)
          .select()

        if (deleteError) {
          throw deleteError
        }

        if (!deletedLike || deletedLike.length === 0) {
          logInfo('Like not found for deletion', {
            requestId,
            recipeId: recipe_id,
            userId: user_id.substring(0, 8) + '...'
          })
          return res.status(404).json({
            error: 'Like non trouvé',
            message: 'Aucun like trouvé pour cette recette et cet utilisateur'
          })
        }

        // Obtenir les nouvelles statistiques
        const { data: stats, error: statsError } = await supabase.rpc('get_recipe_likes_stats', {
          recipe_uuid: recipe_id
        })

        if (statsError) {
          logError('Error getting updated stats after unlike', statsError, { requestId })
        }

        logInfo('Like removed successfully', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...',
          newLikesCount: stats?.likes_count || 'unknown'
        })

        return res.status(200).json({
          success: true,
          stats: stats || { likes_count: 0, user_has_liked: false }
        })

      } catch (error) {
        logError('Error removing like', error, {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...'
        })

        return res.status(500).json({
          error: 'Erreur lors de la suppression du like',
          message: error.message
        })
      }
    }

    // Méthode non supportée
    return res.status(405).json({
      error: 'Méthode non autorisée',
      message: `La méthode ${req.method} n'est pas supportée`
    })

  } catch (globalError) {
    const duration = Date.now() - startTime
    logError('Global error in recipe likes API', globalError, {
      requestId,
      method: req.method,
      duration: `${duration}ms`
    })

    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: 'Une erreur inattendue s\'est produite'
    })
  }
}
