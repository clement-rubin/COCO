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

// Fonction pour convertir un fichier en données binaires
export async function fileToBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      resolve(Array.from(uint8Array));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Fonction pour créer une URL d'aperçu depuis des données binaires
export function bytesToImageUrl(bytes) {
  if (!bytes || !Array.isArray(bytes)) return null;
  
  const uint8Array = new Uint8Array(bytes);
  const blob = new Blob([uint8Array], { type: 'image/jpeg' });
  return URL.createObjectURL(blob);
}

// Fonction pour compresser une image
async function compressImageFile(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculer les nouvelles dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convertir en blob
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
}

// Fonction de validation des fichiers avant upload
function validateImageFile(file, fileName) {
  const validationResults = {
    isValid: true,
    errors: [],
    warnings: [],
    fileInfo: {
      name: fileName,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }
  };

  logDebug('Validation du fichier image', validationResults.fileInfo);

  // Vérifier la taille (max 6MB)
  const maxSize = 6 * 1024 * 1024; // 6MB
  if (file.size > maxSize) {
    validationResults.isValid = false;
    validationResults.errors.push(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 6MB)`);
  }

  // Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (file.type && !allowedTypes.includes(file.type)) {
    validationResults.warnings.push(`Type MIME non standard: ${file.type}`);
  }

  // Vérifier l'extension
  const extension = fileName.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowedExtensions.includes(extension)) {
    validationResults.isValid = false;
    validationResults.errors.push(`Extension non supportée: ${extension}`);
  }

  // Vérifier que le fichier n'est pas vide
  if (file.size === 0) {
    validationResults.isValid = false;
    validationResults.errors.push('Fichier vide');
  }

  logInfo('Résultat de validation', {
    fileName,
    isValid: validationResults.isValid,
    errorsCount: validationResults.errors.length,
    warningsCount: validationResults.warnings.length,
    errors: validationResults.errors,
    warnings: validationResults.warnings
  });

  return validationResults;
}

// Fonction pour uploader une image comme données binaires
export async function uploadImageAsBytes(file) {
  const uploadId = `bytes_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logInfo(`[${uploadId}] Début conversion image en bytes: ${file.name}`, {
      uploadId,
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name
    });

    // Validation du fichier
    const validation = validateImageFile(file, file.name);
    if (!validation.isValid) {
      const errorMsg = `Validation échouée: ${validation.errors.join(', ')}`;
      logError(`[${uploadId}] ${errorMsg}`, new Error(errorMsg), {
        uploadId,
        fileName: file.name,
        validationErrors: validation.errors
      });
      throw new Error(errorMsg);
    }

    // Compression de l'image si nécessaire
    let processedFile = file;
    if (file.size > 1024 * 1024) { // Si > 1MB, compresser
      logDebug(`[${uploadId}] Compression de l'image (taille: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      processedFile = await compressImageFile(file, 800, 0.8);
      logDebug(`[${uploadId}] Image compressée (nouvelle taille: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Conversion en bytes
    const bytes = await fileToBytes(processedFile);
    
    logInfo(`[${uploadId}] Image convertie avec succès`, {
      uploadId,
      originalSize: file.size,
      processedSize: processedFile.size,
      bytesLength: bytes.length,
      fileName: file.name
    });

    return {
      bytes,
      originalName: file.name,
      processedSize: processedFile.size,
      mimeType: processedFile.type || 'image/jpeg'
    };

  } catch (error) {
    logError(`[${uploadId}] Erreur lors de la conversion en bytes`, error, {
      uploadId,
      fileName: file.name,
      fileSize: file?.size,
      errorMessage: error.message
    });
    throw error;
  }
}

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Permettre lecture publique" ON recipes
  FOR SELECT USING (true);

CREATE POLICY "Permettre insertion publique" ON recipes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permettre mise à jour publique" ON recipes
  FOR UPDATE USING (true);

CREATE POLICY "Permettre suppression publique" ON recipes
  FOR DELETE USING (true);

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
          author: "Marie Dupont"
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
          author: "Thomas Martin"
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
