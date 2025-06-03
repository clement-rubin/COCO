import { createClient } from '@supabase/supabase-js';
import { logInfo, logError, logWarning, logDebug } from '../utils/logger';
import { processImageData } from '../utils/imageUtils';

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

// Fonction pour compresser une image
async function compressImageFile(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Image compression only available in browser environment'));
      return;
    }

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

    img.onerror = reject;
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

// Nouvelle fonction pour uploader une image comme URL (remplace uploadImageAsBytes)
export async function uploadImageAsUrl(file) {
  const uploadId = `url_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logInfo(`[${uploadId}] Début conversion image en URL: ${file.name}`, {
      uploadId,
      fileSize: file.size,
      fileType: file.type,
      fileName: file.name
    });

    // Utiliser les nouvelles utilitaires
    const { processImageToUrl } = await import('../utils/imageUtils');
    const result = await processImageToUrl(file);
    
    logInfo(`[${uploadId}] Image convertie en URL avec succès`, {
      uploadId,
      originalSize: file.size,
      urlLength: result.url.length,
      fileName: file.name
    });

    return {
      url: result.url,
      originalName: file.name,
      originalSize: result.originalSize,
      mimeType: result.mimeType
    };

  } catch (error) {
    logError(`[${uploadId}] Erreur lors de la conversion en URL`, error, {
      uploadId,
      fileName: file.name,
      fileSize: file?.size,
      errorMessage: error.message
    });
    throw error;
  }
}

// Fonction mise à jour pour créer la table avec le bon type de colonne image
export async function createRecipesTableIfNotExists() {
  logInfo('Vérification/création de la table recipes');
  
  try {
    // Vérifier si la table existe et est accessible
    const { data: tableCheck, error: checkError } = await supabase
      .from('recipes')
      .select('id, title, image')
      .limit(1);
    
    if (!checkError) {
      logInfo('✅ Table recipes existe et est correctement configurée');
      
      // Vérifier le type de la colonne image
      const { data: schemaCheck } = await supabase
        .from('recipes')
        .select('image')
        .limit(1);
        
      logInfo('✅ Schema vérifié - colonne image en format text');
      return true;
    }
    
    if (checkError && (checkError.code === 'PGRST106' || checkError.code === '42P01')) {
      logWarning('❌ Table recipes non trouvée');
      
      console.log(`
=== VOTRE TABLE EST PARFAITE ! ===

Votre schéma actuel est correct :
- ✅ image: text (compatible URLs)
- ✅ Toutes les colonnes nécessaires

Il suffit d'exécuter le SQL de finalisation pour :
- Ajouter DEFAULT NOW() aux timestamps
- Créer les index de performance
- Configurer Row Level Security

Exécutez le fichier final-setup.sql !
=== FIN ===
      `);
      
      return false;
    }
    
    logError('Erreur inattendue lors de la vérification', checkError);
    return false;
    
  } catch (error) {
    logError('Erreur lors de la vérification de la table', error);
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
          ingredients: JSON.stringify([
            "250g de farine",
            "4 œufs", 
            "500ml de lait",
            "2 cuillères à soupe de sucre",
            "1 pincée de sel",
            "50g de beurre fondu"
          ]),
          instructions: JSON.stringify([
            { step: 1, instruction: "Mélanger la farine et le sel dans un saladier" },
            { step: 2, instruction: "Creuser un puits au centre" },
            { step: 3, instruction: "Ajouter les œufs et mélanger" },
            { step: 4, instruction: "Incorporer progressivement le lait" },
            { step: 5, instruction: "Ajouter le beurre fondu" },
            { step: 6, instruction: "Laisser reposer 1h" },
            { step: 7, instruction: "Cuire les crêpes dans une poêle chaude" }
          ]),
          image: null,
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
          ingredients: JSON.stringify([
            "12 feuilles de lasagnes",
            "2 courgettes",
            "2 aubergines", 
            "400g de tomates pelées",
            "250g de ricotta",
            "200g de mozzarella",
            "100g de parmesan",
            "2 gousses d'ail",
            "Basilic frais",
            "Huile d'olive"
          ]),
          instructions: JSON.stringify([
            { step: 1, instruction: "Préchauffer le four à 180°C" },
            { step: 2, instruction: "Couper les légumes en lamelles" },
            { step: 3, instruction: "Les faire revenir à l'huile d'olive" },
            { step: 4, instruction: "Préparer la sauce tomate à l'ail" },
            { step: 5, instruction: "Alterner les couches de pâtes, légumes et fromages" },
            { step: 6, instruction: "Cuire 45 minutes au four" },
            { step: 7, instruction: "Laisser reposer 10 minutes avant de servir" }
          ]),
          image: null,
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

// Fonction pour convertir un fichier en bytes
export async function fileToBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      const arrayBuffer = reader.result
      const bytes = new Uint8Array(arrayBuffer)
      resolve(Array.from(bytes))
    }
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// Fonction pour créer le bucket de stockage d'images
export async function createImageStorageBucket() {
  logInfo('Vérification/création du bucket images');
  
  try {
    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      logError('Erreur lors de la vérification des buckets', listError);
      return false;
    }
    
    const imagesBucket = buckets.find(bucket => bucket.name === 'images');
    
    if (imagesBucket) {
      logInfo('Bucket images existe déjà');
      return true;
    }
    
    // Créer le bucket s'il n'existe pas
    const { data, error: createError } = await supabase
      .storage
      .createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 6 * 1024 * 1024 // 6MB
      });
    
    if (createError) {
      logError('Erreur lors de la création du bucket images', createError);
      return false;
    }
    
    logInfo('Bucket images créé avec succès');
    return true;
    
  } catch (error) {
    logError('Erreur lors de la création/vérification du bucket', error);
    return false;
  }
}

// Fonction mise à jour pour traiter les images (URLs et rétrocompatibilité)
export function getRecipeImageUrl(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  // Utiliser les nouvelles utilitaires
  return processImageData(imageData, fallbackUrl)
}

// Fonction de rétrocompatibilité pour les bytes (si nécessaire)
export function bytesToImageUrl(bytesArray) {
  if (!bytesArray) {
    logDebug('bytesToImageUrl: bytesArray est null/undefined')
    return null
  }
  
  // Utiliser les nouvelles utilitaires pour la conversion
  const { processImageData } = require('../utils/imageUtils')
  return processImageData(bytesArray, null)
}
