import { useEffect, useState } from 'react'
import { getUserTrophies } from '../utils/trophyUtils'
import { getUserStatsComplete } from '../utils/profileUtils'
import styles from '../styles/Trophy.module.css'

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
const SHOP_ITEMS = [
  { id: 'hat_chef', name: 'Toque de Chef', icon: '👨‍🍳', price: 100, type: 'hat' },
  { id: 'hat_pirate', name: 'Chapeau Pirate', icon: '🏴‍☠️', price: 150, type: 'hat' },
  { id: 'glasses_cool', name: 'Lunettes Cool', icon: '🕶️', price: 80, type: 'glasses' },
  { id: 'apron_red', name: 'Tablier Rouge', icon: '🟥', price: 120, type: 'apron' },
  { id: 'apron_blue', name: 'Tablier Bleu', icon: '🟦', price: 120, type: 'apron' },
  { id: 'spoon_gold', name: 'Cuillère Or', icon: '🥄', price: 200, type: 'accessory' },
  { id: 'mustache', name: 'Moustache', icon: '👨', price: 90, type: 'face' }
]

const DEFAULT_CHEF = {
  hat: null,
  glasses: null,
  apron: null,
  accessory: null,
  face: null
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
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERBOARD)
  const [dailyChallenges, setDailyChallenges] = useState(DAILY_CHALLENGES)
  const [coins, setCoins] = useState(250)
  const [ownedItems, setOwnedItems] = useState(['hat_chef'])
  const [equipped, setEquipped] = useState({ ...DEFAULT_CHEF, hat: 'hat_chef' })
  const [shopOpen, setShopOpen] = useState(false)

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

  // --- Gestion achat objet ---
  const buyItem = (item) => {
    if (ownedItems.includes(item.id) || coins < item.price) return
    setOwnedItems(prev => [...prev, item.id])
    setCoins(prev => prev - item.price)
  }

  // --- Gestion équipement objet ---
  const equipItem = (item) => {
    setEquipped(prev => ({
      ...prev,
      [item.type]: prev[item.type] === item.id ? null : item.id
    }))
  }

  // --- Rendu avatar chef avec objets équipés ---
  const renderChefAvatar = () => {
    // On superpose les icônes selon l'ordre
    return (
      <div style={{
        position: 'relative',
        width: 90,
        height: 90,
        margin: '0 auto'
      }}>
        {/* Base chef */}
        <div style={{
          fontSize: 60,
          position: 'absolute',
          left: 15,
          top: 15,
          zIndex: 1
        }}>🧑</div>
        {/* Hat */}
        {equipped.hat && (
          <div style={{
            fontSize: 36,
            position: 'absolute',
            left: 30,
            top: 0,
            zIndex: 2
          }}>
            {SHOP_ITEMS.find(i => i.id === equipped.hat)?.icon}
          </div>
        )}
        {/* Glasses */}
        {equipped.glasses && (
          <div style={{
            fontSize: 28,
            position: 'absolute',
            left: 38,
            top: 34,
            zIndex: 3
          }}>
            {SHOP_ITEMS.find(i => i.id === equipped.glasses)?.icon}
          </div>
        )}
        {/* Apron */}
        {equipped.apron && (
          <div style={{
            fontSize: 32,
            position: 'absolute',
            left: 36,
            top: 60,
            zIndex: 2
          }}>
            {SHOP_ITEMS.find(i => i.id === equipped.apron)?.icon}
          </div>
        )}
        {/* Accessory */}
        {equipped.accessory && (
          <div style={{
            fontSize: 22,
            position: 'absolute',
            left: 60,
            top: 60,
            zIndex: 4
          }}>
            {SHOP_ITEMS.find(i => i.id === equipped.accessory)?.icon}
          </div>
        )}
        {/* Face (moustache) */}
        {equipped.face && (
          <div style={{
            fontSize: 22,
            position: 'absolute',
            left: 48,
            top: 54,
            zIndex: 5
          }}>
            {SHOP_ITEMS.find(i => i.id === equipped.face)?.icon}
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
      {/* Header progression */}
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
          <div style={{
            width: 90, height: 90, borderRadius: '50%', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', color: '#f59e0b', fontWeight: 900, boxShadow: '0 2px 12px #f59e0b33',
            position: 'relative'
          }}>
            {renderChefAvatar()}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
              Progression COCO
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
              {user?.user_metadata?.display_name || user?.email || 'Utilisateur'}
            </div>
            {/* Affichage monnaie */}
            <div style={{
              marginTop: 6,
              fontWeight: 700,
              color: '#f59e0b',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ fontSize: 20 }}>🪙</span>
              <span>{coins} CocoCoins</span>
              <button
                style={{
                  marginLeft: 10,
                  background: '#fffbe6',
                  color: '#f59e0b',
                  border: '1px solid #fbbf24',
                  borderRadius: 8,
                  padding: '2px 10px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                onClick={() => setShopOpen(v => !v)}
              >
                {shopOpen ? 'Fermer la boutique' : 'Boutique'}
              </button>
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

      {/* Boutique objets cosmétiques */}
      {shopOpen && (
        <div style={{
          background: '#fffbe6',
          borderRadius: 18,
          padding: 18,
          marginBottom: 24,
          boxShadow: '0 2px 8px #f59e0b22'
        }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#f59e0b' }}>
            Boutique d'objets à débloquer
          </div>
          <div style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {SHOP_ITEMS.map(item => (
              <div key={item.id} style={{
                background: ownedItems.includes(item.id) ? '#d1fae5' : '#fff',
                border: ownedItems.includes(item.id) ? '2px solid #10b981' : '1px solid #e5e7eb',
                borderRadius: 14,
                padding: 12,
                minWidth: 90,
                textAlign: 'center',
                boxShadow: '0 2px 8px #f59e0b11',
                opacity: ownedItems.includes(item.id) ? 1 : 0.85,
                position: 'relative'
              }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{item.price} 🪙</div>
                {ownedItems.includes(item.id) ? (
                  <button
                    style={{
                      background: equipped[item.type] === item.id ? '#10b981' : '#f3f4f6',
                      color: equipped[item.type] === item.id ? 'white' : '#059669',
                      border: 'none',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                      marginBottom: 2
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
                      padding: '4px 10px',
                      fontWeight: 700,
                      cursor: coins >= item.price ? 'pointer' : 'not-allowed',
                      fontSize: 13,
                      marginBottom: 2
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
      )}

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
          {dailyChallenges.map(challenge => (
            <div key={challenge.id} style={{
              background: '#ecfdf5', borderRadius: 14, padding: '10px 16px', minWidth: 120,
              display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, color: '#059669',
              boxShadow: '0 2px 8px #10b98111'
            }}>
              <span style={{ fontSize: '1.3rem' }}>{challenge.icon}</span>
              <span>{challenge.label}</span>
              <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 700 }}>{challenge.reward}</span>
            </div>
          ))}
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
          {leaderboard.map(entry => (
            <div key={entry.rank} style={{
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
          ))}
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
      <style jsx>{`
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
