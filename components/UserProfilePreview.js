import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/UserProfilePreview.module.css'

export default function UserProfilePreview({ user, isVisible, onClose, position }) {
  const router = useRouter()
  const [userStats, setUserStats] = useState({
    recipesCount: 0,
    likesReceived: 0,
    friendsCount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isVisible && user) {
      loadUserStats()
    }
  }, [isVisible, user])

  const loadUserStats = async () => {
    setLoading(true)
    try {
      // Simuler le chargement des statistiques utilisateur
      // Dans une vraie app, vous feriez un appel API
      setTimeout(() => {
        setUserStats({
          recipesCount: Math.floor(Math.random() * 50) + 5,
          likesReceived: Math.floor(Math.random() * 500) + 50,
          friendsCount: Math.floor(Math.random() * 100) + 10
        })
        setLoading(false)
      }, 300)
    } catch (error) {
      console.error('Error loading user stats:', error)
      setLoading(false)
    }
  }

  const handleViewProfile = () => {
    router.push(`/profile/${user.user_id}`)
    onClose()
  }

  const handleSendMessage = () => {
    // Logique pour envoyer un message
    console.log('Send message to:', user.display_name)
    onClose()
  }

  if (!isVisible || !user) return null

  return (
    <>
      {/* Overlay pour fermer en cliquant à l'extérieur */}
      <div className={styles.overlay} onClick={onClose} />
      
      <div 
        className={styles.previewCard}
        style={{
          top: position?.y || '50%',
          left: position?.x || '50%',
          transform: position ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)'
        }}
      >
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Chargement du profil...</p>
          </div>
        ) : (
          <>
            {/* Header du profil */}
            <div className={styles.header}>
              <div className={styles.avatarSection}>
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.display_name}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {user.display_name?.charAt(0)?.toUpperCase() || '👤'}
                  </div>
                )}
                <div className={styles.onlineStatus}></div>
              </div>
              
              <div className={styles.userInfo}>
                <h3 className={styles.userName}>
                  {user.display_name || 'Utilisateur'}
                  <span className={styles.verifiedBadge}>✅</span>
                </h3>
                <p className={styles.userBio}>
                  {user.bio || 'Passionné de cuisine et amateur de saveurs délicieuses 🍽️'}
                </p>
              </div>

              <button className={styles.closeButton} onClick={onClose}>
                ✕
              </button>
            </div>

            {/* Statistiques */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{userStats.recipesCount}</span>
                <span className={styles.statLabel}>Recettes</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{userStats.likesReceived}</span>
                <span className={styles.statLabel}>Likes</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNumber}>{userStats.friendsCount}</span>
                <span className={styles.statLabel}>Amis</span>
              </div>
            </div>

            {/* Dernières recettes */}
            <div className={styles.recentRecipes}>
              <h4>Recettes récentes</h4>
              <div className={styles.recipesGrid}>
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className={styles.recipePreview}>
                    <div className={styles.recipeImage}>
                      <span className={styles.recipeEmoji}>
                        {['🍝', '🥗', '🍰', '🍜', '🥘'][i % 5]}
                      </span>
                    </div>
                    <span className={styles.recipeTitle}>
                      Recette {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button 
                className={styles.primaryButton}
                onClick={handleViewProfile}
              >
                👤 Voir le profil
              </button>
              <button 
                className={styles.secondaryButton}
                onClick={handleSendMessage}
              >
                💬 Message
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
