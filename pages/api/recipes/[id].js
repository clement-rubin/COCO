import fs from 'fs';
import path from 'path';

// Chemin vers notre "base de données" JSON
const dataFilePath = path.join(process.cwd(), 'data', 'recipes.json');

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
    const recipes = getRecipesData();
    
    // GET - Récupérer une recette spécifique
    if (req.method === 'GET') {
      const recipe = recipes.find(recipe => recipe.id === id);
      
      if (!recipe) {
        return res.status(404).json({ message: 'Recette non trouvée' });
      }
      
      return res.status(200).json(recipe);
    }
    
    // PUT - Mettre à jour une recette
    else if (req.method === 'PUT') {
      const index = recipes.findIndex(recipe => recipe.id === id);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Recette non trouvée' });
      }
      
      const updatedRecipe = {
        ...recipes[index],
        ...req.body,
        id: id, // Garantir que l'ID reste le même
        updatedAt: new Date().toISOString()
      };
      
      recipes[index] = updatedRecipe;
      saveRecipesData(recipes);
      
      return res.status(200).json(updatedRecipe);
    }
    
    // DELETE - Supprimer une recette
    else if (req.method === 'DELETE') {
      const filteredRecipes = recipes.filter(recipe => recipe.id !== id);
      
      if (filteredRecipes.length === recipes.length) {
        return res.status(404).json({ message: 'Recette non trouvée' });
      }
      
      saveRecipesData(filteredRecipes);
      
      return res.status(200).json({ message: 'Recette supprimée avec succès' });
    }
    
    // Méthode non prise en charge
    else {
      return res.status(405).json({ message: 'Méthode non autorisée' });
    }
  } catch (error) {
    console.error('Erreur API recette par ID:', error);
    return res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  }
}
