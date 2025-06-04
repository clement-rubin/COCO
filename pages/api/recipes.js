import { supabase } from '../../lib/supabase'
import { logInfo, logError, logDebug } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Traitement des requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    logInfo(`[API] Traitement de requête ${req.method}`, {
      method: req.method,
      query: req.query,
      hasBody: !!req.body,
      userAgent: req.headers['user-agent']?.substring(0, 100)
    })

    // POST - Ajout d'une nouvelle recette
    if (req.method === 'POST') {
      try {
        logInfo('API recipes - Début de création de recette', {
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : []
        })
        
        const {
          title,
          description,
          ingredients,
          instructions,
          author,
          image, // Peut être une Data URL ou des bytes
          category,
          prepTime,
          cookTime,
          difficulty = 'Facile'
        } = req.body

        // Validation des champs obligatoires
        if (!title?.trim()) {
          logError('Validation échouée - titre manquant', null, { title })
          return res.status(400).json({ 
            error: 'Le titre est obligatoire' 
          })
        }

        // Validation de l'image
        if (!image) {
          logError('Validation échouée - image manquante')
          return res.status(400).json({ 
            error: 'Une image est obligatoire' 
          })
        }

        // Préparer les données pour insertion
        const recipeData = {
          title: title.trim(),
          description: description?.trim() || null,
          ingredients: Array.isArray(ingredients) ? JSON.stringify(ingredients) : ingredients,
          instructions: Array.isArray(instructions) ? JSON.stringify(instructions) : instructions,
          author: author?.trim() || 'Anonyme',
          category: category?.trim() || 'Autre',
          prepTime: prepTime?.trim() || null,
          cookTime: cookTime?.trim() || null,
          difficulty: difficulty || 'Facile',
          image: null // Sera traité ci-dessous
        }

        // Traitement de l'image avec validation améliorée
        if (image) {
          if (typeof image === 'string') {
            // Validation de la Data URL
            if (image.startsWith('data:image/')) {
              // Valider la taille et optimiser si nécessaire
              const sizeKB = Math.round(image.length * 0.75 / 1024)
              
              if (sizeKB > 500) {
                logWarning('Image Data URL très volumineuse', { 
                  sizeKB,
                  imagePrefix: image.substring(0, 50) + '...'
                })
                
                // Vous pourriez implémenter une re-compression ici si nécessaire
                return res.status(400).json({ 
                  error: `Image trop volumineuse: ${sizeKB}KB (max: 500KB). Veuillez réduire la qualité.` 
                })
              }
              
              recipeData.image = image
              logDebug('Image Data URL acceptée', { 
                sizeKB,
                imagePrefix: image.substring(0, 50) + '...'
              })
            } else {
              logError('Format d\'image invalide - pas une Data URL', null, { 
                imageType: typeof image,
                imageStart: image.substring(0, 50)
              })
              return res.status(400).json({ 
                error: 'Format d\'image invalide (Data URL attendue)' 
              })
            }
          } else if (Array.isArray(image)) {
            // Si c'est un tableau de bytes, le convertir et valider
            try {
              const uint8Array = new Uint8Array(image)
              const base64 = btoa(String.fromCharCode.apply(null, uint8Array))
              const dataUrl = `data:image/jpeg;base64,${base64}`
              const sizeKB = Math.round(dataUrl.length * 0.75 / 1024)
              
              if (sizeKB > 500) {
                return res.status(400).json({ 
                  error: `Image convertie trop volumineuse: ${sizeKB}KB (max: 500KB)` 
                })
              }
              
              recipeData.image = dataUrl
              logDebug('Image bytes convertie en Data URL', { 
                bytesLength: image.length,
                dataUrlSizeKB: sizeKB
              })
            } catch (error) {
              logError('Erreur conversion bytes vers Data URL', error)
              return res.status(400).json({ 
                error: 'Erreur lors de la conversion des bytes image' 
              })
            }
          } else {
            logError('Format d\'image non supporté', null, { 
              imageType: typeof image 
            })
            return res.status(400).json({ 
              error: 'Format d\'image non supporté' 
            })
          }
        }

        logDebug('Données préparées pour insertion', {
          hasTitle: !!recipeData.title,
          titleLength: recipeData.title.length,
          hasDescription: !!recipeData.description,
          hasImage: !!recipeData.image,
          imageLength: recipeData.image?.length,
          author: recipeData.author,
          category: recipeData.category
        })

        // Insertion en base de données
        const { data, error } = await supabase
          .from('recipes')
          .insert([recipeData])
          .select()

        if (error) {
          logError('Erreur Supabase lors de l\'insertion', error, {
            recipeTitle: recipeData.title,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint
          })
          
          return res.status(500).json({ 
            error: 'Erreur lors de la sauvegarde en base de données',
            details: error.message,
            code: error.code
          })
        }

        if (!data || data.length === 0) {
          logError('Aucune donnée retournée après insertion')
          return res.status(500).json({ 
            error: 'Erreur lors de la création de la recette - aucune donnée retournée' 
          })
        }

        const createdRecipe = data[0]
        
        logInfo('Recette créée avec succès', {
          recipeId: createdRecipe.id,
          title: createdRecipe.title,
          hasImage: !!createdRecipe.image,
          author: createdRecipe.author
        })

        res.status(201).json({
          message: 'Recette créée avec succès',
          id: createdRecipe.id,
          recipe: createdRecipe
        })

      } catch (error) {
        logError('Erreur inattendue dans l\'API recipes', error, {
          method: req.method,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        })

        res.status(500).json({
          error: 'Erreur serveur interne',
          message: error.message,
          type: error.name
        })
      }
      return
    } else if (req.method === 'GET') {
      try {
        const { user_id } = req.query
        
        logInfo('API recipes - Récupération des recettes - DEBUT', {
          hasUserId: !!user_id,
          userId: user_id,
          userIdSubstring: user_id?.substring(0, 8) + '...',
          userIdType: typeof user_id,
          userIdLength: user_id?.length,
          allQueryParams: req.query
        })
        
        // Première étape: récupérer TOUTES les recettes pour diagnostic
        const { data: allRecipes, error: allError } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })

        if (allError) {
          logError('Erreur lors de la récupération de TOUTES les recettes', allError)
        } else {
          logInfo('DIAGNOSTIC - Toutes les recettes en base', {
            totalRecipes: allRecipes?.length || 0,
            recipesWithUserId: allRecipes?.filter(r => r.user_id).length || 0,
            recipesWithoutUserId: allRecipes?.filter(r => !r.user_id).length || 0,
            sampleRecipes: allRecipes?.slice(0, 5).map(r => ({
              id: r.id,
              title: r.title,
              author: r.author,
              user_id: r.user_id,
              user_id_type: typeof r.user_id,
              user_id_length: r.user_id?.length,
              created_at: r.created_at,
              category: r.category
            })) || [],
            allUserIds: [...new Set(allRecipes?.map(r => r.user_id).filter(Boolean))] || [],
            requestedUserId: user_id,
            requestedUserIdType: typeof user_id
          })

          // Si un user_id est fourni, montrer les comparaisons
          if (user_id && allRecipes) {
            const matchingRecipes = allRecipes.filter(r => r.user_id === user_id)
            const exactMatches = allRecipes.filter(r => r.user_id === user_id)
            const typeMatches = allRecipes.filter(r => String(r.user_id) === String(user_id))
            
            logInfo('DIAGNOSTIC - Comparaisons de user_id', {
              requestedUserId: user_id,
              exactMatches: exactMatches.length,
              typeMatches: typeMatches.length,
              strictComparisons: allRecipes.slice(0, 5).map(r => ({
                recipeUserId: r.user_id,
                requestedUserId: user_id,
                strictEqual: r.user_id === user_id,
                typeEqual: String(r.user_id) === String(user_id),
                recipeUserIdType: typeof r.user_id,
                requestedUserIdType: typeof user_id
              })),
              matchingRecipeTitles: exactMatches.map(r => r.title)
            })
          }
        }

        let query = supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })

        // Si un user_id est fourni, filtrer par user_id
        if (user_id) {
          query = query.eq('user_id', user_id)
          logDebug('Filtrage par user_id appliqué', { 
            userId: user_id,
            userIdSubstring: user_id.substring(0, 8) + '...',
            filterApplied: 'eq(user_id, ' + user_id + ')'
          })
        }

        const { data, error } = await query

        if (error) {
          logError('Erreur lors de la récupération des recettes filtrées', error, {
            hasUserId: !!user_id,
            userId: user_id,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details
          })
          return res.status(500).json({ 
            error: 'Erreur lors de la récupération des recettes' 
          })
        }

        logInfo('Recettes récupérées avec succès - RESULTAT FINAL', { 
          count: data?.length || 0,
          hasUserId: !!user_id,
          userIdProvided: user_id,
          recipesFound: data?.map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            user_id: r.user_id,
            created_at: r.created_at,
            category: r.category
          })) || [],
          userIdsInResults: data?.map(r => r.user_id) || [],
          requestedUserId: user_id
        })

        // Log supplémentaire si aucune recette trouvée mais user_id fourni
        if (user_id && (!data || data.length === 0)) {
          logWarning('AUCUNE RECETTE TROUVEE pour l\'utilisateur', {
            requestedUserId: user_id,
            userIdType: typeof user_id,
            userIdLength: user_id?.length,
            possibleCauses: [
              'Aucune recette créée par cet utilisateur',
              'user_id pas renseigné lors de la création des recettes',
              'Problème de correspondance de type de données',
              'user_id modifié ou corrompu'
            ],
            suggestions: [
              'Vérifier si les recettes ont bien un user_id renseigné',
              'Vérifier la création de recettes dans submit-recipe ou share-photo',
              'Vérifier la session utilisateur',
              'Regarder les logs de création de recettes'
            ]
          })
        }

        res.status(200).json(data || [])

      } catch (error) {
        logError('Erreur inattendue lors de la récupération', error)
        res.status(500).json({
          error: 'Erreur serveur interne',
          message: error.message
        })
      }
      return
    }

    // Méthode non supportée
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    logError('[API] Erreur générale lors du traitement', error, {
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })
    
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error.message,
      timestamp: new Date().toISOString(),
      reference: `api-err-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    })
  }
}
