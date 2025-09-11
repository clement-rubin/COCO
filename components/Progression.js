import { useEffect, useState } from 'react'
import { getUserTrophies } from '../utils/trophyUtils'
import { getUserStatsComplete } from '../utils/profileUtils'
import { supabase } from '../lib/supabase'
import styles from '../styles/Trophy.module.css'
import React from 'react'

const LEVELS = [
  { level: 1, xp: 0, label: "Débutant", color: "#a7f3d0" },
  { level: 2, xp: 100, label: "Apprenti", color: "#6ee7b7" },
  { level: 3, xp: 300, label: "Cuisinier", color: "#34d399" },
  { level: 4, xp: 700, label: "Chef", color: "#10b981" },
  { level: 5, xp: 1500, label: "Maître Chef", color: "#059669" },
  { level: 6, xp: 3000, label: "Légende", color: "#2563eb" }
]

function getLevel(xp) {
  let current = LEVELS[0]
  let next = LEVELS[LEVELS.length - 1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) current = LEVELS[i]
    if (xp < LEVELS[i].xp) {
      next = LEVELS[i]
      break
    }
  }
  return { current, next }
}

// --- Ajout objets cosmétiques et monnaie ---
// Catégories: hat, glasses, apron, accessory, face, background, effect, badge, mascot
const SHOP_ITEMS = [
  // Chapeaux
  { id: 'hat_chef', name: 'Toque de Chef', icon: '👨‍🍳', price: 100, type: 'hat', rarity: 'common', isNew: false },
  { id: 'hat_pirate', name: 'Chapeau Pirate', icon: '🏴‍☠️', price: 150, type: 'hat', rarity: 'rare', isNew: false },
  { id: 'hat_crown', name: 'Couronne Royale', icon: '👑', price: 500, type: 'hat', rarity: 'legendary', isNew: true },
  { id: 'hat_sombrero', name: 'Sombrero', icon: '🎩', price: 180, type: 'hat', rarity: 'uncommon', isNew: false },
  // Lunettes
  { id: 'glasses_cool', name: 'Lunettes Cool', icon: '🕶️', price: 80, type: 'glasses', rarity: 'common', isNew: false },
  { id: 'glasses_star', name: 'Lunettes Star', icon: '🤩', price: 220, type: 'glasses', rarity: 'rare', isNew: true },
  // Tabliers
  { id: 'apron_red', name: 'Tablier Rouge', icon: '🟥', price: 120, type: 'apron', rarity: 'common', isNew: false },
  { id: 'apron_blue', name: 'Tablier Bleu', icon: '🟦', price: 120, type: 'apron', rarity: 'common', isNew: false },
  { id: 'apron_gold', name: 'Tablier Or', icon: '🟨', price: 350, type: 'apron', rarity: 'epic', isNew: true },
  // Accessoires
  { id: 'spoon_gold', name: 'Cuillère Or', icon: '🥄', price: 200, type: 'accessory', rarity: 'epic', isNew: false },
  { id: 'fork_silver', name: 'Fourchette Argent', icon: '🍴', price: 140, type: 'accessory', rarity: 'uncommon', isNew: false },
  { id: 'pepper', name: 'Poivrier', icon: '🌶️', price: 90, type: 'accessory', rarity: 'common', isNew: false },
  // Visage
  { id: 'mustache', name: 'Moustache', icon: '👨', price: 90, type: 'face', rarity: 'common', isNew: false },
  { id: 'beard', name: 'Barbe', icon: '🧔', price: 120, type: 'face', rarity: 'uncommon', isNew: false },
  // Fonds
  { id: 'bg_kitchen', name: 'Cuisine Pro', icon: '🏠', price: 250, type: 'background', rarity: 'rare', isNew: true },
  { id: 'bg_jungle', name: 'Jungle', icon: '🌴', price: 200, type: 'background', rarity: 'uncommon', isNew: false },
  // Effets spéciaux
  { id: 'fx_fire', name: 'Effet Flamme', icon: '🔥', price: 400, type: 'effect', rarity: 'legendary', isNew: true },
  { id: 'fx_sparkle', name: 'Effet Étincelle', icon: '✨', price: 220, type: 'effect', rarity: 'epic', isNew: false },
  // Badges exclusifs
  { id: 'badge_early', name: 'Pionnier', icon: '🌟', price: 0, type: 'badge', rarity: 'legendary', isNew: false, exclusive: true },
  // Mascottes
  { id: 'mascot_chick', name: 'Poussin', icon: '🐥', price: 180, type: 'mascot', rarity: 'uncommon', isNew: false },
  { id: 'mascot_cat', name: 'Chat', icon: '🐱', price: 220, type: 'mascot', rarity: 'rare', isNew: true }
]

const ITEM_TYPES = [
  { id: 'all', label: 'Tout', icon: '🛒' },
  { id: 'hat', label: 'Chapeaux', icon: '🎩' },
  { id: 'glasses', label: 'Lunettes', icon: '🕶️' },
  { id: 'apron', label: 'Tabliers', icon: '🦺' },
  { id: 'accessory', label: 'Accessoires', icon: '🍴' },
  { id: 'face', label: 'Visage', icon: '🧔' },
  { id: 'background', label: 'Fonds', icon: '🏞️' },
  { id: 'effect', label: 'Effets', icon: '✨' },
  { id: 'badge', label: 'Badges', icon: '🏅' },
  { id: 'mascot', label: 'Mascottes', icon: '🐾' }
]

const DEFAULT_CHEF = {
  hat: null,
  glasses: null,
  apron: null,
  accessory: null,
  face: null,
  background: null,
  effect: null,
  badge: null,
  mascot: null
}

// --- Quiz quotidien (remplace DAILY_CHALLENGES) ---
const DAILY_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: "Quel ingrédient n'entre PAS dans une pâte à crêpes classique ?",
    options: ["Farine", "Lait", "Levure chimique", "Œufs"],
    answer: 2 // index de la bonne réponse (Levure chimique)
  },
  {
    id: 'q2',
    question: "Quel est le terme pour cuire un aliment dans de l'eau frémissante ?",
    options: ["Sauter", "Pocher", "Griller", "Rôtir"],
    answer: 1
  },
  {
    id: 'q3',
    question: "Quel fromage est traditionnellement utilisé dans la recette de la pizza Margherita ?",
    options: ["Comté", "Mozzarella", "Roquefort", "Chèvre"],
    answer: 1
  },
  {
    id: 'q4',
    question: "Quel est le principal ingrédient du guacamole ?",
    options: ["Avocat", "Tomate", "Poivron", "Courgette"],
    answer: 0
  },
  {
    id: 'q5',
    question: "Comment appelle-t-on une cuisson à la vapeur douce en Asie ?",
    options: ["Wok", "Dim sum", "Bain-marie", "Bambou"],
    answer: 3
  }
]

// --- Système de missions dynamiques ---
const MISSIONS = [
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
    id: 'social_butterfly',
    title: 'Papillon social',
    description: 'Ajoutez 5 amis',
    icon: '🤝',
    type: 'friend',
    target: 5,
    reward: { coins: 100, xp: 50 },
    difficulty: 'moyen'
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
    id: 'login_streak_7',
    title: 'Assidu',
    description: 'Connectez-vous 7 jours consécutifs',
    icon: '🔥',
    type: 'streak',
    target: 7,
    reward: { coins: 300, xp: 150 },
    difficulty: 'moyen'
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
  }
]

const DAILY_CHALLENGES = [
  { id: 'share_photo', label: "Partager une photo de plat", icon: "📸", reward: "+20 XP" },
  { id: 'comment', label: "Commenter une recette", icon: "💬", reward: "+10 XP" },
  { id: 'add_friend', label: "Ajouter un nouvel ami", icon: "🤝", reward: "+15 XP" }
]

const MOCK_LEADERBOARD = [
  { rank: 1, name: "Chef Paul", xp: 3200, you: false },
  { rank: 2, name: "Sophie", xp: 2900, you: false },
  { rank: 3, name: "Vous", xp: 2100, you: true },
  { rank: 4, name: "Emma", xp: 1800, you: false },
  { rank: 5, name: "Lucas", xp: 1700, you: false }
]

// --- Système de ligues ---
const LEAGUES = [
  { id: 'bronze', label: 'Bronze', minLevel: 1, color: '#cd7f32', icon: '🥉' },
  { id: 'argent', label: 'Argent', minLevel: 3, color: '#c0c0c0', icon: '🥈' },
  { id: 'or', label: 'Or', minLevel: 5, color: '#ffd700', icon: '🥇' },
  { id: 'platine', label: 'Platine', minLevel: 7, color: '#e5e4e2', icon: '💎' },
  { id: 'diamant', label: 'Diamant', minLevel: 9, color: '#b9f2ff', icon: '🔷' },
  { id: 'master', label: 'Master', minLevel: 12, color: '#6366f1', icon: '🏆' }
];

function getLeague(level) {
  let league = LEAGUES[0];
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (level >= LEAGUES[i].minLevel) {
      league = LEAGUES[i];
      break;
    }
  }
  return league;
}

// Helper: Glow effect for items by rarity
function getItemGlow(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId)
  if (!item) return 'none'
  switch (item.rarity) {
    case 'legendary':
      return 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #fbbf24)';
    case 'epic':
      return 'drop-shadow(0 0 8px #8b5cf6) drop-shadow(0 0 12px #a78bfa)';
    case 'rare':
      return 'drop-shadow(0 0 6px #3b82f6)';
    default:
      return 'none';
  }
}

