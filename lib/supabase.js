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
    // Créer la table avec toutes les colonnes nécessaires
    const { error: createError } = await supabase.rpc('create_recipes_table_if_not_exists');
    
    if (createError) {
      logWarning('Tentative de création via RPC échouée, utilisation de l\'API directe', createError);
      
      // Si la RPC n'existe pas, on utilise l'API directe
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS recipes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          ingredients TEXT NOT NULL,
          instructions TEXT NOT NULL,
          prepTime TEXT,
          cookTime TEXT,
          servings TEXT,
          category TEXT,
          difficulty TEXT DEFAULT 'Facile',
          author TEXT DEFAULT 'Anonyme',
          image TEXT,
          photos JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Créer un index sur la date de création
        CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
        
        -- Créer un index sur la catégorie
        CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
        
        -- Activer RLS (Row Level Security)
        ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
        
        -- Politique pour permettre la lecture à tous
        CREATE POLICY IF NOT EXISTS "Permettre lecture publique" ON recipes
          FOR SELECT USING (true);
        
        -- Politique pour permettre l'insertion à tous
        CREATE POLICY IF NOT EXISTS "Permettre insertion publique" ON recipes
          FOR INSERT WITH CHECK (true);
        
        -- Politique pour permettre la mise à jour à tous
        CREATE POLICY IF NOT EXISTS "Permettre mise à jour publique" ON recipes
          FOR UPDATE USING (true);
        
        -- Politique pour permettre la suppression à tous
        CREATE POLICY IF NOT EXISTS "Permettre suppression publique" ON recipes
          FOR DELETE USING (true);
      `;
      
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (sqlError) {
        logError('Impossible de créer la table via SQL', sqlError);
        logWarning('Veuillez créer manuellement la table recipes dans Supabase avec les colonnes suivantes:');
        console.log(`
          Table: recipes
          Colonnes:
          - id: UUID (clé primaire, auto-générée)
          - title: TEXT (obligatoire)
          - description: TEXT
          - ingredients: TEXT (obligatoire)
          - instructions: TEXT (obligatoire)
          - prepTime: TEXT
          - cookTime: TEXT
          - servings: TEXT
          - category: TEXT
          - difficulty: TEXT (défaut: 'Facile')
          - author: TEXT (défaut: 'Anonyme')
          - image: TEXT
          - photos: JSONB (défaut: [])
          - created_at: TIMESTAMP WITH TIME ZONE (défaut: NOW())
          - updated_at: TIMESTAMP WITH TIME ZONE (défaut: NOW())
        `);
        return false;
      }
    }
    
    logInfo('Table recipes créée ou vérifiée avec succès');
    return true;
    
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
