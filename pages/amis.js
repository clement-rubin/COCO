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
  
  // Enhanced logging state
  const [pageLoadStartTime] = useState(Date.now())
  const [userInteractionCount, setUserInteractionCount] = useState(0)
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

  // Enhanced auth check logging
  useEffect(() => {
    logComponentLifecycle('Amis', 'useEffect-auth-check', {
      authLoading,
      hasUser: !!user,
      userEmail: user?.email,
      userDisplayName: user?.user_metadata?.display_name,
      userId: user?.id?.substring(0, 8) + '...',
      step: 'auth_check_start',
      pageLoadTime: Date.now() - pageLoadStartTime
    })

    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'amis-page', {
        reason: 'user_not_authenticated',
        targetPage: '/amis',
        authLoading,
        redirectUrl: '/login?redirect=' + encodeURIComponent('/amis'),
        timestamp: new Date().toISOString(),
        pageLoadTime: Date.now() - pageLoadStartTime
      })
      router.push('/login?redirect=' + encodeURIComponent('/amis'))
    } else if (user) {
      logDebug('User authenticated on amis page', {
        userEmail: user.email,
        userId: user.id?.substring(0, 8) + '...',
        userDisplayName: user.user_metadata?.display_name,
        userCreatedAt: user.created_at,
        userLastSignIn: user.last_sign_in_at,
        step: 'auth_check_success',
        authMethod: user.app_metadata?.provider,
        userRole: user.role
      })
    }
  }, [user, authLoading, router])

  // Load friends and pending requests with enhanced logging
  useEffect(() => {
    logComponentLifecycle('Amis', 'useEffect-load-friends', {
      hasUser: !!user,
      userEmail: user?.email,
      userId: user?.id?.substring(0, 8) + '...',
      step: 'load_friends_effect_start',
      pageLoadTime: Date.now() - pageLoadStartTime
    })

    if (user) {
      logInfo('Starting to load friends data', {
        userEmail: user.email,
        userId: user.id?.substring(0, 8) + '...',
        userDisplayName: user.user_metadata?.display_name,
        timestamp: new Date().toISOString(),
        pageLoadTime: Date.now() - pageLoadStartTime
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

  // Tab change logging with user behavior analysis
  useEffect(() => {
    setUserInteractionCount(prev => prev + 1)
    
    logComponentEvent('Amis', 'tab-change', {
      newTab: activeTab,
      friendsCount: friends.length,
      pendingRequestsCount: pendingRequests.length,
      searchResultsCount: searchResults.length,
      timestamp: new Date().toISOString(),
      interactionCount: userInteractionCount + 1,
      sessionTime: Date.now() - pageLoadStartTime
    })

    // Track tab usage patterns
    const tabUsagePattern = {
      friends: activeTab === 'friends',
      requests: activeTab === 'requests', 
      search: activeTab === 'search'
    }

    logUserInteraction('TAB_USAGE_PATTERN', 'amis-page', {
      pattern: tabUsagePattern,
      currentTab: activeTab,
      sessionTime: Date.now() - pageLoadStartTime,
      totalInteractions: userInteractionCount + 1
    })
  }, [activeTab])

  const loadFriendsData = async (retryCount = 0, maxRetries = 3) => {
    if (!user) {
      logWarning('loadFriendsData called without user', {
        hasUser: !!user,
        authLoading,
        step: 'early_return_no_user',
        callStack: new Error().stack?.substring(0, 500)
      })
      return
    }

    const startTime = Date.now()
    const apiCallId = Math.random().toString(36).substring(2, 15)
    
    logInfo('loadFriendsData: DEBUT du processus', {
      apiCallId,
      userEmail: user.email,
      userId: user.id?.substring(0, 8) + '...',
      retryCount,
      maxRetries,
      initialActiveTab: activeTab,
      timestamp: new Date().toISOString(),
      sessionTime: Date.now() - pageLoadStartTime,
      currentFriendsCount: friends.length,
      currentPendingCount: pendingRequests.length
    })

    try {
      setLoading(true)
      setError(null)
      
      logDebug('loadFriendsData: État initial défini', {
        apiCallId,
        loadingSet: true,
        errorReset: true,
        step: 'state_reset'
      })

      const apiUrl = `/api/friends?user_id=${user.id}`
      
      logDebug('loadFriendsData: Préparation appel API', {
        apiCallId,
        url: apiUrl,
        userId: user.id?.substring(0, 8) + '...',
        method: 'GET',
        step: 'api_preparation',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      logApiCall('GET', apiUrl, null, null)
      
      const response = await fetch(apiUrl)
      const responseTime = Date.now() - startTime
      
      // Add to API call history for analytics
      const apiCallRecord = {
        id: apiCallId,
        method: 'GET',
        url: apiUrl,
        status: response.status,
        responseTime,
        timestamp: new Date().toISOString(),
        success: response.ok
      }
      setApiCallHistory(prev => [...prev, apiCallRecord])
      
      logInfo('loadFriendsData: Réponse API reçue', {
        apiCallId,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime,
        step: 'api_response_received',
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      })

      logPerformance('Friends API fetch', responseTime, {
        apiCallId,
        url: apiUrl,
        status: response.status,
        ok: response.ok,
        userId: user.id?.substring(0, 8) + '...'
      })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch (textError) {
          logWarning('Could not read error response text', textError)
          errorText = 'Unable to read error details'
        }
        
        const errorRecord = {
          id: apiCallId,
          type: 'API_ERROR',
          status: response.status,
          message: errorText,
          timestamp: new Date().toISOString()
        }
        setErrorHistory(prev => [...prev, errorRecord])
        
        logError('loadFriendsData: Réponse API non-OK', {
          apiCallId,
          status: response.status,
          statusText: response.statusText,
          errorText,
          step: 'api_error_response',
          userId: user.id?.substring(0, 8) + '...',
          retryCount
        })

        // Retry logic for 5xx errors
        if (response.status >= 500 && retryCount < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000)
          logInfo(`Retrying loadFriendsData in ${retryDelay}ms`, {
            apiCallId,
            retryCount: retryCount + 1,
            maxRetries,
            retryDelay
          })
          
          setTimeout(() => {
            loadFriendsData(retryCount + 1, maxRetries)
          }, retryDelay)
          return
        }

        throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}${errorText ? ': ' + errorText : ''}`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        logError('Failed to parse JSON response', jsonError, { apiCallId })
        throw new Error('Invalid JSON response from server')
      }
      
      logInfo('loadFriendsData: Données reçues et parsées', {
        apiCallId,
        dataType: typeof data,
        hasFriends: !!data.friends,
        hasPendingRequests: !!data.pendingRequests,
        friendsCount: data.friends?.length || 0,
        pendingRequestsCount: data.pendingRequests?.length || 0,
        step: 'data_parsed',
        dataSize: JSON.stringify(data).length,
        sampleFriends: data.friends?.slice(0, 2).map(f => ({
          id: f.id,
          friendId: f.friend_id,
          profileName: f.profiles?.display_name,
          profileId: f.profiles?.id,
          createdAt: f.created_at
        })) || [],
        samplePendingRequests: data.pendingRequests?.slice(0, 2).map(r => ({
          id: r.id,
          userId: r.user_id,
          profileName: r.profiles?.display_name,
          profileId: r.profiles?.id,
          createdAt: r.created_at
        })) || []
      })

      logApiCall('GET', apiUrl, null, {
        apiCallId,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        responseTime,
        data: {
          friendsCount: data.friends?.length || 0,
          pendingRequestsCount: data.pendingRequests?.length || 0
        }
      })

      // Track data changes
      const previousFriendsCount = friends.length
      const previousPendingCount = pendingRequests.length
      const newFriendsCount = data.friends?.length || 0
      const newPendingCount = data.pendingRequests?.length || 0

      if (previousFriendsCount !== newFriendsCount || previousPendingCount !== newPendingCount) {
        logUserInteraction('DATA_CHANGE_DETECTED', 'amis-page', {
          changes: {
            friends: {
              before: previousFriendsCount,
              after: newFriendsCount,
              delta: newFriendsCount - previousFriendsCount
            },
            pendingRequests: {
              before: previousPendingCount,
              after: newPendingCount,
              delta: newPendingCount - previousPendingCount
            }
          },
          timestamp: new Date().toISOString(),
          apiCallId
        })
      }

      setFriends(data.friends || [])
      setPendingRequests(data.pendingRequests || [])
      setError(null)
      
      logInfo('loadFriendsData: État mis à jour avec succès', {
        apiCallId,
        finalFriendsCount: data.friends?.length || 0,
        finalPendingRequestsCount: data.pendingRequests?.length || 0,
        totalProcessingTime: Date.now() - startTime,
        step: 'state_updated_success',
        dataChangesSummary: {
          friendsAdded: Math.max(0, newFriendsCount - previousFriendsCount),
          friendsRemoved: Math.max(0, previousFriendsCount - newFriendsCount),
          requestsAdded: Math.max(0, newPendingCount - previousPendingCount),
          requestsRemoved: Math.max(0, previousPendingCount - newPendingCount)
        }
      })

    } catch (err) {
      const totalTime = Date.now() - startTime
      const errorRecord = {
        id: apiCallId,
        type: 'LOAD_FRIENDS_ERROR',
        message: err.message,
        stack: err.stack?.substring(0, 500),
        timestamp: new Date().toISOString(),
        retryCount
      }
      setErrorHistory(prev => [...prev, errorRecord])
      
      logError('Erreur lors du chargement des amis', err, {
        apiCallId,
        userEmail: user?.email,
        userId: user?.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 500),
        errorName: err.name,
        totalTime,
        step: 'error_caught',
        networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        retryCount,
        errorCategory: err.name === 'TypeError' ? 'NETWORK_ERROR' : 'API_ERROR'
      })
      
      // Show user-friendly error message
      if (retryCount >= maxRetries) {
        setError('Impossible de charger vos amis. Veuillez rafraîchir la page.')
      } else {
        setError(`Erreur temporaire (tentative ${retryCount + 1}/${maxRetries + 1}). Nouvelle tentative...`)
      }
    } finally {
      const totalDuration = Date.now() - startTime
      
      logDebug('loadFriendsData: Nettoyage final', {
        apiCallId,
        step: 'cleanup',
        totalDuration
      })
      
      setLoading(false)
      
      logPerformance('loadFriendsData total', totalDuration, {
        apiCallId,
        userEmail: user?.email,
        userId: user?.id?.substring(0, 8) + '...',
        success: !error,
        finalCounts: {
          friends: friends.length,
          pendingRequests: pendingRequests.length
        }
      })
      
      logInfo('loadFriendsData: PROCESSUS TERMINÉ', {
        apiCallId,
        success: !error,
        totalDuration,
        step: 'process_end',
        timestamp: new Date().toISOString(),
        performanceGrade: totalDuration < 1000 ? 'EXCELLENT' : totalDuration < 3000 ? 'GOOD' : 'SLOW'
      })
    }
  }

  const searchUsers = async (query, retryCount = 0, maxRetries = 2) => {
    if (!query.trim()) {
      logDebug('searchUsers: Query vide, reset des résultats', {
        queryLength: query.length,
        queryTrimmed: query.trim(),
        step: 'early_return_empty_query',
        previousResultsCount: searchResults.length
      })
      setSearchResults([])
      return
    }

    const startTime = Date.now()
    const searchId = Math.random().toString(36).substring(2, 15)
    
    // Add to search history
    const searchRecord = {
      id: searchId,
      query: query.trim(),
      timestamp: new Date().toISOString(),
      startTime
    }
    setSearchHistory(prev => [...prev, searchRecord])
    
    logUserInteraction('SEARCH_USERS', 'amis-page', {
      searchId,
      query: query.trim(),
      queryLength: query.trim().length,
      timestamp: new Date().toISOString(),
      searchHistoryCount: searchHistory.length + 1,
      sessionTime: Date.now() - pageLoadStartTime
    })

    logInfo('searchUsers: DEBUT de la recherche', {
      searchId,
      query: query.trim(),
      queryLength: query.trim().length,
      currentResultsCount: searchResults.length,
      step: 'search_start',
      searchContext: {
        friendsCount: friends.length,
        pendingRequestsCount: pendingRequests.length,
        previousSearchesCount: searchHistory.length
      }
    })

    setSearchLoading(true)
    
    try {
      const apiUrl = `/api/friends?query=${encodeURIComponent(query)}`
      
      logDebug('searchUsers: Préparation appel API recherche', {
        searchId,
        url: apiUrl,
        encodedQuery: encodeURIComponent(query),
        method: 'GET',
        step: 'api_preparation'
      })

      logApiCall('GET', apiUrl, { query }, null)
      
      const response = await fetch(apiUrl)
      const responseTime = Date.now() - startTime
      
      logInfo('searchUsers: Réponse API recherche reçue', {
        searchId,
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
          searchId,
          status: response.status,
          statusText: response.statusText,
          errorText,
          query: query.trim(),
          step: 'api_error_response',
          retryCount
        })

        // Retry logic for search
        if (response.status >= 500 && retryCount < maxRetries) {
          const retryDelay = Math.min(500 * Math.pow(2, retryCount), 2000)
          setTimeout(() => {
            searchUsers(query, retryCount + 1, maxRetries)
          }, retryDelay)
          return
        }

        throw new Error(`Erreur de recherche: ${response.status}`)
      }

      const data = await response.json()
      
      logInfo('searchUsers: Données de recherche reçues', {
        searchId,
        dataType: typeof data,
        isArray: Array.isArray(data),
        rawResultsCount: data?.length || 0,
        query: query.trim(),
        step: 'data_received',
        sampleResults: data?.slice(0, 3).map(u => ({
          id: u.id?.substring(0, 8) + '...',
          displayName: u.display_name,
          createdAt: u.created_at
        })) || []
      })

      // Filtrer l'utilisateur actuel et les amis existants
      const filtered = data.filter(u => {
        const isCurrentUser = u.id === user.id
        const isExistingFriend = friends.some(f => f.profiles?.id === u.id)
        
        logDebug('searchUsers: Filtrage utilisateur', {
          searchId,
          userId: u.id?.substring(0, 8) + '...',
          displayName: u.display_name,
          isCurrentUser,
          isExistingFriend,
          shouldInclude: !isCurrentUser && !isExistingFriend
        })
        
        return !isCurrentUser && !isExistingFriend
      })
      
      logInfo('searchUsers: Résultats filtrés', {
        searchId,
        originalCount: data?.length || 0,
        filteredCount: filtered.length,
        currentUserId: user.id?.substring(0, 8) + '...',
        existingFriendsCount: friends.length,
        query: query.trim(),
        step: 'results_filtered',
        filteringStats: {
          removedCurrentUser: data?.some(u => u.id === user.id) || false,
          removedExistingFriends: (data?.length || 0) - filtered.length - (data?.some(u => u.id === user.id) ? 1 : 0)
        },
        filteredResults: filtered.map(u => ({
          id: u.id?.substring(0, 8) + '...',
          displayName: u.display_name,
          createdAt: u.created_at
        }))
      })

      logApiCall('GET', apiUrl, { query }, {
        searchId,
        status: response.status,
        ok: response.ok,
        responseTime,
        data: {
          originalResultsCount: data?.length || 0,
          filteredResultsCount: filtered.length
        }
      })
      
      setSearchResults(filtered)
      
      // Update search history with results
      setSearchHistory(prev => 
        prev.map(search => 
          search.id === searchId 
            ? { ...search, resultsCount: filtered.length, responseTime, success: true }
            : search
        )
      )
      
      logInfo('searchUsers: Résultats de recherche mis à jour', {
        searchId,
        finalResultsCount: filtered.length,
        query: query.trim(),
        totalTime: Date.now() - startTime,
        step: 'search_completed',
        searchEfficiency: {
          resultsPerSecond: Math.round((filtered.length / (responseTime / 1000)) * 100) / 100,
          searchQuality: filtered.length > 0 ? 'RESULTS_FOUND' : 'NO_RESULTS'
        }
      })
      
    } catch (err) {
      const totalTime = Date.now() - startTime
      
      // Update search history with error
      setSearchHistory(prev => 
        prev.map(search => 
          search.id === searchId 
            ? { ...search, error: err.message, responseTime: totalTime, success: false, retryCount }
            : search
        )
      )
      
      logError('Erreur lors de la recherche', err, {
        searchId,
        query: query.trim(),
        errorMessage: err.message,
        errorStack: err.stack?.substring(0, 500),
        totalTime,
        step: 'search_error',
        networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        retryCount
      })
    } finally {
      const totalDuration = Date.now() - startTime
      
      setSearchLoading(false)
      
      logPerformance('searchUsers', totalDuration, {
        searchId,
        query: query.trim(),
        resultsCount: searchResults.length
      })
      
      logDebug('searchUsers: PROCESSUS TERMINÉ', {
        searchId,
        query: query.trim(),
        totalDuration,
        step: 'search_end'
      })
    }
  }

  const sendFriendRequest = async (userId) => {
    const startTime = Date.now()
    const requestId = Math.random().toString(36).substring(2, 15)

    logUserInteraction('SEND_FRIEND_REQUEST_START', 'amis-page', {
      requestId,
      targetUserId: userId?.substring(0, 8) + '...',
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    })

    try {
      const requestData = {
        action: 'send_request',
        user_id: user.id,
        friend_id: userId
      }

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const responseTime = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'envoi')
      }

      // Retirer de la liste de recherche
      const targetUser = searchResults.find(u => u.user_id === userId)
      setSearchResults(prev => prev.filter(u => u.user_id !== userId))
      
      logInfo('Demande d\'ami envoyée avec succès', {
        requestId,
        targetUserId: userId?.substring(0, 8) + '...',
        targetUserName: targetUser?.display_name,
        responseTime
      })

      logUserInteraction('SEND_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        requestId,
        targetUserId: userId?.substring(0, 8) + '...',
        responseTime
      })

    } catch (err) {
      logError('Erreur envoi demande d\'ami', err, {
        requestId,
        targetUserId: userId?.substring(0, 8) + '...',
        errorMessage: err.message
      })
      
      setError('Impossible d\'envoyer la demande: ' + err.message)
    }
  }

  const acceptRequest = async (requestId) => {
    const startTime = Date.now()
    const actionId = Math.random().toString(36).substring(2, 15)

    setUserInteractionCount(prev => prev + 1)

    const targetRequest = pendingRequests.find(r => r.id === requestId)

    logUserInteraction('ACCEPT_FRIEND_REQUEST_START', 'amis-page', {
      actionId,
      requestId,
      requesterName: targetRequest?.profiles?.display_name,
      requesterId: targetRequest?.user_id?.substring(0, 8) + '...',
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      interactionCount: userInteractionCount + 1
    })

    logInfo('acceptRequest: DEBUT acceptation demande', {
      actionId,
      requestId,
      requesterName: targetRequest?.profiles?.display_name,
      requesterId: targetRequest?.user_id?.substring(0, 8) + '...',
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
        actionId,
        status: response.status,
        ok: response.ok,
        responseTime,
        requestId,
        step: 'response_received'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logError('acceptRequest: Erreur réponse', {
          actionId,
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestId,
          step: 'response_error'
        })
        throw new Error('Erreur lors de l\'acceptation')
      }

      logInfo('acceptRequest: Rechargement des données après acceptation', {
        actionId,
        requestId,
        step: 'reloading_data'
      })

      loadFriendsData()

      logApiCall('POST', '/api/friends', requestData, {
        actionId,
        status: response.status,
        ok: response.ok,
        responseTime
      })

      logUserInteraction('ACCEPT_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        actionId,
        requestId,
        requesterName: targetRequest?.profiles?.display_name,
        responseTime,
        timestamp: new Date().toISOString()
      })

    } catch (err) {
      const totalTime = Date.now() - startTime

      logError('Erreur acceptation demande', err, {
        actionId,
        requestId,
        currentUserId: user.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        totalTime,
        step: 'accept_error'
      })
      
      setError('Impossible d\'accepter la demande')

      logUserInteraction('ACCEPT_FRIEND_REQUEST_ERROR', 'amis-page', { 
        actionId,
        requestId,
        error: err.message,
        totalTime,
        timestamp: new Date().toISOString()
      })
    } finally {
      logPerformance('acceptRequest', Date.now() - startTime, { actionId, requestId })
    }
  }

  const rejectRequest = async (requestId) => {
    const startTime = Date.now()
    const actionId = Math.random().toString(36).substring(2, 15)

    setUserInteractionCount(prev => prev + 1)

    const targetRequest = pendingRequests.find(r => r.id === requestId)

    logUserInteraction('REJECT_FRIEND_REQUEST_START', 'amis-page', {
      actionId,
      requestId,
      requesterName: targetRequest?.profiles?.display_name,
      requesterId: targetRequest?.user_id?.substring(0, 8) + '...',
      currentUserId: user.id?.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      interactionCount: userInteractionCount + 1
    })

    logInfo('rejectRequest: DEBUT refus demande', {
      actionId,
      requestId,
      requesterName: targetRequest?.profiles?.display_name,
      requesterId: targetRequest?.user_id?.substring(0, 8) + '...',
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
          actionId,
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
        actionId,
        status: response.status,
        ok: response.ok,
        responseTime
      })

      logUserInteraction('REJECT_FRIEND_REQUEST_SUCCESS', 'amis-page', { 
        actionId,
        requestId,
        requesterName: targetRequest?.profiles?.display_name,
        responseTime,
        timestamp: new Date().toISOString()
      })

    } catch (err) {
      logError('Erreur refus demande', err, {
        actionId,
        requestId,
        errorMessage: err.message,
        step: 'reject_error'
      })
      
      setError('Impossible de refuser la demande')
    } finally {
      logPerformance('rejectRequest', Date.now() - startTime, { actionId, requestId })
    }
  }

  // Handle tab changes with enhanced logging
  const handleTabChange = (newTab) => {
    const tabChangeId = Math.random().toString(36).substring(2, 15)
    
    setUserInteractionCount(prev => prev + 1)
    
    logUserInteraction('TAB_CHANGE', 'amis-page', {
      tabChangeId,
      fromTab: activeTab,
      toTab: newTab,
      friendsCount: friends.length,
      pendingRequestsCount: pendingRequests.length,
      searchResultsCount: searchResults.length,
      timestamp: new Date().toISOString(),
      interactionCount: userInteractionCount + 1,
      sessionTime: Date.now() - pageLoadStartTime,
      tabUsagePattern: {
        previousTab: activeTab,
        newTab: newTab,
        timeOnPreviousTab: Date.now() - pageLoadStartTime
      }
    })

    logComponentEvent('Amis', 'tab-changed', {
      tabChangeId,
      previousTab: activeTab,
      newTab: newTab,
      availableTabs: ['friends', 'requests', 'search'],
      userBehavior: {
        totalInteractions: userInteractionCount + 1,
        sessionDuration: Date.now() - pageLoadStartTime,
        tabSwitchFrequency: (userInteractionCount + 1) / ((Date.now() - pageLoadStartTime) / 1000)
      }
    })

    setActiveTab(newTab)
  }

  // Handle search input changes with enhanced logging
  const handleSearchChange = (e) => {
    const newQuery = e.target.value
    const searchChangeId = Math.random().toString(36).substring(2, 15)
    
    setUserInteractionCount(prev => prev + 1)
    
    logUserInteraction('SEARCH_INPUT_CHANGE', 'amis-page', {
      searchChangeId,
      previousQuery: searchQuery,
      newQuery: newQuery,
      queryLength: newQuery.length,
      timestamp: new Date().toISOString(),
      interactionCount: userInteractionCount + 1,
      searchBehavior: {
        charactersAdded: newQuery.length - searchQuery.length,
        isBackspacing: newQuery.length < searchQuery.length,
        searchPattern: newQuery.length > 0 ? 'TYPING' : 'CLEARING'
      }
    })

    setSearchQuery(newQuery)
    searchUsers(newQuery) // This will now use retry logic
  }

  // Log component performance on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionSummary = {
        sessionDuration: Date.now() - pageLoadStartTime,
        totalInteractions: userInteractionCount,
        totalApiCalls: apiCallHistory.length,
        totalErrors: errorHistory.length,
        totalSearches: searchHistory.length,
        finalCounts: {
          friends: friends.length,
          pendingRequests: pendingRequests.length,
          searchResults: searchResults.length
        },
        performanceMetrics: {
          averageApiResponseTime: apiCallHistory.length > 0 ? 
            apiCallHistory.reduce((sum, call) => sum + (call.responseTime || 0), 0) / apiCallHistory.length : 0,
          errorRate: apiCallHistory.length > 0 ? (errorHistory.length / apiCallHistory.length) * 100 : 0,
          searchSuccessRate: searchHistory.length > 0 ? 
            (searchHistory.filter(s => s.success).length / searchHistory.length) * 100 : 0
        }
      }

      logInfo('Amis page session summary', sessionSummary)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [userInteractionCount, apiCallHistory, errorHistory, searchHistory, friends, pendingRequests, searchResults])

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

      {/* Debug Info - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 9999
        }}>
          <div>Session: {Math.round((Date.now() - pageLoadStartTime) / 1000)}s</div>
          <div>Interactions: {userInteractionCount}</div>
          <div>API Calls: {apiCallHistory.length}</div>
          <div>Errors: {errorHistory.length}</div>
          <div>Searches: {searchHistory.length}</div>
          <div>Tab: {activeTab}</div>
        </div>
      )}
    </div>
  )
}
