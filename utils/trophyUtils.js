import { supabase } from '../lib/supabase'
import { logInfo, logError } from './logger'

// Définition des trophées disponibles
export const TROPHY_DEFINITIONS = {
  // Trophées de recettes
  first_recipe: {
    id: 'first_recipe',
    name: 'Premier Plat',
    description: 'Créer votre première recette',
    icon: '🍽️',
    category: 'creation',
    rarity: 'common',
    condition: { type: 'recipes_count', value: 1 },
    points: 50
  },
  recipe_collector: {
    id: 'recipe_collector',
    name: 'Collectionneur',
    description: 'Créer 10 recettes',
    icon: '📚',
    category: 'creation',
    rarity: 'uncommon',
    condition: { type: 'recipes_count', value: 10 },
    points: 200
  },
  master_chef: {
    id: 'master_chef',
    name: 'Chef Étoilé',
    description: 'Créer 50 recettes',
    icon: '👨‍🍳',
    category: 'creation',
    rarity: 'legendary',
    condition: { type: 'recipes_count', value: 50 },
    points: 1000
  },

  // Trophées sociaux
  first_friend: {
    id: 'first_friend',
    name: 'Premier Ami',
    description: 'Ajouter votre premier ami',
    icon: '👥',
    category: 'social',
    rarity: 'common',
    condition: { type: 'friends_count', value: 1 },
    points: 25
  },
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Papillon Social',
    description: 'Avoir 25 amis',
    icon: '🦋',
    category: 'social',
    rarity: 'rare',
    condition: { type: 'friends_count', value: 25 },
    points: 500
  },
  social_influencer: {
    id: 'social_influencer',
    name: 'Influenceur Culinaire',
    description: 'Avoir 50 amis qui suivent vos recettes',
    icon: '🌟',
    category: 'social',
    rarity: 'legendary',
    condition: { type: 'friends_count', value: 50 },
    points: 1000
  },

  // Trophées d'engagement
  profile_complete: {
    id: 'profile_complete',
    name: 'Profil Parfait',
    description: 'Compléter 100% de votre profil',
    icon: '✨',
    category: 'engagement',
    rarity: 'uncommon',
    condition: { type: 'profile_completeness', value: 100 },
    points: 150
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Pionnier',
    description: 'Membre depuis plus de 30 jours',
    icon: '🌟',
    category: 'engagement',
    rarity: 'rare',
    condition: { type: 'days_since_registration', value: 30 },
    points: 300
  },

  // Trophées spéciaux
  welcome_aboard: {
    id: 'welcome_aboard',
    name: 'Bienvenue!',
    description: 'Créer votre compte COCO',
    icon: '🎉',
    category: 'special',
    rarity: 'common',
    condition: { type: 'account_created', value: true },
    points: 10
  }
}

// Couleurs par rareté
export const TROPHY_RARITIES = {
  common: {
    name: 'Commun',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
    glow: 'rgba(107, 114, 128, 0.3)'
  },
  uncommon: {
    name: 'Peu commun',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16, 185, 129, 0.4)'
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  epic: {
    name: 'Épique',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glow: 'rgba(139, 92, 246, 0.4)'
  },
  legendary: {
    name: 'Légendaire',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245, 158, 11, 0.5)'
  }
}

/**
 * Vérifie et débloque automatiquement les trophées pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Liste des nouveaux trophées débloqués
 */
export async function checkAndUnlockTrophies(userId) {
  try {
    logInfo('Checking trophies for user', { userId: userId?.substring(0, 8) + '...' })

    // Récupérer les statistiques de l'utilisateur
    const userStats = await getUserStatsForTrophies(userId)
    
    // Récupérer les trophées déjà débloqués
    const { data: unlockedTrophies, error: trophiesError } = await supabase
      .from('user_trophies')
      .select('trophy_id')
      .eq('user_id', userId)

    if (trophiesError) {
      logError('Error fetching user trophies', trophiesError)
      return []
    }

    const unlockedTrophyIds = new Set(unlockedTrophies?.map(t => t.trophy_id) || [])
    const newlyUnlocked = []

    // Vérifier chaque trophée
    for (const [trophyId, trophy] of Object.entries(TROPHY_DEFINITIONS)) {
      if (unlockedTrophyIds.has(trophyId)) continue

      const isUnlocked = checkTrophyCondition(trophy.condition, userStats)
      if (isUnlocked) {
        const success = await unlockTrophy(userId, trophyId)
        if (success) {
          newlyUnlocked.push({
            ...trophy,
            unlockedAt: new Date().toISOString()
          })
        }
      }
    }

    logInfo('Trophy check completed', { 
      userId: userId?.substring(0, 8) + '...',
      newTrophies: newlyUnlocked.length
    })

    return newlyUnlocked

  } catch (error) {
    logError('Error checking trophies', error)
    return []
  }
}

