import { useEffect, useMemo, useState } from 'react'
import { getUserStatsComplete } from '../utils/profileUtils'
import { getUserTrophies } from '../utils/trophyUtils'
import styles from '../styles/ProgressionSimple.module.css'

const LEVELS = [
  { level: 1, xp: 0, label: 'Nouveau Chef' },
  { level: 2, xp: 200, label: 'Apprenti' },
  { level: 3, xp: 500, label: 'Commis' },
  { level: 4, xp: 900, label: 'Cuisinier' },
  { level: 5, xp: 1400, label: 'Chef' },
  { level: 6, xp: 2000, label: 'Chef Émérite' },
  { level: 7, xp: 2700, label: 'Chef Expert' },
  { level: 8, xp: 3500, label: 'Chef Maître' },
  { level: 9, xp: 4400, label: 'Chef Légendaire' },
  { level: 10, xp: 5400, label: 'Icône Culinaire' }
]

const XP_RULES = {
  recipe: 50,
  friend: 20,
  profilePerPercent: 2
}

const formatNumber = (value) => new Intl.NumberFormat('fr-FR').format(value || 0)

const getLevelData = (xp) => {
  let current = LEVELS[0]
  let next = null

  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
    }
  }

  return { current, next }
}

export default function Progression({ user }) {
  const [stats, setStats] = useState(null)
  const [trophies, setTrophies] = useState({ unlockedCount: 0, totalPoints: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const [statsData, trophyData] = await Promise.all([
          getUserStatsComplete(user.id),
          getUserTrophies(user.id)
        ])

        if (!isMounted) return

        setStats(statsData)
        setTrophies({
          unlockedCount: trophyData.unlockedCount || 0,
          totalPoints: trophyData.totalPoints || 0
        })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [user])

  const xpBreakdown = useMemo(() => {
    if (!stats) {
      return {
        recipesXp: 0,
        friendsXp: 0,
        profileXp: 0,
        trophiesXp: 0,
        totalXp: 0
      }
    }

    const recipesXp = stats.recipesCount * XP_RULES.recipe
    const friendsXp = stats.friendsCount * XP_RULES.friend
    const profileXp = Math.round(stats.profileCompleteness * XP_RULES.profilePerPercent)
    const trophiesXp = trophies.totalPoints
    const totalXp = recipesXp + friendsXp + profileXp + trophiesXp

    return {
      recipesXp,
      friendsXp,
      profileXp,
      trophiesXp,
      totalXp
    }
  }, [stats, trophies.totalPoints])

  const levelData = useMemo(() => getLevelData(xpBreakdown.totalXp), [xpBreakdown.totalXp])
  const xpProgress = levelData.next
    ? Math.min(
        ((xpBreakdown.totalXp - levelData.current.xp) /
          (levelData.next.xp - levelData.current.xp)) *
          100,
        100
      )
    : 100
  const xpToNext = levelData.next ? Math.max(levelData.next.xp - xpBreakdown.totalXp, 0) : 0

  const goals = useMemo(() => {
    if (!stats) return []

    const nextGoals = []

    if (stats.recipesCount === 0) {
      nextGoals.push('Créer votre première recette (+50 XP)')
    } else {
      nextGoals.push('Partager une nouvelle recette (+50 XP)')
    }

    if (stats.friendsCount < 5) {
      nextGoals.push('Ajouter un ami (+20 XP)')
    }

    if (stats.profileCompleteness < 100) {
      nextGoals.push(`Compléter votre profil (+${(100 - stats.profileCompleteness) * XP_RULES.profilePerPercent} XP)`) 
    }

    if (trophies.unlockedCount === 0) {
      nextGoals.push('Débloquer un trophée (+points bonus)')
    }

    return nextGoals
  }, [stats, trophies.unlockedCount])

  if (!user) {
    return (
      <section className={styles.container}>
        <div className={styles.emptyState}>
          <h1>Progression</h1>
          <p>Connectez-vous pour suivre votre XP, vos niveaux et votre progression.</p>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className={styles.container}>
        <div className={styles.loading}>Chargement de votre progression...</div>
      </section>
    )
  }

  if (!stats) {
    return (
      <section className={styles.container}>
        <div className={styles.emptyState}>
          <h1>Progression</h1>
          <p>Impossible de charger votre progression. Rechargez la page.</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Progression simplifiée</p>
          <h1>Votre niveau de chef</h1>
          <p className={styles.subtitle}>Un système clair, complet et centré sur votre évolution.</p>
        </div>
        <div className={styles.levelBadge}>
          <span className={styles.levelValue}>Niveau {levelData.current.level}</span>
          <span className={styles.levelLabel}>{levelData.current.label}</span>
        </div>
      </header>

      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div>
            <h2>XP totale</h2>
            <p className={styles.progressValue}>{formatNumber(xpBreakdown.totalXp)} XP</p>
          </div>
          <div className={styles.nextLevel}>
            {levelData.next ? (
              <>
                <span>Prochain niveau</span>
                <strong>Niveau {levelData.next.level}</strong>
                <span className={styles.nextLevelLabel}>{levelData.next.label}</span>
              </>
            ) : (
              <strong>Niveau maximum atteint 🎉</strong>
            )}
          </div>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${xpProgress}%` }} />
          </div>
          <div className={styles.progressFooter}>
            <span>{formatNumber(levelData.current.xp)} XP</span>
            {levelData.next ? (
              <span>
                {formatNumber(levelData.next.xp)} XP • {formatNumber(xpToNext)} XP restants
              </span>
            ) : (
              <span>Bravo, vous êtes au sommet !</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3>Résumé d'activité</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatNumber(stats.recipesCount)}</span>
              <span className={styles.statLabel}>Recettes</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatNumber(stats.friendsCount)}</span>
              <span className={styles.statLabel}>Amis</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatNumber(stats.profileCompleteness)}%</span>
              <span className={styles.statLabel}>Profil</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{formatNumber(trophies.unlockedCount)}</span>
              <span className={styles.statLabel}>Trophées</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h3>Sources d'XP</h3>
          <ul className={styles.list}>
            <li>
              <span>Recettes</span>
              <strong>{formatNumber(xpBreakdown.recipesXp)} XP</strong>
            </li>
            <li>
              <span>Amis</span>
              <strong>{formatNumber(xpBreakdown.friendsXp)} XP</strong>
            </li>
            <li>
              <span>Profil complété</span>
              <strong>{formatNumber(xpBreakdown.profileXp)} XP</strong>
            </li>
            <li>
              <span>Trophées</span>
              <strong>{formatNumber(xpBreakdown.trophiesXp)} XP</strong>
            </li>
          </ul>
        </section>

        <section className={styles.card}>
          <h3>Prochaines étapes</h3>
          {goals.length === 0 ? (
            <p className={styles.empty}>Tout est à jour 🎉</p>
          ) : (
            <ul className={styles.list}>
              {goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
