import { supabase } from '../../lib/supabase'
import { 
  logInfo, 
  logError, 
  logWarning, 
  logDebug, 
  logApiCall 
} from '../../utils/logger'

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
      stack: error?.stack?.substring(0, 500) // Limit stack trace length
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

// Helper function to validate and sanitize query parameters
function validateQueryParams(query) {
  const { author, user_id, category, limit = '50', logs, logsLimit = '20' } = query || {}
  
  return {
    author: author && typeof author === 'string' && author.trim() ? author.trim() : null,
    user_id: user_id && typeof user_id === 'string' && user_id.trim() ? user_id.trim() : null,
    category: category && typeof category === 'string' && category.trim() ? category.trim() : null,
    limit: Math.min(Math.max(parseInt(limit) || 50, 1), 100), // Between 1 and 100
    fetchLogs: logs === 'true' || logs === '1',
    logsLimit: Math.min(Math.max(parseInt(logsLimit) || 20, 1), 100) // Between 1 and 100
  }
}

// Fetch logs related to recipes
async function fetchRecipeLogs(limit) {
  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('type', 'recipe')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw error
    }
    
    return { logs: data || [], error: null }
  } catch (error) {
    return { logs: [], error }
  }
}

// Safe response helper to prevent "headers already sent" errors
function safeResponse(res, statusCode, data) {
  try {
    // Check if response is already sent
    if (res.writableEnded) {
      logWarning('Attempted to send response after headers sent', {
        statusCode,
        dataType: typeof data
      })
      return false
    }
    
    // Send the response
    res.status(statusCode).json(data)
    return true
  } catch (error) {
    logError('Error sending response', error, {
      statusCode,
      dataType: typeof data
    })
    
    // Last attempt to send an error if headers not sent
    try {
      if (!res.writableEnded) {
        res.status(500).json({ 
          error: 'Error sending response', 
          message: 'Server encountered an error while sending response'
        })
      }
    } catch {
      // Cannot do anything more
    }
    
    return false
  }
}

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return safeResponse(res, 204, null)
  }

  // Log API request start
  const startTime = Date.now()
  const requestReference = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  
  try {
    logInfo(`API recipes - ${req.method} request`, {
      reference: requestReference,
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']?.substring(0, 100)
    })

    if (req.method === 'GET') {
      try {
        // Validate and sanitize query parameters
        const params = validateQueryParams(req.query)
        const { author, user_id, category, limit, fetchLogs, logsLimit } = params
        
        logInfo('GET recipes - Request details', {
          reference: requestReference,
          originalQuery: req.query,
          sanitizedParams: params,
          hasUserId: !!user_id,
          hasAuthor: !!author,
          fetchLogs: fetchLogs,
          logsLimit: logsLimit,
          userIdType: typeof user_id,
          userIdLength: user_id?.length,
          timestamp: new Date().toISOString()
        })
        
        // If logs are requested, fetch them
        if (fetchLogs) {
          logInfo('Fetching recipe logs', {
            reference: requestReference,
            logsLimit
          })
          
          const { logs, error: logsError } = await fetchRecipeLogs(logsLimit)
          
          if (logsError) {
            logWarning('Error fetching logs', {
              reference: requestReference,
              error: logsError.message
            })
          }
          
          // If only logs were requested (no other filters), return them directly
          if (!user_id && !author && !category) {
            logInfo('Returning only logs', {
              reference: requestReference,
              logsCount: logs.length
            })
            
            return safeResponse(res, 200, { logs })
          }
        }
        
        // Build the base query
        let query = supabase
          .from('recipes')
          .select('*')
        
        logDebug('Base query created', {
          reference: requestReference,
          tableName: 'recipes',
          selectFields: '*'
        })
        
        // Apply filters only if they have valid values
        if (user_id) {
          logInfo('Applying user_id filter', { 
            reference: requestReference,
            user_id, 
            userIdType: typeof user_id,
            userIdLength: user_id.length,
            filterType: 'user_id'
          })
          query = query.eq('user_id', user_id)
        }
        
        // Filter by author if specified (fallback) and no user_id
        if (author && !user_id) {
          logInfo('Applying author filter (fallback)', { 
            reference: requestReference,
            author,
            authorType: typeof author,
            filterType: 'author'
          })
          query = query.eq('author', author)
        }
        
        // Filter by category if specified
        if (category) {
          logInfo('Applying category filter', { 
            reference: requestReference,
            category,
            filterType: 'category'
          })
          query = query.eq('category', category)
        }
        
        // Apply ordering and limit
        query = query
          .order('created_at', { ascending: false })
          .limit(limit)
        
        logDebug('Executing Supabase query', {
          reference: requestReference,
          hasUserIdFilter: !!user_id,
          hasAuthorFilter: !!author && !user_id,
          hasCategoryFilter: !!category,
          limit: limit,
          timestamp: new Date().toISOString()
        })
        
        // Execute the query with timeout protection
        const queryPromise = query
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
        )
        
        const { data: recipes, error } = await Promise.race([queryPromise, timeoutPromise])
        
        logInfo('Supabase query executed', {
          reference: requestReference,
          success: !error,
          error: error?.message,
          resultCount: recipes?.length || 0,
          hasData: !!recipes,
          isArray: Array.isArray(recipes),
          timestamp: new Date().toISOString()
        })
        
        if (error) {
          logError('Supabase query error', error, {
            reference: requestReference,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            query: params
          })
          throw error
        }
        
        // Ensure we have a valid array
        const safeRecipes = Array.isArray(recipes) ? recipes : []
        
        // Log detailed results for debugging
        if (safeRecipes.length > 0) {
          logInfo('Recipes found - Analysis', {
            reference: requestReference,
            totalCount: safeRecipes.length,
            recipesWithUserId: safeRecipes.filter(r => r && r.user_id).length,
            recipesWithoutUserId: safeRecipes.filter(r => r && !r.user_id).length,
            uniqueUserIds: [...new Set(safeRecipes.map(r => r?.user_id).filter(Boolean))],
            requestedUserId: user_id,
            matchingRecipes: safeRecipes.filter(r => r && r.user_id === user_id).length,
            sampleRecipes: safeRecipes.slice(0, 3).map(r => r ? {
              id: r.id,
              title: r.title,
              author: r.author,
              user_id: r.user_id,
              category: r.category,
              created_at: r.created_at,
              userIdMatch: r.user_id === user_id
            } : null).filter(Boolean),
            categories: safeRecipes.reduce((acc, r) => {
              if (r && r.category) {
                acc[r.category] = (acc[r.category] || 0) + 1
              }
              return acc
            }, {})
          })
        } else {
          logWarning('No recipes found', {
            reference: requestReference,
            query: params,
            resultType: typeof recipes,
            isNull: recipes === null,
            isEmptyArray: Array.isArray(recipes) && recipes.length === 0
          })
        }
        
        if (fetchLogs) {
          const { logs, error: logsError } = await fetchRecipeLogs(logsLimit)
          
          logInfo('Returning recipes with logs', {
            reference: requestReference,
            recipesCount: safeRecipes.length,
            logsCount: logs.length,
            hasLogsError: !!logsError
          })
          
          return safeResponse(res, 200, { 
            recipes: safeRecipes,
            logs: logsError ? [] : logs
          })
        } else {
          logInfo('Recipes retrieved successfully', {
            reference: requestReference,
            count: safeRecipes.length,
            filters: params,
            hasResults: safeRecipes.length > 0,
            timestamp: new Date().toISOString()
          })
          
          return safeResponse(res, 200, safeRecipes)
        }
      } catch (error) {
        const errorDetails = logApiError('GET_RECIPES', error, {
          reference: requestReference,
          filters: validateQueryParams(req.query),
          queryStep: 'supabase_execution',
          originalQuery: req.query
        })
        
        return safeResponse(res, 500, {
          error: 'Erreur lors de la récupération des recettes',
          message: error.message || 'Erreur inconnue',
          reference: requestReference,
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    if (req.method === 'POST') {
      try {
        const data = req.body
        
        if (!data || typeof data !== 'object') {
          return safeResponse(res, 400, { 
            error: 'Corps de requête invalide',
            message: 'Le corps de la requête doit être un objet JSON valide',
            reference: requestReference
          })
        }
        
        logInfo('Creating new recipe', {
          reference: requestReference,
          hasTitle: !!data.title,
          hasAuthor: !!data.author,
          hasUserId: !!data.user_id,
          category: data.category,
          hasImage: !!data.image,
          imageType: typeof data.image
        })
        
        // Validation des champs obligatoires
        if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
          logWarning('Recipe creation failed - missing or invalid title', { 
            reference: requestReference,
            receivedFields: Object.keys(data),
            titleType: typeof data.title,
            titleValue: data.title
          })
          return safeResponse(res, 400, { 
            error: 'Champs obligatoires manquants ou invalides',
            required: ['title (string non vide)'],
            received: Object.keys(data),
            reference: requestReference
          })
        }

        // Récupérer le nom d'utilisateur depuis le profil si user_id est fourni
        let authorName = data.author && typeof data.author === 'string' ? data.author.trim() : null
        
        if (data.user_id && typeof data.user_id === 'string' && data.user_id.trim()) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('user_id', data.user_id.trim())
              .single()
            
            if (!profileError && profile?.display_name) {
              authorName = profile.display_name
              logInfo('Author name retrieved from profile', {
                reference: requestReference,
                userId: data.user_id.substring(0, 8) + '...',
                authorName: authorName
              })
            } else {
              logWarning('Could not retrieve author name from profile', {
                reference: requestReference,
                userId: data.user_id.substring(0, 8) + '...',
                profileError: profileError?.message
              })
            }
          } catch (profileErr) {
            logError('Error retrieving profile for author name', profileErr, {
              reference: requestReference,
              userId: data.user_id.substring(0, 8) + '...'
            })
          }
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
          description: data.description && typeof data.description === 'string' ? data.description.trim() : null,
          image: data.image || null,
          prepTime: data.prepTime && typeof data.prepTime === 'string' ? data.prepTime.trim() : null,
          cookTime: data.cookTime && typeof data.cookTime === 'string' ? data.cookTime.trim() : null,
          category: data.category && typeof data.category === 'string' ? data.category.trim() : 'Autre',
          author: authorName || 'Chef Anonyme',
          user_id: data.user_id && typeof data.user_id === 'string' ? data.user_id.trim() : null,
          ingredients: ingredients,
          instructions: instructions,
          difficulty: data.difficulty && typeof data.difficulty === 'string' ? data.difficulty.trim() : 'Facile',
          created_at: new Date().toISOString()
        }
        
        // Only add servings if it's provided (to handle tables without this column)
        if (data.servings && typeof data.servings === 'string') {
          newRecipe.servings = data.servings.trim()
        }
        
        logDebug('Recipe data prepared for insertion', {
          reference: requestReference,
          title: newRecipe.title,
          hasUserId: !!newRecipe.user_id,
          hasAuthor: !!newRecipe.author,
          authorSource: authorName ? (authorName === data.author ? 'provided' : 'profile') : 'default',
          category: newRecipe.category,
          ingredientsCount: newRecipe.ingredients.length,
          instructionsCount: newRecipe.instructions.length,
          hasServings: !!newRecipe.servings
        })
        
        const { data: insertedData, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select()
        
        if (error) {
          throw error
        }
        
        if (!insertedData || !Array.isArray(insertedData) || insertedData.length === 0) {
          throw new Error('Aucune donnée retournée après insertion')
        }
        
        logInfo('Recipe created successfully', {
          reference: requestReference,
          recipeId: insertedData[0]?.id,
          title: insertedData[0]?.title,
          userId: insertedData[0]?.user_id
        })
        
        return safeResponse(res, 201, insertedData[0])
        
      } catch (error) {
        const errorDetails = logApiError('CREATE_RECIPE', error, {
          reference: requestReference,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          queryStep: 'insert_operation'
        })
        
        return safeResponse(res, 500, {
          error: 'Erreur lors de la création de la recette',
          message: error.message || 'Erreur inconnue',
          reference: requestReference,
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
          timestamp: new Date().toISOString()
        })
      }
    }
    
    // Méthode non supportée
    logWarning('Unsupported method', {
      reference: requestReference,
      method: req.method,
      supportedMethods: ['GET', 'POST']
    })
    
    return safeResponse(res, 405, {
      error: 'Méthode non autorisée',
      message: `La méthode ${req.method} n'est pas supportée`,
      allowedMethods: ['GET', 'POST'],
      reference: requestReference
    })
    
  } catch (globalError) {
    const errorDetails = logApiError('GLOBAL_API_ERROR', globalError, {
      reference: requestReference,
      method: req.method,
      hasQuery: !!req.query,
      hasBody: !!req.body,
      queryKeys: req.query ? Object.keys(req.query) : [],
      bodyKeys: req.body ? Object.keys(req.body) : []
    })
    
    return safeResponse(res, 500, {
      error: 'Erreur serveur interne',
      message: 'Une erreur inattendue s\'est produite',
      reference: requestReference,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      timestamp: new Date().toISOString()
    })
  } finally {
    // Log API request completion
    const endTime = Date.now()
    const duration = endTime - startTime
    
    logApiCall(`API recipes - ${req.method} completed`, 'recipes', {
      reference: requestReference,
      method: req.method,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  }
}