/**
 * Vérifie si une condition de trophée est remplie
 * @param {Object} condition - Condition du trophée
 * @param {Object} userStats - Statistiques de l'utilisateur
 * @returns {boolean} Si la condition est remplie
 */
function checkTrophyCondition(condition, userStats) {
  switch (condition.type) {
    case 'recipes_count':
      return userStats.recipesCount >= condition.value
    case 'friends_count':
      return userStats.friendsCount >= condition.value
    case 'profile_completeness':
      return userStats.profileCompleteness >= condition.value
    case 'days_since_registration':
      return userStats.daysSinceRegistration >= condition.value
    case 'account_created':
      return condition.value === true
    default:
      return false
  }
}

/**
 * Débloque un trophée pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} trophyId - ID du trophée
 * @returns {Promise<boolean>} Succès du déblocage
 */
async function unlockTrophy(userId, trophyId) {
  try {
    const trophy = TROPHY_DEFINITIONS[trophyId]
    if (!trophy) {
      logError('Trophy not found', new Error('Invalid trophy ID'), { trophyId })
      return false
    }

    const { error } = await supabase
      .from('user_trophies')
      .insert({
        user_id: userId,
        trophy_id: trophyId,
        unlocked_at: new Date().toISOString(),
        points_earned: trophy.points
      })

    if (error) {
      logError('Error unlocking trophy', error, { userId, trophyId })
      return false
    }

    logInfo('Trophy unlocked', { 
      userId: userId?.substring(0, 8) + '...',
      trophyId,
      points: trophy.points
    })

    return true

  } catch (error) {
    logError('Error in unlockTrophy', error)
    return false
  }
}

/**
 * Récupère les statistiques nécessaires pour les trophées
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques de l'utilisateur
 */
async function getUserStatsForTrophies(userId) {
  try {
    // Utiliser l'API optimisée
    const response = await fetch(`/api/user-stats?user_id=${userId}`)
    
    if (response.ok) {
      const stats = await response.json()
      return {
        recipesCount: stats.recipesCount || 0,
        friendsCount: stats.friendsCount || 0,
        profileCompleteness: stats.profileCompleteness || 0,
        daysSinceRegistration: stats.daysSinceRegistration || 0
      }
    } else {
      // Fallback vers la méthode directe
      return await getUserStatsForTrophiesFallback(userId)
    }

  } catch (error) {
    logError('Error getting user stats for trophies', error)
    return await getUserStatsForTrophiesFallback(userId)
  }
}

async function getUserStatsForTrophiesFallback(userId) {
  try {
    // Récupération des données du profil utilisateur
    const profileResponse = await fetch(`/api/profile?user_id=${userId}`)
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      const profile = profileData.data || profileData
      
      // Calculer les statistiques pour les trophées
      const stats = {
        profileCompleteness: calculateProfileCompleteness(profile),
        daysSinceRegistration: profile.created_at ? 
          Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        hasAvatar: !!profile.avatar_url,
        hasBio: !!profile.bio && profile.bio.trim().length > 0,
        hasLocation: !!profile.location && profile.location.trim().length > 0,
        hasWebsite: !!profile.website && profile.website.trim().length > 0,
        hasPhone: !!profile.phone && profile.phone.trim().length > 0,
        hasDateOfBirth: !!profile.date_of_birth,
        recipesCount: 0, // Will be fetched separately if needed
        friendsCount: 0  // Will be fetched separately if needed
      }
      
      return stats
    }
    
    // Fallback values if API call fails
    return {
      profileCompleteness: 0,
      daysSinceRegistration: 0,
      hasAvatar: false,
      hasBio: false,
      hasLocation: false,
      hasWebsite: false,
      hasPhone: false,
      hasDateOfBirth: false,
      recipesCount: 0,
      friendsCount: 0
    }

  } catch (error) {
    console.error('Error in getUserStatsForTrophiesFallback:', error)
    return {
      profileCompleteness: 0,
      daysSinceRegistration: 0,
      hasAvatar: false,
      hasBio: false,
      hasLocation: false,
      hasWebsite: false,
      hasPhone: false,
      hasDateOfBirth: false,
      recipesCount: 0,
      friendsCount: 0
    }
  }
}

