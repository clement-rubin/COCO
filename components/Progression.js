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
  const [activeTab, setActiveTab] = useState('progression') // 'progression' | 'boutique'
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

  // --- Gestion achat objet avec feedback et historique ---
  const buyItem = (item) => {
    if (ownedItems.includes(item.id) || coins < item.price) return
    setOwnedItems(prev => [...prev, item.id])
    setCoins(prev => prev - item.price)
    setPurchaseHistory(prev => [
      { date: new Date(), item },
      ...prev
    ])
    setShopFeedback({ type: 'success', msg: `✅ ${item.name} acheté !` })
    setTimeout(() => setShopFeedback(null), 2000)
    setCoinAnim(true)
    setTimeout(() => setCoinAnim(false), 900)
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

  // --- Rendu avatar chef modifié pour supporter la taille ---
  const renderChefAvatar = (opts = {}) => {
    const size = opts.size || 110
    const equippedToShow = previewEquip
      ? { ...equipped, [previewEquip.type]: previewEquip.id }
      : equipped
    // Effet visuel pour fond/effet/mascotte
    return (
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        filter: previewEquip ? 'brightness(1.1) drop-shadow(0 0 8px #f59e0b88)' : 'none',
        transition: 'filter 0.3s'
      }}>
        {/* Fond */}
        {equippedToShow.background && (
          <div style={{
            fontSize: size * 0.39,
            position: 'absolute',
            left: size * 0.09,
            top: size * 0.09,
            zIndex: 0,
            opacity: 0.25
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
          zIndex: 1,
          transition: 'opacity 0.2s'
        }}>🧑</div>
        {/* Hat */}
        {equippedToShow.hat && (
          <div style={{
            fontSize: size * 0.22,
            position: 'absolute',
            left: size * 0.35,
            top: size * 0.01,
            zIndex: 2,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.hat ? 'scale(1.15) rotate(-8deg)' : 'none',
            filter: getItemGlow(equippedToShow.hat)
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.hat)?.icon}
          </div>
        )}
        {/* Glasses */}
        {equippedToShow.glasses && (
          <div style={{
            fontSize: size * 0.18,
            position: 'absolute',
            left: size * 0.44,
            top: size * 0.4,
            zIndex: 3,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.glasses ? 'scale(1.15) rotate(8deg)' : 'none',
            filter: getItemGlow(equippedToShow.glasses)
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.glasses)?.icon}
          </div>
        )}
        {/* Apron */}
        {equippedToShow.apron && (
          <div style={{
            fontSize: size * 0.2,
            position: 'absolute',
            left: size * 0.42,
            top: size * 0.73,
            zIndex: 2,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.apron ? 'scale(1.12)' : 'none',
            filter: getItemGlow(equippedToShow.apron)
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.apron)?.icon}
          </div>
        )}
        {/* Accessory */}
        {equippedToShow.accessory && (
          <div style={{
            fontSize: size * 0.16,
            position: 'absolute',
            left: size * 0.73,
            top: size * 0.73,
            zIndex: 4,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.accessory ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.accessory)
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.accessory)?.icon}
          </div>
        )}
        {/* Face (moustache/barbe) */}
        {equippedToShow.face && (
          <div style={{
            fontSize: size * 0.16,
            position: 'absolute',
            left: size * 0.56,
            top: size * 0.67,
            zIndex: 5,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.face ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.face)
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
            zIndex: 6,
            animation: 'effectAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.effect)
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
            zIndex: 7,
            filter: getItemGlow(equippedToShow.badge)
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
            zIndex: 8,
            animation: 'mascotAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.mascot)
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.mascot)?.icon}
          </div>
        )}
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
                background: shopFilter === cat.id ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
                color: shopFilter === cat.id ? 'white' : '#10b981',
                border: shopFilter === cat.id ? '2px solid #10b981' : '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '7px 16px',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: shopFilter === cat.id ? '0 2px 8px #10b98133' : 'none',
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
                  color: '#92400e',
                  fontWeight: 600
                }}>
                  {ownedByType(cat.id)}/{totalByType(cat.id)}
                </span>
              )}
            </button>
          ))}
          {/* Tout déséquiper */}
          <button
            onClick={unequipAll}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
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
            background: '#fffbe6',
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 1px 4px #f59e0b11',
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
        {/* Grille boutique modernisée */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 22,
          marginBottom: 18
        }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: ownedItems.includes(item.id)
                ? (item.rarity === 'legendary' ? '#fef3c7' : item.rarity === 'epic' ? '#f3e8ff' : '#d1fae5')
                : '#fff',
              border: ownedItems.includes(item.id)
                ? `2px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : item.rarity === 'rare' ? '#3b82f6' : '#10b981'}`
                : '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 18,
              minWidth: 120,
              textAlign: 'center',
              boxShadow: ownedItems.includes(item.id) ? '0 2px 8px #f59e0b11' : 'none',
              opacity: ownedItems.includes(item.id) ? 1 : 0.85,
              position: 'relative',
              transition: 'box-shadow 0.2s, border 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
              onMouseEnter={() => ownedItems.includes(item.id) && setPreviewEquip(item)}
              onMouseLeave={() => setPreviewEquip(null)}
            >
              {/* Badge rareté */}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontSize: 12, 
                fontWeight: 700,
                color: item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : item.rarity === 'rare' ? '#3b82f6' : '#10b981',
                background: item.rarity === 'legendary'
                  ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
                  : item.rarity === 'epic'
                  ? 'linear-gradient(90deg,#a78bfa,#8b5cf6)'
                  : item.rarity === 'rare'
                  ? 'linear-gradient(90deg,#60a5fa,#3b82f6)'
                  : 'linear-gradient(90deg,#6ee7b7,#10b981)',
                borderRadius: 8,
                padding: '2px 8px',
                boxShadow: '0 1px 4px #f59e0b11'
              }}>
                {item.rarity === 'legendary' ? 'Légendaire' : item.rarity === 'epic' ? 'Épique' : item.rarity === 'rare' ? 'Rare' : 'Commun'}
              </div>
              {/* Badge nouveau */}
              {item.isNew && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                  borderRadius: 8,
                  padding: '2px 8px',
                  boxShadow: '0 1px 4px #f59e0b22'
                }}>
                  Nouveau
                </div>
              )}
              {/* Badge exclusif */}
              {item.exclusive && (
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                  borderRadius: 8,
                  padding: '2px 8px',
                  boxShadow: '0 1px 4px #8b5cf622'
                }}>
                  Exclusif
                </div>
              )}
              {/* Icône objet */}
              <div style={{
                fontSize: 38,
                marginBottom: 8,
                filter: getItemGlow(item.id),
                transition: 'filter 0.2s'
              }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{item.price} 🪙</div>
              {/* Favori */}
              <button
                onClick={() => toggleFavorite(item.id)}
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
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
        <style jsx>{`
          @keyframes effectAnim {
            0%,100% { transform: scale(1);}
            50% { transform: scale(1.2) rotate(-8deg);}
          }
          @keyframes mascotAnim {
            0%,100% { transform: translateY(0);}
            50% { transform: translateY(-8px);}
          }
        `}</style>
      </div>
    )
  }

  // Glow visuel selon la rareté de l'objet
  function getItemGlow(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return 'none'
    switch (item.rarity) {
      case 'legendary':
        return 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #fbbf24)';
      case 'epic':
        return 'drop-shadow(0 0 8px #8b5cf6) drop-shadow(0 0 16px #a78bfa)';
      case 'rare':
        return 'drop-shadow(0 0 8px #3b82f6)';
      case 'uncommon':
        return 'drop-shadow(0 0 6px #10b981)';
      default:
        return 'none';
    }
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

          {/* Streak et progression */}
          <div style={{
            background: '#fffbe6',
            borderRadius: 16,
            padding: '14px 20px',
            marginBottom: 24,
            textAlign: 'center',
            fontWeight: 600,
            color: '#f59e0b',
            fontSize: '1.1rem',
            boxShadow: '0 2px 8px #f59e0b11'
          }}>
            {stats.streak > 1
              ? <>🔥 Série de <b>{stats.streak}</b> jours actifs !</>
              : <>Commencez une série d'activité pour gagner plus de récompenses !</>
            }
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

          {/* Défis du jour */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#10b981' }}>
              Défis du jour
            </div>
            <div style={{
              display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center'
            }}>
              {dailyChallenges.map(challenge => {
                const validated = !canValidateChallenge(challenge.id)
                return (
                  <div key={challenge.id} style={{
                    background: validated ? '#e5e7eb' : '#ecfdf5',
                    borderRadius: 14,
                    padding: '10px 16px',
                    minWidth: 120,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontWeight: 600,
                    color: validated ? '#9ca3af' : '#059669',
                    boxShadow: '0 2px 8px #10b98111',
                    opacity: validated ? 0.6 : 1,
                    position: 'relative'
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>{challenge.icon}</span>
                    <span>{challenge.label}</span>
                    <span style={{ marginLeft: 'auto', color: validated ? '#9ca3af' : '#10b981', fontWeight: 700 }}>{challenge.reward}</span>
                    <button
                      style={{
                        marginLeft: 8,
                        background: validated ? '#d1d5db' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: validated ? 'not-allowed' : 'pointer'
                      }}
                      disabled={validated}
                      onClick={() => validateChallenge(challenge)}
                      title={validated ? 'Déjà validé aujourd\'hui' : 'Valider le défi'}
                    >
                      {validated ? 'Validé' : 'Valider'}
                    </button>
                    {validated && (
                      <span style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        fontSize: 13,
                        color: '#10b981',
                        fontWeight: 700
                      }}>✔️</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Classement */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#3b82f6' }}>
              Classement hebdomadaire
            </div>
            <div style={{
              background: '#f3f4f6', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px #3b82f611'
            }}>
              {leaderboardLoading ? (
                <div style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 600, padding: 12 }}>
                  Chargement du classement...
                </div>
              ) : leaderboard.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 600, padding: 12 }}>
                  Aucun classement disponible pour le moment.
                </div>
              ) : (
                leaderboard.map(entry => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6,
                    fontWeight: entry.you ? 800 : 600, color: entry.you ? '#f59e0b' : '#374151',
                    background: entry.you ? 'rgba(245,158,11,0.08)' : 'transparent',
                    borderRadius: entry.you ? 10 : 0, padding: entry.you ? '6px 0' : 0
                  }}>
                    <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{entry.rank}</span>
                    <span style={{ flex: 1 }}>{entry.name}</span>
                    <span style={{ fontSize: '1rem', color: '#6366f1', fontWeight: 700 }}>{entry.xp} XP</span>
                    {entry.you && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 900 }}>Vous</span>}
                  </div>
                ))
              )
            }
            </div>
          </div>

          {/* Prochain trophée à débloquer */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#92400e' }}>
              Prochain trophée à débloquer
            </div>
            {trophies.locked.length > 0 ? (
              <div style={{
                background: '#fff', borderRadius: 16, padding: 18, boxShadow: '0 2px 8px #f59e0b11',
                display: 'flex', alignItems: 'center', gap: 16
              }}>
                <span style={{ fontSize: '2rem' }}>{trophies.locked[0].icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#92400e' }}>{trophies.locked[0].name}</div>
                  <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>{trophies.locked[0].description}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#10b981', fontWeight: 600 }}>Tous les trophées débloqués !</div>
            )}
          </div>

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
              : "Continuez à cuisiner, partager et personnaliser votre chef !"}
          </div>
        </>
      ) : (
        renderShopTab()
      )}

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
            : "Faites-vous plaisir avec de nouveaux objets d'habillage !"}
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
