import { logInfo, logError, logDebug } from './logger'

// Types de notifications
export const NOTIFICATION_TYPES = {
  TROPHY: 'trophy',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  RECIPE_SHARED: 'recipe_shared',
  RECIPE_LIKED: 'recipe_liked',
  SYSTEM: 'system',
  COOKING_REMINDER: 'cooking_reminder'
}

// Configuration des notifications par type
const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.TROPHY]: {
    icon: '🏆',
    requirePermission: true,
    persistent: true,
    sound: true
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    icon: '👥',
    requirePermission: true,
    persistent: true,
    sound: true
  },
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: {
    icon: '🤝',
    requirePermission: false,
    persistent: false,
    sound: false
  },
  [NOTIFICATION_TYPES.RECIPE_SHARED]: {
    icon: '🍽️',
    requirePermission: false,
    persistent: false,
    sound: false
  },
  [NOTIFICATION_TYPES.RECIPE_LIKED]: {
    icon: '❤️',
    requirePermission: false,
    persistent: false,
    sound: false
  },
  [NOTIFICATION_TYPES.SYSTEM]: {
    icon: '🔔',
    requirePermission: true,
    persistent: true,
    sound: true
  },
  [NOTIFICATION_TYPES.COOKING_REMINDER]: {
    icon: '⏰',
    requirePermission: true,
    persistent: true,
    sound: true
  }
}