/**
 * Calcule le pourcentage de complétude du profil
 * @param {Object} profile - Les données du profil
 * @returns {number} Pourcentage de complétude (0-100)
 */
function calculateProfileCompleteness(profile) {
  if (!profile) return 0
  
  const fields = [
    'display_name',
    'bio',
    'avatar_url',
    'location',
    'website',
    'phone',
    'date_of_birth'
  ]
  
  const completedFields = fields.filter(field => {
    const value = profile[field]
    return value && value.toString().trim().length > 0
  })
  
  return Math.round((completedFields.length / fields.length) * 100)
}

/**
 * Récupère tous les trophées d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Trophées de l'utilisateur
 */
export async function getUserTrophies(userId) {
  try {
    const { data: userTrophies, error } = await supabase
      .from('user_trophies')
      .select('trophy_id, unlocked_at, points_earned')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      logError('Error fetching user trophies', error)
      return { unlocked: [], locked: [], totalPoints: 0 }
    }

    const unlockedTrophyIds = new Set(userTrophies?.map(t => t.trophy_id) || [])
    const unlocked = []
    const locked = []
    let totalPoints = 0

    // Organiser les trophées
    for (const [trophyId, trophy] of Object.entries(TROPHY_DEFINITIONS)) {
      if (unlockedTrophyIds.has(trophyId)) {
        const userTrophy = userTrophies.find(t => t.trophy_id === trophyId)
        unlocked.push({
          ...trophy,
          unlockedAt: userTrophy.unlocked_at,
          pointsEarned: userTrophy.points_earned
        })
        totalPoints += userTrophy.points_earned
      } else {
        locked.push(trophy)
      }
    }

    return {
      unlocked,
      locked,
      totalPoints,
      unlockedCount: unlocked.length,
      totalCount: Object.keys(TROPHY_DEFINITIONS).length
    }

  } catch (error) {
    logError('Error in getUserTrophies', error)
    return { unlocked: [], locked: [], totalPoints: 0 }
  }
}

/**
 * Calcule la progression vers le prochain trophée
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Progression vers les prochains trophées
 */
export async function getTrophyProgress(userId) {
  try {
    const userStats = await getUserStatsForTrophies(userId)
    const { unlocked } = await getUserTrophies(userId)
    const unlockedIds = new Set(unlocked.map(t => t.id))
    
    const progress = []

    for (const [trophyId, trophy] of Object.entries(TROPHY_DEFINITIONS)) {
      if (unlockedIds.has(trophyId)) continue

      let currentValue = 0
      let progressPercent = 0

      switch (trophy.condition.type) {
        case 'recipes_count':
          currentValue = userStats.recipesCount
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'friends_count':
          currentValue = userStats.friendsCount
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'profile_completeness':
          currentValue = userStats.profileCompleteness
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'days_since_registration':
          currentValue = userStats.daysSinceRegistration
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'account_created':
          progressPercent = 100 // Should be unlocked immediately
          break
      }

      if (progressPercent > 0) {
        progress.push({
          ...trophy,
          currentValue,
          targetValue: trophy.condition.value,
          progressPercent: Math.round(progressPercent)
        })
      }
    }

    // Trier par progression descendante
    progress.sort((a, b) => b.progressPercent - a.progressPercent)

    return progress.slice(0, 5) // Retourner les 5 prochains trophées

  } catch (error) {
    logError('Error calculating trophy progress', error)
    return []
  }
}

