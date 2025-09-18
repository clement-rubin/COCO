import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Singleton pour éviter les instances multiples
let supabaseInstance = null

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes')
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'coco-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : null,
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: { 'x-my-custom-header': 'coco-app' },
      },
    })
  }
  
  return supabaseInstance
}

// Export par défaut pour compatibilité
export const supabase = getSupabaseClient()

// Fonction pour nettoyer l'instance (utile pour les tests)
export const resetSupabaseInstance = () => {
  supabaseInstance = null
}

// === FONCTIONS CARTES À COLLECTIONNER ===

// Sauvegarder la collection de cartes d'un utilisateur
export async function saveUserCardCollection(userId, cards, collection) {
  try {
    const client = getSupabaseClient()
    const { error } = await client
      .from('user_cards')
      .upsert({
        user_id: userId,
        owned_cards: cards,
        collection_stats: collection,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur sauvegarde collection:', error);
    return { success: false, error };
  }
}

// Récupérer la collection de cartes d'un utilisateur
export async function getUserCardCollection(userId) {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('user_cards')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    return {
      owned_cards: data?.owned_cards || [],
      collection_stats: data?.collection_stats || {}
    };
  } catch (error) {
    console.error('Erreur récupération collection:', error);
    return { owned_cards: [], collection_stats: {} };
  }
}

// Créer une offre d'échange
export async function createTradeOffer(userId, offeringCardId, wantingCardId, message = '') {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('trade_offers')
      .insert({
        creator_id: userId,
        offering_card_id: offeringCardId,
        wanting_card_id: wantingCardId,
        message,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, trade: data };
  } catch (error) {
    console.error('Erreur création offre échange:', error);
    return { success: false, error };
  }
}

// Récupérer les offres d'échange disponibles
export async function getAvailableTradeOffers(userId, limit = 20) {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('trade_offers')
      .select(`
        *,
        creator:profiles!creator_id(display_name, avatar_url)
      `)
      .neq('creator_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur récupération offres échange:', error);
    return [];
  }
}

// Accepter une offre d'échange
export async function acceptTradeOffer(tradeId, acceptorId) {
  try {
    const client = getSupabaseClient()
    // Commencer une transaction
    const { data: trade, error: tradeError } = await client
      .from('trade_offers')
      .select('*')
      .eq('id', tradeId)
      .eq('status', 'pending')
      .single();
    
    if (tradeError) throw tradeError;
    if (!trade) throw new Error('Offre d\'échange introuvable');
    
    // Mettre à jour le statut de l'offre
    const { error: updateError } = await client
      .from('trade_offers')
      .update({
        acceptor_id: acceptorId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', tradeId);
    
    if (updateError) throw updateError;
    
    // Ici, il faudrait échanger les cartes entre les utilisateurs
    // Cette logique peut être implémentée côté client ou via une fonction Supabase
    
    return { success: true, trade };
  } catch (error) {
    console.error('Erreur acceptation échange:', error);
    return { success: false, error };
  }
}

// Récupérer l'historique des échanges d'un utilisateur
export async function getUserTradeHistory(userId) {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('trade_offers')
      .select(`
        *,
        creator:profiles!creator_id(display_name, avatar_url),
        acceptor:profiles!acceptor_id(display_name, avatar_url)
      `)
      .or(`creator_id.eq.${userId},acceptor_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur historique échanges:', error);
    return [];
  }
}

// Fonction pour obtenir les profils de manière sécurisée
export async function getUserProfile(userId) {
  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('display_name, bio, avatar_url, location, website, phone, date_of_birth')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception lors de la récupération du profil:', error);
    return null;
  }
}

export default supabase