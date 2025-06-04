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

  const loadFriends = async (userId) => {
    try {
      // Utiliser la nouvelle fonction SQL simplifiée
      const { data, error } = await supabase
        .rpc('get_user_friends_simple', { target_user_id: userId });

      if (error) {
        if (error.code === 'PGRST116') {
          logError('Friends function not found');
          return;
        }
        throw error;
      }

      // Reformater les données
      const friendsWithProfiles = data?.map(friend => ({
        id: friend.friendship_id,
        friend_id: friend.friend_user_id,
        profiles: {
          user_id: friend.friend_user_id,
          display_name: friend.friend_display_name,
          avatar_url: friend.friend_avatar_url,
          bio: friend.friend_bio
        }
      })) || [];

      setFriends(friendsWithProfiles);
    } catch (error) {
      logError('Error loading friends:', error);
    }
  };

  const loadFriendRequests = async (userId) => {
    try {
      // Utiliser la nouvelle fonction SQL simplifiée
      const { data, error } = await supabase
        .rpc('get_pending_friend_requests', { target_user_id: userId });

      if (error) {
        if (error.code === 'PGRST116') {
          logError('Friend requests function not found');
          setError('Système d\'amis en cours d\'initialisation');
          return;
        }
        throw error;
      }

      // Reformater les données
      const requestsWithProfiles = data?.map(request => ({
        id: request.friendship_id,
        user_id: request.requester_user_id,
        profiles: {
          user_id: request.requester_user_id,
          display_name: request.requester_display_name,
          avatar_url: request.requester_avatar_url,
          bio: request.requester_bio
        }
      })) || [];

      setFriendRequests(requestsWithProfiles);
    } catch (error) {
      logError('Error loading friend requests:', error);
      setError('Erreur lors du chargement des demandes');
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
      // Utiliser la nouvelle fonction SQL de recherche
      const { data, error } = await supabase
        .rpc('search_users_simple', {
          search_term: term,
          current_user_id: user?.id
        });

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Système de recherche en cours d\'initialisation');
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
      // Vérifier d'abord le statut existant
      const { data: existingStatus, error: statusError } = await supabase
        .rpc('check_friendship_status', {
          user1_id: user.id,
          user2_id: friendId
        });

      if (!statusError && existingStatus && existingStatus.length > 0) {
        setError('Une demande d\'amitié existe déjà');
        setTimeout(() => setError(null), 3000);
        return;
      }

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
        if (error.code === '23505') {
          setError('Demande d\'amitié déjà envoyée');
        } else {
          logError('Detailed error sending friend request:', error);
          setError(`Erreur: ${error.message}`);
        }
      } else {
        logInfo('Friend request sent successfully');
        setError('Demande d\'amitié envoyée !');
        setTimeout(() => setError(null), 3000);
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