class NotificationManager {
  constructor() {
    this.permission = 'default'
    this.activeNotifications = new Map()
    this.fallbackContainer = null
    this.isInitialized = false
    
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  async init() {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Vérifier le support des notifications
    if (!('Notification' in window)) {
      logInfo('Notifications not supported in this browser')
      this.isInitialized = true
      return
    }

    // Mettre à jour la permission actuelle
    this.permission = Notification.permission
    this.createFallbackContainer()
    this.isInitialized = true
    
    logInfo('NotificationManager initialized', {
      permission: this.permission,
      supported: true,
      userAgent: navigator.userAgent.substring(0, 100)
    })
  }

  createFallbackContainer() {
    // Only create in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    this.fallbackContainer = document.createElement('div')
    this.fallbackContainer.id = 'coco-notifications'
    this.fallbackContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 350px;
      pointer-events: none;
    `
    document.body.appendChild(this.fallbackContainer)
  }

  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      logInfo('Cannot request permission: not in browser or unsupported')
      return 'denied'
    }

    if (this.permission === 'granted') {
      logInfo('Permission already granted')
      return 'granted'
    }

    try {
      logInfo('Requesting notification permission...')
      
      // Forcer la demande même si la permission est 'default'
      const result = await Notification.requestPermission()
      this.permission = result
      
      logInfo('Notification permission requested', {
        result: this.permission,
        timestamp: new Date().toISOString(),
        wasDefault: Notification.permission === 'default'
      })

      return this.permission
    } catch (error) {
      logError('Error requesting notification permission', error)
      this.permission = 'denied'
      return 'denied'
    }
  }

  async show(type, title, options = {}) {
    // Check browser environment first
    if (typeof window === 'undefined') {
      logInfo('Notification attempted in non-browser environment', { type, title })
      return { success: false, id: null, type: 'skipped' }
    }

    if (!this.isInitialized) {
      await this.init()
    }

    const config = NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG[NOTIFICATION_TYPES.SYSTEM]
    
    const notificationData = {
      id: Date.now().toString(),
      type,
      title: `${config.icon} ${title}`,
      body: options.body || '',
      image: options.image,
      data: options.data || {},
      timestamp: new Date().toISOString(),
      ...options
    }

    logInfo('Attempting to show notification', {
      type,
      title,
      requiresPermission: config.requirePermission,
      currentPermission: this.permission,
      forceFallback: options.forceFallback,
      notificationSupported: 'Notification' in window
    })

    // Vérifier si les permissions sont requises
    if (config.requirePermission) {
      if (this.permission !== 'granted') {
        logInfo('Permission required but not granted, requesting...')
        const permission = await this.requestPermission()
        if (permission !== 'granted') {
          logInfo('Permission denied, using fallback', { permission })
          return this.showFallback(notificationData)
        }
      }
    }

    // Essayer d'afficher une notification native si les conditions sont réunies
    if (this.permission === 'granted' && !options.forceFallback && 'Notification' in window) {
      try {
        logInfo('Attempting native notification', {
          permission: this.permission,
          title: notificationData.title
        })
        return await this.showNative(notificationData, config)
      } catch (error) {
        logError('Failed to show native notification, falling back', error)
        return this.showFallback(notificationData)
      }
    } else {
      logInfo('Using fallback notification', {
        permission: this.permission,
        forceFallback: options.forceFallback,
        notificationSupported: 'Notification' in window
      })
    }

    // Utiliser le fallback
    return this.showFallback(notificationData)
  }

  async showNative(notificationData, config) {
    try {
      logInfo('Creating native notification', {
        title: notificationData.title,
        body: notificationData.body,
        permission: this.permission
      })

      // Vérifier une dernière fois la permission
      if (Notification.permission !== 'granted') {
        throw new Error(`Permission not granted: ${Notification.permission}`)
      }

      const notificationOptions = {
        body: notificationData.body,
        icon: notificationData.image || '/icons/coco-icon-96.png',
        badge: '/icons/coco-badge.png',
        tag: `coco-${notificationData.type}-${Date.now()}`, // Tag unique pour éviter le remplacement
        requireInteraction: config.persistent,
        silent: !config.sound,
        data: notificationData.data,
        // Ajouter d'autres options pour améliorer la compatibilité
        dir: 'auto',
        lang: 'fr',
        vibrate: config.sound ? [200, 100, 200] : undefined
      }

      logInfo('Native notification options', notificationOptions)

      const notification = new Notification(notificationData.title, notificationOptions)

      // Log des événements de la notification
      notification.onshow = () => {
        logInfo('Native notification shown successfully', {
          id: notificationData.id,
          type: notificationData.type
        })
      }

      notification.onerror = (error) => {
        logError('Native notification error', error, {
          id: notificationData.id,
          type: notificationData.type
        })
      }

      notification.onclose = () => {
        logInfo('Native notification closed', {
          id: notificationData.id,
          type: notificationData.type
        })
        this.activeNotifications.delete(notificationData.id)
      }

      // Gérer les clics
      notification.onclick = (event) => {
        logInfo('Native notification clicked', {
          id: notificationData.id,
          type: notificationData.type
        })
        window.focus()
        this.handleNotificationClick(notificationData)
        notification.close()
      }

      // Auto-fermeture pour les notifications non persistantes
      if (!config.persistent) {
        setTimeout(() => {
          if (notification) {
            logInfo('Auto-closing native notification', {
              id: notificationData.id
            })
            notification.close()
          }
        }, 5000)
      }

      this.activeNotifications.set(notificationData.id, notification)
      
      logInfo('Native notification created and stored', {
        id: notificationData.id,
        type: notificationData.type,
        title: notificationData.title,
        activeCount: this.activeNotifications.size
      })

      return {
        success: true,
        id: notificationData.id,
        type: 'native'
      }
    } catch (error) {
      logError('Error creating native notification', error, {
        title: notificationData.title,
        permission: Notification.permission,
        supported: 'Notification' in window
      })
      throw error
    }
  }

  showFallback(notificationData) {
    // Ensure browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      logInfo('Fallback notification skipped in non-browser environment')
      return { success: false, id: notificationData.id, type: 'skipped' }
    }

    if (!this.fallbackContainer) {
      this.createFallbackContainer()
    }

    const element = document.createElement('div')
    element.className = 'coco-notification-fallback'
    element.style.cssText = `
      background: linear-gradient(135deg, #FF6B35, #F7931E);
      color: white;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      pointer-events: all;
      cursor: pointer;
      animation: slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
      overflow: hidden;
    `

    element.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 1.5rem; flex-shrink: 0;">
          ${NOTIFICATION_CONFIG[notificationData.type]?.icon || '🔔'}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 1rem; margin-bottom: 4px;">
            ${notificationData.title}
          </div>
          ${notificationData.body ? `
            <div style="font-size: 0.9rem; opacity: 0.9; line-height: 1.4;">
              ${notificationData.body}
            </div>
          ` : ''}
        </div>
        <button style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        ">✕</button>
      </div>
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255,255,255,0.3);
        animation: progress 5s linear forwards;
      "></div>
    `

    // Gérer les interactions
    element.onclick = (e) => {
      if (e.target.tagName === 'BUTTON') {
        this.closeFallback(element)
      } else {
        this.handleNotificationClick(notificationData)
        this.closeFallback(element)
      }
    }

    this.fallbackContainer.appendChild(element)
    this.activeNotifications.set(notificationData.id, element)

    // Auto-fermeture
    setTimeout(() => {
      this.closeFallback(element)
    }, 5000)

    logInfo('Fallback notification shown', {
      id: notificationData.id,
      type: notificationData.type,
      title: notificationData.title
    })

    return {
      success: true,
      id: notificationData.id,
      type: 'fallback'
    }
  }

  closeFallback(element) {
    if (element && element.parentNode) {
      element.style.animation = 'slideOutRight 0.3s ease-in-out forwards'
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
      }, 300)
    }
  }

