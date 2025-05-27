import { v4 as uuidv4 } from 'uuid';
import { MongoClient } from 'mongodb';

// Configuration de MongoDB Atlas
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';
let cachedClient = null;
let cachedDb = null;

// Fonction pour journaliser les erreurs
function logError(message, error, req = null) {
  // Construction d'un objet d'erreur détaillé
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    stack: error.stack,
    name: error.name,
    path: req?.url || 'Non disponible',
    method: req?.method || 'Non disponible',
    query: req?.query || {},
    body: req?.body ? (typeof req.body === 'object' ? 'Objet trop volumineux pour log' : req.body) : null,
    environment: process.env.NODE_ENV || 'development',
  };
  
  // Afficher l'erreur détaillée pour Netlify
  console.error('==== ERREUR DÉTAILLÉE ====');
  console.error(JSON.stringify(errorLog, null, 2));
  console.error('========================');
  
  // Ici vous pourriez également envoyer l'erreur à un service de suivi d'erreurs
  return errorLog;
}

// Fonction pour se connecter à MongoDB avec gestion avancée des erreurs de connexion
async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
  }
  
  try {
    // Options de connexion optimisées pour environnement serverless
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 5000, // temps d'attente plus court pour environnement serverless
      socketTimeoutMS: 30000, // délai d'expiration pour les opérations
      serverSelectionTimeoutMS: 5000, // délai pour sélection de serveur
      maxPoolSize: 10, // limite de connexions simultanées
    };
    
    const client = new MongoClient(uri, options);
    await client.connect();
    const db = client.db(dbName);
    
    // Test de connexion
    await db.command({ ping: 1 });
    console.log("✅ Connecté avec succès à MongoDB Atlas");
    
    cachedClient = client;
    cachedDb = db;
    
    // Créer un index sur le champ id pour améliorer les performances
    try {
      await db.collection('recipes').createIndex({ id: 1 }, { unique: true });
    } catch (indexError) {
      console.warn('Index déjà existant ou erreur lors de la création:', indexError.message);
    }
    
    return { client, db };
  } catch (error) {
    console.error("❌ Erreur de connexion à MongoDB:", error);
    
    // Réinitialiser le cache en cas d'erreur pour forcer une reconnexion
    cachedClient = null;
    cachedDb = null;
    
    // Retransmettre l'erreur pour la gestion appropriée
    throw new Error(`Impossible de se connecter à MongoDB: ${error.message}`);
  }
}

