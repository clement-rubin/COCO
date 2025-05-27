import { v4 as uuidv4 } from 'uuid';
import { MongoClient } from 'mongodb';

// Configuration de MongoDB Atlas
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'coco_recipes';
let cachedClient = null;
let cachedDb = null;

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
  
  // Créer un index sur le champ id pour améliorer les performances
  try {
    await db.collection('recipes').createIndex({ id: 1 }, { unique: true });
  } catch (error) {
    console.warn('Index déjà existant ou erreur lors de la création:', error);
  }
  
  return { client, db };
}

// Fonction pour initialiser la base de données avec des données si elle est vide
async function initializeDatabase(collection) {
  const count = await collection.countDocuments();
  if (count === 0) {
    console.log('Initialisation de la base de données avec des recettes par défaut');
    await collection.insertMany(initialRecipes);
  }
}

// Données initiales pour les recettes (utilisées seulement si la base de données est vide)
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Méthode OPTIONS pour le preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connexion à la base de données
    const { db } = await connectToDatabase();
    const collection = db.collection('recipes');
    
    // Initialiser la base de données si nécessaire
    await initializeDatabase(collection);
    
    // GET - Récupérer toutes les recettes
    if (req.method === 'GET') {
      const recipes = await collection.find({}).toArray();
      return res.status(200).json(recipes);
    }
    
    // POST - Ajouter une nouvelle recette
    else if (req.method === 'POST') {
      const newRecipe = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      // Ajouter à MongoDB
      await collection.insertOne(newRecipe);
      
      return res.status(201).json(newRecipe);
    }
    
    // PUT - Mettre à jour une recette existante
    else if (req.method === 'PUT') {
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
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'ID de recette requis' });
      }
      
      const result = await collection.deleteOne({ id: id });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Recette non trouvée' });
      }
      
      return res.status(200).json({ message: 'Recette supprimée', id });
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API recettes:', error);
    return res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  }
}
