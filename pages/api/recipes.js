import { v4 as uuidv4 } from 'uuid';
import { supabase, initializeRecipesTable } from '../../lib/supabase';

// Configuration des en-têtes CORS
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Fonction de journalisation pour faciliter le débogage
function logInfo(message, details = null) {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (details) console.log(details);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Limite de taille augmentée à 10MB
    },
  },
};

export default async function handler(req, res) {
  // Gestion CORS
  setCorsHeaders(res);
  
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Initialiser la table si nécessaire (uniquement lors du premier appel)
    await initializeRecipesTable();
    
    // GET - Récupérer toutes les recettes
    if (req.method === 'GET') {
      try {
        logInfo('Récupération de toutes les recettes');
        
        const { data: recipes, error } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return res.status(200).json(recipes);
      } catch (error) {
        logInfo('Erreur lors de la récupération des recettes', error);
        return res.status(500).json({ 
          message: 'Erreur serveur lors de la récupération des recettes', 
          error: error.message 
        });
      }
    }
    
    // POST - Ajouter une nouvelle recette
    else if (req.method === 'POST') {
      try {
        logInfo("Tentative d'ajout d'une nouvelle recette");
        
        const body = req.body;
        
        // Validation de base
        if (!body) {
          return res.status(400).json({ 
            message: 'Corps de requête vide ou invalide'
          });
        }

        if (!body.title || !body.description) {
          return res.status(400).json({ 
            message: 'Les champs titre et description sont obligatoires'
          });
        }
        
        // Préparer la nouvelle recette
        const newRecipe = {
          id: uuidv4(),
          title: body.title,
          description: body.description,
          image: body.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
          prepTime: body.prepTime || "N/A",
          cookTime: body.cookTime || "N/A",
          category: body.category || "Autre",
          author: body.author || "Anonyme",
          ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
          instructions: Array.isArray(body.instructions) ? body.instructions : [],
          created_at: new Date().toISOString()
        };
        
        logInfo("Insertion de la recette dans Supabase", { title: newRecipe.title });
        
        const { data, error } = await supabase
          .from('recipes')
          .insert([newRecipe])
          .select();
        
        if (error) throw error;
        
        logInfo("Recette ajoutée avec succès", { id: newRecipe.id });
        return res.status(201).json(data[0]);
      } catch (error) {
        logInfo('Erreur lors de l\'ajout d\'une recette', error);
        return res.status(500).json({ 
          message: 'Erreur serveur lors de l\'ajout de la recette', 
          error: error.message
        });
      }
    }
    
    // PUT - Mettre à jour une recette existante
    else if (req.method === 'PUT') {
      try {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ message: 'ID de recette requis' });
        }
        
        const updateData = { ...req.body, updated_at: new Date().toISOString() };
        
        const { error } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        
        return res.status(200).json({ message: 'Recette mise à jour', id });
      } catch (error) {
        logInfo('Erreur lors de la mise à jour d\'une recette', error);
        return res.status(500).json({ 
          message: 'Erreur serveur lors de la mise à jour', 
          error: error.message 
        });
      }
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ message: 'ID de recette requis' });
        }
        
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        return res.status(200).json({ message: 'Recette supprimée', id });
      } catch (error) {
        logInfo('Erreur lors de la suppression d\'une recette', error);
        return res.status(500).json({ 
          message: 'Erreur serveur lors de la suppression', 
          error: error.message 
        });
      }
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    logInfo('Erreur API recettes générale', error);
    
    return res.status(500).json({ 
      message: 'Erreur serveur interne', 
      error: error.message
    });
  }
}
