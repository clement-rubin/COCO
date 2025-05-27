import { supabase } from '../../../lib/supabase';

// Fonction pour journaliser les erreurs
function logError(message, error) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    name: error.name,
    details: error.message,
  };
  
  console.error('==== ERREUR DÉTAILLÉE ====');
  console.error(JSON.stringify(errorLog, null, 2));
  console.error('========================');
  
  return errorLog;
}

export default async function handler(req, res) {
  // Configurer les en-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Gestion des requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'ID de recette manquant' });
  }

  try {
    // GET - Récupérer une recette spécifique
    if (req.method === 'GET') {
      try {
        const { data: recipe, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (!recipe) {
          console.log(`Recette non trouvée: ID=${id}`);
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json(recipe);
      } catch (error) {
        logError(`Erreur lors de la récupération de la recette ${id}`, error);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération', error: error.message });
      }
    }
    
    // PUT - Mettre à jour une recette
    else if (req.method === 'PUT') {
      try {
        const updateData = {
          ...req.body,
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('recipes')
          .update(updateData)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        
        if (data.length === 0) {
          console.log(`Tentative de mise à jour d'une recette inexistante: ID=${id}`);
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json({ message: 'Recette mise à jour', id });
      } catch (error) {
        logError(`Erreur lors de la mise à jour de la recette ${id}`, error);
        return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour', error: error.message });
      }
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      try {
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        return res.status(200).json({ message: 'Recette supprimée avec succès', id });
      } catch (error) {
        logError(`Erreur lors de la suppression de la recette ${id}`, error);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression', error: error.message });
      }
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    const errorLog = logError(`Erreur API recette ID=${id} générale`, error);
    return res.status(500).json({ 
      message: 'Erreur serveur interne',
      error: error.message,
      reference: errorLog.timestamp
    });
  }
}