  handleNotificationClick(notificationData) {
    logInfo('Notification clicked', {
      id: notificationData.id,
      type: notificationData.type,
      data: notificationData.data
    })

    // Router vers la page appropriée selon le type
    switch (notificationData.type) {
      case NOTIFICATION_TYPES.TROPHY:
        if (typeof window !== 'undefined' && window.location.pathname !== '/profil') {
          window.location.href = '/profil'
        }
        break
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
      case NOTIFICATION_TYPES.FRIEND_ACCEPTED:
        if (typeof window !== 'undefined' && window.location.pathname !== '/amis') {
          window.location.href = '/amis'
        }
        break
      case NOTIFICATION_TYPES.RECIPE_SHARED:
      case NOTIFICATION_TYPES.RECIPE_LIKED:
        if (notificationData.data.recipeId && typeof window !== 'undefined') {
          window.location.href = `/recipe/${notificationData.data.recipeId}`
        }
        break
    }
  }

  clearAll() {
    this.activeNotifications.forEach((notification, id) => {
      if (notification.close && typeof notification.close === 'function') {
        notification.close()
      } else if (notification.parentNode) {
        this.closeFallback(notification)
      }
    })
    this.activeNotifications.clear()
    
    logInfo('All notifications cleared')
  }

  getPermissionStatus() {
    const supported = typeof window !== 'undefined' && 'Notification' in window
    const permission = typeof window !== 'undefined' ? Notification.permission : 'default'
    
    return {
      supported,
      permission,
      canRequest: supported && permission === 'default',
      isGranted: supported && permission === 'granted',
      isDenied: supported && permission === 'denied'
    }
  }
}

// Create instance with SSR safety
let notificationManagerInstance = null

if (typeof window !== 'undefined') {
  notificationManagerInstance = new NotificationManager()
} else {
  // Mock instance for SSR
  notificationManagerInstance = {
    show: () => Promise.resolve({ success: false, id: null, type: 'ssr' }),
    requestPermission: () => Promise.resolve('denied'),
    clearAll: () => {},
    getPermissionStatus: () => ({ supported: false, permission: 'default', canRequest: false })
  }
}

// Instance globale
export const notificationManager = notificationManagerInstance

// Fonctions utilitaires
export const showTrophyNotification = (trophy) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.TROPHY,
    'Nouveau trophée débloqué !',
    {
      body: `Vous avez obtenu : ${trophy.name}`,
      image: trophy.image,
      data: { trophyId: trophy.id }
    }
  )
}

export const showFriendRequestNotification = (fromUser) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.FRIEND_REQUEST,
    'Nouvelle demande d\'ami',
    {
      body: `${fromUser.display_name} souhaite devenir votre ami`,
      data: { userId: fromUser.user_id }
    }
  )
}

export const showFriendAcceptedNotification = (user) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.FRIEND_ACCEPTED,
    'Demande d\'ami acceptée',
    {
      body: `${user.display_name} a accepté votre demande d'ami`,
      data: { userId: user.user_id }
    }
  )
}

export const showRecipeSharedNotification = (recipe, fromUser) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_SHARED,
    'Recette partagée',
    {
      body: `${fromUser.display_name} a partagé : ${recipe.title}`,
      image: recipe.image,
      data: { recipeId: recipe.id, userId: fromUser.user_id }
    }
  )
}

export const showRecipeLikedNotification = (recipe, fromUser) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    'Votre recette a été aimée',
    {
      body: `${fromUser.display_name} aime votre recette : ${recipe.title}`,
      image: recipe.image,
      data: { recipeId: recipe.id, userId: fromUser.user_id }
    }
  )
}

export const showCookingReminderNotification = (recipe, step) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.COOKING_REMINDER,
    'Rappel de cuisson',
    {
      body: `${recipe.title} - ${step}`,
      image: recipe.image,
      data: { recipeId: recipe.id, step }
    }
  )
}

// Ajouter les styles CSS dynamiquement
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }

    .coco-notification-fallback:hover {
      transform: translateX(-5px);
      transition: transform 0.2s ease;
    }
  `
  document.head.appendChild(style)
}
