import { useEffect, useState } from 'react'
import { getUserTrophies } from '../utils/trophyUtils'
import styles from '../styles/Trophy.module.css'

const LEVELS = [
  { level: 1, xp: 0, label: "Débutant", color: "#a7f3d0" },
  { level: 2, xp: 100, label: "Apprenti", color: "#6ee7b7" },
  { level: 3, xp: 300, label: "Cuisinier", color: "#34d399" },
  { level: 4, xp: 700, label: "Chef", color: "#10b981" },
  { level: 5, xp: 1500, label: "Maître Chef", color: "#059669" },
  { level: 6, xp: 3000, label: "Légende", color: "#2563eb" }
]

const BADGES = [
  { id: 'first_recipe', label: "Première recette", icon: "🥇", desc: "Publier votre première recette" },
  { id: '10_likes', label: "10 Likes", icon: "👍", desc: "Obtenir 10 likes sur vos recettes" },
  { id: 'friend_chef', label: "Ami Chef", icon: "👨‍🍳", desc: "Ajouter un ami" },
  { id: 'trophy_collector', label: "Collectionneur", icon: "🏆", desc: "Débloquer 3 trophées" },
  { id: 'photo_share', label: "Photographe", icon: "📸", desc: "Partager une photo de plat" }
]

const TROPHIES = [
  { id: 'weekly_star', label: "Étoile de la semaine", icon: "⭐", desc: "Recette la plus likée de la semaine" },
  { id: 'comment_master', label: "Maître des commentaires", icon: "💬", desc: "Poster 20 commentaires" },
  { id: 'speedy', label: "Rapide", icon: "⚡", desc: "Publier 3 recettes en 24h" }
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

export default function Progression({ user }) {
  const [xp, setXP] = useState(0)
  const [badges, setBadges] = useState(['first_recipe', '10_likes', 'photo_share'])
  const [trophies, setTrophies] = useState(['weekly_star'])
  const [levelInfo, setLevelInfo] = useState(getLevel(xp))
  const [loading, setLoading] = useState(true)

  // Simuler XP utilisateur (à remplacer par vrai calcul XP)
  useEffect(() => {
    if (user?.id) {
      // XP = points trophées + 10 * nb recettes + 5 * nb amis (mock)
      getUserTrophies(user.id).then(data => {
        setTrophies(data)
        setXP(data.totalPoints || 0)
        setLoading(false)
      })
    } else {
      setXP(0)
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLevelInfo(getLevel(xp))
  }, [xp])

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
    <div className={styles.trophyContainer} style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
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
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', color: '#f59e0b', fontWeight: 900, boxShadow: '0 2px 12px #f59e0b33'
          }}>
            🏆
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
            Niveau <span style={{ fontSize: '1.5rem', color: '#fff' }}>{levelInfo.current.level}</span>
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
        display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 28
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
      </div>

      {/* Badges et trophées */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: '#92400e' }}>
          Badges débloqués
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
              boxShadow: '0 2px 8px #f59e0b11', display: 'flex', flexDirection: 'column', alignItems: 'center'
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

      {/* Progression trophées */}
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
          : "Continuez à cuisiner, partager et progresser !"}
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
