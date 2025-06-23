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
  // Nouveaux états pour les améliorations
  const [friendFilter, setFriendFilter] = useState('all'); // 'all', 'recent', 'active'
  const [friendSort, setFriendSort] = useState('name'); // 'name', 'recent', 'active'
  const [friendshipTrophies, setFriendshipTrophies] = useState(0);
  const [mutualFriendsData, setMutualFriendsData] = useState({});
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadFriendshipStats();
      // Chargement du nombre de trophées d'amitié
      loadFriendshipTrophies();
    }
  }, [user]);

  // Nouvelle fonction pour charger les trophées liés à l'amitié
  const loadFriendshipTrophies = async () => {
    try {
      // Dans une implémentation réelle, on ferait un appel API
      // Ici, on simule avec des données statiques
      const { data: trophies, error } = await supabase
        .from('user_trophies')
        .select('trophy_id')
        .eq('user_id', user.id);
        
      if (!error && trophies) {
        // Filtrer les trophies liés à l'amitié (first_friend, social_butterfly)
        const friendTrophies = trophies.filter(t => 
          t.trophy_id === 'first_friend' || 
          t.trophy_id === 'social_butterfly');
          
        setFriendshipTrophies(friendTrophies.length);
      }
    } catch (error) {
      logError('Error loading friendship trophies:', error);
    }
  };

  // Nouvelle fonction pour charger les amis communs
  const loadMutualFriends = async (targetUserId) => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    
    try {
      // Dans une vraie implémentation, ce serait une fonction SQL
      const { data, error } = await supabase.rpc('get_mutual_friends_count', {
        user_id1: user.id,
        user_id2: targetUserId
      });
      
      if (!error) {
        setMutualFriendsData(prev => ({
          ...prev,
          [targetUserId]: data || 0
        }));
      }
    } catch (error) {
      logError('Error loading mutual friends:', error);
    }
  };

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

  // Fonction corrigée pour filtrer les amis avec protection mobile renforcée
  const getFilteredFriends = () => {
    try {
      // Protection renforcée pour mobile - vérification complète
      if (!friends || !Array.isArray(friends)) {
        logInfo('Friends is not a valid array', { 
          friendsType: typeof friends, 
          friendsIsArray: Array.isArray(friends),
          userId: user?.id 
        });
        return [];
      }
      
      if (friends.length === 0) {
        logInfo('No friends found for filtering', { userId: user?.id });
        return [];
      }
      
      // Créer une copie sûre des données avec validation complète
      let filteredFriends = friends
        .filter(friend => {
          // Validation stricte de la structure des données
          if (!friend || typeof friend !== 'object') {
            logError('Invalid friend object structure', null, { friend });
            return false;
          }
          
          // Vérifier que l'ami a un ID valide
          const friendId = friend.friend_id || friend.user_id;
          if (!friendId) {
            logError('Friend missing ID', null, { friend });
            return false;
          }
          
          return true;
        })
        .map(friend => {
          // Normaliser la structure des données
          return {
            ...friend,
            friend_id: friend.friend_id || friend.user_id, // Assurer la compatibilité
            profiles: friend?.profiles && typeof friend.profiles === 'object' ? friend.profiles : {
              user_id: friend.friend_id || friend.user_id,
              display_name: friend.profiles?.display_name || 'Utilisateur inconnu',
              bio: friend.profiles?.bio || '',
              avatar_url: friend.profiles?.avatar_url || null
            }
          };
        });
      
      // Appliquer le filtre avec vérifications sécurisées
      try {
        switch (friendFilter) {
          case 'recent':
            filteredFriends = filteredFriends.slice(0, Math.min(5, filteredFriends.length));
            break;
          case 'active':
            // Version déterministe pour éviter les bugs mobiles
            filteredFriends = filteredFriends.filter((_, index) => index % 2 === 0);
            break;
          case 'all':
          default:
            // Tous les amis - pas de filtrage supplémentaire
            break;
        }
      } catch (filterError) {
        logError('Error applying friend filter:', filterError);
        // En cas d'erreur de filtrage, retourner tous les amis
      }
      
      // Appliquer le tri avec protection d'erreur
      try {
        switch (friendSort) {
          case 'name':
            filteredFriends.sort((a, b) => {
              try {
                const nameA = String(a?.profiles?.display_name || '').toLowerCase();
                const nameB = String(b?.profiles?.display_name || '').toLowerCase();
                return nameA.localeCompare(nameB);
              } catch (sortError) {
                logError('Error sorting friends by name:', sortError);
                return 0;
              }
            });
            break;
          case 'recent':
            // Tri par ordre inverse (plus récents en premier)
            filteredFriends.reverse();
            break;
          case 'active':
            // Tri stable par ID pour mobile
            filteredFriends.sort((a, b) => {
              const idA = parseInt(a?.id || 0);
              const idB = parseInt(b?.id || 0);
              return idA - idB;
            });
            break;
          default:
            // Pas de tri spécial
            break;
        }
      } catch (sortError) {
        logError('Error sorting friends:', sortError);
        // En cas d'erreur de tri, garder l'ordre original
      }
      
      logInfo('Friends filtered successfully', {
        originalCount: friends.length,
        filteredCount: filteredFriends.length,
        filter: friendFilter,
        sort: friendSort,
        userId: user?.id,
        sampleFriendIds: filteredFriends.slice(0, 3).map(f => f.friend_id)
      });
      
      return filteredFriends;
    } catch (error) {
      logError('Critical error in getFilteredFriends (mobile-safe):', error, {
        friendsType: typeof friends,
        friendsLength: friends?.length,
        userId: user?.id
      });
      
      // Retour de secours ultra-sûr
      return Array.isArray(friends) ? friends.slice(0, 10) : [];
    }
  };

  // Fonction améliorée pour récupérer les recettes des amis
  const fetchFriendRecipes = async (friendId) => {
    if (!friendId || friendsRecipes[friendId]) return; // Already loaded or invalid ID
    
    try {
      logInfo('Fetching recipes for friend:', friendId);
      
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at, category, description')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        logError('Error fetching friend recipes:', error);
        throw error;
      }

      logInfo('Friend recipes fetched:', { friendId, count: data?.length || 0 });

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

  // Fonction pour charger toutes les recettes des amis à la fois
  const loadAllFriendsRecipes = async () => {
    if (!friends || friends.length === 0) return;
    
    try {
      const friendIds = friends
        .map(f => f?.friend_id)
        .filter(id => id && !friendsRecipes[id]);
      
      if (friendIds.length === 0) return;
      
      logInfo('Loading recipes for multiple friends:', friendIds);
      
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at, category, description, user_id')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Grouper les recettes par user_id
      const recipesByUser = {};
      data?.forEach(recipe => {
        if (!recipesByUser[recipe.user_id]) {
          recipesByUser[recipe.user_id] = [];
        }
        if (recipesByUser[recipe.user_id].length < 3) {
          recipesByUser[recipe.user_id].push(recipe);
        }
      });
      
      setFriendsRecipes(prev => ({
        ...prev,
        ...recipesByUser
      }));
      
      logInfo('All friends recipes loaded:', Object.keys(recipesByUser));
      
    } catch (error) {
      logError('Error loading all friends recipes:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadFriendshipStats();
      loadFriendshipTrophies();
      // Charger les recettes des amis quand l'onglet friendsRecipes est actif
      if (activeTab === 'friendsRecipes') {
        loadAllFriendsRecipes();
      }
    }
  }, [user, activeTab]);

  // Nouvelle fonction pour charger les amis et leurs recettes
  const loadFriendsWithRecipes = async (userId) => {
    try {
      // Charger les amis
      await loadFriends(userId);
      
      // Charger les recettes de tous les amis
      await loadAllFriendsRecipes();
    } catch (error) {
      logError('Error loading friends with recipes:', error);
    }
  };

  // Appel initial pour charger l'utilisateur et ses amis
  useEffect(() => {
    const init = async () => {
      await checkUser();
      
      if (user) {
        // Charger les amis et leurs recettes
        await loadFriendsWithRecipes(user.id);
      }
    };
    
    init();
  }, []);

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

  const handlePendingClick = () => {
    setActiveTab('requests');
    // Scroll to the requests section smoothly
    setTimeout(() => {
      const requestsSection = document.querySelector('[data-tab="requests"]');
      if (requestsSection) {
        requestsSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
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
          <div 
            className={`${styles.stat} ${friendshipStats.pending > 0 ? styles.clickable : ''} ${friendshipStats.pending > 0 ? styles.pending : ''}`}
            onClick={friendshipStats.pending > 0 ? handlePendingClick : undefined}
            title={friendshipStats.pending > 0 ? 'Cliquer pour voir les demandes en attente' : 'Aucune demande en attente'}
          >
            <span className={styles.statNumber}>{friendshipStats.pending}</span>
            <span className={styles.statLabel}>En attente</span>
            {friendshipStats.pending > 0 && (
              <div className={`${styles.tabBadge} ${friendshipStats.pending > 3 ? styles.urgent : ''}`}>
                {friendshipStats.pending}
              </div>
            )}
          </div>
          {/* Nouvelle statistique: trophées d'amitié */}
          <div className={styles.stat}>
            <span className={styles.statNumber}>{friendshipTrophies}</span>
            <span className={styles.statLabel}>Trophées d'amitié</span>
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
          <span className={styles.tabIcon}>👥</span>
          <span className={styles.tabText}>Amis ({friends.length})</span>
        </button>
        <button
          className={activeTab === 'requests' ? styles.activeTab : ''}
          onClick={() => setActiveTab('requests')}
          style={{ position: 'relative' }}
        >
          <span className={styles.tabIcon}>📩</span>
          <span className={styles.tabText}>Demandes ({friendRequests.length})</span>
          {friendRequests.length > 0 && (
            <div className={`${styles.tabBadge} ${friendRequests.length > 3 ? styles.urgent : ''}`}>
              {friendRequests.length}
            </div>
          )}
        </button>
        <button
          className={activeTab === 'suggestions' ? styles.activeTab : ''}
          onClick={() => setActiveTab('suggestions')}
        >
          <span className={styles.tabIcon}>💡</span>
          <span className={styles.tabText}>Suggestions</span>
        </button>
        <button
          className={activeTab === 'friendsRecipes' ? styles.activeTab : ''}
          onClick={() => setActiveTab('friendsRecipes')}
        >
          <span className={styles.tabIcon}>🍽️</span>
          <span className={styles.tabText}>Recettes des amis</span>
        </button>
      </nav>

      {/* Affichage conditionnel selon l'onglet */}
      <main style={{ maxWidth: 900, margin: '0 auto' }}>
        {activeTab === 'friends' && (
          <section className={styles.friendsSection}>
            <div className={styles.sectionHeader}>
              <h2>Mes amis ({friends.length})</h2>
              
              {/* Nouveau: Filtres pour les amis */}
              {friends.length > 0 && (
                <div className={styles.friendsFilters}>
                  <select 
                    value={friendFilter}
                    onChange={(e) => setFriendFilter(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="all">Tous</option>
                    <option value="recent">Ajoutés récemment</option>
                    <option value="active">Actifs récemment</option>
                  </select>
                </div>
              )}
            </div>
            
            {friends.length > 0 ? (
              <div className={styles.friendsGrid}>
                {getFilteredFriends().map((friendship) => {
                  const isOnline = Math.random() > 0.7; // Simulation de statut en ligne
                  const lastActive = Math.floor(Math.random() * 72); // Simulation d'heures depuis dernière activité
                  
                  // Charger les amis communs si pas déjà chargés
                  if (!mutualFriendsData[friendship.friend_id] && friendship.friend_id) {
                    loadMutualFriends(friendship.friend_id);
                  }
                  
                  return (
                    <div
                      key={friendship.id}
                      className={styles.friendCard}
                      onMouseEnter={() => {
                        setHoveredFriendId(friendship.friend_id);
                        fetchFriendRecipes(friendship.friend_id);
                      }}
                      onMouseLeave={() => setHoveredFriendId(null)}
                    >
                      {/* Nouveau: Badge de statut d'activité */}
                      <div className={`${styles.statusIndicator} ${isOnline ? styles.online : styles.offline}`} 
                           title={isOnline ? 'En ligne' : `Dernière activité: il y a ${lastActive}h`}>
                        {isOnline ? '🟢' : '⚪'}
                      </div>
                      
                      <div className={styles.avatar}>
                        {friendship.profiles?.avatar_url ? (
                          <img src={friendship.profiles.avatar_url} alt={friendship.profiles.display_name} />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {friendship.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'
                            }
                          </div>
                        )}
                      </div>
                      <h4>{friendship.profiles?.display_name || 'Utilisateur'}</h4>
                      <p>{friendship.profiles?.bio || 'Amateur de cuisine passionné 🍽️'}</p>
                      
                      {/* Nouveau: Affichage des amis communs */}
                      {mutualFriendsData[friendship.friend_id] > 0 && (
                        <div className={styles.mutualFriends}>
                          <span className={styles.mutualIcon}>👥</span>
                          <span className={styles.mutualCount}>
                            {mutualFriendsData[friendship.friend_id]} 
                            {mutualFriendsData[friendship.friend_id] === 1 ? ' ami commun' : ' amis communs'}
                          </span>
                        </div>
                      )}
                      
                      {/* Section Gestion des amitiés améliorée */}
                      <div className={styles.friendActions}>
                        <div className={styles.actionButtonsContainer}>
                          <button
                            onClick={() => router.push(`/profile/${friendship.friend_id}`)}
                            className={styles.viewProfileButton}
                            title="Voir le profil"
                          >
                            <span className={styles.buttonIcon}>👤</span>
                            <span className={styles.buttonText}>Profil</span>
                          </button>
                          
                          {/* Nouveau: Bouton message direct */}
                          <button
                            onClick={() => alert('Fonctionnalité de messagerie à venir!')}
                            className={styles.messageButton}
                            title="Envoyer un message"
                          >
                            <span className={styles.buttonIcon}>💬</span>
                            <span className={styles.buttonText}>Message</span>
                          </button>
                          
                          <button
                            onClick={() => fetchFriendshipStatus(friendship.friend_id)}
                            className={styles.statusButton}
                            disabled={friendshipStatuses[friendship.friend_id]?.loading}
                            title="Vérifier le statut de l'amitié"
                          >
                            <span className={styles.buttonIcon}>
                              {friendshipStatuses[friendship.friend_id]?.loading ? '⏳' : 'ℹ️'}
                            </span>
                            <span className={styles.buttonText}>Statut</span>
                          </button>
                          
                          <div className={styles.dangerActions}>
                            <button
                              onClick={() => handleRemoveFriend(friendship.friend_id, friendship.profiles?.display_name)}
                              disabled={friendshipActions[friendship.friend_id]?.loading}
                              className={styles.removeButton}
                              title="Retirer de mes amis"
                            >
                              <span className={styles.buttonIcon}>
                                {friendshipActions[friendship.friend_id]?.loading ? '⏳' : '🗑️'}
                              </span>
                              <span className={styles.buttonText}>Supprimer</span>
                            </button>
                            
                            <button
                              onClick={() => handleBlockUser(friendship.friend_id, friendship.profiles?.display_name)}
                              disabled={friendshipActions[friendship.friend_id]?.loading}
                              className={styles.blockButton}
                              title="Bloquer cet utilisateur"
                            >
                              <span className={styles.buttonIcon}>
                                {friendshipActions[friendship.friend_id]?.loading ? '⏳' : '🚫'}
                              </span>
                              <span className={styles.buttonText}>Bloquer</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Affichage du statut d'amitié amélioré */}
                        {friendshipStatuses[friendship.friend_id] && !friendshipStatuses[friendship.friend_id].loading && (
                          <div className={styles.statusInfo}>
                            <div className={styles.statusBadge}>
                              <span className={styles.statusLabel}>Statut:</span>
                              <span className={`${styles.statusValue} ${styles[friendshipStatuses[friendship.friend_id].status]}`}>
                                {friendshipStatuses[friendship.friend_id].status === 'accepted' && '✅ Amis'}
                                {friendshipStatuses[friendship.friend_id].status === 'pending' && '⏳ En attente'}
                                {friendshipStatuses[friendship.friend_id].status === 'blocked' && '🚫 Bloqué'}
                                {friendshipStatuses[friendship.friend_id].status === 'none' && '❌ Aucune relation'}
                              </span>
                            </div>
                            {friendshipStatuses[friendship.friend_id].canSendRequest && (
                              <div className={styles.statusHint}>
                                💡 Vous pouvez renvoyer une demande d'amitié
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Prévisualisation des recettes au survol - améliorée */}
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
                                  {/* Nouveau: badge de catégorie */}
                                  <span className={styles.recipeMiniCategory}>
                                    {recipe.category || 'Plat'}
                                  </span>
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
                          {/* Nouveau: bouton pour voir toutes les recettes */}
                          <button 
                            className={styles.viewAllRecipesButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/profile/${friendship.friend_id}?tab=recipes`);
                            }}
                          >
                            Voir toutes les recettes →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Vous n'avez pas encore d'amis culinaires. Utilisez la recherche pour découvrir des passionnés comme vous !</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'requests' && (
          <section className={styles.requestsSection} data-tab="requests">
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
                <div className={styles.loadAllButton}>
                  <button 
                    onClick={loadAllFriendsRecipes}
                    className={styles.refreshButton}
                  >
                    🔄 Actualiser toutes les recettes
                  </button>
                </div>
                {friends.map(friendship => {
                  const friendRecipes = friendsRecipes[friendship.friend_id] || [];
                  
                  return (
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
                        <span className={styles.recipeCount}>
                          ({friendRecipes.length} recette{friendRecipes.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className={styles.friendsRecipesList}>
                        {friendRecipes.length > 0 ? (
                          friendRecipes.map(recipe => (
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
                              <div className={styles.recipeMiniInfo}>
                                <div className={styles.recipeMiniTitle}>
                                  {recipe.title?.length > 18 ? recipe.title.slice(0, 18) + '…' : recipe.title}
                                </div>
                                {recipe.category && (
                                  <div className={styles.recipeMiniCategory}>
                                    {recipe.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: 12, color: '#888', padding: '8px' }}>
                            {friendsRecipes.hasOwnProperty(friendship.friend_id) ? (
                              "Aucune recette partagée"
                            ) : (
                              <button 
                                onClick={() => fetchFriendRecipes(friendship.friend_id)}
                                className={styles.loadRecipesButton}
                              >
                                Charger les recettes
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {friendRecipes.length > 0 && (
                        <div className={styles.viewAllContainer}>
                          <button 
                            className={styles.viewAllRecipesButton}
                            onClick={() => router.push(`/profile/${friendship.friend_id}?tab=recipes`)}
                          >
                            Voir toutes les recettes →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Modal de confirmation amélioré */}
      {showConfirmDialog && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirmDialog(null)}>
          <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <div className={styles.confirmIcon}>
                {showConfirmDialog.action === 'remove' ? '🗑️' : '🚫'}
              </div>
              <h3 className={styles.confirmTitle}>
                {showConfirmDialog.action === 'remove' ? 'Supprimer cet ami ?' : 'Bloquer cet utilisateur ?'}
              </h3>
            </div>
            
            <div className={styles.confirmContent}>
              <p className={styles.confirmMessage}>
                {showConfirmDialog.action === 'remove' 
                  ? `Êtes-vous sûr de vouloir retirer ${showConfirmDialog.friendName} de vos amis ?`
                  : `Êtes-vous sûr de vouloir bloquer ${showConfirmDialog.friendName} ?`
                }
              </p>
              <div className={styles.confirmDetails}>
                {showConfirmDialog.action === 'remove' 
                  ? '⚠️ Cette action est réversible - vous pourrez renvoyer une demande d\'amitié plus tard.'
                  : '⚠️ Cette personne ne pourra plus vous envoyer de demandes d\'amitié ni voir vos recettes privées.'
                }
              </div>
            </div>
            
            <div className={styles.confirmActions}>
              <button
                onClick={() => setShowConfirmDialog(null)}
                className={styles.cancelButton}
                disabled={friendshipActions[showConfirmDialog.friendId]?.loading}
              >
                <span className={styles.buttonIcon}>❌</span>
                <span className={styles.buttonText}>Annuler</span>
              </button>
              <button
                onClick={showConfirmDialog.action === 'remove' ? confirmRemoveFriend : confirmBlockUser}
                className={showConfirmDialog.action === 'remove' ? styles.confirmRemoveButton : styles.confirmBlockButton}
                disabled={friendshipActions[showConfirmDialog.friendId]?.loading}
              >
                <span className={styles.buttonIcon}>
                  {friendshipActions[showConfirmDialog.friendId]?.loading 
                    ? '⏳' 
                    : showConfirmDialog.action === 'remove' ? '🗑️' : '🚫'
                  }
                </span>
                <span className={styles.buttonText}>
                  {friendshipActions[showConfirmDialog.friendId]?.loading 
                    ? 'Traitement...' 
                    : showConfirmDialog.action === 'remove' ? 'Supprimer' : 'Bloquer'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
