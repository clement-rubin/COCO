import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'
import styles from '../styles/Profile.module.css'

export default function Profil() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState({
    recipesCount: 0,
    followersCount: 0,
    followingCount: 0
  })
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    publicProfile: true
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Head>
          <title>Chargement - COCO</title>
        </Head>
        <div className={styles.loadingIcon}>👤</div>
        <p className={styles.loadingText}>Chargement du profil...</p>
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
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user.user_metadata?.display_name?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          
          <h1 className={styles.profileName}>
            {user.user_metadata?.display_name || 'Chef COCO'}
          </h1>
          
          <p className={styles.profileEmail}>
            {user.email}
          </p>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{userStats.recipesCount}</span>
              <span className={styles.statLabel}>Recettes</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{userStats.followersCount}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>{userStats.followingCount}</span>
              <span className={styles.statLabel}>Suivi(e)s</span>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Mon activité</h2>

          <div className={styles.activityItems}>
            <button
              className={styles.activityItem}
              onClick={() => router.push('/mes-recettes')}
            >
              <div className={styles.activityIcon}>📝</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Mes recettes</h3>
                <p className={styles.activityDescription}>
                  Gérer mes créations culinaires
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/favoris')}
            >
              <div className={styles.activityIcon}>❤️</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Mes favoris</h3>
                <p className={styles.activityDescription}>
                  Recettes que j'adore
                </p>
              </div>
            </button>

            <button
              className={styles.activityItem}
              onClick={() => router.push('/amis')}
            >
              <div className={styles.activityIcon}>👥</div>
              <div className={styles.activityContent}>
                <h3 className={styles.activityTitle}>Mes amis</h3>
                <p className={styles.activityDescription}>
                  Gérer mon réseau culinaire
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
                  Mes recettes organisées
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Settings Section */}
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>Préférences</h2>

          <div className={styles.settingsItems}>
            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🔔</span>
                Notifications
              </div>
              <div 
                className={`${styles.settingToggle} ${settings.notifications ? styles.active : ''}`}
                onClick={() => toggleSetting('notifications')}
              />
            </div>

            <div className={styles.settingsItem}>
              <div className={styles.settingLabel}>
                <span className={styles.settingIcon}>🌙</span>
                Mode sombre
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
          </div>
        </div>

        {/* Logout Section */}
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
