import { supabase } from '../../../lib/supabase';
import { logError, logInfo } from '../../../utils/logger';
import { createError, handleApiError } from '../../../utils/errorHandler';

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
    return handleApiError(
      createError('ID de recette manquant', 400), 
      res
    );
  }

  try {
    logInfo(`Traitement de requête ${req.method} pour recette ${id}`, {
      url: req.url,
      method: req.method
    });
    
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
          return handleApiError(
            createError(`Recette non trouvée: ID=${id}`, 404),
            res
          );
        }
        
        return res.status(200).json(recipe);
      } catch (error) {
        const errorLog = logError(`Erreur lors de la récupération de la recette ${id}`, error, req);
        return handleApiError({
          ...error,
          message: 'Erreur serveur lors de la récupération',
          id: errorLog.id,
          timestamp: errorLog.timestamp
        }, res);
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
          return handleApiError(
            createError(`Tentative de mise à jour d'une recette inexistante: ID=${id}`, 404),
            res
          );
        }
        
        logInfo(`Recette ${id} mise à jour avec succès`);
        return res.status(200).json({ message: 'Recette mise à jour', id, data });
      } catch (error) {
        const errorLog = logError(`Erreur lors de la mise à jour de la recette ${id}`, error, req);
        return handleApiError({
          ...error,
          message: 'Erreur serveur lors de la mise à jour',
          id: errorLog.id,
          timestamp: errorLog.timestamp,
          details: {
            recipe_id: id,
            request_body: req.body
          }
        }, res);
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
        
        logInfo(`Recette ${id} supprimée avec succès`);
        return res.status(200).json({ message: 'Recette supprimée avec succès', id });
      } catch (error) {
        const errorLog = logError(`Erreur lors de la suppression de la recette ${id}`, error, req);
        return handleApiError({
          ...error,
          message: 'Erreur serveur lors de la suppression',
          id: errorLog.id,
          timestamp: errorLog.timestamp
        }, res);
      }
    }
    
    // Méthode non prise en charge
    else {
      return handleApiError(createError('Méthode non autorisée', 405), res);
    }
  } catch (error) {
    const errorLog = logError(`Erreur API recette ID=${id} générale`, error, req);
    return handleApiError({
      ...error,
      message: 'Erreur serveur interne',
      id: errorLog.id,
      timestamp: errorLog.timestamp
    }, res);
  }
}
