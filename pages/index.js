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
          if (b.recipesCount !== a.recipesCount) {
            return b.recipesCount - a.recipesCount
          }
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

          <section className="panel">
            <div className="sectionHeader">
              <div>
                <h2>Classement mensuel</h2>
                <p>{monthLabel}</p>
              </div>
              <button className="refreshBtn" onClick={fetchLeaderboard} disabled={leaderboardLoading}>
                {leaderboardLoading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>

            {leaderboardError && <p className="infoError">{leaderboardError}</p>}

            {leaderboardLoading ? (
              <p className="infoText">Chargement du classement...</p>
            ) : leaderboard.length === 0 ? (
              <p className="infoText">Aucune recette publiee ce mois-ci.</p>
            ) : (
              <ol className="leaderboardList">
                {leaderboard.map((chef, index) => (
                  <li key={chef.user_id} className={`leaderRow ${chef.isYou ? 'you' : ''}`}>
                    <span className="rank">#{index + 1}</span>
                    <div className="chefInfo">
                      {chef.avatar_url ? (
                        <img src={chef.avatar_url} alt="" />
                      ) : (
                        <span className="avatarFallback">{chef.display_name.charAt(0).toUpperCase()}</span>
                      )}
                      <span className="chefName">
                        {chef.display_name}
                        {chef.isYou ? ' (vous)' : ''}
                      </span>
                    </div>
                    <span className="count">{chef.recipesCount}</span>
                  </li>
                ))}
              </ol>
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

        .refreshBtn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .sectionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .infoText {
          margin: 0;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .infoError {
          margin: 0 0 10px;
          font-size: 0.85rem;
          color: #b91c1c;
        }

        .leaderboardList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .leaderRow {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .leaderRow.you {
          background: #fff7ed;
          border-color: #fdba74;
        }

        .rank {
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          min-width: 32px;
        }

        .chefInfo {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .chefInfo img,
        .avatarFallback {
          width: 28px;
          height: 28px;
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
          font-size: 0.88rem;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .count {
          font-size: 0.88rem;
          font-weight: 700;
          color: #9a3412;
          min-width: 22px;
          text-align: right;
        }

        .feedPanel {
          padding-bottom: 8px;
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
