import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import Layout from '../components/Layout'
import TrophySection from '../components/TrophySection'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { getUserStatsComplete, updateProfileWithTrophySync } from '../utils/profileUtils'
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
  const [newTrophies, setNewTrophies] = useState([])
  const [showTrophyNotification, setShowTrophyNotification] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [saveSuccess, setSaveSuccess] = useState(false)

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
    }
  }, [user, authLoading, router])

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
              category: r.category
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
          trophiesUnlocked: statsData.trophiesUnlocked || 0
        })
      } catch (statsError) {
        logError('Failed to load user stats', statsError)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: 0,
          friendsCount: 0,
          trophyPoints: 0,
          trophiesUnlocked: 0
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
    const fields = ['display_name', 'bio', 'location', 'website', 'phone', 'date_of_birth']
    const completedFields = fields.filter(field => {
      const value = formData[field]
      return value && value.toString().trim().length > 0
    })
    return Math.round((completedFields.length / fields.length) * 100)
  }

  const handleViewAllRecipes = () => {
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
        <div className={styles.loadingContainer}>
          <div className={styles.loadingIcon}>🍳</div>
          <div className={styles.loadingText}>Chargement de votre profil...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>😓</div>
          <h2 className={styles.errorTitle}>Oups ! Une erreur s'est produite</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            onClick={loadUserProfile}
            className={`btn btn-primary ${styles.retryBtn}`}
          >
            🔄 Réessayer
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className={styles.container}>
        <Head>
          <title>Mon Profil - COCO</title>
          <meta name="description" content="Gérez votre profil sur COCO" />
        </Head>

        {/* Hero Section redesigné avec style COCO moderne */}
        <section className={styles.heroSection}>
          <div className={styles.heroBackground}>
            <div className={styles.heroPattern}></div>
          </div>
          
          <div className={styles.profileCard}>
            {/* Avatar avec nouveau design */}
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <div className={styles.statusIndicator}></div>
            </div>
            
            <div className={styles.profileInfo}>
              <h1 className={styles.profileName}>
                {profile?.display_name || user?.email || 'Utilisateur'}
                {profile?.is_private && <span className={styles.privateBadge}>🔒</span>}
              </h1>
              
              <p className={styles.profileBio}>
                {profile?.bio || 'Passionné de cuisine et de partage 🍳'}
              </p>

              {profile?.location && (
                <div className={styles.locationBadge}>
                  <span className={styles.locationIcon}>📍</span>
                  <span>{profile.location}</span>
                </div>
              )}
            </div>

            {/* Stats redesignées avec style moderne */}
            <div className={styles.statsContainer}>
              <div className={styles.statsGrid}>
                {[{
                  icon: '📝',
                  value: userStats.recipesCount,
                  label: 'Recette',
                  color: '#FF6B6B'
                },
                {
                  icon: '❤️',
                  value: userStats.likesReceived,
                  label: 'Like',
                  color: '#FF4757'
                },
                {
                  icon: '👥',
                  value: userStats.friendsCount,
                  label: 'Ami',
                  color: '#3742FA'
                },
                {
                  icon: '🏆',
                  value: userStats.trophiesUnlocked,
                  label: 'Trophée',
                  color: '#FFD700'
                },
                {
                  icon: '⭐',
                  value: userStats.trophyPoints,
                  label: 'Point',
                  color: '#FFA502'
                }].map((stat, index) => (
                  <div 
                    key={index} 
                    className={styles.statCard}
                    style={{'--stat-color': stat.color}}
                  >
                    <div className={styles.statIcon} style={{color: stat.color}}>
                      {stat.icon}
                    </div>
                    <div className={styles.statNumber}>{stat.value}</div>
                    <div className={styles.statLabel}>
                      {stat.label}{stat.value > 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Content Section avec nouveau design */}
        <section className={styles.contentSection}>
          {/* Tab Navigation moderne */}
          <div className={styles.tabContainer}>
            <div className={styles.tabNavigation}>
              {[{
                id: 'info',
                label: 'Profil',
                icon: '👤',
                color: '#3742FA'
              },
              {
                id: 'recipes',
                label: 'Recettes',
                icon: '📝',
                color: '#FF6B6B'
              },
              {
                id: 'trophies',
                label: 'Trophées',
                icon: '🏆',
                color: '#FFD700'
              },
              {
                id: 'settings',
                label: 'Paramètres',
                icon: '⚙️',
                color: '#2F3542'
              }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
                  style={activeTab === tab.id ? {'--tab-color': tab.color} : {}}
                >
                  <span className={styles.tabIcon}>{tab.icon}</span>
                  <span className={styles.tabLabel}>{tab.label}</span>
                  {activeTab === tab.id && <div className={styles.tabIndicator}></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content avec meilleur style */}
          <div className={styles.tabContent}>
            {activeTab === 'info' && (
              <div className={styles.infoSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>👤</span>
                      <h2>Informations personnelles</h2>
                    </div>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`${styles.actionButton} ${isEditing ? styles.secondary : styles.primary}`}
                    >
                      <span className={styles.buttonIcon}>
                        {isEditing ? '❌' : '✏️'}
                      </span>
                      <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <div className={styles.editForm}>
                      {/* Profile Completeness avec nouveau design */}
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

                      {/* Success Message redesigné */}
                      {saveSuccess && (
                        <div className={styles.alertSuccess}>
                          <span className={styles.alertIcon}>✅</span>
                          <span className={styles.alertText}>Profil mis à jour avec succès !</span>
                        </div>
                      )}

                      {/* Form fields avec nouveau style */}
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
                      </div>

                      {/* Privacy toggle redesigné */}
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
                              onChange={(e) => setEditForm(prev => ({ ...prev, is_private: e.target.checked }))
                              }
                            />
                            <span className={styles.slider}></span>
                          </label>
                        </div>
                      </div>

                      {/* Save button redesigné */}
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
                      <div className={styles.infoGrid}>
                        {[{
                          label: 'Email',
                          value: user?.email,
                          icon: '✉️'
                        },
                        {
                          label: 'Nom',
                          value: profile?.display_name || 'Non défini',
                          icon: '👤'
                        },
                        {
                          label: 'Biographie',
                          value: profile?.bio || 'Aucune biographie',
                          icon: '📝'
                        },
                        {
                          label: 'Localisation',
                          value: profile?.location || 'Non définie',
                          icon: '📍'
                        },
                        {
                          label: 'Site web',
                          value: profile?.website,
                          icon: '🌐',
                          isLink: true
                        },
                        {
                          label: 'Date de naissance',
                          value: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('fr-FR') : 'Non définie',
                          icon: '🎂'
                        },
                        {
                          label: 'Téléphone',
                          value: profile?.phone || 'Non défini',
                          icon: '📞'
                        },
                        {
                          label: 'Confidentialité',
                          value: profile?.is_private ? 'Profil privé 🔒' : 'Profil public 🌍',
                          icon: '⚙️'
                        },
                        {
                          label: 'Membre depuis',
                          value: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A',
                          icon: '📅'
                        }].map((item, index) => (
                          <div key={index} className={styles.infoCard}>
                            <div className={styles.infoCardHeader}>
                              <span className={styles.infoCardIcon}>{item.icon}</span>
                              <span className={styles.infoCardLabel}>{item.label}</span>
                            </div>
                            <div className={styles.infoCardValue}>
                              {item.isLink && item.value ? (
                                <a 
                                  href={item.value} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className={styles.linkValue}
                                >
                                  {item.value} 🔗
                                </a>
                              ) : (
                                item.value
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Autres onglets avec le même style amélioré */}
            {activeTab === 'recipes' && (
              <div className={styles.recipesSection}>
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>🍳</span>
                      <h2>Mes créations ({userRecipes.length})</h2>
                    </div>
                    {userRecipes.length > 0 && (
                      <button
                        onClick={handleViewAllRecipes}
                        className={styles.actionButton}
                      >
                        <span className={styles.buttonIcon}>📋</span>
                        <span>Voir toutes</span>
                      </button>
                    )}
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
          </div>
        </section>

        {/* Trophy Notification avec nouveau style */}
        {showTrophyNotification && newTrophies.length > 0 && (
          <div className={styles.trophyNotification}>
            <div className={styles.notificationHeader}>
              <span className={styles.notificationIcon}>🏆</span>
              <span className={styles.notificationTitle}>Nouveau trophée débloqué !</span>
            </div>
            <div className={styles.notificationTrophies}>
              {newTrophies.map(trophy => (
                <div key={trophy.id} className={styles.notificationTrophy}>
                  <span className={styles.trophyIcon}>{trophy.icon}</span>
                  <span className={styles.trophyName}>{trophy.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
