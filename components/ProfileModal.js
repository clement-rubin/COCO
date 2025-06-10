import React, { useState, useEffect } from 'react'
import { logInfo, logError } from '../utils/logger'

const ProfileModal = ({ userId, isOpen, onClose, currentUser }) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [stats, setStats] = useState({ recipes: 0, followers: 0, following: 0 })

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile()
    }
  }, [isOpen, userId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Fetch user data
      const userResponse = await fetch(`/api/users/${userId}`)
      const userData = await userResponse.json()
      
      // Fetch user stats
      const statsResponse = await fetch(`/api/users/${userId}/stats`)
      const statsData = await statsResponse.json()
      
      // Check if current user follows this user
      if (currentUser && currentUser.user_id !== userId) {
        const followResponse = await fetch(`/api/users/${currentUser.user_id}/following/${userId}`)
        setIsFollowing(followResponse.ok)
      }
      
      setProfile(userData)
      setStats(statsData)
      
    } catch (error) {
      logError('Erreur lors du chargement du profil', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || currentUser.user_id === userId) return
    
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${currentUser.user_id}/following/${userId}`, {
        method,
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        setIsFollowing(!isFollowing)
        setStats(prev => ({
          ...prev,
          followers: prev.followers + (isFollowing ? -1 : 1)
        }))
        
        logInfo(`Utilisateur ${isFollowing ? 'unfollowed' : 'followed'}`, { userId })
      }
    } catch (error) {
      logError('Erreur lors du follow/unfollow', error)
    }
  }

  const isOwnProfile = currentUser && currentUser.user_id === userId

  if (!isOpen) return null

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>✕</button>
        
        {loading ? (
          <div className="profile-loading">
            <div className="spinner"></div>
            <p>Chargement du profil...</p>
          </div>
        ) : profile ? (
          <div className="profile-content">
            {/* Header avec photo et infos principales */}
            <div className="profile-header">
              <div className="profile-avatar">
                <img 
                  src={profile.profile_picture || '/icons/default-avatar.png'} 
                  alt={profile.display_name}
                />
                {profile.is_online && <div className="online-indicator"></div>}
              </div>
              
              <div className="profile-info">
                <h2>{profile.display_name}</h2>
                <p className="profile-username">@{profile.username}</p>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
                
                <div className="profile-stats">
                  <div className="stat">
                    <span className="stat-number">{stats.recipes}</span>
                    <span className="stat-label">Recettes</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{stats.followers}</span>
                    <span className="stat-label">Followers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{stats.following}</span>
                    <span className="stat-label">Following</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isOwnProfile && currentUser && (
              <div className="profile-actions">
                <button 
                  className={`follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Ne plus suivre' : 'Suivre'}
                </button>
                <button className="message-btn">
                  Message
                </button>
              </div>
            )}

            {isOwnProfile && (
              <div className="profile-actions">
                <button className="edit-profile-btn">
                  Modifier le profil
                </button>
              </div>
            )}

            {/* Badges et réalisations */}
            {profile.badges && profile.badges.length > 0 && (
              <div className="profile-badges">
                <h3>Badges</h3>
                <div className="badges-grid">
                  {profile.badges.map(badge => (
                    <div key={badge.id} className="badge-item" title={badge.description}>
                      <span className="badge-emoji">{badge.emoji}</span>
                      <span className="badge-name">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recettes récentes */}
            <div className="profile-recent-recipes">
              <h3>Recettes récentes</h3>
              <div className="recipes-preview">
                {profile.recent_recipes && profile.recent_recipes.length > 0 ? (
                  profile.recent_recipes.map(recipe => (
                    <div key={recipe.id} className="recipe-preview-item">
                      <img src={recipe.image || '/icons/default-recipe.png'} alt={recipe.title} />
                      <span>{recipe.title}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-recipes">Aucune recette pour le moment</p>
                )}
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="profile-details">
              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <span>Membre depuis {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              
              {profile.location && (
                <div className="detail-item">
                  <span className="detail-icon">📍</span>
                  <span>{profile.location}</span>
                </div>
              )}
              
              {profile.cooking_level && (
                <div className="detail-item">
                  <span className="detail-icon">👨‍🍳</span>
                  <span>Niveau: {profile.cooking_level}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="profile-error">
            <p>Impossible de charger ce profil</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileModal
