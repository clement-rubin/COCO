import Head from 'next/head'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'
import styles from '../styles/Layout.module.css'

export default function Home({ initialRecipes = [], initialEngagement = {} }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState('')

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    if (!user?.id) return

    setLeaderboardLoading(true)
    setLeaderboardError('')

    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', startOfNextMonth.toISOString())

      if (recipesError) {
        throw recipesError
      }

      const recipesCountMap = {}
      for (const recipe of recipesData || []) {
        if (!recipe?.user_id) continue
        recipesCountMap[recipe.user_id] = (recipesCountMap[recipe.user_id] || 0) + 1
      }

      const rankedUserIds = Object.keys(recipesCountMap)
      if (rankedUserIds.length === 0) {
        setLeaderboard([])
        return
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
        .in('user_id', rankedUserIds)

      if (profilesError) {
        throw profilesError
      }

      const profilesById = new Map((profilesData || []).map(profile => [profile.user_id, profile]))
      const leaderboardData = rankedUserIds
        .map(userId => {
          const profile = profilesById.get(userId)
          return {
            user_id: userId,
            display_name: profile?.display_name || 'Chef',
            avatar_url: profile?.avatar_url || null,
            recipesCount: recipesCountMap[userId] || 0,
            isYou: userId === user.id
          }
        })
        .sort((a, b) => {
          if (b.recipesCount !== a.recipesCount) return b.recipesCount - a.recipesCount
          return a.display_name.localeCompare(b.display_name)
        })

      setLeaderboard(leaderboardData.slice(0, 10))
    } catch (error) {
      console.error('[Classement] Impossible de charger le classement mensuel:', error)
      setLeaderboard([])
      setLeaderboardError('Impossible de charger le classement pour le moment.')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchLeaderboard()
    }
  }, [user?.id, fetchLeaderboard])

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        router.push('/presentation')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, user, router])

  const topThree = leaderboard.slice(0, 3)
  const podiumLayout = [
    { chef: topThree[1], place: 2, medal: '🥈', className: 'place2' },
    { chef: topThree[0], place: 1, medal: '🥇', className: 'place1' },
    { chef: topThree[2], place: 3, medal: '🥉', className: 'place3' }
  ].filter(entry => entry.chef)
  const remainingLeaders = leaderboard.slice(3)
  const maxRecipesCount =
    leaderboard.reduce((maxValue, chef) => Math.max(maxValue, chef.recipesCount || 0), 0) || 1
  const totalMonthlyRecipes = leaderboard.reduce((total, chef) => total + (chef.recipesCount || 0), 0)
  const topChef = leaderboard[0]
  const userDisplayName =
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Chef'

  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Chargement de votre accueil...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <Head>
          <title>COCO - Accueil</title>
          <meta name="description" content="COCO, la communaute des recettes maison." />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className={styles.main}>
          <div className={styles.content} style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
            <div className="previewCard">
              <h1>COCO</h1>
              <p>Redirection vers la presentation...</p>
              <button onClick={() => router.push('/presentation')}>Voir la presentation</button>
            </div>
          </div>
        </main>
        <style jsx>{`
          .previewCard {
            margin-top: 24px;
            padding: 24px 20px;
            border-radius: 16px;
            background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%);
            border: 1px solid #fed7aa;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 2rem;
            color: #9a3412;
          }

          p {
            margin: 0 0 16px;
            color: #9a3412;
          }

          button {
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            background: #ea580c;
            color: white;
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>COCO - Classement et Recettes</title>
        <meta name="description" content="Classement mensuel des chefs et feed recettes COCO." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <main className={styles.main}>
        <div className={`${styles.content} homeShell`}>
          <section className="panel heroPanel">
            <div className="heroTop">
              <div className="heroText">
                <h1 className="heroTitle">Service en cuisine, {userDisplayName}</h1>
                <p className="heroSubtitle">
                  Suivez le podium du mois et les nouvelles recettes qui sortent du four.
                </p>
              </div>
              <div className="heroBadge" aria-hidden="true">
                CHEF
              </div>
            </div>
            <div className="heroStats">
              <article className="heroStat">
                <span className="heroStatLabel">Chefs classes</span>
                <strong className="heroStatValue">{leaderboard.length}</strong>
              </article>
              <article className="heroStat">
                <span className="heroStatLabel">Leader du mois</span>
                <strong className="heroStatValue">{topChef?.recipesCount || 0}</strong>
              </article>
              <article className="heroStat">
                <span className="heroStatLabel">Recettes du mois</span>
                <strong className="heroStatValue">{totalMonthlyRecipes}</strong>
              </article>
            </div>
          </section>

          <section className="panel leaderboardPanel">
            <div className="sectionHeader leaderboardHeader">
              <div>
                <h2>Classement mensuel</h2>
                <p>{monthLabel}</p>
                <div className="ingredientChips">
                  <span>🔥 Fourneaux actifs</span>
                  <span>🍲 Recettes maison</span>
                  <span>👨‍🍳 Top chefs</span>
                </div>
              </div>
              <button className="refreshBtn refreshCookingBtn" onClick={fetchLeaderboard} disabled={leaderboardLoading}>
                {leaderboardLoading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
            <div className="leaderboardRibbon">
              <span>🏆 Podium du mois</span>
              <span>{leaderboard.length} chefs en lice</span>
            </div>

            {leaderboardError && <p className="infoError">{leaderboardError}</p>}

            {leaderboardLoading ? (
              <p className="infoText">Chargement du classement...</p>
            ) : leaderboard.length === 0 ? (
              <p className="infoText cookingEmpty">Aucune recette publiee ce mois-ci.</p>
            ) : (
              <>
                <div className="podiumArena">
                  <div className="podiumGlow" aria-hidden="true" />
                  <div className="pyramidConnection" aria-hidden="true">
                    <svg viewBox="0 0 300 200" preserveAspectRatio="none">
                      <line x1="150" y1="20" x2="80" y2="150" stroke="url(#pyramidGradient1)" strokeWidth="3" opacity="0.6"/>
                      <line x1="150" y1="20" x2="220" y2="150" stroke="url(#pyramidGradient2)" strokeWidth="3" opacity="0.6"/>
                      <defs>
                        <linearGradient id="pyramidGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6"/>
                        </linearGradient>
                        <linearGradient id="pyramidGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8"/>
                          <stop offset="100%" stopColor="#cd853f" stopOpacity="0.6"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="podiumStage pyramidStage">
                    {podiumLayout.map(entry => {
                      const chef = entry.chef
                      return (
                        <article
                          key={chef.user_id}
                          className={`podiumSpot pyramidSpot ${entry.className} ${chef.isYou ? 'you' : ''}`}
                        >
                          <div className="topChefCard pyramidCard">
                            <span className="topChefRank">{entry.medal}</span>
                            {chef.avatar_url ? (
                              <img className="topChefAvatar" src={chef.avatar_url} alt="" />
                            ) : (
                              <span className="topChefAvatar avatarFallback">
                                {chef.display_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <h3 className="topChefName">
                              <span className="chefHat" aria-hidden="true">
                                👨‍🍳
                              </span>
                              <span>
                                {chef.display_name}
                                {chef.isYou ? ' (vous)' : ''}
                              </span>
                            </h3>
                            <p className="topChefRecipes">
                              {chef.recipesCount} recette{chef.recipesCount > 1 ? 's' : ''}
                            </p>
                            <div className="pyramidRank">#{entry.place}</div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>

                {remainingLeaders.length > 0 && (
                  <ol className="leaderboardList cookingList">
                    {remainingLeaders.map((chef, index) => {
                      const rank = index + 4
                      const heatWidth = Math.max(
                        10,
                        Math.round(((chef.recipesCount || 0) / maxRecipesCount) * 100)
                      )
                      const isTopChef = rank === 4

                      return (
                        <li key={chef.user_id} className={`leaderRow cookingRow ${chef.isYou ? 'you' : ''} ${isTopChef ? 'topChef' : ''}`} style={{ '--row-index': index }}>
                          <span className="rankBadge">{isTopChef ? '⭐' : `#${rank}`}</span>
                          <div className="chefInfo">
                            {chef.avatar_url ? (
                              <img src={chef.avatar_url} alt="" />
                            ) : (
                              <span className="avatarFallback">{chef.display_name.charAt(0).toUpperCase()}</span>
                            )}
                            <span className="chefName">
                              <span className="chefNameMain">
                                <span className="chefHat" aria-hidden="true">
                                  👨‍🍳
                                </span>
                                <span>
                                  {chef.display_name}
                                  {chef.isYou ? ' (vous)' : ''}
                                </span>
                                {isTopChef && <span className="topChefBadge" aria-hidden="true">🔥</span>}
                              </span>
                              <span className="chefRole">Chef en service</span>
                            </span>
                          </div>
                          <div className="countWrap">
                            <span className="count">{chef.recipesCount}</span>
                            <div className="heatTrack">
                              <span className="heatFill" style={{ width: `${Math.min(heatWidth, 100)}%` }} />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </>
            )}
          </section>

          <section className="panel feedPanel">
            <div className="sectionHeader">
              <div>
                <h2>Feed recettes communaute</h2>
                <p>Les recettes publiees par vos amis et la communaute.</p>
                <span className="feedBadge">Sorties du four</span>
              </div>
            </div>

            <AddictiveFeed
              initialRecipes={initialRecipes}
              initialEngagement={initialEngagement}
              initialPage={initialRecipes.length > 0 ? 1 : 0}
            />
          </section>
        </div>
      </main>

      <style jsx>{`
        .homeShell {
          max-width: 420px;
          margin: 0 auto;
          padding-top: 54px;
          padding-bottom: 20px;
          position: relative;
        }

        .homeShell::before {
          content: '';
          position: absolute;
          inset: 0 0 auto 0;
          height: 180px;
          background: radial-gradient(circle at 10% 30%, rgba(249, 115, 22, 0.26), rgba(249, 115, 22, 0) 55%),
            radial-gradient(circle at 88% 18%, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0) 58%);
          filter: blur(10px);
          opacity: 0.8;
          pointer-events: none;
        }

        .panel {
          position: relative;
          z-index: 1;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .heroPanel {
          margin-top: 0;
          overflow: hidden;
          border-color: #fdba74;
          background: linear-gradient(145deg, #fff7ed 0%, #ffedd5 55%, #ffe8cf 100%);
        }

        .heroPanel::before {
          content: '';
          position: absolute;
          inset: auto -20% -45% -20%;
          height: 120px;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.28), rgba(249, 115, 22, 0) 70%);
          pointer-events: none;
        }

        .heroTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .heroText {
          min-width: 0;
        }

        .heroTitle {
          margin: 6px 0 0;
          font-size: 1rem;
          line-height: 1.3;
          font-weight: 800;
          color: #7c2d12;
        }

        .heroSubtitle {
          margin: 6px 0 0;
          font-size: 0.82rem;
          color: #9a3412;
        }

        .heroBadge {
          border-radius: 999px;
          border: 1px solid #f59e0b;
          background: linear-gradient(145deg, #f59e0b, #ea580c);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 8px 10px;
          box-shadow: 0 8px 14px rgba(249, 115, 22, 0.25);
          flex-shrink: 0;
        }

        .heroStats {
          margin-top: 12px;
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .heroStat {
          border-radius: 12px;
          border: 1px solid #fdba74;
          background: rgba(255, 255, 255, 0.72);
          padding: 8px;
          display: grid;
          gap: 3px;
          animation: heroStatSlideUp 0.6s ease-out backwards;
          transition: all 0.2s ease;
        }

        .heroStats > .heroStat:nth-child(1) {
          animation-delay: 0.1s;
        }

        .heroStats > .heroStat:nth-child(2) {
          animation-delay: 0.2s;
        }

        .heroStats > .heroStat:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes heroStatSlideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .heroStat:hover {
          background: rgba(255, 255, 255, 0.9);
          border-color: #f97316;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
        }

        .heroStatLabel {
          font-size: 0.66rem;
          color: #9a3412;
          font-weight: 700;
          line-height: 1.2;
        }

        .heroStatValue {
          font-size: 1rem;
          color: #7c2d12;
          font-weight: 800;
          line-height: 1;
        }

        .leaderboardPanel {
          background: linear-gradient(150deg, #fff8ef 0%, #fff1de 55%, #fff9f3 100%);
          border-color: #f7c59b;
          position: relative;
          overflow: hidden;
        }

        .leaderboardPanel::before {
          content: '';
          position: absolute;
          inset: -20% -30% auto auto;
          width: 230px;
          height: 230px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(249, 115, 22, 0.17) 0%, rgba(249, 115, 22, 0) 70%);
          pointer-events: none;
        }

        .leaderboardPanel::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0) 46%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0) 54%,
            rgba(255, 255, 255, 0) 100%
          );
          pointer-events: none;
          opacity: 0.55;
        }

        h2 {
          margin: 0;
          font-size: 1.05rem;
          color: #1f2937;
        }

        h3 {
          margin: 0;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .refreshBtn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .refreshBtn {
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #334155;
        }

        .refreshCookingBtn {
          border: 1px solid #f7c59b;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: #fff;
          box-shadow: 0 8px 16px rgba(249, 115, 22, 0.25);
        }

        .refreshBtn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
          box-shadow: none;
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .leaderboardHeader {
          position: relative;
          z-index: 1;
        }

        .leaderboardRibbon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 4px 0 12px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(251, 146, 60, 0.35);
          background: rgba(255, 255, 255, 0.65);
          color: #9a3412;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.01em;
        }

        .ingredientChips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .ingredientChips span {
          font-size: 0.68rem;
          font-weight: 700;
          color: #9a3412;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid #fed7aa;
          border-radius: 999px;
          padding: 4px 8px;
        }

        .infoText {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .cookingEmpty {
          color: #9a3412;
          background: rgba(255, 255, 255, 0.76);
          border: 1px dashed #fdba74;
          border-radius: 12px;
          padding: 10px 12px;
        }

        .infoError {
          margin: 0 0 10px;
          font-size: 0.85rem;
          color: #b91c1c;
          position: relative;
          z-index: 1;
        }

        .podiumStage {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
          align-items: end;
          perspective: 1200px;
        }

        .pyramidStage {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          grid-template-rows: auto auto;
          gap: 12px;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
          perspective: 1200px;
          padding: 12px 0;
          align-items: center;
        }

        .pyramidSpot.place1 {
          grid-column: 2;
          grid-row: 1;
          transform: translateY(0) scale(1.15);
          z-index: 10;
        }

        .pyramidSpot.place2 {
          grid-column: 1;
          grid-row: 2;
          transform: translateX(-8px) translateY(0) scale(0.92);
          justify-self: center;
        }

        .pyramidSpot.place3 {
          grid-column: 3;
          grid-row: 2;
          transform: translateX(8px) translateY(0) scale(0.92);
          justify-self: center;
        }

        .podiumArena {
          position: relative;
          z-index: 1;
          margin-bottom: 12px;
          border-radius: 14px;
          border: 1px solid rgba(251, 146, 60, 0.25);
          background: linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(255, 236, 213, 0.65));
          padding: 20px 8px 8px;
          animation: podiumAreaGlow 3s ease-in-out infinite;
          overflow: visible;
        }

        @keyframes podiumAreaGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(251, 146, 60, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(251, 146, 60, 0.2);
          }
        }

        .podiumGlow {
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: radial-gradient(circle at 50% 0%, rgba(250, 204, 21, 0.28), rgba(250, 204, 21, 0) 58%);
          pointer-events: none;
          animation: podiumGlowPulse 4s ease-in-out infinite;
        }

        @keyframes podiumGlowPulse {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1.2;
          }
        }

        .pyramidConnection {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        .pyramidConnection svg {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .podiumSpot {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-end;
          gap: 6px;
          animation: podiumEntrance 0.6s ease-out backwards;
        }

        .place1 {
          animation-delay: 0.2s;
        }

        .place2 {
          animation-delay: 0.0s;
        }

        .place3 {
          animation-delay: 0.4s;
        }

        @keyframes podiumEntrance {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .pyramidSpot.place1 {
          animation: pyramidPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
          animation-delay: 0.3s;
        }

        .pyramidSpot.place2 {
          animation: pyramidSlideLeft 0.7s ease-out backwards;
          animation-delay: 0.1s;
        }

        .pyramidSpot.place3 {
          animation: pyramidSlideRight 0.7s ease-out backwards;
          animation-delay: 0.1s;
        }

        @keyframes pyramidPop {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1.15);
          }
        }

        @keyframes pyramidSlideLeft {
          from {
            opacity: 0;
            transform: translateX(-40px) translateY(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(-8px) translateY(0) scale(0.92);
          }
        }

        @keyframes pyramidSlideRight {
          from {
            opacity: 0;
            transform: translateX(40px) translateY(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(8px) translateY(0) scale(0.92);
          }
        }

        .topChefCard {
          border-radius: 14px;
          padding: 10px 8px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
          min-height: 120px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
        }

        .pyramidCard {
          min-height: 140px;
          padding: 12px 10px;
        }

        .pyramidSpot.place2 .pyramidCard,
        .pyramidSpot.place3 .pyramidCard {
          min-height: 110px;
          padding: 8px 6px;
        }

        .podiumSpot:hover .topChefCard {
          transform: translateY(-3px) rotateY(-1deg) scale(1.02);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.25);
        }

        .topChefCard::after {
          content: '';
          position: absolute;
          inset: auto -35% -55% -35%;
          height: 80px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.27) 0%, rgba(255, 255, 255, 0) 68%);
          pointer-events: none;
        }

        .topChefCard::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(130deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 42%);
          pointer-events: none;
        }

        .podiumStep {
          width: 100%;
          border-radius: 12px 12px 8px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.16);
          transition: all 0.3s ease;
        }

        .pyramidRank {
          margin-top: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.25);
          font-size: 0.7rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(4px);
        }

        .podiumSpot:hover .podiumStep {
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.22);
        }

        .podiumPlace {
          font-size: 1rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.95);
        }

        .place1 .topChefCard,
        .place1 .pyramidCard {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #ea580c 50%, #d97706 75%, #f59e0b 100%);
          background-size: 400% 400%;
          animation: goldenGradientShift 6s ease infinite;
          position: relative;
        }

        .place1 .topChefCard::before,
        .place1 .pyramidCard::before {
          box-shadow: inset 0 -2px 8px rgba(139, 90, 20, 0.25), inset 0 2px 4px rgba(255, 200, 100, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.2);
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.15) 50%, transparent 70%);
          animation: shimmer 3s infinite;
        }

        .place1 .topChefCard,
        .place1 .pyramidCard {
          box-shadow: 0 16px 40px rgba(251, 146, 60, 0.5), 0 0 30px rgba(251, 191, 36, 0.3);
        }

        .place2 .topChefCard,
        .place2 .pyramidCard {
          background: linear-gradient(135deg, #60a5fa 0%, #06b6d4 25%, #14b8a6 50%, #06b6d4 75%, #60a5fa 100%);
          background-size: 400% 400%;
          animation: blueGradientShift 6s ease infinite;
          position: relative;
        }

        .place2 .topChefCard::before,
        .place2 .pyramidCard::before {
          box-shadow: inset 0 -2px 8px rgba(20, 80, 120, 0.25), inset 0 2px 4px rgba(100, 200, 255, 0.3), inset 0 0 20px rgba(96, 165, 250, 0.15);
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%);
        }

        .place2 .topChefCard,
        .place2 .pyramidCard {
          box-shadow: 0 12px 32px rgba(96, 165, 250, 0.4), 0 0 25px rgba(96, 165, 250, 0.25);
        }

        .place3 .topChefCard,
        .place3 .pyramidCard {
          background: linear-gradient(135deg, #d4663f 0%, #8b5a2b 25%, #6b4423 50%, #a0522d 75%, #cd853f 100%);
          background-size: 400% 400%;
          animation: bronzeGradientShift 6s ease infinite;
          position: relative;
        }

        .place3 .topChefCard::before,
        .place3 .pyramidCard::before {
          box-shadow: inset 0 -2px 8px rgba(60, 30, 10, 0.3), inset 0 2px 4px rgba(205, 133, 63, 0.3), inset 0 0 20px rgba(169, 82, 45, 0.15);
          background: linear-gradient(45deg, transparent 30%, rgba(255, 200, 100, 0.1) 50%, transparent 70%);
        }

        .place3 .topChefCard,
        .place3 .pyramidCard {
          box-shadow: 0 10px 28px rgba(212, 102, 63, 0.35), 0 0 20px rgba(205, 133, 63, 0.2);
        }

        .podiumSpot.you .topChefCard {
          outline: 2px solid rgba(255, 255, 255, 0.62);
          outline-offset: -2px;
        }

        .podiumSpot:hover .topChefCard {
          transform: translateY(-2px);
        }

        .topChefRank {
          font-size: 1.2rem;
          margin-bottom: 6px;
          display: inline-block;
          animation: medalFloat 3s ease-in-out infinite;
        }

        @keyframes medalFloat {
          0%, 100% {
            transform: translateY(0px) rotateZ(0deg);
          }
          25% {
            transform: translateY(-4px) rotateZ(-2deg);
          }
          75% {
            transform: translateY(-2px) rotateZ(2deg);
          }
        }

        .topChefAvatar {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.2);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          animation: avatarPulse 2s ease-in-out infinite;
        }

        @keyframes avatarPulse {
          0%, 100% {
            box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.6);
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(255, 255, 255, 0);
          }
        }

        .topChefName {
          margin-top: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.25;
          max-width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }

        .topChefRecipes {
          margin-top: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.92);
        }

        .chefHat {
          font-size: 0.78rem;
          flex-shrink: 0;
        }

        .leaderboardList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .cookingList {
          position: relative;
          z-index: 1;
        }

        .leaderRow {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid #f5d0ae;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 6px 16px rgba(154, 52, 18, 0.08);
          transition: all 0.2s ease;
          animation: leaderRowEntrance 0.5s ease-out backwards;
        }

        .leaderRow:nth-child(1) {
          animation-delay: 0.05s;
        }

        .leaderRow:nth-child(2) {
          animation-delay: 0.1s;
        }

        .leaderRow:nth-child(3) {
          animation-delay: 0.15s;
        }

        .leaderRow:nth-child(n+4) {
          animation-delay: calc(0.15s + (var(--row-index) * 0.05s));
        }

        @keyframes leaderRowEntrance {
          from {
            opacity: 0;
            transform: translateX(-15px) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0) translateY(0);
          }
        }

        .leaderRow:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 18px rgba(154, 52, 18, 0.12);
          background: rgba(255, 255, 255, 0.95);
        }

        .cookingRow.you {
          background: #fff7ed;
          border-color: #fb923c;
        }

        .leaderRow.topChef {
          border-color: #f97316;
          background: linear-gradient(135deg, rgba(255, 247, 237, 0.95), rgba(255, 243, 224, 0.85));
          box-shadow: 0 8px 20px rgba(249, 115, 22, 0.15);
        }

        .leaderRow.topChef:hover {
          background: linear-gradient(135deg, rgba(255, 247, 237, 1), rgba(255, 243, 224, 0.95));
          box-shadow: 0 12px 28px rgba(249, 115, 22, 0.22);
        }

        .rankBadge {
          font-size: 0.75rem;
          font-weight: 800;
          color: #7c2d12;
          min-width: 34px;
          padding: 4px 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border: 2px solid #fb923c;
          text-align: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
          animation: rankBadgePulse 2s ease-in-out infinite;
        }

        .leaderRow:hover .rankBadge {
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
          transform: scale(1.1);
        }

        @keyframes rankBadgePulse {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
          }
          50% {
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
          }
        }

        .chefInfo {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .chefInfo img,
        .avatarFallback {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          object-fit: cover;
          background: #e2e8f0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #334155;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .leaderRow:hover .chefInfo img,
        .leaderRow:hover .avatarFallback {
          transform: scale(1.15) rotateY(10deg);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .chefName {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          min-width: 0;
          gap: 1px;
        }

        .chefNameMain {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all 0.2s ease;
        }

        .leaderRow:hover .chefNameMain {
          font-weight: 800;
        }

        .chefHat {
          font-size: 0.78rem;
          flex-shrink: 0;
          display: inline-block;
          animation: chefHatWave 2s ease-in-out infinite;
        }

        @keyframes chefHatWave {
          0%, 100% {
            transform: rotateZ(0deg);
          }
          25% {
            transform: rotateZ(-2deg);
          }
          75% {
            transform: rotateZ(2deg);
          }
        }

        .topChefBadge {
          font-size: 0.7rem;
          display: inline-flex;
          animation: topChefFlame 1.5s ease-in-out infinite;
          margin-left: 2px;
        }

        @keyframes topChefFlame {
          0%, 100% {
            transform: scale(1) translateY(0);
          }
          50% {
            transform: scale(1.2) translateY(-2px);
          }
        }

        @keyframes goldenGradientShift {
          0% {
            background-position: 0% 50%;
            filter: brightness(1);
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.1);
          }
          100% {
            background-position: 0% 50%;
            filter: brightness(1);
          }
        }

        @keyframes blueGradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.05);
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes bronzeGradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.08);
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px;
          }
          100% {
            background-position: 1000px;
          }
        }

        .chefRole {
          font-size: 0.66rem;
          font-weight: 600;
          color: #9a3412;
          margin-top: 1px;
        }

        .countWrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          min-width: 52px;
          padding: 4px 6px;
          border-radius: 10px;
          border: 1px solid #fed7aa;
          background: rgba(255, 247, 237, 0.75);
        }

        .count {
          font-size: 0.88rem;
          font-weight: 800;
          color: #9a3412;
          min-width: 22px;
          text-align: right;
        }

        .heatTrack {
          width: 48px;
          height: 5px;
          border-radius: 999px;
          background: #fed7aa;
          overflow: hidden;
          position: relative;
        }

        .heatFill {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #fb923c, #ea580c);
          animation: heatGlow 2s ease-in-out infinite, heatExpand 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
          box-shadow: 0 0 6px rgba(249, 115, 22, 0.4);
        }

        .leaderRow:nth-child(1) .heatFill {
          animation-delay: 0.05s;
        }

        .leaderRow:nth-child(2) .heatFill {
          animation-delay: 0.1s;
        }

        .leaderRow:nth-child(3) .heatFill {
          animation-delay: 0.15s;
        }

        .leaderRow:nth-child(n+4) .heatFill {
          animation-delay: calc(0.15s + (var(--row-index) * 0.05s));
        }

        @keyframes heatGlow {
          0%, 100% {
            box-shadow: 0 0 6px rgba(249, 115, 22, 0.4);
          }
          50% {
            box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
          }
        }

        @keyframes heatExpand {
          from {
            width: 0%;
            box-shadow: 0 0 4px rgba(249, 115, 22, 0.2);
          }
          to {
            width: 100%;
          }
        }

        .feedPanel {
          padding-bottom: 8px;
          background: linear-gradient(180deg, #ffffff 0%, #fffaf3 100%);
          border-color: #f7d7b5;
        }

        .feedBadge {
          margin-top: 7px;
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #fed7aa;
          background: #fff7ed;
          color: #9a3412;
          font-size: 0.68rem;
          font-weight: 700;
        }

        @media (max-width: 420px) {
          .heroTitle {
            font-size: 0.94rem;
          }

          .heroStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .leaderboardRibbon {
            font-size: 0.66rem;
            padding: 7px 8px;
          }

          .podiumArena {
            padding: 8px 6px 6px;
          }

          .podiumStage {
            gap: 6px;
          }

          .topChefCard {
            min-height: 108px;
            padding: 8px 6px;
          }

          .place1 .podiumStep {
            min-height: 74px;
          }

          .place2 .podiumStep {
            min-height: 58px;
          }

          .place3 .podiumStep {
            min-height: 48px;
          }
        }
      `}</style>
    </div>
  )
}

export async function getServerSideProps(context) {
  const protocol = context.req.headers['x-forwarded-proto'] || 'http'
  const host = context.req.headers.host
  const baseUrl = `${protocol}://${host}`

  let initialRecipes = []
  let initialEngagement = {}

  try {
    const recipesResponse = await fetch(`${baseUrl}/api/recipes?limit=12`)

    if (recipesResponse.ok) {
      const recipesData = await recipesResponse.json()

      if (Array.isArray(recipesData)) {
        initialRecipes = recipesData

        const recipeIds = recipesData.map(recipe => recipe?.id).filter(Boolean)
        if (recipeIds.length > 0) {
          const params = new URLSearchParams({ recipe_ids: recipeIds.join(',') })
          const engagementResponse = await fetch(`${baseUrl}/api/recipes/engagement?${params.toString()}`)

          if (engagementResponse.ok) {
            const engagementData = await engagementResponse.json()
            if (engagementData && typeof engagementData === 'object') {
              initialEngagement = engagementData
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du prechargement des recettes', error)
  }

  return {
    props: {
      initialRecipes,
      initialEngagement
    }
  }
}
