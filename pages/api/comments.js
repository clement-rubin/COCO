import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug } from '../../utils/logger'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    logInfo(`Comments API - ${req.method} request`, {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
      userAgent: req.headers['user-agent']?.substring(0, 100)
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

    // Create admin client for database operations
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

    // GET - Récupérer les commentaires d'une recette
    if (req.method === 'GET') {
      const { recipe_id, limit = 20, offset = 0 } = req.query

      if (!recipe_id) {
        return res.status(400).json({
          error: 'Paramètre manquant',
          message: 'recipe_id est requis'
        })
      }

      try {
        // Récupérer les commentaires avec les informations utilisateur
        const { data: comments, error, count } = await supabaseAdmin
          .from('recipe_comments')
          .select(`
            id,
            text,
            created_at,
            updated_at,
            user_id,
            recipe_id,
            likes_count,
            users!inner(
              id,
              email,
              user_metadata
            )
          `, { count: 'exact' })
          .eq('recipe_id', recipe_id)
          .order('created_at', { ascending: false })
          .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

        if (error) {
          logError('Error fetching comments', error, { requestId, recipe_id })
          throw error
        }

        // Formater les commentaires pour l'affichage
        const formattedComments = comments.map(comment => ({
          id: comment.id,
          text: comment.text,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          user_id: comment.user_id,
          user_name: comment.users?.user_metadata?.display_name || 
                   comment.users?.email?.split('@')[0] || 
                   'Utilisateur',
          user_avatar: comment.users?.user_metadata?.avatar_url || null,
          likes_count: comment.likes_count || 0,
          userHasLiked: false, // TODO: Implement user like check
          replies: [] // TODO: Implement replies if needed
        }))

        logInfo('Comments retrieved successfully', {
          requestId,
          recipe_id,
          commentsCount: formattedComments.length,
          totalCount: count
        })

        return res.status(200).json({
          success: true,
          comments: formattedComments,
          pagination: {
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < count
          },
          requestId
        })

      } catch (error) {
        logError('Error getting comments', error, { requestId, recipe_id })
        return res.status(500).json({
          error: 'Erreur lors de la récupération des commentaires',
          message: error.message,
          requestId
        })
      }
    }

    // POST - Ajouter un nouveau commentaire
    if (req.method === 'POST') {
      const { recipe_id, user_id, text, user_name } = req.body

      // Validation des paramètres
      if (!recipe_id || !user_id || !text) {
        logError('Missing required parameters for comment creation', { recipe_id, user_id, text: !!text }, { requestId })
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'recipe_id, user_id et text sont requis',
          requestId
        })
      }

      // Validation de la longueur du texte
      if (text.length > 500) {
        return res.status(400).json({
          error: 'Texte trop long',
          message: 'Le commentaire ne peut pas dépasser 500 caractères',
          requestId
        })
      }

      // Validation du format UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(recipe_id) || !uuidRegex.test(user_id)) {
        return res.status(400).json({
          error: 'Format invalide',
          message: 'recipe_id et user_id doivent être des UUID valides',
          requestId
        })
      }

      try {
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

        // Créer le commentaire
        const { data: newComment, error: insertError } = await supabaseAdmin
          .from('recipe_comments')
          .insert([{
            recipe_id,
            user_id,
            text: text.trim(),
            created_at: new Date().toISOString(),
            likes_count: 0
          }])
          .select(`
            id,
            text,
            created_at,
            user_id,
            recipe_id,
            likes_count
          `)
          .single()

        if (insertError) {
          logError('Error inserting comment', insertError, { requestId })
          throw insertError
        }

        // Attendre un peu pour les triggers
        await new Promise(resolve => setTimeout(resolve, 100))

        // Mettre à jour le compteur de commentaires sur la recette
        const { error: updateError } = await supabaseAdmin
          .rpc('increment_recipe_comments_count', {
            recipe_uuid: recipe_id
          })

        if (updateError) {
          logError('Error updating recipe comments count', updateError, { requestId })
          // Continue même si l'update échoue
        }

        // Formater la réponse
        const formattedComment = {
          id: newComment.id,
          text: newComment.text,
          created_at: newComment.created_at,
          user_id: newComment.user_id,
          user_name: user_name || 'Utilisateur',
          user_avatar: null,
          likes_count: 0,
          userHasLiked: false,
          replies: []
        }

        logInfo('Comment created successfully', {
          requestId,
          commentId: newComment.id,
          recipe_id,
          userId: user_id.substring(0, 8) + '...',
          textLength: text.length
        })

        return res.status(201).json({
          success: true,
          comment: formattedComment,
          recipe: {
            id: recipe.id,
            title: recipe.title
          },
          requestId
        })

      } catch (error) {
        logError('Error creating comment', error, {
          requestId,
          recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          textLength: text?.length
        })

        return res.status(500).json({
          error: 'Erreur lors de la création du commentaire',
          message: error.message,
          code: error.code,
          requestId
        })
      }
    }

    // PUT - Modifier un commentaire
    if (req.method === 'PUT') {
      const { comment_id } = req.query
      const { text, user_id } = req.body

      if (!comment_id || !text || !user_id) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'comment_id, text et user_id sont requis'
        })
      }

      try {
        // Vérifier que le commentaire existe et appartient à l'utilisateur
        const { data: existingComment, error: checkError } = await supabaseAdmin
          .from('recipe_comments')
          .select('id, user_id, text')
          .eq('id', comment_id)
          .eq('user_id', user_id)
          .single()

        if (checkError || !existingComment) {
          return res.status(404).json({
            error: 'Commentaire non trouvé',
            message: 'Commentaire non trouvé ou vous n\'êtes pas autorisé à le modifier'
          })
        }

        // Mettre à jour le commentaire
        const { data: updatedComment, error: updateError } = await supabaseAdmin
          .from('recipe_comments')
          .update({
            text: text.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        logInfo('Comment updated successfully', {
          requestId,
          commentId: comment_id,
          userId: user_id.substring(0, 8) + '...'
        })

        return res.status(200).json({
          success: true,
          comment: updatedComment,
          requestId
        })

      } catch (error) {
        logError('Error updating comment', error, { requestId, comment_id })
        return res.status(500).json({
          error: 'Erreur lors de la modification du commentaire',
          message: error.message,
          requestId
        })
      }
    }

    // DELETE - Supprimer un commentaire
    if (req.method === 'DELETE') {
      const { comment_id, user_id } = req.query

      if (!comment_id || !user_id) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'comment_id et user_id sont requis'
        })
      }

      try {
        // Supprimer le commentaire (seulement si l'utilisateur en est le propriétaire)
        const { data: deletedComment, error: deleteError } = await supabaseAdmin
          .from('recipe_comments')
          .delete()
          .eq('id', comment_id)
          .eq('user_id', user_id)
          .select('recipe_id')

        if (deleteError) {
          throw deleteError
        }

        if (!deletedComment || deletedComment.length === 0) {
          return res.status(404).json({
            error: 'Commentaire non trouvé',
            message: 'Commentaire non trouvé ou vous n\'êtes pas autorisé à le supprimer'
          })
        }

        // Décrémenter le compteur de commentaires
        if (deletedComment[0]?.recipe_id) {
          const { error: updateError } = await supabaseAdmin
            .rpc('decrement_recipe_comments_count', {
              recipe_uuid: deletedComment[0].recipe_id
            })

          if (updateError) {
            logError('Error updating recipe comments count after deletion', updateError, { requestId })
          }
        }

        logInfo('Comment deleted successfully', {
          requestId,
          commentId: comment_id,
          userId: user_id.substring(0, 8) + '...'
        })

        return res.status(200).json({
          success: true,
          message: 'Commentaire supprimé avec succès',
          requestId
        })

      } catch (error) {
        logError('Error deleting comment', error, { requestId, comment_id })
        return res.status(500).json({
          error: 'Erreur lors de la suppression du commentaire',
          message: error.message,
          requestId
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
    logError('Global error in comments API', globalError, {
      requestId,
      method: req.method,
      duration: `${duration}ms`,
      url: req.url
    })

    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: globalError.message || 'Une erreur inattendue s\'est produite',
      requestId,
      timestamp: new Date().toISOString()
    })
  }
}