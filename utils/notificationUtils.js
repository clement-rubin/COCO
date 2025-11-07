/**
 * Notifications désactivées : ce module fournit des stubs inoffensifs
 * afin que le reste de l'application puisse continuer à importer les
 * fonctions liées aux notifications sans déclencher de logique lourde.
 */

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

class DisabledNotificationManager {
  constructor() {
    this.disabled = true
  }

  init() {}

  async show() {
    return { success: false, disabled: true, type: 'disabled' }
  }

  storeNotification() {
    return null
  }

  getStoredNotifications() {
    return []
  }

  getUnreadCount() {
    return 0
  }

  markAllAsRead() {
    return 0
  }

  markAsRead() {
    return false
  }

  deleteNotification() {
    return false
  }

  clearAll() {}

  onNotificationAdded() {}

  offNotificationAdded() {}

  getPermissionStatus() {
    return { supported: false, permission: 'denied' }
  }

  async requestPermission() {
    return 'denied'
  }
}

export const notificationManager = new DisabledNotificationManager()

const disabledNotificationResponse = (kind) =>
  Promise.resolve({ success: false, disabled: true, type: kind })

export const showTrophyNotification = () => disabledNotificationResponse('trophy')
export const showFriendRequestNotification = () => disabledNotificationResponse('friend_request')
export const showFriendAcceptedNotification = () => disabledNotificationResponse('friend_accepted')
export const showRecipeSharedNotification = () => disabledNotificationResponse('recipe_shared')
export const showRecipeLikedNotification = () => disabledNotificationResponse('recipe_liked')
export const showCookingReminderNotification = () => disabledNotificationResponse('cooking_reminder')
export const showRecipeCommentNotification = () => disabledNotificationResponse('recipe_commented')
export const showRecipeLikeInteractionNotification = () => disabledNotificationResponse('recipe_liked')
export const showRecipeLikeWithStatsNotification = () => disabledNotificationResponse('recipe_liked_stats')
export const showRecipeParticipationNotification = () => disabledNotificationResponse('recipe_participation')
export const showRecipeLikeNotification = () => disabledNotificationResponse('recipe_liked')
