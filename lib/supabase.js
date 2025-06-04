import { createClient } from '@supabase/supabase-js';
import { logDebug, logError, logInfo, logWarning } from '../utils/logger';
import { processImageData } from '../utils/imageUtils';

// Récupération des variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logWarning('Les variables d\'environnement Supabase ne sont pas définies', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey
  });
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Add storage URL to the client for reusing elsewhere
supabase.storageUrl = supabaseUrl;

/**
 * Gets a properly formatted recipe image URL from various data formats
 * @param {*} imageData - The image data (could be base64, URL, or bytea array)
 * @param {string} fallbackUrl - URL to use if image processing fails
 * @returns {string} The URL to use in an <img> tag
 */
export function getRecipeImageUrl(imageData, fallbackUrl = '/placeholder-recipe.jpg') {
  try {
    // Use the processImageData function from imageUtils
    return processImageData(imageData, fallbackUrl);
  } catch (error) {
    logError('Error getting recipe image URL', error, {
      imageDataType: typeof imageData,
      hasData: !!imageData
    });
    return fallbackUrl;
  }
}

/**
 * Creates the recipes table if it doesn't exist
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function createRecipesTableIfNotExists() {
  try {
    logInfo('Vérification/création de la table recipes...');
    
    // Check if the table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'recipes');
    
    if (tablesError) {
      logError('Erreur lors de la vérification de la table', tablesError);
      return false;
    }
    
    if (tables && tables.length > 0) {
      logInfo('La table recipes existe déjà');
      return true;
    }
    
    logInfo('Création de la table recipes...');
    
    // Create the table
    const { error: createError } = await supabase.rpc('create_recipes_table');
    
    if (createError) {
      logError('Erreur lors de la création de la table recipes', createError);
      return false;
    }
    
    logInfo('Table recipes créée avec succès');
    return true;
    
  } catch (error) {
    logError('Erreur lors de la création/vérification de la table recipes', error);
    return false;
  }
}

/**
 * Initialize the recipes table with sample data
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function initializeRecipesTable() {
  try {
    // First create the table if it doesn't exist
    const tableCreated = await createRecipesTableIfNotExists();
    if (!tableCreated) {
      return false;
    }
    
    logInfo('Initialisation de la table recipes avec des données d\'exemple...');
    
    // Create image bucket if it doesn't exist
    await createImageStorageBucket();
    
    // Check if there are already recipes in the table
    const { data: existingRecipes, error: countError } = await supabase
      .from('recipes')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (countError) {
      logError('Erreur lors du comptage des recettes', countError);
      return false;
    }
    
    // If there are already recipes, don't add sample data
    if (existingRecipes && existingRecipes.length > 0) {
      logInfo('La table recipes contient déjà des données');
      return true;
    }
    
    // Sample recipes data
    const sampleRecipes = [
      {
        title: 'Pâtes Carbonara',
        description: 'Une recette classique de la cuisine italienne',
        ingredients: ['400g spaghetti', '150g pancetta', '4 jaunes d\'œufs', '50g parmesan râpé', 'Sel et poivre'],
        instructions: [
          { step: 1, instruction: 'Cuire les pâtes dans de l\'eau salée' },
          { step: 2, instruction: 'Faire revenir la pancetta' },
          { step: 3, instruction: 'Mélanger les jaunes d\'œufs et le parmesan' },
          { step: 4, instruction: 'Combiner tous les ingrédients' }
        ],
        prepTime: '10 minutes',
        cookTime: '15 minutes',
        servings: '4',
        category: 'Italien',
        difficulty: 'Facile',
        author: 'Chef Mario'
      },
      {
        title: 'Soupe de Potiron',
        description: 'Parfaite pour les soirées d\'automne',
        ingredients: ['1 potiron', '1 oignon', '2 carottes', '1L bouillon de légumes', 'Crème fraîche'],
        instructions: [
          { step: 1, instruction: 'Éplucher et couper les légumes' },
          { step: 2, instruction: 'Faire revenir l\'oignon' },
          { step: 3, instruction: 'Ajouter les autres légumes et le bouillon' },
          { step: 4, instruction: 'Mixer et servir avec une cuillère de crème' }
        ],
        prepTime: '15 minutes',
        cookTime: '30 minutes',
        servings: '6',
        category: 'Soupes',
        difficulty: 'Facile',
        author: 'Chef Sophie'
      }
    ];
    
    // Insert sample recipes
    const { error: insertError } = await supabase
      .from('recipes')
      .insert(sampleRecipes);
    
    if (insertError) {
      logError('Erreur lors de l\'insertion des recettes d\'exemple', insertError);
      return false;
    }
    
    logInfo('Données d\'exemple insérées avec succès');
    return true;
    
  } catch (error) {
    logError('Erreur lors de l\'initialisation de la table recipes', error);
    return false;
  }
}

/**
 * Creates the image storage bucket if it doesn't exist
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function createImageStorageBucket() {
  try {
    logInfo('Vérification/création du bucket de stockage d\'images...');
    
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      logError('Erreur lors de la vérification des buckets', bucketsError);
      return false;
    }
    
    // Check if images bucket exists
    const imagesBucketExists = buckets?.find(bucket => bucket.name === 'images');
    
    if (imagesBucketExists) {
      logInfo('Le bucket images existe déjà');
      return true;
    }
    
    logInfo('Création du bucket images...');
    
    // Create the bucket
    const { error: createError } = await supabase
      .storage
      .createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
        fileSizeLimit: 5242880, // 5MB
      });
    
    if (createError) {
      logError('Erreur lors de la création du bucket images', createError);
      return false;
    }
    
    logInfo('Bucket images créé avec succès');
    return true;
    
  } catch (error) {
    logError('Erreur lors de la création/vérification du bucket images', error);
    return false;
  }
}

/**
 * Initialize the friends system tables
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function initializeFriendsSystem() {
  try {
    logInfo('Initialisation du système d\'amis...')
    
    // Check if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError && profilesError.code === 'PGRST116') {
      // Table doesn't exist, create it
      logInfo('Création de la table profiles...')
      const { error: createProfilesError } = await supabase.rpc('create_profiles_table')
      if (createProfilesError) {
        logError('Erreur lors de la création de la table profiles', createProfilesError)
        return false
      }
    }
    
    // Check if friendships table exists
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('count')
      .limit(1)
    
    if (friendshipsError && friendshipsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      logInfo('Création de la table friendships...')
      const { error: createFriendshipsError } = await supabase.rpc('create_friendships_table')
      if (createFriendshipsError) {
        logError('Erreur lors de la création de la table friendships', createFriendshipsError)
        return false
      }
    }
    
    logInfo('Système d\'amis initialisé avec succès')
    return true
    
  } catch (error) {
    logError('Erreur lors de l\'initialisation du système d\'amis', error)
    return false
  }
}

/**
 * Send a friend request to another user
 * @param {string} targetUserId - ID of the user to send request to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendFriendRequest(targetUserId) {
  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      target_user_id: targetUserId
    })
    
    if (error) {
      logError('Erreur lors de l\'envoi de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami envoyée avec succès', { targetUserId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors de l\'envoi de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Accept a friend request
 * @param {string} friendshipId - ID of the friendship to accept
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function acceptFriendRequest(friendshipId) {
  try {
    const { data, error } = await supabase.rpc('accept_friend_request', {
      friendship_id: friendshipId
    })
    
    if (error) {
      logError('Erreur lors de l\'acceptation de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami acceptée avec succès', { friendshipId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors de l\'acceptation de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reject a friend request
 * @param {string} friendshipId - ID of the friendship to reject
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectFriendRequest(friendshipId) {
  try {
    const { data, error } = await supabase.rpc('reject_friend_request', {
      friendship_id: friendshipId
    })
    
    if (error) {
      logError('Erreur lors du refus de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami refusée avec succès', { friendshipId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors du refus de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create or update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Profile data
 */
