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

        {/* Hero Section avec design COCO */}
        <section className={styles.heroSection}>
          <div className={styles.profileCard}>
            {/* Avatar avec design cohérent */}
            <div className={styles.avatar}>
              {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            
            <h1 className={styles.profileName}>
              {profile?.display_name || user?.email || 'Utilisateur'}
            </h1>
            
            <p className={styles.profileEmail}>
              {profile?.bio || 'Passionné de cuisine et de partage 🍳'}
            </p>

            {/* Stats avec design COCO */}
            <div className={styles.statsGrid}>
              {[{
                icon: '📝',
                value: userStats.recipesCount,
                label: 'Recette'
              },
              {
                icon: '❤️',
                value: userStats.likesReceived,
                label: 'Like'
              },
              {
                icon: '👥',
                value: userStats.friendsCount,
                label: 'Ami'
              },
              {
                icon: '🏆',
                value: userStats.trophiesUnlocked,
                label: 'Trophée'
              },
              {
                icon: '⭐',
                value: userStats.trophyPoints,
                label: 'Point'
              }].map((stat, index) => (
                <div key={index} className={styles.statItem}>
                  <div className={styles.statIcon}>{stat.icon}</div>
                  <div className={styles.statNumber}>{stat.value}</div>
                  <div className={styles.statLabel}>
                    {stat.label}{stat.value > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content avec design cohérent */}
        <section className={styles.contentSection}>
          {/* Tab Navigation avec style COCO */}
          <div className={styles.tabNavigation}>
            {[{
              id: 'info',
              label: 'Profil',
              icon: '👤'
            },
            {
              id: 'recipes',
              label: 'Recettes',
              icon: '📝'
            },
            {
              id: 'trophies',
              label: 'Trophées',
              icon: '🏆'
            },
            {
              id: 'settings',
              label: 'Paramètres',
              icon: '⚙️'
            }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'info' && (
              <div className={styles.infoSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Informations personnelles</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                  >
                    {isEditing ? '❌ Annuler' : '✏️ Modifier'}
                  </button>
                </div>

                {isEditing ? (
                  <div className={styles.editForm}>
                    {/* Profile Completeness */}
                    <div className={styles.completenessCard}>
                      <div className={styles.completenessHeader}>
                        <span>Complétude du profil</span>
                        <span className={styles.completenessPercent}>
                          {calculateProfileCompleteness(editForm)}%
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{width: `${calculateProfileCompleteness(editForm)}%`}}
                        />
                      </div>
                    </div>

                    {/* Success Message */}
                    {saveSuccess && (
                      <div className={styles.successMessage}>
                        <span>✅</span>
                        <span>Profil mis à jour avec succès !</span>
                      </div>
                    )}

                    {/* Form fields */}
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
                      <div key={field.key} className={styles.formField}>
                        <label className={styles.fieldLabel}>
                          <span className={styles.fieldIcon}>{field.icon}</span>
                          {field.label}
                          {field.required && <span className={styles.required}>*</span>}
                          {field.maxLength && (
                            <span className={styles.charCount}>
                              {editForm[field.key]?.length || 0}/{field.maxLength}
                            </span>
                          )}
                        </label>
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
                            className={`${styles.formInput} ${validationErrors[field.key] ? styles.error : ''}`}
                            placeholder={`Votre ${field.label.toLowerCase()}...`}
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
                            className={`${styles.formInput} ${validationErrors[field.key] ? styles.error : ''}`}
                            placeholder={`Votre ${field.label.toLowerCase()}...`}
                          />
                        )}
                        {validationErrors[field.key] && (
                          <div className={styles.errorMessage}>
                            <span>⚠️</span>
                            {validationErrors[field.key]}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Privacy toggle */}
                    <div className={styles.privacyToggle}>
                      <label className={styles.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={editForm.is_private}
                          onChange={(e) => setEditForm(prev => ({ ...prev, is_private: e.target.checked }))}
                          className={styles.toggleInput}
                        />
                        <div className={styles.toggleContent}>
                          <div className={styles.toggleTitle}>
                            <span>🔒</span>
                            Profil privé
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
                      </label>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className={`btn btn-primary ${styles.saveBtn} ${loading ? styles.loading : ''}`}
                    >
                      {loading ? (
                        <>
                          <div className={styles.spinner} />
                          Sauvegarde en cours...
                        </>
                      ) : (
                        <>💾 Sauvegarder les modifications</>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className={styles.profileInfo}>
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
                      label: 'Profil',
                      value: profile?.is_private ? 'Privé 🔒' : 'Public 🌍',
                      icon: '⚙️'
                    },
                    {
                      label: 'Membre depuis',
                      value: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A',
                      icon: '📅'
                    }].map((item, index) => (
                      <div key={index} className={styles.infoItem}>
                        <span className={styles.infoIcon}>{item.icon}</span>
                        <div className={styles.infoContent}>
                          <div className={styles.infoLabel}>{item.label}</div>
                          <div className={styles.infoValue}>
                            {item.isLink && item.value ? (
                              <a 
                                href={item.value} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.infoLink}
                              >
                                {item.value} 🔗
                              </a>
                            ) : (
                              item.value
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recipes' && (
              <div className={styles.recipesSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    🍳 Mes créations ({userRecipes.length})
                  </h2>
                  {userRecipes.length > 0 && (
                    <button
                      onClick={handleViewAllRecipes}
                      className="btn btn-secondary"
                    >
                      📋 Voir toutes →
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
                      className="btn btn-primary"
                    >
                      📸 Créer ma première recette
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
                          {recipe.category === 'Photo partagée' ? '📸' : '🍽️'}
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
            )}

            {activeTab === 'trophies' && (
              <TrophySection userId={user?.id} />
            )}

            {activeTab === 'settings' && (
              <div className={styles.settingsSection}>
                <h2 className={styles.sectionTitle}>⚙️ Paramètres du compte</h2>
                
                <div className={styles.constructionNotice}>
                  <div className={styles.constructionIcon}>🚧</div>
                  <h3 className={styles.constructionTitle}>Section en construction</h3>
                  <p className={styles.constructionText}>
                    Les paramètres avancés arrivent bientôt ! En attendant, vous pouvez modifier vos informations dans l'onglet Profil.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Trophy Notification */}
        {showTrophyNotification && newTrophies.length > 0 && (
          <div className={styles.trophyNotification}>
            <div className={styles.notificationTitle}>
              🏆 Nouveau trophée débloqué !
            </div>
            {newTrophies.map(trophy => (
              <div key={trophy.id} className={styles.notificationTrophy}>
                {trophy.icon} {trophy.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
