// API Routes de Next.js - point de terminaison pour les recettes
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Chemin vers notre "base de données" JSON
const dataFilePath = path.join(process.cwd(), 'data', 'recipes.json');

// Fonction utilitaire pour lire les données
function getRecipesData() {
  try {
    // Vérifie si le fichier existe
    if (!fs.existsSync(dataFilePath)) {
      // Créer le répertoire data s'il n'existe pas
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Données d'exemple pour les recettes initiales
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
      
      // Créer un fichier avec les données initiales
      fs.writeFileSync(dataFilePath, JSON.stringify(initialRecipes, null, 2));
      return initialRecipes;
    }
    
    // Lire le fichier de données
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
    // GET - Récupérer toutes les recettes
    if (req.method === 'GET') {
      const recipes = getRecipesData();
      return res.status(200).json(recipes);
    }
    
    // POST - Ajouter une nouvelle recette
    else if (req.method === 'POST') {
      const recipes = getRecipesData();
      const newRecipe = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
      };
      
      recipes.push(newRecipe);
      saveRecipesData(recipes);
      
      return res.status(201).json(newRecipe);
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
