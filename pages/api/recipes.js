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
        logInfo('API recipes - Début de création de recette')
        
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
          logError('Validation échouée - titre manquant')
          return res.status(400).json({ 
            error: 'Le titre est obligatoire' 
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
            // Si c'est déjà une chaîne (Data URL), l'utiliser directement
            recipeData.image = image
            logDebug('Image stockée comme chaîne', { imageLength: image.length })
          } else if (Array.isArray(image)) {
            // Si c'est un tableau de bytes, le convertir en chaîne JSON
            recipeData.image = JSON.stringify(image)
            logDebug('Image stockée comme tableau de bytes', { bytesLength: image.length })
          } else {
            logError('Format d\'image non supporté', new Error('Invalid image format'), { 
              imageType: typeof image 
            })
          }
        }

        logDebug('Données préparées pour insertion', {
          hasTitle: !!recipeData.title,
          hasDescription: !!recipeData.description,
          hasImage: !!recipeData.image,
          imageLength: recipeData.image?.length,
          author: recipeData.author
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
            errorMessage: error.message
          })
          
          return res.status(500).json({ 
            error: 'Erreur lors de la sauvegarde en base de données',
            details: error.message 
          })
        }

        if (!data || data.length === 0) {
          logError('Aucune donnée retournée après insertion')
          return res.status(500).json({ 
            error: 'Erreur lors de la création de la recette' 
          })
        }

        const createdRecipe = data[0]
        
        logInfo('Recette créée avec succès', {
          recipeId: createdRecipe.id,
          title: createdRecipe.title,
          hasImage: !!createdRecipe.image
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
          bodyKeys: req.body ? Object.keys(req.body) : []
        })

        res.status(500).json({
          error: 'Erreur serveur interne',
          message: error.message
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
