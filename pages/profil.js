import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import Layout from '../components/Layout'
import TrophySection from '../components/TrophySection'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { getUserStatsComplete, updateProfileWithTrophySync, getFriendshipStats } from '../utils/profileUtils'
import { checkTrophiesAfterProfileUpdate } from '../utils/trophyUtils'
import styles from '../styles/Profile.module.css'

export default function Profil() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
  const [activeTab, setActiveTab] = useState('info')
  const availableTabs = ['info', 'recipes', 'trophies', 'settings']
  const [newTrophies, setNewTrophies] = useState([])
  const [showTrophyNotification, setShowTrophyNotification] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [friendshipStats, setFriendshipStats] = useState({ friends: 0, pending: 0, sent: 0, blocked: 0 })
  const [friendPreview, setFriendPreview] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState(null)

  const infoItems = [
    { label: 'Email', key: 'email', icon: '✉️', isLink: false },
    { label: 'Nom', key: 'display_name', icon: '👤', fallback: 'Non défini' },
    { label: 'Biographie', key: 'bio', icon: '📝', fallback: 'Aucune biographie' },
    { label: 'Localisation', key: 'location', icon: '📍', fallback: 'Non définie' },
    { label: 'Site web', key: 'website', icon: '🌐', isLink: true },
    { label: 'Date de naissance', key: 'date_of_birth', icon: '🎂', formatter: value => new Date(value).toLocaleDateString('fr-FR'), fallback: 'Non définie' },
    { label: 'Téléphone', key: 'phone', icon: '📞', fallback: 'Non défini' },
    { label: 'Confidentialité', key: 'is_private', icon: '⚙️', formatter: value => value ? 'Profil privé 🔒' : 'Profil public 🌍' },
    { label: 'Membre depuis', key: 'created_at', icon: '📅', formatter: value => new Date(value).toLocaleDateString('fr-FR'), source: 'user', fallback: 'N/A' }
  ]

  const profileTips = [
    { key: 'display_name', message: "Ajoutez un nom d'affichage personnalisé" },
    { key: 'bio', message: 'Racontez votre histoire culinaire' },
    { key: 'location', message: 'Indiquez votre localisation pour rencontrer d\'autres gourmets' },
    { key: 'website', message: 'Partagez votre site ou réseau social préféré' },
    { key: 'phone', message: 'Ajoutez un moyen de contact' }
  ]

  const missingFields = profileTips.filter(field => {
    const value = profile?.[field.key]
    if (!value) {
      return true
    }
    if (typeof value === 'string') {
      return value.trim().length === 0
    }
    return false
  })

  useEffect(() => {
    if (!router.isReady) return
    const queryTab = router.query.tab
    const nextTab = Array.isArray(queryTab) ? queryTab[0] : queryTab
    if (nextTab && availableTabs.includes(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab)
    }
  }, [router.isReady, router.query.tab, activeTab])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    const nextQuery = { ...router.query }
    if (tabId === 'info') {
      delete nextQuery.tab
    } else {
      nextQuery.tab = tabId
    }
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'profil', {
        reason: 'user_not_authenticated',
        targetPage: '/profil'
      })
      router.push('/login?redirect=' + encodeURIComponent('/profil'))
      return
    }

    if (user) {
      loadUserProfile()
      loadSocialInsights()
    }
  }, [user, authLoading, router])

  // Fonction manquante pour charger les stats utilisateur
  const loadUserStats = async () => {
    try {
      const statsData = await getUserStatsComplete(user.id)
      setUserStats(prevStats => ({
        ...prevStats,
        recipesCount: userRecipes.length,
        likesReceived: statsData.likesReceived || 0,
        friendsCount: statsData.friendsCount || 0,
        trophyPoints: statsData.trophyPoints || 0,
        trophiesUnlocked: statsData.trophiesUnlocked || 0,
        profileCompleteness: calculateProfileCompleteness(profile || {}),
        daysSinceRegistration: statsData.daysSinceRegistration || 0,
        memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : null
      }))
      
      logInfo('User stats reloaded successfully', {
        userId: user.id,
        stats: statsData
      })
    } catch (error) {
      logError('Failed to reload user stats', error, {
        userId: user.id
      })
    }
  }

  const loadSocialInsights = async () => {
    if (!user) return

    try {
      const stats = await getFriendshipStats(user.id)
      setFriendshipStats({
        friends: stats?.friends || 0,
        pending: stats?.pending || 0,
        sent: stats?.sent || 0,
        blocked: stats?.blocked || 0
      })
    } catch (error) {
      logError('Failed to load friendship stats', error, {
        userId: user?.id
      })
    }

    try {
      setFriendsLoading(true)
      setFriendsError(null)
      const response = await fetch(`/api/friends?user_id=${user.id}`)

      if (response.ok) {
        const data = await response.json()
        const preview = Array.isArray(data?.friends) ? data.friends.slice(0, 3) : []
        setFriendPreview(preview)

        logInfo('Friend preview loaded for profile page', {
          userId: user.id,
          previewCount: preview.length
        })
      } else {
        setFriendPreview([])
        setFriendsError('Impossible de récupérer vos amis pour le moment.')
      }
    } catch (error) {
      logError('Failed to load friend preview', error, { userId: user?.id })
      setFriendPreview([])
      setFriendsError('Impossible de récupérer vos amis pour le moment.')
    } finally {
      setFriendsLoading(false)
    }
  }

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load user profile
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
      }

      // Load user recipes using user_id instead of author
      let recipesData = []
      try {
        const recipesResponse = await fetch(`/api/recipes?user_id=${user.id}&limit=6`)
        if (recipesResponse.ok) {
          recipesData = await recipesResponse.json()
          // Ensure recipesData is an array
          setUserRecipes(Array.isArray(recipesData) ? recipesData : [])
          
          logInfo('User recipes loaded', {
            userId: user.id,
            recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
            recipesData: recipesData?.slice(0, 2)?.map(r => ({
              id: r.id,
              title: r.title,
              author: r.author,
              user_id: r.user_id,
              category: r.category,
              likes_count: r.likes_count || 0 // Inclure les likes réels
            }))
          })
        } else {
          logError('Failed to load user recipes', new Error(`HTTP ${recipesResponse.status}`), {
            userId: user.id,
            status: recipesResponse.status
          })
          setUserRecipes([])
        }
      } catch (recipesError) {
        logError('Failed to load user recipes', recipesError, {
          userId: user.id,
          error: recipesError.message
        })
        setUserRecipes([])
      }

      // Load user stats using the corrected utility function with trophy data
      try {
        const statsData = await getUserStatsComplete(user.id)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: statsData.likesReceived || 0,
          friendsCount: statsData.friendsCount || 0,
          trophyPoints: statsData.trophyPoints || 0,
          trophiesUnlocked: statsData.trophiesUnlocked || 0,
          profileCompleteness: calculateProfileCompleteness(profileData || {}),
          daysSinceRegistration: statsData.daysSinceRegistration || 0,
          memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : null
        })
      } catch (statsError) {
        logError('Failed to load user stats', statsError)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: 0,
          friendsCount: 0,
          trophyPoints: 0,
          trophiesUnlocked: 0,
          profileCompleteness: 0,
          daysSinceRegistration: 0,
          memberSince: null
        })
      }

      logInfo('User profile loaded successfully', {
        userId: user.id,
        hasProfile: !!profileData,
        recipesCount: Array.isArray(recipesData) ? recipesData.length : 0
      })

    } catch (error) {
      logError('Failed to load user profile', error)
      setError('Impossible de charger votre profil. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      setValidationErrors({})
      setSaveSuccess(false)
      
      // Utiliser la fonction améliorée qui vérifie les trophées
      const result = await updateProfileWithTrophySync(user.id, editForm)

      if (result.success) {
        setProfile(result.profile)
        setIsEditing(false)
        setSaveSuccess(true)
        
        // Afficher les nouveaux trophées s'il y en a
        if (result.newTrophies && result.newTrophies.length > 0) {
          setNewTrophies(result.newTrophies)
          setShowTrophyNotification(true)
          setTimeout(() => setShowTrophyNotification(false), 5000)
        }

        // Recharger les stats pour inclure les nouveaux trophées
        await loadUserStats()
        
        // Auto-hide success message
        setTimeout(() => setSaveSuccess(false), 3000)
        
        logUserInteraction('UPDATE_PROFILE', 'profil-form', {
          userId: user.id,
          newTrophiesCount: result.newTrophies?.length || 0,
          hasValidationErrors: Object.keys(result.validation?.errors || {}).length > 0
        })
      } else {
        if (result.validation?.errors) {
          setValidationErrors(result.validation.errors)
        }
        throw new Error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      logError('Failed to save profile', error)
      setError('Impossible de sauvegarder le profil. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour calculer la complétude du profil en temps réel
  const calculateProfileCompleteness = (formData) => {
    if (!formData || typeof formData !== 'object') {
      return 0
    }
    
    const fields = ['display_name', 'bio', 'location', 'website', 'phone', 'date_of_birth']
    const completedFields = fields.filter(field => {
      const value = formData[field]
      return value && value.toString().trim().length > 0
    })
    return Math.round((completedFields.length / fields.length) * 100)
  }

  const handleViewAllRecipes = () => {
    logUserInteraction('VIEW_ALL_RECIPES', 'profile-recipes-button', {
      userId: user.id,
      totalRecipes: userRecipes.length
    })
    router.push('/mes-recettes')
  }

  // Redirect to login if not authenticated
  if (authLoading) {
    return null
  }

  if (!user) {
    router.push('/login?redirect=' + encodeURIComponent('/profil'))
    return null
  }

  if (loading) {
    return (
      <Layout>
        <div style={{
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative'
        }}>
          {/* Éléments décoratifs de fond */}
          <div style={{
            position: 'fixed',
            top: '20%',
            right: '-40px',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.08,
            animation: 'float 6s ease-in-out infinite'
          }} />
          
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            boxShadow: '0 12px 35px rgba(255, 107, 53, 0.3)',
            animation: 'pulse 2s ease-in-out infinite',
            border: '3px solid rgba(255, 255, 255, 0.9)'
          }}>
            🍳
          </div>
          
          <div style={{
            textAlign: 'center',
            color: '#1f2937'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Chargement de votre profil...
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Préparation de votre espace culinaire
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div style={{
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '24px',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '20px'
            }}>😓</div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0 0 12px 0',
              color: '#dc2626'
            }}>
              Oups ! Une erreur s'est produite
            </h2>
            <p style={{
              color: '#6b7280',
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              {error}
            </p>
            <button 
              onClick={loadUserProfile}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '16px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }}
            >
              🔄 Réessayer
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{
        background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
        minHeight: '100vh',
        position: 'relative'
      }}>
        <Head>
          <title>Mon Profil - COCO</title>
          <meta name="description" content="Gérez votre profil sur COCO" />
        </Head>

        {/* Éléments décoratifs de fond */}
        <div style={{
          position: 'fixed',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
          borderRadius: '50%',
          opacity: 0.08,
          animation: 'float 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '-60px',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(45deg, #4caf50, #45a049)',
          borderRadius: '50%',
          opacity: 0.06,
          animation: 'float 8s ease-in-out infinite reverse'
        }} />

        {/* Hero Section modernisée avec design unifié */}
        <section style={{
          width: '100%',
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          padding: '80px 0 40px 0',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 0,
          marginTop: '-64px'
        }}>
          {/* Éléments décoratifs spécifiques au hero */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '10%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle at 60% 40%, #ff6b35 0%, transparent 70%)',
            opacity: 0.06,
            animation: 'float 12s ease-in-out infinite'
          }} />

          <div style={{
            maxWidth: '500px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            padding: '24px 20px 0'
          }}>
            {/* Avatar principal avec effet moderne */}
            <div style={{
              width: '120px',
              height: '120px',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              borderRadius: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              margin: '0 auto 24px',
              boxShadow: '0 16px 40px rgba(255, 107, 53, 0.3), 0 8px 20px rgba(255, 107, 53, 0.15)',
              border: '4px solid rgba(255, 255, 255, 0.9)',
              position: 'relative',
              animation: 'float 6s ease-in-out infinite'
            }}>
              {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '👤'}
              
              {/* Indicateur de statut */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '24px',
                height: '24px',
                background: '#22c55e',
                borderRadius: '50%',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }} />
              
              {/* Effet de brillance */}
              <div style={{
                position: 'absolute',
                top: '20%',
                left: '25%',
                width: '40%',
                height: '40%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
                borderRadius: '50%',
                filter: 'blur(4px)',
                animation: 'shine 3s ease-in-out infinite'
              }} />
            </div>

            {/* Informations utilisateur */}
            <div style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '900',
                margin: '0 0 12px 0',
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8a50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
                lineHeight: '1.1'
              }}>
                {profile?.display_name || user?.email || 'Chef COCO'}
                {profile?.is_private && (
                  <span style={{
                    fontSize: '1rem',
                    marginLeft: '12px',
                    background: 'rgba(107, 114, 128, 0.1)',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🔒 Privé
                  </span>
                )}
              </h1>
              
              <p style={{
                fontSize: '1.1rem',
                color: '#6b7280',
                margin: '0 0 16px 0',
                lineHeight: '1.5',
                maxWidth: '400px',
                margin: '0 auto 16px'
              }}>
                {profile?.bio || 'Passionné de cuisine et de partage 🍳'}
              </p>
              
              {profile?.location && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  fontSize: '0.9rem',
                  color: '#374151',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 107, 53, 0.2)'
                }}>
                  <span>📍</span>
                  <span>{profile.location}</span>
                </div>
              )}
            </div>

            {/* Statistiques modernisées */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '32px',
              flexWrap: 'wrap'
            }}>
              {[
                {
                  icon: '📝',
                  value: userStats.recipesCount,
                  label: 'Recette',
                  color: '#ff6b35',
                  bgColor: 'rgba(255, 107, 53, 0.1)'
                },
                {
                  icon: '❤️',
                  value: userStats.likesReceived,
                  label: 'Like',
                  color: '#ef4444',
                  bgColor: 'rgba(239, 68, 68, 0.1)'
                },
                {
                  icon: '👥',
                  value: userStats.friendsCount,
                  label: 'Ami',
                  color: '#3b82f6',
                  bgColor: 'rgba(59, 130, 246, 0.1)'
                },
                {
                  icon: '🏆',
                  value: userStats.trophiesUnlocked,
                  label: 'Trophée',
                  color: '#fbbf24',
                  bgColor: 'rgba(251, 191, 36, 0.1)'
                }
              ].map((stat, index) => (
                <div 
                  key={index} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(15px)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: `2px solid ${stat.bgColor}`,
                    minWidth: '90px',
                    animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-4px) scale(1.02)'
                    e.target.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)'
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <div style={{ 
                    fontSize: '1.8rem', 
                    marginBottom: '8px',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                  }}>
                    {stat.icon}
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: stat.color,
                    marginBottom: '4px'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: '600'
                  }}>
                    {stat.label}{stat.value > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Barre de complétude du profil */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(15px)',
              padding: '20px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  📊 Complétude du profil
                </span>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: userStats.profileCompleteness > 70 ? '#22c55e' : 
                        userStats.profileCompleteness > 40 ? '#f59e0b' : '#ef4444'
                }}>
                  {userStats.profileCompleteness}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${userStats.profileCompleteness}%`,
                  height: '100%',
                  background: userStats.profileCompleteness > 70 ? 
                    'linear-gradient(90deg, #22c55e, #16a34a)' :
                    userStats.profileCompleteness > 40 ? 
                    'linear-gradient(90deg, #f59e0b, #d97706)' :
                    'linear-gradient(90deg, #ef4444, #dc2626)',
                  borderRadius: '4px',
                  transition: 'width 1s ease-out'
                }} />
              </div>
            </div>
          </div>
        </section>

        {/* Section principale avec onglets modernisés */}
        <div style={{
          maxWidth: '900px',
          margin: '-20px auto 0',
          background: 'white',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.1), 0 -4px 15px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
          minHeight: '60vh'
        }}>
          {/* Navigation tabs redessinée */}
          <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
            borderBottom: '1px solid #f3f4f6',
            padding: '20px 24px 0',
            display: 'flex',
            gap: '8px'
          }}>
            {[
              {
                id: 'info',
                label: 'Profil',
                icon: '👤',
                color: '#ff6b35'
              },
              {
                id: 'recipes',
                label: 'Recettes',
                icon: '📝',
                color: '#10b981'
              },
              {
                id: 'trophies',
                label: 'Trophées',
                icon: '🏆',
                color: '#fbbf24'
              },
              {
                id: 'settings',
                label: 'Paramètres',
                icon: '⚙️',
                color: '#6b7280'
              }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  position: 'relative',
                  padding: '12px 20px 16px',
                  borderRadius: '16px 16px 0 0',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  color: activeTab === tab.id ? tab.color : '#6b7280',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: activeTab === tab.id ? '0 -4px 15px rgba(0, 0, 0, 0.1)' : 'none',
                  transform: activeTab === tab.id ? 'translateY(-2px)' : 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.5)'
                    e.target.style.color = tab.color
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'transparent'
                    e.target.style.color = '#6b7280'
                  }
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: '3px',
                    background: tab.color,
                    borderRadius: '2px 2px 0 0'
                  }} />
                )}
              </button>
            ))}
          </nav>

          {/* Contenu principal */}
          <main style={{
            padding: '32px 24px',
            minHeight: '400px'
          }}>
            {/* ...existing tab content with improved styling... */}
            {activeTab === 'info' && (
              <div style={{
                animation: 'fadeInUp 0.5s ease-out'
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                  padding: '32px',
                  border: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>👤</span>
                      <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        Informations personnelles
                      </h2>
                    </div>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      style={{
                        background: isEditing ? 
                          'rgba(239, 68, 68, 0.1)' : 
                          'linear-gradient(135deg, #ff6b35, #f7931e)',
                        color: isEditing ? '#dc2626' : 'white',
                        border: isEditing ? '2px solid #dc2626' : 'none',
                        padding: '12px 24px',
                        borderRadius: '16px',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)'
                        e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <span>{isEditing ? '❌' : '✏️'}</span>
                      <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <div className={styles.editForm}>
                      <div className={styles.completenessCard}>
                        <div className={styles.completenessHeader}>
                          <span className={styles.completenessIcon}>📊</span>
                          <div className={styles.completenessInfo}>
                            <span className={styles.completenessTitle}>Complétude du profil</span>
                            <span className={styles.completenessPercent}>
                              {calculateProfileCompleteness(editForm)}%
                            </span>
                          </div>
                        </div>
                        <div className={styles.progressContainer}>
                          <div className={styles.progressBar}>
                            <div 
                              className={styles.progressFill}
                              style={{
                                width: `${calculateProfileCompleteness(editForm)}%`,
                                backgroundColor: calculateProfileCompleteness(editForm) > 70 ? '#2ED573' : 
                                                calculateProfileCompleteness(editForm) > 40 ? '#FFA502' : '#FF4757'
                              }}
                            />
                          </div>
                          <div className={styles.progressText}>
                            {calculateProfileCompleteness(editForm) === 100 ? 'Profil complet !' :
                             calculateProfileCompleteness(editForm) > 70 ? 'Presque terminé' :
                             'À compléter'}
                          </div>
                        </div>
                      </div>
                      {saveSuccess && (
                        <div className={styles.alertSuccess}>
                          <span className={styles.alertIcon}>✅</span>
                          <span className={styles.alertText}>Profil mis à jour avec succès !</span>
                        </div>
                      )}
                      <div className={styles.formGrid}>
                        {[{
                          key: 'display_name',
                          label: 'Nom d\'affichage',
                          type: 'text',
                          icon: '👤',
                          required: true,
                          maxLength: 30
                        },
                        {
                          key: 'bio',
                          label: 'Biographie',
                          type: 'textarea',
                          icon: '📝',
                          maxLength: 500
                        },
                        {
                          key: 'location',
                          label: 'Localisation',
                          type: 'text',
                          icon: '📍'
                        },
                        {
                          key: 'website',
                          label: 'Site web',
                          type: 'url',
                          icon: '🌐'
                        },
                        {
                          key: 'date_of_birth',
                          label: 'Date de naissance',
                          type: 'date',
                          icon: '🎂'
                        },
                        {
                          key: 'phone',
                          label: 'Téléphone',
                          type: 'tel',
                          icon: '📞'
                        }].map((field) => (
                          <div key={field.key} className={styles.inputGroup}>
                            <label className={styles.inputLabel}>
                              <span className={styles.inputIcon}>{field.icon}</span>
                              <span className={styles.labelText}>
                                {field.label}
                                {field.required && <span className={styles.required}>*</span>}
                              </span>
                              {field.maxLength && (
                                <span className={styles.charCounter}>
                                  {editForm[field.key]?.length || 0}/{field.maxLength}
                                </span>
                              )}
                            </label>
                            
                            <div className={styles.inputContainer}>
                              {field.type === 'textarea' ? (
                                <textarea
                                  value={editForm[field.key]}
                                  onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))
                                    if (validationErrors[field.key]) {
                                      setValidationErrors(prev => ({ ...prev, [field.key]: undefined }))
                                    }
                                  }}
                                  maxLength={field.maxLength}
                                  className={`${styles.input} ${styles.textarea} ${validationErrors[field.key] ? styles.error : ''}`}
                                  placeholder={`Votre ${field.label.toLowerCase()}...`}
                                  rows="3"
                                />
                              ) : (
                                <input
                                  type={field.type}
                                  value={editForm[field.key]}
                                  onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))
                                    if (validationErrors[field.key]) {
                                      setValidationErrors(prev => ({ ...prev, [field.key]: undefined }))
                                    }
                                  }}
                                  maxLength={field.maxLength}
                                  className={`${styles.input} ${validationErrors[field.key] ? styles.error : ''}`}
                                  placeholder={`Votre ${field.label.toLowerCase()}...`}
                                />
                              )}
                              
                              {validationErrors[field.key] && (
                                <div className={styles.inputError}>
                                  <span className={styles.errorIcon}>⚠️</span>
                                  <span>{validationErrors[field.key]}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        <div className={styles.privacySection}>
                          <div className={styles.toggleCard}>
                            <div className={styles.toggleInfo}>
                              <div className={styles.toggleTitle}>
                                <span className={styles.toggleIcon}>🔒</span>
                                <span>Profil privé</span>
                                {editForm.is_private && (
                                  <span className={styles.privateBadge}>PRIVÉ</span>
                                )}
                              </div>
                              <div className={styles.toggleDescription}>
                                {editForm.is_private 
                                  ? 'Seuls vos amis peuvent voir votre profil complet' 
                                  : 'Votre profil est visible par tous les utilisateurs'
                                }
                              </div>
                            </div>
                            
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={editForm.is_private}
                                onChange={(e) => setEditForm(prev => ({ ...prev, is_private: e.target.checked }))}
                              />
                              <span className={styles.slider}></span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className={styles.formActions}>
                        <button
                          onClick={handleSaveProfile}
                          disabled={loading}
                          className={`${styles.saveButton} ${loading ? styles.loading : ''}`}
                        >
                          {loading ? (
                            <>
                              <div className={styles.spinner} />
                              <span>Sauvegarde...</span>
                            </>
                          ) : (
                            <>
                              <span className={styles.buttonIcon}>💾</span>
                              <span>Sauvegarder</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.profileDisplay}>
                      {missingFields.length > 0 && (
                        <div className={styles.profileBoostCard}>
                          <div className={styles.profileBoostHeader}>
                            <span className={styles.profileBoostIcon}>✨</span>
                            <div className={styles.profileBoostTitleGroup}>
                              <h3>Boostez votre profil</h3>
                              <p>Il reste {missingFields.length} élément{missingFields.length > 1 ? 's' : ''} à compléter pour un profil inspirant.</p>
                            </div>
                          </div>
                          <ul className={styles.profileBoostList}>
                            {missingFields.slice(0, 3).map(field => (
                              <li key={field.key} className={styles.profileBoostItem}>
                                <span>✅</span>
                                <span>{field.message}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className={styles.profileBoostButton}
                            onClick={() => setIsEditing(true)}
                          >
                            Compléter mon profil
                          </button>
                        </div>
                      )}

                      <div className={styles.socialSummary}>
                        <div className={styles.socialHeader}>
                          <div>
                            <h3 className={styles.socialTitle}>Votre réseau culinaire</h3>
                            <p className={styles.socialSubtitle}>Suivez vos connexions pour ne rien manquer des nouvelles recettes.</p>
                          </div>
                          <button
                            type="button"
                            className={styles.manageFriendsButton}
                            onClick={() => router.push('/amis')}
                          >
                            <span>👥</span>
                            <span>Gérer mes amis</span>
                          </button>
                        </div>

                        <div className={styles.socialStats}>
                          {[{
                            label: 'Amis confirmés',
                            value: friendshipStats.friends
                          }, {
                            label: 'Demandes reçues',
                            value: friendshipStats.pending
                          }, {
                            label: 'Demandes envoyées',
                            value: friendshipStats.sent
                          }, {
                            label: 'Utilisateurs bloqués',
                            value: friendshipStats.blocked
                          }].map(stat => (
                            <div key={stat.label} className={styles.socialStatCard}>
                              <span className={styles.socialStatValue}>{stat.value}</span>
                              <span className={styles.socialStatLabel}>{stat.label}</span>
                            </div>
                          ))}
                        </div>

                        <div className={styles.socialPreview}>
                          {friendsLoading ? (
                            <div className={styles.socialEmpty}>Chargement de vos amis...</div>
                          ) : friendPreview.length > 0 ? (
                            friendPreview.map((friend, index) => {
                              const friendId = friend?.friend_id || friend?.profiles?.user_id || friend?.user_id
                              const displayName = friend?.profiles?.display_name || 'Utilisateur'
                              const bio = friend?.profiles?.bio || 'Passionné de cuisine sur COCO'

                              return (
                                <div key={friendId || `friend-${index}`} className={styles.friendPreviewCard}>
                                  <div className={styles.friendAvatar}>
                                    {friend?.profiles?.avatar_url ? (
                                      <img src={friend.profiles.avatar_url} alt={displayName} />
                                    ) : (
                                      <span className={styles.friendFallbackAvatar}>
                                        {displayName.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className={styles.friendPreviewInfo}>
                                    <span className={styles.friendName}>{displayName}</span>
                                    <span className={styles.friendMeta}>
                                      {bio.length > 60 ? `${bio.slice(0, 60)}…` : bio}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.friendPreviewAction}
                                    onClick={() => router.push(`/profile/${friendId}`)}
                                  >
                                    Voir
                                  </button>
                                </div>
                              )
                            })
                          ) : (
                            <div className={styles.socialEmpty}>
                              {friendsError || 'Ajoutez des amis pour débloquer plus de recommandations.'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.infoGrid}>
                        {infoItems.map((item, index) => {
                          const source = item.source === 'user' ? user : profile
                          const rawValue = item.key === 'email' ? user?.email : source?.[item.key]
                          const hasValue = rawValue !== undefined && rawValue !== null && (
                            typeof rawValue !== 'string' || rawValue.trim().length > 0
                          )
                          const formattedValue = hasValue ? (item.formatter ? item.formatter(rawValue) : rawValue) : item.fallback || 'Non défini'

                          return (
                            <div key={`${item.key}-${index}`} className={styles.infoCard}>
                              <div className={styles.infoCardHeader}>
                                <span className={styles.infoCardIcon}>{item.icon}</span>
                                <span className={styles.infoCardLabel}>{item.label}</span>
                              </div>
                              <div className={styles.infoCardValue}>
                                {item.isLink && hasValue ? (
                                  <a
                                    href={formattedValue}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.linkValue}
                                  >
                                    {formattedValue} 🔗
                                  </a>
                                ) : (
                                  formattedValue
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className={styles.floatingAction}>
                        <button
                          type="button"
                          onClick={() => router.push('/share-photo')}
                          className={styles.addRecipeButton}
                        >
                          <span className={styles.buttonIcon}>📸</span>
                          <span>Créer une recette</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'recipes' && (
              <div className={styles.recipesSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>🍳</span>
                      <h2>Mes créations ({userRecipes.length})</h2>
                    </div>
                    <button
                      onClick={handleViewAllRecipes}
                      className={styles.actionButton}
                    >
                      <span className={styles.buttonIcon}>📋</span>
                      <span>Voir toutes</span>
                    </button>
                  </div>
                  {userRecipes.length === 0 ? (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>👨‍🍳</div>
                      <h3 className={styles.emptyTitle}>
                        Votre aventure culinaire commence ici !
                      </h3>
                      <p className={styles.emptyDescription}>
                        Partagez vos créations, inspirez la communauté et devenez une star de la cuisine !
                      </p>
                      <button
                        onClick={() => router.push('/share-photo')}
                        className={styles.ctaButton}
                      >
                        <span className={styles.buttonIcon}>📸</span>
                        <span>Créer ma première recette</span>
                      </button>
                    </div>
                  ) : (
                    <div className={styles.recipesGrid}>
                      {userRecipes.map((recipe) => (
                        <div 
                          key={recipe.id} 
                          className={styles.recipeCard}
                          onClick={() => router.push(`/recipe/${recipe.id}`)}
                        >
                          <div className={styles.recipeImage}>
                            <div className={styles.recipeImagePlaceholder}>
                              {recipe.category === 'Photo partagée' ? '📸' : '🍽️'}
                            </div>
                            <div className={styles.categoryBadge}>
                              {recipe.category}
                            </div>
                          </div>
                          
                          <div className={styles.recipeContent}>
                            <h3 className={styles.recipeTitle}>{recipe.title}</h3>
                            <p className={styles.recipeDescription}>
                              {recipe.description || recipe.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'trophies' && (
              <div className={styles.trophiesSection}>
                <div className={styles.sectionCard}>
                  <TrophySection userId={user?.id} />
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className={styles.settingsSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>⚙️</span>
                      <h2>Paramètres du compte</h2>
                    </div>
                  </div>
                  <div className={styles.constructionNotice}>
                    <div className={styles.constructionIcon}>🚧</div>
                    <h3 className={styles.constructionTitle}>Section en construction</h3>
                    <p className={styles.constructionText}>
                      Les paramètres avancés arrivent bientôt ! En attendant, vous pouvez modifier vos informations dans l'onglet Profil.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Toast notifications modernisées */}
        {showTrophyNotification && newTrophies.length > 0 && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: 'white',
            padding: '20px 24px',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(251, 191, 36, 0.3)',
            zIndex: 1000,
            animation: 'slideInRight 0.5s ease-out',
            maxWidth: '350px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🏆</span>
              <span style={{ 
                fontSize: '1.1rem', 
                fontWeight: '700' 
              }}>
                Nouveau trophée débloqué !
              </span>
            </div>
            <div>
              {newTrophies.map(trophy => (
                <div key={trophy.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.95rem'
                }}>
                  <span>{trophy.icon}</span>
                  <span>{trophy.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Style global pour les animations */}
        <style jsx global>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          @keyframes shine {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes fadeInUp {
            from { 
              opacity: 0; 
              transform: translateY(30px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes slideInRight {
            from { 
              opacity: 0; 
              transform: translateX(100%); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
        `}</style>
      </div>
    </Layout>
  )
}
