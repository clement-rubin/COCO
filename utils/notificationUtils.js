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
      return
    }

    this.permission = Notification.permission
    this.createFallbackContainer()
    
    logInfo('NotificationManager initialized', {
      permission: this.permission,
      supported: true
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
      return 'denied'
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      this.permission = await Notification.requestPermission()
      
      logInfo('Notification permission requested', {
        result: this.permission,
        timestamp: new Date().toISOString()
      })

      return this.permission
    } catch (error) {
      logError('Error requesting notification permission', error)
      return 'denied'
    }
  }

  async show(type, title, options = {}) {
    // Check browser environment first
    if (typeof window === 'undefined') {
      logInfo('Notification attempted in non-browser environment', { type, title })
      return { success: false, id: null, type: 'skipped' }
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

    // Vérifier si les permissions sont requises
    if (config.requirePermission && this.permission !== 'granted') {
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        return this.showFallback(notificationData)
      }
    }

    // Essayer d'afficher une notification native
    if (this.permission === 'granted' && !options.forceFallback) {
      try {
        return await this.showNative(notificationData, config)
      } catch (error) {
        logError('Failed to show native notification, falling back', error)
        return this.showFallback(notificationData)
      }
    }

    // Utiliser le fallback
    return this.showFallback(notificationData)
  }

  async showNative(notificationData, config) {
    try {
      const notification = new Notification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.image || '/icons/coco-icon-96.png',
        badge: '/icons/coco-badge.png',
        tag: notificationData.type,
        requireInteraction: config.persistent,
        silent: !config.sound,
        data: notificationData.data
      })

      // Gérer les clics
      notification.onclick = () => {
        window.focus()
        this.handleNotificationClick(notificationData)
        notification.close()
      }

      // Auto-fermeture
      if (!config.persistent) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      this.activeNotifications.set(notificationData.id, notification)
      
      logInfo('Native notification shown', {
        id: notificationData.id,
        type: notificationData.type,
        title: notificationData.title
      })

      return {
        success: true,
        id: notificationData.id,
        type: 'native'
      }
    } catch (error) {
      logError('Error showing native notification', error)
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
    return {
      supported: typeof window !== 'undefined' && 'Notification' in window,
      permission: typeof window !== 'undefined' ? this.permission : 'default',
      canRequest: typeof window !== 'undefined' && this.permission === 'default'
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
