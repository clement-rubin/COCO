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
    // Récupérer les statistiques de base
    const statsResponse = await fetch(`/api/user-stats?user_id=${userId}`)
    const stats = statsResponse.ok ? await statsResponse.json() : {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0
    }

    // Calculer les jours depuis l'inscription
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    const registrationDate = authUser?.user?.created_at ? new Date(authUser.user.created_at) : new Date()
    const daysSinceRegistration = Math.floor((Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      ...stats,
      daysSinceRegistration
    }

  } catch (error) {
    logError('Error getting user stats for trophies', error)
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0,
      daysSinceRegistration: 0
    }
  }
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
