import { useState, useEffect, useRef } from 'react'
import { notificationManager } from '../utils/notificationUtils'
import { logUserInteraction } from '../utils/logger'
import styles from '../styles/NotificationCenter.module.css'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all') // all, likes, comments, system
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const panelRef = useRef(null)
  const bellRef = useRef(null)

  useEffect(() => {
    // S'assurer que le gestionnaire est initialisé
    if (typeof window !== 'undefined') {
      notificationManager.init()
      setIsInitialized(true)
    }

    // Charger les notifications existantes
    loadNotifications()

    // Écouter les nouvelles notifications
    const handleNewNotification = (newNotification) => {
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      // Animation de la cloche pour nouvelle notification
      if (bellRef.current) {
        bellRef.current.classList.add(styles.newNotification)
        setTimeout(() => {
          bellRef.current?.classList.remove(styles.newNotification)
        }, 2000)
      }
    }

    notificationManager.onNotificationAdded(handleNewNotification)

    // Mettre à jour le compteur non lu
    updateUnreadCount()

    // Fermer le panneau en cliquant à l'extérieur
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && 
          bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Debug: ajouter des notifications de test en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isInitialized && notifications.length === 0) {
      // Ajouter quelques notifications de test après un délai
      setTimeout(() => {
        const testNotification = {
          type: 'recipe_liked',
          title: '❤️ Test - Votre recette a été aimée !',
          body: 'Un utilisateur test aime votre recette "Test Tarte aux pommes"',
          data: { 
            recipeId: 'test-recipe',
            type: 'like',
            likerName: 'Utilisateur Test'
          }
        }
        notificationManager.addNotification(testNotification)
      }, 2000)
    }
  }, [isInitialized])

  const loadNotifications = () => {
    setLoading(true)
    const stored = notificationManager.getStoredNotifications()
    setNotifications(stored)
    setLoading(false)
  }

  const updateUnreadCount = () => {
    const count = notificationManager.getUnreadCount()
    setUnreadCount(count)
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
    logUserInteraction('TOGGLE_NOTIFICATION_CENTER', 'notification-bell', {
      wasOpen: isOpen,
      unreadCount
    })

    if (!isOpen) {
      // Marquer toutes comme lues quand on ouvre (après un délai)
      setTimeout(() => {
        notificationManager.markAllAsRead()
        setUnreadCount(0)
        loadNotifications()
      }, 1500)
    }
  }

  const handleDeleteNotification = (notificationId) => {
    notificationManager.deleteNotification(notificationId)
    loadNotifications()
    updateUnreadCount()
  }

  const handleClearAll = () => {
    if (window.confirm('Supprimer toutes les notifications ?')) {
      notificationManager.clearAll()
      setNotifications([])
      setUnreadCount(0)
    }
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'likes':
        return notifications.filter(n => n.type === 'recipe_liked')
      case 'comments':
        return notifications.filter(n => n.data?.type === 'comment')
      case 'system':
        return notifications.filter(n => ['system', 'trophy', 'friend_request', 'friend_accepted'].includes(n.type))
      default:
        return notifications
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffMinutes < 1) return "À l'instant"
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`
    if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)}h`
    return date.toLocaleDateString('fr-FR')
  }

  const getTypeEmoji = (type) => {
    const emojis = {
      trophy: '🏆',
      friend_request: '👥',
      friend_accepted: '🤝',
      recipe_shared: '🍽️',
      recipe_liked: '❤️',
      cooking_reminder: '⏰',
      system: '🔔',
      error: '⚠️',
      success: '✅'
    }
    return emojis[type] || '🔔'
  }

  const getNotificationAction = (notification) => {
    const { data } = notification
    if (data?.recipeId && data?.type === 'like') {
      return () => window.location.href = `/recipe/${data.recipeId}`
    }
    if (data?.recipeId && data?.type === 'like_with_stats') {
      return () => window.location.href = `/recipe/${data.recipeId}#likes-details`
    }
    if (data?.recipeId && data?.type === 'comment') {
      return () => window.location.href = `/recipe/${data.recipeId}#comments`
    }
    return null
  }

  const formatNotificationBody = (notification) => {
    const { data, body } = notification
    
    // Notification de like enrichie
    if (data?.type === 'like_with_stats' && data?.recentLikers) {
      return (
        <div className={styles.enrichedNotificationBody}>
          <div className={styles.mainText}>{body}</div>
          {data.recentLikers.length > 0 && (
            <div className={styles.likersPreview}>
              <div className={styles.likersAvatars}>
                {data.recentLikers.map((liker, index) => (
                  <span key={index} className={styles.likerAvatar} title={liker.user_name}>
                    {liker.user_name?.charAt(0).toUpperCase() || '👤'}
                  </span>
                ))}
              </div>
              <div className={styles.likersText}>
                {data.totalLikes} like{data.totalLikes > 1 ? 's' : ''} au total
              </div>
            </div>
          )}
        </div>
      )
    }
    
    return body
  }

  const filteredNotifications = getFilteredNotifications()

  // Si le composant n'est pas encore initialisé, afficher un placeholder
  if (!isInitialized) {
    return (
      <div className={styles.notificationCenter}>
        <button className={styles.bellButton} disabled>
          <span className={styles.bellIcon}>🔔</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.notificationCenter}>
      {/* Bouton cloche */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className={`${styles.bellButton} ${isOpen ? styles.active : ''}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        title={`${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`}
      >
        <span className={styles.bellIcon}>🔔</span>
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      {isOpen && (
        <div ref={panelRef} className={styles.notificationPanel}>
          {/* Header */}
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <span className={styles.titleIcon}>🔔</span>
              Notifications
            </h3>
            <div className={styles.headerActions}>
              <button
                onClick={handleClearAll}
                className={styles.clearAllBtn}
                title="Supprimer toutes"
                disabled={notifications.length === 0}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className={styles.filterTabs}>
            <button
              onClick={() => setFilter('all')}
              className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('likes')}
              className={`${styles.filterTab} ${filter === 'likes' ? styles.active : ''}`}
            >
              ❤️ Likes ({notifications.filter(n => n.type === 'recipe_liked').length})
            </button>
            <button
              onClick={() => setFilter('comments')}
              className={`${styles.filterTab} ${filter === 'comments' ? styles.active : ''}`}
            >
              💬 Commentaires ({notifications.filter(n => n.data?.type === 'comment').length})
            </button>
          </div>

          {/* Liste des notifications */}
          <div className={styles.notificationsList}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <span>Chargement...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  {filter === 'likes' ? '❤️' : filter === 'comments' ? '💬' : '🔔'}
                </div>
                <p className={styles.emptyMessage}>
                  {filter === 'likes' ? 'Aucun like reçu' : 
                   filter === 'comments' ? 'Aucun commentaire reçu' : 
                   'Aucune notification'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const handleClick = getNotificationAction(notification)
                return (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''} ${handleClick ? styles.clickable : ''}`}
                    onClick={handleClick}
                  >
                    <div className={styles.notificationIcon}>
                      {getTypeEmoji(notification.type)}
                    </div>
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationTitle}>
                        {notification.title}
                      </div>
                      <div className={styles.notificationBody}>
                        {formatNotificationBody(notification)}
                      </div>
                      <div className={styles.notificationTime}>
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification.id)
                      }}
                      className={styles.deleteBtn}
                      title="Supprimer"
                      aria-label="Supprimer cette notification"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className={styles.panelFooter}>
              <div className={styles.notificationCount}>
                {filteredNotifications.length} notification{filteredNotifications.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationCenter
