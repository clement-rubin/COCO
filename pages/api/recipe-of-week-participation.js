import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const requestId = `participation-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    logInfo('Recipe of week participation API called', {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })

    if (req.method === 'GET') {
      const { user_id } = req.query

      if (!user_id) {
        return res.status(400).json({
          error: 'user_id est requis',
          message: 'L\'ID utilisateur est nécessaire pour vérifier la participation'
        })
      }

      try {
        // Check if there's an active recipe of the week
        const { data: activeRecipe, error: recipeError } = await supabase
          .from('recipe_of_week')
          .select('id, start_date, end_date')
          .eq('is_active', true)
          .single()

        if (recipeError) {
          if (recipeError.code === 'PGRST116') {
            logWarning('Recipe of week table does not exist', { requestId, userId: user_id })
            return res.status(200).json({
              hasParticipated: false,
              canParticipate: false,
              message: 'Aucun concours actif pour le moment'
            })
          }
          throw recipeError
        }

        if (!activeRecipe) {
          return res.status(200).json({
            hasParticipated: false,
            canParticipate: false,
            message: 'Aucun concours de la semaine actif'
          })
        }

        // Check if user has already participated
        const { data: participation, error: participationError } = await supabase
          .from('recipe_of_week_participation')
          .select('id, recipe_id, submitted_at')
          .eq('user_id', user_id)
          .eq('recipe_of_week_id', activeRecipe.id)
          .single()

        if (participationError && participationError.code !== 'PGRST116') {
          if (participationError.code === 'PGRST116') {
            // Table doesn't exist, create mock response
            logWarning('Recipe of week participation table does not exist', { requestId, userId: user_id })
            return res.status(200).json({
              hasParticipated: false,
              canParticipate: true,
              activeRecipe: {
                id: activeRecipe.id,
                start_date: activeRecipe.start_date,
                end_date: activeRecipe.end_date
              }
            })
          }
          throw participationError
        }

        const hasParticipated = !!participation
        const now = new Date()
        const endDate = new Date(activeRecipe.end_date)
        const canParticipate = !hasParticipated && now <= endDate

        logInfo('Participation status checked', {
          requestId,
          userId: user_id,
          hasParticipated,
          canParticipate,
          activeRecipeId: activeRecipe.id
        })

        return res.status(200).json({
          hasParticipated,
          canParticipate,
          activeRecipe: {
            id: activeRecipe.id,
            start_date: activeRecipe.start_date,
            end_date: activeRecipe.end_date
          },
          participation: hasParticipated ? {
            id: participation.id,
            recipe_id: participation.recipe_id,
            submitted_at: participation.submitted_at
          } : null
        })

      } catch (error) {
        logError('Error checking participation status', error, {
          requestId,
          userId: user_id,
          errorCode: error.code,
          errorMessage: error.message
        })

        // Return a safe fallback response instead of throwing
        return res.status(200).json({
          hasParticipated: false,
          canParticipate: false,
          message: 'Impossible de vérifier le statut de participation',
          error: 'Service temporairement indisponible'
        })
      }
    }

    if (req.method === 'POST') {
      const { user_id, recipe_id } = req.body

      if (!user_id || !recipe_id) {
        return res.status(400).json({
          error: 'Données manquantes',
          message: 'user_id et recipe_id sont requis'
        })
      }

      try {
        // Get active recipe of the week
        const { data: activeRecipe, error: recipeError } = await supabase
          .from('recipe_of_week')
          .select('id, end_date')
          .eq('is_active', true)
          .single()

        if (recipeError || !activeRecipe) {
          return res.status(400).json({
            error: 'Aucun concours actif',
            message: 'Il n\'y a pas de concours de la semaine en cours'
          })
        }

        // Check if deadline has passed
        const now = new Date()
        const endDate = new Date(activeRecipe.end_date)
        if (now > endDate) {
          return res.status(400).json({
            error: 'Concours terminé',
            message: 'La période de participation pour ce concours est terminée'
          })
        }

        // Check if user already participated
        const { data: existingParticipation, error: checkError } = await supabase
          .from('recipe_of_week_participation')
          .select('id')
          .eq('user_id', user_id)
          .eq('recipe_of_week_id', activeRecipe.id)
          .single()

        if (existingParticipation) {
          return res.status(409).json({
            error: 'Déjà participé',
            message: 'Vous avez déjà participé à ce concours'
          })
        }

        // Create participation
        const { data: newParticipation, error: createError } = await supabase
          .from('recipe_of_week_participation')
          .insert({
            user_id,
            recipe_id,
            recipe_of_week_id: activeRecipe.id,
            submitted_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          throw createError
        }

        logInfo('New participation created', {
          requestId,
          participationId: newParticipation.id,
          userId: user_id,
          recipeId: recipe_id
        })

        return res.status(201).json({
          success: true,
          participation: newParticipation,
          message: 'Participation enregistrée avec succès'
        })

      } catch (error) {
        logError('Error creating participation', error, {
          requestId,
          userId: user_id,
          recipeId: recipe_id
        })

        return res.status(500).json({
          error: 'Erreur lors de l\'enregistrement',
          message: 'Impossible d\'enregistrer votre participation'
        })
      }
    }

    // Method not allowed
    return res.status(405).json({
      error: 'Méthode non autorisée',
      allowedMethods: ['GET', 'POST']
    })

  } catch (globalError) {
    logError('Global error in recipe-of-week-participation API', globalError, {
      requestId,
      method: req.method,
      query: req.query
    })

    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: 'Une erreur inattendue s\'est produite',
      requestId
    })
  }
}
