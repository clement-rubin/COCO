/**
 * Système de notifications COCO avec gestion fallback et centre de notifications
 */

import { logInfo, logError, logDebug } from './logger'

// Types de notifications
export const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  TROPHY: 'trophy',
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  RECIPE_SHARED: 'recipe_shared',
  RECIPE_LIKED: 'recipe_liked',
  COOKING_REMINDER: 'cooking_reminder',
  ERROR: 'error',
  SUCCESS: 'success'
}

// Durées par défaut
const DEFAULT_DURATIONS = {
  [NOTIFICATION_TYPES.SYSTEM]: 5000,
  [NOTIFICATION_TYPES.TROPHY]: 8000,
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: 10000,
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: 6000,
  [NOTIFICATION_TYPES.RECIPE_SHARED]: 7000,
  [NOTIFICATION_TYPES.RECIPE_LIKED]: 4000,
  [NOTIFICATION_TYPES.COOKING_REMINDER]: 15000,
  [NOTIFICATION_TYPES.ERROR]: 8000,
  [NOTIFICATION_TYPES.SUCCESS]: 4000
}

// Stockage local des notifications
const STORAGE_KEY = 'coco_notifications'
const MAX_STORED_NOTIFICATIONS = 50

/**
 * Gestionnaire central des notifications
 */
class NotificationManager {
  constructor() {
    this.listeners = new Map()
    this.queue = []
    this.activeNotifications = new Map()
    this.isInitialized = false
    this.fallbackContainer = null
    this.notificationCenter = null
  }

  /**
   * Initialise le gestionnaire de notifications
   */
  init() {
    if (this.isInitialized) return
    
    if (typeof window === 'undefined') {
      logDebug('NotificationManager: Environnement serveur détecté')
      return
    }

    this.isInitialized = true
    this.createFallbackContainer()
    this.setupNotificationCenterListener()
    
    logInfo('NotificationManager initialisé', {
      hasNativeSupport: 'Notification' in window,
      permission: this.getPermissionStatus().permission
    })
  }

