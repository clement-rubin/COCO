import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning, logDebug } from '../../utils/logger'

// Helper function to safely log error details
function logApiError(operation, error, context = {}) {
  const errorDetails = {
    operation,
    context,
    error: {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      name: error?.name,
      stack: error?.stack
    },
    timestamp: new Date().toISOString(),
    supabaseError: error?.code ? {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message
    } : null
  }

  logError(`API Error in ${operation}`, error, errorDetails)
  return errorDetails
}

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    logInfo(`API recipes - ${req.method} request`, {
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']?.substring(0, 100)
    })

    if (req.method === 'GET') {
      const { author, user_id, category, limit = 50 } = req.query
      
      try {
        let query = supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(parseInt(limit))
        
        // Filter by user_id if specified
        if (user_id) {
          logInfo('Filtering recipes by user_id', { user_id })
          query = query.eq('user_id', user_id)
        }
        
        // Filter by author if specified (fallback)
        if (author && !user_id) {
          logInfo('Filtering recipes by author', { author })
          query = query.eq('author', author)
        }
        
        // Filter by category if specified
        if (category) {
          logInfo('Filtering recipes by category', { category })
          query = query.eq('category', category)
        }
        
        const { data: recipes, error, count } = await query
        
        if (error) {
          throw error
        }
        
        logInfo('Recipes retrieved successfully', {
          count: recipes?.length || 0,
          filters: { author, user_id, category },
          hasResults: recipes && recipes.length > 0
        })
        
        return res.status(200).json(recipes || [])
        
      } catch (error) {
        const errorDetails = logApiError('GET_RECIPES', error, {
          filters: { author, user_id, category, limit }
        })
        
        return res.status(500).json({
          error: 'Erreur lors de la récupération des recettes',
          message: error.message,
          details: errorDetails,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    if (req.method === 'POST') {
      try {
        const data = req.body
        
        logInfo('Creating new recipe', {
          hasTitle: !!data.title,
          hasAuthor: !!data.author,
          hasUserId: !!data.user_id,
          category: data.category,
          hasImage: !!data.image,
          imageType: typeof data.image
        })
        
        // Validation des champs obligatoires
        if (!data.title) {
          logWarning('Recipe creation failed - missing title', { receivedFields: Object.keys(data) })
          return res.status(400).json({ 
            error: 'Champs obligatoires manquants',
            required: ['title'],
            received: Object.keys(data)
          })
        }
        
        // Ensure ingredients and instructions are properly formatted
        const ingredients = Array.isArray(data.ingredients) ? data.ingredients : 
                           typeof data.ingredients === 'string' ? data.ingredients.split('\n').filter(i => i.trim()) :
                           []
        
        const instructions = Array.isArray(data.instructions) ? data.instructions :
                            typeof data.instructions === 'string' ? 
                              data.instructions.split('\n').filter(i => i.trim()).map((inst, index) => ({
                                step: index + 1,
                                instruction: inst.trim()
                              })) :
                            []
        
        const newRecipe = {
          title: data.title.trim(),
          description: data.description?.trim() || null,
          image: data.image || null,
          prepTime: data.prepTime?.trim() || null,
          cookTime: data.cookTime?.trim() || null,
          servings: data.servings?.trim() || null,
          category: data.category?.trim() || 'Autre',
          author: data.author?.trim() || null,
          user_id: data.user_id || null,
          ingredients: ingredients,
          instructions: instructions,
          difficulty: data.difficulty?.trim() || 'Facile',
          created_at: new Date().toISOString()
        }
        
        logDebug('Recipe data prepared for insertion', {
          title: newRecipe.title,
          hasUserId: !!newRecipe.user_id,
          hasAuthor: !!newRecipe.author,
          category: newRecipe.category,
          ingredientsCount: newRecipe.ingredients.length,
          instructionsCount: newRecipe.instructions.length
        })
        
        const { data: insertedData, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select()
        
        if (error) {
          throw error
        }
        
        logInfo('Recipe created successfully', {
          recipeId: insertedData[0]?.id,
          title: insertedData[0]?.title,
          userId: insertedData[0]?.user_id
        })
        
        return res.status(201).json(insertedData[0])
        
      } catch (error) {
        const errorDetails = logApiError('CREATE_RECIPE', error, {
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : []
        })
        
        return res.status(500).json({
          error: 'Erreur lors de la création de la recette',
          message: error.message,
          details: errorDetails,
          timestamp: new Date().toISOString()
        })
      }
    }

    if (req.method === 'PUT') {
      try {
        const data = req.body
        const { id } = data

        if (!id) {
          return res.status(400).json({ error: 'ID de recette requis' })
        }

        logInfo('Updating recipe', { recipeId: id, hasData: !!data })

        const updateData = { 
          ...data, 
          updated_at: new Date().toISOString() 
        }
        delete updateData.id // Remove id from update data
        
        const { error } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', id)
        
        if (error) {
          throw error
        }
        
        logInfo('Recipe updated successfully', { recipeId: id })
        
        return res.status(200).json({ 
          message: 'Recette mise à jour', 
          id,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        const errorDetails = logApiError('UPDATE_RECIPE', error, {
          recipeId: req.body?.id
        })
        
        return res.status(500).json({
          error: 'Erreur lors de la mise à jour de la recette',
          message: error.message,
          details: errorDetails,
          timestamp: new Date().toISOString()
        })
      }
    }

    if (req.method === 'DELETE') {
      try {
        const id = req.query.id || (req.body && req.body.id)
        
        if (!id) {
          return res.status(400).json({ error: 'ID de recette requis' })
        }
        
        logInfo('Deleting recipe', { recipeId: id })
        
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', id)
        
        if (error) {
          throw error
        }
        
        logInfo('Recipe deleted successfully', { recipeId: id })
        
        return res.status(200).json({ 
          message: 'Recette supprimée', 
          id,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        const errorDetails = logApiError('DELETE_RECIPE', error, {
          recipeId: req.query.id || req.body?.id
        })
        
        return res.status(500).json({
          error: 'Erreur lors de la suppression de la recette',
          message: error.message,
          details: errorDetails,
          timestamp: new Date().toISOString()
        })
      }
    }

    logWarning('Method not allowed', { method: req.method })
    return res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    const errorDetails = logApiError('GENERAL_API_ERROR', error, {
      method: req.method,
      url: req.url,
      hasBody: !!req.body
    })
    
    return res.status(500).json({ 
      error: 'Erreur serveur interne', 
      message: error.message,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      reference: `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    })
  }
}