/**
 * Fonction à appeler après certaines actions pour vérifier les nouveaux trophées
 * @param {string} userId - ID de l'utilisateur
 * @param {string} action - Action qui vient d'être effectuée
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
export async function triggerTrophyCheck(userId, action) {
  try {
    logInfo('Trophy check triggered', { 
      userId: userId?.substring(0, 8) + '...',
      action 
    })

    const newTrophies = await checkAndUnlockTrophies(userId)
    
    if (newTrophies.length > 0) {
      logInfo('New trophies unlocked', { 
        userId: userId?.substring(0, 8) + '...',
        trophies: newTrophies.map(t => t.id)
      })
    }

    return newTrophies

  } catch (error) {
    logError('Error in triggerTrophyCheck', error)
    return []
  }
}

/**
 * Vérifie spécifiquement les trophées après mise à jour du profil
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
export async function checkTrophiesAfterProfileUpdate(userId) {
  try {
    logInfo('Checking trophies after profile update', { 
      userId: userId?.substring(0, 8) + '...'
    })

    // Spécifiquement vérifier le trophée de profil complet
    const newTrophies = await checkAndUnlockTrophies(userId)
    
    // Filtrer pour ne garder que les trophées liés au profil
    const profileTrophies = newTrophies.filter(trophy => 
      trophy.category === 'engagement' || trophy.id === 'profile_complete'
    )

    if (profileTrophies.length > 0) {
      logInfo('Profile-related trophies unlocked', { 
        userId: userId?.substring(0, 8) + '...',
        trophies: profileTrophies.map(t => t.id)
      })
    }

    return newTrophies

  } catch (error) {
    logError('Error checking trophies after profile update', error)
    return []
  }
}

/**
 * Obtient les statistiques de trophées pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques des trophées
 */
export async function getTrophyStats(userId) {
  try {
    const { data: userTrophies, error } = await supabase
      .from('user_trophies')
      .select('trophy_id, points_earned, unlocked_at')
      .eq('user_id', userId)

    if (error) {
      logError('Error fetching trophy stats', error)
      return { totalPoints: 0, trophiesUnlocked: 0, latestTrophy: null }
    }

    const totalPoints = userTrophies?.reduce((sum, trophy) => sum + (trophy.points_earned || 0), 0) || 0
    const trophiesUnlocked = userTrophies?.length || 0
    const latestTrophy = userTrophies?.sort((a, b) => 
      new Date(b.unlocked_at) - new Date(a.unlocked_at)
    )[0] || null

    return {
      totalPoints,
      trophiesUnlocked,
      latestTrophy: latestTrophy ? {
        ...TROPHY_DEFINITIONS[latestTrophy.trophy_id],
        unlockedAt: latestTrophy.unlocked_at,
        pointsEarned: latestTrophy.points_earned
      } : null
    }

  } catch (error) {
    logError('Error in getTrophyStats', error)
    return { totalPoints: 0, trophiesUnlocked: 0, latestTrophy: null }
  }
}

