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
          // XP = points trophées + 10 * recettes + 5 * amis + 2 * likes + 2 * streak
          xpCalc = (trophyData.totalPoints || 0)
            + 10 * (userStats.recipesCount || 0)
            + 5 * (userStats.friendsCount || 0)
            + 2 * (userStats.likesReceived || 0)
            + 2 * (userStats.streak || 0)
          // Simule le streak et le classement si non dispo
          userStats.streak = userStats.streak || Math.floor(Math.random() * 10) + 1
          userStats.daysActive = userStats.daysActive || Math.floor(Math.random() * 120) + 1
        } catch (e) {}
      }
      if (isMounted) {
        setStats(userStats)
        setTrophies(trophyData)
        setXP(xpCalc)
        setLevelInfo(getLevel(xpCalc))
        setLoading(false)
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [user])

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
    setPurchaseHistory(prev => [
      { date: new Date(), item },
      ...prev
    ])
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
    await updateUserPass({ coins: newCoins, owned_items: newOwned });
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
        Classement mensuel XP des utilisateurs
      </div>
      {leaderboardLoading ? (
        <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
          Chargement du classement...
        </div>
      ) : (
        <table style={{
          width: '100%',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 2px 8px #6366f111',
          marginBottom: 24,
          fontSize: '1rem'
        }}>
          <thead>
            <tr style={{ color: '#6366f1', fontWeight: 700 }}>
              <th style={{ padding: 8 }}>#</th>
              <th style={{ padding: 8 }}>Utilisateur</th>
              <th style={{ padding: 8 }}>XP</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.slice(0, 20).map((u, idx) => (
              <tr key={u.user_id} style={{
                background: u.isYou ? '#f3f4f6' : 'transparent',
                fontWeight: u.isYou ? 700 : 500,
                color: u.isYou ? '#f59e0b' : '#374151'
              }}>
                <td style={{ padding: 8, textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.avatar_url && (
                    <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                  )}
                  {u.display_name}
                  {u.isYou && <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 4 }}>(Vous)</span>}
                </td>
                <td style={{ padding: 8, textAlign: 'center' }}>{u.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ color: '#6366f1', fontSize: '0.95rem', textAlign: 'center' }}>
        Basé sur l'activité du mois (XP = points trophées + recettes + amis + likes + streak)
      </div>
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
          display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap'
        }}>
          {ITEM_TYPES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopFilter(cat.id)}
              style={{
                background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                color: '#374151',
                border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: 4 }}>{cat.icon}</span>
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
    async function fetchLeaderboard() {
      setLeaderboardLoading(true)
      try {
        console.log("[Classement] Début fetchLeaderboard");
        // 1. Récupérer les 50 premiers utilisateurs actifs ce mois-ci (sans join)
        const { data: passData, error: passError } = await supabase
          .from('user_pass')
          .select(`
            user_id,
            coins,
            streak,
            last_claimed,
            trophies,
            recipes_count,
            friends_count,
            likes_received
          `)
          .limit(50)
        if (passError) {
          console.error("[Classement] Erreur user_pass:", passError)
          throw passError
        }
        console.log("[Classement] user_pass data:", passData)

        // 2. Récupérer les profils correspondants
        const userIds = (passData || []).map(u => u.user_id)
        let profilesMap = {}
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id,display_name,avatar_url')
            .in('user_id', userIds)
          if (profilesError) {
            console.error("[Classement] Erreur profiles:", profilesError)
          }
          console.log("[Classement] profiles data:", profilesData)
          profilesMap = Object.fromEntries(
            (profilesData || []).map(p => [p.user_id, p])
          )
        } else {
          console.warn("[Classement] Aucun user_id trouvé dans user_pass")
        }

        // 3. Calcul XP pour chaque utilisateur et merge
        const leaderboardData = (passData || []).map(u => {
          const xp = (u.trophies?.totalPoints || 0)
            + 10 * (u.recipes_count || 0)
            + 5 * (u.friends_count || 0)
            + 2 * (u.likes_received || 0)
            + 2 * (u.streak || 0)
          const profile = profilesMap[u.user_id] || {}
          return {
            user_id: u.user_id,
            display_name: profile.display_name || 'Utilisateur',
            avatar_url: profile.avatar_url || null,
            xp,
            isYou: user?.id === u.user_id
          }
        })
        console.log("[Classement] leaderboardData:", leaderboardData)
        leaderboardData.sort((a, b) => b.xp - a.xp)
        setLeaderboard(leaderboardData)
      } catch (e) {
        console.error("[Classement] Exception générale:", e)
        setLeaderboard([])
      }
      setLeaderboardLoading(false)
      console.log("[Classement] Fin fetchLeaderboard")
    }
    fetchLeaderboard()
  }, [user])

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

  return (
    <div className={styles.trophyContainer} style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      {/* Feedback achat/équipement */}
      {shopFeedback && (
        <div style={{
          position: 'fixed',
          top: 30,
          left: '50%',
          transform: 'translateX(-50%)',
          background: shopFeedback.type === 'success' ? '#10b981' : '#f59e0b',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 16,
          fontWeight: 700,
          fontSize: '1.1rem',
          zIndex: 9999,
          boxShadow: '0 8px 25px rgba(16,185,129,0.18)',
          animation: 'shopFeedbackAnim 0.6s'
        }}>
          {shopFeedback.msg}
        </div>
      )}
      {/* Animation gain de coins */}
      {coinAnim && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 32,
          color: '#f59e0b',
          fontWeight: 900,
          zIndex: 9999,
          animation: 'coinAnim 0.8s'
        }}>
          🪙
        </div>
      )}

      {/* Solde CocoCoins bien intégré */}
      {renderCoinBalance()}

      {/* Onglets navigation */}
      {renderTabs()}

      {/* Affichage selon l'onglet */}
      {activeTab === 'progression' ? (
        <>
          {/* Progression classique */}
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: 24,
            padding: 24,
            marginBottom: 32,
            color: 'white',
            boxShadow: '0 8px 32px #f59e0b22'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar chef customisable */}
              <div
                style={{
                  width: 90, height: 90, borderRadius: '50%', background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem', color: '#f59e0b', fontWeight: 900, boxShadow: '0 2px 12px #f59e0b33',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                title="Voir et personnaliser mon avatar"
                onClick={() => setDressingOpen(true)}
              >
                {renderChefAvatar()}
                <span style={{
                  position: 'absolute',
                  bottom: 2, right: 2,
                  background: '#f59e0b',
                  color: 'white',
                  fontSize: 13,
                  borderRadius: 8,
                  padding: '2px 6px',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px #f59e0b33'
                }}>👗</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
                  Progression COCO
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                  {user?.user_metadata?.display_name || user?.email || 'Utilisateur'}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                Niveau <span style={{ fontSize: '1.5rem', color: '#fff' }}>{levelInfo.current.level}</span> <span style={{ fontSize: '1rem', fontWeight: 500 }}>({levelInfo.current.label})</span>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.3)', borderRadius: 12, height: 16, margin: '10px 0', overflow: 'hidden'
              }}>
                <div style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg,${levelInfo.current.color},#f59e0b)`,
                  borderRadius: 12,
                  transition: 'width 0.5s'
                }} />
              </div>
              <div style={{ fontSize: '0.95rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                <span>{xp} XP</span>
                <span>{levelInfo.next.xp} XP pour niv. {levelInfo.next.level}</span>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div style={{
            display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 28, flexWrap: 'wrap'
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f59e0b' }}>{xp}</div>
              <div style={{ fontSize: '0.9rem', color: '#92400e' }}>XP</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#10b981' }}>{trophies.unlockedCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#059669' }}>Trophées</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#6366f1' }}>{trophies.totalCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#6366f1' }}>Total</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f59e0b' }}>{stats.recipesCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#92400e' }}>Recettes</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#3b82f6' }}>{stats.friendsCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#3b82f6' }}>Amis</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ef4444' }}>{stats.likesReceived}</div>
              <div style={{ fontSize: '0.9rem', color: '#ef4444' }}>Likes</div>
            </div>
            <div style={{
              background: '#fff', borderRadius: 16, padding: '16px 18px', minWidth: 80,
              boxShadow: '0 2px 8px #f59e0b11', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#f59e0b' }}>{stats.streak}</div>
              <div style={{ fontSize: '0.9rem', color: '#f59e0b' }}>Streak 🔥</div>
            </div>
          </div>

          {/* Streak & Daily Reward */}
          <div style={{
            background: '#fffbe6',
            borderRadius: 16,
            padding: '18px 22px',
            marginBottom: 28,
            textAlign: 'center',
            fontWeight: 600,
            color: '#f59e0b',
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px #f59e0b11',
            position: 'relative'
          }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b', marginBottom: 4 }}>
              🔥 Streak quotidien : <b>{stats.streak}</b> jour{stats.streak > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: '1rem', color: '#92400e', marginBottom: 8 }}>
              {stats.lastClaimed === new Date().toISOString().slice(0, 10)
                ? <>Récompense du jour déjà récupérée !</>
                : <>Réclamez votre récompense quotidienne !</>
              }
            </div>
            <button
              onClick={async () => {
                if (stats.lastClaimed === new Date().toISOString().slice(0, 10)) return;
                // Calcul de la récompense (exemple : 20 + 10*streak)
                const reward = 20 + 10 * Math.min(stats.streak + 1, 7);
                const today = new Date().toISOString().slice(0, 10);
                // Update Supabase
                await supabase.from('user_pass').update({
                  last_claimed: today,
                  streak: stats.lastClaimed === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                    ? stats.streak + 1
                    : 1,
                  coins: coins + reward
                }).eq('user_id', user.id);
                setCoins(coins + reward);
                setStats(s => ({
                  ...s,
                  streak: stats.lastClaimed === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                    ? stats.streak + 1
                    : 1,
                  lastClaimed: today
                }));
                setShopFeedback({ type: 'success', msg: `+${reward} CocoCoins !` });
                setTimeout(() => setShopFeedback(null), 1500);
              }}
              disabled={stats.lastClaimed === new Date().toISOString().slice(0, 10)}
              style={{
                background: stats.lastClaimed === new Date().toISOString().slice(0, 10)
                  ? '#e5e7eb'
                  : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                color: stats.lastClaimed === new Date().toISOString().slice(0, 10)
                  ? '#9ca3af'
                  : 'white',
                border: 'none',
                borderRadius: 10,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: stats.lastClaimed === new Date().toISOString().slice(0, 10)
                  ? 'not-allowed'
                  : 'pointer',
                marginBottom: 6,
                boxShadow: stats.lastClaimed === new Date().toISOString().slice(0, 10)
                  ? 'none'
                  : '0 2px 8px #f59e0b33',
                transition: 'all 0.2s'
              }}
            >
              {stats.lastClaimed === new Date().toISOString().slice(0, 10)
                ? 'Récompense du jour prise'
                : `Récupérer +${20 + 10 * Math.min(stats.streak + 1, 7)} 🪙`}
            </button>
            <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
              Connectez-vous chaque jour pour augmenter votre série et gagner plus de CocoCoins !
            </div>
          </div>

          {/* Badges et trophées */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#92400e' }}>
              Badges & Trophées débloqués
            </div>
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', minHeight: 48
            }}>
              {trophies.unlocked.length === 0 && (
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Aucun badge débloqué pour l'instant</span>
              )}
              {trophies.unlocked.slice(0, 8).map(trophy => (
                <div key={trophy.id} title={trophy.name} style={{
                  background: '#fff', borderRadius: 12, padding: '8px 10px', fontSize: '1.3rem',
                  boxShadow: '0 2px 8px #f59e0b11', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  animation: 'bounce 1.2s infinite alternate'
                }}>
                  <span>{trophy.icon}</span>
                  <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600 }}>{trophy.name}</span>
                </div>
              ))}
              {trophies.unlocked.length > 8 && (
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{trophies.unlocked.length - 8} autres</span>
              )}
            </div>
          </div>

          {/* Quiz du jour */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#10b981' }}>
              Quiz du jour
            </div>
            <div style={{
              background: '#fffbe6',
              borderRadius: 16,
              padding: '18px 22px',
              marginBottom: 8,
              textAlign: 'center',
              fontWeight: 600,
              color: '#f59e0b',
              fontSize: '1.1rem',
              boxShadow: '0 2px 8px #f59e0b11',
              position: 'relative'
            }}>
              {quizDoneToday ? (
                quizState.success ? (
                  <div>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✅ Quiz réussi aujourd'hui !</span>
                    <div style={{ color: '#92400e', fontSize: '0.98rem', marginTop: 6 }}>
                      Revenez demain pour un nouveau quiz.
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>❌ Quiz raté aujourd'hui.</span>
                    <div style={{ color: '#92400e', fontSize: '0.98rem', marginTop: 6 }}>
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
                    borderRadius: 10,
                    padding: '10px 28px',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #10b98133',
                    transition: 'all 0.2s'
                  }}
                >
                  🎯 Tenter le quiz du jour (+{quizReward} CocoCoins)
                </button>
              )}
            </div>
          </div>
          {/* Modal quiz */}
          {quizModalOpen && quizQuestion && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
              onClick={() => setQuizModalOpen(false)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 24,
                  maxWidth: 380,
                  width: '95%',
                  padding: 28,
                  boxShadow: '0 12px 40px #0002',
                  position: 'relative',
                  animation: 'dressingPop 0.3s'
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setQuizModalOpen(false)}
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

                >✕</button>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#10b981', marginBottom: 16 }}>
                  Quiz du jour
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: 18, color: '#374151' }}>
                  {quizQuestion.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  {quizQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuizAnswer(idx)}
                      disabled={quizLoading}
                      style={{
                        background: quizAnswer === idx ? '#10b981' : '#f3f4f6',
                        color: quizAnswer === idx ? 'white' : '#374151',
                        border: quizAnswer === idx ? '2px solid #10b981' : '1px solid #e5e7eb',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        cursor: quizLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
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
                    borderRadius: 10,
                    padding: '10px 28px',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    cursor: quizAnswer !== null ? 'pointer' : 'not-allowed',
                    marginTop: 10
                  }}
                >
                  {quizLoading ? 'Vérification...' : 'Valider'}
                </button>
                {quizFeedback && (
                  <div style={{
                    marginTop: 18,
                    color: quizFeedback.type === 'success' ? '#10b981' : '#ef4444',
                    fontWeight: 700,
                    fontSize: '1.05rem'
                  }}>
                    {quizFeedback.msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'boutique' ? (
        renderShopTab()
      ) : (
        renderLeaderboardTab()
      )}
      {/* Dressing modal */}
      {dressingOpen && renderDressing()}

      {/* Animation et encouragement */}
      <div style={{
        marginTop: 24,
        fontSize: 16,
        color: '#10b981',
        fontWeight: 700,
        animation: 'pulse 1.5s infinite alternate'
      }}>
        {percent === 100
          ? "🎉 Bravo, vous avez atteint un nouveau niveau !"
          : activeTab === 'progression'
            ? "Continuez à cuisiner, partager et personnaliser votre chef !"
            : activeTab === 'boutique'
              ? "Faites-vous plaisir avec de nouveaux objets d'habillage !"
              : ""}
      </div>
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
          50% { transform: translateY(-10px);}
        }
        @keyframes pulse {
          0%,100% { opacity: 1;}
          50% { opacity: 0.6;}
        }
      `}</style>
    </div>
  )
}
