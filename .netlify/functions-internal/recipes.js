// Ce fichier est une version optimisée pour Netlify Functions
// Il sera automatiquement utilisé par le plugin Next.js de Netlify

const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

// Version optimisée pour déploiement Netlify
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';

// Variables pour le cache de connexion
let cachedClient = null;
let cachedDb = null;

// Fonction de journalisation améliorée
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = type === "error" ? "❌ ERREUR" : type === "warning" ? "⚠️ ATTENTION" : "ℹ️ INFO";
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

async function connectToMongoDB() {
  // Vérifier la connexion en cache
  if (cachedClient && cachedDb) {
    try {
      // Tester rapidement la connexion
      await cachedClient.db().admin().ping();
      log("Utilisation de la connexion en cache");
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      log(`Connexion en cache invalide: ${e.message}`, "warning");
      // Réinitialiser les variables de cache
      cachedClient = null;
      cachedDb = null;
    }
  }

  // Vérifier que la variable d'environnement existe et a un format correct
  if (!uri) {
    log("MONGODB_URI non définie dans les variables d'environnement!", "error");
    throw new Error('Configuration MongoDB manquante - MONGODB_URI non définie');
  }
  
  // Vérification du format de l'URI pour aider au diagnostic
  if (!uri.includes('@') || !uri.includes('mongodb')) {
    log("Format de MONGODB_URI suspect - vérifiez la syntaxe", "error");
    log(`Format attendu: mongodb+srv://<username>:<password>@<cluster>/<options>`, "warning");
  }
  
  try {
    // Extraction du nom d'utilisateur pour le diagnostic (sans exposer le mot de passe)
    const uriParts = uri.split('@');
    const authPart = uriParts[0].split('//')[1];
    const username = authPart ? authPart.split(':')[0] : 'non-détecté';
    log(`Tentative de connexion à MongoDB (${dbName}) avec l'utilisateur '${username}'...`);
    
    // Options de connexion avec gestion d'authentification améliorée
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 3,
      authSource: 'admin', // Spécifier explicitement la base d'authentification
      retryWrites: true,
      w: 'majority'
    });
    
    // Connexion explicite avec un meilleur diagnostic
    log("Tentative de connexion...");
    await client.connect();
    log("Connexion TCP établie, vérification de l'authentification...");
    
    const db = client.db(dbName);
    
    // Test plus détaillé de la connexion
    await Promise.race([
      db.command({ ping: 1 }).then(() => {
        log("Authentification réussie et commande ping exécutée");
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 5000))
    ]);
    
    log("✅ Connexion MongoDB vérifiée avec succès - Authentification OK");
    
    // Mettre en cache pour les prochaines requêtes
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    log(`❌ Échec de connexion à MongoDB: ${error.message}`, "error");
    
    // Diagnostic amélioré pour les erreurs d'authentification
    if (error.message.includes('auth') || error.code === 18 || error.code === 8000) {
      log("PROBLÈME D'AUTHENTIFICATION DÉTECTÉ", "error");
      log("Vérifiez les points suivants:", "warning");
      log("1. Le nom d'utilisateur et mot de passe dans MONGODB_URI sont-ils corrects?", "warning");
      log("2. L'utilisateur a-t-il les permissions nécessaires?", "warning");
      log("3. L'utilisateur est-il associé à la bonne base de données?", "warning");
      log("4. Votre IP est-elle autorisée dans les règles de sécurité MongoDB Atlas?", "warning");
      
      // Instructions pour résoudre le problème
      log("\nÉTAPES POUR RÉSOUDRE:", "info");
      log("1. Connectez-vous à votre compte MongoDB Atlas", "info");
      log("2. Vérifiez les paramètres Database Access pour confirmer les informations d'utilisateur", "info");
      log("3. Vérifiez Network Access pour confirmer que votre IP est autorisée", "info");
      log("4. Si nécessaire, créez un nouvel utilisateur avec le rôle 'readWriteAnyDatabase'", "info");
    }
    
    // Informations de diagnostic supplémentaires
    if (error.name) log(`Type d'erreur: ${error.name}`, "error");
    if (error.code) log(`Code d'erreur: ${error.code}`, "error");
    if (error.stack) log(`Premier niveau de stack: ${error.stack.split('\n')[1]}`, "error");
    
    throw new Error(`Impossible de se connecter à MongoDB (erreur d'authentification): ${error.message}`);
  }
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
    // Connexion à MongoDB avec timeout explicite
    log(`Traitement de requête ${event.httpMethod}`);
    
    let dbConnection;
    try {
      dbConnection = await Promise.race([
        connectToMongoDB(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de connexion MongoDB')), 20000)
        )
      ]);
    } catch (dbError) {
      log(`Erreur de connexion à la base de données: ${dbError.message}`, "error");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: "Erreur de connexion à la base de données", 
          error: dbError.message,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    const { db } = dbConnection;
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
    log(`Erreur générale: ${error.message}`, "error");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Erreur serveur', 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}