export default function Progression({ user }) {
  const [xp, setXP] = useState(0)
  const [levelInfo, setLevelInfo] = useState(getLevel(0))
  const [trophies, setTrophies] = useState({ unlocked: [], locked: [], totalPoints: 0, unlockedCount: 0, totalCount: 0 })
  const [stats, setStats] = useState({
    recipesCount: 0,
    friendsCount: 0,
    likesReceived: 0,
    daysActive: 0,
    streak: 0
  })
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [dailyChallenges, setDailyChallenges] = useState(DAILY_CHALLENGES)
  const [coins, setCoins] = useState(250)
  const [ownedItems, setOwnedItems] = useState(['hat_chef'])
  const [equipped, setEquipped] = useState({ ...DEFAULT_CHEF, hat: 'hat_chef' })
  const [shopOpen, setShopOpen] = useState(false)
  const [shopFeedback, setShopFeedback] = useState(null)
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [previewEquip, setPreviewEquip] = useState(null)
  const [coinAnim, setCoinAnim] = useState(false)
  const [activeTab, setActiveTab] = useState('progression') // 'progression' | 'boutique' | 'classement'
  const [favoriteItems, setFavoriteItems] = useState([])
  const [shopFilter, setShopFilter] = useState('all')
  const [dressingOpen, setDressingOpen] = useState(false)
  const [dressingTab, setDressingTab] = useState('hat') // caté active dans le dressing
  const [completedChallenges, setCompletedChallenges] = useState(() => {
    // Stockage local pour empêcher la validation infinie des quêtes
    try {
      const data = JSON.parse(localStorage.getItem('coco_daily_challenges') || '{}');
      return data;
    } catch {
      return {};
    }
  });
  
  // --- Système de missions ---
  const [missions, setMissions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('coco_missions') || '[]');
      return saved.length > 0 ? saved : MISSIONS.slice(0, 4); // 4 missions actives par défaut
    } catch {
      return MISSIONS.slice(0, 4);
    }
  });
  const [completedMissions, setCompletedMissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
    } catch {
      return [];
    }
  });

  // --- États pour le tracking des missions ---
  const [missionProgresses, setMissionProgresses] = useState({});
  const [missionsLoading, setMissionsLoading] = useState(false);

  // --- Fonctions helper pour missions avec vraies données ---
  const getCurrentProgress = async (mission) => {
    if (!stats || !user) return 0;
    
    try {
      switch (mission.type) {
        // === MISSIONS RECETTES ===
        case 'recipe_count':
          return stats.recipesCount || 0;
          
        case 'recipe_categories':
          const { data: recipes } = await supabase
            .from('recipes')
            .select('category')
            .eq('user_id', user.id);
          const uniqueCategories = [...new Set(recipes?.map(r => r.category) || [])];
          return uniqueCategories.length;
          
        case 'weekend_recipes':
          const { data: weekendRecipes } = await supabase
            .from('recipes')
            .select('created_at')
            .eq('user_id', user.id);
          const weekendCount = weekendRecipes?.filter(r => {
            const day = new Date(r.created_at).getDay();
            return day === 0 || day === 6;
          }).length || 0;
          return weekendCount;
          
        case 'night_recipe':
          const { data: nightRecipes } = await supabase
            .from('recipes')
            .select('created_at')
            .eq('user_id', user.id);
          const nightCount = nightRecipes?.filter(r => {
            const hour = new Date(r.created_at).getHours();
            return hour >= 22 || hour <= 6;
          }).length || 0;
          return nightCount > 0 ? 1 : 0;
          
        case 'daily_recipes':
          const today = new Date().toISOString().split('T')[0];
          const { data: todayRecipes } = await supabase
            .from('recipes')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', today + 'T00:00:00')
            .lt('created_at', today + 'T23:59:59');
          return todayRecipes?.length || 0;
        
        // === MISSIONS SOCIALES ===
        case 'likes_received':
          return stats.likesReceived || 0;
          
        case 'friends_count':
          return stats.friendsCount || 0;
          
        // === MISSIONS QUIZ ===
        case 'quiz_success_count':
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
            return quizHistory.filter(q => q.success).length;
          } catch {
            return 0;
          }
          
        case 'quiz_streak':
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
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
        
        // === MISSIONS ASSIDUITÉ ===
        case 'login_streak':
          return stats.streak || 0;
          
        // === MISSIONS INTERACTION ===
        case 'comments_given':
          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('user_id', user.id);
          return comments?.length || 0;
          
        // === MISSIONS PROFIL & CUSTOMISATION ===
        case 'profile_complete':
          const hasDisplayName = user?.user_metadata?.display_name;
          const hasAvatar = user?.user_metadata?.avatar_url;
          return (hasDisplayName && hasAvatar) ? 1 : 0;
          
        case 'equipped_items':
          const equippedCount = Object.values(equipped).filter(item => item !== null).length;
          return equippedCount;
          
        case 'owned_items':
          return ownedItems.length;
          
        case 'purchased_items':
          return purchaseHistory.length;
          
        // === MISSIONS SPÉCIALES ===
        case 'special_early':
          const joinDate = new Date(user?.created_at || Date.now());
          const cutoffDate = new Date('2025-01-01');
          return joinDate < cutoffDate ? 1 : 0;
          
        default:
          return 0;
      }
    } catch (error) {
      console.error(`Erreur calcul progrès mission ${mission.id}:`, error);
      return 0;
    }
  };

  // --- Fonction pour synchroniser toutes les missions ---
  const syncAllMissions = async () => {
    if (!user || missionsLoading) return;
    
    setMissionsLoading(true);
    
    try {
      const progressMap = {};
      
      // Calculer le progrès pour chaque mission active
      for (const mission of missions) {
        const progress = await getCurrentProgress(mission);
        progressMap[mission.id] = {
          current: progress,
          target: mission.target,
          percent: Math.min(100, (progress / mission.target) * 100),
          isCompleted: progress >= mission.target && !completedMissions.includes(mission.id)
        };
      }
      
      setMissionProgresses(progressMap);
      
      // Vérifier les missions complétées
      const newlyCompleted = [];
      for (const mission of missions) {
        if (progressMap[mission.id]?.isCompleted) {
          newlyCompleted.push(mission);
        }
      }
      
      // Traiter les missions complétées
      if (newlyCompleted.length > 0) {
        await processMissionCompletions(newlyCompleted);
      }
      
    } catch (error) {
      console.error('Erreur lors de la synchronisation des missions:', error);
    }
    
    setMissionsLoading(false);
  };
  
  // --- Fonction pour traiter les missions complétées ---
  const processMissionCompletions = async (newlyCompleted) => {
    const newCompletedIds = newlyCompleted.map(m => m.id);
    const allCompleted = [...completedMissions, ...newCompletedIds];
    
    // Calculer les récompenses totales
    let totalCoins = 0;
    let totalXP = 0;
    const newItems = [];
    
    for (const mission of newlyCompleted) {
      totalCoins += mission.reward.coins || 0;
      totalXP += mission.reward.xp || 0;
      
      if (mission.reward.item && !ownedItems.includes(mission.reward.item)) {
        newItems.push(mission.reward.item);
      }
    }
    
    // Mettre à jour les états
    setCompletedMissions(allCompleted);
    localStorage.setItem('coco_completed_missions', JSON.stringify(allCompleted));
    
    if (totalCoins > 0) {
      setCoins(prev => prev + totalCoins);
      // Mettre à jour en base
      await supabase
        .from('user_pass')
        .update({ coins: coins + totalCoins })
        .eq('user_id', user.id);
    }
    
    if (totalXP > 0) {
      setXP(prev => prev + totalXP);
    }
    
    if (newItems.length > 0) {
      const updatedItems = [...ownedItems, ...newItems];
      setOwnedItems(updatedItems);
      // Mettre à jour en base
      await supabase
        .from('user_pass')
        .update({ owned_items: updatedItems })
        .eq('user_id', user.id);
    }
    
    // Feedback visuel
    if (newlyCompleted.length === 1) {
      const mission = newlyCompleted[0];
      setShopFeedback({ 
        type: 'success', 
        msg: `🎉 Mission "${mission.title}" terminée ! +${mission.reward.coins || 0} CocoCoins` 
      });
    } else {
      setShopFeedback({ 
        type: 'success', 
        msg: `🎉 ${newlyCompleted.length} missions terminées ! +${totalCoins} CocoCoins` 
      });
    }
    
    setTimeout(() => setShopFeedback(null), 4000);
    
    // Animation coins
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 900);
    
    // Remplacer les missions complétées par de nouvelles
    setTimeout(async () => {
      await assignNewMissions(newCompletedIds);
    }, 2000);
  };
  
  // --- Fonction pour assigner de nouvelles missions ---
  const assignNewMissions = async (completedIds) => {
    const allCompleted = getCompletedMissions();
    const currentMissionIds = missions.map(m => m.id);
    
    // Missions disponibles (non complétées et non actives)
    const availableMissions = MISSIONS.filter(m => 
      !allCompleted.includes(m.id) && 
      !currentMissionIds.includes(m.id)
    );
    
    // Remplacer les missions complétées
    let updatedMissions = missions.filter(m => !completedIds.includes(m.id));
    
    // Ajouter de nouvelles missions jusqu'à avoir 6 missions actives
    while (updatedMissions.length < 6 && availableMissions.length > 0) {
      // Prioriser selon la difficulté et catégorie
      const easyMissions = availableMissions.filter(m => m.difficulty === 'facile');
      const mediumMissions = availableMissions.filter(m => m.difficulty === 'moyen');
      
      let selectedMission;
      if (easyMissions.length > 0 && Math.random() > 0.3) {
        selectedMission = easyMissions[Math.floor(Math.random() * easyMissions.length)];
      } else if (mediumMissions.length > 0 && Math.random() > 0.5) {
        selectedMission = mediumMissions[Math.floor(Math.random() * mediumMissions.length)];
      } else {
        selectedMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
      }
      
      updatedMissions.push(selectedMission);
      availableMissions.splice(availableMissions.indexOf(selectedMission), 1);
    }
    
    setMissions(updatedMissions);
    localStorage.setItem('coco_missions', JSON.stringify(updatedMissions));
    
    // Recalculer les progrès pour les nouvelles missions
    await syncAllMissions();
  };
  
  // --- Helper pour obtenir les missions complétées ---
  const getCompletedMissions = () => {
    try {
      return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
    } catch {
      return [];
    }
  };
  
  // --- Quiz quotidien ---
  const [quizState, setQuizState] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('coco_daily_quiz') || '{}');
      return data;
    } catch {
      return {};
    }
  });
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [quizQuestion, setQuizQuestion] = useState(null)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      setLoading(true)
      let userStats = { recipesCount: 0, friendsCount: 0, likesReceived: 0, daysActive: 0, streak: 0 }
      let trophyData = { unlocked: [], locked: [], totalPoints: 0, unlockedCount: 0, totalCount: 0 }
      let xpCalc = 0

      if (user?.id) {
        try {
          userStats = await getUserStatsComplete(user.id)
          trophyData = await getUserTrophies(user.id)
          // XP = 10 * recettes + 40 * quiz réussi
          let quizSuccessCount = 0
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]')
            quizSuccessCount = quizHistory.filter(q => q.success).length
          } catch {
            quizSuccessCount = quizState?.success ? 1 : 0
          }
          xpCalc = 10 * (userStats.recipesCount || 0) + 40 * quizSuccessCount
        } catch (e) {}
      }
      if (isMounted) {
        setStats(userStats)
        setTrophies(trophyData)
        setXP(xpCalc)
        setLevelInfo(getLevel(xpCalc))
        setLoading(false)
        
        // Synchroniser les missions après le chargement des stats
        if (user?.id) {
          await syncAllMissions();
        }
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [user, quizState])

  // Effet pour synchroniser les missions quand les stats changent
  useEffect(() => {
    if (!loading && user?.id && missions.length > 0) {
      syncAllMissions();
    }
  }, [stats, ownedItems, equipped, purchaseHistory])

  // Effet pour synchroniser périodiquement (toutes les 30 secondes)
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(async () => {
      if (!missionsLoading) {
        await syncAllMissions();
      }
    }, 30000); // 30 secondes
    
    return () => clearInterval(interval);
  }, [user, missionsLoading])

  useEffect(() => {
    setLevelInfo(getLevel(xp))
  }, [xp])

  // --- Au chargement ---
  useEffect(() => {
    async function loadUserPass() {
      const { data, error } = await supabase
        .from('user_pass')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCoins(data.coins);
        setOwnedItems(data.owned_items);
        setEquipped(data.equipped);
        // ...etc
      } else {
        // Si pas de ligne, on la crée
        await supabase.from('user_pass').insert({
          user_id: user.id,
          coins: 200,
          owned_items: ['hat_chef'],
          equipped: { ...DEFAULT_CHEF, hat: 'hat_chef' }
        });
        setCoins(200);
        setOwnedItems(['hat_chef']);
        setEquipped({ ...DEFAULT_CHEF, hat: 'hat_chef' });
      }
    }
    if (user?.id) loadUserPass();
  }, [user]);

  // --- Gestion achat objet avec feedback et historique ---
  const buyItem = async (item) => {
    if (ownedItems.includes(item.id) || coins < item.price) return;
    const newCoins = coins - item.price;
    const newOwned = [...ownedItems, item.id];
    setCoins(newCoins);
    setOwnedItems(newOwned);
    
    // Sauvegarder l'historique d'achats
    const newPurchaseHistory = [
      { date: new Date(), item, price: item.price },
      ...purchaseHistory
    ];
    setPurchaseHistory(newPurchaseHistory);
    
    // Sauvegarder dans localStorage pour les missions
    try {
      localStorage.setItem('coco_purchase_history', JSON.stringify(newPurchaseHistory));
    } catch (error) {
      console.error('Erreur sauvegarde historique achats:', error);
    }
    
    setShopFeedback({ type: 'success', msg: `✅ ${item.name} acheté !` })
    setTimeout(() => setShopFeedback(null), 2000)
    setCoinAnim(true)
    setTimeout(() => setCoinAnim(false), 900)
    
    // --- À chaque achat ou modification ---
    async function updateUserPass(newFields) {
      await supabase
        .from('user_pass')
        .update(newFields)
        .eq('user_id', user.id);
    }
    await updateUserPass({ 
      coins: newCoins, 
      owned_items: newOwned,
      purchase_history: newPurchaseHistory 
    });
    
    // Synchroniser les missions après achat
    setTimeout(async () => {
      await syncAllMissions();
    }, 500);
  }

  // --- Gestion équipement objet avec feedback ---
  const equipItem = (item) => {
    setEquipped(prev => {
      // Déséquipe si déjà équipé
      if (prev[item.type] === item.id) {
        setShopFeedback({ type: 'info', msg: `❎ ${item.name} retiré.` })
        setTimeout(() => setShopFeedback(null), 1500)
        return { ...prev, [item.type]: null }
      }
      setShopFeedback({ type: 'success', msg: `🎉 ${item.name} équipé !` })
      setTimeout(() => setShopFeedback(null), 1500)
      return { ...prev, [item.type]: item.id }
    })
  }

  // --- Validation unique des quêtes journalières ---
  const canValidateChallenge = (challengeId) => {
    const today = new Date().toISOString().slice(0, 10)
    return !completedChallenges[challengeId] || completedChallenges[challengeId] !== today
  }
  const validateChallenge = (challenge) => {
    if (!canValidateChallenge(challenge.id)) return
    gainCoins(20)
    const today = new Date().toISOString().slice(0, 10)
    const updated = { ...completedChallenges, [challenge.id]: today }
    setCompletedChallenges(updated)
    localStorage.setItem('coco_daily_challenges', JSON.stringify(updated))
    setShopFeedback({ type: 'success', msg: `Défi validé ! +20 CocoCoins` })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Animation gain de coins (ex: défi validé) ---
  const gainCoins = (amount = 20) => {
    setCoins(prev => prev + amount)
    setCoinAnim(true)
    setTimeout(() => setCoinAnim(false), 900)
    setShopFeedback({ type: 'success', msg: `+${amount} CocoCoins !` })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Favoris ---
  const toggleFavorite = (itemId) => {
    setFavoriteItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  // --- Tout déséquiper ---
  const unequipAll = () => {
    setEquipped({ ...DEFAULT_CHEF })
    setShopFeedback({ type: 'info', msg: 'Tout déséquipé !' })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Dressing modal : aperçu avatar + équipement complet ---
  const renderDressing = () => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
      onClick={() => setDressingOpen(false)}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 420,
          width: '95%',
          padding: 28,
          boxShadow: '0 12px 40px #0002',
          position: 'relative',
          animation: 'dressingPop 0.3s'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setDressingOpen(false)}
          style={{
            position: 'absolute',
            top: 14, right: 18,
            background: 'none',
            border: 'none',
            fontSize: 22,
            color: '#f59e0b',
            cursor: 'pointer',
            fontWeight: 700
          }}
          aria-label="Fermer"
        >✕</button>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            fontWeight: 800,
            fontSize: '1.3rem',
            color: '#f59e0b',
            marginBottom: 6
          }}>Mon avatar chef</div>
          <div style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: 10
          }}>Personnalisez votre chef avec vos objets débloqués !</div>
        </div>
        {/* Avatar en grand */}
        <div style={{
          width: 180, height: 180, margin: '0 auto 18px auto',
          position: 'relative', background: '#fef3c7', borderRadius: '50%',
          boxShadow: '0 2px 18px #f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {renderChefAvatar({ size: 180 })}
        </div>
        {/* Tabs catégories */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap'
        }}>
          {ITEM_TYPES.filter(t => t.id !== 'all').map(cat => (
            <button
              key={cat.id}
              onClick={() => setDressingTab(cat.id)}
              style={{
                background: dressingTab === cat.id ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
                color: dressingTab === cat.id ? 'white' : '#f59e0b',
                border: dressingTab === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {/* Objets équipables */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10
        }}>
          {SHOP_ITEMS.filter(i => i.type === dressingTab && ownedItems.includes(i.id)).length === 0 && (
            <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.95rem' }}>
              Aucun objet débloqué pour cette catégorie
            </span>
          )}
          {SHOP_ITEMS.filter(i => i.type === dressingTab && ownedItems.includes(i.id)).map(item => (
            <div key={item.id} style={{
              background: equipped[dressingTab] === item.id ? '#f59e0b' : '#f3f4f6',
              color: equipped[dressingTab] === item.id ? 'white' : '#92400e',
              borderRadius: 10,
              padding: '10px 12px',
              fontWeight: 700,
              fontSize: 22,
              cursor: 'pointer',
              boxShadow: equipped[dressingTab] === item.id ? '0 2px 8px #f59e0b33' : 'none',
              border: equipped[dressingTab] === item.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              transition: 'all 0.2s'
            }}
              title={item.name}
              onClick={() => equipItem(item)}
            >
              {item.icon}
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 2,
                color: equipped[dressingTab] === item.id ? 'white' : '#92400e'
              }}>{item.name}</div>
            </div>
          ))}
          {/* Déséquiper */}
          {equipped[dressingTab] && (
            <button
              onClick={() => equipItem({ ...SHOP_ITEMS.find(i => i.id === equipped[dressingTab]), id: equipped[dressingTab] })}
              style={{
                background: '#fff',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                borderRadius: 10,
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: 16,
                marginLeft: 8,
                cursor: 'pointer'
              }}
            >
              Retirer
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.95rem', marginTop: 8 }}>
          Cliquez sur un objet pour l'équiper ou le retirer.
        </div>
        <style jsx>{`
          @keyframes dressingPop {
            0% { opacity: 0; transform: scale(0.9);}
            100% { opacity: 1; transform: scale(1);}
          }
        `}</style>
      </div>
    </div>
  )

  // --- Rendu avatar chef modifié pour supporter la taille et un placement plus précis ---
  const renderChefAvatar = (opts = {}) => {
    const size = opts.size || 110
    const equippedToShow = previewEquip
      ? { ...equipped, [previewEquip.type]: previewEquip.id }
      : equipped

    // Helper pour effet brillance sur le contour
    const avatarBorderStyle = {
      boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
      border: '3px solid #fff',
      background: 'linear-gradient(135deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: '50%',
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      zIndex: 0,
      pointerEvents: 'none'
    }

    // Placement précis pour chaque type d'objet
    return (
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        filter: previewEquip ? 'brightness(1.1) drop-shadow(0 0 8px #f59e0b88)' : 'none',
        transition: 'filter 0.3s',
        background: 'linear-gradient(135deg, #fffbe6 60%, #fef3c7 100%)',
        borderRadius: '50%',
        boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
        overflow: 'visible'
      }}>
        {/* Contour et effet brillance */}
        <div style={avatarBorderStyle}></div>
        {/* Fond */}
        {equippedToShow.background && (
          <div style={{
            fontSize: size * 0.38,
            position: 'absolute',
            left: size * 0.08,
            top: size * 0.08,
            zIndex: 1,
            opacity: 0.18,
            filter: 'blur(1px) brightness(1.1)'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.background)?.icon}
          </div>
        )}
        {/* Base chef */}
        <div style={{
          fontSize: size * 0.39,
          position: 'absolute',
          left: size * 0.18,
          top: size * 0.18,
          zIndex: 2,
          transition: 'opacity 0.2s',
          textShadow: '0 2px 8px #f59e0b22'
        }}>🧑</div>
        {/* Chapeau */}
        {equippedToShow.hat && (
          <div style={{
            fontSize: size * 0.28,
            position: 'absolute',
            left: size * 0.32,
            top: size * -0.07,
            zIndex: 5,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.hat ? 'scale(1.18) rotate(-10deg)' : 'rotate(-5deg)',
            filter: getItemGlow(equippedToShow.hat),
            textShadow: '0 2px 8px #f59e0b44'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.hat)?.icon}
          </div>
        )}
        {/* Lunettes */}
        {equippedToShow.glasses && (
          <div style={{
            fontSize: size * 0.19,
            position: 'absolute',
            left: size * 0.44,
            top: size * 0.41,
            zIndex: 6,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.glasses ? 'scale(1.15) rotate(8deg)' : 'rotate(2deg)',
            filter: getItemGlow(equippedToShow.glasses),
            textShadow: '0 1px 4px #37415122'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.glasses)?.icon}
          </div>
        )}
        {/* Tablier */}
        {equippedToShow.apron && (
          <div style={{
            fontSize: size * 0.22,
            position: 'absolute',
            left: size * 0.41,
            top: size * 0.74,
            zIndex: 3,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.apron ? 'scale(1.12)' : 'none',
            filter: getItemGlow(equippedToShow.apron),
            textShadow: '0 1px 4px #05966922'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.apron)?.icon}
          </div>
        )}
        {/* Accessoire */}
        {equippedToShow.accessory && (
          <div style={{
            fontSize: size * 0.16,
            position: 'absolute',
            left: size * 0.74,
            top: size * 0.74,
            zIndex: 7,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.accessory ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.accessory),
            textShadow: '0 1px 4px #10b98122'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.accessory)?.icon}
          </div>
        )}
        {/* Visage (moustache/barbe) */}
        {equippedToShow.face && (
          <div style={{
            fontSize: size * 0.15,
            position: 'absolute',
            left: size * 0.56,
            top: size * 0.68,
            zIndex: 8,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.face ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.face),
            textShadow: '0 1px 4px #92400e22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.face)?.icon}
          </div>
        )}
        {/* Effet spécial */}
        {equippedToShow.effect && (
          <div style={{
            fontSize: size * 0.21,
            position: 'absolute',
            left: size * 0.73,
            top: size * 0.09,
            zIndex: 9,
            animation: 'effectAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.effect),
            textShadow: '0 1px 4px #f59e0b22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.effect)?.icon}
          </div>
        )}
        {/* Badge */}
        {equippedToShow.badge && (
          <div style={{
            fontSize: size * 0.13,
            position: 'absolute',
            left: size * 0.09,
            top: size * 0.82,
            zIndex: 10,
            filter: getItemGlow(equippedToShow.badge),
            textShadow: '0 1px 4px #f59e0b22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.badge)?.icon}
          </div>
        )}
        {/* Mascotte */}
        {equippedToShow.mascot && (
          <div style={{
            fontSize: size * 0.18,
            position: 'absolute',
            left: size * 0.82,
            top: size * 0.82,
            zIndex: 11,
            animation: 'mascotAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.mascot),
            textShadow: '0 1px 4px #8b5cf622'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.mascot)?.icon}
          </div>
        )}
        {/* Effet de brillance sur le contour */}
        <div style={{
          position: 'absolute',
          left: size * 0.05,
          top: size * 0.05,
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
          zIndex: 12,
          pointerEvents: 'none',
          animation: 'avatarShine 2.5s infinite alternate'
        }} />
        <style jsx>{`
          @keyframes effectAnim {
            0% { filter: brightness(1) scale(1);}
            100% { filter: brightness(1.2) scale(1.08);}
          }
          @keyframes mascotAnim {
            0% { transform: scale(1) rotate(-5deg);}
            100% { transform: scale(1.12) rotate(8deg);}
          }
          @keyframes avatarShine {
            0% { opacity: 0.6;}
            100% { opacity: 1;}
          }
        `}</style>
      </div>
    )
  }

  const percent = Math.min(
    100,
    Math.round(
      ((xp - levelInfo.current.xp) /
        (levelInfo.next.xp - levelInfo.current.xp)) *
        100
    )
  )

  // --- Onglets navigation ---
  const renderTabs = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 24,
      marginTop: 8
    }}>
      <button
        onClick={() => setActiveTab('progression')}
        style={{
          background: activeTab === 'progression' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
          color: activeTab === 'progression' ? 'white' : '#f59e0b',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'progression' ? '0 2px 8px #f59e0b33' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Progression
      </button>
      <button
        onClick={() => setActiveTab('boutique')}
        style={{
          background: activeTab === 'boutique' ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
          color: activeTab === 'boutique' ? 'white' : '#10b981',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'boutique' ? '0 2px 8px #10b98133' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Boutique
      </button>
      <button
        onClick={() => setActiveTab('classement')}
        style={{
          background: activeTab === 'classement' ? 'linear-gradient(135deg, #6366f1, #a5b4fc)' : '#fff',
          color: activeTab === 'classement' ? 'white' : '#6366f1',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'classement' ? '0 2px 8px #6366f133' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Classement
      </button>
      <button
        onClick={() => setDressingOpen(true)}
        style={{
          background: dressingOpen ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
          color: dressingOpen ? 'white' : '#f59e0b',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: dressingOpen ? '0 2px 8px #f59e0b33' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Dressing
      </button>
    </div>
  )

  // --- Classement mensuel XP ---
  const renderLeaderboardTab = () => (
    <div>
      <div style={{
        fontWeight: 700,
        fontSize: '1.1rem',
        marginBottom: 18,
        color: '#6366f1',
        textAlign: 'center'
      }}>
        Classement mensuel des utilisateurs (recettes publiées sur les 30 derniers jours)
      </div>
      {leaderboardLoading ? (
        <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
          Chargement du classement...
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg,#e0e7ff 0%,#f3f4f6 100%)',
          borderRadius: 18,
          boxShadow: '0 4px 24px #6366f122',
          padding: '18px 10px 10px 10px',
          marginBottom: 24,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '1rem'
          }}>
            <thead>
              <tr style={{ color: '#6366f1', fontWeight: 700 }}>
                <th style={{ padding: 8, textAlign: 'center' }}>#</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Recettes (30j)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 20).map((u, idx) => {
                // Décoration rang
                let rankBg = 'transparent', rankColor = '#374151', rankIcon = '';
                if (idx === 0) { rankBg = '#fef3c7'; rankColor = '#f59e0b'; rankIcon = '🥇'; }
                else if (idx === 1) { rankBg = '#e0e7ff'; rankColor = '#6366f1'; rankIcon = '🥈'; }
                else if (idx === 2) { rankBg = '#f3f4f6'; rankColor = '#a3a3a3'; rankIcon = '🥉'; }
                return (
                  <tr key={u.user_id} style={{
                    background: u.isYou ? '#f3f4f6' : rankBg,
                    fontWeight: u.isYou ? 700 : (idx < 3 ? 700 : 500),
                    color: u.isYou ? '#f59e0b' : rankColor,
                    boxShadow: u.isYou ? '0 2px 8px #f59e0b22' : (idx < 3 ? '0 2px 8px #6366f122' : 'none'),
                    borderRadius: 12,
                    transition: 'background 0.2s'
                  }}>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: idx < 3 ? 22 : 16,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : idx === 2 ? '#a3a3a3' : '#374151'
                    }}>
                      {rankIcon ? <span style={{ marginRight: 4 }}>{rankIcon}</span> : null}
                      {idx + 1}
                    </td>
                    <td style={{
                      padding: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: u.isYou ? '1.05rem' : '1rem'
                    }}>
                      {u.avatar_url && (
                        <img src={u.avatar_url} alt="" style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: idx < 3 ? `2px solid ${idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3'}` : '1px solid #e5e7eb',
                          boxShadow: idx < 3 ? '0 2px 8px #6366f122' : 'none'
                        }} />
                      )}
                      <span>{u.display_name}</span>
                      {u.isYou && <span style={{
                        color: '#f59e0b',
                        fontWeight: 700,
                        marginLeft: 4,
                        fontSize: '0.98rem',
                        background: '#fffbe6',
                        borderRadius: 6,
                        padding: '2px 6px'
                      }}>(Vous)</span>}
                    </td>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx < 3 ? '#10b981' : '#374151',
                      fontSize: idx < 3 ? '1.1rem' : '1rem'
                    }}>
                      {u.recipesCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Podium visuel */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 18,
            marginBottom: 6
          }}>
            {leaderboard[1] && (
              <div style={{
                background: '#e0e7ff',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥈</div>
                <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{leaderboard[1].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[1].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[0] && (
              <div style={{
                background: 'linear-gradient(135deg,#fef3c7 60%,#fffbe6 100%)',
                borderRadius: 14,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 80,
                boxShadow: '0 4px 16px #f59e0b22',
                transform: 'scale(1.12)'
              }}>
                <div style={{ fontSize: 28, color: '#f59e0b', animation: 'podiumCrown 1.2s infinite alternate' }}>🥇</div>
                <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1.1rem' }}>{leaderboard[0].display_name}</div>
                <div style={{ color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>{leaderboard[0].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[2] && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥉</div>
                <div style={{ fontWeight: 700, color: '#a3a3a3', fontSize: '1rem' }}>{leaderboard[2].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[2].recipesCount} recettes</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ color: '#6366f1', fontSize: '0.95rem', textAlign: 'center', marginTop: 8 }}>
        Ce classement est basé sur le nombre de recettes publiées par chaque utilisateur au cours des 30 derniers jours.
      </div>
      <style jsx>{`
        @keyframes podiumCrown {
          0% { transform: scale(1) rotate(-8deg);}
          100% { transform: scale(1.15) rotate(8deg);}
        }
      `}</style>
    </div>
  )

  // --- Solde CocoCoins bien intégré ---
  const renderCoinBalance = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 12,
      marginTop: 8,
      background: 'linear-gradient(90deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: 18,
      padding: '10px 24px',
      boxShadow: '0 2px 8px #f59e0b11',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#f59e0b',
      position: 'relative'
    }}>
      <span style={{ fontSize: 28, marginRight: 6, animation: coinAnim ? 'coinSpin 0.8s' : 'none' }}>🪙</span>
      <span style={{
        fontWeight: 900,
        fontSize: '1.3rem',
        color: '#f59e0b',
        letterSpacing: '-1px'
      }}>{coins}</span>
      <span style={{
        marginLeft: 4,
        fontWeight: 600,
        color: '#92400e',
        fontSize: '1.05rem'
      }}>CocoCoins</span>
      <span style={{
        marginLeft: 10,
        color: '#6b7280',
        fontSize: '0.95rem',
        fontWeight: 400
      }}>(solde actuel)</span>
    </div>
  )

  // --- Boutique onglet dédié ---
  const renderShopTab = () => {
    // Filtrage par type
    const filtered = shopFilter === 'all'
      ? SHOP_ITEMS
      : SHOP_ITEMS.filter(i => i.type === shopFilter)
    // Objets favoris
    const favoriteObjs = SHOP_ITEMS.filter(i => favoriteItems.includes(i.id))
    // Stats par catégorie
    const ownedByType = type =>
      SHOP_ITEMS.filter(i => i.type === type && ownedItems.includes(i.id)).length
    const totalByType = type =>
      SHOP_ITEMS.filter(i => i.type === type).length

    return (
      <div>
        {/* Filtres par catégorie */}
        <div style={{
          display: 'flex', 
          gap: 6, // Réduction
          justifyContent: 'flex-start', 
          marginBottom: 16, // Réduction
          flexWrap: 'wrap',
          overflowX: 'auto',
          paddingBottom: 4
        }}>
          {ITEM_TYPES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopFilter(cat.id)}
              style={{
                background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                color: '#374151',
                border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 8, // Réduction
                padding: '6px 10px', // Réduction
                fontWeight: 700,
                fontSize: '0.8rem', // Réduction
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                minWidth: 'auto'
              }}
            >
              <span style={{ fontSize: '1rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
              {cat.id !== 'all' && (
                <span style={{
                  marginLeft: 6,
                  fontSize: '0.9rem',
                  color: '#f59e0b',
                  fontWeight: 600
                }}>
                  {ownedByType(cat.id)}/{totalByType(cat.id)}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={unequipAll}
            style={{
              background: 'transparent',
              color: '#f59e0b',
              border: '1px solid #f59e0b',
              borderRadius: 10,
              padding: '7px 16px',
              fontWeight: 700,
              fontSize: '1rem',
              marginLeft: 10,
              cursor: 'pointer'
            }}
          >
            Tout déséquiper
          </button>
        </div>
        {/* Objets favoris */}
        {favoriteObjs.length > 0 && (
          <div style={{
            marginBottom: 18,
            background: 'none',
            borderRadius: 12,
            padding: 0,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.05rem' }}>⭐ Favoris :</span>
            {favoriteObjs.map(item => (
              <span key={item.id} style={{
                fontSize: 22,
                marginRight: 4,
                filter: getItemGlow(item.id)
              }}>
                {item.icon}
              </span>
            ))}
          </div>
        )}
        {/* Grille boutique modernisée et épurée */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 22,
          marginBottom: 18
        }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff',
              border: ownedItems.includes(item.id)
                ? `1.5px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : item.rarity === 'rare' ? '#3b82f6' : '#e5e7eb'}`
                : '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 18,
              minWidth: 120,
              textAlign: 'center',
              boxShadow: 'none',
              opacity: ownedItems.includes(item.id) ? 1 : 0.85,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'border 0.2s, box-shadow 0.2s'
            }}
              onMouseEnter={() => ownedItems.includes(item.id) && setPreviewEquip(item)}
              onMouseLeave={() => setPreviewEquip(null)}
            >
              {/* Badge rareté discret */}
              <div style={{
                position: 'absolute',
                top: 10,
                right: 10,
                fontSize: 11,
                fontWeight: 700,
                color: item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : item.rarity === 'rare' ? '#3b82f6' : '#a3a3a3',
                background: 'none',
                borderRadius: 6,
                padding: '0 6px'
              }}>
                {item.rarity === 'legendary' ? '★' : item.rarity === 'epic' ? '✦' : item.rarity === 'rare' ? '◆' : ''}
              </div>
              {/* Badge nouveau */}
              {item.isNew && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#f59e0b',
                  background: 'none',
                  borderRadius: 6,
                  padding: '0 6px'
                }}>
                  Nouveau
                </div>
              )}
              {/* Icône objet */}
              <div style={{
                fontSize: 38,
                marginBottom: 8,
                filter: getItemGlow(item.id),
                transition: 'filter 0.2s'
              }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: '#1f2937' }}>{item.name}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{item.price} 🪙</div>
              {/* Favori */}
              <button
                onClick={() => toggleFavorite(item.id)}
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: favoriteItems.includes(item.id) ? '#f59e0b' : '#e5e7eb',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                title={favoriteItems.includes(item.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {favoriteItems.includes(item.id) ? '★' : '☆'}
              </button>
              {/* Actions achat/équipement */}
              {ownedItems.includes(item.id) ? (
                <button
                  style={{
                    background: equipped[item.type] === item.id ? '#10b981' : '#f3f4f6',
                    color: equipped[item.type] === item.id ? 'white' : '#059669',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 0',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 15,
                    marginTop: 8,
                    width: '100%'
                  }}
                  onClick={() => equipItem(item)}
                >
                  {equipped[item.type] === item.id ? 'Équipé' : 'Équiper'}
                </button>
              ) : (
                <button
                  style={{
                    background: coins >= item.price ? '#f59e0b' : '#f3f4f6',
                    color: coins >= item.price ? 'white' : '#f59e0b',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 0',
                    fontWeight: 700,
                    cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                    fontSize: 15,
                    marginTop: 8,
                    width: '100%'
                  }}
                  disabled={coins < item.price}
                  onClick={() => buyItem(item)}
                >
                  Acheter
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Historique d'achats */}
        {purchaseHistory.length > 0 && (
          <div style={{
            marginTop: 18,
            fontSize: '0.95rem',
            color: '#92400e',
            background: '#fff',
            borderRadius: 10,
            padding: 10,
            boxShadow: '0 1px 4px #f59e0b11',
            maxWidth: 340,
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <b>Historique d'achats :</b>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {purchaseHistory.slice(0, 3).map((h, i) => (
                <li key={i}>
                  {h.item.icon} {h.item.name} <span style={{ color: '#f59e0b' }}>({h.item.price}🪙)</span> - {h.date.toLocaleTimeString('fr-FR')}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{
          marginTop: 24,
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.95rem'
        }}>
          D'autres objets et styles d'habillage arrivent bientôt !
        </div>
      </div>
    )
  }

  // --- Quiz du jour: helpers ---
  const todayStr = new Date().toISOString().slice(0, 10)
  const quizDoneToday = quizState?.date === todayStr
  const quizReward = 40

  // Ouvre le quiz modal avec une question aléatoire
  const openQuizModal = () => {
    if (quizDoneToday) return
    const idx = Math.floor(Math.random() * DAILY_QUIZ_QUESTIONS.length)
    setQuizQuestion(DAILY_QUIZ_QUESTIONS[idx])
    setQuizAnswer(null)
    setQuizFeedback(null)
    setQuizModalOpen(true)
  }

  // Gère la soumission du quiz
  const handleQuizSubmit = async () => {
    if (quizAnswer === null || !quizQuestion) return
    setQuizLoading(true)
    const isCorrect = quizAnswer === quizQuestion.answer
    setQuizFeedback({
      type: isCorrect ? 'success' : 'error',
      msg: isCorrect ? 'Bonne réponse ! +'+quizReward+' CocoCoins' : 'Mauvaise réponse !'
    })
    // Stocke le résultat du jour dans le localStorage
    const newQuizState = {
      date: todayStr,
      success: isCorrect
    }
    setQuizState(newQuizState)
    localStorage.setItem('coco_daily_quiz', JSON.stringify(newQuizState))
    // Ajoute à l'historique quiz pour XP
    let quizHistory = []
    try {
      quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]')
    } catch {}
    quizHistory.push({ date: todayStr, success: isCorrect })
    localStorage.setItem('coco_quiz_history', JSON.stringify(quizHistory))
    if (isCorrect) {
      setCoins(prev => prev + quizReward)
      setShopFeedback({ type: 'success', msg: `+${quizReward} CocoCoins (quiz)` })
      setTimeout(() => setShopFeedback(null), 1200)
    }
    setTimeout(() => {
      setQuizModalOpen(false)
      setQuizFeedback(null)
      setQuizAnswer(null)
    }, 1800)
    setQuizLoading(false)
  }

  // --- Charger le vrai classement mensuel XP ---
  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  // Fonction pour charger le classement (extracted for reuse)
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true)
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        setLeaderboardLoading(false)
        return
      }

      // 2. Récupérer toutes les recettes du dernier mois
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', oneMonthAgo.toISOString())
      if (recipesError) {
        console.error("[Classement] Erreur recipes:", recipesError)
      }

      // 3. Compter les recettes par utilisateur sur le dernier mois
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })

      // 4. Mapper les profils avec le nombre de recettes publiées
      const leaderboardData = (profilesData || []).map(profile => {
        const count = recipesCountMap[profile.user_id] || 0
        return {
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: count,
          isYou: user?.id === profile.user_id
        }
      })

      leaderboardData.sort((a, b) => b.recipesCount - a.recipesCount)
      setLeaderboard(leaderboardData)
    } catch (e) {
      console.error("[Classement] Exception générale:", e)
      setLeaderboard([])
    }
    setLeaderboardLoading(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{
          width: 60, height: 60, border: '4px solid #f59e0b33', borderTop: '4px solid #f59e0b',
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem'
        }} />
        <p style={{ color: '#f59e0b', fontWeight: 600 }}>Chargement de votre progression...</p>
        <style jsx>{`@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  // Ajout : Affichage de la ligue dans la progression
  const level = 1 + Math.floor((stats.recipesCount || 0) / 5);
  const league = getLeague(level);

  return (
    <div className={styles.trophyContainer} style={{ 
      maxWidth: 450, // Réduction pour mobile
      margin: '0 auto', 
      padding: '16px 12px', // Réduction du padding
      background: '#fefefe',
      minHeight: '100vh'
    }}>
      {/* Feedback achat/équipement - Version mobile */}
      {shopFeedback && (
        <div style={{
          position: 'fixed',
          top: 16, // Réduction
          left: '50%',
          transform: 'translateX(-50%)',
          background: shopFeedback.type === 'success' ? '#10b981' : '#f59e0b',
          color: 'white',
          padding: '8px 16px', // Réduction
          borderRadius: 12, // Réduction
          fontWeight: 700,
          fontSize: '0.9rem', // Réduction
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(16,185,129,0.2)', // Réduction
          animation: 'shopFeedbackAnim 0.6s',
          maxWidth: '90%', // Limite la largeur
          textAlign: 'center'
        }}>
          {shopFeedback.msg}
        </div>
      )}

      {/* Animation gain de coins - Version mobile */}
      {coinAnim && (
        <div style={{
          position: 'fixed',
          top: 60, // Réduction
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 24, // Réduction
          color: '#f59e0b',
          fontWeight: 900,
          zIndex: 9999,
          animation: 'coinAnim 0.8s'
        }}>
          🪙
        </div>
      )}

      {/* Solde CocoCoins - Version mobile compacte */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8, // Réduction
        marginBottom: 16, // Réduction
        marginTop: 4, // Réduction
        background: 'linear-gradient(90deg, #fffbe6 60%, #fef3c7 100%)',
        borderRadius: 14, // Réduction
        padding: '8px 18px', // Réduction
        boxShadow: '0 2px 6px #f59e0b11', // Réduction
        fontWeight: 700,
        fontSize: '1rem', // Réduction
        color: '#f59e0b'
      }}>
        <span style={{ fontSize: 20, marginRight: 4, animation: coinAnim ? 'coinSpin 0.8s' : 'none' }}>🪙</span>
        <span style={{
          fontWeight: 900,
          fontSize: '1.2rem', // Réduction
          color: '#f59e0b',
          letterSpacing: '-0.5px'
        }}>{coins}</span>
        <span style={{
          marginLeft: 4,
          fontWeight: 600,
          color: '#92400e',
          fontSize: '0.95rem' // Réduction
        }}>CocoCoins</span>
      </div>

      {/* Onglets navigation - Version mobile */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6, // Réduction
        marginBottom: 18, // Réduction
        overflowX: 'auto', // Scroll horizontal sur mobile
        paddingBottom: 4
      }}>
        {[
          { id: 'progression', label: 'Progression', color: '#f59e0b' },
          { id: 'boutique', label: 'Boutique', color: '#10b981' },
          { id: 'classement', label: 'Classement', color: '#6366f1' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` : '#fff',
              color: activeTab === tab.id ? 'white' : tab.color,
              border: 'none',
              borderRadius: 10, // Réduction
              padding: '8px 14px', // Réduction
              fontWeight: 700,
              fontSize: '0.85rem', // Réduction
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setDressingOpen(true)}
          style={{
            background: dressingOpen ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
            color: dressingOpen ? 'white' : '#f59e0b',
            border: 'none',
            borderRadius: 10,
            padding: '8px 14px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: 'auto'
          }}
        >
          👗
        </button>
      </div>

      {/* Contenu selon l'onglet */}
      {activeTab === 'progression' ? (
        <>
          {/* Progression principale - Version mobile compacte */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: 18, // Réduction
            padding: '16px 18px', // Réduction
            marginBottom: 20, // Réduction
            color: 'white',
            boxShadow: '0 6px 20px #f59e0b22' // Réduction
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}> {/* Réduction */}
              {/* Avatar chef - Version mobile */}
              <div
                style={{
                  width: 60, height: 60, // Réduction importante
                  borderRadius: '50%', 
                  background: 'white',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1.8rem', // Réduction
                  color: '#f59e0b', 
                  fontWeight: 900, 
                  boxShadow: '0 2px 8px #f59e0b33', // Réduction
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0 // Empêche la réduction
                }}
                title="Personnaliser mon avatar"
                onClick={() => setDressingOpen(true)}
              >
                {renderChefAvatar({ size: 60 })} {/* Taille réduite */}
                <span style={{
                  position: 'absolute',
                  bottom: 0, right: 0,
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: 10, // Réduction
                  borderRadius: 6, // Réduction
                  padding: '1px 4px', // Réduction
                  fontWeight: 700,
                  boxShadow: '0 1px 4px #f59e0b33'
                }}>👗</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}> {/* Permet la troncature */}
                <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px', marginBottom: 2 }}>
                  Progression COCO
                </div>
                <div style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 500,
                  opacity: 0.9,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Chef'}
                </div>
              </div>
            </div>
            
            {/* Niveau et barre de progression - Version compacte */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8 }}>
                Niveau <span style={{ fontSize: '1.3rem', color: '#fff' }}>{levelInfo.current.level}</span> 
                <span style={{ fontSize: '0.9rem', fontWeight: 500, marginLeft: 4 }}>({levelInfo.current.label})</span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: 10, // Réduction
                height: 12, // Réduction
                margin: '8px 0', // Réduction
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg,${levelInfo.current.color},#f59e0b)`,
                  borderRadius: 10,
                  transition: 'width 0.5s'
                }} />
              </div>
              <div style={{ 
                fontSize: '0.85rem', // Réduction
                color: '#fff', 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: 6
              }}>
                <span>{xp} XP</span>
                <span>{levelInfo.next.xp} XP pour niv. {levelInfo.next.level}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#fff', opacity: 0.9 }}>
                XP = 10 par recette + 40 par quiz réussi
              </div>
            </div>
          </div>

          {/* Statistiques - Grille mobile optimisée */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)', // 3 colonnes sur mobile
            gap: 8, // Réduction
            marginBottom: 20 // Réduction
          }}>
            {[
              { value: xp, label: 'XP', color: '#f59e0b' },
              { value: trophies.unlockedCount, label: 'Trophées', color: '#10b981' },
              { value: stats.recipesCount, label: 'Recettes', color: '#f59e0b' },
              { value: stats.friendsCount, label: 'Amis', color: '#3b82f6' },
              { value: stats.likesReceived, label: 'Likes', color: '#ef4444' },
              { value: stats.streak, label: 'Streak 🔥', color: '#f59e0b' }
            ].map((stat, index) => (
              <div key={index} style={{
                background: '#fff', 
                borderRadius: 12, // Réduction
                padding: '10px 8px', // Réduction
                boxShadow: '0 2px 6px #f59e0b11', // Réduction
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: stat.color, marginBottom: 2 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Streak & Daily Reward - Version mobile */}
          <div style={{
            background: '#fffbe6',
            borderRadius: 14, // Réduction
            padding: '14px 16px', // Réduction
            marginBottom: 20, // Réduction
            textAlign: 'center',
            fontWeight: 600,
            color: '#f59e0b',
            fontSize: '1rem', // Réduction
            boxShadow: '0 2px 6px #f59e0b11'
          }}>
            <div style={{ marginBottom: 10, fontSize: '0.95rem' }}>
              🔥 Série : {stats.streak || 0} jour{(stats.streak || 0) > 1 ? 's' : ''}
            </div>
            <button
              onClick={async () => {
                const today = new Date().toISOString().slice(0, 10);
                
                try {
                  // SÉCURITÉ: Vérifier les données actuelles en base de données
                  const { data: currentData, error: checkError } = await supabase
                    .from('user_pass')
                    .select('last_claimed, streak, coins')
                    .eq('user_id', user.id)
                    .single()

                  if (checkError) throw checkError

                  // Si déjà récupéré aujourd'hui, ne rien faire
                  if (currentData?.last_claimed === today) {
                    setShopFeedback({ type: 'info', msg: 'Récompense déjà récupérée aujourd\'hui' })
                    setTimeout(() => setShopFeedback(null), 2000)
                    return
                  }

                  // Fonction helper pour calculer le nouveau streak
                  const isYesterday = (dateStr) => {
                    if (!dateStr) return false
                    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                    return dateStr === yesterday
                  }
                  
                  // Calcul sécurisé du nouveau streak avec les données de la DB
                  const currentStreak = currentData?.streak || 0;
                  const lastClaimedFromDB = currentData?.last_claimed;
                  const currentCoins = currentData?.coins || 0;
                  
                  const newStreak = !lastClaimedFromDB ? 1 : // Première fois
                                   isYesterday(lastClaimedFromDB) ? currentStreak + 1 : // Continuité
                                   1; // Rupture, on recommence
                  
                  // Calcul de la récompense basé sur le nouveau streak
                  const REWARDS = [20, 25, 30, 40, 50, 60, 100];
                  const rewardIndex = Math.min(newStreak - 1, REWARDS.length - 1);
                  const reward = REWARDS[rewardIndex];
                  const newCoins = currentCoins + reward;
                  
                  // Update Supabase avec vérification de concurrence
                  const { error } = await supabase
                    .from('user_pass')
                    .update({
                      last_claimed: today,
                      streak: newStreak,
                      coins: newCoins,
                      updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('last_claimed', lastClaimedFromDB) // Vérification de concurrence
                  
                  if (error) throw error;
                  
                  // Mise à jour de l'état local SEULEMENT après succès
                  setCoins(newCoins);
                  setStats(prev => ({
                    ...prev,
                    streak: newStreak,
                    lastClaimed: today
                  }));
                  
                  setShopFeedback({ 
                    type: 'success', 
                    msg: `+${reward} CocoCoins ! Série : ${newStreak} jour${newStreak > 1 ? 's' : ''}` 
                  });
                  setTimeout(() => setShopFeedback(null), 3000);

                } catch (error) {
                  console.error('Erreur lors de la récupération de la récompense:', error);
                  setShopFeedback({ type: 'error', msg: 'Erreur lors de la récupération' });
                  setTimeout(() => setShopFeedback(null), 2000);
                }
              }}
              disabled={(() => {
                const today = new Date().toISOString().slice(0, 10);
                return stats.lastClaimed === today;
              })()}
              style={{
                background: (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  return stats.lastClaimed === today ? '#e5e7eb' : 'linear-gradient(90deg,#f59e0b,#fbbf24)';
                })(),
                color: (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  return stats.lastClaimed === today ? '#9ca3af' : 'white';
                })(),
                border: 'none',
                borderRadius: 8, // Réduction
                padding: '8px 14px', // Réduction
                fontWeight: 700,
                fontSize: '0.9rem', // Réduction
                cursor: (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  return stats.lastClaimed === today ? 'not-allowed' : 'pointer';
                })(),
                marginBottom: 6,
                boxShadow: (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  return stats.lastClaimed === today ? 'none' : '0 2px 6px #f59e0b33';
                })(),
                transition: 'all 0.2s',
                width: '100%' // Pleine largeur sur mobile
              }}
            >
              {(() => {
                const today = new Date().toISOString().slice(0, 10);
                
                if (stats.lastClaimed === today) {
                  return '✅ Déjà récupéré aujourd\'hui';
                }
                
                const isYesterday = (dateStr) => {
                  if (!dateStr) return false
                  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                  return dateStr === yesterday
                }
                
                const currentStreak = stats.streak || 0;
                const nextStreak = !stats.lastClaimed ? 1 : 
                                  isYesterday(stats.lastClaimed) ? currentStreak + 1 : 1;
                const REWARDS = [20, 25, 30, 40, 50, 60, 100];
                const rewardIndex = Math.min(nextStreak - 1, REWARDS.length - 1);
                const reward = REWARDS[rewardIndex];
                
                return `🎁 +${reward} CocoCoins`;
              })()}
            </button>
            <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 6 }}>
              Connectez-vous chaque jour !
            </div>
          </div>

          {/* Badges et trophées - Version mobile */}
          <div style={{ marginBottom: 20 }}>

            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: '#92400e' }}>
              Badges & Trophées
            </div>
            <div style={{
              display: 'flex', 
              gap: 8, // Réduction
              flexWrap: 'wrap', 
              alignItems: 'center', 
              minHeight: 40 // Réduction
            }}>
              {trophies.unlocked.length === 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                  Aucun badge débloqué
                </span>
              )}
              {trophies.unlocked.slice(0, 6).map(trophy => ( // Moins de badges affichés
                <div key={trophy.id} title={trophy.name} style={{
                  background: '#fff', 
                  borderRadius: 10, // Réduction
                  padding: '6px 8px', // Réduction
                  fontSize: '1.1rem', // Réduction
                  boxShadow: '0 2px 6px #f59e0b11',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  animation: 'bounce 1.2s infinite alternate',
                  minWidth: 'auto'
                }}>
                  <span>{trophy.icon}</span>
                  <span style={{ fontSize: '0.6rem', color: '#92400e', fontWeight: 600, textAlign: 'center' }}>
                    {trophy.name.length > 8 ? trophy.name.substring(0, 8) + '...' : trophy.name}
                  </span>
                </div>
              ))}
              {trophies.unlocked.length > 6 && (
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
                  +{trophies.unlocked.length - 6}
                </span>
              )}
            </div>
          </div>

          {/* Missions actives - Version complète */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 12 
            }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#8b5cf6' }}>
                Missions actives
              </div>
              <div style={{
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: 600
              }}>
                {completedMissions.length} terminées
              </div>
            </div>

            {/* Grille des missions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              marginBottom: 16
            }}>
              {missions.map(mission => {
                const progressData = missionProgresses[mission.id] || { current: 0, target: mission.target, percent: 0 };
                const progress = progressData.current;
                const percent = progressData.percent;
                const isCompleted = completedMissions.includes(mission.id);
                
                return (
                  <div key={mission.id} style={{
                    background: isCompleted ? 
                      'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 
                      'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
                    border: isCompleted ? '2px solid #10b981' : '1px solid #e5e7eb',
                    borderRadius: 14,
                    padding: '12px 10px',
                    textAlign: 'center',
                    position: 'relative',
                    boxShadow: isCompleted ? 
                      '0 4px 12px rgba(16, 185, 129, 0.2)' : 
                      '0 2px 6px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                  }}>
                    {/* Badge de completion */}
                    {isCompleted && (
                      <div style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 700,
                        animation: 'completionBounce 0.6s ease-out'
                      }}>✓</div>
                    )}
                    
                    {/* Badge difficulté */}
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: mission.difficulty === 'facile' ? '#10b981' : 
                             mission.difficulty === 'moyen' ? '#f59e0b' : '#ef4444',
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 6,
                      padding: '2px 4px'
                    }}>
                      {mission.difficulty === 'facile' ? '●' : 
                       mission.difficulty === 'moyen' ? '●●' : '●●●'}
                    </div>
                    
                    {/* Icône principale */}
                    <div style={{ 
                      fontSize: 24, 
                      marginBottom: 6,
                      filter: isCompleted ? 'grayscale(0.3)' : 'none'
                    }}>
                      {mission.icon}
                    </div>
                    
                    {/* Titre */}
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: '0.8rem', 
                      color: isCompleted ? '#16a34a' : '#374151',
                      marginBottom: 6,
                      lineHeight: 1.2,
                      height: '2rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {mission.title}
                    </div>
                    
                    {/* Description */}
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      marginBottom: 8,
                      lineHeight: 1.1,
                      height: '1.4rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {mission.description}
                    </div>
                    
                    {/* Barre de progression avancée */}
                    <div style={{
                      background: '#f1f5f9',
                      borderRadius: 8,
                      height: 8,
                      marginBottom: 8,
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: isCompleted ? 
                          'linear-gradient(90deg, #10b981, #16a34a)' :
                          percent > 75 ? 'linear-gradient(90deg, #10b981, #16a34a)' :
                          percent > 50 ? 'linear-gradient(90deg, #f59e0b, #ea580c)' :
                          percent > 25 ? 'linear-gradient(90deg, #8b5cf6, #7c3aed)' :
                          'linear-gradient(90deg, #64748b, #475569)',
                        borderRadius: 8,
                        transition: 'width 0.8s ease-out',
                        position: 'relative'
                      }}>
                        {/* Effet de brillance */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          borderRadius: '8px 8px 0 0'
                        }} />
                      </div>
                    </div>
                    
                    {/* Stats et récompenses */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        fontSize: '0.7rem',
                        color: isCompleted ? '#16a34a' : '#6b7280',
                        fontWeight: 700
                      }}>
                        {progress}/{mission.target}
                        {percent === 100 && !isCompleted && (
                          <span style={{ color: '#f59e0b', marginLeft: 4 }}>🎯</span>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <div style={{
                          fontSize: '0.65rem',
                          color: '#f59e0b',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}>
                          <span>🪙{mission.reward.coins}</span>
                        </div>
                        {mission.reward.item && (
                          <div style={{
                            fontSize: '0.7rem',
                            filter: 'drop-shadow(0 0 4px #f59e0b)'
                          }}>👑</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Résumé des missions */}
            <div style={{
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderRadius: 12,
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              <div style={{ color: '#475569' }}>
                Missions en cours: {missions.filter(m => !completedMissions.includes(m.id)).length}
              </div>
              <div style={{ color: '#10b981' }}>
                Terminées: {completedMissions.length}
              </div>
            </div>
          </div>

          {/* Quiz du jour - Version mobile */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: '#10b981' }}>
              Quiz du jour
            </div>
            <div style={{
              background: '#fffbe6',
              borderRadius: 14,
              padding: '14px 16px',
              textAlign: 'center',
              fontWeight: 600,
              color: '#f59e0b',
              fontSize: '1rem',
              boxShadow: '0 2px 6px #f59e0b11'
            }}>
              {quizDoneToday ? (
                quizState.success ? (
                  <div>
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                      ✅ Quiz réussi !
                    </span>
                    <div style={{ color: '#92400e', fontSize: '0.85rem', marginTop: 4 }}>
                      Revenez demain
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.95rem' }}>
                      ❌ Quiz raté
                    </span>
                    <div style={{ color: '#92400e', fontSize: '0.85rem', marginTop: 4 }}>
                      Réessayez demain !
                    </div>
                  </div>
                )
              ) : (
                <button
                  onClick={openQuizModal}
                  style={{
                    background: 'linear-gradient(90deg,#10b981,#34d399)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px #10b98133',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                >
                  🎯 Quiz (+{quizReward} CocoCoins)
                </button>
              )}
            </div>
          </div>

          {/* Modal quiz - Version mobile */}
          {quizModalOpen && quizQuestion && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px' // Ajout padding mobile
            }}
              onClick={() => setQuizModalOpen(false)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 18, // Réduction
                  width: '100%',
                  maxWidth: 340, // Réduction
                  padding: '20px', // Réduction
                  boxShadow: '0 8px 30px #0002',
                  position: 'relative',
                  animation: 'dressingPop 0.3s',
                  maxHeight: '80vh', // Limite la hauteur
                  overflowY: 'auto' // Scroll si nécessaire
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setQuizModalOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 10, right: 12,
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    color: '#f59e0b',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >✕</button>
                
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981', marginBottom: 12 }}>
                  Quiz du jour
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 16, color: '#374151', lineHeight: 1.4 }}>
                  {quizQuestion.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {quizQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuizAnswer(idx)}
                      disabled={quizLoading}
                      style={{
                        background: quizAnswer === idx ? '#10b981' : '#f3f4f6',
                        color: quizAnswer === idx ? 'white' : '#374151',
                        border: quizAnswer === idx ? '2px solid #10b981' : '1px solid #e5e7eb',
                        borderRadius: 8, // Réduction
                        padding: '10px 12px',
                        fontWeight: 600, // Réduction
                        fontSize: '0.9rem', // Réduction
                        cursor: quizLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleQuizSubmit}
                  disabled={quizAnswer === null || quizLoading}
                  style={{
                    background: quizAnswer !== null ? 'linear-gradient(90deg,#10b981,#34d399)' : '#e5e7eb',
                    color: quizAnswer !== null ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: quizAnswer !== null ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {quizLoading ? 'Vérification...' : 'Valider'}
                </button>
                {quizFeedback && (  
                  <div style={{
                    marginTop: 12,
                    color: quizFeedback.type === 'success' ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textAlign: 'center'
                  }}>
                    {quizFeedback.msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'boutique' ? (
        // Boutique - Version mobile optimisée
        <div>
          {/* Filtres par catégorie - Version mobile */}
          <div style={{
            display: 'flex', 
            gap: 6, // Réduction
            justifyContent: 'flex-start', 
            marginBottom: 16, // Réduction
            flexWrap: 'wrap',
            overflowX: 'auto',
            paddingBottom: 4
          }}>
            {ITEM_TYPES.slice(0, 5).map(cat => ( // Limite les catégories affichées
              <button
                key={cat.id}
                onClick={() => setShopFilter(cat.id)}
                style={{
                  background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                  color: '#374151',
                  border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                  borderRadius: 8, // Réduction
                  padding: '6px 10px', // Réduction
                  fontWeight: 700,
                  fontSize: '0.8rem', // Réduction
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  minWidth: 'auto'
                }}
              >
                <span style={{ fontSize: '1rem', marginRight: 2 }}>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grille boutique - Version mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)', // 2 colonnes sur mobile
            gap: 12, // Réduction
            marginBottom: 16
          }}>
            {SHOP_ITEMS.filter(item => shopFilter === 'all' || item.type === shopFilter).slice(0, 8).map(item => (
              <div key={item.id} style={{
                background: '#fff',
                border: ownedItems.includes(item.id)
                  ? `1.5px solid ${item.rarity === 'legendary' ? '#f59e0b' : '#e5e7eb'}`
                  : '1px solid #e5e7eb',
                borderRadius: 12, // Réduction
                padding: '12px 10px', // Réduction
                textAlign: 'center',
                opacity: ownedItems.includes(item.id) ? 1 : 0.85,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'border 0.2s, box-shadow 0.2s'
              }}>
                {/* Badge rareté */}
                {item.rarity !== 'common' && (
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 8,
                    fontWeight: 700,
                    color: item.rarity === 'legendary' ? '#f59e0b' : '#8b5cf6'
                  }}>
                    {item.rarity === 'legendary' ? '★' : '✦'}
                  </div>
                )}
                
                {/* Icône objet */}
                <div style={{
                  fontSize: 28, // Réduction
                  marginBottom: 6,
                  filter: getItemGlow(item.id)
                }}>{item.icon}</div>
                
                <div style={{ 
                  fontWeight: 700, 
                  fontSize: 12, // Réduction
                  marginBottom: 4, 
                  color: '#1f2937',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
                </div>
                
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                  {item.price} 🪙
                </div>

                {/* Actions */}
                {ownedItems.includes(item.id) ? (
                  <button
                    style={{
                      background: equipped[item.type] === item.id ? '#10b981' : '#f3f4f6',
                      color: equipped[item.type] === item.id ? 'white' : '#059669',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 11,
                      width: '100%'
                    }}
                    onClick={() => equipItem(item)}
                  >
                    {equipped[item.type] === item.id ? 'Équipé' : 'Équiper'}
                  </button>
                ) : (
                  <button
                    style={{
                      background: coins >= item.price ? '#f59e0b' : '#f3f4f6',
                      color: coins >= item.price ? 'white' : '#f59e0b',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 8px',
                      fontWeight: 700,
                      cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                      fontSize: 11,
                      width: '100%'
                    }}
                    disabled={coins < item.price}
                    onClick={() => buyItem(item)}
                  >
                    Acheter
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* En-tête avec bouton d'actualisation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '1rem', // Réduction
            marginBottom: 14, // Réduction
            color: '#6366f1'
          }}>
            <div style={{
              textAlign: 'left',
              lineHeight: 1.3
            }}>
              Classement mensuel
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 500,
                color: '#64748b',
                marginTop: 2
              }}>
                Recettes publiées (30j)
              </div>
            </div>
            
            {/* Bouton d'actualisation compact */}
            <button
              onClick={fetchLeaderboard}
              disabled={leaderboardLoading}
              style={{
                background: leaderboardLoading 
                  ? 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' 
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: leaderboardLoading ? '#64748b' : 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: leaderboardLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: leaderboardLoading 
                  ? '0 2px 4px rgba(0,0,0,0.1)' 
                  : '0 3px 8px rgba(99, 102, 241, 0.3)'
              }}
            >
              <div style={{
                fontSize: '0.8rem',
                animation: leaderboardLoading ? 'spin 1s linear infinite' : 'none'
              }}>
                {leaderboardLoading ? '⟳' : '🔄'}
              </div>
              <span style={{ display: leaderboardLoading ? 'none' : 'block' }}>
                Actualiser
              </span>
            </button>
          </div>
          
          {leaderboardLoading ? (
            <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600, fontSize: '0.9rem' }}>
              <div style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #6366f1',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: 8
              }} />
              Chargement...
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg,#e0e7ff 0%,#f3f4f6 100%)',
              borderRadius: 14, // Réduction
              boxShadow: '0 4px 16px #6366f122', // Réduction
              padding: '14px 8px 8px 8px', // Réduction
              marginBottom: 20
            }}>
              {/* Top 3 - Version mobile compacte */}
              {leaderboard.slice(0, 3).length > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 10, // Réduction
                  marginBottom: 14,
                  flexWrap: 'wrap'
                }}>
                  {leaderboard.slice(0, 3).map((user, idx) => (
                    <div key={user.user_id} style={{
                      background: idx === 0 ? 'linear-gradient(135deg,#fef3c7 60%,#fffbe6 100%)' :
                                 idx === 1 ? '#e0e7ff' : '#f3f4f6',
                      borderRadius: 10,
                      padding: '8px 10px', // Réduction
                      textAlign: 'center',
                      minWidth: 60, // Réduction
                      transform: idx === 0 ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: idx === 0 ? '0 2px 8px #f59e0b22' : '0 1px 4px #6366f122',
                      animation: idx === 0 ? 'goldenPulse 2s ease-in-out infinite' : 'none'
                    }}>
                      <div style={{ fontSize: idx === 0 ? 20 : 16 }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </div>
                      <div style={{ 
                        fontWeight: 700, 
                        color: idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3',
                        fontSize: '0.8rem',
                        marginBottom: 2
                      }}>
                        {user.display_name.length > 8 ? user.display_name.substring(0, 8) + '...' : user.display_name}
                      </div>
                      <div style={{ 
                        color: '#374151', 
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {user.recipesCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Liste complète - Version mobile */}
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {leaderboard.slice(0, 10).map((u, idx) => (
                  <div key={u.user_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px', // Réduction
                    background: u.isYou ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                    borderRadius: 8,
                    margin: '2px 0',
                    fontSize: '0.85rem', // Réduction
                    border: u.isYou ? '1px solid rgba(245, 158, 11, 0.3)' : 'none'
                  }}>
                    <div style={{
                      width: 24, // Réduction
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx < 3 ? (idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3') : '#374151'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{
                      flex: 1,
                      marginLeft: 8,
                      fontWeight: u.isYou ? 700 : 500,
                      color: u.isYou ? '#f59e0b' : '#374151',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {u.display_name}
                      {u.isYou && <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}> (Vous)</span>}
                    </div>
                    <div style={{
                      fontWeight: 700,
                      color: idx < 3 ? '#10b981' : '#374151',
                      minWidth: 30,
                      textAlign: 'right'
                    }}>
                      {u.recipesCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message d'encouragement - Version mobile */}
      <div style={{
        marginTop: 20,
        fontSize: 14, // Réduction
        color: '#10b981',
        fontWeight: 700,
        animation: 'pulse 1.5s infinite alternate',
        textAlign: 'center',
        lineHeight: 1.3,
        padding: '0 10px'
      }}>
        {percent === 100
          ? "🎉 Nouveau niveau atteint !"
          : activeTab === 'progression'
            ? "Continuez à cuisiner et partager !"
            : activeTab === 'boutique'
              ? "Personnalisez votre chef !"
              : "Montez dans le classement !"}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shopFeedbackAnim {
          0% { opacity: 0; transform: translateY(-20px);}
          100% { opacity: 1; transform: translateY(0);}
        }
        @keyframes coinAnim {
          0% { opacity: 0; transform: scale(0.7) translateY(0);}
          50% { opacity: 1; transform: scale(1.2) translateY(-20px);}
          100% { opacity: 0; transform: scale(0.8) translateY(-40px);}
        }
        @keyframes coinSpin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
        @keyframes bounce {
          0%,100% { transform: translateY(0);}
          50% { transform: translateY(-5px);}
        }
        @keyframes pulse {
          0%,100% { opacity: 1;}
          50% { opacity: 0.7;}
        }
        @keyframes dressingPop {
          0% { opacity: 0; transform: scale(0.9);}
          100% { opacity: 1; transform: scale(1);}
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }

        @keyframes goldenPulse {
          0%, 100% { 
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
          }
          50% { 
            transform: scale(1.08);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          }
        }
        
        @keyframes completionBounce {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
        
        /* Responsive spécifique */
        @media (max-width: 380px) {
          .trophyContainer {
            padding: 12px 8px !important;
          }
        }
        
        @media (max-width: 320px) {
          .trophyContainer {
            padding: 8px 6px !important;
          }
        }
      `}</style>
    </div>
  )
}