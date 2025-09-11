// Missions disponibles dans l'application
export const MISSIONS = [
  // Missions recettes
  {
    id: 'first_recipe',
    title: 'Première recette',
    description: 'Publiez votre première recette',
    icon: '📝',
    type: 'recipe',
    target: 1,
    reward: { coins: 50, xp: 25 },
    difficulty: 'facile'
  },
  {
    id: 'recipe_master_5',
    title: 'Chef en herbe',
    description: 'Publiez 5 recettes',
    icon: '👨‍🍳',
    type: 'recipe',
    target: 5,
    reward: { coins: 150, xp: 75 },
    difficulty: 'moyen'
  },
  {
    id: 'recipe_master_10',
    title: 'Maître cuisinier',
    description: 'Publiez 10 recettes',
    icon: '🍳',
    type: 'recipe',
    target: 10,
    reward: { coins: 300, xp: 150, item: 'hat_crown' },
    difficulty: 'difficile'
  },
  {
    id: 'recipe_master_25',
    title: 'Chef étoilé',
    description: 'Publiez 25 recettes',
    icon: '⭐',
    type: 'recipe',
    target: 25,
    reward: { coins: 500, xp: 250, item: 'badge_early' },
    difficulty: 'difficile'
  },
  
  // Missions sociales
  {
    id: 'first_like',
    title: 'Premier like',
    description: 'Recevez votre premier like',
    icon: '❤️',
    type: 'like',
    target: 1,
    reward: { coins: 20, xp: 10 },
    difficulty: 'facile'
  },
  {
    id: 'popular_chef',
    title: 'Chef populaire',
    description: 'Recevez 50 likes au total',
    icon: '🌟',
    type: 'like',
    target: 50,
    reward: { coins: 250, xp: 125 },
    difficulty: 'difficile'
  },
  {
    id: 'viral_recipe',
    title: 'Recette virale',
    description: 'Recevez 100 likes au total',
    icon: '🚀',
    type: 'like',
    target: 100,
    reward: { coins: 400, xp: 200, item: 'fx_sparkle' },
    difficulty: 'difficile'
  },
  {
    id: 'social_butterfly',
    title: 'Papillon social',
    description: 'Ajoutez 5 amis',
    icon: '🤝',
    type: 'friend',
    target: 5,
    reward: { coins: 100, xp: 50 },
    difficulty: 'moyen'
  },
  {
    id: 'community_builder',
    title: 'Créateur de communauté',
    description: 'Ajoutez 10 amis',
    icon: '👥',
    type: 'friend',
    target: 10,
    reward: { coins: 200, xp: 100 },
    difficulty: 'difficile'
  },
  
  // Missions engagement
  {
    id: 'daily_quiz_streak',
    title: 'Expert quiz',
    description: 'Réussissez 3 quiz consécutifs',
    icon: '🧠',
    type: 'quiz_streak',
    target: 3,
    reward: { coins: 200, xp: 100, item: 'glasses_star' },
    difficulty: 'moyen'
  },
  {
    id: 'quiz_master',
    title: 'Maître des quiz',
    description: 'Réussissez 7 quiz consécutifs',
    icon: '🎓',
    type: 'quiz_streak',
    target: 7,
    reward: { coins: 350, xp: 175, item: 'hat_crown' },
    difficulty: 'difficile'
  },
  {
    id: 'login_streak_7',
    title: 'Assidu',
    description: 'Connectez-vous 7 jours consécutifs',
    icon: '🔥',
    type: 'streak',
    target: 7,
    reward: { coins: 300, xp: 150 },
    difficulty: 'moyen'
  },
  {
    id: 'login_streak_30',
    title: 'Fidèle compagnon',
    description: 'Connectez-vous 30 jours consécutifs',
    icon: '💎',
    type: 'streak',
    target: 30,
    reward: { coins: 1000, xp: 500, item: 'fx_fire' },
    difficulty: 'difficile'
  },
  
  // Missions spéciales
  {
    id: 'photo_perfectionist',
    title: 'Photographe culinaire',
    description: 'Partagez une photo de plat',
    icon: '📸',
    type: 'photo',
    target: 1,
    reward: { coins: 30, xp: 15 },
    difficulty: 'facile'
  },
  {
    id: 'complete_profile',
    title: 'Profil complet',
    description: 'Complétez votre profil',
    icon: '👤',
    type: 'profile',
    target: 1,
    reward: { coins: 80, xp: 40 },
    difficulty: 'facile'
  },
  {
    id: 'early_adopter',
    title: 'Utilisateur précoce',
    description: 'Rejoignez COCO avant la version 2.0',
    icon: '🚀',
    type: 'special',
    target: 1,
    reward: { coins: 500, xp: 250, item: 'badge_early' },
    difficulty: 'facile'
  }
];

