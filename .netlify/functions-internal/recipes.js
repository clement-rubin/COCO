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
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(recipes)
      };
    }
    
    // POST - Ajout d'une nouvelle recette
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const newRecipe = {
        id: uuidv4(),
        title: data.title || 'Sans titre',
        description: data.description || '',
        image: data.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
        prepTime: data.prepTime || "N/A",
        cookTime: data.cookTime || "N/A",
        category: data.category || "Autre",
        author: data.author || "Anonyme",
        ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
        instructions: Array.isArray(data.instructions) ? data.instructions : [],
        created_at: new Date().toISOString()
      };
      
      const { data: insertedData, error } = await supabase
        .from('recipes')
        .insert([newRecipe])
        .select();
      
      if (error) throw error;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(insertedData[0] || newRecipe)
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