/**
 * Synchronise automatiquement les trophées après une action spécifique
 * @param {string} userId - ID de l'utilisateur
 * @param {string} actionType - Type d'action effectuée
 * @param {Object} actionData - Données additionnelles de l'action
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
export async function syncTrophiesAfterAction(userId, actionType, actionData = {}) {
  try {
    logInfo('Syncing trophies after action', { 
      userId: userId?.substring(0, 8) + '...',
      actionType,
      actionData
    })

    let newTrophies = []

    switch (actionType) {
      case 'recipe_created':
        newTrophies = await checkRecipeTrophies(userId)
        break
      case 'friend_added':
        newTrophies = await checkSocialTrophies(userId)
        break
      case 'profile_updated':
        newTrophies = await checkEngagementTrophies(userId)
        break
      case 'account_created':
        newTrophies = await checkWelcomeTrophies(userId)
        break
      default:
        newTrophies = await checkAndUnlockTrophies(userId)
        break
    }

    if (newTrophies.length > 0) {
      // Déclencher une notification en temps réel (uniquement côté client)
      if (typeof window !== 'undefined') {
        try {
          const { showTrophyNotification } = await import('./notificationUtils')
          
          // Afficher une notification pour chaque nouveau trophée
          for (const trophy of newTrophies) {
            await showTrophyNotification(trophy)
          }
        } catch (error) {
          logError('Failed to show trophy notification', error)
        }
      }
      
      // Événement personnalisé pour les composants
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trophiesUnlocked', {
          detail: { userId, trophies: newTrophies, actionType }
        }))
      }
    }

    return newTrophies

  } catch (error) {
    logError('Error syncing trophies after action', error)
    return []
  }
}

/**
 * Vérifie spécifiquement les trophées liés aux recettes
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
async function checkRecipeTrophies(userId) {
  try {
    const userStats = await getUserStatsForTrophies(userId)
    const { data: unlockedTrophies } = await supabase
      .from('user_trophies')
      .select('trophy_id')
      .eq('user_id', userId)

    const unlockedIds = new Set(unlockedTrophies?.map(t => t.trophy_id) || [])
    const newlyUnlocked = []

    // Vérifier les trophées de recettes
    const recipeTrophies = ['first_recipe', 'recipe_collector', 'master_chef']
    
    for (const trophyId of recipeTrophies) {
      if (unlockedIds.has(trophyId)) continue
      
      const trophy = TROPHY_DEFINITIONS[trophyId]
      if (trophy && checkTrophyCondition(trophy.condition, userStats)) {
        const success = await unlockTrophy(userId, trophyId)
        if (success) {
          newlyUnlocked.push({
            ...trophy,
            unlockedAt: new Date().toISOString()
          })
        }
      }
    }

    return newlyUnlocked
  } catch (error) {
    logError('Error checking recipe trophies', error)
    return []
  }
}

/**
 * Vérifie spécifiquement les trophées sociaux
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
async function checkSocialTrophies(userId) {
  try {
    const userStats = await getUserStatsForTrophies(userId)
    const { data: unlockedTrophies } = await supabase
      .from('user_trophies')
      .select('trophy_id')
      .eq('user_id', userId)

    const unlockedIds = new Set(unlockedTrophies?.map(t => t.trophy_id) || [])
    const newlyUnlocked = []

    // Vérifier les trophées sociaux
    const socialTrophies = ['first_friend', 'social_butterfly']
    
    for (const trophyId of socialTrophies) {
      if (unlockedIds.has(trophyId)) continue
      
      const trophy = TROPHY_DEFINITIONS[trophyId]
      if (trophy && checkTrophyCondition(trophy.condition, userStats)) {
        const success = await unlockTrophy(userId, trophyId)
        if (success) {
          newlyUnlocked.push({
            ...trophy,
            unlockedAt: new Date().toISOString()
          })
        }
      }
    }

    return newlyUnlocked
  } catch (error) {
    logError('Error checking social trophies', error)
    return []
  }
}

/**
 * Vérifie spécifiquement les trophées d'engagement
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
async function checkEngagementTrophies(userId) {
  try {
    const userStats = await getUserStatsForTrophies(userId)
    const { data: unlockedTrophies } = await supabase
      .from('user_trophies')
      .select('trophy_id')
      .eq('user_id', userId)

    const unlockedIds = new Set(unlockedTrophies?.map(t => t.trophy_id) || [])
    const newlyUnlocked = []

    // Vérifier les trophées d'engagement
    const engagementTrophies = ['profile_complete', 'early_adopter']
    
    for (const trophyId of engagementTrophies) {
      if (unlockedIds.has(trophyId)) continue
      
      const trophy = TROPHY_DEFINITIONS[trophyId]
      if (trophy && checkTrophyCondition(trophy.condition, userStats)) {
        const success = await unlockTrophy(userId, trophyId)
        if (success) {
          newlyUnlocked.push({
            ...trophy,
            unlockedAt: new Date().toISOString()
          })
        }
      }
    }

    return newlyUnlocked
  } catch (error) {
    logError('Error checking engagement trophies', error)
    return []
  }
}

/**
 * Vérifie les trophées de bienvenue
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Nouveaux trophées débloqués
 */