// Fonction pour calculer le progrès d'une mission
export const getCurrentProgress = (mission, stats, user) => {
  if (!stats) return 0;
  
  switch (mission.type) {
    case 'recipe':
      return stats.recipesCount || 0;
    case 'like':
      return stats.likesReceived || 0;
    case 'friend':
      return stats.friendsCount || 0;
    case 'streak':
      return stats.streak || 0;
    case 'quiz_streak':
      try {
        const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
        // Calculer la série de quiz réussis consécutifs
        let currentStreak = 0;
        for (let i = quizHistory.length - 1; i >= 0; i--) {
          if (quizHistory[i].success) {
            currentStreak++;
          } else {
            break;
          }
        }
        return currentStreak;
      } catch {
        return 0;
      }
    case 'photo':
      // Simulé pour l'exemple - à adapter selon votre système
      return 0;
    case 'profile':
      // Vérifie si le profil est complet
      return (user?.user_metadata?.display_name && user?.user_metadata?.avatar_url) ? 1 : 0;
    case 'special':
      // Missions spéciales - à définir selon le contexte
      return mission.id === 'early_adopter' ? 1 : 0;
    default:
      return 0;
  }
};

// Fonction pour obtenir les missions actives
export const getActiveMissions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('coco_missions') || '[]');
    return saved.length > 0 ? saved : MISSIONS.slice(0, 4);
  } catch {
    return MISSIONS.slice(0, 4);
  }
};

// Fonction pour obtenir les missions complétées
export const getCompletedMissions = () => {
  try {
    return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
  } catch {
    return [];
  }
};

// Fonction pour marquer une mission comme complétée
export const completeMission = (missionId) => {
  const completed = getCompletedMissions();
  if (!completed.includes(missionId)) {
    const newCompleted = [...completed, missionId];
    localStorage.setItem('coco_completed_missions', JSON.stringify(newCompleted));
    return true;
  }
  return false;
};

// Fonction pour obtenir une nouvelle mission aléatoire
export const getRandomMission = (excludeIds = []) => {
  const completed = getCompletedMissions();
  const active = getActiveMissions();
  
  const available = MISSIONS.filter(mission => 
    !completed.includes(mission.id) && 
    !active.find(active => active.id === mission.id) &&
    !excludeIds.includes(mission.id)
  );
  
  if (available.length === 0) return null;
  
  return available[Math.floor(Math.random() * available.length)];
};

// Fonction pour sauvegarder les missions actives
export const saveActiveMissions = (missions) => {
  localStorage.setItem('coco_missions', JSON.stringify(missions));
};

// Fonction pour vérifier si une mission peut être complétée
export const canCompleteMission = (mission, stats, user) => {
  const progress = getCurrentProgress(mission, stats, user);
  const completed = getCompletedMissions();
  
  return progress >= mission.target && !completed.includes(mission.id);
};

// Fonction pour obtenir le pourcentage de progression d'une mission
export const getMissionProgress = (mission, stats, user) => {
  const progress = getCurrentProgress(mission, stats, user);
  return Math.min(100, (progress / mission.target) * 100);
};