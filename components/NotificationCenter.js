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
    <div style={{ position: 'relative' }}>
      {/* Bouton cloche */}
      <button
        onClick={handleToggle}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid rgba(255, 107, 53, 0.2)',
          borderRadius: '16px',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
          fontSize: '1.5rem'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1) translateY(-2px)'
          e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.2)'
          e.target.style.borderColor = 'rgba(255, 107, 53, 0.4)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1) translateY(0)'
          e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)'
          e.target.style.borderColor = 'rgba(255, 107, 53, 0.2)'
        }}
        title="Centre de notifications"
      >
        🔔
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            border: '2px solid white',
            animation: unreadCount > 5 ? 'pulse 2s infinite' : 'none'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Panneau des notifications */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: '90px',
            left: '20px',
            width: '380px',
            maxHeight: '70vh',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 107, 53, 0.1)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* En-tête */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #f3f4f6',
            background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.2rem',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                🔔 Notifications
              </h3>
              <button
                onClick={handleToggle}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#374151'}
                onMouseLeave={(e) => e.target.style.color = '#6b7280'}
              >
                ✕
              </button>
            </div>

            {/* Filtres */}
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              {[
                { key: 'all', label: 'Toutes', count: notifications.length },
                { key: 'unread', label: 'Non lues', count: unreadCount },
                { key: 'today', label: "Aujourd'hui", count: notifications.filter(n => 
                  new Date(n.timestamp).toDateString() === new Date().toDateString()
                ).length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    background: filter === key ? '#ff6b35' : 'transparent',
                    color: filter === key ? 'white' : '#6b7280',
                    border: '1px solid ' + (filter === key ? '#ff6b35' : '#e5e7eb'),
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Liste des notifications */}
          <div style={{
            maxHeight: 'calc(70vh - 140px)',
            overflowY: 'auto',
            padding: '0'
          }}>
            {filteredNotifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#9ca3af'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔕</div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {filter === 'unread' ? 'Aucune notification non lue' : 
                   filter === 'today' ? "Aucune notification aujourd'hui" :
                   'Aucune notification'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f9fafb',
                    background: notification.read ? 'white' : '#fef3c7',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (notification.read) {
                      e.target.style.background = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = notification.read ? 'white' : '#fef3c7'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    <div style={{
                      fontSize: '1.2rem',
                      flexShrink: 0
                    }}>
                      {getTypeEmoji(notification.type)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: notification.read ? '500' : '600',
                        color: '#1f2937',
                        fontSize: '0.9rem',
                        marginBottom: '4px',
                        lineHeight: '1.3'
                      }}>
                        {notification.title}
                      </div>
                      
                      {notification.body && (
                        <div style={{
                          color: '#6b7280',
                          fontSize: '0.8rem',
                          lineHeight: '1.4',
                          marginBottom: '6px'
                        }}>
                          {notification.body}
                        </div>
                      )}
                      
                      <div style={{
                        color: '#9ca3af',
                        fontSize: '0.75rem'
                      }}>
                        {formatTimestamp(notification.timestamp)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteNotification(notification.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d1d5db',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#9ca3af'}
                      onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>

                  {!notification.read && (
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '6px',
                      height: '6px',
                      background: '#ff6b35',
                      borderRadius: '50%'
                    }} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #f3f4f6',
              background: '#fafafa'
            }}>
              <button
                onClick={handleClearAll}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6'
                  e.target.style.color = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#6b7280'
                }}
              >
                🗑️ Tout supprimer
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.1); 
          }
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.1); 
          }
        }

        /* Scrollbar personnalisée */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}

export default NotificationCenter
