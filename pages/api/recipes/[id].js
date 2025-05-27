import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Chemin vers notre "base de données" JSON
const dataFilePath = path.join(process.cwd(), 'data', 'recipes.json');

// Configuration MongoDB (même fonction que dans recipes.js)
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';
let cachedClient = null;
let cachedDb = null;

// Fonction pour journaliser les erreurs (même fonction que dans recipes.js)
function logError(message, error, req = null) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack: error.stack,
    name: error.name,
    path: req?.url || 'Non disponible',
    method: req?.method || 'Non disponible',
    query: req?.query || {},
    body: req?.body ? (typeof req.body === 'object' ? 'Objet JSON' : req.body) : null,
    environment: process.env.NODE_ENV || 'development',
  };
  
  console.error('==== ERREUR DÉTAILLÉE ====');
  console.error(JSON.stringify(errorLog, null, 2));
  console.error('========================');
  
  return errorLog;
}

// Fonction pour se connecter à MongoDB
async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error('Veuillez définir la variable d\'environnement MONGODB_URI');
  }
  
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

// Fonction utilitaire pour lire les données
function getRecipesData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }
    const jsonData = fs.readFileSync(dataFilePath);
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('Erreur lors de la lecture des recettes:', error);
    return [];
  }
}

// Fonction utilitaire pour écrire les données
function saveRecipesData(data) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur lors de l\'écriture des recettes:', error);
    throw error;
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Augmentation de la limite à 10MB
    },
  },
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'ID de recette manquant' });
  }

  try {
    // Connexion à la base de données
    const { db } = await connectToDatabase();
    const collection = db.collection('recipes');
    
    // GET - Récupérer une recette spécifique
    if (req.method === 'GET') {
      try {
        const recipe = await collection.findOne({ id: id });
        
        if (!recipe) {
          console.log(`Recette non trouvée: ID=${id}`);
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json(recipe);
      } catch (error) {
        logError(`Erreur lors de la récupération de la recette ${id}`, error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération', error: error.message });
      }
    }
    
    // PUT - Mettre à jour une recette
    else if (req.method === 'PUT') {
      try {
        const updateData = {
          ...req.body,
          updatedAt: new Date().toISOString()
        };
        delete updateData._id;
        
        const result = await collection.updateOne(
          { id: id },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          console.log(`Tentative de mise à jour d'une recette inexistante: ID=${id}`);
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json({ message: 'Recette mise à jour', id });
      } catch (error) {
        logError(`Erreur lors de la mise à jour de la recette ${id}`, error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour', error: error.message });
      }
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      try {
        const result = await collection.deleteOne({ id: id });
        
        if (result.deletedCount === 0) {
          console.log(`Tentative de suppression d'une recette inexistante: ID=${id}`);
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json({ message: 'Recette supprimée avec succès', id });
      } catch (error) {
        logError(`Erreur lors de la suppression de la recette ${id}`, error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression', error: error.message });
      }
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    const errorLog = logError(`Erreur API recette ID=${id} générale`, error, req);
    return res.status(500).json({ 
      message: 'Erreur serveur interne',
      error: error.message,
      reference: errorLog.timestamp
    });
  }
}
