import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logError, logInfo } from '../utils/logger'

export default function Amis() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [friends, setFriends] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'requests', 'search'

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent('/amis'))
    }
  }, [user, authLoading, router])

  // Load friends and pending requests
  useEffect(() => {
    if (user) {
      loadFriendsData()
    }
  }, [user])

  const loadFriendsData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`/api/friends?user_id=${user.id}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setFriends(data.friends || [])
      setPendingRequests(data.pendingRequests || [])
      setError(null)
    } catch (err) {
      logError('Erreur lors du chargement des amis', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/friends?query=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      // Filtrer l'utilisateur actuel et les amis existants
      const filtered = data.filter(u => 
        u.id !== user.id && 
        !friends.some(f => f.profiles.id === u.id)
      )
      
      setSearchResults(filtered)
    } catch (err) {
      logError('Erreur lors de la recherche', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const sendFriendRequest = async (friendId) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request',
          user_id: user.id,
          friend_id: friendId
        })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi')

      setSearchResults(prev => prev.filter(u => u.id !== friendId))
      logUserInteraction('SEND_FRIEND_REQUEST', 'amis-page', { friendId })
    } catch (err) {
      logError('Erreur envoi demande d\'ami', err)
      setError('Impossible d\'envoyer la demande')
    }
  }

  const acceptRequest = async (requestId) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_request',
          request_id: requestId
        })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'acceptation')

      loadFriendsData()
      logUserInteraction('ACCEPT_FRIEND_REQUEST', 'amis-page', { requestId })
    } catch (err) {
      logError('Erreur acceptation demande', err)
      setError('Impossible d\'accepter la demande')
    }
  }

  const rejectRequest = async (requestId) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_request',
          request_id: requestId
        })
      })

      if (!response.ok) throw new Error('Erreur lors du refus')

      loadFriendsData()
      logUserInteraction('REJECT_FRIEND_REQUEST', 'amis-page', { requestId })
    } catch (err) {
      logError('Erreur refus demande', err)
      setError('Impossible de refuser la demande')
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Head>
        <title>Mes Amis - COCO</title>
        <meta name="description" content="Gérez vos amis sur COCO" />
      </Head>

      {/* Header */}
      <section style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '2rem 1rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
        <h1 style={{ 
          fontSize: '1.8rem', 
          margin: 0,
          color: 'white',
          fontWeight: '600'
        }}>
          Mes Amis
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '1rem',
          margin: '0.5rem 0'
        }}>
          Connectez-vous avec d'autres passionnés de cuisine
        </p>
        {!loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            marginTop: '1rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.5rem 1rem',
              borderRadius: '1rem'
            }}>
              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                👥 {friends.length} ami{friends.length > 1 ? 's' : ''}
              </span>
            </div>
            {pendingRequests.length > 0 && (
              <div style={{
                background: 'rgba(255, 193, 7, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '1rem',
                border: '1px solid rgba(255, 193, 7, 0.3)'
              }}>
                <span style={{ color: 'white', fontSize: '0.9rem' }}>
                  ⏳ {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Content */}
      <section style={{
        background: 'white',
        minHeight: 'calc(100vh - 200px)',
        borderRadius: '1rem 1rem 0 0',
        padding: '2rem 1rem'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e5e7eb',
          flexWrap: 'wrap'
        }}>
          {[
            { key: 'friends', label: 'Mes amis', icon: '👥', count: friends.length },
            { key: 'requests', label: 'Demandes', icon: '⏳', count: pendingRequests.length },
            { key: 'search', label: 'Rechercher', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? '#667eea' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
                padding: '1rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '0.5rem 0.5rem 0 0'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span style={{
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                  borderRadius: '50%',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  minWidth: '1.5rem',
                  textAlign: 'center'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'friends' && (
          <div>
            <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
              Mes amis ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
                <p>Aucun ami pour le moment</p>
                <button
                  onClick={() => setActiveTab('search')}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    marginTop: '1rem'
                  }}
                >
                  Rechercher des amis
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                {friends.map(friendship => (
                  <div key={friendship.id} style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}>
                      {friendship.profiles.display_name?.charAt(0) || '👤'}
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                      {friendship.profiles.display_name || 'Utilisateur'}
                    </h3>
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '0.9rem',
                      margin: '0 0 1rem 0'
                    }}>
                      Ami depuis {new Date(friendship.profiles.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div>
            <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
              Demandes d'amis ({pendingRequests.length})
            </h2>
            {pendingRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
                <p>Aucune demande en attente</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {pendingRequests.map(request => (
                  <div key={request.id} style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '0.75rem',
                    padding: '1.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }}>
                        {request.profiles.display_name?.charAt(0) || '👤'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: '#1f2937' }}>
                          {request.profiles.display_name || 'Utilisateur'}
                        </h3>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                          Demande d'ami
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => acceptRequest(request.id)}
                        style={{
                          flex: 1,
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        ✓ Accepter
                      </button>
                      <button
                        onClick={() => rejectRequest(request.id)}
                        style={{
                          flex: 1,
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        ✗ Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
              Rechercher des amis
            </h2>
            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
                placeholder="Rechercher par nom d'utilisateur..."
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
            </div>
            
            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem' }}>🔍</div>
                <p style={{ color: '#6b7280' }}>Recherche en cours...</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1rem'
              }}>
                {searchResults.map(user => (
                  <div key={user.id} style={{
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: 'bold'
                    }}>
                      {user.display_name?.charAt(0) || '👤'}
                    </div>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>
                      {user.display_name || 'Utilisateur'}
                    </h3>
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      style={{
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '500',
                        width: '100%'
                      }}
                    >
                      + Ajouter en ami
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                <p>Aucun utilisateur trouvé pour "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