  /**
   * Crée le conteneur fallback pour les notifications
   */
  createFallbackContainer() {
    if (this.fallbackContainer) return

    this.fallbackContainer = document.createElement('div')
    this.fallbackContainer.id = 'coco-fallback-notifications'
    this.fallbackContainer.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      max-width: 380px;
      pointer-events: none;
    `
    document.body.appendChild(this.fallbackContainer)
  }

  /**
   * Configure l'écoute pour le centre de notifications
   */
  setupNotificationCenterListener() {
    this.listeners.set('notificationCenter', (callback) => {
      this.notificationCenter = callback
    })
  }

  /**
   * Stocke une notification dans le localStorage
   */
  storeNotification(notification) {
    try {
      const stored = this.getStoredNotifications()
      const newNotification = {
        id: notification.id || Date.now() + Math.random(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        timestamp: new Date().toISOString(),
        read: false,
        data: notification.data || {}
      }

      stored.unshift(newNotification)
      
      // Limiter le nombre de notifications stockées
      if (stored.length > MAX_STORED_NOTIFICATIONS) {
        stored.splice(MAX_STORED_NOTIFICATIONS)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
      
      // Notifier le centre de notifications
      if (this.notificationCenter) {
        this.notificationCenter(newNotification)
      }

      logDebug('Notification stockée', { id: newNotification.id, type: newNotification.type })
      return newNotification

    } catch (error) {
      logError('Erreur lors du stockage de la notification', error)
      return null
    }
  }

  /**
   * Récupère les notifications stockées
   */
  getStoredNotifications() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      logError('Erreur lors de la récupération des notifications', error)
      return []
    }
  }

  /**
   * Marque une notification comme lue
   */
  markAsRead(notificationId) {
    try {
      const stored = this.getStoredNotifications()
      const notification = stored.find(n => n.id === notificationId)
      
      if (notification) {
        notification.read = true
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
        logDebug('Notification marquée comme lue', { id: notificationId })
      }
    } catch (error) {
      logError('Erreur lors du marquage de lecture', error)
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead() {
    try {
      const stored = this.getStoredNotifications()
      stored.forEach(n => n.read = true)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
      logDebug('Toutes les notifications marquées comme lues')
    } catch (error) {
      logError('Erreur lors du marquage de toutes les notifications', error)
    }
  }

  /**
   * Supprime une notification
   */
  deleteNotification(notificationId) {
    try {
      const stored = this.getStoredNotifications()
      const filtered = stored.filter(n => n.id !== notificationId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
      logDebug('Notification supprimée', { id: notificationId })
    } catch (error) {
      logError('Erreur lors de la suppression', error)
    }
  }

  /**
   * Vide toutes les notifications
   */
  clearAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
      logDebug('Toutes les notifications supprimées')
    } catch (error) {
      logError('Erreur lors du vidage des notifications', error)
    }
  }

  /**
   * Compte les notifications non lues
   */
  getUnreadCount() {
    try {
      const stored = this.getStoredNotifications()
      return stored.filter(n => !n.read).length
    } catch (error) {
      logError('Erreur lors du comptage des non lues', error)
      return 0
    }
  }

  /**
   * Affiche une notification
   */
  async show(type, title, options = {}) {
    this.init()
    
    const notification = {
      id: options.id || Date.now() + Math.random(),
      type,
      title,
      body: options.body || '',
      icon: options.icon || '/icons/coco-icon-96.png',
      data: options.data || {},
      duration: options.duration || DEFAULT_DURATIONS[type] || 5000,
      forceFallback: options.forceFallback || false
    }

    // Stocker la notification
    const storedNotification = this.storeNotification(notification)

    // Tenter l'affichage natif sauf si forceFallback
    if (!notification.forceFallback && this.canShowNative()) {
      try {
        const nativeNotif = new Notification(title, {
          body: notification.body,
          icon: notification.icon,
          tag: notification.id,
          requireInteraction: type === NOTIFICATION_TYPES.FRIEND_REQUEST
        })

        logInfo('Notification native affichée', { 
          type, 
          title: title.substring(0, 50) 
        })

        return {
          success: true,
          type: 'native',
          id: notification.id,
          close: () => nativeNotif.close()
        }
      } catch (error) {
        logError('Échec notification native, fallback', error)
      }
    }

    // Fallback vers notification intégrée
    return this.showFallback(notification)
  }

  /**
   * Affiche une notification fallback
   */
  showFallback(notification) {
    if (!this.fallbackContainer) {
      this.createFallbackContainer()
    }

    const element = this.createFallbackElement(notification)
    this.fallbackContainer.appendChild(element)

    // Animation d'entrée
    setTimeout(() => element.classList.add('show'), 100)

    // Auto-suppression
    const autoHide = setTimeout(() => {
      this.hideFallbackElement(element)
    }, notification.duration)

    // Stockage pour gestion
    this.activeNotifications.set(notification.id, {
      element,
      timeout: autoHide
    })

    logInfo('Notification fallback affichée', { 
      type: notification.type, 
      id: notification.id 
    })

    return {
      success: true,
      type: 'fallback',
      id: notification.id,
      close: () => this.hideFallbackElement(element)
    }
  }

  /**
   * Crée l'élément DOM pour la notification fallback
   */
  createFallbackElement(notification) {
    const element = document.createElement('div')
    element.className = `coco-notification coco-notification-${notification.type}`
    element.style.cssText = `
      background: white;
      border-left: 4px solid ${this.getTypeColor(notification.type)};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      margin-bottom: 12px;
      padding: 16px;
      transform: translateX(100%);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    `

    // Icône et contenu
    element.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          width: 40px; 
          height: 40px; 
          background: ${this.getTypeColor(notification.type)}15;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          ${this.getTypeEmoji(notification.type)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="
            font-weight: 600;
            color: #1f2937;
            font-size: 0.95rem;
            margin-bottom: 4px;
            line-height: 1.3;
          ">${notification.title}</div>
          ${notification.body ? `
            <div style="
              color: #6b7280;
              font-size: 0.85rem;
              line-height: 1.4;
            ">${notification.body}</div>
          ` : ''}
          <div style="
            color: #9ca3af;
            font-size: 0.75rem;
            margin-top: 6px;
          ">À l'instant</div>
        </div>
        <button style="
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        " onclick="this.parentElement.parentElement.style.display='none'">✕</button>
      </div>
    `

    // Gestionnaire de clic
    element.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.markAsRead(notification.id)
        this.hideFallbackElement(element)
      }
    })

    // Classe pour animation
    element.classList.add('coco-notification-enter')

    return element
  }

  /**
   * Masque un élément de notification fallback
   */
  hideFallbackElement(element) {
    element.style.transform = 'translateX(100%)'
    element.style.opacity = '0'
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element)
      }
    }, 400)
  }

  /**
   * Obtient la couleur associée à un type de notification
   */
  getTypeColor(type) {
    const colors = {
      [NOTIFICATION_TYPES.SYSTEM]: '#3b82f6',
      [NOTIFICATION_TYPES.TROPHY]: '#f59e0b',
      [NOTIFICATION_TYPES.FRIEND_REQUEST]: '#10b981',
      [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: '#059669',
      [NOTIFICATION_TYPES.RECIPE_SHARED]: '#ff6b35',
      [NOTIFICATION_TYPES.RECIPE_LIKED]: '#ec4899',
      [NOTIFICATION_TYPES.COOKING_REMINDER]: '#8b5cf6',
      [NOTIFICATION_TYPES.ERROR]: '#ef4444',
      [NOTIFICATION_TYPES.SUCCESS]: '#22c55e'
    }
    return colors[type] || '#6b7280'
  }

  /**
   * Obtient l'emoji associé à un type de notification
   */
  getTypeEmoji(type) {
    const emojis = {
      [NOTIFICATION_TYPES.SYSTEM]: '🔔',
      [NOTIFICATION_TYPES.TROPHY]: '🏆',
      [NOTIFICATION_TYPES.FRIEND_REQUEST]: '👥',
      [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: '🤝',
      [NOTIFICATION_TYPES.RECIPE_SHARED]: '🍽️',
      [NOTIFICATION_TYPES.RECIPE_LIKED]: '❤️',
      [NOTIFICATION_TYPES.COOKING_REMINDER]: '⏰',
      [NOTIFICATION_TYPES.ERROR]: '⚠️',
      [NOTIFICATION_TYPES.SUCCESS]: '✅'
    }
    return emojis[type] || '🔔'
  }

  /**
   * Vérifie si les notifications natives peuvent être affichées
   */
  canShowNative() {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           Notification.permission === 'granted'
  }

  /**
   * Obtient le statut des permissions
   */
  getPermissionStatus() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { supported: false, permission: 'unsupported' }
    }

    return {
      supported: true,
      permission: Notification.permission,
      isGranted: Notification.permission === 'granted',
      canRequest: Notification.permission === 'default'
    }
  }

  /**
   * Demande la permission pour les notifications
   */
  async requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }

    try {
      const permission = await Notification.requestPermission()
      logInfo('Permission de notification demandée', { permission })
      return permission
    } catch (error) {
      logError('Erreur lors de la demande de permission', error)
      return 'denied'
    }
  }

  /**
   * Enregistre un listener pour le centre de notifications
   */
  onNotificationAdded(callback) {
    this.notificationCenter = callback
  }
}

