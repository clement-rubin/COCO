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

  const ensureProfileExists = async (userId) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existingProfile) {
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: 'Utilisateur',
            bio: 'Aucune bio',
            is_private: false
          });

        if (error) {
          logError('Error creating profile:', error);
        }
      }
    } catch (error) {
      logError('Error ensuring profile exists:', error);
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

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setError('Demande d\'amitié déjà envoyée');
        } else {
          throw error;
        }
      } else {
        logInfo('Friend request sent successfully');
        setError('Demande d\'amitié envoyée !');
        setTimeout(() => setError(null), 3000);
        // Refresh search results to update button states
        await searchUsers(searchTerm);
      }
    } catch (error) {
      logError('Error sending friend request:', error);
      setError('Erreur lors de l\'envoi de la demande');
      setTimeout(() => setError(null), 3000);
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friendships')
          .update({ 
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId);

        if (error) throw error;
        logInfo('Friend request accepted');
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId);

        if (error) throw error;
        logInfo('Friend request declined');
      }

      await Promise.all([
        loadFriendRequests(user.id),
        loadFriends(user.id)
      ]);
    } catch (error) {
      logError('Error responding to friend request:', error);
      setError('Erreur lors de la réponse à la demande');
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className={styles.loading}>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className={styles.loginPrompt}>
          <h2>Connectez-vous pour accéder à vos amis</h2>
          <a href="/login" className={styles.loginButton}>Se connecter</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />
      
      <header className={styles.header}>
        <h1>👥 Mes Amis</h1>
        <p>Connectez-vous avec d'autres passionnés de cuisine</p>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Search Section */}
      <section className={styles.searchSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Rechercher des amis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchLoading && <div className={styles.searchSpinner}>🔍</div>}
        </div>

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>Résultats de recherche</h3>
            {searchResults.map((profile) => (
              <div key={profile.user_id} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.display_name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className={styles.userDetails}>
                    <h4>{profile.display_name || 'Utilisateur'}</h4>
                    <p>{profile.bio || 'Aucune bio'}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(profile.user_id)}
                  className={styles.addFriendButton}
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <section className={styles.requestsSection}>
          <h2>Demandes d'amitié ({friendRequests.length})</h2>
          {friendRequests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {request.profiles?.avatar_url ? (
                    <img src={request.profiles.avatar_url} alt={request.profiles.display_name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {request.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className={styles.userDetails}>
                  <h4>{request.profiles?.display_name || 'Utilisateur'}</h4>
                  <p>{request.profiles?.bio || 'Aucune bio'}</p>
                </div>
              </div>
              <div className={styles.requestActions}>
                <button
                  onClick={() => respondToFriendRequest(request.id, 'accept')}
                  className={styles.acceptButton}
                >
                  Accepter
                </button>
                <button
                  onClick={() => respondToFriendRequest(request.id, 'decline')}
                  className={styles.declineButton}
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Friends List */}
      <section className={styles.friendsSection}>
        <h2>Mes amis ({friends.length})</h2>
        {friends.length > 0 ? (
          <div className={styles.friendsGrid}>
            {friends.map((friendship) => (
              <div key={friendship.id} className={styles.friendCard}>
                <div className={styles.avatar}>
                  {friendship.profiles?.avatar_url ? (
                    <img src={friendship.profiles.avatar_url} alt={friendship.profiles.display_name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {friendship.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <h4>{friendship.profiles?.display_name || 'Utilisateur'}</h4>
                <p>{friendship.profiles?.bio || 'Aucune bio'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Vous n'avez pas encore d'amis. Utilisez la recherche pour en trouver !</p>
          </div>
        )}
      </section>

      {/* Friend Suggestions */}
      {suggestions.length > 0 && (
        <section className={styles.suggestionsSection}>
          <h2>Suggestions d'amis</h2>
          <div className={styles.suggestionsGrid}>
            {suggestions.map((suggestion) => (
              <div key={suggestion.user_id} className={styles.suggestionCard}>
                <div className={styles.avatar}>
                  {suggestion.avatar_url ? (
                    <img src={suggestion.avatar_url} alt={suggestion.display_name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {suggestion.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <h4>{suggestion.display_name || 'Utilisateur'}</h4>
                <p>{suggestion.bio || 'Aucune bio'}</p>
                <button
                  onClick={() => sendFriendRequest(suggestion.user_id)}
                  className={styles.addFriendButton}
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