export async function createOrUpdateProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: profileData.display_name || profileData.email?.split('@')[0] || 'Utilisateur',
        avatar_url: profileData.avatar_url || null,
        bio: profileData.bio || null,
        is_private: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logError('Error creating/updating profile', error)
      return null
    }
    
    return data
  } catch (error) {
    logError('Error in createOrUpdateProfile', error)
    return null
  }
}

/**
 * Get user friends with fallback
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Friends data
 */
export async function getUserFriends(userId) {
  try {
    // First ensure user has a profile
    await createOrUpdateProfile(userId, { display_name: 'Utilisateur' })
    
    // Get friends
    const { data: friends, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        friend_profile:profiles!friendships_friend_id_fkey(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    // Get pending requests
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        requester_profile:profiles!friendships_user_id_fkey(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    return {
      friends: friends || [],
      pendingRequests: pendingRequests || [],
      error: friendsError || pendingError
    }
  } catch (error) {
    logError('Error getting user friends', error)
    return {
      friends: [],
      pendingRequests: [],
      error
    }
  }
}

/**
 * Initialize the friends system
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function initializeFriendsSystem() {
  try {
    logInfo('Initialisation du système d\'amis...')
    
    // Check if profiles table exists
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (profilesError && profilesError.code === 'PGRST116') {
      // Table doesn't exist, create it
      logInfo('Création de la table profiles...')
      const { error: createProfilesError } = await supabase.rpc('create_profiles_table')
      if (createProfilesError) {
        logError('Erreur lors de la création de la table profiles', createProfilesError)
        return false
      }
    }
    
    // Check if friendships table exists
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('count')
      .limit(1)
    
    if (friendshipsError && friendshipsError.code === 'PGRST116') {
      // Table doesn't exist, create it
      logInfo('Création de la table friendships...')
      const { error: createFriendshipsError } = await supabase.rpc('create_friendships_table')
      if (createFriendshipsError) {
        logError('Erreur lors de la création de la table friendships', createFriendshipsError)
        return false
      }
    }
    
    logInfo('Système d\'amis initialisé avec succès')
    return true
    
  } catch (error) {
    logError('Erreur lors de l\'initialisation du système d\'amis', error)
    return false
  }
}

/**
 * Send a friend request to another user
 * @param {string} targetUserId - ID of the user to send request to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendFriendRequest(targetUserId) {
  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      target_user_id: targetUserId
    })
    
    if (error) {
      logError('Erreur lors de l\'envoi de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami envoyée avec succès', { targetUserId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors de l\'envoi de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Accept a friend request
 * @param {string} friendshipId - ID of the friendship to accept
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function acceptFriendRequest(friendshipId) {
  try {
    const { data, error } = await supabase.rpc('accept_friend_request', {
      friendship_id: friendshipId
    })
    
    if (error) {
      logError('Erreur lors de l\'acceptation de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami acceptée avec succès', { friendshipId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors de l\'acceptation de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Reject a friend request
 * @param {string} friendshipId - ID of the friendship to reject
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rejectFriendRequest(friendshipId) {
  try {
    const { data, error } = await supabase.rpc('reject_friend_request', {
      friendship_id: friendshipId
    })
    
    if (error) {
      logError('Erreur lors du refus de la demande d\'ami', error)
      return { success: false, error: error.message }
    }
    
    if (data.error) {
      return { success: false, error: data.error }
    }
    
    logInfo('Demande d\'ami refusée avec succès', { friendshipId })
    return { success: true, data }
    
  } catch (error) {
    logError('Erreur lors du refus de la demande d\'ami', error)
    return { success: false, error: error.message }
  }
}

/**
 * Create or update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Profile data
 */
export async function createOrUpdateProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: profileData.display_name || profileData.email?.split('@')[0] || 'Utilisateur',
        avatar_url: profileData.avatar_url || null,
        bio: profileData.bio || null,
        is_private: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logError('Error creating/updating profile', error)
      return null
    }
    
    return data
  } catch (error) {
    logError('Error in createOrUpdateProfile', error)
    return null
  }
}

/**
 * Get user friends with fallback
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Friends data
 */
export async function getUserFriends(userId) {
  try {
    // First ensure user has a profile
    await createOrUpdateProfile(userId, { display_name: 'Utilisateur' })
    
    // Get friends
    const { data: friends, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        friend_profile:profiles!friendships_friend_id_fkey(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    // Get pending requests
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        requester_profile:profiles!friendships_user_id_fkey(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    return {
      friends: friends || [],
      pendingRequests: pendingRequests || [],
      error: friendsError || pendingError
    }
  } catch (error) {
    logError('Error getting user friends', error)
    return {
      friends: [],
      pendingRequests: [],
      error
    }
  }
}