async function checkWelcomeTrophies(userId) {
  try {
    const { data: unlockedTrophies } = await supabase
      .from('user_trophies')
      .select('trophy_id')
      .eq('user_id', userId)

    const unlockedIds = new Set(unlockedTrophies?.map(t => t.trophy_id) || [])
    const newlyUnlocked = []

    // Débloquer automatiquement le trophée de bienvenue
    if (!unlockedIds.has('welcome_aboard')) {
      const success = await unlockTrophy(userId, 'welcome_aboard')
      if (success) {
        newlyUnlocked.push({
          ...TROPHY_DEFINITIONS['welcome_aboard'],
          unlockedAt: new Date().toISOString()
        })
      }
    }

    return newlyUnlocked
  } catch (error) {
    logError('Error checking welcome trophies', error)
    return []
  }
}

/**
 * Notifie l'utilisateur des nouveaux trophées débloqués
 * @param {string} userId - ID de l'utilisateur
 * @param {Array} newTrophies - Nouveaux trophées débloqués
 * @returns {Promise<void>}
 */
async function notifyTrophyUnlocked(userId, newTrophies) {
  try {
    // Utiliser le nouveau système de notifications
    const { notificationManager, NOTIFICATION_TYPES } = await import('./notificationUtils')
    
    for (const trophy of newTrophies) {
      await notificationManager.show(
        NOTIFICATION_TYPES.TROPHY,
        `🏆 Nouveau trophée débloqué !`,
        {
          body: `${trophy.name}: ${trophy.description}`,
          icon: '/icons/trophy.png',
          duration: 8000,
          data: { trophyId: trophy.id, userId }
        }
      )
    }

    // Ancien système pour compatibilité
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('trophyUnlocked', {
        detail: { userId, trophies: newTrophies }
      })
      window.dispatchEvent(event)
    }

    logInfo('Trophy notification sent', {
      userId: userId?.substring(0, 8) + '...',
      trophiesCount: newTrophies.length
    })

  } catch (error) {
    logError('Error sending trophy notification', error)
  }
}

/**
 * Obtient la progression en temps réel d'un trophée spécifique
 * @param {string} userId - ID de l'utilisateur
 * @param {string} trophyId - ID du trophée
 * @returns {Promise<Object>} Progression du trophée
 */
export async function getTrophyProgressRealtime(userId, trophyId) {
  try {
    const trophy = TROPHY_DEFINITIONS[trophyId]
    if (!trophy) return null

    const userStats = await getUserStatsForTrophies(userId)
    
    let currentValue = 0
    let progressPercent = 0

    switch (trophy.condition.type) {
      case 'recipes_count':
        currentValue = userStats.recipesCount
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'friends_count':
        currentValue = userStats.friendsCount
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'profile_completeness':
        currentValue = userStats.profileCompleteness
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'days_since_registration':
        currentValue = userStats.daysSinceRegistration
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'account_created':
        progressPercent = 100
        break
    }

    return {
      ...trophy,
      currentValue,
      targetValue: trophy.condition.value,
      progressPercent: Math.round(progressPercent),
      isCompleted: progressPercent >= 100
    }

  } catch (error) {
    logError('Error getting realtime trophy progress', error)
    return null
  }
}

/**
 * Synchronise tous les trophées d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{newTrophies: Array, updatedProgress: Array}>}
 */
export async function syncAllTrophies(userId) {
  try {
    logInfo('Starting full trophy sync', { 
      userId: userId?.substring(0, 8) + '...' 
    })

    // Vérifier tous les nouveaux trophées
    const newTrophies = await checkAndUnlockTrophies(userId)
    
    // Obtenir la progression mise à jour
    const updatedProgress = await getTrophyProgress(userId)

    logInfo('Full trophy sync completed', {
      userId: userId?.substring(0, 8) + '...',
      newTrophiesCount: newTrophies.length,
      progressItemsCount: updatedProgress.length
    })

    return {
      newTrophies,
      updatedProgress
    }

  } catch (error) {
    logError('Error in full trophy sync', error)
    return {
      newTrophies: [],
      updatedProgress: []
    }
  }
}

