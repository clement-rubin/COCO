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
        // Récupérer les commentaires avec les informations de l'auteur
        const { data: comments, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            likes,
            user_id,
            profiles (
              display_name
            )
          `)
          .eq('recipe_id', recipe_id)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        // Formater les commentaires avec le nom de l'auteur
        const formattedComments = comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          likes: comment.likes || 0,
          user_id: comment.user_id,
          author_name: comment.profiles?.display_name || 'Chef Anonyme'
        }))

        logInfo('Comments retrieved successfully', {
          requestId,
          recipeId: recipe_id,
          commentsCount: formattedComments.length
        })

        return res.status(200).json(formattedComments)

      } catch (error) {
        logError('Error retrieving comments', error, {
          requestId,
          recipeId: recipe_id
        })

        return res.status(500).json({
          error: 'Erreur lors de la récupération des commentaires',
          message: error.message
        })
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

        // Insérer le commentaire
        const { data: newComment, error } = await supabase
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
          contentLength: content?.length
        })

        return res.status(500).json({
          error: 'Erreur lors de la création du commentaire',
          message: error.message
        })
      }
    }

    if (req.method === 'PUT') {
      const { id, user_id, likes } = req.body

      if (!id || !user_id) {
        return res.status(400).json({
          error: 'Données manquantes',
          message: 'id et user_id sont requis'
        })
      }

      try {
        // Vérifier que le commentaire appartient à l'utilisateur (pour les modifications de contenu)
        // Ou permettre le like pour tous les utilisateurs
        const updateData = {}
        
        if (typeof likes === 'number') {
          updateData.likes = Math.max(0, likes) // Assurer que les likes ne soient pas négatifs
        }

        const { data: updatedComment, error } = await supabase
          .from('comments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) {
          throw error
        }

        logInfo('Comment updated successfully', {
          requestId,
          commentId: id,
          userId: user_id.substring(0, 8) + '...',
          updates: Object.keys(updateData)
        })

        return res.status(200).json(updatedComment)

      } catch (error) {
        logError('Error updating comment', error, {
          requestId,
          commentId: id,
          userId: user_id?.substring(0, 8) + '...'
        })

        return res.status(500).json({
          error: 'Erreur lors de la mise à jour du commentaire',
          message: error.message
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
          .select('user_id')
          .eq('id', id)
          .single()

        if (fetchError) {
          throw new Error('Commentaire introuvable')
        }

        if (comment.user_id !== user_id) {
          return res.status(403).json({
            error: 'Non autorisé',
            message: 'Vous ne pouvez supprimer que vos propres commentaires'
          })
        }

        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', id)
          .eq('user_id', user_id)

        if (deleteError) {
          throw deleteError
        }

        logInfo('Comment deleted successfully', {
          requestId,
          commentId: id,
          userId: user_id.substring(0, 8) + '...'
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
