import { useState, useEffect, useRef } from 'react'
import { notificationManager } from '../utils/notificationUtils'
import { logUserInteraction } from '../utils/logger'

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all') // all, unread, today
  const panelRef = useRef(null)

  useEffect(() => {
    // Charger les notifications existantes
    loadNotifications()

    // Écouter les nouvelles notifications
    notificationManager.onNotificationAdded((newNotification) => {
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
    })

    // Mettre à jour le compteur non lu
    updateUnreadCount()

    // Fermer le panneau en cliquant à l'extérieur
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = () => {
    const stored = notificationManager.getStoredNotifications()
    setNotifications(stored)
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
      // Marquer toutes comme lues quand on ouvre
      setTimeout(() => {
        notificationManager.markAllAsRead()
        setUnreadCount(0)
        loadNotifications()
      }, 1000)
    }
  }

  const handleDeleteNotification = (notificationId) => {
    notificationManager.deleteNotification(notificationId)
    loadNotifications()
    updateUnreadCount()
  }

  const handleClearAll = () => {
    notificationManager.clearAll()
    setNotifications([])
    setUnreadCount(0)
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'today':
        const today = new Date().toDateString()
        return notifications.filter(n => 
          new Date(n.timestamp).toDateString() === today
        )
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

  const filteredNotifications = getFilteredNotifications()

  return (
    <div style={{ display: 'none' }}>
      {/* Notification center disabled - bouton cloche supprimé */}
    </div>
  )
}

export default NotificationCenter