/**
 * Débloque manuellement un trophée pour un utilisateur si les conditions sont remplies
 * @param {string} userId - ID de l'utilisateur
 * @param {string} trophyId - ID du trophée à débloquer
 * @returns {Promise<{success: boolean, trophy?: Object, error?: string}>}
 */
export async function manuallyUnlockTrophy(userId, trophyId) {
  try {
    logInfo('Manual trophy unlock requested', { 
      userId: userId?.substring(0, 8) + '...',
      trophyId
    })

    // Vérifier que le trophée existe
    const trophy = TROPHY_DEFINITIONS[trophyId]
    if (!trophy) {
      return { success: false, error: 'Trophée non trouvé' }
    }

    // Vérifier que le trophée n'est pas déjà débloqué
    const { data: existingTrophy, error: checkError } = await supabase
      .from('user_trophies')
      .select('id')
      .eq('user_id', userId)
      .eq('trophy_id', trophyId)
      .maybeSingle() // Use maybeSingle() instead of single() to handle no results gracefully

    if (checkError) {
      logError('Error checking existing trophy', checkError)
      return { success: false, error: 'Erreur lors de la vérification du trophée' }
    }

    if (existingTrophy) {
      return { success: false, error: 'Trophée déjà débloqué' }
    }

    // Vérifier que les conditions sont remplies
    const userStats = await getUserStatsForTrophies(userId)
    const isConditionMet = checkTrophyCondition(trophy.condition, userStats)

    if (!isConditionMet) {
      return { success: false, error: 'Conditions non remplies pour ce trophée' }
    }

    // Débloquer le trophée
    const unlockSuccess = await unlockTrophy(userId, trophyId)
    if (!unlockSuccess) {
      return { success: false, error: 'Erreur lors du déblocage du trophée' }
    }

    logInfo('Trophy manually unlocked successfully', {
      userId: userId?.substring(0, 8) + '...',
      trophyId,
      points: trophy.points
    })

    return {
      success: true,
      trophy: {
        ...trophy,
        unlockedAt: new Date().toISOString(),
        pointsEarned: trophy.points
      }
    }

  } catch (error) {
    logError('Error in manuallyUnlockTrophy', error)
    return { success: false, error: 'Erreur serveur lors du déblocage' }
  }
}

/**
 * Vérifie si un trophée peut être débloqué manuellement
 * @param {string} userId - ID de l'utilisateur
 * @param {string} trophyId - ID du trophée
 * @returns {Promise<{canUnlock: boolean, progress: number, reason?: string}>}
 */
export async function canManuallyUnlockTrophy(userId, trophyId) {
  try {
    const trophy = TROPHY_DEFINITIONS[trophyId]
    if (!trophy) {
      return { canUnlock: false, progress: 0, reason: 'Trophée introuvable' }
    }

    // Vérifier si déjà débloqué
    const { data: existingTrophy } = await supabase
      .from('user_trophies')
      .select('id')
      .eq('user_id', userId)
      .eq('trophy_id', trophyId)
      .maybeSingle() // Use maybeSingle() instead of single()

    if (existingTrophy) {
      return { canUnlock: false, progress: 100, reason: 'Déjà débloqué' }
    }

    // Calculer la progression
    const userStats = await getUserStatsForTrophies(userId)
    let currentValue = 0
    let progressPercent = 0

    switch (trophy.condition.type) {
      case 'recipes_count':
        currentValue = userStats.recipesCount
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'friends_count':
        currentValue = userStats.friendsCount
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'profile_completeness':
        currentValue = userStats.profileCompleteness
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'days_since_registration':
        currentValue = userStats.daysSinceRegistration
        progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
        break
      case 'account_created':
        progressPercent = 100
        break
    }

    const canUnlock = progressPercent >= 100
    
    return {
      canUnlock,
      progress: Math.round(progressPercent),
      reason: canUnlock ? 'Prêt à débloquer' : 'Progression incomplète'
    }

  } catch (error) {
    logError('Error checking if trophy can be unlocked', error)
    return { canUnlock: false, progress: 0, reason: 'Erreur lors de la vérification' }
  }
}
