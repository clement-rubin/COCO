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

// Fonction pour detecter le type MIME à partir du nom de fichier
function getContentTypeFromFileName(fileName) {
  const extension = fileName.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif'
  };
  
  logDebug('Détection du type MIME', {
    fileName,
    extension,
    detectedType: mimeTypes[extension] || 'image/jpeg'
  });
  
  return mimeTypes[extension] || 'image/jpeg';
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

// Fonction pour uploader une image vers Supabase Storage
export async function uploadImage(file, fileName) {
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logInfo(`[${uploadId}] Début upload d'image: ${fileName}`, {
      uploadId,
      fileSize: file.size,
      fileType: file.type,
      fileName: fileName,
      timestamp: new Date().toISOString()
    });

    // Validation préalable du fichier
    const validation = validateImageFile(file, fileName);
    if (!validation.isValid) {
      const errorMsg = `Validation échouée: ${validation.errors.join(', ')}`;
      logError(`[${uploadId}] ${errorMsg}`, new Error(errorMsg), {
        uploadId,
        fileName,
        validationErrors: validation.errors
      });
      throw new Error(errorMsg);
    }

    // Vérifier que le bucket existe avant l'upload
    logDebug(`[${uploadId}] Vérification du bucket de stockage`);
    const bucketExists = await createImageStorageBucket();
    if (!bucketExists) {
      const errorMsg = 'Le bucket de stockage n\'est pas disponible. Veuillez configurer Supabase Storage.';
      logError(`[${uploadId}] ${errorMsg}`, new Error(errorMsg), { uploadId });
      throw new Error(errorMsg);
    }

    // Détecter le content type approprié
    const contentType = file.type || getContentTypeFromFileName(fileName);
    
    logDebug(`[${uploadId}] Configuration d'upload`, {
      uploadId,
      fileName,
      contentType,
      fileSize: file.size,
      bucketName: 'recipe-images',
      hasFileType: !!file.type,
      detectedContentType: contentType
    });

    // Vérifier la connexion Supabase
    logDebug(`[${uploadId}] Test de connexion Supabase`);
    const { data: testConnection, error: connectionError } = await supabase.storage.listBuckets();
    if (connectionError) {
      logError(`[${uploadId}] Erreur de connexion Supabase`, connectionError, { uploadId });
      throw new Error(`Erreur de connexion: ${connectionError.message}`);
    }

    // Upload standard selon la documentation Supabase
    logDebug(`[${uploadId}] Début de l'upload vers Supabase Storage`);
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false, // Éviter d'écraser les fichiers existants
        contentType: contentType
      });

    if (error) {
      logError(`[${uploadId}] Erreur lors de l'upload d'image`, error, {
        uploadId,
        fileName,
        fileSize: file.size,
        contentType,
        errorCode: error.statusCode,
        errorMessage: error.message,
        errorDetails: error.details || 'Aucun détail',
        supabaseErrorCode: error.code
      });
      
      // Gestion spécifique des erreurs communes
      if (error.statusCode === 409 || error.message?.includes('already exists')) {
        throw new Error('Un fichier avec ce nom existe déjà. Veuillez réessayer.');
      } else if (error.statusCode === 413) {
        throw new Error('Le fichier est trop volumineux (max 6MB).');
      } else if (error.statusCode === 415) {
        throw new Error('Type de fichier non supporté. Utilisez JPG, PNG ou WebP.');
      } else if (error.statusCode === 400) {
        throw new Error(`Erreur de requête: ${error.message}`);
      } else if (error.statusCode === 401) {
        throw new Error('Erreur d\'authentification Supabase.');
      } else if (error.statusCode === 403) {
        throw new Error('Permissions insuffisantes pour l\'upload.');
      }
      
      throw error;
    }

    logInfo(`[${uploadId}] Image uploadée avec succès`, { 
      uploadId,
      path: data.path, 
      fileName,
      fileSize: file.size,
      contentType,
      uploadDuration: `${Date.now() - parseInt(uploadId.split('_')[1])}ms`
    });
    
    return data;
  } catch (error) {
    logError(`[${uploadId}] Erreur critique lors de l'upload d'image`, error, {
      uploadId,
      fileName,
      fileSize: file?.size,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Nouvelle fonction pour uploader avec retry automatique
export async function uploadImageWithRetry(file, fileName, maxRetries = 3) {
  const retryId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let lastError;
  
  logInfo(`[${retryId}] Début upload avec retry`, {
    retryId,
    fileName,
    maxRetries,
    fileSize: file.size
  });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logDebug(`[${retryId}] Tentative d'upload ${attempt}/${maxRetries}`, { 
        retryId,
        fileName,
        attempt,
        maxRetries
      });
      
      // Si ce n'est pas la première tentative, ajouter un suffix au nom
      const actualFileName = attempt > 1 ? 
        `${fileName.replace(/\.[^/.]+$/, '')}_retry${attempt - 1}${fileName.substring(fileName.lastIndexOf('.'))}` : 
        fileName;
      
      const result = await uploadImage(file, actualFileName);
      
      logInfo(`[${retryId}] Upload réussi à la tentative ${attempt}`, { 
        retryId,
        fileName: actualFileName,
        originalFileName: fileName,
        attempt,
        totalAttempts: attempt
      });
      
      return result;
    } catch (error) {
      lastError = error;
      
      logWarning(`[${retryId}] Tentative ${attempt} échouée`, error, { 
        retryId,
        fileName, 
        attempt, 
        maxRetries,
        willRetry: attempt < maxRetries,
        errorType: error.constructor.name,
        errorMessage: error.message
      });
      
      // Ne pas retry si c'est une erreur de validation (type de fichier, etc.)
      if (error.statusCode === 415 || error.message?.includes('Type de fichier') || 
          error.message?.includes('Validation échouée') || error.statusCode === 413) {
        logError(`[${retryId}] Erreur non récupérable, arrêt des tentatives`, error, {
          retryId,
          fileName,
          attempt,
          errorType: 'non_recoverable'
        });
        throw error;
      }
      
      // Attendre avant le prochain essai (backoff exponentiel)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        logDebug(`[${retryId}] Attente avant nouvelle tentative`, {
          retryId,
          delay,
          nextAttempt: attempt + 1
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logError(`[${retryId}] Échec de l'upload après ${maxRetries} tentatives`, lastError, { 
    retryId,
    fileName,
    maxRetries,
    finalError: lastError.message
  });
  throw lastError;
}

// Fonction pour obtenir l'URL publique d'une images
export function getImageUrl(path) {
  const { data } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// Fonction pour supprimer une image
export async function deleteImage(path) {
  try {
    const { error } = await supabase.storage
      .from('recipe-images')
      .remove([path]);

    if (error) {
      logError('Erreur lors de la suppression d\'image', error);
      throw error;
    }

    logInfo('Image supprimée avec succès', { path });
  } catch (error) {
    logError('Erreur critique lors de la suppression d\'image', error);
    throw error;
  }
}

// Fonction pour créer le bucket de stockage des images si nécessaire
export async function createImageStorageBucket() {
  const bucketId = `bucket_check_${Date.now()}`;
  
  try {
    logInfo(`[${bucketId}] Vérification du bucket recipe-images`);
    
    // Test 1: Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logError(`[${bucketId}] Erreur lors de la vérification des buckets`, listError, {
        bucketId,
        errorCode: listError.code,
        errorMessage: listError.message
      });
      return false;
    }

    logDebug(`[${bucketId}] Buckets trouvés`, {
      bucketId,
      bucketsCount: buckets?.length || 0,
      bucketNames: buckets?.map(b => b.name) || []
    });

    const bucketExists = buckets.some(bucket => bucket.name === 'recipe-images');
    
    if (bucketExists) {
      logInfo(`[${bucketId}] Bucket recipe-images trouvé`);
      
      // Test 2: Vérifier les permissions du bucket
      try {
        const { data: files, error: listFilesError } = await supabase.storage
          .from('recipe-images')
          .list('', { limit: 1 });
        
        if (listFilesError) {
          logWarning(`[${bucketId}] Problème d'accès au bucket`, listFilesError, {
            bucketId,
            errorCode: listFilesError.code,
            errorMessage: listFilesError.message
          });
          
          // Si c'est une erreur d'authentification ou de permissions
          if (listFilesError.statusCode === 401 || listFilesError.statusCode === 403) {
            logError(`[${bucketId}] Permissions insuffisantes pour le bucket`, listFilesError);
            console.log(`
=== PROBLÈME DE PERMISSIONS DÉTECTÉ ===

Le bucket 'recipe-images' existe mais il y a un problème de permissions.

Solutions à essayer :

1. Vérifiez que le bucket est bien configuré comme "Public"
2. Dans Supabase Dashboard > Storage > recipe-images :
   - Cliquez sur "Settings" 
   - Vérifiez que "Public bucket" est coché
   - Sauvegardez les modifications

3. Si le problème persiste, recréez le bucket :
   - Supprimez le bucket existant
   - Recréez-le avec les bonnes permissions

4. Vérifiez vos clés API dans .env.local

=== FIN DES INSTRUCTIONS ===
            `);
            return false;
          }
        } else {
          logInfo(`[${bucketId}] Bucket recipe-images configuré correctement`, {
            bucketId,
            filesCount: files?.length || 0
          });
        }
      } catch (permissionError) {
        logError(`[${bucketId}] Erreur de test des permissions`, permissionError);
      }
      
      return true;
    }

    // Test 3: Créer le bucket s'il n'existe pas
    logInfo(`[${bucketId}] Bucket recipe-images non trouvé, tentative de création`);
    
    const { data, error } = await supabase.storage.createBucket('recipe-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 6291456 // 6MB en bytes
    });

    if
