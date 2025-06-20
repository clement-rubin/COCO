import { createClient } from '@supabase/supabase-js';
import { logDebug, logError, logInfo, logWarning } from '../utils/logger';
import { getProfileIdFromUserId } from '../utils/profileUtils';

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
    // Safe import check and processing
    if (typeof window !== 'undefined') {
      // Client-side processing with enhanced image optimization
      const { processImageData } = require('../utils/imageUtils');
      return processImageData(imageData, fallbackUrl);
    } else {
      // Server-side fallback with improved URL validation
      if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('data:'))) {
        return imageData;
      }
      return fallbackUrl;
    }  } catch (error) {
    // Enhanced error logging with better context and performance metrics
    console.warn('Error in getRecipeImageUrl - falling back to default:', {
      error: error.message,
      imageDataType: typeof imageData,
      isArray: Array.isArray(imageData),
      hasData: !!imageData,
      dataLength: imageData?.length || 0,
      performanceTime: window?.performance?.now ? window.performance.now() : 'N/A'
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
 * @param {Object} profileData - Profile data (can be named profileData or userData)
 * @returns {Promise<Object>} Profile data
 */
export async function createOrUpdateProfile(userId, profileData) {
  try {
    if (!userId) return null;
    
    // Handle different parameter naming conventions (profileData or userData)
    const data = profileData || {};
    
    // Ensure required fields have default values
    const displayName = data.display_name || data.displayName || 
                         (data.email ? data.email.split('@')[0] : 'Utilisateur');
    
    // Create/update profile
    const { data: result, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        display_name: displayName.length > 30 
          ? displayName.substring(0, 30) 
          : (displayName.length < 2 ? 'Utilisateur' : displayName),
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_private: false,
        total_friends_count: 0,
        total_recipes_count: 0
      }, { 
        onConflict: 'user_id',
        returning: 'minimal'
      })
      .select()
      .single();
      
    if (error) {
      logError('Error creating/updating profile', error);
      return null;
    }
    
    return result;
  } catch (error) {
    logError('Error in createOrUpdateProfile', error);
    return null;  
  }
}

/**
 * Get user friends with fallback
 * @param {string} userId - User ID (auth.users.id)
 * @returns {Promise<Object>} Friends data
 */
export async function getUserFriends(userId) {
  try {
    // First ensure user has a profile
    await createOrUpdateProfile(userId, { display_name: 'Utilisateur' })
    
    // Try to use the new SQL functions first
    try {
      // Use get_user_friends_simple function
      const { data: friendsData, error: friendsError } = await supabase
        .rpc('get_user_friends_simple', { target_user_id: userId });

      // Use get_pending_friend_requests function  
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_pending_friend_requests', { target_user_id: userId });

      if (!friendsError && !pendingError) {
        // Format the data to match expected structure
        const friends = friendsData?.map(friend => ({
          id: friend.friendship_id,
          friend_id: friend.friend_user_id,
          status: friend.friendship_status,
          created_at: friend.created_at,
          friend_profile: {
            user_id: friend.friend_user_id,
            display_name: friend.friend_display_name,
            avatar_url: friend.friend_avatar_url,
            bio: friend.friend_bio
          }
        })) || [];

        const pendingRequests = pendingData?.map(request => ({
          id: request.friendship_id,
          user_id: request.requester_user_id,
          created_at: request.created_at,
          requester_profile: {
            user_id: request.requester_user_id,
            display_name: request.requester_display_name,
            avatar_url: request.requester_avatar_url,
            bio: request.requester_bio
          }
        })) || [];

        return {
          friends,
          pendingRequests,
          error: null
        }
      }
    } catch (rpcError) {
      logWarning('SQL functions not available, using fallback queries', rpcError)
    }
    
    // Fallback to direct queries if SQL functions are not available
    // Get friends - avoid join to prevent foreign key ambiguity
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at, updated_at')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    // Get profiles separately for friends
    let friends = []
    if (friendships && friendships.length > 0) {
      const friendIds = friendships.map(f => f.friend_id)
      const { data: friendProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, created_at')
        .in('user_id', friendIds)
      
      // Combine data manually
      friends = friendships.map(friendship => ({
        ...friendship,
        friend_profile: friendProfiles?.find(p => p.user_id === friendship.friend_id) || {
          user_id: friendship.friend_id,
          display_name: 'Utilisateur',
          bio: 'Aucune bio'
        }
      }))
    }
    
    // Get pending requests - avoid join to prevent foreign key ambiguity
    const { data: pendingFriendships, error: pendingError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at, updated_at')
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    // Get profiles separately for pending requests
    let pendingRequests = []
    if (pendingFriendships && pendingFriendships.length > 0) {
      const requesterIds = pendingFriendships.map(f => f.user_id)
      const { data: requesterProfiles, error: requesterProfilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, created_at')
        .in('user_id', requesterIds)
      
      // Combine data manually
      pendingRequests = pendingFriendships.map(friendship => ({
        ...friendship,
        requester_profile: requesterProfiles?.find(p => p.user_id === friendship.user_id) || {
          user_id: friendship.user_id,
          display_name: 'Utilisateur',
          bio: 'Aucune bio'
        }
      }))
    }
    
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
 * Get user friends with corrected references
 * @param {string} userId - User ID (auth.users.id)
 * @returns {Promise<Object>} Friends data
 */
export async function getUserFriendsCorrected(userId) {
  try {
    // First ensure user has a profile and get profile ID
    const profileId = await getProfileIdFromUserId(userId)
    
    if (!profileId) {
      logError('Could not get profile ID for user', null, { userId })
      return {
        friends: [],
        pendingRequests: [],
        error: 'Profile not found'
      }
    }
    
    // Get friends using profile ID
    const { data: friendships, error: friendsError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        friend_profile:profiles!friend_id(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('user_id', profileId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
    
    // Get pending requests where current user is the target
    const { data: pendingFriendships, error: pendingError } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        updated_at,
        requester_profile:profiles!user_id(
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          created_at
        )
      `)
      .eq('friend_id', profileId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    return {
      friends: friendships || [],
      pendingRequests: pendingFriendships || [],
      error: friendsError || pendingError
    }
  } catch (error) {
    logError('Error getting user friends (corrected)', error)
    return {
      friends: [],
      pendingRequests: [],
      error
    }
  }
}
