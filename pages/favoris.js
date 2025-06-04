import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'

export default function Favoris() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Head>
          <title>Mes Amis - COCO</title>
        </Head>
        
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
          background: 'white',
          padding: '40px 20px',
          borderRadius: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            Connexion requise
          </h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            Connectez-vous pour gérer vos amis culinaires
          </p>
          <button 
            onClick={() => router.push('/login')}
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%)'
    }}>
      <Head>
        <title>Mes Amis - COCO</title>
        <meta name="description" content="Gérez vos amis culinaires sur COCO" />
      </Head>

      {/* Header redesigné */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          fontSize: '2rem',
          opacity: 0.2
        }}>👥</div>
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          fontSize: '1.5rem',
          opacity: 0.2
        }}>🤝</div>

        <div style={{ maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '1.8rem'
          }}>
            👥
          </div>
          
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            margin: '0 0 12px 0'
          }}>
            Mes Amis Culinaires
          </h1>
          
          <p style={{
            opacity: 0.9,
            fontSize: '1rem',
            margin: '0 0 24px 0'
          }}>
            {friends.length} ami{friends.length > 1 ? 's' : ''} • {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
          </p>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginTop: '20px'
          }}>
            {{
              label: 'Amis',
              value: friends.length,
              icon: '👥'
            },
            {
              label: 'Demandes',
              value: pendingRequests.length,
              icon: '📨'
            },
            {
              label: 'Trouvés',
              value: searchResults.length,
              icon: '🔍'
            }
          }.map((stat, index) => (
              <div key={index} style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '12px',
                padding: '12px 8px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
                  {stat.icon}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderBottom: '1px solid #f3f4f6',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          display: 'flex',
          gap: '8px'
        }}>
          {{
            key: 'friends',
            label: 'Amis',
            icon: '👥',
            count: friends.length
          },
          {
            key: 'requests',
            label: 'Demandes',
            icon: '📨',
            count: pendingRequests.length
          },
          {
            key: 'search',
            label: 'Recherche',
            icon: '🔍'
          }
        }.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                background: activeTab === tab.key 
                  ? 'linear-gradient(135deg, #ff6b35, #f7931e)' 
                  : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                border: activeTab === tab.key ? 'none' : '1px solid #e5e7eb',
                padding: '12px 8px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span style={{
                  background: activeTab === tab.key 
                    ? 'rgba(255,255,255,0.2)' 
                    : '#ff6b35',
                  color: activeTab === tab.key ? 'white' : 'white',
                  borderRadius: '12px',
                  padding: '2px 6px',
                  fontSize: '0.7rem',
                  fontWeight: '700'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: '20px',
        minHeight: 'calc(100vh - 300px)'
      }}>
        {/* Tab: Recherche */}
        {activeTab === 'search' && (
          <div>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🔍 Découvrir des amis
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.9rem',
                marginBottom: '16px'
              }}>
                Recherchez vos amis par leur nom d'utilisateur
              </p>
              
              <div style={{ position: 'relative' }}>
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
                    padding: '12px 16px 12px 44px',
                    border: '2px solid #f3f4f6',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                  onBlur={(e) => e.target.style.borderColor = '#f3f4f6'}
                />
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.2rem',
                  color: '#9ca3af'
                }}>
                  🔍
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map(foundUser => (
                  <div key={foundUser.id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: '700'
                    }}>
                      {foundUser.display_name?.charAt(0).toUpperCase() || '👤'}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {foundUser.display_name}
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#6b7280'
                      }}>
                        Membre depuis {new Date(foundUser.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => sendFriendRequest(foundUser.id)}
                      style={{
                        background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      ➕ Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤷‍♂️</div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  Aucun résultat
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Aucun utilisateur trouvé avec ce nom
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Demandes */}
        {activeTab === 'requests' && (
          <div>
            {pendingRequests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingRequests.map(request => (
                  <div key={request.id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    border: '2px solid #fef3c7'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: '700'
                      }}>
                        {request.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: '0 0 4px 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {request.profiles.display_name}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '0.8rem',
                          color: '#d97706'
                        }}>
                          ✨ Souhaite être votre ami
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => acceptFriendRequest(request.id)}
                        style={{
                          flex: 1,
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Accepter
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.id)}
                        style={{
                          flex: 1,
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📨</div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  Aucune demande
                </h3>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  Vous n'avez pas de demandes d'amitié en attente
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Amis */}
        {activeTab === 'friends' && (
          <div>
            {friends.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {friends.map(friendship => (
                  <div key={friendship.id} style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: '700'
                    }}>
                      {friendship.profiles.display_name?.charAt(0).toUpperCase() || '👤'}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {friendship.profiles.display_name}
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#6b7280'
                      }}>
                        🤝 Amis depuis {new Date(friendship.profiles.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => removeFriend(friendship.id)}
                      style={{
                        background: 'transparent',
                        color: '#ef4444',
                        border: '1px solid #fecaca',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                      title="Retirer de mes amis"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🤝</div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  Aucun ami pour le moment
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  marginBottom: '20px'
                }}>
                  Recherchez vos amis pour commencer à partager vos recettes
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Rechercher des amis
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
