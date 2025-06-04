import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logError, logInfo, logDebug, logWarning, logComponentLifecycle, logApiCall, logPerformance, logComponentEvent } from '../utils/logger'

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
  const [activeTab, setActiveTab] = useState('friends')
  const [systemInitialized, setSystemInitialized] = useState(false)
  
  // Reduced logging state
  const [pageLoadStartTime] = useState(Date.now())
  const [userInteractionCount, setUserInteractionCount] = useState(0)

  // Add missing state for tracking API calls and other metrics
  const [apiCallHistory, setApiCallHistory] = useState([])
  const [errorHistory, setErrorHistory] = useState([])
  const [searchHistory, setSearchHistory] = useState([])

  // Component lifecycle logging with enhanced metrics
  useEffect(() => {
    const sessionId = Math.random().toString(36).substring(2, 15)
    const pageLoadTime = Date.now() - pageLoadStartTime

    logComponentLifecycle('Amis', 'component-mount', {
      sessionId,
      pageLoadTime,
      authLoading,
      hasUser: !!user,
      userEmail: user?.email,
      userDisplayName: user?.user_metadata?.display_name,
      userId: user?.id?.substring(0, 8) + '...',
      initialActiveTab: activeTab,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      connectionType: typeof navigator !== 'undefined' && navigator.connection ? navigator.connection.effectiveType : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown'
    })

    // Track page visibility changes
    const handleVisibilityChange = () => {
      logUserInteraction('PAGE_VISIBILITY_CHANGE', 'amis-page', {
        isVisible: !document.hidden,
        timestamp: new Date().toISOString(),
        sessionId
      })
    }

    // Track page focus/blur
    const handleFocus = () => {
      logUserInteraction('PAGE_FOCUS', 'amis-page', {
        timestamp: new Date().toISOString(),
        sessionId
      })
    }

    const handleBlur = () => {
      logUserInteraction('PAGE_BLUR', 'amis-page', {
        timestamp: new Date().toISOString(),
        sessionId
      })
    }

    // Track scroll behavior
    let scrollTimeout
    const handleScroll = () => {
      const scrollPercentage = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      logUserInteraction('PAGE_SCROLL', 'amis-page', {
        scrollPercentage,
        scrollY: window.scrollY,
        timestamp: new Date().toISOString(),
        sessionId
      })
    }

    // Throttled scroll logging
    const throttledScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(handleScroll, 1000)
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
      window.addEventListener('blur', handleBlur)
      window.addEventListener('scroll', throttledScroll)
    }

    return () => {
      const sessionDuration = Date.now() - pageLoadStartTime
      
      logComponentLifecycle('Amis', 'component-unmount', {
        sessionId,
        sessionDuration,
        finalState: {
          friendsCount: friends.length,
          pendingRequestsCount: pendingRequests.length,
          searchResultsCount: searchResults.length,
          activeTab,
          wasLoading: loading,
          totalUserInteractions: userInteractionCount,
          totalApiCalls: apiCallHistory.length,
          totalErrors: errorHistory.length,
          totalSearches: searchHistory.length
        },
        performanceMetrics: {
          totalSessionTime: sessionDuration,
          averageApiResponseTime: apiCallHistory.length > 0 ? 
            apiCallHistory.reduce((sum, call) => sum + (call.responseTime || 0), 0) / apiCallHistory.length : 0,
          errorRate: apiCallHistory.length > 0 ? (errorHistory.length / apiCallHistory.length) * 100 : 0
        }
      })

      // Clean up event listeners
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
        window.removeEventListener('blur', handleBlur)
        window.removeEventListener('scroll', throttledScroll)
      }
      
      // Clear timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [])

  // Enhanced auth check with system initialization
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent('/amis'))
    } else if (user && !systemInitialized) {
      initializeFriendsSystemAndLoadData()
    }
  }, [user, authLoading, router, systemInitialized])

  const initializeFriendsSystemAndLoadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      logInfo('Initializing friends system for user', {
        userId: user.id?.substring(0, 8) + '...',
        userEmail: user.email
      })
      
      // Try to load friends data first - the API will handle initialization
      await loadFriendsData()
      setSystemInitialized(true)
      
    } catch (error) {
      logError('Failed to initialize friends system', error)
      setError('Impossible d\'initialiser le système d\'amis. Veuillez rafraîchir la page.')
    }
  }

  const loadFriendsData = async (retryCount = 0, maxRetries = 2) => {
    if (!user) return

    const startTime = Date.now()
    const apiCallId = Math.random().toString(36).substring(2, 15)
    
    try {
      setLoading(true)
      setError(null)
      
      const apiUrl = `/api/friends?user_id=${user.id}`
      const response = await fetch(apiUrl)
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        // If it's a 5xx error and we haven't exceeded retries, retry
        if (response.status >= 500 && retryCount < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 3000)
          setTimeout(() => {
            loadFriendsData(retryCount + 1, maxRetries)
          }, retryDelay)
          return
        }
        
        // For other errors or max retries exceeded, show graceful fallback
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      
      setFriends(data.friends || [])
      setPendingRequests(data.pendingRequests || [])
      setError(null)
      
      logInfo('Friends data loaded successfully', {
        apiCallId,
        friendsCount: data.friends?.length || 0,
        pendingRequestsCount: data.pendingRequests?.length || 0,
        responseTime
      })

    } catch (err) {
      logError('Error loading friends data', err, {
        apiCallId,
        retryCount,
        maxRetries
      })
      
      if (retryCount >= maxRetries) {
        setError('Le système d\'amis sera bientôt disponible. Réessayez dans quelques instants.')
        // Set empty arrays so the UI can still function
        setFriends([])
        setPendingRequests([])
      }
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query, retryCount = 0, maxRetries = 1) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const searchId = Math.random().toString(36).substring(2, 15)
    setSearchLoading(true)
    
    try {
      const apiUrl = `/api/friends?query=${encodeURIComponent(query)}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        if (response.status >= 500 && retryCount < maxRetries) {
          setTimeout(() => {
            searchUsers(query, retryCount + 1, maxRetries)
          }, 1000)
          return
        }
        throw new Error(`Search failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Filter out current user and existing friends
      const filtered = data.filter(u => {
        return u.user_id !== user.id && !friends.some(f => f.profiles?.user_id === u.user_id)
      })
      
      setSearchResults(filtered)
      
    } catch (err) {
      logError('Error searching users', err, { searchId, query })
      // Don't show error for search, just keep empty results
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    const requestId = Math.random().toString(36).substring(2, 15)

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_request',
          user_id: user.id,
          friend_id: userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'envoi')
      }

      // Remove from search results
      setSearchResults(prev => prev.filter(u => u.user_id !== userId))
      
      logInfo('Friend request sent successfully', { requestId, targetUserId: userId?.substring(0, 8) + '...' })

    } catch (err) {
      logError('Error sending friend request', err, { requestId })
      setError('Impossible d\'envoyer la demande: ' + err.message)
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

      if (!response.ok) {
        throw new Error('Erreur lors de l\'acceptation')
      }

      loadFriendsData()

    } catch (err) {
      logError('Error accepting friend request', err, { requestId })
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

      if (!response.ok) {
        throw new Error('Erreur lors du refus')
      }

      loadFriendsData()

    } catch (err) {
      logError('Error rejecting friend request', err, { requestId })
      setError('Impossible de refuser la demande')
    }
  }

  const handleTabChange = (newTab) => {
    setUserInteractionCount(prev => prev + 1)
    setActiveTab(newTab)
    
    // Log tab changes with minimal data
    logUserInteraction('TAB_CHANGE', 'amis-navigation', {
      newTab,
      timestamp: new Date().toISOString()
    })
  }

  const handleSearchChange = (e) => {
    const newQuery = e.target.value
    setSearchQuery(newQuery)
    
    // Track search history
    if (newQuery.trim()) {
      setSearchHistory(prev => [...prev.slice(-9), { query: newQuery, timestamp: Date.now() }])
    }
    
    // Debounce search to avoid excessive API calls
    clearTimeout(window.searchTimeout)
    window.searchTimeout = setTimeout(() => {
      searchUsers(newQuery)
    }, 500)
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

      {/* Header section */}
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

      {/* Main content */}
      <section style={{
        background: 'white',
        minHeight: 'calc(100vh - 200px)',
        borderRadius: '1rem 1rem 0 0',
        padding: '2rem 1rem'
      }}>
        {/* Tab navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e5e7eb',
          flexWrap: 'wrap'
        }}>
          {{
            key: 'friends',
            label: 'Mes amis',
            icon: '👥',
            count: friends.length
          },
          {
            key: 'requests',
            label: 'Demandes',
            icon: '⏳',
            count: pendingRequests.length
          },
          {
            key: 'search',
            label: 'Rechercher',
            icon: '🔍'
          }
          }.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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

        {/* Tab content */}
        {activeTab === 'friends' && (
          <div>
            <h2 style={{ marginBottom: '1rem', color: '#1f2937' }}>
              Mes amis ({friends.length})
            </h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p style={{ color: '#6b7280' }}>Chargement...</p>
              </div>
            ) : friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👥</div>
                <p>Aucun ami pour le moment</p>
                <button
                  onClick={() => handleTabChange('search')}
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
                      {friendship.profiles?.display_name?.charAt(0) || '👤'}
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>
                      {friendship.profiles?.display_name || 'Utilisateur'}
                    </h3>
                    <p style={{ 
                      color: '#6b7280', 
                      fontSize: '0.9rem',
                      margin: '0 0 1rem 0'
                    }}>
                      Ami depuis {new Date(friendship.created_at).toLocaleDateString()}
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
                        {request.profiles?.display_name?.charAt(0) || '👤'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: '#1f2937' }}>
                          {request.profiles?.display_name || 'Utilisateur'}
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
                onChange={handleSearchChange}
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
                      onClick={() => sendFriendRequest(user.user_id)}
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
