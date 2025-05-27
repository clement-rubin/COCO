// Ce fichier est une version optimisée pour Netlify Functions
// Il sera automatiquement utilisé par le plugin Next.js de Netlify

const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

// Version minimaliste pour déploiement
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';

let cachedClient = null;
let cachedDb = null;

async function connectToMongoDB() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  if (!uri) throw new Error('MONGODB_URI manquante');
  
  const client = new MongoClient(uri, {
    useUnifiedTopology: true,
    maxPoolSize: 1 // Réduire pour environnement serverless
  });
  
  await client.connect();
  const db = client.db(dbName);
  
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

// Données initiales simplifiées
const initialRecipes = [
  {
    id: "101",
    title: "Crêpes traditionnelles",
    description: "Recette facile de crêpes légères",
    image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?ixlib=rb-4.0.3",
    category: "Dessert",
    createdAt: new Date().toISOString()
  },
  {
    id: "102", 
    title: "Lasagnes végétariennes",
    description: "Version végétarienne savoureuse",
    image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3",
    category: "Plat principal",
    createdAt: new Date().toISOString()
  }
];

// Fonction principale optimisée pour Netlify
exports.handler = async (event, context) => {
  // Configuration CORS simplifiée
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Traitement preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Connexion à la base
    const { db } = await connectToMongoDB();
    const collection = db.collection('recipes');

    // Initialisation si nécessaire (version simplifiée)
    const count = await collection.countDocuments();
    if (count === 0) await collection.insertMany(initialRecipes);

    // GET - Récupération
    if (event.httpMethod === 'GET') {
      const recipes = await collection.find({}).toArray();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(recipes)
      };
    }
    
    // POST - Ajout
    if (event.httpMethod === 'POST') {
      const data = JSON.parse(event.body);
      const newRecipe = {
        id: uuidv4(),
        title: data.title || 'Sans titre',
        description: data.description || '',
        image: data.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3",
        category: data.category || 'Autre',
        author: data.author || 'Anonyme',
        createdAt: new Date().toISOString()
      };
      
      await collection.insertOne(newRecipe);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newRecipe)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Méthode non autorisée' })
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Erreur serveur', 
        error: error.message 
      })
    };
  }
}
