import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { logError, logInfo } from '../utils/logger'
import { getFriendshipStats, removeFriend } from '../utils/profileUtils'
import styles from '../styles/FriendsPage.module.css'

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
}

const tabPaneVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } }
}

const TABS = [
  { id: 'friends', label: 'Mes amis', icon: '👥' },
  { id: 'requests', label: 'Demandes', icon: '📬' },
  { id: 'discover', label: 'Découvrir', icon: '🌍' }
]

const MIN_SEARCH_LENGTH = 2

export default function Amis() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [actionState, setActionState] = useState({})
  const [stats, setStats] = useState({ friends: 0, pending: 0, blocked: 0 })

  const showFeedback = useCallback((text, type = 'success') => {
    setFeedback({ text, type })
    setTimeout(() => setFeedback(null), 3200)
  }, [])

  const ensureProfileExists = useCallback(async (userId) => {
    try {
      const { data: existing, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (!existing) {
        await supabase.from('profiles').insert({
          user_id: userId,
          display_name: 'Utilisateur',
          bio: '',
          is_private: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    } catch (error) {
      logError('Error ensuring profile exists', error)
    }
  }, [])

  const loadFriendsFallback = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_user_friends_simple', {
        target_user_id: userId
      })
      if (error) throw error
      const formatted = data?.map((f) => ({
        friendshipId: f.friendship_id,
        userId: f.friend_user_id,
        name: f.friend_display_name,
        bio: f.friend_bio,
        avatar: f.friend_avatar_url
      })) || []
      setFriends(formatted)
      return formatted
    } catch (error) {
      logError('Failed to load friends via RPC', error)
      // Direct query fallback
      try {
        const { data: fs } = await supabase
          .from('friendships')
          .select('id, user_id, friend_id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted')
        const ids = (fs || []).map(f => f.user_id === userId ? f.friend_id : f.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, bio, avatar_url')
          .in('user_id', ids)
        const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))
        const formatted = (fs || []).map(f => {
          const fid = f.user_id === userId ? f.friend_id : f.user_id
          const p = byId[fid] || {}
          return { friendshipId: f.id, userId: fid, name: p.display_name || 'Utilisateur', bio: p.bio || '', avatar: p.avatar_url || null }
        })
        setFriends(formatted)
        return formatted
      } catch {
        setFriends([])
        return []
      }
    }
  }, [])

  const loadFriendRequestsFallback = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase.rpc('get_pending_friend_requests', {
        target_user_id: userId
      })
      if (error) throw error
      const formatted = data?.map((r) => ({
        id: r.friendship_id,
        userId: r.requester_user_id,
        name: r.requester_display_name,
        bio: r.requester_bio,
        avatar: r.requester_avatar_url
      })) || []
      setFriendRequests(formatted)
      return formatted
    } catch (error) {
      logError('Failed to load friend requests via RPC', error)
      try {
        const { data: fs } = await supabase
          .from('friendships')
          .select('id, user_id')
          .eq('friend_id', userId)
          .eq('status', 'pending')
        const ids = (fs || []).map(f => f.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, bio, avatar_url')
          .in('user_id', ids)
        const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))
        const formatted = (fs || []).map(f => {
          const p = byId[f.user_id] || {}
          return { id: f.id, userId: f.user_id, name: p.display_name || 'Utilisateur', bio: p.bio || '', avatar: p.avatar_url || null }
        })
        setFriendRequests(formatted)
        return formatted
      } catch {
        setFriendRequests([])
        return []
      }
    }
  }, [])

  const loadSentRequests = useCallback(async (userId) => {
    try {
      const { data: rows, error } = await supabase
        .from('friendships')
        .select('id, friend_id, created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!rows || rows.length === 0) { setSentRequests([]); return [] }
      const ids = rows.map(r => r.friend_id).filter(Boolean)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .in('user_id', ids)
      const byId = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))
      const formatted = rows.map(r => {
        const p = byId[r.friend_id] || {}
        return {
          id: r.id,
          userId: r.friend_id,
          name: p.display_name || 'Utilisateur',
          bio: p.bio || '',
          avatar: p.avatar_url || null,
          createdAt: r.created_at
        }
      })
      setSentRequests(formatted)
      return formatted
    } catch (error) {
      logError('Failed to load sent requests', error)
      setSentRequests([])
      return []
    }
  }, [])

  const loadFriendsOverview = useCallback(async (userId) => {
    if (!userId) return { friendsList: [], requestsList: [] }

    // Query friendships table directly — same client as getFriendshipStats (which works)
    const { data: rows, error: rowsErr } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .in('status', ['accepted', 'pending'])
      .order('created_at', { ascending: false })

    if (rowsErr) {
      logError('Failed to query friendships', rowsErr)
      // Try RPC fallback
      const [friendsList, requestsList] = await Promise.all([
        loadFriendsFallback(userId),
        loadFriendRequestsFallback(userId)
      ])
      return { friendsList, requestsList }
    }

    const accepted = (rows || []).filter(r => r.status === 'accepted')
    const pendingIncoming = (rows || []).filter(r => r.status === 'pending' && r.friend_id === userId)

    // Collect all user IDs we need profiles for
    const profileIds = new Set()
    accepted.forEach(r => {
      const otherId = r.user_id === userId ? r.friend_id : r.user_id
      if (otherId) profileIds.add(otherId)
    })
    pendingIncoming.forEach(r => {
      if (r.user_id) profileIds.add(r.user_id)
    })

    // Batch-load profiles
    let profileMap = {}
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .in('user_id', Array.from(profileIds))
      profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]))
    }

    const friendsList = accepted.map(r => {
      const otherId = r.user_id === userId ? r.friend_id : r.user_id
      const p = profileMap[otherId] || {}
      return {
        friendshipId: r.id,
        userId: otherId,
        name: p.display_name || 'Utilisateur',
        bio: p.bio || '',
        avatar: p.avatar_url || null
      }
    }).filter(f => f.userId)

    const requestsList = pendingIncoming.map(r => {
      const p = profileMap[r.user_id] || {}
      return {
        id: r.id,
        userId: r.user_id,
        name: p.display_name || 'Utilisateur',
        bio: p.bio || '',
        avatar: p.avatar_url || null
      }
    }).filter(r => r.userId)

    setFriends(friendsList)
    setFriendRequests(requestsList)
    return { friendsList, requestsList }
  }, [loadFriendsFallback, loadFriendRequestsFallback])

  const loadStats = useCallback(async (userId) => {
    try {
      const result = await getFriendshipStats(userId)
      setStats({ friends: result?.friends || 0, pending: result?.pending || 0, blocked: result?.blocked || 0 })
    } catch {
      setStats({ friends: 0, pending: 0, blocked: 0 })
    }
  }, [])

  const loadSuggestions = useCallback(async (userId, excludedIds = new Set()) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url, is_private')
        .eq('is_private', false)
        .order('updated_at', { ascending: false })
        .limit(20)
      if (error) throw error
      const filtered = (data || [])
        .filter(p => !excludedIds.has(p.user_id) && p.user_id !== userId)
        .slice(0, 8)
      setSuggestions(filtered)
      return filtered
    } catch (error) {
      logError('Failed to load suggestions', error)
      setSuggestions([])
      return []
    }
  }, [])

  const computeExcludedIds = useCallback((uid, friendsList, requestsList) => {
    const s = new Set()
    if (uid) s.add(uid)
    friendsList?.forEach(f => s.add(f.userId))
    requestsList?.forEach(r => s.add(r.userId))
    return s
  }, [])

  const checkUser = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) {
        router.push('/login?redirect=' + encodeURIComponent('/amis'))
        return
      }
      setUser(u)
      const { friendsList, requestsList } = await loadFriendsOverview(u.id)
      await Promise.all([loadStats(u.id), loadSentRequests(u.id)])
      const excl = computeExcludedIds(u.id, friendsList, requestsList)
      await loadSuggestions(u.id, excl)
    } catch (error) {
      logError('Failed to initialise friends page', error)
      showFeedback('Impossible de charger vos amis.', 'error')
    } finally {
      setLoading(false)
    }
  }, [computeExcludedIds, loadFriendsOverview, loadSentRequests, loadStats, loadSuggestions, router, showFeedback])

  useEffect(() => { checkUser() }, [checkUser])

  const refreshLists = useCallback(async () => {
    if (!user) return
    const { friendsList, requestsList } = await loadFriendsOverview(user.id)
    await Promise.all([loadStats(user.id), loadSentRequests(user.id)])
    const excl = computeExcludedIds(user.id, friendsList, requestsList)
    await loadSuggestions(user.id, excl)
  }, [computeExcludedIds, loadFriendsOverview, loadSentRequests, loadStats, loadSuggestions, user])

  const handleSearch = async (event) => {
    event.preventDefault()
    if (!user) return
    const term = searchTerm.trim()
    if (term.length < MIN_SEARCH_LENGTH) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      // Try Supabase RPC first
      const { data, error } = await supabase.rpc('search_users_simple', {
        search_term: term,
        current_user_id: user.id
      })
      if (error) throw error
      setSearchResults((data || []).filter(u => u.user_id !== user.id))
      setActiveTab('discover')
    } catch {
      // Fallback to API search
      try {
        const res = await fetch(`/api/friends?query=${encodeURIComponent(term)}`)
        const data = await res.json()
        const results = Array.isArray(data)
          ? data.filter(u => u.user_id !== user.id)
          : []
        setSearchResults(results)
        setActiveTab('discover')
      } catch (err) {
        logError('Search failed completely', err)
        showFeedback('Erreur lors de la recherche.', 'error')
      }
    } finally {
      setSearchLoading(false)
    }
  }

  const handleClearSearch = () => { setSearchTerm(''); setSearchResults([]) }

  const sendFriendRequest = async (targetUserId) => {
    if (!user || targetUserId === user.id) return
    const key = `send-${targetUserId}`
    setActionState(prev => ({ ...prev, [key]: 'loading' }))
    let nextState
    try {
      await ensureProfileExists(user.id)
      await ensureProfileExists(targetUserId)

      const { data: rows, error: rowErr } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
        .limit(1)
      if (rowErr) throw rowErr

      const existing = rows?.[0] || null

      if (existing?.status === 'accepted') {
        showFeedback('Vous êtes déjà amis.', 'success')
        nextState = 'pending'
        await refreshLists()
      } else if (existing?.status === 'blocked') {
        showFeedback('Impossible d\'envoyer la demande.', 'error')
      } else if (existing?.status === 'pending') {
        if (existing.friend_id === user.id) {
          const { error: ae } = await supabase
            .from('friendships')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          if (ae) throw ae
          showFeedback('Demande acceptée automatiquement !', 'success')
        } else {
          showFeedback('Demande déjà envoyée.', 'error')
        }
        nextState = 'pending'
        await refreshLists()
      } else if (existing?.status === 'rejected') {
        const { error: re } = await supabase
          .from('friendships')
          .update({ user_id: user.id, friend_id: targetUserId, status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (re) throw re
        showFeedback('Demande renvoyée.', 'success')
        nextState = 'pending'
        await refreshLists()
      } else {
        const { error: ie } = await supabase.from('friendships').insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        if (ie) {
          if (ie.code === '23505') {
            showFeedback('Demande déjà en cours.', 'error')
            nextState = 'pending'
            await refreshLists()
            return
          }
          throw ie
        }
        showFeedback('Demande envoyée !', 'success')
        nextState = 'pending'
        await refreshLists()
      }
    } catch (error) {
      logError('Failed to send friend request', error)
      showFeedback('Impossible d\'envoyer la demande.', 'error')
    } finally {
      setActionState(prev => ({ ...prev, [key]: nextState }))
    }
  }

  const respondToFriendRequest = async (friendshipId, action, requesterId) => {
    if (!user) return
    const key = `request-${friendshipId}`
    setActionState(prev => ({ ...prev, [key]: 'loading' }))
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', friendshipId)
        if (error) throw error
        showFeedback('Ami ajouté !', 'success')
      } else {
        const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
        if (error) throw error
        showFeedback('Demande refusée.', 'success')
      }
      await refreshLists()
      setActionState(prev => ({ ...prev, [key]: undefined, [`send-${requesterId}`]: undefined }))
    } catch (error) {
      logError('Failed to respond to friend request', error)
      showFeedback('Action impossible pour le moment.', 'error')
      setActionState(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const handleRemoveFriend = async (friendUserId) => {
    if (!user) return
    const key = `remove-${friendUserId}`
    setActionState(prev => ({ ...prev, [key]: 'loading' }))
    try {
      const result = await removeFriend(user.id, friendUserId)
      if (!result?.success) throw new Error(result?.error || 'remove failed')
      showFeedback('Ami retiré.', 'success')
      await refreshLists()
    } catch (error) {
      logError('Failed to remove friend', error)
      showFeedback('Impossible de retirer cet ami.', 'error')
    } finally {
      setActionState(prev => ({ ...prev, [key]: undefined }))
    }
  }

  const cancelSentRequest = async (friendshipId, targetUserId) => {
    if (!user) return
    const key = `cancel-${friendshipId}`
    setActionState(prev => ({ ...prev, [key]: 'loading' }))
    try {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) throw error
      showFeedback('Demande annulée.', 'success')
      await refreshLists()
    } catch (error) {
      logError('Failed to cancel sent request', error)
      showFeedback('Impossible d\'annuler la demande.', 'error')
    } finally {
      setActionState(prev => ({ ...prev, [key]: undefined, [`send-${targetUserId}`]: undefined }))
    }
  }

  const activeDiscoverList = useMemo(() => {
    if (searchTerm.trim().length >= MIN_SEARCH_LENGTH && searchResults.length > 0) return searchResults
    return suggestions
  }, [searchResults, searchTerm, suggestions])

  const getInitial = (name) => (name || 'U').charAt(0).toUpperCase()

  const renderAvatar = (avatar, name) => (
    <div className={styles.avatar}>
      {avatar
        ? <img src={avatar} alt={name || 'Utilisateur'} onError={e => { e.currentTarget.style.display = 'none' }} />
        : <span>{getInitial(name)}</span>
      }
    </div>
  )

  const renderFriendCard = (friend) => {
    const key = `remove-${friend.userId}`
    const state = actionState[key]
    return (
      <motion.article
        key={friend.friendshipId || friend.userId}
        variants={cardVariants}
        className={styles.card}
        layout
      >
        {renderAvatar(friend.avatar, friend.name)}
        <div className={styles.cardContent}>
          <strong>{friend.name || 'Utilisateur'}</strong>
          <span>{friend.bio || 'Aucune description.'}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => handleRemoveFriend(friend.userId)}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? '…' : 'Retirer'}
          </button>
        </div>
      </motion.article>
    )
  }

  const renderRequestCard = (request) => {
    const key = `request-${request.id}`
    const state = actionState[key]
    return (
      <motion.article
        key={request.id}
        variants={cardVariants}
        className={styles.card}
        layout
      >
        {renderAvatar(request.avatar, request.name)}
        <div className={styles.cardContent}>
          <strong>{request.name || 'Utilisateur'}</strong>
          <span>{request.bio || 'Veut rejoindre votre réseau.'}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => respondToFriendRequest(request.id, 'accept', request.userId)}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? '…' : 'Accepter'}
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
      </motion.article>
    )
  }

  const renderSentCard = (req) => {
    const key = `cancel-${req.id}`
    const state = actionState[key]
    return (
      <motion.article
        key={`sent-${req.id}`}
        variants={cardVariants}
        className={`${styles.card} ${styles.cardSent}`}
        layout
      >
        {renderAvatar(req.avatar, req.name)}
        <div className={styles.cardContent}>
          <strong>{req.name || 'Utilisateur'}</strong>
          <span>Demande envoyée</span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => cancelSentRequest(req.id, req.userId)}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? '…' : 'Annuler'}
          </button>
        </div>
      </motion.article>
    )
  }

  const renderDiscoverCard = (profile) => {
    const key = `send-${profile.user_id}`
    const state = actionState[key]
    const alreadyFriend = friends.some(f => f.userId === profile.user_id)
    const pending = friendRequests.some(r => r.userId === profile.user_id) || state === 'pending'
    const isLoading = state === 'loading'
    const disabled = alreadyFriend || pending || isLoading

    let label = '+ Ajouter'
    if (alreadyFriend) label = 'Déjà ami'
    else if (pending) label = 'En attente…'
    else if (isLoading) label = 'Envoi…'

    return (
      <motion.article
        key={profile.user_id}
        variants={cardVariants}
        className={styles.card}
        layout
      >
        {renderAvatar(profile.avatar_url, profile.display_name)}
        <div className={styles.cardContent}>
          <strong>{profile.display_name || 'Utilisateur'}</strong>
          <span>{profile.bio || 'Chef passionné.'}</span>
        </div>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={disabled ? styles.secondaryButton : styles.primaryButton}
            onClick={() => sendFriendRequest(profile.user_id)}
            disabled={disabled}
          >
            {label}
          </button>
        </div>
      </motion.article>
    )
  }

  if (loading) {
    return (
      <Layout title="Mes amis — COCO">
        <div className={styles.page}>
          <div className={styles.center}>
            <div className={styles.spinner} />
            <span>Chargement…</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes amis — COCO">
      <div className={styles.page}>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              className={`${styles.toast} ${feedback.type === 'error' ? styles.toastError : styles.toastSuccess}`}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.22 }}
            >
              <span className={styles.toastIcon}>{feedback.type === 'error' ? '⚠' : '✓'}</span>
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero banner */}
        <motion.section
          className={styles.hero}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>Connexions</h1>
              <p className={styles.heroSub}>Votre cercle de gourmets — invitez, découvrez, partagez.</p>
            </div>
            <div className={styles.statsRow}>
              {[
                { value: stats.friends, label: 'Amis', color: '#ff6b35' },
                { value: friendRequests.length, label: 'Reçues', color: '#f59e0b' },
                { value: sentRequests.length, label: 'Envoyées', color: '#94a3b8' }
              ].map(s => (
                <motion.div
                  key={s.label}
                  className={styles.statPill}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                >
                  <span className={styles.statValue} style={{ color: s.color }}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Main body */}
        <div className={styles.body}>

          {/* Search */}
          <form className={styles.searchWrap} onSubmit={handleSearch}>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Chercher un chef par nom…"
              />
              {searchTerm && (
                <button type="button" className={styles.clearBtn} onClick={handleClearSearch} aria-label="Effacer">
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className={styles.searchBtn} disabled={searchLoading}>
              {searchLoading ? '…' : 'Chercher'}
            </button>
          </form>

          {/* Tabs */}
          <nav className={styles.tabs}>
            {TABS.map(tab => {
              const count = tab.id === 'friends' ? friends.length
                : tab.id === 'requests' ? (friendRequests.length + sentRequests.length)
                : null
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className={styles.tabIcon}>{tab.icon}</span>
                  {tab.label}
                  {count != null && count > 0 && (
                    <span className={styles.tabBadge}>{count}</span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.section
              key={activeTab}
              className={styles.panel}
              variants={tabPaneVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {activeTab === 'friends' && (
                friends.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    message="Vous n'avez pas encore d'amis ici."
                    action="Explorer"
                    onAction={() => setActiveTab('discover')}
                    styles={styles}
                  />
                ) : (
                  <motion.div className={styles.list} variants={listVariants} initial="hidden" animate="visible">
                    {friends.map(renderFriendCard)}
                  </motion.div>
                )
              )}

              {activeTab === 'requests' && (
                (friendRequests.length === 0 && sentRequests.length === 0) ? (
                  <EmptyState icon="📬" message="Aucune demande en attente." styles={styles} />
                ) : (
                  <>
                    {friendRequests.length > 0 && (
                      <>
                        <p className={styles.sectionLabel}>Reçues</p>
                        <motion.div className={styles.list} variants={listVariants} initial="hidden" animate="visible">
                          {friendRequests.map(renderRequestCard)}
                        </motion.div>
                      </>
                    )}
                    {sentRequests.length > 0 && (
                      <>
                        <p className={styles.sectionLabel} style={friendRequests.length > 0 ? { marginTop: 24 } : undefined}>Envoyées</p>
                        <motion.div className={styles.list} variants={listVariants} initial="hidden" animate="visible">
                          {sentRequests.map(renderSentCard)}
                        </motion.div>
                      </>
                    )}
                  </>
                )
              )}

              {activeTab === 'discover' && (
                searchLoading ? (
                  <div className={styles.center} style={{ marginTop: 48 }}>
                    <div className={styles.spinner} />
                    <span>Recherche…</span>
                  </div>
                ) : activeDiscoverList.length === 0 ? (
                  <EmptyState icon="🌍" message="Aucun profil trouvé. Essayez une autre recherche." styles={styles} />
                ) : (
                  <motion.div className={styles.list} variants={listVariants} initial="hidden" animate="visible">
                    {activeDiscoverList.map(renderDiscoverCard)}
                  </motion.div>
                )
              )}
            </motion.section>
          </AnimatePresence>

        </div>
      </div>
    </Layout>
  )
}

function EmptyState({ icon, message, action, onAction, styles }) {
  return (
    <motion.div
      className={styles.empty}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className={styles.emptyIcon}>{icon}</p>
      <p className={styles.emptyText}>{message}</p>
      {action && onAction && (
        <button type="button" className={styles.primaryButton} onClick={onAction}>
          {action}
        </button>
      )}
    </motion.div>
  )
}
