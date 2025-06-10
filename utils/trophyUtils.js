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
    points: 50,
    immersiveMessage: '🎉 Félicitations Chef ! Votre aventure culinaire commence maintenant !'
  },
  recipe_collector: {
    id: 'recipe_collector',
    name: 'Collectionneur',
    description: 'Créer 10 recettes',
    icon: '📚',
    category: 'creation',
    rarity: 'uncommon',
    condition: { type: 'recipes_count', value: 10 },
    points: 200,
    immersiveMessage: '📚 Votre livre de recettes se remplit ! Continuez cette belle collection !'
  },
  master_chef: {
    id: 'master_chef',
    name: 'Chef Étoilé',
    description: 'Créer 50 recettes',
    icon: '👨‍🍳',
    category: 'creation',
    rarity: 'legendary',
    condition: { type: 'recipes_count', value: 50 },
    points: 1000,
    immersiveMessage: '⭐ Incroyable ! Vous êtes maintenant un véritable Chef Étoilé !'
  },

  // Nouveaux trophées de streaks
  streak_7_days: {
    id: 'streak_7_days',
    name: 'Cuisinier Régulier',
    description: 'Se connecter 7 jours consécutifs',
    icon: '🔥',
    category: 'engagement',
    rarity: 'uncommon',
    condition: { type: 'daily_streak', value: 7 },
    points: 150,
    immersiveMessage: '🔥 Vous êtes en feu ! 7 jours de passion culinaire !'
  },
  streak_30_days: {
    id: 'streak_30_days',
    name: 'Passionné Dévoué',
    description: 'Se connecter 30 jours consécutifs',
    icon: '🌟',
    category: 'engagement',
    rarity: 'rare',
    condition: { type: 'daily_streak', value: 30 },
    points: 500,
    immersiveMessage: '🌟 Un mois entier de dévotion ! Votre passion inspire la communauté !'
  },
  streak_100_days: {
    id: 'streak_100_days',
    name: 'Légende Culinaire',
    description: 'Se connecter 100 jours consécutifs',
    icon: '👑',
    category: 'engagement',
    rarity: 'legendary',
    condition: { type: 'daily_streak', value: 100 },
    points: 2000,
    immersiveMessage: '👑 LÉGENDAIRE ! 100 jours de pure excellence culinaire !'
  },

  // Trophées d'interaction
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Papillon Social',
    description: 'Avoir 25 amis',
    icon: '🦋',
    category: 'social',
    rarity: 'rare',
    condition: { type: 'friends_count', value: 25 },
    points: 500,
    immersiveMessage: '🦋 Votre charisme attire les chefs du monde entier !'
  },
  interaction_master: {
    id: 'interaction_master',
    name: 'Maître des Interactions',
    description: 'Liker 100 recettes',
    icon: '❤️',
    category: 'social',
    rarity: 'rare',
    condition: { type: 'likes_given', value: 100 },
    points: 400,
    immersiveMessage: '❤️ Votre générosité illumine la communauté COCO !'
  },
  comment_enthusiast: {
    id: 'comment_enthusiast',
    name: 'Commentateur Passionné',
    description: 'Commenter 50 recettes',
    icon: '💬',
    category: 'social',
    rarity: 'uncommon',
    condition: { type: 'comments_given', value: 50 },
    points: 300,
    immersiveMessage: '💬 Vos conseils enrichissent l\'expérience de tous !'
  },

  // Trophées de perfectionnisme
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionniste',
    description: 'Avoir 5 recettes avec une note parfaite',
    icon: '⭐',
    category: 'quality',
    rarity: 'epic',
    condition: { type: 'perfect_recipes', value: 5 },
    points: 800,
    immersiveMessage: '⭐ La perfection n\'est plus un rêve, c\'est votre réalité !'
  },
  speed_chef: {
    id: 'speed_chef',
    name: 'Chef Éclair',
    description: 'Créer 5 recettes en moins de 15 minutes',
    icon: '⚡',
    category: 'speed',
    rarity: 'rare',
    condition: { type: 'quick_recipes', value: 5 },
    points: 400,
    immersiveMessage: '⚡ Vitesse et qualité : vous maîtrisez l\'art de l\'efficacité !'
  },

  // Trophées saisonniers
  seasonal_spring: {
    id: 'seasonal_spring',
    name: 'Chef du Printemps',
    description: 'Partager une recette au printemps',
    icon: '🌸',
    category: 'seasonal',
    rarity: 'uncommon',
    condition: { type: 'seasonal_recipe', value: 'spring' },
    points: 200,
    immersiveMessage: '🌸 Le renouveau culinaire commence avec vous !'
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
    points: 25,
    immersiveMessage: '👥 L\'aventure est toujours meilleure à plusieurs !'
  },

  // NOUVEAUX TROPHÉES DE NIVEAU
  level_5: {
    id: 'level_5',
    name: 'Cuisinier Confirmé',
    description: 'Atteindre le niveau 5',
    icon: '⭐',
    category: 'level',
    rarity: 'uncommon',
    condition: { type: 'level', value: 5 },
    points: 300,
    immersiveMessage: '⭐ Niveau 5 atteint ! Votre talent culinaire se révèle !'
  },
  level_10: {
    id: 'level_10',
    name: 'Chef Expérimenté',
    description: 'Atteindre le niveau 10',
    icon: '🌟',
    category: 'level',
    rarity: 'rare',
    condition: { type: 'level', value: 10 },
    points: 750,
    immersiveMessage: '🌟 Niveau 10 ! Vous brillez dans l\'univers culinaire !'
  },

  // TROPHÉES DE SPÉCIALISATION
  dessert_master: {
    id: 'dessert_master',
    name: 'Maître Pâtissier',
    description: 'Créer 10 desserts',
    icon: '🍰',
    category: 'specialization',
    rarity: 'rare',
    condition: { type: 'category_recipes', value: 10, category: 'Dessert' },
    points: 400,
    immersiveMessage: '🍰 Sucré succès ! Vos desserts sont de véritables œuvres d\'art !'
  },
  healthy_guru: {
    id: 'healthy_guru',
    name: 'Guru Healthy',
    description: 'Créer 15 plats healthy',
    icon: '🥗',
    category: 'specialization',
    rarity: 'rare',
    condition: { type: 'category_recipes', value: 15, category: 'Healthy' },
    points: 450,
    immersiveMessage: '🥗 Santé et saveurs parfaitement équilibrées ! Un vrai guru !'
  },
  italian_expert: {
    id: 'italian_expert',
    name: 'Expert Italien',
    description: 'Créer 8 plats italiens',
    icon: '🍝',
    category: 'specialization',
    rarity: 'uncommon',
    condition: { type: 'category_recipes', value: 8, category: 'Italien' },
    points: 350,
    immersiveMessage: '🍝 Mamma mia ! Vous maîtrisez la cuisine italienne !'
  },

  // TROPHÉES DE VITESSE
  lightning_chef: {
    id: 'lightning_chef',
    name: 'Chef Éclair',
    description: 'Publier 3 recettes en une journée',
    icon: '⚡',
    category: 'speed',
    rarity: 'epic',
    condition: { type: 'daily_recipes', value: 3 },
    points: 600,
    immersiveMessage: '⚡ Vitesse fulgurante ! Votre créativité ne connaît pas de limites !'
  },
  consistency_king: {
    id: 'consistency_king',
    name: 'Roi de la Régularité',
    description: 'Publier au moins une recette pendant 7 jours consécutifs',
    icon: '👑',
    category: 'consistency',
    rarity: 'legendary',
    condition: { type: 'consecutive_days_recipes', value: 7 },
    points: 1200,
    immersiveMessage: '👑 Régularité royale ! Votre dévotion culinaire inspire !'
  },

  // TROPHÉES D'INNOVATION
  creative_genius: {
    id: 'creative_genius',
    name: 'Génie Créatif',
    description: 'Créer des recettes dans 5 catégories différentes',
    icon: '🎨',
    category: 'creativity',
    rarity: 'epic',
    condition: { type: 'unique_categories', value: 5 },
    points: 800,
    immersiveMessage: '🎨 Créativité sans limites ! Votre polyvalence est remarquable !'
  },
  photo_artist: {
    id: 'photo_artist',
    name: 'Artiste Photo',
    description: 'Partager 20 photos de plats',
    icon: '📸',
    category: 'visual',
    rarity: 'rare',
    condition: { type: 'photo_shares', value: 20 },
    points: 450,
    immersiveMessage: '📸 Un œil artistique exceptionnel ! Vos photos donnent faim !'
  },

  // TROPHÉES COMMUNAUTAIRES AVANCÉS
  community_leader: {
    id: 'community_leader',
    name: 'Leader Communautaire',
    description: 'Avoir 50 amis et 100 likes reçus',
    icon: '🌟',
    category: 'community',
    rarity: 'legendary',
    condition: { type: 'combined', conditions: [
      { type: 'friends_count', value: 50 },
      { type: 'likes_received', value: 100 }
    ]},
    points: 1500,
    immersiveMessage: '🌟 Leader naturel ! Votre influence rayonne dans toute la communauté !'
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor Culinaire',
    description: 'Commenter 100 recettes et avoir 25 amis',
    icon: '🧑‍🏫',
    category: 'mentorship',
    rarity: 'epic',
    condition: { type: 'combined', conditions: [
      { type: 'comments_given', value: 100 },
      { type: 'friends_count', value: 25 }
    ]},
    points: 900,
    immersiveMessage: '🧑‍🏫 Mentor inspirant ! Vos conseils guident la nouvelle génération !'
  },

  // TROPHÉES SAISONNIERS COMPLETS
  seasonal_summer: {
    id: 'seasonal_summer',
    name: 'Chef de l\'Été',
    description: 'Partager une recette en été',
    icon: '☀️',
    category: 'seasonal',
    rarity: 'uncommon',
    condition: { type: 'seasonal_recipe', value: 'summer' },
    points: 200,
    immersiveMessage: '☀️ L\'été dans l\'assiette ! Vos saveurs réchauffent les cœurs !'
  },
  seasonal_autumn: {
    id: 'seasonal_autumn',
    name: 'Chef de l\'Automne',
    description: 'Partager une recette en automne',
    icon: '🍂',
    category: 'seasonal',
    rarity: 'uncommon',
    condition: { type: 'seasonal_recipe', value: 'autumn' },
    points: 200,
    immersiveMessage: '🍂 Couleurs automnales ! Vos plats réchauffent l\'âme !'
  },
  seasonal_winter: {
    id: 'seasonal_winter',
    name: 'Chef de l\'Hiver',
    description: 'Partager une recette en hiver',
    icon: '❄️',
    category: 'seasonal',
    rarity: 'uncommon',
    condition: { type: 'seasonal_recipe', value: 'winter' },
    points: 200,
    immersiveMessage: '❄️ Chaleur hivernale ! Vos recettes réchauffent les soirées froides !'
  },

  // TROPHÉES DE MAÎTRISE TECHNIQUE
  technique_master: {
    id: 'technique_master',
    name: 'Maître des Techniques',
    description: 'Utiliser 10 techniques de cuisson différentes',
    icon: '🔥',
    category: 'technique',
    rarity: 'epic',
    condition: { type: 'cooking_techniques', value: 10 },
    points: 700,
    immersiveMessage: '🔥 Maîtrise technique absolue ! Chaque méthode vous obéit !'
  },
  time_wizard: {
    id: 'time_wizard',
    name: 'Magicien du Temps',
    description: 'Créer 5 recettes rapides (moins de 15 min)',
    icon: '⏰',
    category: 'efficiency',
    rarity: 'rare',
    condition: { type: 'quick_prep_recipes', value: 5 },
    points: 400,
    immersiveMessage: '⏰ Magie temporelle ! Rapidité et qualité parfaitement dosées !'
  },

  // TROPHÉES D'EXCEPTION
  perfectionist_pro: {
    id: 'perfectionist_pro',
    name: 'Perfectionniste Pro',
    description: 'Avoir 10 recettes avec note parfaite',
    icon: '💎',
    category: 'excellence',
    rarity: 'legendary',
    condition: { type: 'perfect_recipes', value: 10 },
    points: 2000,
    immersiveMessage: '💎 Excellence absolue ! Votre perfectionnisme atteint des sommets !'
  },
  viral_sensation: {
    id: 'viral_sensation',
    name: 'Sensation Virale',
    description: 'Avoir une recette avec 200 likes',
    icon: '🚀',
    category: 'viral',
    rarity: 'legendary',
    condition: { type: 'recipe_likes', value: 200 },
    points: 1800,
    immersiveMessage: '🚀 Sensation virale ! Votre recette fait le tour de la planète !'
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
    case 'daily_streak':
      return userStats.dailyStreak >= condition.value
    case 'level':
      return userStats.level >= condition.value
    case 'category_recipes':
      return userStats.categoryRecipes?.[condition.category] >= condition.value
    case 'daily_recipes':
      return userStats.dailyRecipes >= condition.value
    case 'consecutive_days_recipes':
      return userStats.consecutiveDaysRecipes >= condition.value
    case 'likes_received':
      return userStats.likesReceived >= condition.value
    case 'photo_shares':
      return userStats.photoShares >= condition.value
    case 'unique_categories':
      return userStats.uniqueCategories >= condition.value
    case 'cooking_techniques':
      return userStats.cookingTechniques >= condition.value
    case 'quick_prep_recipes':
      return userStats.quickPrepRecipes >= condition.value
    case 'perfect_recipes':
      return userStats.perfectRecipes >= condition.value
    case 'recipe_likes':
      return userStats.recipeLikes >= condition.value
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
        daysSinceRegistration: stats.daysSinceRegistration || 0,
        dailyStreak: stats.dailyStreak || 0,
        level: stats.level || 0,
        categoryRecipes: stats.categoryRecipes || {},
        dailyRecipes: stats.dailyRecipes || 0,
        consecutiveDaysRecipes: stats.consecutiveDaysRecipes || 0,
        likesReceived: stats.likesReceived || 0,
        photoShares: stats.photoShares || 0,
        uniqueCategories: stats.uniqueCategories || 0,
        cookingTechniques: stats.cookingTechniques || 0,
        quickPrepRecipes: stats.quickPrepRecipes || 0,
        perfectRecipes: stats.perfectRecipes || 0,
        recipeLikes: stats.recipeLikes || 0
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
        case 'level':
          currentValue = userStats.level
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'category_recipes':
          currentValue = userStats.categoryRecipes?.[trophy.condition.category] || 0
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'daily_recipes':
          currentValue = userStats.dailyRecipes
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'consecutive_days_recipes':
          currentValue = userStats.consecutiveDaysRecipes
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'likes_received':
          currentValue = userStats.likesReceived
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'photo_shares':
          currentValue = userStats.photoShares
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'unique_categories':
          currentValue = userStats.uniqueCategories
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'cooking_techniques':
          currentValue = userStats.cookingTechniques
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'quick_prep_recipes':
          currentValue = userStats.quickPrepRecipes
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'perfect_recipes':
          currentValue = userStats.perfectRecipes
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
          break
        case 'recipe_likes':
          currentValue = userStats.recipeLikes
          progressPercent = Math.min((currentValue / trophy.condition.value) * 100, 100)
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

    // Mettre à jour les défis quotidiens
    await updateDailyProgress(userId, actionType, actionData)

    let newTrophies = []

    switch (actionType) {
      case 'recipe_created':
        newTrophies = await checkRecipeTrophies(userId)
        await updateChallengeProgress(userId, 'daily_recipe_share')
        break
      case 'recipe_liked':
        await updateChallengeProgress(userId, 'daily_likes')
        break
      case 'recipe_commented':
        await updateChallengeProgress(userId, 'daily_comments')
        break
      case 'recipe_viewed':
        await updateChallengeProgress(userId, 'daily_views')
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
      // Déclencher une notification immersive
      if (typeof window !== 'undefined') {
        try {
          await showImmersiveTrophyNotification(newTrophies)
        } catch (error) {
          logError('Failed to show immersive trophy notification', error)
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
 * Met à jour la progression quotidienne
 */
async function updateDailyProgress(userId, actionType, actionData) {
  try {
    // Mettre à jour le streak quotidien
    await updateDailyStreak(userId)
    
    // Actions spécifiques
    switch (actionType) {
      case 'login':
      case 'daily_visit':
        await updateDailyStreak(userId)
        break
    }
  } catch (error) {
    logError('Error updating daily progress', error)
  }
}

/**
 * Met à jour le streak quotidien de l'utilisateur
 */
async function updateDailyStreak(userId) {
  try {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    
    const streakKey = `daily_streak_${userId}`
    const lastVisitKey = `last_visit_${userId}`
    
    const currentStreak = parseInt(localStorage.getItem(streakKey) || '0')
    const lastVisit = localStorage.getItem(lastVisitKey)
    
    if (lastVisit === today) {
      // Déjà visité aujourd'hui
      return currentStreak
    }
    
    let newStreak = 1
    if (lastVisit === yesterday) {
      // Continuation du streak
      newStreak = currentStreak + 1
    }
    
    // Sauvegarder
    localStorage.setItem(streakKey, newStreak.toString())
    localStorage.setItem(lastVisitKey, today)
    
    // Vérifier les trophées de streak
    await checkStreakTrophies(userId, newStreak)
    
    return newStreak
  } catch (error) {
    logError('Error updating daily streak', error)
    return 0
  }
}

/**
 * Vérifie les trophées de streak
 */
async function checkStreakTrophies(userId, currentStreak) {
  try {
    const streakTrophies = ['streak_7_days', 'streak_30_days', 'streak_100_days']
    
    for (const trophyId of streakTrophies) {
      const trophy = TROPHY_DEFINITIONS[trophyId]
      if (trophy && currentStreak >= trophy.condition.value) {
        // Vérifier si pas déjà débloqué
        const { data: existing } = await supabase
          .from('user_trophies')
          .select('id')
          .eq('user_id', userId)
          .eq('trophy_id', trophyId)
          .maybeSingle()
        
        if (!existing) {
          await unlockTrophy(userId, trophyId)
        }
      }
    }
  } catch (error) {
    logError('Error checking streak trophies', error)
  }
}

/**
 * Affiche une notification de trophée immersive
 */
async function showImmersiveTrophyNotification(trophies) {
  try {
    const { notificationManager, NOTIFICATION_TYPES } = await import('./notificationUtils')
    
    for (const trophy of trophies) {
      await notificationManager.show(
        NOTIFICATION_TYPES.TROPHY,
        '🏆 NOUVEAU TROPHÉE DÉBLOQUÉ !',
        {
          body: trophy.immersiveMessage || `${trophy.name}: ${trophy.description}`,
          icon: '/icons/trophy.png',
          duration: 10000,
          forceFallback: true,
          data: { 
            trophyId: trophy.id, 
            points: trophy.points,
            rarity: trophy.rarity 
          }
        }
      )
      
      // Ajouter un délai entre les notifications multiples
      if (trophies.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

  } catch (error) {
    logError('Error showing immersive trophy notification', error)
  }
}

/**
 * Système de niveaux basé sur les points
 */
export const LEVEL_SYSTEM = {
  levels: [
    { level: 1, minPoints: 0, maxPoints: 99, title: 'Apprenti Cuisinier', icon: '👶', color: '#6b7280' },
    { level: 2, minPoints: 100, maxPoints: 299, title: 'Cuisinier Amateur', icon: '🍳', color: '#10b981' },
    { level: 3, minPoints: 300, maxPoints: 599, title: 'Cuisinier Confirmé', icon: '👨‍🍳', color: '#3b82f6' },
    { level: 4, minPoints: 600, maxPoints: 999, title: 'Chef Talentueux', icon: '🎯', color: '#8b5cf6' },
    { level: 5, minPoints: 1000, maxPoints: 1999, title: 'Chef Étoilé', icon: '⭐', color: '#f59e0b' },
    { level: 6, minPoints: 2000, maxPoints: 3999, title: 'Maître Chef', icon: '👑', color: '#ef4444' },
    { level: 7, minPoints: 4000, maxPoints: 7999, title: 'Chef Légendaire', icon: '🏆', color: '#ec4899' },
    { level: 8, minPoints: 8000, maxPoints: 15999, title: 'Grand Maître', icon: '💎', color: '#14b8a6' },
    { level: 9, minPoints: 16000, maxPoints: 31999, title: 'Chef Divin', icon: '🌟', color: '#f97316' },
    { level: 10, minPoints: 32000, maxPoints: Infinity, title: 'Légende Immortelle', icon: '🔮', color: '#a855f7' }
  ]
}

/**
 * Calcule le niveau d'un utilisateur basé sur ses points
 */
export function calculateUserLevel(totalPoints) {
  for (let i = LEVEL_SYSTEM.levels.length - 1; i >= 0; i--) {
    const level = LEVEL_SYSTEM.levels[i]
    if (totalPoints >= level.minPoints) {
      const nextLevel = LEVEL_SYSTEM.levels[i + 1]
      return {
        ...level,
        currentPoints: totalPoints,
        pointsToNext: nextLevel ? nextLevel.minPoints - totalPoints : 0,
        progressPercent: nextLevel ? 
          Math.round(((totalPoints - level.minPoints) / (nextLevel.minPoints - level.minPoints)) * 100) : 100
      }
    }
  }
  return LEVEL_SYSTEM.levels[0]
}

/**
 * Système de défis quotidiens
 */
export const DAILY_CHALLENGES = {
  challenges: [
    {
      id: 'daily_share',
      name: 'Partage Quotidien',
      description: 'Partager une recette aujourd\'hui',
      icon: '📤',
      points: 50,
      type: 'daily_recipe_share'
    },
    {
      id: 'daily_like',
      name: 'Cœur Généreux',
      description: 'Liker 5 recettes aujourd\'hui',
      icon: '❤️',
      points: 30,
      type: 'daily_likes',
      target: 5
    },
    {
      id: 'daily_comment',
      name: 'Conseil du Jour',
      description: 'Commenter 3 recettes aujourd\'hui',
      icon: '💬',
      points: 40,
      type: 'daily_comments',
      target: 3
    },
    {
      id: 'daily_explore',
      name: 'Explorateur',
      description: 'Consulter 10 recettes aujourd\'hui',
      icon: '🔍',
      points: 25,
      type: 'daily_views',
      target: 10
    }
  ]
}

/**
 * Génère les défis quotidiens pour un utilisateur
 */
export function generateDailyChallenges() {
  const today = new Date().toDateString()
  const selectedChallenges = DAILY_CHALLENGES.challenges
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  
  return selectedChallenges.map(challenge => ({
    ...challenge,
    id: `${challenge.id}_${today}`,
    date: today,
    completed: false,
    progress: 0
  }))
}

/**
 * Mise à jour de la progression d'un défi
 */
export async function updateChallengeProgress(userId, challengeType, increment = 1) {
  try {
    // Récupérer les défis actuels de l'utilisateur
    const today = new Date().toDateString()
    const storageKey = `daily_challenges_${userId}_${today}`
    
    let challenges = []
    try {
      const stored = localStorage.getItem(storageKey)
      challenges = stored ? JSON.parse(stored) : generateDailyChallenges()
    } catch {
      challenges = generateDailyChallenges()
    }

    // Mettre à jour la progression
    const challenge = challenges.find(c => c.type === challengeType)
    if (challenge && !challenge.completed) {
      challenge.progress = Math.min((challenge.progress || 0) + increment, challenge.target || 1)
      
      if (challenge.progress >= (challenge.target || 1)) {
        challenge.completed = true
        
        // Récompenser l'utilisateur
        await rewardChallengeCompletion(userId, challenge)
      }
      
      // Sauvegarder
      localStorage.setItem(storageKey, JSON.stringify(challenges))
      
      // Notifier l'interface
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('challengeUpdated', {
          detail: { userId, challenge, allChallenges: challenges }
        }))
      }
    }

    return challenges
  } catch (error) {
    logError('Error updating challenge progress', error)
    return []
  }
}

/**
 * Récompense la completion d'un défi
 */
async function rewardChallengeCompletion(userId, challenge) {
  try {
    // Ajouter les points (simulation - en production, cela irait en base)
    const pointsKey = `user_points_${userId}`
    const currentPoints = parseInt(localStorage.getItem(pointsKey) || '0')
    localStorage.setItem(pointsKey, (currentPoints + challenge.points).toString())

    // Afficher une notification immersive
    if (typeof window !== 'undefined') {
      const { notificationManager, NOTIFICATION_TYPES } = await import('./notificationUtils')
      
      await notificationManager.show(
        NOTIFICATION_TYPES.SUCCESS,
        '🎯 Défi complété !',
        {
          body: `${challenge.name} - +${challenge.points} points !`,
          icon: '/icons/challenge-complete.png',
          duration: 6000,
          forceFallback: true,
          data: { challengeId: challenge.id, points: challenge.points }
        }
      )
    }

    logInfo('Daily challenge completed', {
      userId: userId?.substring(0, 8) + '...',
      challengeId: challenge.id,
      points: challenge.points
    })

  } catch (error) {
    logError('Error rewarding challenge completion', error)
  }
}

/**
 * Récupère les défis quotidiens d'un utilisateur
 */
export function getUserDailyChallenges(userId) {
  try {
    const today = new Date().toDateString()
    const storageKey = `daily_challenges_${userId}_${today}`
    
    const stored = localStorage.getItem(storageKey)
    const challenges = stored ? JSON.parse(stored) : generateDailyChallenges()
    
    // Sauvegarder si pas encore fait
    if (!stored) {
      localStorage.setItem(storageKey, JSON.stringify(challenges))
    }
    
    return challenges
  } catch (error) {
    logError('Error getting user daily challenges', error)
    return generateDailyChallenges()
  }
}
