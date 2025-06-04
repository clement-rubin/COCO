import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
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
    publicProfile: true,
    newsletter: false,
    privateRecipes: false
  })
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileData, setProfileData] = useState(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Enhanced stats loading with real data simulation
  useEffect(() => {
    if (user) {
      // Simulate loading user stats
      const loadUserStats = async () => {
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 800))
          
          // Generate realistic stats based on user data
          const accountAge = user.created_at ? 
            Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 30
          
          setUserStats({
            recipesCount: Math.max(1, Math.floor(accountAge / 7) + Math.floor(Math.random() * 10)),
            followersCount: Math.max(5, Math.floor(accountAge / 3) + Math.floor(Math.random() * 50)),
            followingCount: Math.max(3, Math.floor(accountAge / 5) + Math.floor(Math.random() * 30))
          })
          
          setTimeout(() => setIsAnimating(true), 200)
        } catch (error) {
          console.error('Error loading stats:', error)
          // Fallback stats
          setUserStats({
            recipesCount: 12,
            followersCount: 45,
            followingCount: 23
          })
          setTimeout(() => setIsAnimating(true), 200)
        }
      }
      
      loadUserStats()
    }
  }, [user])

  // Load user settings from localStorage
  useEffect(() => {
    if (user) {
      try {
        const savedSettings = localStorage.getItem(`userSettings_${user.id}`)
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }))
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
  }, [user])

  const handleLogout = useCallback(async () => {
    // Enhanced logout with confirmation and animation
    const confirmLogout = window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')
    if (!confirmLogout) return

    setIsLoggingOut(true)
    
    try {
      // Add a slight delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      await logout()
      
      // Show success message
      const toast = document.createElement('div')
      toast.innerHTML = '👋 À bientôt !'
      toast.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        padding: 16px 32px;
        border-radius: 30px;
        z-index: 10000;
        animation: slideUp 0.6s ease;
        box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
        font-weight: 600;
        font-size: 1.1rem;
      `
      document.body.appendChild(toast)
      setTimeout(() => toast.remove(), 2000)
      
      router.push('/')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      setIsLoggingOut(false)
      
      // Show error message
      const errorToast = document.createElement('div')
      errorToast.innerHTML = '❌ Erreur de déconnexion'
      errorToast.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #DC2626, #B91C1C);
        color: white;
        padding: 16px 32px;
        border-radius: 30px;
        z-index: 10000;
        animation: slideUp 0.6s ease;
        box-shadow: 0 8px 30px rgba(220, 38, 38, 0.4);
        font-weight: 600;
      `
      document.body.appendChild(errorToast)
      setTimeout(() => errorToast.remove(), 3000)
    }
  }, [logout, router])

  const toggleSetting = useCallback((setting) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] }
      
      // Save to localStorage
      try {
        localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(newSettings))
      } catch (error) {
        console.error('Error saving settings:', error)
      }
      
      return newSettings
    })
    
    // Enhanced feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30])
    }
    
    // Show setting change toast
    const settingLabels = {
      notifications: 'Notifications',
      darkMode: 'Thème sombre',
      publicProfile: 'Profil public',
      newsletter: 'Newsletter',
      privateRecipes: 'Recettes privées'
    }
    
    const newValue = !settings[setting]
    const toast = document.createElement('div')
    toast.innerHTML = `${newValue ? '✅' : '❌'} ${settingLabels[setting]} ${newValue ? 'activé' : 'désactivé'}`
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: ${newValue ? 
        'linear-gradient(135deg, #FF6B35, #F7931E)' : 
        'linear-gradient(135deg, #64748B, #475569)'};
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 10000;
      animation: slideUp 0.6s ease;
      box-shadow: 0 6px 25px ${newValue ? 
        'rgba(255, 107, 53, 0.4)' : 
        'rgba(100, 116, 139, 0.4)'};
      font-weight: 600;
    `
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.4s ease forwards'
      setTimeout(() => toast.remove(), 400)
    }, 2000)
  }, [settings, user])

  const getUserInitials = useCallback(() => {
    if (user?.user_metadata?.display_name) {
      const names = user.user_metadata.display_name.split(' ')
      if (names.length >= 2) {
        return names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase()
      }
      return names[0].charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return '👤'
  }, [user])

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours()
    const greetings = {
      morning: ['🌅 Bonjour', '☀️ Salut', '🌤️ Hello'],
      afternoon: ['☀️ Bon après-midi', '🌞 Salut', '🌻 Hello'],
      evening: ['🌙 Bonsoir', '🌆 Salut', '✨ Hello'],
      night: ['🌃 Bonne nuit', '🌙 Salut', '⭐ Hello']
    }
    
    let timeOfDay
    if (hour < 6) timeOfDay = 'night'
    else if (hour < 12) timeOfDay = 'morning'
    else if (hour < 18) timeOfDay = 'afternoon'
    else if (hour < 22) timeOfDay = 'evening'
    else timeOfDay = 'night'
    
    const options = greetings[timeOfDay]
    return options[Math.floor(Math.random() * options.length)]
  }, [])

  const navigateToSection = useCallback((path) => {
    // Add loading state or animation here if needed
    router.push(path)
  }, [router])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Head>
          <title>Chargement - COCO</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <meta name="description" content="Gérez votre profil culinaire COCO - Recettes, statistiques et préférences" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Mon Profil - COCO" />
        <meta property="og:description" content="Découvrez mon univers culinaire sur COCO" />
      </Head>

      <div className={styles.content}>
        {/* Enhanced Profile Header */}
        <div className={styles.profileHeader}>
          <div 
            className={styles.avatar}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate([50, 30, 50])
              // Add avatar click interaction here (e.g., change avatar)
            }}
            title="Cliquez pour personnaliser votre avatar"
          >
            {getUserInitials()}
          </div>
          
          <h1 className={styles.profileName}>
            {getGreeting()}, {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'}!
          </h1>
          
          <p className={styles.profileEmail}>
            {user.email}
          </p>

          {/* Enhanced Stats Grid with Better Animation */}
          <div className={styles.statsGrid}>
            {{
              recipesCount: '📝 Recettes',
              followersCount: '👥 Followers',
              followingCount: '🤝 Suivi(e)s'
            }._map(([key, label], index) => (
              <div 
                key={key}
                className={styles.statItem}
                style={{
                  animationDelay: `${(index + 1) * 0.15}s`,
                  transform: isAnimating ? 'translateY(0)' : 'translateY(30px)',
                  opacity: isAnimating ? 1 : 0,
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(40)
                }}
              >
                <span className={styles.statNumber}>{userStats[key]}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Activity Section */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Mon univers culinaire</h2>

          <div className={styles.activityItems}>
            {{
              '/mes-recettes': {
                icon: '📝',
                title: 'Mes créations',
                description: 'Gérer et partager mes recettes favorites',
                color: '#FF6B35'
              },
              '/favoris': {
                icon: '❤️',
                title: 'Coup de cœur',
                description: 'Recettes sauvegardées et aimées',
                color: '#EF4444'
              },
              '/amis': {
                icon: '👥',
                title: 'Communauté',
                description: 'Mon réseau de passionnés culinaires',
                color: '#8B5CF6'
              },
              '/collections': {
                icon: '📚',
                title: 'Collections',
                description: 'Mes recettes organisées par thème',
                color: '#06B6D4'
              },
              '/achievements': {
                icon: '🏆',
                title: 'Réussites',
                description: 'Badges et accomplissements culinaires',
                color: '#F59E0B'
              },
              '/analytics': {
                icon: '📊',
                title: 'Statistiques',
                description: 'Analyser mes performances et tendances',
                color: '#10B981'
              }
            }._map(([path, { icon, title, description, color }], index) => (
              <button
                key={path}
                className={styles.activityItem}
                onClick={() => navigateToSection(path)}
                style={{
                  animationDelay: `${0.1 + index * 0.1}s`
                }}
              >
                <div className={styles.activityIcon}>
                  {icon}
                </div>
                <div className={styles.activityContent}>
                  <h3 className={styles.activityTitle}>{title}</h3>
                  <p className={styles.activityDescription}>
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Settings Section */}
        <div className={styles.settingsSection}>
          <h2 className={styles.sectionTitle}>⚙️ Préférences</h2>

          <div className={styles.settingsItems}>
            {{
              notifications: '🔔 Notifications push',
              darkMode: '🌙 Thème sombre',
              publicProfile: '🌍 Profil public',
              newsletter: '📧 Newsletter culinaire',
              privateRecipes: '🔒 Recettes privées par défaut'
            }._map(([key, label]) => (
              <div key={key} className={styles.settingsItem}>
                <div className={styles.settingLabel}>
                  <span className={styles.settingIcon}>{label.charAt(0)}</span>
                  {label.slice(1)}
                </div>
                <div 
                  className={`${styles.settingToggle} ${settings[key] ? styles.active : ''}`}
                  onClick={() => toggleSetting(key)}
                  role="switch"
                  aria-checked={settings[key]}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleSetting(key)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Logout Section */}
        <div className={styles.logoutSection}>
          <button 
            className={styles.logoutBtn}
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
              opacity: isLoggingOut ? 0.7 : 1,
              transform: isLoggingOut ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            <span>{isLoggingOut ? '⏳' : '🚪'}</span>
            {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          0% {
            transform: translateX(-50%) translateY(30px);
            opacity: 0;
          }
          100% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          0% {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) translateY(-30px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
