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
      const { author } = req.query
      
      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Filter by author if specified
      if (author) {
        logInfo('[API] Filtrage par auteur', { author })
        query = query.eq('author', author)
      }
      
      const { data: recipes, error } = await query
      
      if (error) {
        logError('[API] Erreur lors de la récupération des recettes', error)
        throw error
      }
      
      logInfo('[API] Recettes récupérées avec succès', {
        recipesCount: recipes.length,
        filteredByAuthor: !!author
      })
      
      res.status(200).json(recipes)
      return
    }
    
    // POST - Ajout d'une nouvelle recette
    if (req.method === 'POST') {
      const data = req.body
      
      logDebug('[API] Données brutes reçues pour nouvelle recette', {
        dataKeys: Object.keys(data),
        hasTitle: !!data.title,
        hasDescription: !!data.description,
        hasIngredients: !!data.ingredients,
        hasInstructions: !!data.instructions,
        hasImage: !!data.image,
        hasPrepTime: !!data.prepTime,
        hasCookTime: !!data.cookTime,
        hasCategory: !!data.category,
        hasAuthor: !!data.author,
        hasDifficulty: !!data.difficulty,
        imageType: Array.isArray(data.image) ? 'bytes' : typeof data.image,
        imageBytesLength: Array.isArray(data.image) ? data.image.length : 'N/A',
        dataSize: JSON.stringify(data).length
      })
      
      // Validation des champs obligatoires selon le schéma
      if (!data.title) {
        logWarning('[API] Champ title obligatoire manquant', {
          receivedFields: Object.keys(data),
          titleValue: data.title
        })
        
        res.status(400).json({ 
          message: 'Le champ title est obligatoire',
          required: ['title'],
          received: Object.keys(data)
        })
        return
      }
      
      // Validation de l'image si fournie (doit être un tableau de bytes)
      if (data.image && (!Array.isArray(data.image) || data.image.length === 0)) {
        logWarning('[API] Image invalide fournie', {
          hasImage: !!data.image,
          imageType: typeof data.image,
          isArray: Array.isArray(data.image),
          arrayLength: Array.isArray(data.image) ? data.image.length : 'N/A'
        })
        
        res.status(400).json({ 
          message: 'Si une image est fournie, elle doit être un tableau de bytes valide',
          imageReceived: {
            type: typeof data.image,
            isArray: Array.isArray(data.image),
            length: Array.isArray(data.image) ? data.image.length : 'N/A'
          }
        })
        return
      }

      // Vérification que la taille de l'image n'est pas excessive
      if (data.image && Array.isArray(data.image) && data.image.length > 10 * 1024 * 1024) {
        logWarning('[API] Image trop volumineuse', {
          imageSizeBytes: data.image.length,
          maxSizeBytes: 10 * 1024 * 1024
        })
        
        res.status(400).json({
          message: 'L\'image est trop volumineuse (max 10 Mo)',
          details: {
            providedSizeBytes: data.image.length,
            maxSizeBytes: 10 * 1024 * 1024
          }
        })
        return
      }

      // Test de structure de la table selon le schéma exact
      try {
        logInfo('[API] Vérification de la structure de la table recipes selon le schéma')
        const { data: tableTest, error: tableError } = await supabase
          .from('recipes')
          .select('id, title, description, image, prepTime, cookTime, category, author, ingredients, instructions, created_at, updated_at, difficulty')
          .limit(1)
        
        if (tableError) {
          logError('[API] Erreur lors de la vérification de structure', tableError, {
            errorCode: tableError.code,
            errorMessage: tableError.message,
            errorDetails: tableError.details
          })
          
          res.status(500).json({
            message: 'Erreur de configuration de la base de données',
            details: 'La table recipes n\'est pas conforme au schéma attendu.',
            error: tableError.message,
            expectedColumns: ['id', 'title', 'description', 'image', 'prepTime', 'cookTime', 'category', 'author', 'ingredients', 'instructions', 'created_at', 'updated_at', 'difficulty']
          })
          return
        }
        
        logDebug('[API] Structure de table validée', { 
          canAccessAllColumns: true,
          testResultCount: tableTest?.length || 0,
          schemaCompliant: true
        })
      } catch (tableTestError) {
        logError('[API] Erreur critique lors de la vérification de schéma', tableTestError)
        res.status(500).json({
          message: 'Erreur critique de base de données',
          details: 'Impossible de vérifier la conformité au schéma.',
          error: tableTestError.message
        })
        return
      }
      
      // Préparation des ingrédients avec validation et logging détaillé
      let processedIngredients = []
      try {
        if (Array.isArray(data.ingredients)) {
          processedIngredients = data.ingredients.filter(i => i && typeof i === 'string' && i.trim())
          logDebug('[API] Ingrédients traités depuis array', {
            originalCount: data.ingredients.length,
            processedCount: processedIngredients.length,
            filteredOut: data.ingredients.length - processedIngredients.length
          })
        } else if (typeof data.ingredients === 'string') {
          processedIngredients = data.ingredients.split('\n').filter(i => i.trim())
          logDebug('[API] Ingrédients traités depuis string', {
            originalLength: data.ingredients.length,
            processedCount: processedIngredients.length,
            splitBy: 'newline'
          })
        } else {
          logWarning('[API] Format d\'ingrédients non reconnu', {
            ingredientsType: typeof data.ingredients,
            ingredientsValue: data.ingredients
          })
        }
      } catch (ingredientsError) {
        logError('[API] Erreur lors du traitement des ingrédients', ingredientsError)
        processedIngredients = []
      }
      
      // Préparation des instructions avec validation et logging détaillé
      let processedInstructions = []
      try {
        if (Array.isArray(data.instructions)) {
          processedInstructions = data.instructions
            .filter(inst => inst && (typeof inst === 'string' || typeof inst === 'object'))
            .map((inst, index) => {
              if (typeof inst === 'string') {
                return { step: index + 1, instruction: inst.trim() }
              }
              return inst
            })
          logDebug('[API] Instructions traitées depuis array', {
            originalCount: data.instructions.length,
            processedCount: processedInstructions.length
          })
        } else if (typeof data.instructions === 'string') {
          processedInstructions = data.instructions
            .split('\n')
            .filter(i => i.trim())
            .map((inst, index) => ({
              step: index + 1,
              instruction: inst.trim()
            }))
          logDebug('[API] Instructions traitées depuis string', {
            originalLength: data.instructions.length,
            processedCount: processedInstructions.length,
            splitBy: 'newline'
          })
        } else {
          logWarning('[API] Format d\'instructions non reconnu', {
            instructionsType: typeof data.instructions,
            instructionsValue: data.instructions
          })
        }
      } catch (instructionsError) {
        logError('[API] Erreur lors du traitement des instructions', instructionsError)
        processedInstructions = []
      }
      
      // Création de l'objet recette selon le schéma exact
      const newRecipe = {
        // id sera généré automatiquement par gen_random_uuid()
        title: data.title.trim(),
        description: data.description?.trim() || null,
        image: data.image || null, // bytea array ou null
        prepTime: data.prepTime?.trim() || null,
        cookTime: data.cookTime?.trim() || null,
        category: data.category?.trim() || null,
        author: data.author?.trim() || null,
        ingredients: processedIngredients,
        instructions: processedInstructions,
        difficulty: data.difficulty?.trim() || 'Facile',
        // created_at et updated_at seront gérés automatiquement
      }

      logInfo('[API] Recette préparée pour insertion selon schéma bytea', {
        title: newRecipe.title,
        hasAuthor: !!newRecipe.author,
        hasImageBytes: !!newRecipe.image && Array.isArray(newRecipe.image),
        imageBytesLength: Array.isArray(newRecipe.image) ? newRecipe.image.length : 0,
        ingredientsCount: newRecipe.ingredients.length,
        instructionsCount: newRecipe.instructions.length,
        difficulty: newRecipe.difficulty,
        schemaCompliant: true
      })
      
      try {
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
            errorHint: error.hint,
            schemaColumns: Object.keys(newRecipe)
          })
          
          // Messages d'erreur spécifiques
          if (error.code === 'PGRST204' || error.code === '42703') {
            res.status(500).json({ 
              message: 'Erreur de structure de base de données',
              details: 'La table recipes ne correspond pas au schéma attendu.',
              error: error.message,
              expectedSchema: {
                id: 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
                title: 'text NOT NULL',
                description: 'text',
                image: 'bytea',
                prepTime: 'text',
                cookTime: 'text',
                category: 'text',
                author: 'text',
                ingredients: 'json',
                instructions: 'json',
                created_at: 'timestamp with time zone',
                updated_at: 'timestamp with time zone',
                difficulty: 'text DEFAULT \'Facile\''
              }
            })
            return
          }

          if (error.code === '23502') {
            res.status(400).json({
              message: 'Champ obligatoire manquant',
              details: 'Le champ title est requis et ne peut pas être null.',
              error: error.message,
              requiredFields: ['title']
            })
            return
          }

          if (error.code === '22001') {
            res.status(400).json({
              message: 'Données trop longues',
              details: 'Une des valeurs dépasse la taille maximale autorisée.',
              error: error.message,
              dataSize: JSON.stringify(newRecipe).length
            })
            return
          }
          
          if (error.code === '42P01') {
            res.status(500).json({
              message: 'Table non trouvée',
              details: 'La table recipes n\'existe pas dans la base de données.',
              error: error.message,
              solution: 'Vérifiez que vous avez bien créé la table recipes dans votre base Supabase.'
            })
            return
          }
          
          if (error.code === '28000' || error.code === '28P01') {
            res.status(401).json({
              message: 'Erreur d\'authentification',
              details: 'Les identifiants de connexion à la base de données sont incorrects.',
              error: error.message,
              solution: 'Vérifiez vos variables d\'environnement SUPABASE_URL et SUPABASE_KEY.'
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
        
        logInfo('[API] Recette créée avec succès dans la base', {
          recipeId: insertedData[0]?.id,
          recipeTitle: insertedData[0]?.title,
          createdAt: insertedData[0]?.created_at,
          hasImageBytes: !!insertedData[0]?.image,
          isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(insertedData[0]?.id)
        })
        
        res.status(201).json({
          message: 'Recette créée avec succès',
          id: insertedData[0]?.id,
          title: insertedData[0]?.title,
          created_at: insertedData[0]?.created_at
        })
      } catch (insertError) {
        logError('[API] Exception lors de l\'insertion', insertError, {
          errorMessage: insertError.message,
          stack: insertError.stack
        })
        res.status(500).json({
          message: 'Exception lors de l\'insertion de la recette',
          error: insertError.message,
          reference: `err-${Date.now()}`
        })
      }
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
