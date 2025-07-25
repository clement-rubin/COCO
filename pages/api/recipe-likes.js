import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug, logHttpError } from '../../utils/logger'

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
      userAgent: req.headers['user-agent']?.substring(0, 100),
      hasAuth: !!req.headers.authorization
    })

    // Validation de la connexion Supabase
    if (!supabase) {
      logError('Supabase client not initialized', null, { requestId })
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Database connection not available',
        requestId
      })
    }

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
                // Dans une vraie app, récupérer l'auth
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

      // Validation des paramètres
      if (!recipe_id || !user_id) {
        logError('Missing required parameters', { recipe_id, user_id }, { requestId })
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'recipe_id et user_id sont requis',
          requestId,
          received: { recipe_id: !!recipe_id, user_id: !!user_id }
        })
      }

      // Validation du format UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(recipe_id)) {
        logError('Invalid recipe_id format', { recipe_id }, { requestId })
        return res.status(400).json({
          error: 'Format invalide',
          message: 'recipe_id doit être un UUID valide',
          requestId
        })
      }

      if (!uuidRegex.test(user_id)) {
        logError('Invalid user_id format', { user_id }, { requestId })
        return res.status(400).json({
          error: 'Format invalide', 
          message: 'user_id doit être un UUID valide',
          requestId
        })
      }

      try {
        logDebug('Adding like to recipe', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...'
        })

        // Create a new Supabase client with service role for admin operations
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        // Vérifier que la recette existe
        const { data: recipe, error: recipeError } = await supabaseAdmin
          .from('recipes')
          .select('id, title, user_id')
          .eq('id', recipe_id)
          .single()

        if (recipeError) {
          logError('Error checking recipe existence', recipeError, { requestId, recipe_id })
          if (recipeError.code === 'PGRST116') {
            return res.status(404).json({
              error: 'Recette non trouvée',
              message: 'La recette spécifiée n\'existe pas',
              requestId
            })
          }
          throw recipeError
        }

        // Vérifier si le like existe déjà
        const { data: existingLike, error: checkError } = await supabaseAdmin
          .from('recipe_likes')
          .select('id')
          .eq('recipe_id', recipe_id)
          .eq('user_id', user_id)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          logError('Error checking existing like', checkError, { requestId })
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
            message: 'Vous avez déjà liké cette recette',
            requestId
          })
        }

        // Ajouter le like using admin client
        const { data: newLike, error: insertError } = await supabaseAdmin
          .from('recipe_likes')
          .insert([{
            recipe_id,
            user_id,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (insertError) {
          logError('Error inserting like with admin client', insertError, { 
            requestId,
            errorCode: insertError.code,
            errorMessage: insertError.message,
            errorDetails: insertError.details,
            errorHint: insertError.hint
          })
          
          // Return more specific error based on the error code
          if (insertError.code === '23505') {
            return res.status(409).json({
              error: 'Like déjà existant',
              message: 'Vous avez déjà liké cette recette',
              requestId
            })
          }
          
          throw insertError
        }

        // Attendre un peu pour que le trigger se déclenche
        await new Promise(resolve => setTimeout(resolve, 100))

        // Récupérer le compteur mis à jour automatiquement par le trigger
        const { data: recipeData, error: recipeError2 } = await supabaseAdmin
          .from('recipes')
          .select('likes_count')
          .eq('id', recipe_id)
          .single()

        if (recipeError2) {
          logError('Error getting updated recipe likes count', recipeError2, { requestId })
          // Continue with fallback
        }

        const updatedLikesCount = recipeData?.likes_count || 1

        logInfo('Like added successfully with admin client', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...',
          newLikesCount: updatedLikesCount,
          triggerWorked: updatedLikesCount > 0
        })

        return res.status(201).json({
          success: true,
          like: newLike,
          recipe: {
            likes_count: updatedLikesCount
          },
          stats: {
            likes_count: updatedLikesCount,
            user_has_liked: true
          },
          requestId
        })

      } catch (error) {
        // Log détaillé de l'erreur d'ajout de like
        logError('Complete error details when adding like in API with admin client', error, {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          postgresError: {
            code: error.code,
            severity: error.severity,
            detail: error.detail,
            hint: error.hint,
            position: error.position,
            internalPosition: error.internalPosition,
            internalQuery: error.internalQuery,
            where: error.where,
            schema: error.schema,
            table: error.table,
            column: error.column,
            dataType: error.dataType,
            constraint: error.constraint,
            file: error.file,
            line: error.line,
            routine: error.routine
          },
          supabaseContext: {
            timestamp: new Date().toISOString(),
            operation: 'INSERT recipe_like',
            table: 'recipe_likes',
            usingAdminClient: true
          },
          requestContext: {
            method: req.method,
            headers: {
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
              'origin': req.headers.origin,
              'referer': req.headers.referer,
              'authorization': req.headers.authorization ? 'present' : 'missing'
            },
            body: req.body,
            query: req.query,
            ip: req.connection?.remoteAddress || req.socket?.remoteAddress,
            startTime,
            duration: Date.now() - startTime
          }
        })

        // Return specific error information
        return res.status(500).json({
          error: 'Erreur lors de l\'ajout du like',
          message: error.message,
          code: error.code,
          details: error.details,
          requestId,
          timestamp: new Date().toISOString(),
          debugInfo: process.env.NODE_ENV === 'development' ? {
            stack: error.stack,
            hint: error.hint,
            severity: error.severity,
            usingAdminClient: true
          } : undefined
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

        // Create a new Supabase client with service role for admin operations
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        const { data: deletedLike, error: deleteError } = await supabaseAdmin
          .from('recipe_likes')
          .delete()
          .eq('recipe_id', recipe_id)
          .eq('user_id', user_id)
          .select()

        if (deleteError) {
          logError('Error deleting like with admin client', deleteError, { requestId })
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

        // Attendre un peu pour que le trigger se déclenche
        await new Promise(resolve => setTimeout(resolve, 100))

        // Récupérer le compteur mis à jour automatiquement par le trigger
        const { data: recipeData, error: recipeError } = await supabaseAdmin
          .from('recipes')
          .select('likes_count')
          .eq('id', recipe_id)
          .single()

        if (recipeError) {
          logError('Error getting updated recipe likes count after delete', recipeError, { requestId })
        }

        const updatedLikesCount = Math.max(0, recipeData?.likes_count || 0)

        logInfo('Like removed successfully with admin client', {
          requestId,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...',
          newLikesCount: updatedLikesCount,
          triggerWorked: true
        })

        return res.status(200).json({
          success: true,
          recipe: {
            likes_count: updatedLikesCount
          },
          stats: {
            likes_count: updatedLikesCount,
            user_has_liked: false
          }
        })

      } catch (error) {
        // Log détaillé de l'erreur de suppression de like
        logError('Complete error details when removing like in API with admin client', error, {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          postgresError: {
            code: error.code,
            severity: error.severity,
            detail: error.detail,
            hint: error.hint,
            constraint: error.constraint,
            table: error.table
          },
          requestContext: {
            method: req.method,
            headers: {
              'user-agent': req.headers['user-agent'],
              'origin': req.headers.origin,
              'referer': req.headers.referer,
              'authorization': req.headers.authorization ? 'present' : 'missing'
            },
            query: req.query,
            ip: req.connection?.remoteAddress || req.socket?.remoteAddress,
            duration: Date.now() - startTime
          },
          usingAdminClient: true
        })

        return res.status(500).json({
          error: 'Erreur lors de la suppression du like',
          message: error.message,
          code: error.code,
          requestId,
          timestamp: new Date().toISOString()
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
    // Log global complet avec tous les détails
    logError('Complete global error details in recipe likes API', globalError, {
      requestId,
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      errorCode: globalError.code,
      errorMessage: globalError.message,
      errorStack: globalError.stack,
      requestDetails: {
        headers: req.headers,
        body: req.body,
        query: req.query,
        cookies: req.cookies,
        ip: req.connection?.remoteAddress || req.socket?.remoteAddress
      },
      serverContext: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      supabaseStatus: {
        clientInitialized: !!supabase,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      }
    })

    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: globalError.message || 'Une erreur inattendue s\'est produite',
      code: globalError.code,
      requestId,
      timestamp: new Date().toISOString(),
      debugInfo: process.env.NODE_ENV === 'development' ? {
        stack: globalError.stack,
        duration: `${duration}ms`
      } : undefined
    })
  }
}
