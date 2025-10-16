import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import Layout from '../components/Layout'
import TrophySection from '../components/TrophySection'
import { logError, logInfo, logUserInteraction } from '../utils/logger'
import { getUserStatsComplete, updateProfileWithTrophySync } from '../utils/profileUtils'
import styles from '../styles/ProfilePage.module.css'

const tabs = [
  { id: 'overview', label: 'Profil' },
  { id: 'recipes', label: 'Recettes' },
  { id: 'trophies', label: 'Trophees' }
]

const TAB_IDS = tabs.map((tab) => tab.id)

const PROFILE_FIELDS = ['display_name', 'bio', 'location', 'website', 'phone', 'date_of_birth']

const tipDefinitions = [
  { key: 'display_name', message: 'Ajoutez un nom affiche' },
  { key: 'bio', message: 'Partagez une courte bio' },
  { key: 'location', message: 'Precisez votre ville' },
  { key: 'website', message: 'Ajoutez un lien vers vos reseaux' },
  { key: 'phone', message: 'Indiquez un moyen de contact' }
]

function calculateProfileCompleteness(formData = {}) {
  const fieldsCompleted = PROFILE_FIELDS.filter((field) => {
    const value = formData[field]
    if (!value) {
      return false
    }
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return true
  })
  return Math.round((fieldsCompleted.length / PROFILE_FIELDS.length) * 100)
}

function formatDate(value) {
  if (!value) {
    return null
  }
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch (error) {
    return value
  }
}

function normaliseDateInput(value) {
  if (!value) {
    return ''
  }
  if (value.includes('T')) {
    return value.split('T')[0]
  }
  return value
}

