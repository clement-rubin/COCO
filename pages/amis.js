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
      // Get friend requests with manual join
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
        // Get profiles for the friend requests
        const userIds = friendships.map(f => f.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, bio')
          .in('user_id', userIds);

        if (profilesError) {
          logError('Error loading profiles for friend requests:', profilesError);
        }

        // Combine the data
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
      // Get accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('id, friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (friendshipsError) {
        if (friendshipsError.code === 'PGRST116') {
          logError('Friendships table not found');
          return;
        }
        throw friendshipsError;
      }

      if (friendships && friendships.length > 0) {
        // Get profiles for the friends
        const friendIds = friendships.map(f => f.friend_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url, bio')
          .in('user_id', friendIds);

        if (profilesError) {
          logError('Error loading profiles for friends:', profilesError);
        }

        // Combine the data
        const friendsWithProfiles = friendships.map(friendship => {
          const profile = profiles?.find(p => p.user_id === friendship.friend_id);
          return {
            ...friendship,
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
        if (error.code === 'PGRST116') {
          setError('Système d\'amis en cours d\'initialisation');
          return;
        }
        throw error;
      }
      
      logInfo('Friend request sent successfully');
      setError('Demande d\'amitié envoyée !');
      setTimeout(() => setError(null), 3000);
      await searchUsers(searchTerm);
    } catch (error) {
      logError('Error sending friend request:', error);
      setError('Erreur lors de l\'envoi de la demande');
      setTimeout(() => setError(null), 3000);
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    try {
      const status = action === 'accept' ? 'accepted' : 'rejected';
      
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh friend requests and friends
      await Promise.all([
        loadFriendRequests(user.id),
        loadFriends(user.id)
      ]);

      const message = action === 'accept' ? 'Demande acceptée !' : 'Demande refusée';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      logError('Error responding to friend request:', error);
      setError('Erreur lors de la réponse');
      setTimeout(() => setError(null), 3000);
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
        await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            display_name: 'Utilisateur',
            is_private: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      // Profile creation might fail, that's ok
      logError('Could not ensure profile exists', error);
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
  }, [searchTerm, user]);

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <Navigation />
        <div className={styles.loginPrompt}>
          <h2>👥 Connectez-vous pour accéder à vos amis</h2>
          <p>Découvrez et connectez-vous avec d'autres passionnés de cuisine</p>
          <a href="/login" className={styles.loginButton}>Se connecter</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={`${styles.errorBanner} ${error.includes('envoyée') || error.includes('acceptée') || error.includes('refusée') ? styles.success : ''}`}>
          {error}
        </div>
      )}

      {/* Header mobile moderne */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.mobileBackBtn}
          onClick={() => router.back()}
        >
          ←
        </button>
        <div className={styles.mobileTitle}>
          <h1>👥 Amis</h1>
          <p className={styles.subtitle}>Votre communauté culinaire</p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={`${styles.notificationBtn} ${friendRequests.length > 0 ? styles.hasNotifications : ''}`}
          >
            🔔
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className={styles.mobileContent}>
        {/* Section de recherche */}
        <section className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <div className={styles.searchIcon}>🔍</div>
            <input
              type="text"
              placeholder="Rechercher des amis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchLoading && <div className={styles.searchSpinner}>⟳</div>}
            {searchTerm && (
              <button 
                className={styles.clearSearch}
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                🔍 Résultats de recherche
                <span className={styles.sectionBadge}>{searchResults.length}</span>
              </h2>
            </div>
            {searchResults.map((profile) => (
              <div key={profile.user_id} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.display_name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {profile.display_name?.charAt(0)?.toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                  <div className={styles.userDetails}>
                    <h4>{profile.display_name || 'Utilisateur'}</h4>
                    <p>{profile.bio || 'Passionné de cuisine'}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(profile.user_id)}
                  className={styles.actionButton}
                >
                  ➕ Ajouter
                </button>
              </div>
            ))}
          </section>
        )}

        {/* Demandes d'amitié */}
        {friendRequests.length > 0 && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                📬 Demandes d'amitié
                <span className={styles.sectionBadge}>{friendRequests.length}</span>
              </h2>
            </div>
            {friendRequests.map((request) => (
              <div key={request.id} className={styles.userCard}>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {request.profiles?.avatar_url ? (
                      <img src={request.profiles.avatar_url} alt={request.profiles.display_name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {request.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'
                        }
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
                    ✓ Accepter
                  </button>
                  <button
                    onClick={() => respondToFriendRequest(request.id, 'decline')}
                    className={styles.declineButton}
                  >
                    ✕ Refuser
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Liste des amis */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              👥 Mes amis
              <span className={styles.sectionBadge}>{friends.length}</span>
            </h2>
          </div>
          {friends.length > 0 ? (
            <div className={styles.friendsGrid}>
              {friends.map((friendship) => (
                <div key={friendship.id} className={styles.friendCard}>
                  <div className={styles.avatar}>
                    {friendship.profiles?.avatar_url ? (
                      <img src={friendship.profiles.avatar_url} alt={friendship.profiles.display_name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {friendship.profiles?.display_name?.charAt(0)?.toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                  <h4>{friendship.profiles?.display_name || 'Utilisateur'}</h4>
                  <p>{friendship.profiles?.bio || 'Passionné de cuisine'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🍳</div>
              <h3>Aucun ami pour le moment</h3>
              <p>Utilisez la recherche pour trouver des amis passionnés de cuisine !</p>
            </div>
          )}
        </section>

        {/* Suggestions d'amis */}
        {suggestions.length > 0 && (
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                💡 Suggestions d'amis
              </h2>
            </div>
            <div className={styles.friendsGrid}>
              {suggestions.map((suggestion) => (
                <div key={suggestion.user_id} className={styles.friendCard}>
                  <div className={styles.avatar}>
                    {suggestion.avatar_url ? (
                      <img src={suggestion.avatar_url} alt={suggestion.display_name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {suggestion.display_name?.charAt(0)?.toUpperCase() || '👤'}
                      </div>
                    )}
                  </div>
                  <h4>{suggestion.display_name || 'Utilisateur'}</h4>
                  <p>{suggestion.bio || 'Passionné de cuisine'}</p>
                  <button
                    onClick={() => sendFriendRequest(suggestion.user_id)}
                    className={`${styles.actionButton} ${styles.secondary}`}
                    style={{ marginTop: '12px', fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    ➕ Ajouter
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
