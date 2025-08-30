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
  recipe_master: {
    id: 'recipe_master',
    name: 'Maître Cuistot',
    description: 'Créer 25 recettes',
    icon: '🍳',
    category: 'creation',
    rarity: 'rare',
    condition: { type: 'recipes_count', value: 25 },
    points: 500
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
  culinary_legend: {
    id: 'culinary_legend',
    name: 'Légende Culinaire',
    description: 'Créer 100 recettes',
    icon: '⭐',
    category: 'creation',
    rarity: 'mythic',
    condition: { type: 'recipes_count', value: 100 },
    points: 2500
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
  community_leader: {
    id: 'community_leader',
    name: 'Leader Communautaire',
    description: 'Avoir 100 amis actifs',
    icon: '👑',
    category: 'social',
    rarity: 'mythic',
    condition: { type: 'friends_count', value: 100 },
    points: 2000
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
  veteran: {
    id: 'veteran',
    name: 'Vétéran',
    description: 'Membre actif depuis 6 mois',
    icon: '🏅',
    category: 'engagement',
    rarity: 'epic',
    condition: { type: 'days_since_registration', value: 180 },
    points: 750
  },
  
  // Nouveaux trophées de qualité
  quality_chef: {
    id: 'quality_chef',
    name: 'Chef de Qualité',
    description: 'Recevoir 100 likes au total',
    icon: '❤️',
    category: 'quality',
    rarity: 'rare',
    condition: { type: 'likes_received', value: 100 },
    points: 400
  },
  popular_creator: {
    id: 'popular_creator',
    name: 'Créateur Populaire',
    description: 'Recevoir 500 likes au total',
    icon: '🔥',
    category: 'quality',
    rarity: 'epic',
    condition: { type: 'likes_received', value: 500 },
    points: 1000
  },
  viral_chef: {
    id: 'viral_chef',
    name: 'Chef Viral',
    description: 'Recevoir 1000 likes au total',
    icon: '💎',
    category: 'quality',
    rarity: 'legendary',
    condition: { type: 'likes_received', value: 1000 },
    points: 2000
  },

  // Trophées de constance
  streak_warrior: {
    id: 'streak_warrior',
    name: 'Guerrier de la Série',
    description: 'Maintenir une série de 7 jours',
    icon: '🔥',
    category: 'consistency',
    rarity: 'uncommon',
    condition: { type: 'max_streak', value: 7 },
    points: 200
  },
  streak_legend: {
    id: 'streak_legend',
    name: 'Légende de la Constance',
    description: 'Maintenir une série de 30 jours',
    icon: '⚡',
    category: 'consistency',
    rarity: 'epic',
    condition: { type: 'max_streak', value: 30 },
    points: 800
  },
  streak_immortal: {
    id: 'streak_immortal',
    name: 'Immortel de la Série',
    description: 'Maintenir une série de 100 jours',
    icon: '🌟',
    category: 'consistency',
    rarity: 'mythic',
    condition: { type: 'max_streak', value: 100 },
    points: 3000
  },

  // Trophées spéciaux et saisonniers
  welcome_aboard: {
    id: 'welcome_aboard',
    name: 'Bienvenue!',
    description: 'Créer votre compte COCO',
    icon: '🎉',
    category: 'special',
    rarity: 'common',
    condition: { type: 'account_created', value: true },
    points: 10
  },
  seasonal_spring: {
    id: 'seasonal_spring',
    name: 'Chef de Printemps',
    description: 'Créer 5 recettes en mars-mai',
    icon: '🌸',
    category: 'seasonal',
    rarity: 'rare',
    condition: { type: 'seasonal_recipes', value: 5, season: 'spring' },
    points: 300
  },
  quiz_master: {
    id: 'quiz_master',
    name: 'Maître du Quiz',
    description: 'Réussir 10 quiz consécutifs',
    icon: '🧠',
    category: 'knowledge',
    rarity: 'epic',
    condition: { type: 'quiz_streak', value: 10 },
    points: 600
  }
};

// Couleurs par rareté améliorées
export const TROPHY_RARITIES = {
  common: {
    name: 'Commun',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #6b7280, #4b5563)',
    glow: 'rgba(107, 114, 128, 0.3)',
    bgColor: '#f9fafb'
  },
  uncommon: {
    name: 'Peu commun',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16, 185, 129, 0.4)',
    bgColor: '#ecfdf5'
  },
  rare: {
    name: 'Rare',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    glow: 'rgba(59, 130, 246, 0.4)',
    bgColor: '#eff6ff'
  },
  epic: {
    name: 'Épique',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glow: 'rgba(139, 92, 246, 0.4)',
    bgColor: '#f5f3ff'
  },
  legendary: {
    name: 'Légendaire',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245, 158, 11, 0.5)',
    bgColor: '#fffbeb'
  },
  mythic: {
    name: 'Mythique',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    glow: 'rgba(239, 68, 68, 0.6)',
    bgColor: '#fef2f2'
  }
}

