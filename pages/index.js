import Head from 'next/head'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'
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
  const remainingLeaders = leaderboard.slice(3)
  const maxRecipesCount =
    leaderboard.reduce((maxValue, chef) => Math.max(maxValue, chef.recipesCount || 0), 0) || 1

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
        <title>COCO - Accueil Communaute</title>
        <meta name="description" content="Classement mensuel et feed recettes de la communaute COCO." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <main className={styles.main}>
        <div className={styles.content} style={{ maxWidth: 420, margin: '0 auto', paddingBottom: 20 }}>
          <section className="panel heroPanel">
            <h1>Accueil Communaute</h1>
            <p>Une page simple avec le classement mensuel et le feed recettes.</p>
            <div className="actions">
              <button className="primaryBtn" onClick={() => router.push('/share-photo')}>
                Partager une recette
              </button>
              <button className="ghostBtn" onClick={() => router.push('/amis')}>
                Gerer mes amis
              </button>
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

            {leaderboardError && <p className="infoError">{leaderboardError}</p>}

            {leaderboardLoading ? (
              <p className="infoText">Chargement du classement...</p>
            ) : leaderboard.length === 0 ? (
              <p className="infoText cookingEmpty">Aucune recette publiee ce mois-ci.</p>
            ) : (
              <>
                <div className="podiumGrid">
                  {topThree.map((chef, index) => (
                    <article
                      key={chef.user_id}
                      className={`topChefCard place${index + 1} ${chef.isYou ? 'you' : ''}`}
                    >
                      <span className="topChefRank">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      {chef.avatar_url ? (
                        <img className="topChefAvatar" src={chef.avatar_url} alt="" />
                      ) : (
                        <span className="topChefAvatar avatarFallback">
                          {chef.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <h3 className="topChefName">
                        {chef.display_name}
                        {chef.isYou ? ' (vous)' : ''}
                      </h3>
                      <p className="topChefRecipes">
                        {chef.recipesCount} recette{chef.recipesCount > 1 ? 's' : ''}
                      </p>
                    </article>
                  ))}
                </div>

                {remainingLeaders.length > 0 && (
                  <ol className="leaderboardList cookingList">
                    {remainingLeaders.map((chef, index) => {
                      const rank = index + 4
                      const heatWidth = Math.max(
                        10,
                        Math.round(((chef.recipesCount || 0) / maxRecipesCount) * 100)
                      )

                      return (
                        <li key={chef.user_id} className={`leaderRow cookingRow ${chef.isYou ? 'you' : ''}`}>
                          <span className="rankBadge">#{rank}</span>
                          <div className="chefInfo">
                            {chef.avatar_url ? (
                              <img src={chef.avatar_url} alt="" />
                            ) : (
                              <span className="avatarFallback">{chef.display_name.charAt(0).toUpperCase()}</span>
                            )}
                            <span className="chefName">
                              {chef.display_name}
                              {chef.isYou ? ' (vous)' : ''}
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
        .panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .heroPanel {
          background: linear-gradient(135deg, #fff7ed 0%, #ffffff 70%);
          border-color: #fed7aa;
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

        h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #9a3412;
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

        .actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .primaryBtn,
        .ghostBtn,
        .refreshBtn {
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }

        .primaryBtn {
          border: none;
          background: #ea580c;
          color: white;
        }

        .ghostBtn {
          border: 1px solid #fdba74;
          background: #fff7ed;
          color: #9a3412;
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

        .podiumGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
          position: relative;
          z-index: 1;
        }

        .topChefCard {
          border-radius: 14px;
          padding: 12px 8px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
          min-height: 138px;
          position: relative;
          overflow: hidden;
        }

        .topChefCard::after {
          content: '';
          position: absolute;
          inset: auto -35% -55% -35%;
          height: 80px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.27) 0%, rgba(255, 255, 255, 0) 68%);
          pointer-events: none;
        }

        .place1 {
          background: linear-gradient(160deg, #f59e0b, #f97316);
        }

        .place2 {
          background: linear-gradient(160deg, #64748b, #334155);
        }

        .place3 {
          background: linear-gradient(160deg, #b45309, #92400e);
        }

        .topChefCard.you {
          outline: 2px solid rgba(255, 255, 255, 0.62);
          outline-offset: -2px;
        }

        .topChefRank {
          font-size: 1.2rem;
          margin-bottom: 6px;
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
        }

        .topChefName {
          margin-top: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .topChefRecipes {
          margin-top: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.92);
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
        }

        .cookingRow.you {
          background: #fff7ed;
          border-color: #fb923c;
        }

        .rankBadge {
          font-size: 0.75rem;
          font-weight: 800;
          color: #7c2d12;
          min-width: 34px;
          padding: 4px 6px;
          border-radius: 999px;
          background: #ffedd5;
          border: 1px solid #fdba74;
          text-align: center;
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
        }

        .chefName {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          flex-direction: column;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
        }

        .heatFill {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #fb923c, #ea580c);
        }

        .feedPanel {
          padding-bottom: 8px;
        }

        @media (max-width: 420px) {
          .podiumGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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
