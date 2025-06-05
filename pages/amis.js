import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../utils/logger';
import styles from '../styles/Amis.module.css';
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [buttonStates, setButtonStates] = useState({});
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const setButtonLoading = (buttonId, loading) => {
    setButtonStates(prev => ({
      ...prev,
      [buttonId]: { ...prev[buttonId], loading }
    }));
  };

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
      showMessage('Erreur de connexion', true);
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
    const buttonId = `add-${friendId}`;
    setButtonLoading(buttonId, true);
    
    try {
      // Vérifier d'abord le statut existant avec la fonction SQL corrigée
      const { data: existingStatus, error: statusError } = await supabase
        .rpc('check_friendship_status', {
          user1_id: user.id,
          user2_id: friendId
        });

      if (!statusError && existingStatus && existingStatus.length > 0) {
        showMessage('Une demande d\'amitié existe déjà', true);
        return;
      }

      // S'assurer que les profils existent (optionnel, mais recommandé)
      await ensureProfileExists(user.id);
      await ensureProfileExists(friendId);
      
      // Créer la demande d'amitié avec auth.users.id directement
      const { data: newFriendship, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,  // auth.users.id
          friend_id: friendId,  // auth.users.id
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          showMessage('Demande d\'amitié déjà envoyée', true);
        } else if (error.code === '23503') {
          showMessage('Erreur de référence utilisateur - veuillez réessayer', true);
          logError('Foreign key constraint error:', error);
        } else {
          logError('Detailed error sending friend request:', error);
          showMessage(`Erreur: ${error.message}`, true);
        }
      } else {
        logInfo('Friend request sent successfully', newFriendship);
        showMessage('Demande d\'amitié envoyée avec succès ! 🎉');
        
        // Rafraîchir les résultats de recherche
        if (searchTerm) {
          await searchUsers(searchTerm);
        }
      }
    } catch (error) {
      logError('Error sending friend request:', error);
      showMessage('Erreur lors de l\'envoi de la demande', true);
    } finally {
      setButtonLoading(buttonId, false);
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    const buttonId = `${action}-${requestId}`;
    setButtonLoading(buttonId, true);
    
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
        showMessage('Demande d\'amitié acceptée ! 🤝');
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId);

        if (error) throw error;
        logInfo('Friend request declined');
        showMessage('Demande d\'amitié refusée', false);
      }

      await Promise.all([
        loadFriendRequests(user.id),
        loadFriends(user.id)
      ]);
    } catch (error) {
      logError('Error responding to friend request:', error);
      showMessage('Erreur lors de la réponse à la demande', true);
    } finally {
      setButtonLoading(buttonId, false);
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
        <div className={styles.loading}>Chargement de vos amis...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loginPrompt}>
          <h2>Connectez-vous pour découvrir vos amis</h2>
          <p>Rejoignez la communauté COCO et connectez-vous avec d'autres passionnés de cuisine !</p>
          <a href="/login" className={styles.loginButton}>Se connecter</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Mes Amis</h1>
        <p>Découvrez, connectez-vous et partagez vos passions culinaires</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className={styles.errorMessage} style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          color: '#059669'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Search Section */}
      <section className={styles.searchSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="🔍 Rechercher des amis par nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchLoading && <div className={styles.searchSpinner}>🔍</div>}
        </div>

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>Résultats de recherche ({searchResults.length})</h3>
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
                    <p>{profile.bio || 'Passionné(e) de cuisine 👨‍🍳'}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(profile.user_id)}
                  className={styles.addFriendButton}
                  disabled={buttonStates[`add-${profile.user_id}`]?.loading}
                >
                  {buttonStates[`add-${profile.user_id}`]?.loading ? '⏳' : '✨'} Ajouter
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
                  <p>{request.profiles?.bio || 'Nouveau membre de la communauté COCO 🌟'}</p>
                </div>
              </div>
              <div className={styles.requestActions}>
                <button
                  onClick={() => respondToFriendRequest(request.id, 'accept')}
                  className={styles.acceptButton}
                  disabled={buttonStates[`accept-${request.id}`]?.loading}
                >
                  {buttonStates[`accept-${request.id}`]?.loading ? '⏳' : '✅'} Accepter
                </button>
                <button
                  onClick={() => respondToFriendRequest(request.id, 'decline')}
                  className={styles.declineButton}
                  disabled={buttonStates[`decline-${request.id}`]?.loading}
                >
                  {buttonStates[`decline-${request.id}`]?.loading ? '⏳' : '❌'} Refuser
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
                <p>{friendship.profiles?.bio || 'Amateur de cuisine passionné 🍽️'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Vous n'avez pas encore d'amis culinaires. Utilisez la recherche pour découvrir des passionnés comme vous !</p>
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
                <p>{suggestion.bio || 'Découvrez de nouvelles recettes ensemble ! 🌟'}</p>
                <button
                  onClick={() => sendFriendRequest(suggestion.user_id)}
                  className={styles.addFriendButton}
                  disabled={buttonStates[`add-${suggestion.user_id}`]?.loading}
                >
                  {buttonStates[`add-${suggestion.user_id}`]?.loading ? '⏳ Envoi...' : '🤝 Ajouter'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
