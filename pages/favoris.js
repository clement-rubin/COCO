import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'

export default function Amis() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h2>Connexion requise</h2>
        <p>Connectez-vous pour gérer vos amis</p>
        <button 
          onClick={() => router.push('/login')}
          className="card"
          style={{ border: 'none', cursor: 'pointer', background: 'var(--primary-coral)' }}
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Mes Amis - COCO</title>
        <meta name="description" content="Gérez vos amis culinaires sur COCO" />
      </Head>

      {/* Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>👥</div>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-dark)'
        }}>
          Mes Amis Culinaires
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          margin: 0
        }}>
          {friends.length} ami{friends.length > 1 ? 's' : ''} • {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
        </p>
      </section>

      {/* Recherche d'amis */}
      <section style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-md)' }}>
          🔍 Ajouter des amis
        </h2>
        
        <div style={{ position: 'relative', marginBottom: 'var(--spacing-lg)' }}>
          <input
            type="text"
            placeholder="Rechercher par pseudo..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchUsers(e.target.value);
            }}
            style={{
              width: '100%',
              padding: 'var(--spacing-md)',
              border: '2px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '1rem',
              background: 'var(--bg-card)'
            }}
          />
          {searchLoading && (
            <div style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)'
            }}>
              ⏳
            </div>
          )}
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
              Résultats de recherche
            </h3>
            {searchResults.map(foundUser => (
              <div key={foundUser.id} className="card" style={{ 
                padding: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, var(--primary-coral), var(--secondary-mint))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {foundUser.display_name?.charAt(0).toUpperCase() || '👤'}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: '1rem' }}>
                    {foundUser.display_name}
                  </h4>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-light)',
                    margin: 0
                  }}>
                    Membre depuis {new Date(foundUser.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                
                <button
                  onClick={() => sendFriendRequest(foundUser.id)}
                  style={{
                    background: 'var(--primary-coral)',
                    color: 'white',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Ajouter
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Demandes en attente */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
              📨 Demandes d'amitié ({pendingRequests.length})
            </h3>
            {pendingRequests.map(request => (
              <div key={request.id} className="card" style={{ 
                padding: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-sm)',
                border: '2px solid var(--primary-coral-light)'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, var(--primary-coral), var(--secondary-mint))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {request.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: '1rem' }}>
                    {request.profiles.display_name}
                  </h4>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--primary-coral)',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    Souhaite être votre ami
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    style={{
                      background: 'var(--secondary-mint)',
                      color: 'white',
                      border: 'none',
                      padding: 'var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer'
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    style={{
                      background: 'var(--text-light)',
                      color: 'white',
                      border: 'none',
                      padding: 'var(--spacing-sm)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Liste des amis */}
        {friends.length > 0 ? (
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>
              👥 Mes amis ({friends.length})
            </h3>
            {friends.map(friendship => (
              <div key={friendship.id} className="card" style={{ 
                padding: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-sm)'
              }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, var(--primary-coral), var(--secondary-mint))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {friendship.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: '1rem' }}>
                    {friendship.profiles.display_name}
                  </h4>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-light)',
                    margin: 0
                  }}>
                    Amis depuis {new Date(friendship.profiles.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                
                <button
                  onClick={() => removeFriend(friendship.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: 'var(--spacing-sm)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🤝</div>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Aucun ami pour le moment</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Recherchez vos amis par leur pseudo pour commencer à partager vos recettes !
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