export default function Profil() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRecipes, setUserRecipes] = useState([])
  const [userStats, setUserStats] = useState({
    recipesCount: 0,
    likesReceived: 0,
    friendsCount: 0,
    trophyPoints: 0,
    trophiesUnlocked: 0,
    profileCompleteness: 0,
    daysSinceRegistration: 0,
    memberSince: null
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    website: '',
    date_of_birth: '',
    phone: '',
    is_private: false
  })
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  const [validationErrors, setValidationErrors] = useState({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newTrophies, setNewTrophies] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!router.isReady) {
      return
    }
    const queryTab = router.query.tab
    const requestedTab = Array.isArray(queryTab) ? queryTab[0] : queryTab
    if (requestedTab && TAB_IDS.includes(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab)
    }
  }, [router.isReady, router.query.tab, activeTab])

  const loadUserStats = useCallback(
    async (profileData, recipesData) => {
      if (!user) {
        return
      }
      try {
        const statsData = await getUserStatsComplete(user.id)
        const recipesCount = Array.isArray(recipesData) ? recipesData.length : 0
        setUserStats({
          recipesCount,
          likesReceived: statsData.likesReceived || 0,
          friendsCount: statsData.friendsCount || 0,
          trophyPoints: statsData.trophyPoints || 0,
          trophiesUnlocked: statsData.trophiesUnlocked || 0,
          profileCompleteness: calculateProfileCompleteness(profileData || {}),
          daysSinceRegistration: statsData.daysSinceRegistration || 0,
          memberSince: user?.created_at ? formatDate(user.created_at) : null
        })
        logInfo('User stats loaded', {
          userId: user.id,
          recipesCount,
          friendsCount: statsData.friendsCount || 0
        })
      } catch (statsError) {
        logError('Failed to load user stats', statsError)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: 0,
          friendsCount: 0,
          trophyPoints: 0,
          trophiesUnlocked: 0,
          profileCompleteness: calculateProfileCompleteness(profileData || {}),
          daysSinceRegistration: 0,
          memberSince: user?.created_at ? formatDate(user.created_at) : null
        })
      }
    },
    [user]
  )

  const loadUserProfile = useCallback(async () => {
    if (!user) {
      return
    }
    try {
      setLoading(true)
      setError('')
      setSaveSuccess(false)

      const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
      let profileData = null
      if (profileResponse.ok) {
        profileData = await profileResponse.json()
        setProfile(profileData)
        setEditForm({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || '',
          date_of_birth: profileData.date_of_birth || '',
          phone: profileData.phone || '',
          is_private: profileData.is_private || false
        })
      } else {
        logError('Failed to load user profile', new Error(`HTTP ${profileResponse.status}`), {
          userId: user.id
        })
        setProfile(null)
        setEditForm({
          display_name: '',
          bio: '',
          location: '',
          website: '',
          date_of_birth: '',
          phone: '',
          is_private: false
        })
      }

      let recipesList = []
      try {
        const recipesResponse = await fetch(`/api/recipes?user_id=${user.id}&limit=6`)
        if (recipesResponse.ok) {
          const data = await recipesResponse.json()
          recipesList = Array.isArray(data) ? data : []
          setUserRecipes(recipesList)
        } else {
          logError('Failed to load user recipes', new Error(`HTTP ${recipesResponse.status}`), {
            userId: user.id
          })
          setUserRecipes([])
        }
      } catch (recipesError) {
        logError('Failed to load user recipes', recipesError, { userId: user.id })
        setUserRecipes([])
      }

      await loadUserStats(profileData || {}, recipesList)

      logInfo('User profile loaded', {
        userId: user.id,
        hasProfile: !!profileData,
        recipesCount: recipesList.length
      })
    } catch (loadError) {
      logError('Failed to load user profile', loadError)
      setError('Impossible de charger votre profil. Veuillez reessayer.')
    } finally {
      setLoading(false)
    }
  }, [user, loadUserStats])

  useEffect(() => {
    if (authLoading) {
      return
    }
    if (!user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'profil', {
        reason: 'user_not_authenticated',
        targetPage: '/profil'
      })
      router.push('/login?redirect=' + encodeURIComponent('/profil'))
      return
    }
    loadUserProfile()
  }, [authLoading, user, router, loadUserProfile])

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) {
      return
    }
    setActiveTab(tabId)
    if (!router.isReady) {
      return
    }
    const nextQuery = { ...router.query }
    if (tabId === tabs[0].id) {
      delete nextQuery.tab
    } else {
      nextQuery.tab = tabId
    }
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
  }

  const handleEditClick = () => {
    if (!profile) {
      return
    }
    setValidationErrors({})
    setIsEditing(true)
    logUserInteraction('EDIT_PROFILE_OPEN', 'profil-header', { userId: user?.id })
  }

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        date_of_birth: profile.date_of_birth || '',
        phone: profile.phone || '',
        is_private: profile.is_private || false
      })
    }
    setValidationErrors({})
    setIsEditing(false)
  }

  const handleFieldChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveProfile = async () => {
    if (!user) {
      return
    }
    try {
      setSaving(true)
      setValidationErrors({})
      setError('')
      setSaveSuccess(false)

      const result = await updateProfileWithTrophySync(user.id, editForm)

      if (result.success) {
        setProfile(result.profile)
        setIsEditing(false)
        setSaveSuccess(true)
        setNewTrophies(result.newTrophies || [])
        await loadUserStats(result.profile || {}, userRecipes)
        logUserInteraction('UPDATE_PROFILE', 'profil-form', {
          userId: user.id,
          newTrophies: result.newTrophies?.length || 0
        })
        setTimeout(() => setSaveSuccess(false), 2500)
      } else {
        if (result.validation?.errors) {
          setValidationErrors(result.validation.errors)
        }
        throw new Error(result.error || 'Profil non mis a jour')
      }
    } catch (saveError) {
      logError('Failed to save profile', saveError)
      setError('Impossible de sauvegarder le profil. Veuillez reessayer.')
    } finally {
      setSaving(false)
    }
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()
    handleSaveProfile()
  }

  const handleViewAllRecipes = () => {
    logUserInteraction('VIEW_ALL_RECIPES', 'profil-recettes', {
      userId: user?.id,
      totalRecipes: userRecipes.length
    })
    router.push('/mes-recettes')
  }

  const profileInitial = useMemo(() => {
    const source =
      profile?.display_name ||
      user?.user_metadata?.display_name ||
      user?.email ||
      'U'
    return source.trim().charAt(0).toUpperCase()
  }, [profile, user])

  const displayName = useMemo(() => {
    if (profile?.display_name) {
      return profile.display_name
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Utilisateur'
  }, [profile, user])

  const infoItems = useMemo(
    () => [
      { label: 'Email', value: user?.email || 'Non renseigne' },
      { label: 'Nom affiche', value: profile?.display_name || 'Non renseigne' },
      { label: 'Biographie', value: profile?.bio || 'Non renseignee' },
      { label: 'Ville', value: profile?.location || 'Non renseignee' },
      {
        label: 'Site web',
        value: profile?.website || 'Non renseigne',
        isLink: !!profile?.website
      },
      { label: 'Telephone', value: profile?.phone || 'Non renseigne' },
      {
        label: 'Date de naissance',
        value: formatDate(profile?.date_of_birth) || 'Non renseignee'
      },
      {
        label: 'Confidentialite',
        value: profile?.is_private ? 'Profil prive' : 'Profil public'
      },
      { label: 'Membre depuis', value: userStats.memberSince || 'Non renseigne' }
    ],
    [profile, user, userStats.memberSince]
  )

  const missingFields = useMemo(
    () =>
      tipDefinitions.filter((tip) => {
        const value = profile?.[tip.key]
        if (!value) {
          return true
        }
        if (typeof value === 'string') {
          return value.trim().length === 0
        }
        return false
      }),
    [profile]
  )

  const statsItems = useMemo(
    () => [
      { label: 'Recettes', value: userStats.recipesCount },
      { label: 'Amis', value: userStats.friendsCount },
      { label: 'Likes', value: userStats.likesReceived },
      { label: 'Trophees', value: userStats.trophiesUnlocked },
      { label: 'Profil complet', value: `${userStats.profileCompleteness}%` }
    ],
    [userStats]
  )

  if (authLoading) {
    return null
  }

  if (!user) {
    return null
  }

  if (!loading && !profile && error) {
    return (
      <Layout title="Mon profil - COCO">
        <div className={styles.page}>
          <div className={styles.content}>
            <div className={`${styles.message} ${styles.messageError}`}>
              {error}
            </div>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={loadUserProfile}
            >
              Reessayer
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading) {
    return (
      <Layout title="Mon profil - COCO">
        <div className={styles.page}>
          <div className={styles.content}>
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <span>Chargement du profil...</span>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const renderOverview = () => {
    if (isEditing) {
      return (
        <form className={styles.form} onSubmit={handleFormSubmit}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="display_name">
              Nom affiche
            </label>
            <input
              id="display_name"
              type="text"
              className={styles.input}
              value={editForm.display_name}
              onChange={handleFieldChange('display_name')}
              placeholder="Votre nom"
            />
            {validationErrors.display_name && (
              <p className={styles.validation}>{validationErrors.display_name}</p>
            )}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="bio">
              Biographie
            </label>
            <textarea
              id="bio"
              className={styles.textarea}
              value={editForm.bio}
              onChange={handleFieldChange('bio')}
              placeholder="Parlez de votre cuisine prefere"
            />
            {validationErrors.bio && (
              <p className={styles.validation}>{validationErrors.bio}</p>
            )}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="location">
              Ville
            </label>
            <input
              id="location"
              type="text"
              className={styles.input}
              value={editForm.location}
              onChange={handleFieldChange('location')}
              placeholder="Lille, Paris..."
            />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="website">
              Site web
            </label>
            <input
              id="website"
              type="url"
              className={styles.input}
              value={editForm.website}
              onChange={handleFieldChange('website')}
              placeholder="https://..."
            />
            {validationErrors.website && (
              <p className={styles.validation}>{validationErrors.website}</p>
            )}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="phone">
              Telephone
            </label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              value={editForm.phone}
              onChange={handleFieldChange('phone')}
              placeholder="+33..."
            />
            {validationErrors.phone && (
              <p className={styles.validation}>{validationErrors.phone}</p>
            )}
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor="date_of_birth">
              Date de naissance
            </label>
            <input
              id="date_of_birth"
              type="date"
              className={styles.input}
              value={normaliseDateInput(editForm.date_of_birth)}
              onChange={handleFieldChange('date_of_birth')}
            />
            {validationErrors.date_of_birth && (
              <p className={styles.validation}>{validationErrors.date_of_birth}</p>
            )}
          </div>

          <div className={`${styles.formRow} ${styles.checkboxRow}`}>
            <input
              id="is_private"
              type="checkbox"
              checked={!!editForm.is_private}
              onChange={handleFieldChange('is_private')}
            />
            <label className={styles.label} htmlFor="is_private">
              Rendre mon profil prive
            </label>
          </div>

          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.button}
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )
    }

    return (
      <>
        <div className={styles.infoGrid}>
          {infoItems.map((item) => (
            <div className={styles.infoItem} key={item.label}>
              <span className={styles.infoLabel}>{item.label}</span>
              {item.isLink && item.value && item.value !== 'Non renseigne' ? (
                <a
                  className={styles.infoValue}
                  href={item.value}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.value}
                </a>
              ) : (
                <span className={styles.infoValue}>{item.value}</span>
              )}
            </div>
          ))}
        </div>
        {missingFields.length > 0 && (
          <div className={styles.tips}>
            <strong>Quelques idees pour enrichir votre profil</strong>
            <ul className={styles.tipList}>
              {missingFields.map((tip) => (
                <li key={tip.key}>{tip.message}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    )
  }

  const renderRecipes = () => {
    if (userRecipes.length === 0) {
      return (
        <div className={styles.empty}>
          <p>Publiez votre premiere recette pour nourrir la communaute.</p>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => router.push('/share-photo')}
          >
            Ajouter une recette
          </button>
        </div>
      )
    }

    return (
      <>
        <div className={styles.recipesGrid}>
          {userRecipes.map((recipe) => (
            <article
              key={recipe.id}
              className={styles.recipeCard}
              onClick={() => router.push(`/recipe/${recipe.id}`)}
            >
              <h3 className={styles.recipeTitle}>{recipe.title}</h3>
              <p className={styles.recipeMeta}>{recipe.category || 'Recette COCO'}</p>
              <p className={styles.recipeMeta}>
                {`Likes : ${recipe.likes_count ?? 0}`}
              </p>
            </article>
          ))}
        </div>
        <div className={styles.panelActions}>
          <button type="button" className={styles.button} onClick={handleViewAllRecipes}>
            Voir toutes mes recettes
          </button>
        </div>
      </>
    )
  }

  const renderTrophies = () => (
    <div>
      <h2 className={styles.sectionTitle}>Mes trophees</h2>
      <TrophySection userId={user.id} />
    </div>
  )

  return (
    <Layout title="Mon profil - COCO">
      <div className={styles.page}>
        <div className={styles.content}>
          {error && (
            <div className={`${styles.message} ${styles.messageError}`}>
              <span>{error}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonTertiary}`}
                onClick={loadUserProfile}
              >
                Rafraichir
              </button>
            </div>
          )}

          {saveSuccess && (
            <div className={`${styles.message} ${styles.messageSuccess}`}>
              Profil mis a jour avec succes.
            </div>
          )}

          {newTrophies.length > 0 && (
            <div className={styles.highlight}>
              <strong>Nouveaux trophees debloques</strong>
              <ul className={styles.highlightList}>
                {newTrophies.map((trophy) => (
                  <li key={trophy.id}>{trophy.name}</li>
                ))}
              </ul>
            </div>
          )}

          <section className={styles.header}>
            <div className={styles.identity}>
              <div className={styles.avatar}>{profileInitial}</div>
              <div className={styles.userInfo}>
                <h1 className={styles.userName}>{displayName}</h1>
                <div className={styles.userMeta}>
                  {user?.email && <span>{user.email}</span>}
                  {userStats.memberSince && (
                    <span>Inscrit depuis {userStats.memberSince}</span>
                  )}
                  <span
                    className={`${styles.badge} ${
                      profile?.is_private ? styles.badgePrivate : ''
                    }`}
                  >
                    {profile?.is_private ? 'Profil prive' : 'Profil public'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              {isEditing ? (
                <button
                  type="button"
                  className={styles.button}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Fermer
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  onClick={handleEditClick}
                >
                  Modifier le profil
                </button>
              )}
              <button
                type="button"
                className={styles.button}
                onClick={handleViewAllRecipes}
              >
                Mes recettes
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => router.push('/amis')}
              >
                Mes amis
              </button>
            </div>
          </section>

          <section className={styles.stats}>
            {statsItems.map((item) => (
              <div className={styles.statCard} key={item.label}>
                <span className={styles.statValue}>{item.value}</span>
                <span className={styles.statLabel}>{item.label}</span>
              </div>
            ))}
          </section>

          <nav className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tabButton} ${
                  activeTab === tab.id ? styles.tabButtonActive : ''
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section className={styles.panel}>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'recipes' && renderRecipes()}
            {activeTab === 'trophies' && renderTrophies()}
          </section>
        </div>
      </div>
    </Layout>
  )
}

