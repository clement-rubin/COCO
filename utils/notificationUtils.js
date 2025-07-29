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
  SUCCESS: 'success',
  RECIPE_COMMENTED: 'recipe_commented',
  TROPHY_UNLOCKED: 'trophy_unlocked'
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
    this.notifications = []
    this.maxNotifications = 50
    
    // Vérification côté client uniquement
    if (typeof window !== 'undefined') {
      this.loadFromStorage()
    }
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
    
    // CSS adaptatif pour mobile et desktop
    const isMobile = window.innerWidth <= 768
    this.fallbackContainer.style.cssText = `
      position: fixed;
      top: ${isMobile ? '10px' : '80px'};
      right: ${isMobile ? '10px' : '20px'};
      left: ${isMobile ? '10px' : 'auto'};
      z-index: 10000;
      max-width: ${isMobile ? 'calc(100vw - 20px)' : '380px'};
      pointer-events: none;
    `
    document.body.appendChild(this.fallbackContainer)

    // Réajuster lors du redimensionnement
    const resizeHandler = () => {
      const nowMobile = window.innerWidth <= 768
      if (nowMobile !== isMobile) {
        this.fallbackContainer.style.top = nowMobile ? '10px' : '80px'
        this.fallbackContainer.style.right = nowMobile ? '10px' : '20px'
        this.fallbackContainer.style.left = nowMobile ? '10px' : 'auto'
        this.fallbackContainer.style.maxWidth = nowMobile ? 'calc(100vw - 20px)' : '380px'
      }
    }
    
    window.addEventListener('resize', resizeHandler)
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
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null
    }
    
    try {
      const storedNotification = {
        ...notification,
        timestamp: Date.now(),
        read: false
      }

      this.notifications.unshift(storedNotification)
      
      // Limiter le nombre de notifications stockées
      if (this.notifications.length > this.maxNotifications) {
        this.notifications = this.notifications.slice(0, this.maxNotifications)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
      
      // Notifier les listeners
      this.notifyListeners(storedNotification)
      
      return storedNotification
    } catch (error) {
      logError('Erreur lors du stockage de la notification', error)
      return null
    }
  }

  /**
   * Récupère les notifications stockées
   */
  getStoredNotifications() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return []
    }
    
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
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    
    try {
      this.notifications = this.notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
      this.notifyListeners({ type: 'mark_read', id: notificationId })
      return true
    } catch (error) {
      logError('Erreur lors du marquage comme lu', error)
      return false
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    
    try {
      this.notifications = this.notifications.map(notif => ({ ...notif, read: true }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
      this.notifyListeners({ type: 'mark_all_read' })
      return true
    } catch (error) {
      logError('Erreur lors du marquage global comme lu', error)
      return false
    }
  }

  /**
   * Supprime une notification
   */
  deleteNotification(notificationId) {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    
    try {
      this.notifications = this.notifications.filter(notif => notif.id !== notificationId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
      this.notifyListeners({ type: 'delete', id: notificationId })
      return true
    } catch (error) {
      logError('Erreur lors de la suppression de la notification', error)
      return false
    }
  }

  /**
   * Vide toutes les notifications
   */
  clearAll() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false
    }
    
    try {
      this.notifications = []
      localStorage.removeItem(STORAGE_KEY)
      this.notifyListeners({ type: 'clear_all' })
      return true
    } catch (error) {
      logError('Erreur lors du vidage des notifications', error)
      return false
    }
  }

  /**
   * Compte les notifications non lues
   */
  getUnreadCount() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 0
    }
    
    try {
      return this.notifications.filter(notif => !notif.read).length
    } catch (error) {
      logError('Erreur lors du comptage des notifications non lues', error)
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
   * Crée le conteneur fallback pour les notifications - VERSION MOBILE-FRIENDLY
   */
  createFallbackContainer() {
    if (this.fallbackContainer) return

    this.fallbackContainer = document.createElement('div')
    this.fallbackContainer.id = 'coco-fallback-notifications'
    
    // CSS adaptatif pour mobile et desktop
    const isMobile = window.innerWidth <= 768
    this.fallbackContainer.style.cssText = `
      position: fixed;
      top: ${isMobile ? '10px' : '80px'};
      right: ${isMobile ? '10px' : '20px'};
      left: ${isMobile ? '10px' : 'auto'};
      z-index: 10000;
      max-width: ${isMobile ? 'calc(100vw - 20px)' : '380px'};
      pointer-events: none;
    `
    document.body.appendChild(this.fallbackContainer)

    // Réajuster lors du redimensionnement
    const resizeHandler = () => {
      const nowMobile = window.innerWidth <= 768
      if (nowMobile !== isMobile) {
        this.fallbackContainer.style.top = nowMobile ? '10px' : '80px'
        this.fallbackContainer.style.right = nowMobile ? '10px' : '20px'
        this.fallbackContainer.style.left = nowMobile ? '10px' : 'auto'
        this.fallbackContainer.style.maxWidth = nowMobile ? 'calc(100vw - 20px)' : '380px'
      }
    }
    
    window.addEventListener('resize', resizeHandler)
  }

  /**
   * Crée l'élément DOM pour la notification fallback - VERSION OPTIMISÉE
   */
  createFallbackElement(notification) {
    const element = document.createElement('div')
    element.className = `coco-notification coco-notification-${notification.type}`
    
    // Styles adaptatifs
    const isMobile = window.innerWidth <= 768
    element.style.cssText = `
      background: white;
      border-left: 4px solid ${this.getTypeColor(notification.type)};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      margin-bottom: 12px;
      padding: ${isMobile ? '12px' : '16px'};
      transform: translateX(100%);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 0;
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      font-size: ${isMobile ? '0.9rem' : '1rem'};
      max-width: 100%;
      word-wrap: break-word;
    `

    // Contenu adaptatif
    const iconSize = isMobile ? '36px' : '40px'
    const titleFontSize = isMobile ? '0.9rem' : '0.95rem'
    const bodyFontSize = isMobile ? '0.8rem' : '0.85rem'
    
    element.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: ${isMobile ? '10px' : '12px'};">
        <div style="
          width: ${iconSize}; 
          height: ${iconSize}; 
          background: ${this.getTypeColor(notification.type)}15;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: ${isMobile ? '1.2rem' : '1.4rem'};
        ">
          ${this.getTypeEmoji(notification.type)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="
            font-weight: 600;
            color: #1f2937;
            font-size: ${titleFontSize};
            margin-bottom: 4px;
            line-height: 1.3;
            word-break: break-word;
          ">${notification.title}</div>
          ${notification.body ? `
            <div style="
              color: #6b7280;
              font-size: ${bodyFontSize};
              line-height: 1.4;
              word-break: break-word;
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
          font-size: 1.2rem;
          line-height: 1;
          min-width: 24px;
          min-height: 24px;
        " onclick="this.parentElement.parentElement.style.display='none'">✕</button>
      </div>
    `

    // Gestionnaire de clic amélioré
    element.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        this.markAsRead(notification.id)
        
        // Action personnalisée selon le type
        if (notification.data?.action) {
          this.handleNotificationAction(notification.data)
        }
        
        this.hideFallbackElement(element)
      }
    })

    // Gestion tactile pour mobile
    if (isMobile) {
      let touchStartX = 0
      element.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX
      })
      
      element.addEventListener('touchmove', (e) => {
        const touchX = e.touches[0].clientX
        const deltaX = touchX - touchStartX
        if (deltaX > 50) { // Swipe vers la droite pour fermer
          this.hideFallbackElement(element)
        }
      })
    }

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
    // Ajouter aussi dans les listeners pour compatibilité
    this.listeners.set('notificationCenter', callback)
  }

  // Charger les notifications depuis localStorage - VERSION SÉCURISÉE
  loadFromStorage() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      logInfo('localStorage non disponible (environnement serveur)', {
        component: 'NotificationManager',
        method: 'loadFromStorage'
      })
      return
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.notifications = JSON.parse(stored)
        logInfo('Notifications chargées depuis le stockage', {
          count: this.notifications.length,
          component: 'NotificationManager'
        })
      }
    } catch (error) {
      logError('Échec du chargement des notifications depuis le stockage', error, {
        component: 'NotificationManager',
        method: 'loadFromStorage'
      })
      this.notifications = []
    }
  }

  // Sauvegarder dans localStorage - VERSION SÉCURISÉE
  saveToStorage() {
    // Vérification côté client uniquement
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
    } catch (error) {
      logError('Erreur lors de la sauvegarde des notifications', error)
    }
  }

  // Ajouter une nouvelle notification
  addNotification(notification) {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    const newNotification = {
      id,
      timestamp: Date.now(),
      read: false,
      ...notification
    }

    // Éviter les doublons récents (même type + même recette dans les 30 secondes)
    const isDuplicate = this.notifications.some(n => 
      n.type === newNotification.type &&
      n.data?.recipeId === newNotification.data?.recipeId &&
      (Date.now() - n.timestamp) < 30000
    )

    if (isDuplicate) {
      logInfo('Doublon de notification évité', { type: notification.type, recipeId: notification.data?.recipeId })
      return
    }

    // Ajouter en début de liste
    this.notifications.unshift(newNotification)

    // Limiter le nombre de notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }

    this.saveToStorage()
    this.notifyListeners(newNotification)

    logInfo('Nouvelle notification ajoutée', {
      id: newNotification.id,
      type: newNotification.type,
      totalNotifications: this.notifications.length
    })

    return newNotification
  }

  // Notifier tous les listeners
  notifyListeners(notification) {
    this.listeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        logError('Erreur dans le listener de notification', error)
      }
    })
  }

  /**
   * Gère les actions personnalisées des notifications
   */
  handleNotificationAction(data) {
    try {
      switch (data.action) {
        case 'view_recipe':
          if (data.recipeId && typeof window !== 'undefined') {
            window.location.href = `/recipe/${data.recipeId}`
          }
          break
        case 'view_recipe_likes':
          if (data.recipeId && typeof window !== 'undefined') {
            window.location.href = `/recipe/${data.recipeId}?tab=likes`
          }
          break
        default:
          logDebug('Action de notification non gérée', { action: data.action })
      }
    } catch (error) {
      logError('Erreur lors de l\'action de notification', error)
    }
  }
}

