// Ce fichier est une version optimisée pour Netlify Functions
// Il sera automatiquement utilisé par le plugin Next.js de Netlify

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Création d'un client Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Les variables d\'environnement Supabase ne sont pas définies');
}

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Fonction de journalisation améliorée pour production
function log(message, type = "info", details = null) {
  const timestamp = new Date().toISOString();
  const prefix = type === "error" ? "❌ ERREUR" : type === "warning" ? "⚠️ ATTENTION" : "ℹ️ INFO";
  
  // Base log message
  console.log(`[${timestamp}] ${prefix}: ${message}`);
  
  // Si c'est une erreur et qu'on a des détails, les afficher en production
  if (type === "error" && details) {
    const errorInfo = {
      timestamp,
      message,
      error: typeof details === 'object' ? {
        name: details.name || 'Unknown Error',
        message: details.message || 'No message',
        code: details.code,
        stack: details.stack,
        cause: details.cause,
        ...details
      } : details,
      environment: process.env.NODE_ENV || 'development',
      deploymentId: process.env.NETLIFY_DEPLOY_ID || 'Local',
      functionName: 'recipes-handler'
    };
    
    console.error('==== DÉTAILS DE L\'ERREUR ====');
    console.error(JSON.stringify(errorInfo, null, 2));
    
    // Afficher stack trace séparément pour une meilleure lisibilité
    if (details?.stack) {
      console.error('==== STACK TRACE ====');
      console.error(details.stack);
    }
    
    console.error('===============================');
  }
  // Si on est en mode verbose, afficher les détails supplémentaires
  else if (details && (process.env.LOG_LEVEL === 'verbose' || process.env.NODE_ENV === 'development')) {
    console.log('Détails:', details);
  }
}

// Fonction principale optimisée pour Netlify
exports.handler = async (event, context) => {
  // Définir un timeout pour éviter les fonctions bloquées
  context.callbackWaitsForEmptyEventLoop = false;
  
  // En-têtes CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Traitement des requêtes OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    log(`Traitement de requête ${event.httpMethod}`, "info", { 
      path: event.path, 
      queryParams: event.queryStringParameters,
      requestId: event.requestContext?.requestId
    });

    // GET - Récupération des recettes
    if (event.httpMethod === 'GET') {
      const { author } = event.queryStringParameters || {}
      
      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Filter by author if specified
      if (author) {
        log(`Filtrage des recettes par auteur: ${author}`, "info")
        query = query.eq('author', author)
      }
      
      const { data: recipes, error } = await query
      
      if (error) throw error;
      
      log(`Recettes récupérées: ${recipes.length}${author ? ` pour l'auteur ${author}` : ''}`, "info")
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(recipes)
      };
    }
    
    // POST - Ajout d'une nouvelle recette
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      
      // Validation des champs obligatoires
      if (!data.title) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            message: 'Champs obligatoires manquants',
            required: ['title'],
            received: Object.keys(data)
          })
        };
      }
      
      // Ensure ingredients and instructions are arrays
      const ingredients = Array.isArray(data.ingredients) ? data.ingredients : 
                         typeof data.ingredients === 'string' ? data.ingredients.split('\n').filter(i => i.trim()) :
                         [];
      
      const instructions = Array.isArray(data.instructions) ? data.instructions :
                          typeof data.instructions === 'string' ? 
                            data.instructions.split('\n').filter(i => i.trim()).map((inst, index) => ({
                              step: index + 1,
                              instruction: inst.trim()
                            })) :
                          [];
      
      const newRecipe = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        image: data.image || null, // bytea array ou null
        prepTime: data.prepTime?.trim() || null,
        cookTime: data.cookTime?.trim() || null,
        category: data.category?.trim() || null,
        author: data.author?.trim() || null,
        ingredients: ingredients,
        instructions: instructions,
        difficulty: data.difficulty?.trim() || 'Facile'
      };
      
      log(`Tentative d'insertion d'une nouvelle recette: ${newRecipe.title}`, "info", {
        hasTitle: !!newRecipe.title,
        hasDescription: !!newRecipe.description,
        hasAuthor: !!newRecipe.author,
        hasImageBytes: !!newRecipe.image && Array.isArray(newRecipe.image),
        imageBytesLength: Array.isArray(newRecipe.image) ? newRecipe.image.length : 0,
        ingredientsCount: newRecipe.ingredients.length,
        instructionsCount: newRecipe.instructions.length,
        category: newRecipe.category,
        difficulty: newRecipe.difficulty
      });
      
      const { data: insertedData, error } = await supabase
        .from('recipes')
        .insert([newRecipe])
        .select();
      
      if (error) {
        log(`Erreur lors de l'insertion de la recette`, "error", {
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          recipeTitle: newRecipe.title,
          recipeData: newRecipe
        });
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            message: 'Erreur lors de la création de la recette',
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
        };
      }
      
      log(`Recette créée avec succès: ${insertedData[0]?.title}`, "info", {
        recipeId: insertedData[0]?.id,
        recipeTitle: insertedData[0]?.title
      });
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(insertedData[0])
      };
    }

    // PUT - Mise à jour d'une recette existante
    if (event.httpMethod === 'PUT') {
      const data = JSON.parse(event.body);
      const { id } = data;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'ID de recette requis' })
        };
      }

      const updateData = { ...data, updated_at: new Date().toISOString() };
      
      const { error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Recette mise à jour', id })
      };
    }

    // DELETE - Suppression d'une recette
    if (event.httpMethod === 'DELETE') {
      const id = event.path.split('/').pop() || event.queryStringParameters?.id;
      
      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'ID de recette requis' })
        };
      }
      
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Recette supprimée', id })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Méthode non autorisée' })
    };
  } catch (error) {
    log(`Erreur générale lors du traitement de la requête`, "error", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Erreur serveur', 
        error: error.message,
        timestamp: new Date().toISOString(),
        reference: `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
      })
    };
  }
}
