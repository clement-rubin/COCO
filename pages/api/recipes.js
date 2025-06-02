import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning, logDebug } from '../../utils/logger'

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

    // GET - Récupération des recettes
    if (req.method === 'GET') {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        logError('[API] Erreur lors de la récupération des recettes', error)
        throw error
      }
      
      logInfo('[API] Recettes récupérées avec succès', {
        recipesCount: recipes.length
      })
      
      res.status(200).json(recipes)
      return
    }
    
    // POST - Ajout d'une nouvelle recette
    if (req.method === 'POST') {
      const data = req.body
      
      logDebug('[API] Données reçues pour nouvelle recette', {
        hasTitle: !!data.title,
        hasDescription: !!data.description,
        hasIngredients: !!data.ingredients,
        hasInstructions: !!data.instructions,
        hasImage: !!data.image,
        imageType: Array.isArray(data.image) ? 'bytes' : typeof data.image,
        imageBytesLength: Array.isArray(data.image) ? data.image.length : 'N/A'
      })
      
      // Validation des champs obligatoires
      if (!data.title || !data.description) {
        logWarning('[API] Champs obligatoires manquants', {
          hasTitle: !!data.title,
          hasDescription: !!data.description,
          receivedFields: Object.keys(data)
        })
        
        res.status(400).json({ 
          message: 'Champs obligatoires manquants',
          required: ['title', 'description'],
          received: Object.keys(data)
        })
        return
      }
      
      // Validation de l'image (doit être un array de bytes)
      if (!data.image || !Array.isArray(data.image) || data.image.length === 0) {
        logWarning('[API] Image manquante ou invalide', {
          hasImage: !!data.image,
          imageType: typeof data.image,
          isArray: Array.isArray(data.image),
          arrayLength: Array.isArray(data.image) ? data.image.length : 'N/A'
        })
        
        res.status(400).json({ 
          message: 'Image obligatoire et doit être un tableau de bytes',
          imageReceived: {
            type: typeof data.image,
            isArray: Array.isArray(data.image),
            length: Array.isArray(data.image) ? data.image.length : 'N/A'
          }
        })
        return
      }

      // Test de structure de la table avant insertion
      try {
        logInfo('[API] Test de structure de la table recipes')
        const { data: tableTest, error: tableError } = await supabase
          .from('recipes')
          .select('id')
          .limit(1)
        
        if (tableError) {
          logError('[API] Erreur lors du test de la table', tableError)
          res.status(500).json({
            message: 'Erreur de configuration de la base de données',
            details: 'La table recipes n\'est pas accessible ou n\'existe pas.',
            error: tableError.message,
            solution: 'Vérifiez que la table recipes existe dans Supabase avec toutes les colonnes requises.'
          })
          return
        }
        
        logDebug('[API] Test de structure réussi', { 
          canAccessTable: true,
          testResultCount: tableTest?.length || 0
        })
      } catch (tableTestError) {
        logError('[API] Erreur critique lors du test de table', tableTestError)
        res.status(500).json({
          message: 'Erreur critique de base de données',
          details: 'Impossible d\'accéder à la table recipes.',
          error: tableTestError.message,
          solution: 'Vérifiez la configuration Supabase et les variables d\'environnement.'
        })
        return
      }
      
      // Préparer les ingrédients et instructions
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
      
      // Préparer les données avec validation des champs requis
      const newRecipe = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        ingredients: JSON.stringify(ingredients),
        instructions: JSON.stringify(instructions),
        prepTime: data.prepTime?.trim() || null,
        cookTime: data.cookTime?.trim() || null,
        category: data.category?.trim() || null,
        author: data.author?.trim() || 'Anonyme',
        image: data.image // Array de bytes pour stockage en bytea
      }

      // Ajouter photos seulement si la colonne existe
      if (data.photos) {
        newRecipe.photos = JSON.stringify(data.photos)
      }
      
      logInfo('[API] Tentative d\'insertion de nouvelle recette', {
        title: newRecipe.title,
        ingredientsCount: ingredients.length,
        instructionsCount: instructions.length,
        imageBytesLength: newRecipe.image.length,
        category: newRecipe.category,
        author: newRecipe.author,
        hasPhotos: !!newRecipe.photos
      })
      
      const { data: insertedData, error } = await supabase
        .from('recipes')
        .insert([newRecipe])
        .select()
      
      if (error) {
        logError('[API] Erreur lors de l\'insertion de la recette', error, {
          recipeTitle: newRecipe.title,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        })
        
        // Messages d'erreur spécifiques améliorés
        if (error.code === 'PGRST204' || error.code === '42703') {
          res.status(500).json({ 
            message: 'Erreur de structure de base de données',
            details: 'Une ou plusieurs colonnes nécessaires sont manquantes dans la table recipes.',
            error: error.message,
            requiredColumns: ['id', 'title', 'description', 'ingredients', 'instructions', 'image', 'author', 'created_at'],
            solution: 'Consultez la documentation pour créer la table avec toutes les colonnes requises.',
            sqlHelp: `
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  prep_time VARCHAR(50),
  cook_time VARCHAR(50),
  category VARCHAR(100),
  author VARCHAR(255) DEFAULT 'Anonyme',
  image BYTEA,
  photos TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
          })
          return
        }

        if (error.code === '23502') {
          res.status(400).json({
            message: 'Données manquantes pour la base de données',
            details: 'Un champ obligatoire est manquant ou null.',
            error: error.message,
            hint: 'Vérifiez que tous les champs obligatoires sont remplis.'
          })
          return
        }

        if (error.code === '22001') {
          res.status(400).json({
            message: 'Données trop longues',
            details: 'Une des valeurs dépasse la taille maximale autorisée.',
            error: error.message,
            hint: 'Réduisez la taille du titre, de la description ou des autres champs.'
          })
          return
        }
        
        res.status(500).json({
          message: 'Erreur lors de la création de la recette',
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return
      }
      
      logInfo('[API] Recette créée avec succès', {
        recipeId: insertedData[0]?.id,
        recipeTitle: insertedData[0]?.title
      })
      
      res.status(201).json({
        message: 'Recette créée avec succès',
        id: insertedData[0]?.id,
        title: insertedData[0]?.title
      })
      return
    }

    // PUT - Mise à jour d'une recette existante
    if (req.method === 'PUT') {
      const data = req.body
      const { id } = data

      if (!id) {
        res.status(400).json({ message: 'ID de recette requis' })
        return
      }

      const updateData = { ...data, updated_at: new Date().toISOString() }
      
      const { error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
      
      if (error) {
        logError('[API] Erreur lors de la mise à jour', error)
        throw error
      }
      
      logInfo('[API] Recette mise à jour avec succès', { id })
      res.status(200).json({ message: 'Recette mise à jour', id })
      return
    }

    // DELETE - Suppression d'une recette
    if (req.method === 'DELETE') {
      const { id } = req.query
      
      if (!id) {
        res.status(400).json({ message: 'ID de recette requis' })
        return
      }
      
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
      
      if (error) {
        logError('[API] Erreur lors de la suppression', error)
        throw error
      }
      
      logInfo('[API] Recette supprimée avec succès', { id })
      res.status(200).json({ message: 'Recette supprimée', id })
      return
    }

    // Méthode non supportée
    res.status(405).json({ message: 'Méthode non autorisée' })

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
