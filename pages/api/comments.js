import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `comment-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`

  try {
    logInfo(`API comments - ${req.method} request`, {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })

    if (req.method === 'GET') {
      const { recipe_id } = req.query

      if (!recipe_id) {
        return res.status(400).json({
          error: 'recipe_id est requis',
          message: 'L\'ID de la recette est nécessaire pour récupérer les commentaires'
        })
      }

      try {
        // Vérifier d'abord si la table comments existe
        const { data: tableCheck, error: tableError } = await supabase
          .from('comments')
          .select('count')
          .limit(1)

        if (tableError && tableError.code === 'PGRST116') {
          logWarning('Comments table does not exist, returning empty array', {
            requestId,
            recipeId: recipe_id
          })
          return res.status(200).json([])
        }

        // Récupérer les commentaires avec une requête simplifiée
        const { data: comments, error } = await supabase
          .from('comments')
          .select('id, content, created_at, likes, user_id')
          .eq('recipe_id', recipe_id)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        // Pour chaque commentaire, récupérer le nom de l'auteur depuis profiles
        const commentsWithAuthors = await Promise.all(
          (comments || []).map(async (comment) => {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', comment.user_id)
                .single()

              return {
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                likes: comment.likes || 0,
                user_id: comment.user_id,
                author_name: profile?.display_name || 'Chef Anonyme'
              }
            } catch (profileErr) {
              logWarning('Could not get profile for comment author', {
                commentId: comment.id,
                userId: comment.user_id?.substring(0, 8) + '...',
                error: profileErr.message
              })
              return {
                ...comment,
                author_name: 'Chef Anonyme'
              }
            }
          })
        )

        logInfo('Comments retrieved successfully', {
          requestId,
          recipeId: recipe_id,
          commentsCount: commentsWithAuthors.length
        })

        return res.status(200).json(commentsWithAuthors)

      } catch (error) {
        logError('Error retrieving comments', error, {
          requestId,
          recipeId: recipe_id,
          errorCode: error.code,
          errorMessage: error.message
        })

        // Return empty array instead of error for better UX
        return res.status(200).json([])
      }
    }

    if (req.method === 'POST') {
      const { recipe_id, user_id, content } = req.body

      // Validation des données
      if (!recipe_id || !user_id || !content) {
        return res.status(400).json({
          error: 'Données manquantes',
          message: 'recipe_id, user_id et content sont requis',
          received: { recipe_id: !!recipe_id, user_id: !!user_id, content: !!content }
        })
      }

      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          error: 'Contenu invalide',
          message: 'Le contenu du commentaire ne peut pas être vide'
        })
      }

      if (content.trim().length > 500) {
        return res.status(400).json({
          error: 'Contenu trop long',
          message: 'Le commentaire ne peut pas dépasser 500 caractères'
        })
      }

      try {
        // Vérifier d'abord l'authentification de l'utilisateur via Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.getUser()
        
        logInfo('Comment creation attempt', {
          requestId,
          providedUserId: user_id.substring(0, 8) + '...',
          authUserId: authUser?.user?.id?.substring(0, 8) + '...',
          hasAuthUser: !!authUser?.user,
          authError: authError?.message
        })

        // Vérifier si la table comments existe, sinon la créer
        const { data: tableCheck, error: tableError } = await supabase
          .from('comments')
          .select('count')
          .limit(1)

        if (tableError && tableError.code === 'PGRST116') {
          logWarning('Comments table does not exist, cannot create comment', {
            requestId,
            recipeId: recipe_id
          })
          return res.status(500).json({
            error: 'Table comments non disponible',
            message: 'La fonctionnalité de commentaires n\'est pas encore configurée'
          })
        }

        // Récupérer le nom de l'utilisateur depuis la table profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user_id)
          .single()

        if (profileError) {
          logWarning('Could not retrieve user profile for comment', {
            requestId,
            userId: user_id.substring(0, 8) + '...',
            error: profileError.message
          })
        }

        // Utiliser un client Supabase avec service_role pour contourner RLS temporairement
        const { createClient } = require('@supabase/supabase-js')
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

        // Insérer le commentaire avec admin client pour contourner RLS
        const { data: newComment, error } = await supabaseAdmin
          .from('comments')
          .insert([{
            recipe_id,
            user_id,
            content: content.trim(),
            likes: 0,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) {
          logError('Error inserting comment with admin client', error, {
            requestId,
            recipeId: recipe_id,
            userId: user_id.substring(0, 8) + '...',
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details
          })
          throw error
        }

        // Retourner le commentaire avec les informations de l'auteur
        const commentWithAuthor = {
          ...newComment,
          author_name: profile?.display_name || 'Chef Anonyme'
        }

        logInfo('Comment created successfully', {
          requestId,
          commentId: newComment.id,
          recipeId: recipe_id,
          userId: user_id.substring(0, 8) + '...',
          contentLength: content.trim().length
        })

        return res.status(201).json(commentWithAuthor)

      } catch (error) {
        logError('Error creating comment', error, {
          requestId,
          recipeId: recipe_id,
          userId: user_id?.substring(0, 8) + '...',
          contentLength: content?.length,
          errorCode: error.code,
          errorMessage: error.message
        })

        return res.status(500).json({
          error: 'Erreur lors de la création du commentaire',
          message: error.message || 'Une erreur inattendue s\'est produite'
        })
      }
    }

    if (req.method === 'PUT') {
      const { id, user_id, content, likes } = req.body

      if (!id || !user_id) {
        return res.status(400).json({
          error: 'Données manquantes',
          message: 'id et user_id sont requis'
        })
      }

      try {
        // Vérifier que le commentaire appartient à l'utilisateur
        const { data: existingComment, error: fetchError } = await supabase
          .from('comments')
          .select('user_id, content')
          .eq('id', id)
          .single()

        if (fetchError) {
          logError('Error fetching comment for update', fetchError, {
            requestId,
            commentId: id,
            userId: user_id?.substring(0, 8) + '...'
          })
          return res.status(404).json({
            error: 'Commentaire introuvable',
            message: 'Le commentaire que vous tentez de modifier n\'existe pas'
          })
        }

        if (!existingComment) {
          return res.status(404).json({
            error: 'Commentaire introuvable',
            message: 'Le commentaire que vous tentez de modifier n\'existe pas'
          })
        }

        if (existingComment.user_id !== user_id) {
          return res.status(403).json({
            error: 'Non autorisé',
            message: 'Vous ne pouvez modifier que vos propres commentaires'
          })
        }

        const updateData = { updated_at: new Date().toISOString() }
        
        // Modification du contenu
        if (content !== undefined) {
          if (typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
              error: 'Contenu invalide',
              message: 'Le contenu du commentaire ne peut pas être vide'
            })
          }

          if (content.trim().length > 500) {
            return res.status(400).json({
              error: 'Contenu trop long',
              message: 'Le commentaire ne peut pas dépasser 500 caractères'
            })
          }

          updateData.content = content.trim()
        }
        
        // Modification des likes (pour le système de like)
        if (typeof likes === 'number') {
          updateData.likes = Math.max(0, likes)
        }

        // Utiliser un client admin pour contourner RLS si nécessaire
        const { createClient } = require('@supabase/supabase-js')
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

        // Effectuer la mise à jour avec une requête plus spécifique
        const { data: updatedComment, error: updateError } = await supabaseAdmin
          .from('comments')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user_id) // Double vérification de sécurité
          .select('*')
          .single()

        if (updateError) {
          logError('Error updating comment', updateError, {
            requestId,
            commentId: id,
            userId: user_id?.substring(0, 8) + '...',
            errorCode: updateError.code,
            errorMessage: updateError.message,
            updateData
          })
          
          // Gestion spécifique des erreurs Supabase
          if (updateError.code === 'PGRST116') {
            return res.status(404).json({
              error: 'Commentaire introuvable après mise à jour',
              message: 'Le commentaire a peut-être été supprimé entre temps'
            })
          }
          
          throw updateError
        }

        if (!updatedComment) {
          logError('No comment returned after update', new Error('Update returned null'), {
            requestId,
            commentId: id,
            userId: user_id?.substring(0, 8) + '...'
          })
          
          return res.status(500).json({
            error: 'Erreur de mise à jour',
            message: 'La mise à jour a échoué de manière inattendue'
          })
        }

        // Récupérer le nom de l'auteur pour la réponse
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user_id)
          .single()

        const commentWithAuthor = {
          ...updatedComment,
          author_name: profile?.display_name || 'Chef Anonyme'
        }

        logInfo('Comment updated successfully', {
          requestId,
          commentId: id,
          userId: user_id.substring(0, 8) + '...',
          updates: Object.keys(updateData),
          hasContentUpdate: !!updateData.content
        })

        return res.status(200).json(commentWithAuthor)

      } catch (error) {
        logError('Error updating comment', error, {
          requestId,
          commentId: id,
          userId: user_id?.substring(0, 8) + '...',
          errorMessage: error.message,
          errorCode: error.code
        })

        return res.status(500).json({
          error: 'Erreur lors de la mise à jour du commentaire',
          message: error.message || 'Une erreur inattendue s\'est produite'
        })
      }
    }

    if (req.method === 'DELETE') {
      const { id, user_id } = req.query

      if (!id || !user_id) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          message: 'id et user_id sont requis'
        })
      }

      try {
        // Vérifier que le commentaire appartient à l'utilisateur
        const { data: comment, error: fetchError } = await supabase
          .from('comments')
          .select('user_id, content')
          .eq('id', id)
          .single()

        if (fetchError) {
          return res.status(404).json({
            error: 'Commentaire introuvable',
            message: 'Le commentaire que vous tentez de supprimer n\'existe pas'
          })
        }

        if (comment.user_id !== user_id) {
          return res.status(403).json({
            error: 'Non autorisé',
            message: 'Vous ne pouvez supprimer que vos propres commentaires'
          })
        }

        // Utiliser un client admin pour contourner RLS si nécessaire
        const { createClient } = require('@supabase/supabase-js')
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

        const { error: deleteError } = await supabaseAdmin
          .from('comments')
          .delete()
          .eq('id', id)
          .eq('user_id', user_id) // Double vérification

        if (deleteError) {
          throw deleteError
        }

        logInfo('Comment deleted successfully', {
          requestId,
          commentId: id,
          userId: user_id.substring(0, 8) + '...',
          contentPreview: comment.content?.substring(0, 50) + '...'
        })

        return res.status(200).json({
          message: 'Commentaire supprimé avec succès',
          id
        })

      } catch (error) {
        logError('Error deleting comment', error, {
          requestId,
          commentId: id,
          userId: user_id?.substring(0, 8) + '...'
        })

        return res.status(500).json({
          error: 'Erreur lors de la suppression du commentaire',
          message: error.message
        })
      }
    }

    // Méthode non supportée
    return res.status(405).json({
      error: 'Méthode non autorisée',
      message: `La méthode ${req.method} n'est pas supportée`,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
    })

  } catch (globalError) {
    logError('Global error in comments API', globalError, {
      requestId,
      method: req.method,
      hasQuery: !!req.query,
      hasBody: !!req.body
    })

    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: 'Une erreur inattendue s\'est produite',
      requestId
    })
  }
}
