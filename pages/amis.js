import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../utils/logger';
import styles from '../styles/Amis.module.css';
import { useRouter } from 'next/router';
import { blockUser, unblockUser, getFriendshipStatus, removeFriend, getFriendshipStats, getUserStats } from '../utils/profileUtils';

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
  const [userStats, setUserStats] = useState({ recipesCount: 0, friendsCount: 0, profileCompleteness: 0 });
  const router = useRouter();

  const normalizedFriends = useMemo(() => {
    if (!Array.isArray(friends) || friends.length === 0) {
      return [];
    }

    return friends
      .filter(friend => friend)
      .map(friend => {
        const friendId = friend.friend_id || friend.user_id;
        const profile = friend?.profiles || {};

        return {
          ...friend,
          friend_id: friendId,
          profiles: {
            user_id: friendId,
            display_name: profile.display_name || 'Utilisateur inconnu',
            bio: profile.bio || '',
            avatar_url: profile.avatar_url || null
          }
        };
      });
  }, [friends]);

  const friendActivity = useMemo(() => {
    const activity = {};

    Object.entries(friendsRecipes || {}).forEach(([friendId, recipes]) => {
      if (!Array.isArray(recipes) || recipes.length === 0) {
        return;
      }

      const sorted = [...recipes].sort((a, b) => {
        const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const latestRecipe = sorted[0];
      const latestDate = latestRecipe?.created_at ? new Date(latestRecipe.created_at) : null;
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const categories = new Set();
      sorted.forEach(recipe => {
        if (recipe?.category) {
          categories.add(recipe.category);
        }
      });

      activity[friendId] = {
        totalRecipes: recipes.length,
        latestRecipeAt: latestDate,
        hasRecentRecipe: latestDate ? latestDate >= fourteenDaysAgo : false,
        categories: Array.from(categories)
      };
    });

    return activity;
  }, [friendsRecipes]);

  const filteredFriends = useMemo(() => {
    if (normalizedFriends.length === 0) {
      return [];
    }

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    let result = [...normalizedFriends];

    if (friendFilter === 'recent') {
      const recentFriends = result.filter(friend => {
        const meta = friendActivity[friend.friend_id];
        return meta?.latestRecipeAt ? meta.latestRecipeAt >= fourteenDaysAgo : false;
      });
      if (recentFriends.length > 0) {
        result = recentFriends;
      }
    } else if (friendFilter === 'active') {
      const activeFriends = result.filter(friend => {
        const meta = friendActivity[friend.friend_id];
        return (meta?.totalRecipes || 0) > 0;
      });
      if (activeFriends.length > 0) {
        result = activeFriends;
      }
    }

    result.sort((a, b) => {
      if (friendSort === 'name') {
        const nameA = (a.profiles?.display_name || '').toLowerCase();
        const nameB = (b.profiles?.display_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }

      if (friendSort === 'recent') {
        const metaA = friendActivity[a.friend_id];
        const metaB = friendActivity[b.friend_id];
        const dateA = metaA?.latestRecipeAt ? metaA.latestRecipeAt.getTime() : new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = metaB?.latestRecipeAt ? metaB.latestRecipeAt.getTime() : new Date(b.updated_at || b.created_at || 0).getTime();
        return dateB - dateA;
      }

      if (friendSort === 'active') {
        const recipesA = friendActivity[a.friend_id]?.totalRecipes || 0;
        const recipesB = friendActivity[b.friend_id]?.totalRecipes || 0;
        if (recipesB !== recipesA) {
          return recipesB - recipesA;
        }
        return (a.profiles?.display_name || '').localeCompare(b.profiles?.display_name || '');
      }

      return 0;
    });

    return result;
  }, [normalizedFriends, friendFilter, friendSort, friendActivity]);

  const activeFriendsCount = useMemo(() => {
    return normalizedFriends.filter(friend => friendActivity[friend.friend_id]?.hasRecentRecipe).length;
  }, [normalizedFriends, friendActivity]);

  const totalFriendRecipes = useMemo(() => {
    return Object.values(friendActivity).reduce((total, meta) => total + (meta.totalRecipes || 0), 0);
  }, [friendActivity]);

  const quietFriends = useMemo(() => {
    if (normalizedFriends.length === 0) {
      return [];
    }

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    return normalizedFriends
      .map(friend => {
        const meta = friendActivity[friend.friend_id] || {};
        const latestRecipeAt = meta.latestRecipeAt || (friend.updated_at ? new Date(friend.updated_at) : null);

        return {
          ...friend,
          activity: meta,
          latestRecipeAt,
          isRecent: latestRecipeAt ? latestRecipeAt >= fourteenDaysAgo : false
        };
      })
      .filter(friend => !friend.isRecent)
      .sort((a, b) => {
        const recipesA = a.activity?.totalRecipes || 0;
        const recipesB = b.activity?.totalRecipes || 0;
        if (recipesA !== recipesB) {
          return recipesA - recipesB;
        }
        const dateA = a.latestRecipeAt ? a.latestRecipeAt.getTime() : 0;
        const dateB = b.latestRecipeAt ? b.latestRecipeAt.getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 4);
  }, [normalizedFriends, friendActivity]);

  const friendInsights = useMemo(() => {
    const totalFriends = normalizedFriends.length;
    const pendingRequests = friendshipStats.pending || 0;
    const quietCount = quietFriends.length;

    return [
      {
        key: 'friends',
        label: 'Amis connectés',
        value: totalFriends,
        accent: '#ff6b35',
        helper: totalFriends > 0 ? 'Communauté prête à cuisiner avec vous' : 'Invitez vos proches à rejoindre COCO'
      },
      {
        key: 'active',
        label: 'Actifs (14 j)',
        value: activeFriendsCount,
        accent: '#10b981',
        helper: activeFriendsCount > 0 ? 'Beaucoup de nouvelles recettes partagées' : 'Encouragez vos amis à publier une recette'
      },
      {
        key: 'recipes',
        label: 'Recettes partagées',
        value: totalFriendRecipes,
        accent: '#f97316',
        helper: totalFriendRecipes > 0 ? 'Inspirez-vous des créations de vos amis' : 'Soyez le premier à inspirer la communauté'
      },
      {
        key: 'quiet',
        label: 'À encourager',
        value: quietCount,
        accent: '#6366f1',
        helper: quietCount > 0 ? 'Un petit mot pour relancer la motivation' : 'Tout le monde est en pleine forme'
      },
      {
        key: 'pending',
        label: 'Demandes en attente',
        value: pendingRequests,
        accent: '#f59e0b',
        helper: pendingRequests > 0 ? 'Répondez aux invitations pour élargir votre cercle' : 'Aucune demande en attente pour le moment'
      }
    ].filter(Boolean);
  }, [normalizedFriends.length, activeFriendsCount, totalFriendRecipes, quietFriends.length, friendshipStats.pending]);

  const highlightFriends = useMemo(() => {
    return normalizedFriends
      .map(friend => ({
        ...friend,
        activity: friendActivity[friend.friend_id] || { totalRecipes: 0, hasRecentRecipe: false }
      }))
      .filter(friend => friend.activity.totalRecipes > 0)
      .sort((a, b) => {
        if (a.activity.totalRecipes === b.activity.totalRecipes) {
          const dateA = a.activity.latestRecipeAt ? a.activity.latestRecipeAt.getTime() : 0;
          const dateB = b.activity.latestRecipeAt ? b.activity.latestRecipeAt.getTime() : 0;
          return dateB - dateA;
        }
        return b.activity.totalRecipes - a.activity.totalRecipes;
      })
      .slice(0, 3);
  }, [normalizedFriends, friendActivity]);

  useEffect(() => {
    if (!user) return;

    highlightFriends.forEach(friend => {
      if (mutualFriendsData[friend.friend_id] === undefined) {
        loadMutualFriends(friend.friend_id);
      }
    });
  }, [user, highlightFriends]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadFriendshipStats();
      // Chargement du nombre de trophées d'amitié
      loadFriendshipTrophies();
      // Charger les vraies stats utilisateur
      loadUserStats();
    }
  }, [user]);

  // Nouvelle fonction pour charger les vraies stats utilisateur
  const loadUserStats = async () => {
    if (!user) return;
    try {
      const stats = await getUserStats(user.id);
      setUserStats(stats);
    } catch (error) {
      logError('Error loading user stats:', error);
    }
  };

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
      // D'abord, récupérer tous les utilisateurs avec qui on a déjà une relation
      const { data: existingRelations, error: relationsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (relationsError) {
        logError('Error loading existing relations:', relationsError);
        // Continue sans filtrage si on ne peut pas charger les relations
      }

      // Créer un Set des IDs à exclure
      const excludedUserIds = new Set([userId]); // Toujours exclure soi-même
      
      if (existingRelations) {
        existingRelations.forEach(relation => {
          if (relation.user_id === userId) {
            excludedUserIds.add(relation.friend_id);
          } else {
            excludedUserIds.add(relation.user_id);
          }
        });
      }

      // Récupérer des profils aléatoires en excluant les relations existantes
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .eq('is_private', false)
        .limit(20); // Prendre plus de profils pour avoir assez après filtrage

      if (profilesError) {
        if (profilesError.code === 'PGRST116') {
          logError('Profiles table not found');
          return;
        }
        throw profilesError;
      }

      // Filtrer les profils pour exclure les relations existantes
      const filteredProfiles = (allProfiles || [])
        .filter(profile => !excludedUserIds.has(profile.user_id))
        .slice(0, 5); // Limiter à 5 suggestions

      logInfo('Suggestions loaded:', {
        totalProfiles: allProfiles?.length || 0,
        excludedCount: excludedUserIds.size,
        suggestionsCount: filteredProfiles.length,
        excludedIds: Array.from(excludedUserIds).slice(0, 5) // Log quelques IDs pour debug
      });

      setSuggestions(filteredProfiles);
    } catch (error) {
      logError('Error loading suggestions:', error);
    }
  };

  // Nouvelle fonction pour rafraîchir les suggestions après changement d'amitié
  const refreshSuggestions = async () => {
    if (user) {
      await loadSuggestions(user.id);
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
        // Retirer cette personne des suggestions
        setSuggestions(prev => prev.filter(s => s.user_id !== friendId));
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
          // Retirer cette personne des suggestions
          setSuggestions(prev => prev.filter(s => s.user_id !== friendId));
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
        
        // Retirer cette personne des suggestions immédiatement
        setSuggestions(prev => prev.filter(s => s.user_id !== friendId));
        
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
        loadFriends(user.id),
        refreshSuggestions() // Rafraîchir les suggestions après changement
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
          loadFriendshipStats(),
          refreshSuggestions() // Rafraîchir les suggestions - la personne pourrait réapparaître
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

  // Fonction pour charger toutes les recettes des amis à la fois - VERSION MUTUELLE
  const loadAllFriendsRecipes = async () => {
    if (!friends || friends.length === 0) return;
    
    try {
      // Récupérer uniquement les amis avec lesquels on a une relation mutuelle acceptée
      const { data: mutualFriends, error: mutualError } = await supabase
        .from('friendships')
        .select(`
          user_id,
          friend_id,
          status,
          mutual_friendship:friendships!inner(
            id,
            status
          )
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .eq('mutual_friendship.status', 'accepted');

      if (mutualError) {
        logError('Error checking mutual friendships:', mutualError);
        // Fallback vers la méthode actuelle si la requête échoue
        const friendIds = friends
          .map(f => f?.friend_id)
          .filter(id => id && !friendsRecipes[id]);
        
        if (friendIds.length === 0) return;
        
        await loadRecipesForFriends(friendIds);
        return;
      }

      // Extraire les IDs des amis mutuels uniquement
      const mutualFriendIds = new Set();
      mutualFriends?.forEach(friendship => {
        if (friendship.user_id === user.id) {
          mutualFriendIds.add(friendship.friend_id);
        } else {
          mutualFriendIds.add(friendship.user_id);
        }
      });

      const friendIdsToLoad = Array.from(mutualFriendIds).filter(id => !friendsRecipes[id]);
      
      if (friendIdsToLoad.length === 0) return;
      
      logInfo('Loading recipes for mutual friends only:', friendIdsToLoad);
      
      await loadRecipesForFriends(friendIdsToLoad);
      
    } catch (error) {
      logError('Error loading mutual friends recipes:', error);
    }
  };

  // Fonction helper pour charger les recettes d'une liste d'amis
  const loadRecipesForFriends = async (friendIds) => {
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
    
    logInfo('Mutual friends recipes loaded:', Object.keys(recipesByUser));
  };

  // Fonction améliorée pour récupérer les recettes des amis - VERSION MUTUELLE
  const fetchFriendRecipes = async (friendId) => {
    if (!friendId || friendsRecipes[friendId]) return;
    
    try {
      // Vérifier d'abord que c'est bien un ami mutuel
      const { data: mutualCheck, error: mutualError } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
        .eq('status', 'accepted');

      if (mutualError || !mutualCheck || mutualCheck.length < 2) {
        logInfo('Not mutual friends, skipping recipes load:', { friendId, mutualCount: mutualCheck?.length });
        setFriendsRecipes(prev => ({
          ...prev,
          [friendId]: []
        }));
        return;
      }
      
      logInfo('Fetching recipes for mutual friend:', friendId);
      
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

      logInfo('Mutual friend recipes fetched:', { friendId, count: data?.length || 0 });

      setFriendsRecipes(prev => ({
        ...prev,
        [friendId]: data || []
      }));
    } catch (error) {
      logError('Error fetching mutual friend recipes:', error);
      setFriendsRecipes(prev => ({
        ...prev,
        [friendId]: []
      }));
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

  // Ajout d'une classe d'animation sur les sections lors du changement d'onglet
  const getSectionAnimationClass = () => {
    return styles.sectionAnimated;
  };

  // Ajout d'une classe d'animation sur les cartes
  const getCardAnimationClass = (index = 0) => {
    return `${styles.cardAnimated} ${styles[`cardDelay${index % 5}`]}`;
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

    return searchResults.map((user, index) => {
      const isRequestSent = sentRequests.has(user.user_id);
      const isSuccess = successCards.has(user.user_id);
      const isLoading = buttonStates[`add-${user.user_id}`]?.loading;

      return (
        <div
          key={user.user_id}
          className={`${styles.userCard} ${getCardAnimationClass(index)} ${isRequestSent ? styles.requestSent : ''} ${isSuccess ? styles.success : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 8,
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
    <div className={styles.container} style={{
      background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Éléments décoratifs de fond */}
      <div style={{
        position: 'fixed',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
        borderRadius: '50%',
        opacity: 0.08,
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '-60px',
        width: '120px',
        height: '120px',
        background: 'linear-gradient(45deg, #4caf50, #45a049)',
        borderRadius: '50%',
        opacity: 0.06,
        animation: 'float 8s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-50px',
        right: '10%',
        width: '100px',
        height: '100px',
        background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
        borderRadius: '50%',
        opacity: 0.05,
        animation: 'float 10s ease-in-out infinite'
      }} />

      {/* Hero section redessinée */}
      <section style={{
        width: '100%',
        background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
        padding: '80px 0 40px 0',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 0,
        marginTop: '-64px' // Compenser le padding-top du main
      }}>
        {/* Éléments décoratifs spécifiques au hero */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle at 60% 40%, #ff6b35 0%, transparent 70%)',
          opacity: 0.06,
          animation: 'float 12s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          right: '15%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle at 40% 60%, #4caf50 0%, transparent 70%)',
          opacity: 0.08,
          animation: 'float 10s ease-in-out infinite reverse'
        }} />

        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '24px 20px 0'
        }}>
          {/* Logo animé COCO-style */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 20px',
            boxShadow: '0 12px 35px rgba(255, 107, 53, 0.3), 0 6px 15px rgba(255, 107, 53, 0.15)',
            animation: 'heroLogo 3s ease-in-out infinite',
            border: '3px solid rgba(255, 255, 255, 0.9)',
            position: 'relative'
          }}>
            👥
            {/* Effet de brillance */}
            <div style={{
              position: 'absolute',
              top: '15%',
              left: '20%',
              width: '35%',
              height: '35%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(4px)',
              animation: 'shine 2s ease-in-out infinite'
            }} />
          </div>

          {/* Titre principal avec effet gradient */}
          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: '900',
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8a50 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
            lineHeight: '1',
            textShadow: '0 2px 10px rgba(255, 107, 53, 0.1)'
          }}>
            Mes Amis COCO
          </h1>

          {/* Sous-titre avec animation */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1f2937',
              lineHeight: '1.2'
            }}>
              Connectez-vous.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative'
              }}>
                Partagez.
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '0',
                  right: '0',
                  height: '2px',
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  borderRadius: '1px',
                  animation: 'expandLine 2s ease-in-out infinite'
                }} />
              </span>
              {' '}Cuisinez ensemble.
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.4',
              fontWeight: '500'
            }}>
              Votre communauté culinaire vous attend
            </p>
          </div>

          {/* Statistiques de la communauté avec design amélioré */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '28px',
            flexWrap: 'wrap'
          }}>
            {[{
              number: normalizedFriends.length,
              label: 'Amis',
              icon: '👥',
              color: '#ff6b35'
            },
            friendshipStats.pending > 0 ? {
              number: friendshipStats.pending,
              label: 'Demandes',
              icon: '⏳',
              color: '#f59e0b',
              clickable: true,
              onClick: handlePendingClick
            } : null,
            {
              number: activeFriendsCount,
              label: 'Actifs (14 j)',
              icon: '🔥',
              color: '#10b981'
            },
            {
              number: totalFriendRecipes,
              label: 'Recettes partagées',
              icon: '🍽️',
              color: '#f97316'
            }]
              .filter(Boolean)
              .map((stat, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(15px)',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: `2px solid ${stat.color}20`,
                  minWidth: '80px',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  cursor: stat.clickable ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  ...(stat.clickable && {
                    border: `2px solid ${stat.color}`,
                    transform: 'scale(1.02)'
                  })
                }}
                onClick={stat.onClick}
                onMouseEnter={stat.clickable ? (e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.05)'
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)'
                } : undefined}
                onMouseLeave={stat.clickable ? (e) => {
                  e.target.style.transform = 'translateY(0) scale(1.02)'
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)'
                } : undefined}
              >
                <div style={{ 
                  fontSize: '1.4rem', 
                  marginBottom: '6px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: stat.color,
                  marginBottom: '4px'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  fontWeight: '600'
                }}>
                  {stat.label}
                </div>
                {stat.clickable && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#f59e0b',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    animation: 'pulse 2s infinite'
                  }}>
                    !
                  </div>
                )}
              </div>
              ))
            }
          </div>

          {/* Actions rapides avec meilleur design */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setActiveTab('suggestions')}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '16px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)'
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.3)'
              }}
            >
              💡 Découvrir
            </button>
            {friendRequests.length > 0 && (
              <button
                onClick={() => setActiveTab('requests')}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#f59e0b',
                  border: '2px solid #f59e0b',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f59e0b'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  e.target.style.color = '#f59e0b'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                📩 Demandes ({friendRequests.length})
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#f59e0b',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  animation: 'pulse 2s infinite'
                }}>
                  {friendRequests.length}
                </span>
              </button>
            )}
          </div>

          {friendInsights.length > 0 && (
            <div className={styles.insightsGrid}>
              {friendInsights.map((insight, index) => (
                <div
                  key={insight.key}
                  className={styles.insightCard}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className={styles.insightValue} style={{ color: insight.accent }}>
                    {insight.value}
                  </div>
                  <div className={styles.insightLabel}>{insight.label}</div>
                  <p className={styles.insightHelper}>{insight.helper}</p>
                  {insight.key === 'quiet' && insight.value > 0 && (
                    <button
                      type="button"
                      className={styles.insightAction}
                      onClick={() => setActiveTab('friends')}
                    >
                      Encourager
                    </button>
                  )}
                  {insight.key === 'pending' && insight.value > 0 && (
                    <button
                      type="button"
                      className={styles.insightAction}
                      onClick={handlePendingClick}
                    >
                      Gérer les demandes
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Toast notification */}
      {toastMessage && (
        <div className={`${styles.toastNotification} ${styles.toastAnimated} ${toastMessage.isError ? styles.error : ''}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Affichage des messages d'erreur/succès */}
      {(error || successMessage) && (
        <div className={styles.errorMessage} style={{ 
          margin: '0 auto 24px auto', 
          maxWidth: 540,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 107, 53, 0.2)'
        }}>
          {error ? error : successMessage}
        </div>
      )}

      {/* Section de transition fluide */}
      <div style={{
        maxWidth: '900px',
        margin: '-20px auto 0',
        background: 'white',
        borderRadius: '28px 28px 0 0',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.1), 0 -4px 15px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2,
        minHeight: '60vh'
      }}>
        {/* Barre de recherche d'utilisateurs redessinée */}
        <div style={{
          padding: '32px 24px 20px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔍</span>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              Rechercher des amis
            </h3>
          </div
          >
          
          <div style={{
            position: 'relative',
            maxWidth: '400px'
          }}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Rechercher par nom d'utilisateur..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ff6b35'
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.boxShadow = 'none'
              }}
            />
            {searchLoading && (
              <div style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#ff6b35',
                fontSize: '1.2rem',
                animation: 'spin 1s linear infinite'
              }}>
                🔄
              </div>
            )}
          </div>
        </div>

        {/* Résultats de recherche améliorés */}
        {searchTerm.length >= 2 && (
          <div style={{
            padding: '0 24px 24px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #0ea5e9'
            }}>
              <h4 style={{
                margin: '0 0 16px 0',
                color: '#0369a1',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🎯</span> Résultats de recherche
              </h4>
              <div style={{
                display: 'grid',
                gap: '12px'
              }}>
                {renderSearchResults()}
              </div>
            </div>
          </div>
        )}

        {/* Navigation tabs redessinée */}
        <nav className={styles.tabs} style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
          borderBottom: '1px solid #f3f4f6',
          padding: '0 24px'
        }}>
          <button
            className={activeTab === 'friends' ? styles.activeTab : ''}
            onClick={() => setActiveTab('friends')}
            style={{
              position: 'relative',
              padding: '12px 16px',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '0.95rem',
              color: activeTab === 'friends' ? '#ff6b35' : '#374151',
              background: activeTab === 'friends' ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'friends' ? '0 4px 15px rgba(255, 107, 53, 0.2)' : 'none'
            }}
          >
            <span className={styles.tabIcon}>👥</span>
            <span className={styles.tabText}>Amis ({normalizedFriends.length})</span>
          </button>
          <button
            className={activeTab === 'requests' ? styles.activeTab : ''}
            onClick={() => setActiveTab('requests')}
            style={{
              position: 'relative',
              padding: '12px 16px',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '0.95rem',
              color: activeTab === 'requests' ? '#f59e0b' : '#374151',
              background: activeTab === 'requests' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'requests' ? '0 4px 15px rgba(245, 158, 11, 0.2)' : 'none'
            }}
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
            style={{
              position: 'relative',
              padding: '12px 16px',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '0.95rem',
              color: activeTab === 'suggestions' ? '#4caf50' : '#374151',
              background: activeTab === 'suggestions' ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'suggestions' ? '0 4px 15px rgba(76, 175, 80, 0.2)' : 'none'
            }}
          >
            <span className={styles.tabIcon}>💡</span>
            <span className={styles.tabText}>Suggestions</span>
          </button>
          <button
            className={activeTab === 'friendsRecipes' ? styles.activeTab : ''}
            onClick={() => setActiveTab('friendsRecipes')}
            style={{
              position: 'relative',
              padding: '12px 16px',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '0.95rem',
              color: activeTab === 'friendsRecipes' ? '#10b981' : '#374151',
              background: activeTab === 'friendsRecipes' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'friendsRecipes' ? '0 4px 15px rgba(16, 185, 129, 0.2)' : 'none'
            }}
          >
            <span className={styles.tabIcon}>🍽️</span>
            <span className={styles.tabText}>Recettes des amis</span>
          </button>
        </nav>

        {/* Contenu principal avec meilleur espacement */}
        <main style={{
          padding: '32px 24px',
          minHeight: '400px'
        }}>
          {activeTab === 'friends' && (
            <section className={`${styles.friendsSection} ${getSectionAnimationClass()}`}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleContainer}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>👥</span>
                    Mes amis
                    <span className={styles.friendsCount}>({normalizedFriends.length})</span>
                  </h2>
                  
                  {/* Badge de niveau simplifié */}
                  {normalizedFriends.length >= 10 && (
                    <div className={styles.achievementBadge}>
                      <span className={styles.badgeIcon}>
                        {normalizedFriends.length >= 50 ? '🌟' :
                         normalizedFriends.length >= 25 ? '⭐' : '✨'}
                      </span>
                      <span className={styles.badgeText}>
                        {normalizedFriends.length >= 50 ? 'Super Social' :
                         normalizedFriends.length >= 25 ? 'Très Social' : 'Social'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barre d'outils simplifiée */}
                {normalizedFriends.length > 0 && (
                  <div className={styles.friendsToolbar}>
                    <div className={styles.filterControls}>
                      <select 
                        value={friendFilter}
                        onChange={(e) => setFriendFilter(e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="all">Tous les amis</option>
                        <option value="recent">Récents</option>
                        <option value="active">Actifs</option>
                      </select>

                      <select 
                        value={friendSort}
                        onChange={(e) => setFriendSort(e.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="name">Par nom</option>
                        <option value="recent">Plus récents</option>
                        <option value="active">Plus actifs</option>
                      </select>
                    </div>

                    <div className={styles.quickActions}>
                      <button
                        onClick={() => setActiveTab('suggestions')}
                        className={styles.actionButton}
                      >
                        <span>💡</span>
                        Découvrir
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {normalizedFriends.length > 0 ? (
                <>
                  {/* Statistiques simplifiées */}
                  <div className={styles.friendsOverview}>
                    <div className={styles.overviewStat}>
                      <span className={styles.statValue}>{normalizedFriends.length}</span>
                      <span className={styles.statLabel}>Amis</span>
                    </div>
                    <div className={styles.overviewStat}>
                      <span className={styles.statValue}>{activeFriendsCount}</span>
                      <span className={styles.statLabel}>Actifs cette quinzaine</span>
                    </div>
                    <div className={styles.overviewStat}>
                      <span className={styles.statValue}>{totalFriendRecipes}</span>
                      <span className={styles.statLabel}>Recettes</span>
                    </div>
                  </div>

                  {quietFriends.length > 0 && (
                    <div className={styles.quietFriendsPanel}>
                      <div className={styles.quietHeader}>
                        <div>
                          <h3>Besoin d'encouragement ✨</h3>
                          <p>Un rappel amical peut aider ces amis à revenir partager leurs recettes.</p>
                        </div>
                        <button
                          type="button"
                          className={styles.quietAction}
                          onClick={() => setFriendFilter('recent')}
                        >
                          Mettre en avant les actifs
                        </button>
                      </div>
                      <div className={styles.quietGrid}>
                        {quietFriends.map(friend => {
                          const meta = friend.activity || {};
                          const lastDate = friend.latestRecipeAt
                            ? friend.latestRecipeAt.toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'Jamais';
                          const categories = Array.isArray(meta.categories) && meta.categories.length > 0
                            ? meta.categories.slice(0, 2).join(', ')
                            : 'Catégories à explorer';

                          return (
                            <div key={friend.friend_id} className={styles.quietCard}>
                              <div className={styles.quietAvatar}>
                                {friend.profiles?.avatar_url ? (
                                  <img src={friend.profiles.avatar_url} alt={friend.profiles.display_name} />
                                ) : (
                                  <span>{friend.profiles?.display_name?.charAt(0)?.toUpperCase() || '👤'}</span>
                                )}
                              </div>
                              <div className={styles.quietBody}>
                                <h4>{friend.profiles?.display_name || 'Ami COCO'}</h4>
                                <span className={styles.quietMeta}>Dernière recette : {lastDate}</span>
                                <span className={styles.quietMeta}>Recettes publiées : {meta.totalRecipes || 0}</span>
                                <span className={styles.quietMeta}>{categories}</span>
                              </div>
                              <button
                                type="button"
                                className={styles.quietNudge}
                                onClick={() => router.push('/social')}
                              >
                                Envoyer un mot
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {highlightFriends.length > 0 && (
                    <div className={styles.highlightStrip}>
                      <h3 className={styles.highlightTitle}>Amis à suivre</h3>
                      <div className={styles.highlightList}>
                        {highlightFriends.map(friend => {
                          const meta = friend.activity;
                          const latestLabel = meta.latestRecipeAt
                            ? new Date(meta.latestRecipeAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short'
                              })
                            : null;

                          return (
                            <button
                              key={friend.friend_id}
                              className={styles.highlightCard}
                              type="button"
                              onClick={() => {
                                fetchFriendRecipes(friend.friend_id);
                                setActiveTab('friendsRecipes');
                              }}
                            >
                              <div className={styles.highlightAvatar}>
                                {friend.profiles?.avatar_url ? (
                                  <img src={friend.profiles.avatar_url} alt={friend.profiles.display_name} />
                                ) : (
                                  <span>{friend.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}</span>
                                )}
                              </div>
                              <div className={styles.highlightMeta}>
                                <span className={styles.highlightName}>{friend.profiles?.display_name}</span>
                                <span className={styles.highlightRecipes}>
                                  {meta.totalRecipes} recette{meta.totalRecipes > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className={styles.highlightInfo}>
                                {latestLabel ? `Dernière ${latestLabel}` : 'Toujours partant·e'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grille d'amis redessinée */}
                  <div className={styles.friendsGrid}>
                    {filteredFriends.map((friendship, idx) => {
                      const activityMeta = friendActivity[friendship.friend_id] || {};
                      const recipesCount = activityMeta.totalRecipes || 0;
                      const isActive = activityMeta.hasRecentRecipe;

                      return (
                        <div
                          key={friendship.id}
                          className={`${styles.friendCard} ${getCardAnimationClass(idx)}`}
                          onMouseEnter={() => {
                            setHoveredFriendId(friendship.friend_id);
                            fetchFriendRecipes(friendship.friend_id);
                          }}
                          onMouseLeave={() => setHoveredFriendId(null)}
                        >
                          {/* Carte d'ami simplifiée */}
                          <div className={styles.friendCardContent}>
                            <div className={styles.friendMainInfo}>
                              <div className={styles.friendAvatar}>
                                {friendship.profiles?.avatar_url ? (
                                  <img 
                                    src={friendship.profiles.avatar_url} 
                                    alt={friendship.profiles.display_name}
                                    className={styles.avatarImage}
                                  />
                                ) : (
                                  <span className={styles.avatarLetter}>
                                    {friendship.profiles?.display_name?.charAt(0)?.toUpperCase() || '?'}
                                  </span>
                                )}
                                
                                {/* Indicateur de statut simplifié */}
                                {isActive && (
                                  <div className={styles.onlineIndicator}></div>
                                )}
                              </div>
                              
                              <div className={styles.friendDetails}>
                                <h4 className={styles.friendName}>
                                  {friendship.profiles?.display_name || 'Utilisateur'}
                                </h4>
                                
                                <p className={styles.friendBio}>
                                  {friendship.profiles?.bio || 'Amateur de cuisine passionné'}
                                </p>

                                {/* Badges d'activité simplifiés */}
                                <div className={styles.friendBadges}>
                                  {recipesCount > 0 && (
                                    <span className={styles.activityBadge}>
                                      {recipesCount} recette{recipesCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  
                                  {mutualFriendsData[friendship.friend_id] > 0 && (
                                    <span className={styles.mutualBadge}>
                                      {mutualFriendsData[friendship.friend_id]} commun{mutualFriendsData[friendship.friend_id] > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions principales simplifiées */}
                            <div className={styles.friendActions}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/profile/${friendship.friend_id}`);
                                }}
                                className={styles.primaryAction}
                              >
                                Voir le profil
                              </button>
                              
                              <div className={styles.secondaryActions}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alert('Fonctionnalité de messagerie à venir!');
                                  }}
                                  className={styles.secondaryAction}
                                  title="Envoyer un message"
                                >
                                  💬
                                </button>
                                
                                <div className={styles.moreActions}>
                                  <button 
                                    className={styles.moreButton}
                                    title="Plus d'options"
                                  >
                                    ⋯
                                  </button>
                                  
                                  <div className={styles.moreDropdown}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fetchFriendshipStatus(friendship.friend_id);
                                      }}
                                      className={styles.dropdownItem}
                                    >
                                      ℹ️ Voir le statut
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFriend(friendship.friend_id, friendship.profiles?.display_name);
                                      }}
                                      className={styles.dropdownItemDanger}
                                    >
                                      🗑️ Supprimer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Aperçu des recettes au survol */}
                            {hoveredFriendId === friendship.friend_id && friendsRecipes[friendship.friend_id] && (
                              <div className={styles.recipesPreview}>
                                <h5 className={styles.previewTitle}>Dernières recettes</h5>
                                
                                <div className={styles.recipesList}>
                                  {friendsRecipes[friendship.friend_id].slice(0, 3).map(recipe => (
                                    <div
                                      key={recipe.id}
                                      className={styles.recipeItem}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/recipe/${recipe.id}`);
                                      }}
                                    >
                                      <div className={styles.recipeImage}>
                                        {recipe.image && recipe.image !== '/placeholder-recipe.jpg' ? (
                                          <img
                                            src={recipe.image}
                                            alt={recipe.title}
                                          />
                                        ) : (
                                          <span className={styles.recipePlaceholder}>🍽️</span>
                                        )}
                                      </div>
                                      <span className={styles.recipeTitle}>
                                        {recipe.title?.length > 20 ? 
                                          recipe.title.slice(0, 20) + '…' : 
                                          recipe.title}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                
                                {friendsRecipes[friendship.friend_id].length > 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/profile/${friendship.friend_id}?tab=recipes`);
                                    }}
                                    className={styles.viewAllRecipes}
                                  >
                                    Voir toutes →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>👥</div>
                  <h3 className={styles.emptyTitle}>Aucun ami pour le moment</h3>
                  <p className={styles.emptyDescription}>
                    Commencez à vous connecter avec d'autres passionnés de cuisine !
                  </p>
                  <div className={styles.emptyActions}>
                    <button
                      onClick={() => setActiveTab('suggestions')}
                      className={styles.emptyActionPrimary}
                    >
                      💡 Découvrir des amis
                    </button>
                    
                    <button
                      onClick={() => {
                        const searchInput = document.querySelector('input[placeholder*="Rechercher"]');
                        if (searchInput) {
                          searchInput.focus();
                          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className={styles.emptyActionSecondary}
                    >
                      🔍 Rechercher par nom
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'requests' && (
            <section className={`${styles.requestsSection} ${getSectionAnimationClass()}`} data-tab="requests" style={{
              background: 'white',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              padding: '32px 24px',
              marginBottom: 32
            }}>
              <h2>Demandes d'amitié ({friendRequests.length})</h2>
              {friendRequests.map((request, idx) => (
                <div key={request.id} className={`${styles.requestCard} ${getCardAnimationClass(idx)}`} style={{ animation: 'cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55)' }}>
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
            <section className={`${styles.suggestionsSection} ${getSectionAnimationClass()}`} style={{
              background: 'white',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              padding: '32px 24px',
              marginBottom: 32
            }}>
              <div className={styles.sectionHeader}>
                <h2>Suggestions d'amis</h2>
                {/* Bouton pour rafraîchir les suggestions */}
                <button
                  onClick={refreshSuggestions}
                  className={styles.refreshButton}
                  style={{
                    background: 'rgba(255, 107, 53, 0.1)',
                    border: '1px solid rgba(255, 107, 53, 0.3)',
                    color: '#ff6b35',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 107, 53, 0.15)'
                    e.target.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 107, 53, 0.1)'
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  🔄 Actualiser
                </button>
              </div>
              <div className={styles.suggestionsGrid}>
                {suggestions.map((suggestion, idx) => {
                  const isRequestSent = sentRequests.has(suggestion.user_id);
                  const isSuccess = successCards.has(suggestion.user_id);
                  const isLoading = buttonStates[`add-${suggestion.user_id}`]?.loading;
                  
                  return (
                    <div
                      key={suggestion.user_id}
                      className={`${styles.suggestionCard} ${getCardAnimationClass(idx)} ${isRequestSent ? styles.requestSent : ''} ${isSuccess ? styles.success : ''}`}
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
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎯</div>
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: '1.1rem', 
                        fontWeight: '600' 
                      }}>
                        Aucune nouvelle suggestion
                      </h3>
                      <p style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '0.9rem',
                        lineHeight: '1.4'
                      }}>
                        Vous avez déjà connecté avec tous les utilisateurs disponibles ! 
                        Revenez plus tard pour découvrir de nouveaux membres.
                      </p>
                      <button
                        onClick={refreshSuggestions}
                        style={{
                          background: '#ff6b35',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#e55a2b'
                          e.target.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#ff6b35'
                          e.target.style.transform = 'translateY(0)'
                        }}
                      >
                        🔄 Rechercher de nouvelles suggestions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'friendsRecipes' && (
            <section className={`${styles.friendsRecipesSection} ${getSectionAnimationClass()}`} style={{
              background: 'white',
              borderRadius: 18,
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              padding: '32px 24px',
              marginBottom: 32
            }}>
              <h2>Recettes de mes amis</h2>
              {normalizedFriends.length === 0 ? (
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
      </div>
      {/* Modal de confirmation amélioré */}
      {showConfirmDialog && (
        <div className={`${styles.modalOverlay} ${styles.modalAnimated}`} onClick={() => setShowConfirmDialog(null)}>
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
      {/* Ajout d'un style global pour l'animation des cartes */}
      <style jsx global>{`
        .${styles.cardAnimated} {
          animation: cardSlideIn 0.7s cubic-bezier(0.68,-0.55,0.265,1.55);
        }
        @keyframes cardSlideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.98);}
          to { opacity: 1; transform: translateY(0) scale(1);}
        }
      `}</style>
    </div>
  )
}
