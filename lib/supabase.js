import { createClient } from '@supabase/supabase-js';
import { logInfo, logError, logWarning, logDebug } from '../utils/logger';

// Création d'un client Supabase singleton
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logError('Les variables d\'environnement Supabase ne sont pas définies', new Error('Missing Supabase env vars'), {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    nodeEnv: process.env.NODE_ENV
  });
}

logInfo('Initialisation du client Supabase', {
  url: supabaseUrl ? 'Définie' : 'Manquante',
  key: supabaseAnonKey ? 'Définie' : 'Manquante'
});

// Créer un client Supabase et l'exporter
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Fonction pour créer la table recipes avec toutes les colonnes nécessaires
export async function createRecipesTableIfNotExists() {
  logInfo('Vérification/création de la table recipes');
  
  try {
    // Première tentative : vérifier si la table existe déjà
    const { data: tableCheck, error: checkError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      logInfo('Table recipes existe déjà, vérification des colonnes...');
      
      // Vérifier si toutes les colonnes nécessaires existent
      const { data: testData, error: columnError } = await supabase
        .from('recipes')
        .select('id, title, description, ingredients, instructions, prepTime, cookTime, servings, category, difficulty, author, image, photos, created_at, updated_at')
        .limit(1);
      
      if (columnError && columnError.code === 'PGRST204') {
        logWarning('Certaines colonnes manquent dans la table recipes', columnError);
        logInfo('Veuillez ajouter manuellement les colonnes manquantes dans Supabase');
        return false;
      }
      
      logInfo('Table recipes et colonnes vérifiées avec succès');
      return true;
    }
    
    // Si la table n'existe pas, afficher les instructions de création manuelle
    if (checkError && (checkError.code === 'PGRST106' || checkError.code === '42P01')) {
      logInfo('Table recipes non trouvée, création manuelle requise');
      
      console.log(`
=== CRÉATION MANUELLE REQUISE ===

Veuillez créer la table 'recipes' dans votre dashboard Supabase avec le SQL suivant :

CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  "prepTime" TEXT,
  "cookTime" TEXT,
  servings TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'Facile',
  author TEXT DEFAULT 'Anonyme',
  image TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des index pour les performances
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX idx_recipes_category ON recipes(category);

-- Activer RLS (Row Level Security)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre l'accès public
CREATE POLICY "Enable read access for all users" ON recipes FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON recipes FOR DELETE USING (true);

=== FIN DU SQL ===

Après avoir exécuté ce SQL dans votre dashboard Supabase, rafraîchissez cette page.
      `);
      
      return false;
    }
    
    // Autres erreurs
    logError('Erreur inattendue lors de la vérification de la table', checkError);
    return false;
    
  } catch (error) {
    logError('Erreur lors de la création/vérification de la table', error);
    return false;
  }
}

// Fonction utilitaire pour initialiser la table si nécessaire
export async function initializeRecipesTable() {
  logInfo('Début de l\'initialisation de la table recettes');
  
  try {
    // D'abord, s'assurer que la table existe
    const tableCreated = await createRecipesTableIfNotExists();
    
    if (!tableCreated) {
      logError('Impossible de créer la table, arrêt de l\'initialisation');
      return;
    }
    
    // Vérifier si la table contient déjà des recettes
    logDebug('Vérification de l\'existence des recettes...');
    const { data: existingRecipes, error: queryError } = await supabase
      .from('recipes')
      .select('id')
      .limit(1);
      
    if (queryError) {
      logError('Erreur lors de la vérification de la table recettes', queryError, {
        context: 'table_check',
        errorCode: queryError.code
      });
      return;
    }
    
    logDebug('Résultat de la vérification', {
      recipesFound: existingRecipes?.length || 0,
      hasExistingData: !!(existingRecipes && existingRecipes.length > 0)
    });
    
    // Si pas de recettes, ajouter quelques recettes d'exemple
    if (!existingRecipes || existingRecipes.length === 0) {
      logInfo('Aucune recette trouvée, initialisation avec des données par défaut');
      
      const initialRecipes = [
        {
          title: "Crêpes traditionnelles",
          description: "Recette facile de crêpes légères et délicieuses",
          ingredients: "- 250g de farine\n- 4 œufs\n- 500ml de lait\n- 2 cuillères à soupe de sucre\n- 1 pincée de sel\n- 50g de beurre fondu",
          instructions: "1. Mélanger la farine et le sel dans un saladier\n2. Creuser un puits au centre\n3. Ajouter les œufs et mélanger\n4. Incorporer progressivement le lait\n5. Ajouter le beurre fondu\n6. Laisser reposer 1h\n7. Cuire les crêpes dans une poêle chaude",
          image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?ixlib=rb-4.0.3",
          prepTime: "10 min",
          cookTime: "20 min",
          servings: "4 personnes",
          category: "Desserts",
          difficulty: "Facile",
          author: "Marie Dupont",
          created_at: new Date().toISOString()
        },
        {
          title: "Lasagnes végétariennes",
          description: "Version végétarienne riche en légumes et en saveurs",
          ingredients: "- 12 feuilles de lasagnes\n- 2 courgettes\n- 2 aubergines\n- 400g de tomates pelées\n- 250g de ricotta\n- 200g de mozzarella\n- 100g de parmesan\n- 2 gousses d'ail\n- Basilic frais\n- Huile d'olive",
          instructions: "1. Préchauffer le four à 180°C\n2. Couper les légumes en lamelles\n3. Les faire revenir à l'huile d'olive\n4. Préparer la sauce tomate à l'ail\n5. Alterner les couches de pâtes, légumes et fromages\n6. Cuire 45 minutes au four\n7. Laisser reposer 10 minutes avant de servir",
          image: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3",
          prepTime: "30 min",
          cookTime: "45 min",
          servings: "6 personnes",
          category: "Plats principaux",
          difficulty: "Moyen",
          author: "Thomas Martin",
          created_at: new Date().toISOString()
        }
      ];
      
      logDebug('Insertion des recettes initiales', {
        recipesCount: initialRecipes.length,
        recipeTitles: initialRecipes.map(r => r.title)
      });
      
      const { error: insertError } = await supabase
        .from('recipes')
        .insert(initialRecipes);
        
      if (insertError) {
        logError('Erreur lors de l\'initialisation des recettes', insertError, {
          context: 'initial_data_insert',
          recipesCount: initialRecipes.length
        });
      } else {
        logInfo('Table recettes initialisée avec succès', {
          recipesAdded: initialRecipes.length
        });
      }
    } else {
      logInfo('Table recettes déjà initialisée', {
        existingRecipesCount: existingRecipes.length
      });
    }
  } catch (error) {
    logError('Erreur critique lors de l\'initialisation de la table', error, {
      context: 'initialize_recipes_table'
    });
  }
}
