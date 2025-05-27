import { v4 as uuidv4 } from 'uuid';
import { MongoClient } from 'mongodb';

// Configuration de MongoDB Atlas
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';
let cachedClient = null;
let cachedDb = null;

// Fonction pour journaliser les erreurs avec beaucoup plus de détails
function logError(message, error, req = null) {
  // Version détaillée des logs pour faciliter le débogage
  const errorLog = {
    timestamp: new Date().toISOString(),
    message,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack?.split('\n').slice(0, 5).join('\n') || 'No stack trace',
    path: req?.url || 'N/A',
    method: req?.method || 'N/A',
    query: req?.query || {},
    body: req?.body ? (
      typeof req.body === 'object' ? 
        // Masquer les champs potentiellement sensibles ou volumineux
        JSON.stringify({
          ...req.body,
          image: req.body.image ? (req.body.image.length > 100 ? `${req.body.image.substring(0, 100)}... (tronqué)` : req.body.image) : null
        }) : 
        'Non-object body'
    ) : 'No body',
    headers: req?.headers ? JSON.stringify({
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'origin': req.headers['origin'],
      'host': req.headers['host'],
    }) : 'No headers',
    serverInfo: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      netlify: !!process.env.NETLIFY,
      dbConfig: uri ? `MongoDB config: ${uri.split('@')[0].replace(/\/\/.*:/, '//[USERNAME]:')}[PASSWORD]@${uri.split('@')[1] || 'config-error'}` : 'No URI'
    }
  };
  
  // Log complet pour le débogage dans la console
  console.error(`========= ERROR DÉTAILLÉ [${errorLog.timestamp}] =========`);
  console.error(`Message: ${message}`);
  console.error(`Type d'erreur: ${error.name}`);
  console.error(`Message d'erreur: ${error.message}`);
  console.error(`Stack trace: \n${errorLog.stack}`);
  console.error(`Route API: ${req?.url || 'N/A'} (${req?.method || 'N/A'})`);
  if (req?.body && req.body.title) {
    console.error(`Recette concernée: "${req.body.title}"`);
  }
  console.error(`Headers: ${errorLog.headers}`);
  console.error(`Environnement: ${process.env.NODE_ENV || 'unknown'}, Netlify: ${!!process.env.NETLIFY}`);
  console.error('=====================================================');
  
  return errorLog;
}