// Améliorer l'initialisation de la base de données avec gestion d'erreurs
async function initializeDatabase(collection) {
  try {
    const count = await collection.countDocuments();
    if (count === 0) {
      console.log('Initialisation de la base de données avec des recettes par défaut');
      await collection.insertMany(initialRecipes);
      console.log(`✅ ${initialRecipes.length} recettes initiales insérées avec succès`);
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'initialisation de la base de données:", error.message);
    // Ne pas faire échouer l'API si l'initialisation échoue
  }
}

// Fonction de validation pour les nouvelles recettes
function validateRecipe(recipe) {
  const requiredFields = ['title', 'description'];
  const missingFields = requiredFields.filter(field => !recipe[field]);
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Champs obligatoires manquants: ${missingFields.join(', ')}`
    };
  }
  
  return { valid: true };
}

// Fonction pour initialiser la base de données avec des données si elle est vide
const initialRecipes = [
  {
    id: "101",
    title: "Crêpes traditionnelles",
    description: "Recette facile de crêpes légères et délicieuses",
    image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?ixlib=rb-4.0.3",
    prepTime: "10 min",
    cookTime: "20 min",
    category: "Dessert",
    author: "Marie Dupont",
    createdAt: new Date().toISOString()
  },
  {
    id: "102", 
    title: "Lasagnes végétariennes",
    description: "Version végétarienne riche en légumes et en saveurs",
    image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3",
    prepTime: "30 min",
    cookTime: "45 min",
    category: "Plat principal",
    author: "Thomas Martin",
    createdAt: new Date().toISOString()
  }
];

export default async function handler(req, res) {
  // Gestion CORS basique
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 heures de cache pour preflight

  // Méthode OPTIONS pour le preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connexion à la base de données avec un délai d'attente raisonnable
    console.log("Tentative de connexion à MongoDB...");
    const { db } = await Promise.race([
      connectToDatabase(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Délai de connexion à MongoDB dépassé')), 10000)
      )
    ]);
    
    const collection = db.collection('recipes');
    
    // Initialiser la base de données si nécessaire
    await initializeDatabase(collection);
    
    // GET - Récupérer toutes les recettes
    if (req.method === 'GET') {
      try {
        const recipes = await collection.find({}).toArray();
        return res.status(200).json(recipes);
      } catch (error) {
        logError('Erreur lors de la récupération des recettes', error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la récupération des recettes', error: error.message });
      }
    }
    
    // POST - Ajouter une nouvelle recette avec validation
    else if (req.method === 'POST') {
      try {
        console.log("Tentative d'ajout d'une nouvelle recette");
        
        // Validation de base
        if (!req.body) {
          return res.status(400).json({ message: 'Corps de requête vide ou invalide' });
        }

        // Valider la recette
        const validation = validateRecipe(req.body);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
        
        // Créer la recette avec valeurs par défaut pour champs manquants mais non obligatoires
        const newRecipe = {
          id: uuidv4(),
          title: req.body.title,
          description: req.body.description,
          image: req.body.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
          prepTime: req.body.prepTime || "N/A",
          cookTime: req.body.cookTime || "N/A",
          category: req.body.category || "Autre",
          author: req.body.author || "Anonyme",
          createdAt: new Date().toISOString()
        };
        
        console.log("Insertion de la recette dans MongoDB");
        const result = await collection.insertOne(newRecipe);
        
        if (result.acknowledged && result.insertedId) {
          console.log("✅ Recette ajoutée avec succès:", newRecipe.id);
          return res.status(201).json(newRecipe);
        } else {
          throw new Error('Échec de l\'insertion: opération non confirmée par MongoDB');
        }
      } catch (error) {
        const errorLog = logError('Erreur lors de l\'ajout d\'une recette', error, req);
        console.error("❌ Échec de l'ajout de recette:", error.message);
        
        // Vérifier les erreurs de duplication (code 11000)
        if (error.code === 11000) {
          return res.status(409).json({ 
            message: 'Une recette avec cet identifiant existe déjà',
            error: 'DuplicateKey', 
            reference: errorLog.timestamp 
          });
        }
        
        return res.status(500).json({ 
          message: 'Erreur serveur lors de l\'ajout de la recette', 
          error: error.message,
          reference: errorLog.timestamp 
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
        
        const updateData = { ...req.body, updatedAt: new Date().toISOString() };
        delete updateData._id; // Retirer le _id pour éviter les erreurs de modification
        
        const result = await collection.updateOne(
          { id: id }, 
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json({ message: 'Recette mise à jour', id });
      } catch (error) {
        logError('Erreur lors de la mise à jour d\'une recette', error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la mise à jour', error: error.message });
      }
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      try {
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ message: 'ID de recette requis' });
        }
        
        const result = await collection.deleteOne({ id: id });
        
        if (result.deletedCount === 0) {
          return res.status(404).json({ message: 'Recette non trouvée' });
        }
        
        return res.status(200).json({ message: 'Recette supprimée', id });
      } catch (error) {
        logError('Erreur lors de la suppression d\'une recette', error, req);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression', error: error.message });
      }
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    const errorLog = logError('Erreur API recettes générale', error, req);
    console.error("❌ Erreur API générale:", error.message);
    
    // Message adapté en fonction de l'erreur
    let message = 'Erreur serveur interne';
    if (error.message.includes('MongoDB')) {
      message = 'Erreur de connexion à la base de données';
    }
    
    return res.status(500).json({ 
      message, 
      error: error.message, 
      reference: errorLog.timestamp,
      netlifyFunction: true // Marquer comme provenant d'une fonction Netlify
    });
  }
}
