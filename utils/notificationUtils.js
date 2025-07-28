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
    this.addedListeners = new Set() // Nouveau: tracker les listeners
  }

  /**
   * Initialise le gestionnaire de notifications
   */
  init() {
    if (this.isInitialized) return
    
    if (typeof window === 'undefined') return

    this.isInitialized = true
    this.createFallbackContainer()
  }

  /**
   * Écouter les nouvelles notifications ajoutées
   */
  onNotificationAdded(callback) {
    const id = Math.random().toString(36).substr(2, 9)
    this.addedListeners.add(callback)
    
    // Retourner une fonction de désabonnement
    return () => {
      this.addedListeners.delete(callback)
    }
  }

  /**
   * Notifier tous les listeners d'une nouvelle notification
   */
  notifyListeners(notification) {
    this.addedListeners.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        console.error('Error in notification listener:', error)
      }
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
   * Affiche une notification
   */
  async show(type, title, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      type,
      title,
      body: options.body || '',
      data: options.data || {},
      timestamp: Date.now(),
      read: false
    }

    // Sauvegarder la notification
    this.saveNotification(notification)
    
    // Notifier les listeners (centres de notifications)
    this.notifyListeners(notification)

    // Afficher la notification native/fallback si demandé
    if (!options.centerOnly) {
      await this.showNativeOrFallback(notification, options)
    }

    return { success: true, notification }
  }

  /**
   * Sauvegarder une notification dans le localStorage
   */
  saveNotification(notification) {
    try {
      const stored = JSON.parse(localStorage.getItem('coco_notifications') || '[]')
      stored.unshift(notification)
      
      // Garder seulement les 50 dernières notifications
      const limited = stored.slice(0, 50)
      localStorage.setItem('coco_notifications', JSON.stringify(limited))
    } catch (error) {
      console.error('Error saving notification:', error)
    }
  }

  /**
   * Récupérer les notifications stockées
   */
  getStoredNotifications() {
    try {
      return JSON.parse(localStorage.getItem('coco_notifications') || '[]')
    } catch (error) {
      console.error('Error loading notifications:', error)
      return []
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead() {
    try {
      const stored = this.getStoredNotifications()
      const updated = stored.map(n => ({ ...n, read: true }))
      localStorage.setItem('coco_notifications', JSON.stringify(updated))
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  /**
   * Supprimer une notification
   */
  deleteNotification(notificationId) {
    try {
      const stored = this.getStoredNotifications()
      const filtered = stored.filter(n => n.id !== notificationId)
      localStorage.setItem('coco_notifications', JSON.stringify(filtered))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  /**
   * Effacer toutes les notifications
   */
  clearAll() {
    try {
      localStorage.removeItem('coco_notifications')
    } catch (error) {
      console.error('Error clearing notifications:', error)
    }
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  getUnreadCount() {
    try {
      const stored = this.getStoredNotifications()
      return stored.filter(n => !n.read).length
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Affiche une notification native ou fallback
   */
  async showNativeOrFallback(notification, options) {
    // Tenter l'affichage natif sauf si forceFallback
    if (!options.forceFallback && this.canShowNative()) {
      try {
        const nativeNotif = new Notification(notification.title, {
          body: notification.body,
          icon: options.icon || '/icons/coco-icon-96.png',
          tag: notification.id,
          requireInteraction: notification.type === NOTIFICATION_TYPES.FRIEND_REQUEST
        })

        logInfo('Notification native affichée', { 
          type: notification.type, 
          title: notification.title.substring(0, 50) 
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
}

// Instance globale
export const notificationManager = new NotificationManager()

// Fonctions utilitaires spécialisées avec intégration au centre de notifications
export async function showTrophyNotification(trophy, options = {}) {
  return await notificationManager.show(
    NOTIFICATION_TYPES.TROPHY,
    `🏆 Nouveau trophée débloqué !`,
    {
      body: `Félicitations ! Vous avez obtenu le trophée "${trophy.name}".`,
      data: { 
        type: 'trophy',
        trophyId: trophy.id,
        trophyName: trophy.name,
        ...options.data 
      },
      ...options
    }
  )
}

export async function showRecipeLikeWithStatsNotification(recipe, user, likersStats, options = {}) {
  const message = likersStats.total_likers === 1 
    ? `${user.display_name} a aimé votre recette "${recipe.title}"`
    : `${user.display_name} et ${likersStats.total_likers - 1} autre${likersStats.total_likers > 2 ? 's' : ''} ont aimé votre recette "${recipe.title}"`

  return await notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    `💖 ${recipe.likes_count} like${recipe.likes_count > 1 ? 's' : ''} sur votre recette !`,
    {
      body: message,
      data: { 
        type: 'like_with_stats',
        recipeId: recipe.id,
        recipeName: recipe.title,
        totalLikes: recipe.likes_count,
        recentLikers: likersStats.recent_likers || [],
        ...options.data 
      },
      ...options
    }
  )
}

export async function showRecipeCommentNotification(recipe, user, comment, options = {}) {
  return await notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_COMMENT,
    `💬 Nouveau commentaire`,
    {
      body: `${user.display_name} a commenté votre recette "${recipe.title}": "${comment.text.substring(0, 100)}${comment.text.length > 100 ? '...' : ''}"`,
      data: { 
        type: 'comment',
        recipeId: recipe.id,
        recipeName: recipe.title,
        commentId: comment.id,
        commentText: comment.text,
        ...options.data 
      },
      ...options
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
  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    '❤️ Votre recette a été aimée !',
    {
      body: `${fromUser.display_name || fromUser.name || 'Un utilisateur'} aime votre recette "${recipe.title}"`,
      icon: '/icons/heart.png',
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id || fromUser.id,
        type: 'like',
        action: 'view_recipe',
        likerName: fromUser.display_name || fromUser.name,
        recipeTitle: recipe.title,
        timestamp: new Date().toISOString(),
        currentLikes: recipe.likes_count || 0
      },
      forceFallback: true,
      duration: 6000 // Plus long pour laisser le temps de lire
    }
  )
}

/**
 * Notification enrichie avec statistiques de likes
 */
export const showRecipeLikeWithStatsNotification = (recipe, fromUser, likeStats) => {
  const otherLikersCount = (likeStats.total_likers || 1) - 1
  const recentLikers = likeStats.recent_likers || []
  
  let bodyText = `${fromUser.display_name || 'Un utilisateur'} aime votre recette "${recipe.title}"`
  
  if (otherLikersCount > 0) {
    if (otherLikersCount === 1) {
      bodyText += ` (et 1 autre personne)`
    } else if (otherLikersCount <= 3 && recentLikers.length > 1) {
      const otherNames = recentLikers
        .slice(1, 4)
        .map(l => l.user_name)
        .join(', ')
      bodyText += ` (avec ${otherNames})`
    } else {
      bodyText += ` (et ${otherLikersCount} autres personnes)`
    }
  }

  return notificationManager.show(
    NOTIFICATION_TYPES.RECIPE_LIKED,
    '❤️ Votre recette fait sensation !',
    {
      body: bodyText,
      icon: '/icons/heart.png',
      data: { 
        recipeId: recipe.id, 
        userId: fromUser.user_id || fromUser.id,
        type: 'like_with_stats',
        action: 'view_recipe_likes',
        likerName: fromUser.display_name || fromUser.name,
        recipeTitle: recipe.title,
        totalLikes: likeStats.total_likers || 1,
        recentLikers: recentLikers.slice(0, 3), // Seulement les 3 plus récents
        timestamp: new Date().toISOString()
      },
      forceFallback: true,
      duration: 8000
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
        action: 'open_collections_tab'
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
