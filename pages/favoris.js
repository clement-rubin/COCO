import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/FriendsFeed.module.css'

export default function Amis() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'requests', 'friends'

  // Charger les amis existants
  useEffect(() => {
    if (user) {
      loadFriends();
      loadPendingRequests();
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          friend_id,
          profiles!friendships_friend_id_fkey (
            id,
            display_name,
            avatar_url,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des amis:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          user_id,
          profiles!friendships_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .ilike('display_name', `%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
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
      
      // Retirer de la liste de recherche
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
      alert('Demande d\'ami envoyée !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
      
      loadFriends();
      loadPendingRequests();
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      loadPendingRequests();
    } catch (error) {
      console.error('Erreur lors du refus:', error);
    }
  };

  const removeFriend = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      
      loadFriends();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Mes Amis - COCO</title>
          <meta name="description" content="Gérez vos amis culinaires sur COCO" />
        </Head>
        
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.headerIcon}>🔒</span>
            <h1 className={styles.headerTitle}>Connexion requise</h1>
            <p className={styles.headerStats}>Connectez-vous pour gérer vos amis culinaires</p>
          </div>
        </div>
        
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <h3 className={styles.emptyTitle}>Rejoignez la communauté COCO</h3>
              <p className={styles.emptyDescription}>
                Connectez-vous pour découvrir et partager des recettes avec d'autres passionnés de cuisine
              </p>
              <button 
                onClick={() => router.push('/login')}
                className={`${styles.actionBtn} ${styles.addBtn}`}
                style={{ marginTop: '1.5rem' }}
              >
                Se connecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Mes Amis - COCO</title>
        <meta name="description" content="Gérez vos amis culinaires sur COCO" />
      </Head>

      {/* Enhanced Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.headerIcon}>👥</span>
          <h1 className={styles.headerTitle}>Mes Amis Culinaires</h1>
          <p className={styles.headerStats}>
            {friends.length} ami{friends.length > 1 ? 's' : ''} • {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
          </p>
          
          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{friends.length}</span>
              <span className={styles.statLabel}>Amis</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{pendingRequests.length}</span>
              <span className={styles.statLabel}>En attente</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{searchResults.length}</span>
              <span className={styles.statLabel}>Trouvés</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Recherche d'amis */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              🔍 Découvrir des amis
            </h2>
            <p className={styles.sectionSubtitle}>
              Recherchez vos amis par leur nom d'utilisateur
            </p>
          </div>
          
          <div className={styles.searchContainer}>
            <div style={{ position: 'relative' }}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher par pseudo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className={styles.searchInput}
              />
              {searchLoading && <div className={styles.loadingSpinner} />}
            </div>
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className={styles.usersList}>
              {searchResults.map(foundUser => (
                <div key={foundUser.id} className={styles.userCard}>
                  <div className={styles.userAvatar}>
                    {foundUser.display_name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  
                  <div className={styles.userInfo}>
                    <h4 className={styles.userName}>
                      {foundUser.display_name}
                    </h4>
                    <p className={styles.userMeta}>
                      Membre depuis {new Date(foundUser.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  
                  <div className={styles.userActions}>
                    <button
                      onClick={() => sendFriendRequest(foundUser.id)}
                      className={`${styles.actionBtn} ${styles.addBtn}`}
                    >
                      ➕ Ajouter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !searchLoading && searchResults.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🤷‍♂️</span>
              <h3 className={styles.emptyTitle}>Aucun résultat</h3>
              <p className={styles.emptyDescription}>
                Aucun utilisateur trouvé avec ce nom. Essayez un autre terme de recherche.
              </p>
            </div>
          )}
        </div>

        {/* Demandes en attente */}
        {pendingRequests.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                📨 Demandes d'amitié
                <span className={`${styles.badge} ${styles.pendingBadge}`}>
                  {pendingRequests.length}
                </span>
              </h2>
              <p className={styles.sectionSubtitle}>
                Ces personnes souhaitent devenir vos amis
              </p>
            </div>
            
            <div className={styles.usersList}>
              {pendingRequests.map(request => (
                <div key={request.id} className={`${styles.userCard} ${styles.pendingCard}`}>
                  <div className={styles.userAvatar}>
                    {request.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  
                  <div className={styles.userInfo}>
                    <h4 className={styles.userName}>
                      {request.profiles.display_name}
                    </h4>
                    <p className={styles.userMeta}>
                      ✨ Souhaite être votre ami
                    </p>
                  </div>
                  
                  <div className={styles.userActions}>
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className={`${styles.actionBtn} ${styles.acceptBtn}`}
                      title="Accepter"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      className={`${styles.actionBtn} ${styles.rejectBtn}`}
                      title="Refuser"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des amis */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              👥 Mes amis
              {friends.length > 0 && (
                <span className={`${styles.badge} ${styles.newBadge}`}>
                  {friends.length}
                </span>
              )}
            </h2>
            <p className={styles.sectionSubtitle}>
              Votre réseau de passionnés culinaires
            </p>
          </div>

          {friends.length > 0 ? (
            <div className={styles.usersList}>
              {friends.map(friendship => (
                <div key={friendship.id} className={styles.userCard}>
                  <div className={styles.userAvatar}>
                    {friendship.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  
                  <div className={styles.userInfo}>
                    <h4 className={styles.userName}>
                      {friendship.profiles.display_name}
                    </h4>
                    <p className={styles.userMeta}>
                      🤝 Amis depuis {new Date(friendship.profiles.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  
                  <div className={styles.userActions}>
                    <button
                      onClick={() => removeFriend(friendship.id)}
                      className={styles.removeBtn}
                      title="Retirer de mes amis"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🤝</span>
              <h3 className={styles.emptyTitle}>Aucun ami pour le moment</h3>
              <p className={styles.emptyDescription}>
                Recherchez vos amis par leur pseudo pour commencer à partager vos recettes et découvrir leurs créations culinaires !
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