// Nouvelles missions quotidiennes et hebdomadaires
export const DAILY_MISSIONS = [
  {
    id: 'daily_recipe',
    title: 'Créateur du Jour',
    description: 'Créer une nouvelle recette',
    icon: '🍽️',
    reward: { xp: 50, coins: 30 },
    type: 'daily'
  },
  {
    id: 'daily_like',
    title: 'Supporter',
    description: 'Liker 5 recettes d\'amis',
    icon: '❤️',
    reward: { xp: 25, coins: 15 },
    type: 'daily'
  },
  {
    id: 'daily_comment',
    title: 'Commentateur',
    description: 'Commenter 3 recettes',
    icon: '💬',
    reward: { xp: 20, coins: 10 },
    type: 'daily'
  },
  {
    id: 'daily_quiz',
    title: 'Quiz du Jour',
    description: 'Réussir le quiz quotidien',
    icon: '🧠',
    reward: { xp: 40, coins: 25 },
    type: 'daily'
  }
]

export const WEEKLY_MISSIONS = [
  {
    id: 'weekly_explorer',
    title: 'Explorateur Culinaire',
    description: 'Créer 5 recettes cette semaine',
    icon: '🗺️',
    reward: { xp: 200, coins: 100, badge: 'explorer_week' },
    type: 'weekly'
  },
  {
    id: 'weekly_social',
    title: 'Socialite',
    description: 'Interagir avec 10 amis différents',
    icon: '🤝',
    reward: { xp: 150, coins: 75 },
    type: 'weekly'
  },
  {
    id: 'weekly_perfectionist',
    title: 'Perfectionniste',
    description: 'Créer 3 recettes avec 5+ likes chacune',
    icon: '⭐',
    reward: { xp: 300, coins: 150, badge: 'perfectionist' },
    type: 'weekly'
  }
]

// Système de niveaux amélioré
export const ENHANCED_LEVELS = [
  { level: 1, xp: 0, label: "Débutant", color: "#a7f3d0", reward: { coins: 50, badge: 'beginner' } },
  { level: 2, xp: 100, label: "Apprenti", color: "#6ee7b7", reward: { coins: 75, item: 'hat_apprentice' } },
  { level: 3, xp: 300, label: "Cuisinier", color: "#34d399", reward: { coins: 100, badge: 'cook' } },
  { level: 4, xp: 700, label: "Chef", color: "#10b981", reward: { coins: 150, item: 'apron_chef' } },
  { level: 5, xp: 1500, label: "Maître Chef", color: "#059669", reward: { coins: 200, badge: 'master_chef' } },
  { level: 6, xp: 3000, label: "Grand Chef", color: "#047857", reward: { coins: 300, item: 'crown_gold' } },
  { level: 7, xp: 5000, label: "Chef Étoilé", color: "#2563eb", reward: { coins: 400, badge: 'starred_chef' } },
  { level: 8, xp: 8000, label: "Chef Légendaire", color: "#1d4ed8", reward: { coins: 500, item: 'aura_legendary' } },
  { level: 9, xp: 12000, label: "Maître Culinaire", color: "#8b5cf6", reward: { coins: 750, badge: 'culinary_master' } },
  { level: 10, xp: 20000, label: "Légende", color: "#f59e0b", reward: { coins: 1000, item: 'throne_legend', badge: 'legend' } }
]

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
    case 'friends_count':
      return userStats.friendsCount >= condition.value
    case 'recipes_count':
      return userStats.recipesCount >= condition.value
    case 'profile_completeness':
      return userStats.profileCompleteness >= condition.value
    case 'days_since_registration':
      return userStats.daysSinceRegistration >= condition.value
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
    console.error('Error getting user stats for trophies', error)
    return await getUserStatsForTrophiesFallback(userId)
  }
}

