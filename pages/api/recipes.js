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

        // Traitement de l'image
        if (image) {
          if (typeof image === 'string') {
            // Validation de la Data URL
            if (image.startsWith('data:image/')) {
              recipeData.image = image
              logDebug('Image Data URL acceptée', { 
                imageLength: image.length,
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
            // Si c'est un tableau de bytes, le convertir en chaîne JSON
            recipeData.image = JSON.stringify(image)
            logDebug('Image stockée comme tableau de bytes', { bytesLength: image.length })
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
        logInfo('API recipes - Récupération des recettes')
        
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          logError('Erreur lors de la récupération des recettes', error)
          return res.status(500).json({ 
            error: 'Erreur lors de la récupération des recettes' 
          })
        }

        logInfo('Recettes récupérées avec succès', { 
          count: data?.length || 0 
        })

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
