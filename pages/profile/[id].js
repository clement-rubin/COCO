import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabase'
import { logError, logInfo } from '../../utils/logger'
import styles from '../../styles/PublicProfile.module.css'

const DEFAULT_PROFILE = {
  display_name: 'Chef COCO',
  bio: "Ce chef n'a pas encore partagé sa présentation.",
  avatar_url: null
}

function formatFullDate(value) {
  if (!value) {
    return null
  }

  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch (error) {
    return null
  }
}

function formatShortDate(value) {
  if (!value) {
    return null
  }

  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch (error) {
    return null
  }
}

function truncate(text = '', length = 160) {
  if (!text) {
    return ''
  }

  if (text.length <= length) {
    return text
  }

  return `${text.slice(0, length).trim()}…`
}

export default function PublicProfilePage() {
  const router = useRouter()
  const { id } = router.query

  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [recipes, setRecipes] = useState([])
  const [stats, setStats] = useState({
    recipesCount: 0,
    totalLikes: 0,
    friendsCount: 0,
    memberSince: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const initials = useMemo(() => {
    return profile.display_name?.charAt(0)?.toUpperCase() || 'C'
  }, [profile.display_name])

  const loadPublicProfile = useCallback(
    async (userId) => {
      if (!userId) {
        return
      }

      setLoading(true)
      setError('')

      try {
        logInfo('Loading public profile', { userId: userId.substring(0, 8) })

        const [profileResult, statsResponse, recipesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, bio, avatar_url, created_at')
            .eq('user_id', userId)
            .maybeSingle(),
          fetch(`/api/user-stats?user_id=${encodeURIComponent(userId)}`),
          supabase
            .from('recipes')
            .select('id, title, category, created_at, likes_count, description')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        ])

        if (profileResult.error && profileResult.error.code !== 'PGRST116') {
          throw profileResult.error
        }

        const profileData = profileResult.data || {}
        setProfile({
          display_name: profileData.display_name || DEFAULT_PROFILE.display_name,
          bio: profileData.bio || DEFAULT_PROFILE.bio,
          avatar_url: profileData.avatar_url || DEFAULT_PROFILE.avatar_url
        })

        let resolvedStats = {}
        if (statsResponse.ok) {
          resolvedStats = await statsResponse.json()
        }

        const recipesData = recipesResult.error ? [] : recipesResult.data || []
        const totalLikes = recipesData.reduce(
          (sum, recipe) => sum + (recipe.likes_count || 0),
          0
        )

        setStats({
          recipesCount: resolvedStats.recipesCount ?? recipesData.length,
          totalLikes,
          friendsCount: resolvedStats.friendsCount ?? 0,
          memberSince:
            resolvedStats.memberSince || profileData.created_at || null
        })

        setRecipes(recipesData)
      } catch (loadError) {
        logError('Failed to load public profile', loadError, { userId })
        setError("Impossible de charger ce profil pour le moment. Veuillez réessayer plus tard.")
        setProfile(DEFAULT_PROFILE)
        setRecipes([])
        setStats({
          recipesCount: 0,
          totalLikes: 0,
          friendsCount: 0,
          memberSince: null
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!router.isReady || !id) {
      return
    }

    loadPublicProfile(id)
  }, [router.isReady, id, loadPublicProfile])

  const pageTitle = profile.display_name
    ? `Profil de ${profile.display_name}`
    : 'Profil utilisateur'

  return (
    <Layout title={pageTitle}>
      <div className={styles.page}>
        {loading ? (
          <div className={styles.loadingCard}>
            <div className={styles.spinner} />
            <p>Chargement du profil…</p>
          </div>
        ) : error ? (
          <div className={styles.errorCard}>{error}</div>
        ) : (
          <>
            <section className={styles.headerCard}>
              <div className={styles.avatarWrapper}>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={`Avatar de ${profile.display_name}`}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.avatarFallback}>{initials}</div>
                )}
              </div>
              <div className={styles.identity}>
                <h1 className={styles.name}>{profile.display_name}</h1>
                <p className={styles.memberSince}>
                  {stats.memberSince
                    ? `Membre depuis le ${formatFullDate(stats.memberSince)}`
                    : 'Membre de la communauté COCO'}
                </p>
                <p className={styles.bio}>{profile.bio}</p>
              </div>
            </section>

            <section className={styles.statsSection}>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Recettes publiées</span>
                <span className={styles.statValue}>{stats.recipesCount}</span>
                <span className={styles.statHint}>Depuis ses débuts</span>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Likes cumulés</span>
                <span className={styles.statValue}>{stats.totalLikes}</span>
                <span className={styles.statHint}>Applaudissements reçus</span>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statLabel}>Amis</span>
                <span className={styles.statValue}>{stats.friendsCount}</span>
                <span className={styles.statHint}>Liens culinaires</span>
              </article>
            </section>

            <section className={styles.recipesSection}>
              <div className={styles.recipesHeader}>
                <h2 className={styles.recipesTitle}>Recettes partagées</h2>
                <span className={styles.recipeCount}>
                  {stats.recipesCount === 0
                    ? 'Aucune recette publiée pour le moment'
                    : `${stats.recipesCount} recette${
                        stats.recipesCount > 1 ? 's' : ''
                      }`}
                </span>
              </div>

              {recipes.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Ce chef n'a pas encore publié de recette. Revenez bientôt !</p>
                </div>
              ) : (
                <ul className={styles.recipeList}>
                  {recipes.map((recipe) => (
                    <li key={recipe.id} className={styles.recipeCard}>
                      <div className={styles.recipeHeader}>
                        <h3 className={styles.recipeTitle}>{recipe.title}</h3>
                        <span className={styles.recipeDate}>
                          {formatShortDate(recipe.created_at)}
                        </span>
                      </div>
                      {recipe.description && (
                        <p className={styles.recipeDescription}>
                          {truncate(recipe.description)}
                        </p>
                      )}
                      <div className={styles.recipeMeta}>
                        <span>📂 {recipe.category || 'Autre'}</span>
                        <span>❤️ {recipe.likes_count || 0}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
