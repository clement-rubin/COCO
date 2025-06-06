import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../utils/logger';
import styles from '../styles/Amis.module.css';
import { useRouter } from 'next/router';
import { blockUser, unblockUser, getFriendshipStatus, removeFriend, getFriendshipStats } from '../utils/profileUtils';

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
  const [friendshipActions, setFriendshipActions] = useState({});
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'suggestions', 'friendsRecipes'
  const [friendsRecipes, setFriendsRecipes] = useState({});
  const [hoveredFriendId, setHoveredFriendId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);
  const [friendshipStats, setFriendshipStats] = useState({ friends: 0, pending: 0, blocked: 0 });
  const [sentRequests, setSentRequests] = useState(new Set());
  const [successCards, setSuccessCards] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadFriendshipStats();
    }
  }, [user]);

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

  const showToast = (message, isError = false) => {
    setToastMessage({ message, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const markCardAsSuccess = (userId) => {
    setSuccessCards(prev => new Set([...prev, userId]));
    setTimeout(() => {
      setSuccessCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, 2000);
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
        showToast('Une demande d\'amitié existe déjà', true);
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
          showToast('Demande d\'amitié déjà envoyée', true);
        } else if (error.code === '23503') {
          showToast('Erreur de référence utilisateur - veuillez réessayer', true);
          logError('Foreign key constraint error:', error);
        } else {
          logError('Detailed error sending friend request:', error);
          showToast(`Erreur: ${error.message}`, true);
        }
      } else {
        logInfo('Friend request sent successfully', newFriendship);
        
        // Marquer la demande comme envoyée
        setSentRequests(prev => new Set([...prev, friendId]));
        markCardAsSuccess(friendId);
        showToast('Demande d\'amitié envoyée avec succès ! 🎉');
        
        // Rafraîchir les résultats de recherche
        if (searchTerm) {
          await searchUsers(searchTerm);
        }
      }
    } catch (error) {
      logError('Error sending friend request:', error);
      showToast('Erreur lors de l\'envoi de la demande', true);
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

  // Ajout état pour la gestion des amitiés
  const [friendshipStatuses, setFriendshipStatuses] = useState({});
  const fetchFriendshipStatus = async (friendId) => {
    setFriendshipStatuses(prev => ({ ...prev, [friendId]: { loading: true } }));
    try {
      const status = await getFriendshipStatus(user.id, friendId);
      setFriendshipStatuses(prev => ({ ...prev, [friendId]: { ...status, loading: false } }));
    } catch (error) {
      setFriendshipStatuses(prev => ({ ...prev, [friendId]: { status: 'error', loading: false } }));
    }
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    setShowConfirmDialog({
      friendId,
      friendName,
      action: 'remove'
    });
  };

  const confirmRemoveFriend = async () => {
    if (!showConfirmDialog) return;
    
    const { friendId } = showConfirmDialog;
    setFriendshipActions(prev => ({ ...prev, [friendId]: { loading: true } }));
    
    try {
      const result = await removeFriend(user.id, friendId);
      if (result.success) {
        showMessage(`${showConfirmDialog.friendName} a été retiré de vos amis`);
        await Promise.all([
          loadFriends(user.id),
          loadFriendshipStats()
        ]);
      } else {
        showMessage(result.error || 'Erreur lors de la suppression', true);
      }
    } catch (error) {
      showMessage('Erreur lors de la suppression de l\'ami', true);
    } finally {
      setFriendshipActions(prev => ({ ...prev, [friendId]: { loading: false } }));
      setShowConfirmDialog(null);
    }
  };

  const handleBlockUser = async (friendId, friendName) => {
    setShowConfirmDialog({
      friendId,
      friendName,
      action: 'block'
    });
  };

  const confirmBlockUser = async () => {
    if (!showConfirmDialog) return;
    
    const { friendId } = showConfirmDialog;
    setFriendshipActions(prev => ({ ...prev, [friendId]: { loading: true } }));
    
    try {
      const result = await blockUser(user.id, friendId);
      if (result.success) {
        showMessage(`${showConfirmDialog.friendName} a été bloqué`);
        await Promise.all([
          loadFriends(user.id),
          loadFriendshipStats()
        ]);
      } else {
        showMessage(result.error || 'Erreur lors du blocage', true);
      }
    } catch (error) {
      showMessage('Erreur lors du blocage', true);
    } finally {
      setFriendshipActions(prev => ({ ...prev, [friendId]: { loading: false } }));
      setShowConfirmDialog(null);
    }
  };

  const loadFriendshipStats = async () => {
    if (!user) return;
    try {
      const stats = await getFriendshipStats(user.id);
      setFriendshipStats(stats);
    } catch (error) {
      logError('Error loading friendship stats:', error);
    }
  };

  const fetchFriendRecipes = async (friendId) => {
    if (friendsRecipes[friendId]) return; // Already loaded
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at')
        .eq('user_id', friendId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      setFriendsRecipes(prev => ({
        ...prev,
        [friendId]: data || []
      }));
    } catch (error) {
      logError('Error fetching friend recipes:', error);
      setFriendsRecipes(prev => ({
        ...prev,
        [friendId]: []
      }));
    }
  };

  const searchSection = (
    <div className={styles.searchSection}>
      <div className={styles.searchBox}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Rechercher des utilisateurs par nom..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoComplete="off"
        />
        {searchLoading && (
          <span className={styles.searchSpinner} title="Recherche...">🔄</span>
        )}
      </div>
    </div>
  );

  const renderSearchResults = () => {
    if (searchLoading) {
      return <div style={{ color: '#888', padding: 12 }}>Recherche en cours...</div>;
    }

    if (searchResults.length === 0) {
      return <div style={{ color: '#888', padding: 12 }}>Aucun utilisateur trouvé</div>;
    }

    return searchResults.map(user => {
      const isRequestSent = sentRequests.has(user.user_id);
      const isSuccess = successCards.has(user.user_id);
      const isLoading = buttonStates[`add-${user.user_id}`]?.loading;
      
      return (
        <div
          key={user.user_id}
          className={`${styles.userCard} ${isRequestSent ? styles.requestSent : ''} ${isSuccess ? styles.success : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 8,
            animation: 'cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55)'
          }}
        >
          {isRequestSent && (
            <div className={`${styles.statusBadge} ${styles.sent}`}>
              Demande envoyée
            </div>
          )}
          
          <div className={styles.avatar}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {user.display_name?.charAt(0)?.toUpperCase() || '👤'}
              </div>
            )}
          </div>
          <div className={styles.userDetails}>
            <h4>{user.display_name || 'Utilisateur'}</h4>
            <p>{user.bio || ''}</p>
          </div>
          <button
            onClick={() => sendFriendRequest(user.user_id)}
            className={`${styles.addFriendButton} ${isRequestSent ? styles.sent : ''} ${isLoading ? styles.loading : ''}`}
            disabled={isLoading || isRequestSent}
          >
            {isRequestSent ? 'Envoyée' : isLoading ? 'Envoi...' : '🤝 Ajouter'}
          </button>
        </div>
      );
    });
  };

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
      {/* Header moderne avec statistiques */}
      <header className={styles.header}>
        <h1>👥 Mes amis COCO</h1>
        <p>Retrouvez, ajoutez et gérez vos amis culinaires pour partager vos meilleures recettes !</p>
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{friendshipStats.friends}</span>
            <span className={styles.statLabel}>Amis</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{friendshipStats.pending}</span>
            <span className={styles.statLabel}>En attente</span>
          </div>
        </div>
      </header>

      {/* Toast notification */}
      {toastMessage && (
        <div className={`${styles.toastNotification} ${toastMessage.isError ? styles.error : ''}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Affichage des messages d'erreur/succès */}
      {(error || successMessage) && (
        <div className={styles.errorMessage} style={{ margin: '0 auto', maxWidth: 540 }}>
          {error ? error : successMessage}
        </div>
      )}

      {/* Barre de recherche d'utilisateurs */}
      {searchSection}

      {/* Résultats de recherche d'utilisateurs */}
      {searchTerm.length >= 2 && (
        <div className={styles.searchSection}>
          <div className={styles.searchResults}>
            <h3>Résultats de recherche</h3>
            {renderSearchResults()}
          </div>
        </div>
      )}

      {/* Onglets de navigation */}
      <nav className={styles.tabs} style={{ marginTop: 24, marginBottom: 24 }}>
        <button
          className={activeTab === 'friends' ? styles.activeTab : ''}
          onClick={() => setActiveTab('friends')}
        >
          👥 Amis ({friends.length})
        </button>
        <button
          className={activeTab === 'requests' ? styles.activeTab : ''}
          onClick={() => setActiveTab('requests')}
        >
          📩 Demandes ({friendRequests.length})
        </button>
        <button
          className={activeTab === 'suggestions' ? styles.activeTab : ''}
          onClick={() => setActiveTab('suggestions')}
        >
          💡 Suggestions
        </button>
        <button
          className={activeTab === 'friendsRecipes' ? styles.activeTab : ''}
          onClick={() => setActiveTab('friendsRecipes')}
        >
          🍽️ Recettes des amis
        </button>
      </nav>

      {/* Affichage conditionnel selon l'onglet */}
      <main style={{ maxWidth: 900, margin: '0 auto' }}>
        {activeTab === 'friends' && (
          <section className={styles.friendsSection}>
            <h2>Mes amis ({friends.length})</h2>
            {friends.length > 0 ? (
              <div className={styles.friendsGrid}>
                {friends.map((friendship) => (
                  <div
                    key={friendship.id}
                    className={styles.friendCard}
                    onMouseEnter={() => {
                      setHoveredFriendId(friendship.friend_id);
                      fetchFriendRecipes(friendship.friend_id);
                    }}
                    onMouseLeave={() => setHoveredFriendId(null)}
                  >
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
                    
                    {/* Section Gestion des amitiés améliorée */}
                    <div className={styles.friendActions}>
                      <strong>Actions</strong>
                      <div className={styles.actionButtons}>
                        <button
                          onClick={() => handleRemoveFriend(friendship.friend_id, friendship.profiles?.display_name)}
                          disabled={friendshipActions[friendship.friend_id]?.loading}
                          className={styles.removeButton}
                          title="Retirer de mes amis"
                        >
                          {friendshipActions[friendship.friend_id]?.loading ? '...' : '🗑️ Supprimer'}
                        </button>
                        <button
                          onClick={() => handleBlockUser(friendship.friend_id, friendship.profiles?.display_name)}
                          disabled={friendshipActions[friendship.friend_id]?.loading}
                          className={styles.blockButton}
                          title="Bloquer cet utilisateur"
                        >
                          {friendshipActions[friendship.friend_id]?.loading ? '...' : '🚫 Bloquer'}
                        </button>
                        <button
                          onClick={() => fetchFriendshipStatus(friendship.friend_id)}
                          className={styles.statusButton}
                          title="Vérifier le statut"
                        >
                          ℹ️ Statut
                        </button>
                      </div>
                      {/* Affichage du statut d'amitié */}
                      {friendshipStatuses[friendship.friend_id] && (
                        <div className={styles.statusInfo}>
                          Statut: <strong>{friendshipStatuses[friendship.friend_id].status}</strong>
                          {friendshipStatuses[friendship.friend_id].canSendRequest && (
                            <span className={styles.statusHint}> (peut renvoyer une demande)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Prévisualisation des recettes au survol */}
                    {hoveredFriendId === friendship.friend_id && (
                      <div className={styles.friendRecipesPreview}>
                        <strong>Recettes récentes :</strong>
                        {friendsRecipes[friendship.friend_id] && friendsRecipes[friendship.friend_id].length > 0 ? (
                          <div className={styles.recipesMiniGrid}>
                            {friendsRecipes[friendship.friend_id].map(recipe => (
                              <div
                                key={recipe.id}
                                className={styles.recipeMiniCard}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/recipe/${recipe.id}`);
                                }}
                              >
                                <div className={styles.recipeMiniImage}>
                                  <img
                                    src={recipe.image || '/placeholder-recipe.jpg'}
                                    alt={recipe.title}
                                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                                  />
                                </div>
                                <div className={styles.recipeMiniTitle}>
                                  {recipe.title?.length > 18 ? recipe.title.slice(0, 18) + '…' : recipe.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#888' }}>
                            {friendsRecipes[friendship.friend_id]
                              ? "Aucune recette partagée"
                              : "Chargement..."}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Vous n'avez pas encore d'amis culinaires. Utilisez la recherche pour découvrir des passionnés comme vous !</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'requests' && (
          <section className={styles.requestsSection}>
            <h2>Demandes d'amitié ({friendRequests.length})</h2>
            {friendRequests.map((request) => (
              <div key={request.id} className={styles.requestCard} style={{ animation: 'cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55)' }}>
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
            {friendRequests.length === 0 && (
              <div className={styles.emptyState}>
                <p>Aucune demande d'amitié en attente.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'suggestions' && (
          <section className={styles.suggestionsSection}>
            <h2>Suggestions d'amis</h2>
            <div className={styles.suggestionsGrid}>
              {suggestions.map((suggestion) => {
                const isRequestSent = sentRequests.has(suggestion.user_id);
                const isSuccess = successCards.has(suggestion.user_id);
                const isLoading = buttonStates[`add-${suggestion.user_id}`]?.loading;
                
                return (
                  <div 
                    key={suggestion.user_id} 
                    className={`${styles.suggestionCard} ${isRequestSent ? styles.requestSent : ''} ${isSuccess ? styles.success : ''}`}
                    style={{ animation: 'cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55)' }}
                  >
                    {isRequestSent && (
                      <div className={`${styles.statusBadge} ${styles.sent}`}>
                        Demande envoyée
                      </div>
                    )}
                    
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
                      className={`${styles.addFriendButton} ${isRequestSent ? styles.sent : ''} ${isLoading ? styles.loading : ''}`}
                      disabled={isLoading || isRequestSent}
                    >
                      {isRequestSent ? 'Envoyée' : isLoading ? 'Envoi...' : '🤝 Ajouter'}
                    </button>
                  </div>
                );
              })}
              {suggestions.length === 0 && (
                <div className={styles.emptyState}>
                  <p>Aucune suggestion pour le moment.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'friendsRecipes' && (
          <section className={styles.friendsRecipesSection}>
            <h2>Recettes de mes amis</h2>
            {friends.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Ajoutez des amis pour découvrir leurs recettes !</p>
              </div>
            ) : (
              <div className={styles.friendsRecipesGrid}>
                {friends.map(friendship => (
                  <div key={friendship.friend_id} className={styles.friendsRecipesBlock} style={{ animation: 'cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55)' }}>
                    <div className={styles.friendsRecipesHeader}>
                      <div className={styles.avatarMini}>
                        {friendship.profiles?.avatar_url ? (
                          <img src={friendship.profiles.avatar_url} alt={friendship.profiles.display_name} />
                        ) : (
                          <div className={styles.avatarPlaceholderMini}>
                            {friendship.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <span>{friendship.profiles?.display_name || 'Utilisateur'}</span>
                    </div>
                    <div className={styles.friendsRecipesList}>
                      {(friendsRecipes[friendship.friend_id] || []).length > 0 ? (
                        friendsRecipes[friendship.friend_id].map(recipe => (
                          <div
                            key={recipe.id}
                            className={styles.recipeMiniCard}
                            onClick={() => router.push(`/recipe/${recipe.id}`)}
                          >
                            <div className={styles.recipeMiniImage}>
                              <img
                                src={recipe.image || '/placeholder-recipe.jpg'}
                                alt={recipe.title}
                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                              />
                            </div>
                            <div className={styles.recipeMiniTitle}>
                              {recipe.title?.length > 18 ? recipe.title.slice(0, 18) + '…' : recipe.title}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: '#888' }}>
                          {friendsRecipes[friendship.friend_id]
                            ? "Aucune recette partagée"
                            : <button onClick={() => fetchFriendRecipes(friendship.friend_id)}>Charger</button>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Modal de confirmation */}
      {showConfirmDialog && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirmDialog(null)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <h3>
              {showConfirmDialog.action === 'remove' ? 'Supprimer cet ami ?' : 'Bloquer cet utilisateur ?'}
            </h3>
            <p>
              {showConfirmDialog.action === 'remove' 
                ? `Êtes-vous sûr de vouloir retirer ${showConfirmDialog.friendName} de vos amis ? Cette action est réversible.`
                : `Êtes-vous sûr de vouloir bloquer ${showConfirmDialog.friendName} ? Cette personne ne pourra plus vous envoyer de demandes d'amitié.`
              }
            </p>
            <div className={styles.confirmActions}>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className={styles.cancelButton}
              >
                Annuler
              </button>
              <button
                onClick={showConfirmDialog.action === 'remove' ? confirmRemoveFriend : confirmBlockUser}
                className={showConfirmDialog.action === 'remove' ? styles.removeButton : styles.blockButton}
                disabled={friendshipActions[showConfirmDialog.friendId]?.loading}
              >
                {friendshipActions[showConfirmDialog.friendId]?.loading 
                  ? '...' 
                  : showConfirmDialog.action === 'remove' ? 'Supprimer' : 'Bloquer'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