// Instance globale
export const notificationManager = new NotificationManager()

// Auto-initialisation côté client
if (typeof window !== 'undefined') {
  // Initialiser automatiquement quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      notificationManager.init()
    })
  } else {
    notificationManager.init()
  }
}

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
  // Ne pas notifier l'auteur s'il like sa propre recette
  if (
    recipe.user_id &&
    (fromUser.user_id || fromUser.id) &&
    recipe.user_id === (fromUser.user_id || fromUser.id)
  ) {
    logInfo('Aucune notification de like envoyée : utilisateur like sa propre recette', {
      recipeId: recipe.id,
      userId: fromUser.user_id || fromUser.id
    })
    return Promise.resolve({ success: false, error: 'self_like' })
  }

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
        type: 'comment',
        action: 'view_recipe_comments'
      },
      forceFallback: true // Assurer l'arrivée dans le centre
    }
  )
}

export const showRecipeLikeInteractionNotification = (recipe, fromUser) => {
  try {
    // Validation des données d'entrée
    if (!recipe || !fromUser) {
      logError('Données manquantes pour la notification de like', { recipe: !!recipe, fromUser: !!fromUser })
      return Promise.resolve({ success: false, error: 'missing_data' })
    }

    // Ne pas notifier l'auteur s'il like sa propre recette
    if (recipe.user_id && (fromUser.user_id || fromUser.id) && recipe.user_id === (fromUser.user_id || fromUser.id)) {
      logInfo('Aucune notification de like envoyée : utilisateur like sa propre recette', {
        recipeId: recipe.id,
        userId: fromUser.user_id || fromUser.id
      })
      return Promise.resolve({ success: false, error: 'self_like' })
    }

    // Normalisation des données utilisateur
    const userName = fromUser.display_name || fromUser.name || fromUser.username || 'Un utilisateur'
    const userId = fromUser.user_id || fromUser.id
    const recipeTitle = recipe.title || 'Votre recette'
    const recipeId = recipe.id

    logInfo('Préparation notification de like', { 
      recipeId, 
      userId, 
      userName: userName.substring(0, 20) 
    })

    // Créer l'objet notification complet
    const notification = {
      type: 'recipe_liked',
      title: '❤️ Quelqu\'un aime votre recette !',
      body: `${userName} aime votre recette "${recipeTitle}"`,
      icon: '/icons/heart.png',
      data: { 
        recipeId, 
        userId,
        type: 'like',
        action: 'view_recipe',
        likerName: userName,
        recipeTitle,
        timestamp: new Date().toISOString(),
        currentLikes: recipe.likes_count || 0,
        // Ajouter des identifiants uniques pour éviter les doublons
        uniqueId: `like_${recipeId}_${userId}_${Date.now()}`
      }
    }

    // Vérification de doublon améliorée (même recette + même utilisateur dans les 60 secondes)
    const stored = notificationManager.getStoredNotifications()
    const isDuplicate = stored.some(n => 
      n.type === 'recipe_liked' &&
      n.data?.recipeId === recipeId &&
      n.data?.userId === userId &&
      (Date.now() - new Date(n.timestamp).getTime()) < 60000 // 60 secondes
    )

    if (isDuplicate) {
      logInfo('Notification de like dupliquée évitée', { recipeId, userId })
      return Promise.resolve({ success: false, error: 'duplicate' })
    }

    // Stockage sécurisé d'abord
    const storedNotification = notificationManager.storeNotification(notification)
    if (!storedNotification) {
      logError('Échec du stockage de la notification de like')
      return Promise.resolve({ success: false, error: 'storage_failed' })
    }

    // Affichage avec gestion d'erreur
    const displayResult = notificationManager.show(
      notification.type,
      notification.title,
      {
        body: notification.body,
        icon: notification.icon,
        data: notification.data,
        forceFallback: true, // Assurer l'affichage sur mobile
        duration: 6000,
        id: storedNotification.id
      }
    )

    logInfo('Notification de like envoyée avec succès', {
      recipeId,
      userId,
      notificationId: storedNotification.id,
      displayType: displayResult?.type || 'unknown'
    })

    return Promise.resolve({
      success: true,
      notificationId: storedNotification.id,
      displayType: displayResult?.type
    })

  } catch (error) {
    logError('Erreur lors de l\'envoi de la notification de like', error)
    
    // Tentative de récupération avec notification basique
    try {
      const fallbackNotification = {
        type: 'recipe_liked',
        title: '❤️ Nouvelle interaction',
        body: 'Quelqu\'un aime votre recette !',
        icon: '/icons/heart.png',
        data: { 
          recipeId: recipe?.id,
          type: 'like_fallback',
          timestamp: new Date().toISOString()
        }
      }
      
      notificationManager.storeNotification(fallbackNotification)
      notificationManager.show(fallbackNotification.type, fallbackNotification.title, {
        body: fallbackNotification.body,
        forceFallback: true,
        duration: 4000
      })
      
      return Promise.resolve({ success: true, fallback: true })
    } catch (fallbackError) {
      logError('Échec de la notification de récupération', fallbackError)
      return Promise.resolve({ success: false, error: 'complete_failure' })
    }
  }
}

