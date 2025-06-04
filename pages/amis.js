import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../utils/logger';
import styles from '../styles/Amis.module.css';
import Navigation from '../components/Navigation';
import { useRouter } from 'next/router';

export default function Amis() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await Promise.all([
          loadFriendRequests(user.id),
          loadFriends(user.id),
          loadSuggestions(user.id)
        ]);
      }
    } catch (error) {
      logError('Error checking user:', error);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async (userId) => {
    try {
      // Get friend requests directly without joins to avoid relationship ambiguity
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, user_id, status, created_at')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (friendshipsError) {
        if (friendshipsError.code === 'PGRST116') {
          logError('Friendships table not found - please run database setup');
          setError('Système d\'amis en cours d\'initialisation');
          return;
        }
        throw friendshipsError;
      }

      if (friendships && friendships.length > 0) {
        // Get profiles separately to avoid foreign key ambiguity
        const userIds = friendships.map(f => f.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, bio')
          .in('user_id', userIds);

        if (profilesError) {
          logError('Error loading profiles for friend requests:', profilesError);
        }

        // Combine the data manually
        const requestsWithProfiles = friendships.map(friendship => {
          const profile = profiles?.find(p => p.user_id === friendship.user_id);
          return {
            ...friendship,
            profiles: profile || { display_name: 'Utilisateur', bio: 'Aucune bio' }
          };
        });

        setFriendRequests(requestsWithProfiles);
      } else {
        setFriendRequests([]);
      }
    } catch (error) {
      logError('Error loading friend requests:', error);
      setError('Erreur lors du chargement des demandes');
    }
  };

  const loadFriends = async (userId) => {
    try {
      // Get accepted friendships where current user is the requester
      const { data: friendships1, error: error1 } = await supabase
        .from('friendships')
        .select('id, friend_id as other_user_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      // Get accepted friendships where current user is the target
      const { data: friendships2, error: error2 } = await supabase
        .from('friendships')
        .select('id, user_id as other_user_id')
        .eq('friend_id', userId)
        .eq('status', 'accepted');

      if (error1 || error2) {
        if ((error1 && error1.code === 'PGRST116') || (error2 && error2.code === 'PGRST116')) {
          logError('Friendships table not found');
          return;
        }
        throw error1 || error2;
      }

      // Combine both directions of friendships
      const allFriendships = [
        ...(friendships1 || []),
        ...(friendships2 || [])
      ];

      if (allFriendships.length > 0) {
        // Get profiles for all friends
        const friendIds = allFriendships.map(f => f.other_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, bio')
          .in('user_id', friendIds);

        if (profilesError) {
          logError('Error loading profiles for friends:', profilesError);
        }

        // Combine the data manually
        const friendsWithProfiles = allFriendships.map(friendship => {
          const profile = profiles?.find(p => p.user_id === friendship.other_user_id);
          return {
            id: friendship.id,
            friend_id: friendship.other_user_id,
            profiles: profile || { display_name: 'Utilisateur', bio: 'Aucune bio' }
          };
        });

        setFriends(friendsWithProfiles);
      } else {
        setFriends([]);
      }
    } catch (error) {
      logError('Error loading friends:', error);
    }
  };

  const loadSuggestions = async (userId) => {
    try {
      // Simple fallback - get random profiles excluding current user
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .neq('user_id', userId)
        .eq('is_private', false)
        .limit(5);
      
      if (error) {
        if (error.code === 'PGRST116') {
          logError('Profiles table not found');
          return;
        }
        throw error;
      }
      
      setSuggestions(data || []);
    } catch (error) {
      logError('Error loading suggestions:', error);
    }
  };

  const searchUsers = async (term) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Simple profile search without RPC function
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .neq('user_id', user?.id)
        .eq('is_private', false)
        .ilike('display_name', `%${term}%`)
        .limit(10);

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Système de profils en cours d\'initialisation');
          return;
        }
        throw error;
      }
      
      setSearchResults(data || []);
      
      if (data?.length === 0) {
        setError('Aucun utilisateur trouvé');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      logError('Error searching users:', error);
      setError('Erreur lors de la recherche');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      // Check if friendship already exists in either direction
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // If it's not a "no rows" error, something else went wrong
        if (checkError.code !== 'PGRST116') {
          logError('Error checking existing friendship:', checkError);
        }
      }

      if (existingFriendship) {
        setError('Une demande d\'amitié existe déjà');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Create profiles if they don't exist
      await ensureProfileExists(user.id);
      await ensureProfileExists(friendId);
      
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if