// Assurons-nous que la fonction fallback existe et fonctionne correctement
async function getUserStatsForTrophiesFallback(userId) {
  // Implémentation simplifiée pour récupérer les statistiques directement
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, avatar_url, location, website, created_at')
      .eq('user_id', userId)
      .single();
      
    const { data: friendships } = await supabase
      .from('friendships')
      .select('status')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');
      
    // CORRECTION: Utiliser safeCountQuery au lieu de count avec head
    const { safeCountQuery } = await import('./supabaseUtils')
    const recipesCount = await safeCountQuery('recipes', { user_id: userId })

    // Calculer la complétude du profil
    let profileCompleteness = 0;
    if (profile) {
      const fields = ['display_name', 'bio', 'avatar_url', 'location', 'website'];
      const filledFields = fields.filter(field => profile[field] && profile[field].trim());
      profileCompleteness = Math.round((filledFields.length / fields.length) * 100);
    }
    
    // Calculer les jours depuis l'inscription
    const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
    const daysSinceRegistration = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      recipesCount: recipesCount || 0,
      friendsCount: friendships?.length || 0,
      profileCompleteness: profileCompleteness,
      daysSinceRegistration: daysSinceRegistration
    };
  } catch (error) {
    console.error('Error in stats fallback', error);
    return {
      recipesCount: 0,
      friendsCount: 0,
      profileCompleteness: 0,
      daysSinceRegistration: 0
    };
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

/**
 * Calcule les statistiques de progression avancées
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques avancées
 */
export async function getAdvancedProgressStats(userId) {
  try {
    const userStats = await getUserStatsForTrophies(userId)
    const { unlocked, totalPoints } = await getUserTrophies(userId)
    
    // Calcul du niveau actuel avec le nouveau système
    const currentLevel = ENHANCED_LEVELS.find((level, index) => {
      const nextLevel = ENHANCED_LEVELS[index + 1]
      return !nextLevel || userStats.totalXP < nextLevel.xp
    }) || ENHANCED_LEVELS[ENHANCED_LEVELS.length - 1]
    
    // Progression par catégorie
    const progressByCategory = {}
    Object.values(TROPHY_DEFINITIONS).forEach(trophy => {
      if (!progressByCategory[trophy.category]) {
        progressByCategory[trophy.category] = {
          total: 0,
          unlocked: 0,
          points: 0
        }
      }
      progressByCategory[trophy.category].total++
      if (unlocked.some(t => t.id === trophy.id)) {
        progressByCategory[trophy.category].unlocked++
        progressByCategory[trophy.category].points += trophy.points
      }
    })

    // Streak et constance
    const streakStats = {
      current: userStats.streak || 0,
      maxEver: userStats.maxStreak || 0,
      streakBreaks: userStats.streakBreaks || 0,
      perfectDays: userStats.perfectDays || 0
    }

    // Tendances et prédictions
    const weeklyGrowth = calculateWeeklyGrowth(userStats)
    const projectedLevel = predictNextLevel(userStats, weeklyGrowth)

    return {
      currentLevel,
      totalXP: userStats.totalXP || 0,
      totalPoints,
      progressByCategory,
      streakStats,
      weeklyGrowth,
      projectedLevel,
      efficiency: calculateEfficiency(userStats),
      socialScore: calculateSocialScore(userStats),
      qualityScore: calculateQualityScore(userStats)
    }

  } catch (error) {
    logError('Error calculating advanced progress stats', error)
    return null
  }
}

/**
 * Calcule l'efficacité de l'utilisateur
 */
function calculateEfficiency(stats) {
  const recipesPerDay = stats.recipesCount / Math.max(stats.daysSinceRegistration, 1)
  const likesPerRecipe = stats.likesReceived / Math.max(stats.recipesCount, 1)
  const friendsPerDay = stats.friendsCount / Math.max(stats.daysSinceRegistration, 1)
  
  return {
    recipesPerDay: Math.round(recipesPerDay * 100) / 100,
    likesPerRecipe: Math.round(likesPerRecipe * 10) / 10,
    friendsPerDay: Math.round(friendsPerDay * 100) / 100,
    overallScore: Math.min(100, Math.round((recipesPerDay * 30 + likesPerRecipe * 5 + friendsPerDay * 20)))
  }
}

/**
 * Calcule le score social
 */
function calculateSocialScore(stats) {
  const baseScore = stats.friendsCount * 2
  const engagementBonus = (stats.likesReceived + stats.commentsReceived) * 0.5
  const communityBonus = stats.recipesShared * 1.5
  
  return Math.min(100, Math.round(baseScore + engagementBonus + communityBonus))
}

/**
 * Calcule le score de qualité
 */
function calculateQualityScore(stats) {
  if (stats.recipesCount === 0) return 0
  
  const likesRatio = stats.likesReceived / stats.recipesCount
  const commentsRatio = stats.commentsReceived / stats.recipesCount
  const completionRate = stats.profileCompleteness / 100
  
  return Math.min(100, Math.round((likesRatio * 30 + commentsRatio * 20 + completionRate * 50)))
}

/**
 * Calcule la croissance hebdomadaire
 */
function calculateWeeklyGrowth(stats) {
  // Simulation basée sur l'activité récente
  const weeksSinceRegistration = Math.max(1, stats.daysSinceRegistration / 7)
  const avgRecipesPerWeek = stats.recipesCount / weeksSinceRegistration
  const avgXPPerWeek = (stats.totalXP || 0) / weeksSinceRegistration
  
  return {
    recipes: Math.round(avgRecipesPerWeek * 10) / 10,
    xp: Math.round(avgXPPerWeek),
    trend: avgRecipesPerWeek > 1 ? 'up' : avgRecipesPerWeek > 0.5 ? 'stable' : 'down'
  }
}

/**
 * Prédit le prochain niveau
 */
function predictNextLevel(stats, growth) {
  const currentXP = stats.totalXP || 0
  const weeklyXP = growth.xp || 10
  
  const nextLevel = ENHANCED_LEVELS.find(level => level.xp > currentXP)
  if (!nextLevel) return null
  
  const xpNeeded = nextLevel.xp - currentXP
  const weeksToNext = Math.ceil(xpNeeded / Math.max(weeklyXP, 1))
  
  return {
    level: nextLevel,
    xpNeeded,
    weeksToNext,
    estimatedDate: new Date(Date.now() + weeksToNext * 7 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Vérifie et débloquer les nouvelles missions
 * @param {string} userId - ID de l'utilisateur
 * @param {string} actionType - Type d'action effectuée
 * @returns {Promise<Array>} Missions complétées
 */
export async function checkMissionProgress(userId, actionType) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const thisWeek = getWeekStart(new Date()).toISOString().slice(0, 10)
    
    // Récupérer les missions en cours
    const { data: userMissions } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .or(`date.eq.${today},week_start.eq.${thisWeek}`)
    
    const completedMissions = []
    const userStats = await getUserStatsForTrophies(userId)
    
    // Vérifier les missions quotidiennes
    for (const mission of DAILY_MISSIONS) {
      const existingMission = userMissions?.find(m => m.mission_id === mission.id && m.date === today)
      
      if (!existingMission?.completed && shouldCompleteMission(mission, actionType, userStats, today)) {
        await completeMission(userId, mission, 'daily', today)
        completedMissions.push({ ...mission, type: 'daily' })
      }
    }
    
    // Vérifier les missions hebdomadaires
    for (const mission of WEEKLY_MISSIONS) {
      const existingMission = userMissions?.find(m => m.mission_id === mission.id && m.week_start === thisWeek)
      
      if (!existingMission?.completed && shouldCompleteMission(mission, actionType, userStats, thisWeek, 'weekly')) {
        await completeMission(userId, mission, 'weekly', null, thisWeek)
        completedMissions.push({ ...mission, type: 'weekly' })
      }
    }
    
    return completedMissions
    
  } catch (error) {
    logError('Error checking mission progress', error)
    return []
  }
}

/**
 * Vérifie si une mission doit être complétée
 */
function shouldCompleteMission(mission, actionType, userStats, period, type = 'daily') {
  // Logique simplifiée - à améliorer selon les besoins spécifiques
  switch (mission.id) {
    case 'daily_recipe':
      return actionType === 'recipe_created'
    case 'daily_quiz':
      return actionType === 'quiz_completed'
    case 'weekly_explorer':
      return type === 'weekly' && userStats.weeklyRecipes >= 5
    default:
      return false
  }
}

/**
 * Complete une mission et accorde les récompenses
 */
async function completeMission(userId, mission, type, date = null, weekStart = null) {
  try {
    // Enregistrer la mission complétée
    const { error: missionError } = await supabase
      .from('user_missions')
      .upsert({
        user_id: userId,
        mission_id: mission.id,
        completed: true,
        completed_at: new Date().toISOString(),
        date: date,
        week_start: weekStart,
        type: type
      })
    
    if (missionError) throw missionError
    
    // Accorder les récompenses
    if (mission.reward) {
      await grantMissionRewards(userId, mission.reward)
    }
    
    logInfo('Mission completed', {
      userId: userId?.substring(0, 8) + '...',
      missionId: mission.id,
      type,
      reward: mission.reward
    })
    
  } catch (error) {
    logError('Error completing mission', error)
  }
}

/**
 * Accorde les récompenses d'une mission
 */
async function grantMissionRewards(userId, reward) {
  try {
    const updates = {}
    
    if (reward.coins) updates.coins_increment = reward.coins
    if (reward.xp) updates.xp_increment = reward.xp
    
    if (Object.keys(updates).length > 0) {
      // Mise à jour des récompenses dans user_pass
      const { error } = await supabase.rpc('increment_user_rewards', {
        user_id: userId,
        coins_amount: reward.coins || 0,
        xp_amount: reward.xp || 0
      })
      
      if (error) throw error
    }
    
    // Débloquer badge ou item si applicable
    if (reward.badge || reward.item) {
      await unlockSpecialReward(userId, reward.badge, reward.item)
    }
    
  } catch (error) {
    logError('Error granting mission rewards', error)
  }
}

/**
 * Helper pour obtenir le début de la semaine
 */
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lundi comme premier jour
  return new Date(d.setDate(diff))
}
