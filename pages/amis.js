import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { logError, logInfo } from '../utils/logger'
import { getFriendshipStats, removeFriend } from '../utils/profileUtils'
import styles from '../styles/FriendsPage.module.css'

const tabs = [
  { id: 'friends', label: 'Mes amis' },
  { id: 'requests', label: 'Demandes' },
  { id: 'discover', label: 'Decouvrir' }
]

const MIN_SEARCH_LENGTH = 2

export default function Amis() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [actionState, setActionState] = useState({})
  const [stats, setStats] = useState({ friends: 0, pending: 0, blocked: 0 })

  const showFeedback = useCallback((text, type = 'success') => {
    setFeedback({ text, type })
    setTimeout(() => setFeedback(null), 3000)
  }, [])

  const ensureProfileExists = useCallback(async (userId) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!existingProfile) {
        const { error } = await supabase.from('profiles').insert({
          user_id: userId,
          display_name: 'Utilisateur',
          bio: '',
          is_private: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

        if (error) {
          logError('Failed to create fallback profile', error)
        }
      }
    } catch (error) {
      if (error?.code !== 'PGRST116' && error?.code !== 'PGRST301') {
        logError('Error ensuring profile exists', error)
      }
    }
  }, [])

  const loadFriendsFallback = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_user_friends_simple', {
        target_user_id: userId
      })

      if (error) {
        throw error
      }

      const formatted =
        data?.map((friend) => ({
          friendshipId: friend.friendship_id,
          userId: friend.friend_user_id,
          name: friend.friend_display_name,
          bio: friend.friend_bio,
          avatar: friend.friend_avatar_url
        })) || []

      setFriends(formatted)
      return formatted
    } catch (error) {
      logError('Failed to load friends', error)
      setFriends([])
      return []
    }
  }, [])

  const loadFriendRequestsFallback = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests', {
        target_user_id: userId
      })

      if (error) {
        throw error
      }

      const formatted =
        data?.map((request) => ({
          id: request.friendship_id,
          userId: request.requester_user_id,
          name: request.requester_display_name,
          bio: request.requester_bio,
          avatar: request.requester_avatar_url
        })) || []

      setFriendRequests(formatted)
      return formatted
    } catch (error) {
      logError('Failed to load friend requests', error)
      setFriendRequests([])
      return []
    }
  }, [])

  const loadFriendsOverview = useCallback(
    async (userId) => {
      if (!userId) {
        return { friendsList: [], requestsList: [] }
      }

      try {
        const response = await fetch(`/api/friends?user_id=${encodeURIComponent(userId)}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = await response.json()

        const normalizeFriend = (friend) => ({
          friendshipId:
            friend.friendshipId ??
            friend.id ??
            friend.friendship_id ??
            null,
          userId:
            friend.friend_id ??
            friend.friend_user_id ??
            friend.user_id ??
            friend.friend_profile?.user_id ??
            null,
          name:
            friend.friend_profile?.display_name ??
            friend.friend_display_name ??
            friend.name ??
            'Utilisateur',
          bio:
            friend.friend_profile?.bio ??
            friend.friend_bio ??
            '',
          avatar:
            friend.friend_profile?.avatar_url ??
            friend.friend_avatar_url ??
            null
        })

        const normalizeRequest = (request) => ({
          id: request.id ?? request.friendship_id ?? null,
          userId:
            request.user_id ??
            request.requester_user_id ??
            request.requester_profile?.user_id ??
            request.profiles?.user_id ??
            null,
          name:
            request.requester_profile?.display_name ??
            request.requester_display_name ??
            request.name ??
            'Utilisateur',
          bio:
            request.requester_profile?.bio ??
            request.requester_bio ??
            '',
          avatar:
            request.requester_profile?.avatar_url ??
            request.requester_avatar_url ??
            null
        })

        const friendsList = (payload?.friends || [])
          .map(normalizeFriend)
          .filter((friend) => friend.userId)
        const requestsList = (payload?.pendingRequests || [])
          .map(normalizeRequest)
          .filter((request) => request.userId)

        setFriends(friendsList)
        setFriendRequests(requestsList)

        logInfo('Friends overview loaded', {
          userId: userId.substring(0, 8) + '...',
          friends: friendsList.length,
          pending: requestsList.length
        })

        return { friendsList, requestsList }
      } catch (error) {
        logError('Failed to load friends overview', error, {
          userId: userId.substring(0, 8) + '...'
        })

        const [friendsList, requestsList] = await Promise.all([
          loadFriendsFallback(userId),
          loadFriendRequestsFallback(userId)
        ])

        return { friendsList, requestsList }
      }
    },
    [loadFriendRequestsFallback, loadFriendsFallback]
  )

  const loadStats = useCallback(
    async (userId) => {
      try {
        const result = await getFriendshipStats(userId)
        setStats({
          friends: result?.friends || 0,
          pending: result?.pending || 0,
          blocked: result?.blocked || 0
        })
      } catch (error) {
        logError('Failed to load friendship stats', error)
        setStats({ friends: 0, pending: 0, blocked: 0 })
      }
    },
    []
  )

  const loadSuggestions = useCallback(async (userId, excludedIds = new Set()) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url, is_private')
        .eq('is_private', false)
        .order('updated_at', { ascending: false })
        .limit(20)

      if (error) {
        throw error
      }

      const filtered =
        data
          ?.filter((profile) => !excludedIds.has(profile.user_id) && profile.user_id !== userId)
          .slice(0, 8) || []

      setSuggestions(filtered)
      return filtered
    } catch (error) {
      logError('Failed to load friend suggestions', error)
      setSuggestions([])
      return []
    }
  }, [])

  const computeExcludedIds = useCallback(
    (friendsList, requestsList) => {
      const excluded = new Set()
      if (user?.id) {
        excluded.add(user.id)
      }
      friendsList?.forEach((friend) => excluded.add(friend.userId))
      requestsList?.forEach((request) => excluded.add(request.userId))
      return excluded
    },
    [user]
  )

  const checkUser = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user: currentUser }
      } = await supabase.auth.getUser()

      if (!currentUser) {
        router.push('/login?redirect=' + encodeURIComponent('/amis'))
        return
      }

      setUser(currentUser)

      const { friendsList, requestsList } = await loadFriendsOverview(currentUser.id)
      await loadStats(currentUser.id)
      const excluded = computeExcludedIds(friendsList, requestsList)
      await loadSuggestions(currentUser.id, excluded)
    } catch (error) {
      logError('Failed to initialise friends page', error)
      showFeedback('Impossible de charger vos amis pour le moment.', 'error')
    } finally {
      setLoading(false)
    }
  }, [computeExcludedIds, loadFriendsOverview, loadStats, loadSuggestions, router, showFeedback])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  const refreshLists = useCallback(async () => {
    if (!user) {
      return
    }
    const { friendsList, requestsList } = await loadFriendsOverview(user.id)
    await loadStats(user.id)
    const excluded = computeExcludedIds(friendsList, requestsList)
    await loadSuggestions(user.id, excluded)
  }, [computeExcludedIds, loadFriendsOverview, loadStats, loadSuggestions, user])

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!user) {
      return
    }
    const term = searchTerm.trim()
    if (term.length < MIN_SEARCH_LENGTH) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data, error } = await supabase.rpc('search_users_simple', {
        search_term: term,
        current_user_id: user.id
      })

      if (error) {
        throw error
      }

      const results = (data || []).filter((item) => item.user_id !== user.id)
      setSearchResults(results)
      setActiveTab('discover')
    } catch (error) {
      logError('Failed to search users', error)
      showFeedback('Erreur lors de la recherche.', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
  }

  const sendFriendRequest = async (targetUserId) => {
    if (!user || targetUserId === user.id) {
      return
    }
    const key = `send-${targetUserId}`
    setActionState((prev) => ({ ...prev, [key]: 'loading' }))
    let nextState
    try {
      await ensureProfileExists(user.id)
      await ensureProfileExists(targetUserId)

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        if (error.code === '23505') {
          showFeedback('Une demande est deja en cours.', 'error')
          nextState = 'pending'
        } else {
          throw error
        }
      } else {
        showFeedback('Demande envoyee.', 'success')
        logInfo('Friend request sent', { from: user.id, to: targetUserId })
        nextState = 'pending'
        await refreshLists()
      }
    } catch (error) {
      logError('Failed to send friend request', error)
      showFeedback('Impossible denvoyer la demande.', 'error')
    } finally {
      setActionState((prev) => ({
        ...prev,
        [key]: nextState
      }))
    }
  }

  const respondToFriendRequest = async (friendshipId, action, requesterId) => {
    if (!user) {
      return
    }
    const key = `request-${friendshipId}`
    setActionState((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friendships')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('id', friendshipId)

        if (error) {
          throw error
        }
        showFeedback('Demande acceptee.', 'success')
      } else {
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
        if (error) {
          throw error
        }
        showFeedback('Demande refusee.', 'success')
      }

      await refreshLists()
      setActionState((prev) => ({ ...prev, [key]: undefined }))
      setActionState((prev) => ({ ...prev, [`send-${requesterId}`]: undefined }))
    } catch (error) {
      logError('Failed to respond to friend request', error)
      showFeedback('Action impossible pour le moment.', 'error')
      setActionState((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const handleRemoveFriend = async (friendUserId) => {
    if (!user) {
      return
    }
    const key = `remove-${friendUserId}`
    setActionState((prev) => ({ ...prev, [key]: 'loading' }))
    try {
      const result = await removeFriend(user.id, friendUserId)
      if (!result?.success) {
        throw new Error(result?.error || 'remove failed')
      }
      showFeedback('Ami retire.', 'success')
      await refreshLists()
    } catch (error) {
      logError('Failed to remove friend', error)
      showFeedback('Impossible de retirer cet ami.', 'error')
    } finally {
      setActionState((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const activeDiscoverList = useMemo(() => {
    if (searchTerm.trim().length >= MIN_SEARCH_LENGTH) {
      return searchResults
    }
    return suggestions
  }, [searchResults, searchTerm, suggestions])

  const renderFriendCard = (friend) => {
    const key = `remove-${friend.userId}`
    const state = actionState[key]
    return (
      <article key={friend.friendshipId} className={styles.card}>
        <div className={styles.avatar}>
          {friend.avatar ? (
            <img src={friend.avatar} alt={friend.name || 'Ami'} />
          ) : (
            <span>{friend.name?.charAt(0)?.toUpperCase() || 'A'}</span>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3>{friend.name || 'Utilisateur'}</h3>
          <p>{friend.bio || 'Aucune description pour le moment.'}</p>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleRemoveFriend(friend.userId)}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? 'Suppression...' : 'Retirer'}
          </button>
        </div>
      </article>
    )
  }

  const renderRequestCard = (request) => {
    const key = `request-${request.id}`
    const state = actionState[key]
    return (
      <article key={request.id} className={styles.card}>
        <div className={styles.avatar}>
          {request.avatar ? (
            <img src={request.avatar} alt={request.name || 'Utilisateur'} />
          ) : (
            <span>{request.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3>{request.name || 'Utilisateur'}</h3>
          <p>{request.bio || 'Veut rejoindre votre reseau.'}</p>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => respondToFriendRequest(request.id, 'accept', request.userId)}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? 'Traitement...' : 'Accepter'}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => respondToFriendRequest(request.id, 'decline', request.userId)}
            disabled={state === 'loading'}
          >
            Refuser
          </button>
        </div>
      </article>
    )
  }

  const renderDiscoverCard = (profile) => {
    const key = `send-${profile.user_id}`
    const state = actionState[key]
    const alreadyFriend = friends.some((friend) => friend.userId === profile.user_id)
    const pending =
      friendRequests.some((request) => request.userId === profile.user_id) || state === 'pending'
    const isLoading = state === 'loading'
    const disabled = alreadyFriend || pending || isLoading

    let label = 'Ajouter'
    if (alreadyFriend) {
      label = 'Deja ami'
    } else if (pending) {
      label = 'En attente'
    } else if (isLoading) {
      label = 'Envoi...'
    }

    return (
      <article key={profile.user_id} className={styles.card}>
        <div className={styles.avatar}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name || 'Utilisateur'} />
          ) : (
            <span>{profile.display_name?.charAt(0)?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className={styles.cardContent}>
          <h3>{profile.display_name || 'Utilisateur'}</h3>
          <p>{profile.bio || 'Ce chef n a pas encore partage sa bio.'}</p>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => sendFriendRequest(profile.user_id)}
            disabled={disabled}
          >
            {label}
          </button>
        </div>
      </article>
    )
  }

  if (loading) {
    return (
      <Layout title="Mes amis - COCO">
        <div className={styles.page}>
          <div className={styles.center}>
            <div className={styles.spinner} />
            <span>Chargement de vos amis...</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes amis - COCO">
      <div className={styles.page}>
        <div className={styles.content}>
          {feedback && (
            <div
              className={`${styles.feedback} ${
                feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess
              }`}
            >
              {feedback.text}
            </div>
          )}

          <section className={styles.header}>
            <div className={styles.headerText}>
              <h1>Vos connexions</h1>
              <p>Invitez vos amis, repondez aux demandes et decouvrez de nouveaux gourmets.</p>
            </div>
            <div className={styles.summary}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{stats.friends}</span>
                <span className={styles.summaryLabel}>Amis</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{stats.pending}</span>
                <span className={styles.summaryLabel}>En attente</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryValue}>{stats.blocked}</span>
                <span className={styles.summaryLabel}>Bloques</span>
              </div>
            </div>
          </section>

          <form className={styles.search} onSubmit={handleSearch}>
            <div className={styles.searchField}>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un chef ou un ami"
              />
              {searchTerm && (
                <button type="button" className={styles.clearButton} onClick={handleClearSearch}>
                  Effacer
                </button>
              )}
            </div>
            <button type="submit" className={styles.searchButton} disabled={searchLoading}>
              {searchLoading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>

          <nav className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabButton} ${
                  activeTab === tab.id ? styles.tabButtonActive : ''
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section className={styles.panel} data-tab={activeTab}>
            {activeTab === 'friends' && (
              friends.length === 0 ? (
                <div className={styles.empty}>
                  <p>Vous n avez pas encore ajoute d amis.</p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setActiveTab('discover')}
                  >
                    Trouver des amis
                  </button>
                </div>
              ) : (
                <div className={styles.list}>{friends.map(renderFriendCard)}</div>
              )
            )}

            {activeTab === 'requests' && (
              friendRequests.length === 0 ? (
                <div className={styles.empty}>
                  <p>Aucune demande en attente.</p>
                </div>
              ) : (
                <div className={styles.list}>{friendRequests.map(renderRequestCard)}</div>
              )
            )}

            {activeTab === 'discover' && (
              <>
                {searchLoading ? (
                  <div className={styles.empty}>Recherche en cours...</div>
                ) : activeDiscoverList.length === 0 ? (
                  <div className={styles.empty}>
                    <p>Aucune suggestion pour le moment.</p>
                  </div>
                ) : (
                  <div className={styles.list}>{activeDiscoverList.map(renderDiscoverCard)}</div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}
