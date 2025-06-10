import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../components/AuthContext'
import RecipeCard from '../../components/RecipeCard'
import Layout from '../../components/Layout'
import { logUserInteraction, logError, logInfo } from '../../utils/logger'
import { getUserPublicProfile } from '../../utils/profileUtils'
import styles from '../../styles/UserProfile.module.css'

export default function UserProfile() {
  const router = useRouter()
  const { id: userId } = router.query
  const { user: currentUser } = useAuth()
  
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes')

  useEffect(() => {
    if (userId) {
      loadUserProfile()
    }
  }, [userId, currentUser])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const profileData = await getUserPublicProfile(userId, currentUser?.id)
      
      if (!profileData) {
        setError('Profil utilisateur introuvable')
        return
      }

      setProfile(profileData)
      
      logUserInteraction('VIEW_USER_PROFILE', 'user-profile', {
        viewedUserId: userId,
        currentUserId: currentUser?.id,
        isOwnProfile: currentUser?.id === userId
      })

    } catch (err) {
      logError('Failed to load user profile', err, { userId })
      setError('Impossible de charger le profil utilisateur')
    } finally {
      setLoading(false)
    }
  }

  const handleSendFriendRequest = async () => {
    if (!currentUser) {
      router.push('/login?redirect=' + encodeURIComponent(`/user/${userId}`))
      return
    }

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          friend_id: userId,
          action: 'send_request'
        })
      })

      if (response.ok) {
        await loadUserProfile() // Recharger pour mettre à jour le statut
        alert('Demande d\'ami envoyée !')
      } else {
        throw new Error('Erreur lors de l\'envoi de la demande')
      }
    } catch (error) {
      logError('Error sending friend request', error)
      alert('Erreur lors de l\'envoi de la demande d\'ami')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingIcon}>👤</div>
          <div className={styles.loadingText}>Chargement du profil...</div>
        </div>
      </Layout>
    )
  }

  if (error || !profile) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>😓</div>
          <h2 className={styles.errorTitle}>Profil introuvable</h2>
          <p className={styles.errorMessage}>{error || 'Ce profil n\'existe pas ou a été supprimé'}</p>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Retour
          </button>
        </div>
      </Layout>
    )
  }

  // Rediriger vers le profil personnel si c'est le même utilisateur
  if (currentUser?.id === userId) {
    router.replace('/profil')
    return null
  }

  return (
    <Layout>
      <div className={styles.container}>
        <Head>
          <title>{profile.display_name} - Profil COCO</title>
          <meta name="description" content={`Découvrez le profil de ${profile.display_name} sur COCO`} />
        </Head>

        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backButton}>
            ← Retour
          </button>
        </div>

        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} />
              ) : (
                profile.display_name?.charAt(0)?.toUpperCase() || '👤'
              )}
            </div>
            
            <h1 className={styles.profileName}>
              {profile.display_name}
              {profile.is_private && <span className={styles.privateIcon}>🔒</span>}
            </h1>
            
            <p className={styles.profileBio}>
              {profile.bio || 'Passionné de cuisine 🍳'}
            </p>

            {profile.location && (
              <div className={styles.profileLocation}>
                📍 {profile.location}
              </div>
            )}

            {profile.website && (
              <div className={styles.profileWebsite}>
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  🌐 Site web
                </a>
              </div>
            )}

            {/* Statistiques */}
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>📝</div>
                <div className={styles.statNumber}>{profile.stats.recipesCount}</div>
                <div className={styles.statLabel}>
                  Recette{profile.stats.recipesCount > 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statNumber}>{profile.stats.friendsCount}</div>
                <div className={styles.statLabel}>
                  Ami{profile.stats.friendsCount > 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>📅</div>
                <div className={styles.statNumber}>
                  {profile.stats.memberSince ? 
                    new Date(profile.stats.memberSince).getFullYear() : 
                    'N/A'
                  }
                </div>
                <div className={styles.statLabel}>Membre</div>
              </div>
            </div>

            {/* Actions (si pas son propre profil) */}
            {currentUser && currentUser.id !== userId && (
              <div className={styles.profileActions}>
                {profile.friendshipStatus?.isFriend ? (
                  <button className={styles.friendButton}>
                    ✅ Ami
                  </button>
                ) : profile.friendshipStatus?.isPending ? (
                  <button className={styles.pendingButton} disabled>
                    ⏳ Demande envoyée
                  </button>
                ) : profile.friendshipStatus?.canAcceptRequest ? (
                  <button className={styles.acceptButton}>
                    ✅ Accepter la demande
                  </button>
                ) : (
                  <button 
                    className={styles.addFriendButton}
                    onClick={handleSendFriendRequest}
                  >
                    👥 Ajouter en ami
                  </button>
                )}
                
                <button className={styles.messageButton}>
                  💬 Message
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Contenu */}
        <section className={styles.contentSection}>
          {/* Navigation par onglets */}
          <div className={styles.tabNavigation}>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`${styles.tabButton} ${activeTab === 'recipes' ? styles.active : ''}`}
            >
              <span className={styles.tabIcon}>📝</span>
              <span className={styles.tabLabel}>
                Recettes ({profile.recipes.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`${styles.tabButton} ${activeTab === 'about' ? styles.active : ''}`}
            >
              <span className={styles.tabIcon}>ℹ️</span>
              <span className={styles.tabLabel}>À propos</span>
            </button>
          </div>

          {/* Contenu des onglets */}
          <div className={styles.tabContent}>
            {activeTab === 'recipes' && (
              <div className={styles.recipesSection}>
                {profile.stats.isPrivate ? (
                  <div className={styles.privateContent}>
                    <div className={styles.privateIcon}>🔒</div>
                    <h3>Profil privé</h3>
                    <p>Les recettes de cet utilisateur sont privées.</p>
                    <p>Devenez ami pour voir son contenu !</p>
                  </div>
                ) : profile.recipes.length === 0 ? (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👨‍🍳</div>
                    <h3>Aucune recette partagée</h3>
                    <p>{profile.display_name} n'a pas encore partagé de recettes.</p>
                  </div>
                ) : (
                  <div className={styles.recipesGrid}>
                    {profile.recipes.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe}
                        isUserRecipe={false}
                        isPhotoOnly={recipe.category === 'Photo partagée'}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className={styles.aboutSection}>
                <div className={styles.aboutCard}>
                  <h3>À propos de {profile.display_name}</h3>
                  
                  <div className={styles.aboutGrid}>
                    <div className={styles.aboutItem}>
                      <span className={styles.aboutIcon}>📝</span>
                      <div>
                        <div className={styles.aboutLabel}>Biographie</div>
                        <div className={styles.aboutValue}>
                          {profile.bio || 'Aucune biographie'}
                        </div>
                      </div>
                    </div>

                    {profile.location && (
                      <div className={styles.aboutItem}>
                        <span className={styles.aboutIcon}>📍</span>
                        <div>
                          <div className={styles.aboutLabel}>Localisation</div>
                          <div className={styles.aboutValue}>{profile.location}</div>
                        </div>
                      </div>
                    )}

                    {profile.website && (
                      <div className={styles.aboutItem}>
                        <span className={styles.aboutIcon}>🌐</span>
                        <div>
                          <div className={styles.aboutLabel}>Site web</div>
                          <div className={styles.aboutValue}>
                            <a href={profile.website} target="_blank" rel="noopener noreferrer">
                              {profile.website}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={styles.aboutItem}>
                      <span className={styles.aboutIcon}>📅</span>
                      <div>
                        <div className={styles.aboutLabel}>Membre depuis</div>
                        <div className={styles.aboutValue}>
                          {profile.stats.memberSince ? 
                            new Date(profile.stats.memberSince).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long'
                            }) : 
                            'Date inconnue'
                          }
                        </div>
                      </div>
                    </div>

                    <div className={styles.aboutItem}>
                      <span className={styles.aboutIcon}>🍳</span>
                      <div>
                        <div className={styles.aboutLabel}>Activité</div>
                        <div className={styles.aboutValue}>
                          {profile.stats.recipesCount} recette{profile.stats.recipesCount > 1 ? 's' : ''} partagée{profile.stats.recipesCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}