// Instance globale
export const notificationManager = new NotificationManager()

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

// Nouvelles fonctions pour les interactions utilisateur
export const showRecipeCommentNotification = (recipe, fromUser, comment) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.SYSTEM,
    'Nouveau commentaire sur votre recette',
    {
      body: `${fromUser.display_name} a commenté "${recipe.title}": ${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}`,
      image: recipe.image,
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id,
        commentId: comment.id,
        type: 'comment'
      }
    }
  )
}

export const showRecipeLikeInteractionNotification = (recipe, fromUser) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    '❤️ Votre recette a été aimée !',
    {
      body: `${fromUser.display_name || fromUser.name || 'Un utilisateur'} aime votre recette "${recipe.title}"`,
      icon: '/icons/heart.png',
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id || fromUser.id,
        type: 'like'
      },
      forceFallback: true // Forcer l'affichage fallback pour être sûr que ça arrive dans la cloche
    }
  )
}

export const showNewFollowerNotification = (follower) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.FRIEND_ACCEPTED,
    'Nouveau follower !',
    {
      body: `${follower.display_name || follower.name} vous suit maintenant`,
      data: { 
        userId: follower.user_id || follower.id,
        type: 'follow'
      }
    }
  )
}

export const showRecipeOfWeekVoteNotification = (recipe, fromUser) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    'Vote pour votre recette !',
    {
      body: `${fromUser.display_name} a voté pour votre recette "${recipe.title}" comme recette de la semaine !`,
      image: recipe.image,
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id,
        type: 'week_vote'
      }
    }
  )
}

export const showRecipeOfWeekWinnerNotification = (recipe) => {
  return notificationManager.show(
    NOTIFICATION_TYPES.SYSTEM,
    'Félicitations ! 🏆',
    {
      body: `Votre recette "${recipe.title}" a été élue recette de la semaine !`,
      image: recipe.image,
      data: { 
        recipeId: recipe.id,
        type: 'week_winner'
      }
    }
  )
}

// Nouvelle fonction pour notifier le début du vote hebdomadaire
export const showWeeklyVotingStartNotification = () => {
  return notificationManager.show(
    NOTIFICATION_TYPES.SYSTEM,
    'Nouveau vote hebdomadaire ! 🗳️',
    {
      body: 'Découvrez les nouvelles recettes candidates et votez pour votre préférée !',
      data: { 
        type: 'weekly_voting_start',
        action: 'open_competitions_week_tab'
      }
    }
  )
}

export const showRecipeParticipationNotification = (recipe, action) => {
  const isInscription = action === 'inscrite'
  return notificationManager.show(
    NOTIFICATION_TYPES.SUCCESS,
    isInscription ? 'Recette inscrite au concours !' : 'Recette retirée du concours',
    {
      body: `"${recipe.title}" ${isInscription ? 'participe maintenant' : 'ne participe plus'} au concours de la semaine`,
      image: recipe.image,
      data: { 
        recipeId: recipe.id,
        type: isInscription ? 'contest_join' : 'contest_leave'
      },
      duration: isInscription ? 6000 : 4000
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
