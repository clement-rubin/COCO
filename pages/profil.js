import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'
import styles from '../styles/Profile.module.css'

export default function Profil() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState({
    recipesCount: 12,
    followersCount: 45,
    followingCount: 23
  })
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    publicProfile: true
  })
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Animation d'entrée pour les stats
  useEffect(() => {
    if (user) {
      setTimeout(() => setIsAnimating(true), 500)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    }
  }

  const toggleSetting = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
    
    // Feedback tactile sur mobile
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const getUserInitials = () => {
    if (user?.user_metadata?.display_name) {
      const names = user.user_metadata.display_name.split(' ')
      if (names.length >= 2) {
        return names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase()
      }
      return names[0].charAt(0).toUpperCase()
    }
    return '👤'
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '🌅 Bonjour'
    if (hour < 18) return '☀️ Bon après-midi'
    return '🌙 Bonsoir'
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Head>
          <title>Chargement - COCO</title>
        </Head>
        <div className={styles.loadingIcon}>👨‍🍳</div>
        <p className={styles.loadingText}>Préparation de votre profil culinaire...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.container}>
      <Head>
        <title>Mon Profil - COCO</title>
        <meta name="description" content="Gérez votre profil culinaire COCO" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.content}>
        {/* Enhanced Profile Header */}
        <div className={styles.profileHeader}>
          <div 
            className={styles.avatar}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(50)
            }}
          >
            {getUserInitials()}
          </div>
          
          <h1 className={styles.profileName}>
            {getGreeting()}, {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'}!
          </h1>
          
          <p className={styles.profileEmail}>
            {user.email}
          </p>

          {/* Enhanced Stats Grid with Animation */}
          <div className={styles.statsGrid}>
            <div 
              className={styles.statItem}
              style={{
                animationDelay: '0.1s',
                transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                opacity: isAnimating ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span className={styles.statNumber}>{userStats.recipesCount}</span>
              <span className={styles.statLabel}>Recettes</span>
            </div>
            <div 
              className={styles.statItem}
              style={{
                animationDelay: '0.2s',
                transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                opacity: isAnimating ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span className={styles.statNumber}>{userStats.followersCount}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div 
              className={styles.statItem}
              style={{
                animationDelay: '0.3s',
                transform: isAnimating ? 'translateY(0)' : 'translateY(20px)',
                opacity: isAnimating ? 1 : 0,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span className={styles.statNumber}>{userStats.followingCount}</span>
              <span className={styles.statLabel}>Suivi(e)s</span>
            </div>
          </div>
        </div>

        {/* Enhanced Activity Section */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Mon univers culinaire</h2>

          <div className={styles.activityItems}>
            <button
              className={styles.activityItem}
              onClick={() => router.push('/mes-recettes')}
            >
              <div className={styles.activityIcon}>📝</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Mes créations</h3>
                <p className={styles.activityDescription}>
                  Gérer et partager mes recettes favorites
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/favoris')}
            >
              <div className={styles.activityIcon}>❤️</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Coup de cœur</h3>
                <p className={styles.activityDescription}>
                  Recettes sauvegardées et aimées
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/amis')}
            >
              <div className={styles.activityIcon}>👥</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Communauté</h3>
                <p className={styles.activityDescription}>
                  Mon réseau de passionnés culinaires
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/collections')}
            >
              <div className={styles.activityIcon}>📚</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Collections</h3>
                <p className={styles.activityDescription}>
                  Mes recettes organisées par thème
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/achivements')}
            >
              <div className={styles.activityIcon}>🏆</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Réussites</h3>
                <p className={styles.activityDescription}>
                  Badges et accomplissements culinaires
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/analytics')}
            >
              <div className={styles.activityIcon}>📊</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Statistiques</h3>
                <p className={styles.activityDescription}>
                  Analyser mes performances et tendances
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Enhanced Settings Section */}
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>⚙️ Préférences</h2>

          <div className={styles.settingsItems}>
            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🔔</span>
                Notifications push
              </div>
              <div 
                className={`${styles.settingToggle} ${settings.notifications ? styles.active : ''}`}
                onClick={() => toggleSetting('notifications')}
              />
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🌙</span>
                Thème sombre
              </div>
              <div 
                className={`${styles.settingToggle} ${settings.darkMode ? styles.active : ''}`}
                onClick={() => toggleSetting('darkMode')}
              />
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🌍</span>
                Profil public
              </div>
              <div 
                className={`${styles.settingToggle} ${settings.publicProfile ? styles.active : ''}`}
                onClick={() => toggleSetting('publicProfile')}
              />
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>📧</span>
                Newsletter culinaire
              </div>
              <div 
                className={`${styles.settingToggle} ${false ? styles.active : ''}`}
                onClick={() => {/* TODO: Implement newsletter setting */}}
              />
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🔒</span>
                Recettes privées par défaut
              </div>
              <div 
                className={`${styles.settingToggle} ${false ? styles.active : ''}`}
                onClick={() => {/* TODO: Implement privacy setting */}}
              />
            </div>
          </div>
        </div>

        {/* Enhanced Logout Section */}
        <div className={styles.logoutSection}>
          <button 
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            <span>🚪</span>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
