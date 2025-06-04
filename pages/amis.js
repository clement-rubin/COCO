import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../utils/logger';
import styles from '../styles/Amis.module.css';
import Navigation from '../components/Navigation';

export default function Amis() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles!friendships_user_id_fkey (
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setFriendRequests(data || []);
    } catch (error) {
      logError('Error loading friend requests:', error);
    }
  };

  const loadFriends = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          profiles!friendships_friend_id_fkey (
            user_id,
            display_name,
            avatar_url,
            bio
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      logError('Error loading friends:', error);
    }
  };

  const loadSuggestions = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_friend_suggestions', {
        user_id_param: userId,
        limit_param: 5
      });

      if (error) throw error;
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
      const { data, error } = await supabase.rpc('search_profiles', {
        search_term: term,
        current_user_id: user?.id
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      logError('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending'
        });

      if (error) throw error;
      logInfo('Friend request sent successfully');
      // Refresh search results to update button states
      await searchUsers(searchTerm);
    } catch (error) {
      logError('Error sending friend request:', error);
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId);

        if (error) throw error;
      }

      await Promise.all([
        loadFriendRequests(user.id),
        loadFriends(user.id)
      ]);
    } catch (error) {
      logError('Error responding to friend request:', error);
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
                {suggestion.mutual_friends_count > 0 && (
                  <small>{suggestion.mutual_friends_count} ami(s) en commun</small>
                )}
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