/**
 * Notification enrichie avec statistiques de likes - VERSION AMÉLIORÉE
 */
export const showRecipeLikeWithStatsNotification = (recipe, fromUser, likeStats) => {
  try {
    const userName = fromUser.display_name || fromUser.name || 'Un utilisateur'
    const otherLikersCount = Math.max(0, (likeStats.total_likers || 1) - 1)
    const recentLikers = likeStats.recent_likers || []
    
    let bodyText = `${userName} aime votre recette "${recipe.title}"`
    
    if (otherLikersCount > 0) {
      if (otherLikersCount === 1) {
        bodyText += ` (et 1 autre personne)`
      } else if (otherLikersCount <= 3 && recentLikers.length > 1) {
        const otherNames = recentLikers
          .slice(1, 4)
          .map(l => l.user_name || l.name)
          .filter(Boolean)
          .join(', ')
        if (otherNames) {
          bodyText += ` (avec ${otherNames})`
        } else {
          bodyText += ` (et ${otherLikersCount} autres)`
        }
      } else {
        bodyText += ` (et ${otherLikersCount} autres personnes)`
      }
    }

    const notification = {
      type: 'recipe_liked_stats',
      title: '❤️ Votre recette fait sensation !',
      body: bodyText,
      icon: '/icons/heart.png',
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id || fromUser.id,
        type: 'like_with_stats',
        action: 'view_recipe_likes',
        likerName: userName,
        recipeTitle: recipe.title,
        totalLikes: likeStats.total_likers || 1,
        recentLikers: recentLikers.slice(0, 3),
        timestamp: new Date().toISOString(),
        uniqueId: `like_stats_${recipe.id}_${Date.now()}`
      }
    }

    // Stockage puis affichage
    const stored = notificationManager.storeNotification(notification)
    if (stored) {
      return notificationManager.show(
        notification.type,
        notification.title,
        {
          body: notification.body,
          icon: notification.icon,
          data: notification.data,
          forceFallback: true,
          duration: 8000,
          id: stored.id
        }
      )
    }

    return Promise.resolve({ success: false, error: 'storage_failed' })

  } catch (error) {
    logError('Erreur notification like avec stats', error)
    // Fallback vers notification simple
    return showRecipeLikeInteractionNotification(recipe, fromUser)
  }
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
