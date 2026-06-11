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

      if (recipesError) throw recipesError

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

      if (profilesError) throw profilesError

      const profilesById = new Map((profilesData || []).map(p => [p.user_id, p]))
      const leaderboardData = rankedUserIds
        .map(userId => ({
          user_id: userId,
          display_name: profilesById.get(userId)?.display_name || 'Chef',
          avatar_url: profilesById.get(userId)?.avatar_url || null,
          recipesCount: recipesCountMap[userId] || 0,
          isYou: userId === user.id
        }))
        .sort((a, b) => b.recipesCount !== a.recipesCount
          ? b.recipesCount - a.recipesCount
          : a.display_name.localeCompare(b.display_name)
        )

      setLeaderboard(leaderboardData.slice(0, 10))
    } catch (error) {
      console.error('[Classement]', error)
      setLeaderboard([])
      setLeaderboardError('Impossible de charger le classement.')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) fetchLeaderboard()
  }, [user?.id, fetchLeaderboard])

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => router.push('/presentation'), 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, user, router])

  const topThree = leaderboard.slice(0, 3)
  const podiumOrder = [
    { chef: topThree[1], place: 2, medal: '🥈' },
    { chef: topThree[0], place: 1, medal: '🥇' },
    { chef: topThree[2], place: 3, medal: '🥉' }
  ].filter(e => e.chef)
  const userRankIndex = leaderboard.findIndex(c => c.isYou)

  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Chargement...</p>
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
          .previewCard { margin-top: 24px; padding: 24px 20px; border-radius: 16px; background: linear-gradient(135deg, #fff7ed 0%, #ffffff 100%); border: 1px solid #fed7aa; }
          h1 { margin: 0 0 8px; font-size: 2rem; color: #9a3412; }
          p { margin: 0 0 16px; color: #9a3412; }
          button { border: none; border-radius: 10px; padding: 10px 16px; background: #ea580c; color: white; font-weight: 700; cursor: pointer; }
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
          <section className="panel classementPanel">
            <div className="classementHeader">
              <div className="classementTitleRow">
                <h2>Classement</h2>
                <span className="monthPill">{monthLabel}</span>
              </div>
              <button className="refreshBtn" onClick={fetchLeaderboard} disabled={leaderboardLoading} aria-label="Actualiser">
                {leaderboardLoading ? '...' : '↻'}
              </button>
            </div>

            {leaderboardError && <p className="errorText">{leaderboardError}</p>}

            {leaderboardLoading ? (
              <p className="infoText">Chargement...</p>
            ) : leaderboard.length === 0 ? (
              <p className="emptyText">Aucune recette ce mois-ci. Soyez le premier !</p>
            ) : (
              <>
                <div className="podium">
                  {podiumOrder.map(entry => (
                    <div key={entry.chef.user_id} className={`podiumSlot podiumSlot${entry.place} ${entry.chef.isYou ? 'podiumYou' : ''}`}>
                      <span className="podiumMedal">{entry.medal}</span>
                      {entry.chef.avatar_url ? (
                        <img className="podiumAvatar" src={entry.chef.avatar_url} alt="" />
                      ) : (
                        <span className="podiumAvatar podiumAvatarFb">
                          {entry.chef.display_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="podiumName">
                        {entry.chef.display_name}
                        {entry.chef.isYou && <span className="youTag">vous</span>}
                      </span>
                      <span className="podiumCount">{entry.chef.recipesCount}</span>
                    </div>
                  ))}
                </div>

                <div className="yourRank">
                  {userRankIndex >= 0 ? (
                    <>
                      <strong>#{userRankIndex + 1}</strong>
                      {' · '}
                      {leaderboard[userRankIndex]?.recipesCount || 0} recette{(leaderboard[userRankIndex]?.recipesCount || 0) > 1 ? 's' : ''} ce mois
                    </>
                  ) : (
                    <>Publiez une recette pour entrer au classement</>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="panel feedPanel">
            <div className="feedHeader">
              <h2>Recettes du moment</h2>
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
          max-width: 540px;
          margin: 0 auto;
          padding-top: 54px;
          padding-bottom: 20px;
        }

        .panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
        }

        .classementPanel {
          margin-top: 0;
          background: linear-gradient(145deg, #fefefe, #f8fafc);
          border-color: #d1d5db;
        }

        .classementHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .classementTitleRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #1f2937;
        }

        .monthPill {
          padding: 3px 10px;
          border-radius: 999px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #6b7280;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .refreshBtn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #6b7280;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .refreshBtn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .refreshBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .podium {
          display: grid;
          grid-template-columns: 1fr 1.3fr 1fr;
          gap: 8px;
          align-items: end;
          padding: 8px 0 12px;
        }

        .podiumSlot {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 10px 4px;
          border-radius: 14px;
          transition: transform 0.2s;
        }

        .podiumSlot:hover {
          transform: translateY(-2px);
        }

        .podiumSlot1 {
          background: linear-gradient(145deg, #fffbeb, #fef3c7);
          border: 1px solid #fcd34d;
          padding: 14px 4px;
        }

        .podiumSlot2 {
          background: linear-gradient(145deg, #f0f9ff, #e0f2fe);
          border: 1px solid #93c5fd;
        }

        .podiumSlot3 {
          background: linear-gradient(145deg, #fdf4ef, #fed7aa);
          border: 1px solid #fdba74;
        }

        .podiumYou {
          outline: 2px solid #f97316;
          outline-offset: 1px;
        }

        .podiumMedal {
          font-size: 1.3rem;
          line-height: 1;
        }

        .podiumSlot1 .podiumMedal {
          font-size: 1.6rem;
        }

        .podiumAvatar {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          object-fit: cover;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .podiumSlot1 .podiumAvatar {
          width: 52px;
          height: 52px;
        }

        .podiumAvatarFb {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e5e7eb;
          color: #374151;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .podiumName {
          font-size: 0.75rem;
          font-weight: 700;
          color: #374151;
          text-align: center;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .youTag {
          font-size: 0.58rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #f97316;
          background: #fff7ed;
          border: 1px solid #fdba74;
          border-radius: 999px;
          padding: 1px 5px;
        }

        .podiumCount {
          font-size: 0.82rem;
          font-weight: 800;
          color: #1f2937;
        }

        .podiumSlot1 .podiumCount {
          font-size: 0.95rem;
        }

        .yourRank {
          text-align: center;
          font-size: 0.8rem;
          color: #6b7280;
          padding: 8px 0 2px;
          border-top: 1px solid #e5e7eb;
        }

        .yourRank strong {
          color: #f97316;
          font-weight: 800;
        }

        .errorText {
          margin: 0;
          font-size: 0.85rem;
          color: #b91c1c;
        }

        .infoText {
          margin: 0;
          font-size: 0.85rem;
          color: #6b7280;
          text-align: center;
        }

        .emptyText {
          margin: 0;
          font-size: 0.85rem;
          color: #6b7280;
          text-align: center;
          padding: 16px 0;
        }

        .feedPanel {
          background: linear-gradient(180deg, #ffffff 0%, #fffaf3 100%);
          border-color: #f7d7b5;
        }

        .feedHeader {
          margin-bottom: 12px;
        }

        .feedHeader h2 {
          font-size: 1rem;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        @media (max-width: 380px) {
          .podiumSlot1 .podiumAvatar {
            width: 44px;
            height: 44px;
          }

          .podiumAvatar {
            width: 36px;
            height: 36px;
          }

          .podiumName {
            font-size: 0.68rem;
            max-width: 72px;
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
