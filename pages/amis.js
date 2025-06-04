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
  const [activeTab, setActiveTab] = useState('friends') // 'friends', 'requests', 'search'

  // Component lifecycle logging
  useEffect(() => {
    logComponentLifecycle('Amis', 'component-mount', {
      authLoading,
      hasUser: !!user,
      userEmail: user?.email,
      initialActiveTab: activeTab,
      timestamp: new Date().toISOString()
    })

    return () => {
      logComponentLifecycle('Amis', 'component-unmount', {
        finalState: {
          friendsCount: friends.length,
          pendingRequestsCount: pendingRequests.length,
          searchResultsCount: searchResults.length,
          activeTab,
          wasLoading: loading
        }
      })
    }
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    logComponentLifecycle('Amis', 'useEffect-auth-check', {
      authLoading,
      hasUser: !!user,
      userEmail: user?.email,
      step: 'auth_check_start'
    })

    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'amis-page', {
        reason: 'user_not_authenticated',
        targetPage: '/amis',
        authLoading,
        redirectUrl: '/login?redirect=' + encodeURIComponent('/amis'),
        timestamp: new Date().toISOString()
      })
      router.push('/login?redirect=' + encodeURIComponent('/amis'))
    } else if (user) {
      logDebug('User authenticated on amis page', {
        userEmail: user.email,
        userId: user.id?.substring(0, 8) + '...',
        userDisplayName: user.user_metadata?.display_name,
        step: 'auth_check_success'
      })
    }
  }, [user, authLoading, router])

  // Load friends and pending requests
  useEffect(() => {
    logComponentLifecycle('Amis', 'useEffect-load-friends', {
      hasUser: !!user,
      userEmail: user?.email,
      step: 'load_friends_effect_start'
    })

    if (user) {
      logInfo('Starting to load friends data', {
        userEmail: user.email,
        userId: user.id?.substring(0, 8) + '...',
        userDisplayName: user.user_metadata?.display_name,
        timestamp: new Date().toISOString()
      })
      loadFriendsData()
    } else {
      logDebug('User not available, skipping friends data load', {
        hasUser: !!user,
        authLoading,
        step: 'load_friends_skip'
      })
    }
  }, [user])

  // Tab change logging
  useEffect(() => {
    logComponentEvent('Amis', 'tab-change', {
      newTab: activeTab,
      friendsCount: friends.length,
      pendingRequestsCount: pendingRequests.length,
      searchResultsCount: searchResults.length,
      timestamp: new Date().toISOString()
    })
  }, [activeTab])

  const loadFriendsData = async () => {
    if (!user) {
      logWarning('loadFriendsData called without user', {
        hasUser: !!user,
        authLoading,
        step: 'early_return_no_user'
      })
      return
    }

    const startTime = Date.now()
    
    logInfo('loadFriendsData: DEBUT du processus', {
      userEmail: user.email,
      userId: user.id?.substring(0, 8) + '...',
      userDisplayName: user.user_metadata?.display_name,
      step: 'process_start',
      timestamp: new Date().toISOString()
    })

    try {
      setLoading(true)
      setError(null)
      
      logDebug('loadFriendsData: État initial défini', {
        loadingSet: true,
        errorReset: true,
        step: 'state_reset'
      })

      const apiUrl = `/api/friends?user_id=${user.id}`
      
      logDebug('loadFriendsData: Préparation appel API', {
        url: apiUrl,
        userId: user.id?.substring(0, 8) + '...',
        method: 'GET',
        step: 'api_preparation'
      })

      logApiCall('GET', apiUrl, null, null)
      
      const response = await fetch(apiUrl)
      const responseTime = Date.now() - startTime
      
      logInfo('loadFriendsData: Réponse API reçue', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime,
        step: 'api_response_received',
        headers: Object.fromEntries(response.headers.entries())
      })

      logPerformance('Friends API fetch', responseTime, {
        url: apiUrl,
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        logError('loadFriendsData: Réponse API non-OK', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          step: 'api_error_response'
        })
        throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      
      logInfo('loadFriendsData: Données reçues et parsées', {
        dataType: typeof data,
        hasFriends: !!data.friends,
        hasPendingRequests: !!data.pendingRequests,
        friendsCount: data.friends?.length || 0,
        pendingRequestsCount: data.pendingRequests?.length || 0,
        step: 'data_parsed',
        sampleFriends: data.friends?.slice(0, 2).map(f => ({
          id: f.id,
          friendId: f.friend_id,
          profileName: f.profiles?.display_name,
          profileId: f.profiles?.id
        })) || [],
        samplePendingRequests: data.pendingRequests?.slice(0, 2).map(r => ({
          id: r.id,
          userId: r.user_id,
          profileName: r.profiles?.display_name,
          profileId: r.profiles?.id
        })) || []
      })

      logApiCall('GET', apiUrl, null, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime,
        data: {
          friendsCount: data.friends?.length || 0,
          pendingRequestsCount: data.pendingRequests?.length || 0
        }
      })

      setFriends(data.friends || [])
      setPendingRequests(data.pendingRequests || [])
      setError(null)
      
      logInfo('loadFriendsData: État mis à jour avec succès', {
        finalFriendsCount: data.friends?.length || 0,
        finalPendingRequestsCount: data.pendingRequests?.length || 0,
        totalProcessingTime: Date.now() - startTime,
        step: 'state_updated_success'
      })

    } catch (err) {
      const totalTime = Date.now() - startTime
      
      logError('Erreur lors du chargement des amis', err, {
        userEmail: user?.email,
        userId: user?.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 500),
        errorName: err.name,
        totalTime,
        step: 'error_caught',
        networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
      })
      
      setError(err.message)
    } finally {
      const totalDuration = Date.now() - startTime
      
      logDebug('loadFriendsData: Nettoyage final', {
        step: 'cleanup',
        totalDuration
      })
      
      setLoading(false)
      
      logPerformance('loadFriendsData total', totalDuration, {
        userEmail: user?.email,
        userId: user?.id?.substring(0, 8) + '...',
        success: !error
      })
      
      logInfo('loadFriendsData: PROCESSUS TERMINÉ', {
        success: !error,
        totalDuration,
        step: 'process_end',
        timestamp: new Date().toISOString()
      })
    }
  }

  const searchUsers = async (query) => {
    if (!query.trim()) {
      logDebug('searchUsers: Query vide, reset des résultats', {
        queryLength: query.length,
        queryTrimmed: query.trim(),
        step: 'early_return_empty_query'
      })
      setSearchResults([])
      return
    }

    const startTime = Date.now()
    
    logUserInteraction('SEARCH_USERS', 'amis-page', {
      query: query.trim(),
      queryLength: query.trim().length,
      timestamp: new Date().toISOString()
    })

    logInfo('searchUsers: DEBUT de la recherche', {
      query: query.trim(),
      queryLength: query.trim().length,
      currentResultsCount: searchResults.length,
      step: 'search_start'
    })

    setSearchLoading(true)
    
    try {
      const apiUrl = `/api/friends?query=${encodeURIComponent(query)}`
      
      logDebug('searchUsers: Préparation appel API recherche', {
        url: apiUrl,
        encodedQuery: encodeURIComponent(query),
        method: 'GET',
        step: 'api_preparation'
      })

      logApiCall('GET', apiUrl, { query }, null)
      
      const response = await fetch(apiUrl)
      const responseTime = Date.now() - startTime
      
      logInfo('searchUsers: Réponse API recherche reçue', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime,
        query: query.trim(),
        step: 'api_response_received'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logError('searchUsers: Réponse API non-OK', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          query: query.trim(),
          step: 'api_error_response'
        })
        throw new Error(`Erreur de recherche: ${response.status}`)
      }

      const data = await response.json()
      
      logInfo('searchUsers: Données de recherche reçues', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        rawResultsCount: data?.length || 0,
        query: query.trim(),
        step: 'data_received',
        sampleResults: data?.slice(0, 3).map(u => ({
          id: u.id,
          displayName: u.display_name,
          createdAt: u.created_at
        })) || []
      })

      // Filtrer l'utilisateur actuel et les amis existants
      const filtered = data.filter(u => {
        const isCurrentUser = u.id === user.id
        const isExistingFriend = friends.some(f => f.profiles?.id === u.id)
        
        logDebug('searchUsers: Filtrage utilisateur', {
          userId: u.id?.substring(0, 8) + '...',
          displayName: u.display_name,
          isCurrentUser,
          isExistingFriend,
          shouldInclude: !isCurrentUser && !isExistingFriend
        })
        
        return !isCurrentUser && !isExistingFriend
      })
      
      logInfo('searchUsers: Résultats filtrés', {
        originalCount: data?.length || 0,
        filteredCount: filtered.length,
        currentUserId: user.id?.substring(0, 8) + '...',
        existingFriendsCount: friends.length,
        query: query.trim(),
        step: 'results_filtered',
        filteredResults: filtered.map(u => ({
          id: u.id?.substring(0, 8) + '...',
          displayName: u.display_name,
          createdAt: u.created_at
        }))
      })

      logApiCall('GET', apiUrl, { query }, {
        status: response.status,
        ok: response.ok,
        responseTime,
        data: {
          originalResultsCount: data?.length || 0,
          filteredResultsCount: filtered.length
        }
      })
      
      setSearchResults(filtered)
      
      logInfo('searchUsers: Résultats de recherche mis à jour', {
        finalResultsCount: filtered.length,
        query: query.trim(),
        totalTime: Date.now() - startTime,
        step: 'search_completed'
      })
      
    } catch (err) {
      const totalTime = Date.now() - startTime
      
      logError('Erreur lors de la recherche', err, {
        query: query.trim(),
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 500),
        totalTime,
        step: 'search_error',
        networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown'
      })
    } finally {
      const totalDuration = Date.now() - startTime
      
      setSearchLoading(false)
      
      logPerformance('searchUsers', totalDuration, {
        query: query.trim(),
        resultsCount: searchResults.length
      })
      
      logDebug('searchUsers: PROCESSUS TERMINÉ', {
        query: query.trim(),
        totalDuration,
        step: 'search_end'
      })
    }
  }

  const sendFriendRequest = async (friendId) => {
    const startTime = Date.now()
    
    logUserInteraction('SEND_FRIEND_REQUEST_START', 'amis-page', {
      friendId: friendId?.substring(0, 8) + '...',
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    })

    logInfo('sendFriendRequest: DEBUT envoi demande', {
      friendId: friendId?.substring(0, 8) + '...',
      currentUserId: user.id?.substring(0, 8) + '...',
      step: 'send_request_start'
    })

    try {
      const requestData = {
        action: 'send_request',
        user_id: user.id,
        friend_id: friendId
      }

      logDebug('sendFriendRequest: Préparation données requête', {
        action: requestData.action,
        hasUserId: !!requestData.user_id,
        hasFriendId: !!requestData.friend_id,
        step: 'request_data_prepared'
      })

      logApiCall('POST', '/api/friends', requestData, null)

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const responseTime = Date.now() - startTime

      logInfo('sendFriendRequest: Réponse reçue', {
        status: response.status,
        ok: response.ok,
        responseTime,
        friendId: friendId?.substring(0, 8) + '...',
        step: 'response_received'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logError('sendFriendRequest: Erreur réponse', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          friendId: friendId?.substring(0, 8) + '...',
          step: 'response_error'
        })
        throw new Error('Erreur lors de l\'envoi')
      }

      // Remove from search results
      const previousResultsCount = searchResults.length
      setSearchResults(prev => prev.filter(u => u.id !== friendId))
      
      logInfo('sendFriendRequest: Demande envoyée avec succès', {
        friendId: friendId?.substring(0, 8) + '...',
        previousResultsCount,
        newResultsCount: searchResults.length - 1,
        responseTime,
        step: 'request_sent_success'
      })

      logApiCall('POST', '/api/friends', requestData, {
        status: response.status,
        ok: response.ok,
        responseTime
      })

      logUserInteraction('SEND_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        friendId: friendId?.substring(0, 8) + '...',
        responseTime,
        timestamp: new Date().toISOString()
      })

    } catch (err) {
      const totalTime = Date.now() - startTime

      logError('Erreur envoi demande d\'ami', err, {
        friendId: friendId?.substring(0, 8) + '...',
        currentUserId: user.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 500),
        totalTime,
        step: 'send_request_error'
      })
      
      setError('Impossible d\'envoyer la demande')

      logUserInteraction('SEND_FRIEND_REQUEST_ERROR', 'amis-page', { 
        friendId: friendId?.substring(0, 8) + '...',
        error: err.message,
        totalTime,
        timestamp: new Date().toISOString()
      })
    } finally {
      logPerformance('sendFriendRequest', Date.now() - startTime, {
        friendId: friendId?.substring(0, 8) + '...'
      })
    }
  }

  const acceptRequest = async (requestId) => {
    const startTime = Date.now()

    logUserInteraction('ACCEPT_FRIEND_REQUEST_START', 'amis-page', {
      requestId,
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    })

    logInfo('acceptRequest: DEBUT acceptation demande', {
      requestId,
      currentUserId: user.id?.substring(0, 8) + '...',
      step: 'accept_start'
    })

    try {
      const requestData = {
        action: 'accept_request',
        request_id: requestId
      }

      logApiCall('POST', '/api/friends', requestData, null)

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const responseTime = Date.now() - startTime

      logInfo('acceptRequest: Réponse reçue', {
        status: response.status,
        ok: response.ok,
        responseTime,
        requestId,
        step: 'response_received'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logError('acceptRequest: Erreur réponse', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestId,
          step: 'response_error'
        })
        throw new Error('Erreur lors de l\'acceptation')
      }

      logInfo('acceptRequest: Rechargement des données après acceptation', {
        requestId,
        step: 'reloading_data'
      })

      loadFriendsData()

      logApiCall('POST', '/api/friends', requestData, {
        status: response.status,
        ok: response.ok,
        responseTime
      })

      logUserInteraction('ACCEPT_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      })

    } catch (err) {
      const totalTime = Date.now() - startTime

      logError('Erreur acceptation demande', err, {
        requestId,
        currentUserId: user.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        totalTime,
        step: 'accept_error'
      })
      
      setError('Impossible d\'accepter la demande')

      logUserInteraction('ACCEPT_FRIEND_REQUEST_ERROR', 'amis-page', { 
        requestId,
        error: err.message,
        totalTime,
        timestamp: new Date().toISOString()
      })
    } finally {
      logPerformance('acceptRequest', Date.now() - startTime, { requestId })
    }
  }

  const rejectRequest = async (requestId) => {
    const startTime = Date.now()

    logUserInteraction('REJECT_FRIEND_REQUEST_START', 'amis-page', {
      requestId,
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    })

    logInfo('rejectRequest: DEBUT refus demande', {
      requestId,
      currentUserId: user.id?.substring(0, 8) + '...',
      step: 'reject_start'
    })

    try {
      const requestData = {
        action: 'reject_request',
        request_id: requestId
      }

      logApiCall('POST', '/api/friends', requestData, null)

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        logError('rejectRequest: Erreur réponse', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestId,
          step: 'response_error'
        })
        throw new Error('Erreur lors du refus')
      }

      loadFriendsData()

      logApiCall('POST', '/api/friends', requestData, {
        status: response.status,
        ok: response.ok,
        responseTime
      })

      logUserInteraction('REJECT_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      })

    } catch (err) {
      logError('Erreur refus demande', err, {
        requestId,
        errorMessage: err.message,
        step: 'reject_error'
      })
      
      setError('Impossible de refuser la demande')
    } finally {
      logPerformance('rejectRequest', Date.now() - startTime, { requestId })
    }
  }

  // Handle tab changes with logging
  const handleTabChange = (newTab) => {
    logUserInteraction('TAB_CHANGE', 'amis-page', {
      fromTab: activeTab,
      toTab: newTab,
      friendsCount: friends.length,
      pendingRequestsCount: pendingRequests.length,
      searchResultsCount: searchResults.length,
      timestamp: new Date().toISOString()
    })

    logComponentEvent('Amis', 'tab-changed', {
      previousTab: activeTab,
      newTab: newTab,
      availableTabs: ['friends', 'requests', 'search']
    })

    setActiveTab(newTab)
  }

  // Handle search input changes with logging
  const handleSearchChange = (e) => {
    const newQuery = e.target.value
    
    logUserInteraction('SEARCH_INPUT_CHANGE', 'amis-page', {
      previousQuery: searchQuery,
      newQuery: newQuery,
      queryLength: newQuery.length,
      timestamp: new Date().toISOString()
    })

    setSearchQuery(newQuery)
    searchUsers(newQuery)
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
