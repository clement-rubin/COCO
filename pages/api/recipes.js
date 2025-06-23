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
  const { author, user_id, category, limit = '50', logs, logsLimit = '20', friends_only, offset = '0' } = query || {}
  
  return {
    author: author && typeof author === 'string' && author.trim() ? author.trim() : null,
    user_id: user_id && typeof user_id === 'string' && user_id.trim() ? user_id.trim() : null,
    category: category && typeof category === 'string' && category.trim() ? category.trim() : null,
    limit: Math.min(Math.max(parseInt(limit) || 50, 1), 100), // Between 1 and 100
    offset: Math.max(parseInt(offset) || 0, 0), // Non-negative
    fetchLogs: logs === 'true' || logs === '1',
    logsLimit: Math.min(Math.max(parseInt(logsLimit) || 20, 1), 100), // Between 1 and 100
    friendsOnly: friends_only === 'true' || friends_only === '1'
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
        const { author, user_id, category, limit, offset, fetchLogs, logsLimit, friendsOnly } = params
        
        logInfo('GET recipes - Request details', {
          reference: requestReference,
          originalQuery: req.query,
          sanitizedParams: params,
          hasUserId: !!user_id,
          hasAuthor: !!author,
          fetchLogs: fetchLogs,
          logsLimit: logsLimit,
          friendsOnly: friendsOnly,
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
          if (!user_id && !author && !category && !friendsOnly) {
            logInfo('Returning only logs', {
              reference: requestReference,
              logsCount: logs.length
            })
            
            return safeResponse(res, 200, { logs })
          }
        }

        // Handle friends-only recipes
        if (friendsOnly && user_id) {
          logInfo('Fetching friends-only recipes', {
            reference: requestReference,
            userId: user_id,
            limit,
            offset
          })

          try {
            // Get user's friends using SQL function with better error handling
            const { data: friendsData, error: friendsError } = await supabase
              .rpc('get_user_friends_simple', { target_user_id: user_id })

            if (friendsError) {
              logError('Error fetching friends for recipes', friendsError, {
                reference: requestReference,
                userId: user_id,
                errorCode: friendsError.code
              })
              
              // Si la fonction n'existe pas, essayer une requête directe
              if (friendsError.code === 'PGRST116') {
                logInfo('Function not found, trying direct friendship query', {
                  reference: requestReference,
                  userId: user_id
                })
                
                const { data: directFriendsData, error: directError } = await supabase
                  .from('friendships')
                  .select(`
                    user_id,
                    friend_id,
                    profiles!friendships_friend_id_fkey(user_id, display_name)
                  `)
                  .or(`user_id.eq.${user_id},friend_id.eq.${user_id}`)
                  .eq('status', 'accepted')

                if (!directError && directFriendsData) {
                  // Transformer les données directes au format attendu
                  const transformedFriends = directFriendsData.map(friendship => ({
                    friend_user_id: friendship.user_id === user_id ? friendship.friend_id : friendship.user_id
                  }))
                  
                  const friendIds = transformedFriends.map(friend => friend.friend_user_id).filter(Boolean)
                  friendIds.push(user_id) // Ajouter l'utilisateur lui-même
                  
                  logInfo('Direct friendship query successful', {
                    reference: requestReference,
                    friendsCount: friendIds.length - 1,
                    userId: user_id
                  })
                  
                  // Récupérer les recettes avec les IDs d'amis
                  let query = supabase
                    .from('recipes')
                    .select('*')
                    .in('user_id', friendIds)
                    .order('created_at', { ascending: false })

                  if (offset > 0) {
                    query = query.range(offset, offset + limit - 1)
                  } else {
                    query = query.limit(limit)
                  }

                  const { data: friendsRecipes, error: recipesError } = await query

                  if (recipesError) {
                    throw recipesError
                  }

                  logInfo('Friends recipes fetched via direct query', {
                    reference: requestReference,
                    recipesCount: friendsRecipes?.length || 0,
                    friendsCount: friendIds.length - 1,
                    userId: user_id
                  })

                  return safeResponse(res, 200, friendsRecipes || [])
                } else {
                  throw directError || new Error('Failed to fetch friends via direct query')
                }
              } else {
                // Fallback to user's own recipes if friends query fails
                logInfo('Falling back to user recipes only', {
                  reference: requestReference,
                  userId: user_id
                })

                const { data: userRecipes, error: userRecipesError } = await supabase
                  .from('recipes')
                  .select('*')
                  .eq('user_id', user_id)
                  .order('created_at', { ascending: false })
                  .limit(limit)

                if (userRecipesError) {
                  throw userRecipesError
                }

                return safeResponse(res, 200, userRecipes || [])
              }
            }

            // Extract friend IDs
            const friendIds = friendsData?.map(friend => friend.friend_user_id) || []
            
            // Add the user themselves to see their own recipes in the feed
            friendIds.push(user_id)

            logInfo('Friends IDs retrieved for recipes', {
              reference: requestReference,
              friendsCount: friendIds.length - 1, // -1 because we added user_id
              totalUserIds: friendIds.length,
              userId: user_id,
              friendIds: friendIds.slice(0, 5) // Log first 5 for debugging
            })

            if (friendIds.length === 1) { // Only the user themselves
              logInfo('No friends found, returning user recipes only', {
                reference: requestReference,
                userId: user_id
              })
            }

            // Build query for friends' recipes
            let query = supabase
              .from('recipes')
              .select('*')
              .in('user_id', friendIds)
              .order('created_at', { ascending: false })

            // Apply offset and limit
            if (offset > 0) {
              query = query.range(offset, offset + limit - 1)
            } else {
              query = query.limit(limit)
            }

            const { data: friendsRecipes, error: recipesError } = await query

            if (recipesError) {
              logError('Error fetching friends recipes', recipesError, {
                reference: requestReference,
                friendsCount: friendIds.length,
                userId: user_id
              })
              throw recipesError
            }

            logInfo('Friends recipes fetched successfully', {
              reference: requestReference,
              recipesCount: friendsRecipes?.length || 0,
              friendsCount: friendIds.length - 1,
              userId: user_id,
              hasResults: (friendsRecipes?.length || 0) > 0,
              sampleRecipeIds: friendsRecipes?.slice(0, 3).map(r => r.id) || []
            })

            return safeResponse(res, 200, friendsRecipes || [])

          } catch (friendsApiError) {
            logError('Error in friends-only recipes flow', friendsApiError, {
              reference: requestReference,
              userId: user_id
            })
            
            // Fallback to user's own recipes if friends query fails
            logInfo('Falling back to user recipes only (final fallback)', {
              reference: requestReference,
              userId: user_id
            })

            const { data: userRecipes, error: userRecipesError } = await supabase
              .from('recipes')
              .select('*')
              .eq('user_id', user_id)
              .order('created_at', { ascending: false })
              .limit(limit)

            if (userRecipesError) {
              throw userRecipesError
            }

            return safeResponse(res, 200, userRecipes || [])
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
        if (user_id && !friendsOnly) {
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
        if (author && !user_id && !friendsOnly) {
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
        
        // Apply ordering, offset and limit
        query = query
          .order('created_at', { ascending: false })

        if (offset > 0) {
          query = query.range(offset, offset + limit - 1)
        } else {
          query = query.limit(limit)
        }
        
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
        
        // Validation des champs obligatoires - SIMPLIFIÉ
        if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
          logWarning('Recipe creation failed - missing or invalid title', { 
            reference: requestReference,
            receivedFields: Object.keys(data),
            titleType: typeof data.title,
            titleValue: data.title
          })
          return safeResponse(res, 400, { 
            error: 'Le titre est obligatoire',
            required: ['title (string non vide)'],
            received: Object.keys(data),
            reference: requestReference
          })
        }

        // Description optionnelle mais recommandée
        if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
          logInfo('Recipe created without description - using default', { 
            reference: requestReference,
            title: data.title
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
                profileError: profileError?.message,
                willCreateProfile: true
              })
              
              // Si le profil n'existe pas, essayer de le créer
              if (profileError?.code === 'PGRST116') { // No rows returned
                try {
                  const defaultProfile = {
                    user_id: data.user_id.trim(),
                    display_name: authorName || 'Utilisateur',
                    bio: null
                  }
                  
                  const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert([defaultProfile])
                    .select()
                    .single()
                  
                  if (!createError && newProfile) {
                    authorName = newProfile.display_name
                    logInfo('Profile created and author name set', {
                      reference: requestReference,
                      userId: data.user_id.substring(0, 8) + '...',
                      authorName: authorName
                    })
                  }
                } catch (createErr) {
                  logError('Error creating profile', createErr, {
                    reference: requestReference,
                    userId: data.user_id.substring(0, 8) + '...'
                  })
                }
              }
            }
          } catch (profileErr) {
            logError('Error retrieving profile for author name', profileErr, {
              reference: requestReference,
              userId: data.user_id.substring(0, 8) + '...'
            })
          }
        } else {
          // Si pas de user_id, utiliser le nom fourni ou un nom par défaut
          authorName = authorName || 'Chef Communauté'
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
        
        // --- AJOUT : Gestion de l'upload d'image si besoin ---
        let imageUrl = null;
        if (data.image && typeof data.image === 'string') {
          const val = data.image.trim();
          if (val.startsWith('data:image/')) {
            // Data URL: upload to Supabase Storage
            try {
              // Import dynamique pour éviter les problèmes de dépendances circulaires
              const { uploadImageToSupabase } = require('../utils/imageUtils');
              imageUrl = await uploadImageToSupabase(val);
            } catch (uploadErr) {
              logWarning('Erreur lors de l\'upload de l\'image base64, fallback sur la data URL', uploadErr);
              imageUrl = val; // fallback: store the data URL if upload fails
            }
          } else if (val.startsWith('http://') || val.startsWith('https://')) {
            imageUrl = val;
          } else {
            // Peut-être un nom de fichier ou autre format, fallback
            imageUrl = val;
          }
        }
        // Si pas d'image, imageUrl reste null

        // Valider et nettoyer le form_mode
        const validFormModes = ['quick', 'complete']
        const formMode = data.formMode && typeof data.formMode === 'string' && 
                        validFormModes.includes(data.formMode.toLowerCase()) 
                        ? data.formMode.toLowerCase() 
                        : 'complete'

        const newRecipe = {
          title: data.title.trim(),
          description: data.description && typeof data.description === 'string' && data.description.trim() 
            ? data.description.trim() 
            : 'Recette partagée avec COCO ✨', // Valeur par défaut
          image: imageUrl,
          prepTime: data.prepTime && typeof data.prepTime === 'string' ? data.prepTime.trim() : null,
          cookTime: data.cookTime && typeof data.cookTime === 'string' ? data.cookTime.trim() : null,
          category: data.category && typeof data.category === 'string' ? data.category.trim() : 'Autre',
          author: authorName,
          user_id: data.user_id && typeof data.user_id === 'string' ? data.user_id.trim() : null,
          ingredients: ingredients,
          instructions: instructions,
          difficulty: data.difficulty && typeof data.difficulty === 'string' ? data.difficulty.trim() : 'Facile',
          created_at: new Date().toISOString(),
          form_mode: formMode
        }

        // Valeurs par défaut intelligentes pour les partages rapides
        if (formMode === 'quick') {
          // Si c'est un partage rapide, ajuster les valeurs par défaut
          if (!newRecipe.description) {
            newRecipe.description = 'Photo partagée rapidement avec COCO ✨'
          }
          if (!newRecipe.category || newRecipe.category === 'Autre') {
            newRecipe.category = 'Photo partagée'
          }
          // S'assurer que les tableaux sont vides mais valides
          newRecipe.ingredients = Array.isArray(newRecipe.ingredients) ? newRecipe.ingredients : []
          newRecipe.instructions = Array.isArray(newRecipe.instructions) ? newRecipe.instructions : []
        }

        logDebug('Recipe data prepared for insertion', {
          reference: requestReference,
          title: newRecipe.title,
          hasUserId: !!newRecipe.user_id,
          hasAuthor: !!newRecipe.author,
          hasImage: !!newRecipe.image,
          imageType: typeof newRecipe.image,
          imageLength: newRecipe.image?.length,
          authorSource: authorName ? (authorName === data.author ? 'provided' : 'profile') : 'default',
          category: newRecipe.category,
          ingredientsCount: newRecipe.ingredients.length,
          instructionsCount: newRecipe.instructions.length,
          formMode: newRecipe.form_mode,
          hasServings: !!newRecipe.servings
        })
        
        // Vérifier que seuls les champs vraiment obligatoires sont présents
        const requiredFields = ['title', 'author']
        const missingFields = requiredFields.filter(field => !newRecipe[field])
        
        if (missingFields.length > 0) {
          throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`)
        }
        
        const { data: insertedData, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select()
        
        if (error) {
          // Log detailed error information
          logError('Supabase insertion error', error, {
            reference: requestReference,
            errorCode: error.code,
            errorDetails: error.details,
            errorHint: error.hint,
            recipeData: {
              ...newRecipe,
              // Masquer les données sensibles dans les logs
              image: newRecipe.image ? `${typeof newRecipe.image} (${newRecipe.image.length} chars)` : null
            }
          })
          throw error
        }
        
        if (!insertedData || !Array.isArray(insertedData) || insertedData.length === 0) {
          throw new Error('Aucune donnée retournée après insertion')
        }
        
        logInfo('Recipe created successfully', {
          reference: requestReference,
          recipeId: insertedData[0]?.id,
          title: insertedData[0]?.title,
          userId: insertedData[0]?.user_id,
          formMode: insertedData[0]?.form_mode
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
    
    if (req.method === 'PUT') {
      try {
        const data = req.body
        
        if (!data || typeof data !== 'object') {
          return safeResponse(res, 400, {
            error: 'Données de mise à jour manquantes',
            message: 'Le corps de la requête doit contenir les données de la recette'
          })
        }

        const { id, user_id, ...updateFields } = data

        if (!id) {
          return safeResponse(res, 400, {
            error: 'ID de recette manquant',
            message: 'L\'ID de la recette est requis pour la mise à jour'
          })
        }

        if (!user_id) {
          return safeResponse(res, 400, {
            error: 'ID utilisateur manquant',
            message: 'L\'ID de l\'utilisateur est requis pour la mise à jour'
          })
        }

        logInfo('Updating recipe', {
          reference: requestReference,
          recipeId: id,
          userId: user_id.substring(0, 8) + '...',
          fieldsToUpdate: Object.keys(updateFields)
        })

        // Vérifier que la recette existe et appartient à l'utilisateur
        const { data: existingRecipe, error: fetchError } = await supabase
          .from('recipes')
          .select('user_id, title')
          .eq('id', id)
          .single()

        if (fetchError) {
          logError('Recipe not found for update', fetchError, { recipeId: id, userId: user_id })
          return safeResponse(res, 404, {
            error: 'Recette introuvable',
            message: 'La recette que vous tentez de modifier n\'existe pas'
          })
        }

        if (existingRecipe.user_id !== user_id) {
          logWarning('User attempted to update recipe they do not own', {
            recipeId: id,
            recipeOwnerId: existingRecipe.user_id,
            requestingUserId: user_id
          })
          return safeResponse(res, 403, {
            error: 'Non autorisé',
            message: 'Vous ne pouvez modifier que vos propres recettes'
          })
        }

        // Préparer les données de mise à jour
        const updateData = {
          ...updateFields,
          updated_at: new Date().toISOString()
        }

        // Nettoyer les champs vides
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === null || updateData[key] === undefined || updateData[key] === '') {
            delete updateData[key]
          }
        })

        // Effectuer la mise à jour
        const { data: updatedRecipe, error: updateError } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user_id) // Double vérification de sécurité
          .select()
          .single()

        if (updateError) {
          logError('Error updating recipe', updateError, { recipeId: id, userId: user_id })
          return safeResponse(res, 500, {
            error: 'Erreur lors de la mise à jour',
            message: updateError.message
          })
        }

        logInfo('Recipe updated successfully', {
          reference: requestReference,
          recipeId: id,
          userId: user_id.substring(0, 8) + '...',
          updatedFields: Object.keys(updateData)
        })

        return safeResponse(res, 200, updatedRecipe)

      } catch (error) {
        const errorDetails = logApiError('UPDATE_RECIPE', error, {
          reference: requestReference,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : []
        })
        
        return safeResponse(res, 500, {
          error: 'Erreur lors de la mise à jour de la recette',
          message: error.message || 'Erreur inconnue',
          reference: requestReference
        })
      }
    }

    if (req.method === 'DELETE') {
      try {
        const { id, user_id } = req.query

        if (!id) {
          return safeResponse(res, 400, {
            error: 'ID de recette manquant',
            message: 'L\'ID de la recette est requis pour la suppression'
          })
        }

        if (!user_id) {
          return safeResponse(res, 400, {
            error: 'ID utilisateur manquant',
            message: 'L\'ID de l\'utilisateur est requis pour la suppression'
          })
        }

        logInfo('Deleting recipe', {
          reference: requestReference,
          recipeId: id,
          userId: user_id.substring(0, 8) + '...'
        })

        // Vérifier que la recette existe et appartient à l'utilisateur
        const { data: existingRecipe, error: fetchError } = await supabase
          .from('recipes')
          .select('user_id, title')
          .eq('id', id)
          .single()

        if (fetchError) {
          logError('Recipe not found for deletion', fetchError, { recipeId: id, userId: user_id })
          return safeResponse(res, 404, {
            error: 'Recette introuvable',
            message: 'La recette que vous tentez de supprimer n\'existe pas'
          })
        }

        if (existingRecipe.user_id !== user_id) {
          logWarning('User attempted to delete recipe they do not own', {
            recipeId: id,
            recipeOwnerId: existingRecipe.user_id,
            requestingUserId: user_id
          })
          return safeResponse(res, 403, {
            error: 'Non autorisé',
            message: 'Vous ne pouvez supprimer que vos propres recettes'
          })
        }

        // Effectuer la suppression
        const { error: deleteError } = await supabase
          .from('recipes')
          .delete()
          .eq('id', id)
          .eq('user_id', user_id) // Double vérification de sécurité

        if (deleteError) {
          logError('Error deleting recipe', deleteError, { recipeId: id, userId: user_id })
          return safeResponse(res, 500, {
            error: 'Erreur lors de la suppression',
            message: deleteError.message
          })
        }

        logInfo('Recipe deleted successfully', {
          reference: requestReference,
          recipeId: id,
          userId: user_id.substring(0, 8) + '...',
          recipeTitle: existingRecipe.title
        })

        return safeResponse(res, 200, {
          message: 'Recette supprimée avec succès',
          id
        })

      } catch (error) {
        const errorDetails = logApiError('DELETE_RECIPE', error, {
          reference: requestReference,
          query: req.query
        })
        
        return safeResponse(res, 500, {
          error: 'Erreur lors de la suppression de la recette',
          message: error.message || 'Erreur inconnue',
          reference: requestReference
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

export async function fetchFriendRecipes(userId, limit = 10, offset = 0) {
  try {
    logInfo(`Starting fetchFriendRecipes for user: ${userId}`, {
      userId,
      limit,
      offset
    });
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    // Étape 1: Récupérer les amitiés acceptées
    const { data: friendships, error: friendError } = await supabase
      .from('friendships')
      .select('user_id, friend_id, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');
    
    if (friendError) {
      logError('Error fetching friendships:', friendError);
      throw new Error(`Error fetching friendships: ${friendError.message}`);
    }
    
    logInfo('Friendships found:', {
      count: friendships?.length || 0,
      friendships: friendships?.map(f => ({
        user_id: f.user_id,
        friend_id: f.friend_id
      }))
    });
    
    // Extraire les IDs uniques des amis
    const friendIds = new Set();
    friendships?.forEach(f => {
      if (f.user_id === userId) {
        friendIds.add(f.friend_id);
      } else {
        friendIds.add(f.user_id);
      }
    });
    
    // Ajouter l'utilisateur lui-même pour voir ses propres recettes
    friendIds.add(userId);
    
    const friendIdsArray = Array.from(friendIds);
    
    logInfo('Friend IDs to query:', {
      friendIds: friendIdsArray,
      totalCount: friendIdsArray.length
    });
    
    if (friendIdsArray.length === 0) {
      logInfo('No friends found, returning empty array');
      return [];
    }
    
    // Étape 2: Récupérer les recettes de tous les amis (et de l'utilisateur)
    let query = supabase
      .from('recipes')
      .select(`
        id,
        title,
        description,
        image,
        category,
        author,
        user_id,
        created_at,
        updated_at,
        prepTime,
        cookTime,
        difficulty,
        ingredients,
        instructions
      `)
      .in('user_id', friendIdsArray)
      .order('created_at', { ascending: false });
    
    // Appliquer la pagination
    if (limit && limit > 0) {
      query = query.limit(parseInt(limit));
    }
    
    if (offset && offset > 0) {
      query = query.offset(parseInt(offset));
    }
    
    const { data: recipes, error: recipesError } = await query;
    
    if (recipesError) {
      logError('Error fetching recipes:', recipesError);
      throw new Error(`Error fetching recipes: ${recipesError.message}`);
    }
    
    logInfo('Recipes fetched successfully:', {
      totalRecipes: recipes?.length || 0,
      recipesByUser: recipes?.reduce((acc, recipe) => {
        acc[recipe.user_id] = (acc[recipe.user_id] || 0) + 1;
        return acc;
      }, {})
    });
    
    return recipes || [];
    
  } catch (error) {
    logError('Error in fetchFriendRecipes:', error);
    throw error;
  }
}

// Nouvelle fonction pour récupérer les recettes d'un ami spécifique
export async function fetchSpecificFriendRecipes(userId, friendId, limit = 3) {
  try {
    logInfo(`Fetching recipes for specific friend: ${friendId} by user: ${userId}`);
    
    // Vérifier d'abord que c'est bien un ami
    const { data: friendship, error: friendError } = await supabase
      .from('friendships')
      .select('id')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`)
      .eq('status', 'accepted')
      .limit(1);
    
    if (friendError || !friendship?.length) {
      logWarning('Not friends or friendship not found', { userId, friendId });
      return [];
    }
    
    // Récupérer les recettes de l'ami
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        title,
        description,
        image,
        category,
        created_at
      `)
      .eq('user_id', friendId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (recipesError) {
      throw recipesError;
    }
    
    logInfo('Friend recipes fetched:', {
      friendId,
      count: recipes?.length || 0
    });
    
    return recipes || [];
    
  } catch (error) {
    logError('Error fetching specific friend recipes:', error);
    return [];
  }
}