// Fonction améliorée pour se connecter à MongoDB avec gestion robuste des erreurs
async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    // Vérifier que la connexion est toujours vivante
    try {
      await cachedClient.db().admin().ping();
      console.log("Connexion en cache valide");
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      console.log("Connexion en cache invalide, reconnexion...");
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!uri) {
    console.error("ERREUR: Variable MONGODB_URI non définie!");
    throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
  }

  // Afficher une version masquée de l'URI pour le débogage
  const maskedUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://*****:*****@');
  console.log(`Tentative de connexion à MongoDB: ${maskedUri}`);
  
  try {
    // Options de connexion adaptées pour Netlify Functions
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 5,
      minPoolSize: 1
    });
    
    // Connexion explicite
    await client.connect();
    console.log("Client MongoDB connecté!");
    
    const db = client.db(dbName);
    
    // Test de connexion avec timeout
    await Promise.race([
      db.command({ ping: 1 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Test ping timeout')), 5000))
    ]);
    
    console.log("✅ Connexion MongoDB établie et vérifiée");
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error(`❌ Erreur de connexion MongoDB: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack.split('\n')[0]}`);
    }
    
    // Réinitialiser le cache
    cachedClient = null;
    cachedDb = null;
    
    // Lancer une erreur plus descriptive
    throw new Error(`Échec de connexion MongoDB: ${error.message}`);
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
        
        // Log détaillé du corps de la requête pour le débogage
        console.log("Corps de la requête reçu:", {
          title: req.body?.title || 'Non fourni',
          description: req.body?.description ? `${req.body.description.substring(0, 50)}...` : 'Non fourni',
          imageProvided: !!req.body?.image,
          imageLength: req.body?.image ? req.body.image.length : 0
        });
        
        // Validation de base
        if (!req.body) {
          return res.status(400).json({ 
            message: 'Corps de requête vide ou invalide',
            error: 'ValidationError',
            details: 'Le corps de la requête est manquant ou vide' 
          });
        }

        // Valider la recette
        const validation = validateRecipe(req.body);
        if (!validation.valid) {
          return res.status(400).json({ 
            message: validation.message,
            error: 'ValidationError',
            details: `La recette ne contient pas tous les champs obligatoires: ${validation.message}`
          });
        }
        
        // Valider et normaliser l'URL de l'image
        const imageValidation = validateAndNormalizeImageUrl(req.body.image);
        console.log(`Validation d'image: ${imageValidation.message}`);
        
        // Créer la recette avec valeurs par défaut pour champs manquants mais non obligatoires
        const newRecipe = {
          id: uuidv4(),
          title: req.body.title,
          description: req.body.description,
          image: imageValidation.url, // URL normalisée ou par défaut
          imageStatus: imageValidation.message, // Stocke le statut de validation de l'image
          prepTime: req.body.prepTime || "N/A",
          cookTime: req.body.cookTime || "N/A",
          category: req.body.category || "Autre",
          author: req.body.author || "Anonyme",
          ingredients: Array.isArray(req.body.ingredients) ? req.body.ingredients : [],
          instructions: Array.isArray(req.body.instructions) ? req.body.instructions : [],
          createdAt: new Date().toISOString(),
          metadata: {
            source: req.headers?.origin || 'unknown',
            userAgent: req.headers?.['user-agent'] || 'unknown',
            imageOriginal: req.body.image || null // Conserver l'URL originale pour référence
          }
        };
        
        console.log("Insertion de la recette dans MongoDB avec image:", 
          newRecipe.image.substring(0, 50) + (newRecipe.image.length > 50 ? '...' : ''));
        
        const result = await collection.insertOne(newRecipe);
        
        if (result.acknowledged && result.insertedId) {
          console.log("✅ Recette ajoutée avec succès:", newRecipe.id);
          // Réponse complète avec informations sur l'image
          return res.status(201).json({
            ...newRecipe,
            _dbResult: {
              success: true,
              imageStatus: imageValidation.message
            }
          });
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
            details: 'Une clé unique existe déjà dans la base de données',
            reference: errorLog.timestamp 
          });
        }
        
        return res.status(500).json({ 
          message: 'Erreur serveur lors de l\'ajout de la recette', 
          error: 'ServerError',
          details: error.message,
          reference: errorLog.timestamp,
          // Ne pas exposer la stack trace en production
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

// Fonction améliorée pour gérer les URLs d'images
function validateAndNormalizeImageUrl(imageUrl) {
  if (!imageUrl) {
    return {
      valid: false,
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
      message: "URL d'image non fournie, image par défaut utilisée"
    };
  }
  
  try {
    // Vérifier si c'est une URL valide
    new URL(imageUrl);
    
    // Vérifier si c'est une URL d'image commune
    const isImageUrl = /\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(imageUrl) ||
      imageUrl.includes('unsplash.com') ||
      imageUrl.includes('imgur.com') ||
      imageUrl.includes('pexels.com') ||
      imageUrl.includes('cloudinary.com') ||
      imageUrl.includes('googleusercontent.com') ||
      imageUrl.includes('images.') ||
      imageUrl.includes('/image/');
    
    if (isImageUrl) {
      // Normaliser les URL Unsplash pour avoir une meilleure qualité
      if (imageUrl.includes('unsplash.com') && !imageUrl.includes('&q=')) {
        return {
          valid: true,
          url: `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}q=80&w=1080&fit=max`,
          message: "URL d'image Unsplash optimisée"
        };
      }
      
      return {
        valid: true,
        url: imageUrl,
        message: "URL d'image valide"
      };
    }
    
    console.warn(`URL fournie ne semble pas être une image: ${imageUrl}`);
    return {
      valid: false,
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
      message: "URL fournie ne semble pas être une image, image par défaut utilisée"
    };
  } catch (error) {
    console.warn(`URL d'image invalide: ${imageUrl}`, error.message);
    return {
      valid: false,
      url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
      message: "URL d'image invalide, image par défaut utilisée"
    };
  }
}
