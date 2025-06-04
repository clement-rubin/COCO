import { supabase } from '../../../lib/supabase'
import { logInfo, logError, logApiCall } from '../../../utils/logger'

export default async function handler(req, res) {
  const { id } = req.query
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  const requestReference = `recipe-${id}-${Date.now()}`

  try {
    logInfo(`API recipes/[id] - GET request for recipe ${id}`, {
      reference: requestReference,
      recipeId: id
    })

    // Validate ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        error: 'ID de recette invalide',
        reference: requestReference
      })
    }

    // Fetch recipe from Supabase
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logInfo(`Recipe not found: ${id}`, { reference: requestReference })
        return res.status(404).json({ 
          error: 'Recette introuvable',
          reference: requestReference
        })
      }
      throw error
    }

    if (!recipe) {
      return res.status(404).json({ 
        error: 'Recette introuvable',
        reference: requestReference
      })
    }

    logInfo(`Recipe retrieved successfully: ${id}`, {
      reference: requestReference,
      recipeTitle: recipe.title,
      author: recipe.author
    })

    // Log successful API call
    logApiCall(
      'GET',
      `/api/recipes/${id}`,
      { id },
      { status: 200, recipeTitle: recipe.title }
    )

    return res.status(200).json(recipe)

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError(`API Error in GET /recipes/${id}`, error, {
      reference: requestReference,
      recipeId: id,
      duration,
      errorCode: error.code,
      errorMessage: error.message
    })

    // Log failed API call
    logApiCall(
      'GET',
      `/api/recipes/${id}`,
      { id },
      { status: 500, error: error.message, duration }
    )

    return res.status(500).json({
      error: 'Erreur lors de la récupération de la recette',
      message: error.message || 'Erreur inconnue',
      reference: requestReference
    })
  }
}
