import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { logUserInteraction, logError } from '../utils/logger'
import { showRecipeCommentNotification } from '../utils/notificationUtils'
import styles from '../styles/Comments.module.css'

export default function Comments({ 
  targetId, 
  targetType = 'recipe',
  className = '',
  theme = 'default'
}) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showReplies, setShowReplies] = useState({})
  const [userLikes, setUserLikes] = useState(new Set()) // Track user's likes
  const [likeAnimations, setLikeAnimations] = useState(new Set()) // Track active animations

  const maxLength = 500
  const charCount = newComment.length
  const charPercentage = (charCount / maxLength) * 100

  useEffect(() => {
    if (targetId) {
      loadComments()
    }
  }, [targetId])

  // Load user's previous likes from localStorage
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem(`commentLikes_${user?.id}`)
      if (savedLikes) {
        setUserLikes(new Set(JSON.parse(savedLikes)))
      }
    } catch (err) {
      console.error('Error loading saved likes', err)
    }
  }, [user?.id])

  // Save user likes to localStorage
  const saveLikesToStorage = (likesSet) => {
    if (user?.id) {
      try {
        localStorage.setItem(`commentLikes_${user.id}`, JSON.stringify([...likesSet]))
      } catch (err) {
        console.error('Error saving likes to localStorage', err)
      }
    }
  }

  const loadComments = async () => {
    try {
      setLoading(true)
      
      // Simulation de chargement - remplacer par vraie API
      const mockComments = [
        {
          id: 1,
          user_id: 'user1',
          user_name: 'Marie Dubois',
          user_avatar: '👩‍🍳',
          text: 'Cette recette a l\'air délicieuse ! 🤤',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: 12,
          userHasLiked: userLikes.has(1),
          replies: [
            {
              id: 101,
              user_id: 'user2',
              user_name: 'Chef Pierre',
              user_avatar: '👨‍🍳',
              text: 'Merci ! N\'hésitez pas si vous avez des questions !',
              created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              likes: 3,
              userHasLiked: userLikes.has(101)
            }
          ]
        },
        {
          id: 2,
          user_id: 'user3',
          user_name: 'Sophie Laurent',
          user_avatar: '👩‍🦳',
          text: 'J\'ai testé hier soir, un vrai régal ! 🌟',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          likes: 8,
          userHasLiked: userLikes.has(2),
          replies: []
        },
        {
          id: 3,
          user_id: 'user4',
          user_name: 'Thomas Martin',
          user_avatar: '👨‍🦱',
          text: 'Parfait pour un dîner en famille ! 👨‍👩‍👧‍👦',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          likes: 5,
          userHasLiked: userLikes.has(3),
          replies: []
        }
      ]
      
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulation réseau
      setComments(mockComments)
    } catch (err) {
      logError('Failed to load comments', err, { targetId, targetType })
      setError('Impossible de charger les commentaires')
    } finally {
      setLoading(false)
    }
  }

  const submitComment = async () => {
    if (!user) {
      alert('Connectez-vous pour commenter')
      return
    }

    if (!newComment.trim() || newComment.length > maxLength) return

    try {
      setSubmitting(true)
      
      // Simulation d'ajout - remplacer par vraie API
      const comment = {
        id: Date.now(),
        user_id: user.id,
        user_name: user.user_metadata?.display_name || 'Utilisateur',
        user_avatar: '👤',
        text: newComment.trim(),
        created_at: new Date().toISOString(),
        likes: 0,
        replies: [],
        isNew: true // Marquer comme nouveau commentaire
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setComments(prev => [comment, ...prev])
      setNewComment('')
      
      // Déclencher une notification pour le propriétaire de la recette
      // Note: Dans une vraie app, vous récupéreriez les infos de la recette depuis l'API
      const mockRecipe = {
        id: targetId,
        title: 'Recette délicieuse', // À remplacer par la vraie recette
        image: '/placeholder-recipe.jpg'
      }
      
      const mockRecipeOwner = {
        user_id: 'recipe_owner_id', // À remplacer par le vrai propriétaire
        display_name: 'Propriétaire de la recette'
      }
      
      // Envoyer la notification seulement si ce n'est pas l'auteur qui commente sa propre recette
      if (user.id !== mockRecipeOwner.user_id) {
        showRecipeCommentNotification(mockRecipe, {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'Utilisateur'
        }, comment)
      }
      
      // Animation de succès
      const successMessage = document.createElement('div')
      successMessage.innerHTML = '🎉 Commentaire publié avec succès!'
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        animation: slideInRight 0.5s ease-out;
      `
      document.body.appendChild(successMessage)
      
      // Retirer l'indicateur "nouveau" après 5 secondes
      setTimeout(() => {
        setComments(prev => prev.map(c => 
          c.id === comment.id ? { ...c, isNew: false } : c
        ))
      }, 5000)
      
      setTimeout(() => successMessage.remove(), 3000)
      
      logUserInteraction('SUBMIT_COMMENT', 'comment-form', {
        targetId,
        targetType,
        commentLength: comment.text.length
      })
    } catch (err) {
      logError('Failed to submit comment', err, { targetId, targetType })
      setError('Impossible d\'ajouter le commentaire')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLike = async (commentId) => {
    if (!user) {
      const shouldLogin = window.confirm('Connectez-vous pour aimer ce commentaire. Aller à la page de connexion ?')
      if (shouldLogin) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
      return
    }

    // Prevent spam clicking
    if (likeAnimations.has(commentId)) return

    const isCurrentlyLiked = userLikes.has(commentId)
    const newLikesSet = new Set(userLikes)
    
    // Add animation state
    setLikeAnimations(prev => new Set([...prev, commentId]))
    
    // Update UI optimistically
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const newLikesCount = isCurrentlyLiked 
          ? Math.max(0, comment.likes - 1) 
          : comment.likes + 1
        
        return {
          ...comment,
          likes: newLikesCount,
          userHasLiked: !isCurrentlyLiked
        }
      }
      return comment
    }))

    // Update user likes state
    if (isCurrentlyLiked) {
      newLikesSet.delete(commentId)
    } else {
      newLikesSet.add(commentId)
      
      // Create floating heart animation
      createFloatingHeart(commentId)
      
      // Add haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
    
    setUserLikes(newLikesSet)
    saveLikesToStorage(newLikesSet)

    // Remove animation state after delay
    setTimeout(() => {
      setLikeAnimations(prev => {
        const newSet = new Set(prev)
        newSet.delete(commentId)
        return newSet
      })
    }, 600)

    logUserInteraction('TOGGLE_COMMENT_LIKE', 'comment-like', {
      commentId,
      targetId,
      targetType,
      action: isCurrentlyLiked ? 'unlike' : 'like',
      userId: user.id
    })

    // Simulate API call delay (replace with real API)
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      // Here you would make the actual API call
      // const response = await fetch('/api/comments/like', { ... })
    } catch (error) {
      // Revert optimistic update on error
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const revertedLikesCount = isCurrentlyLiked 
            ? comment.likes + 1 
            : Math.max(0, comment.likes - 1)
          
          return {
            ...comment,
            likes: revertedLikesCount,
            userHasLiked: isCurrentlyLiked
          }
        }
        return comment
      }))
      
      // Revert user likes
      const revertedLikesSet = new Set(userLikes)
      if (!isCurrentlyLiked) {
        revertedLikesSet.delete(commentId)
      } else {
        revertedLikesSet.add(commentId)
      }
      setUserLikes(revertedLikesSet)
      saveLikesToStorage(revertedLikesSet)
      
      logError('Failed to toggle comment like', error, { commentId })
    }
  }

  const createFloatingHeart = (commentId) => {
    const button = document.querySelector(`[data-comment-id="${commentId}"] .${styles.likeButton}`)
    if (!button) return

    const rect = button.getBoundingClientRect()
    const heart = document.createElement('div')
    heart.innerHTML = '❤️'
    heart.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      font-size: 1.5rem;
      pointer-events: none;
      z-index: 10000;
      animation: floatingHeart 1.2s ease-out forwards;
      transform: translate(-50%, -50%);
    `
    
    document.body.appendChild(heart)
    setTimeout(() => heart.remove(), 1200)
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 0) return `${diffDay}j`
    if (diffHour > 0) return `${diffHour}h`
    if (diffMin > 0) return `${diffMin}min`
    return 'À l\'instant'
  }

  const getCharProgressClass = () => {
    if (charPercentage > 90) return styles.danger
    if (charPercentage > 75) return styles.warning
    return ''
  }

  const containerClass = `${styles.commentsContainer} ${className} ${
    theme === 'recipe' ? styles.recipeComments : 
    theme === 'social' ? styles.socialComments : ''
  }`

  if (loading) {
    return (
      <div className={containerClass}>
        <div className={styles.loadingComments}>
          <div className={styles.loadingSpinner}></div>
          <span className={styles.loadingText}>Chargement des commentaires...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={styles.commentsHeader}>
        <h3 className={styles.commentsTitle}>
          <span className={styles.commentsIcon}>💬</span>
          Commentaires
        </h3>
        <div className={styles.commentsCount}>
          {comments.length}
        </div>
      </div>

      {/* Formulaire de nouveau commentaire */}
      {user ? (
        <div className={styles.commentForm}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Partagez votre avis, vos conseils ou vos questions..."
            className={styles.commentTextarea}
            maxLength={maxLength}
            disabled={submitting}
          />
          
          <div className={styles.commentActions}>
            <div className={styles.commentCharCount}>
              <span>{charCount}/{maxLength}</span>
              <div className={styles.charProgress}>
                <div 
                  className={`${styles.charProgressFill} ${getCharProgressClass()}`}
                  style={{ width: `${Math.min(charPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            <button
              onClick={submitComment}
              disabled={!newComment.trim() || charCount > maxLength || submitting}
              className={styles.commentSubmitBtn}
            >
              {submitting ? '📤 Envoi...' : '💬 Commenter'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.commentForm}>
          <div style={{ 
            textAlign: 'center', 
            padding: '24px',
            color: '#64748b',
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }}>🔐</span>
            Connectez-vous pour rejoindre la conversation
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          margin: '16px 0',
          color: '#dc2626',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* Liste des commentaires */}
      {comments.length > 0 ? (
        <div className={styles.commentsList}>
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className={`${styles.comment} ${comment.isNew ? styles.new : ''}`}
              data-comment-id={comment.id}
            >
              {comment.isNew && (
                <div className={styles.newCommentBadge}>
                  ✨ Nouveau
                </div>
              )}
              
              <div className={styles.commentHeader}>
                <div className={styles.commentUser}>
                  <div className={styles.userAvatar}>
                    {comment.user_avatar}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>
                      {comment.user_name}
                      {comment.user_id === 'user2' && (
                        <span className={styles.verifiedBadge}>✅</span>
                      )}
                    </span>
                    <span className={styles.commentTime}>
                      {formatTimeAgo(comment.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className={styles.commentActions}>
                  <button
                    onClick={() => toggleLike(comment.id)}
                    className={`${styles.actionButton} ${styles.likeButton} ${
                      userLikes.has(comment.id) ? styles.liked : ''
                    } ${likeAnimations.has(comment.id) ? styles.animating : ''}`}
                    title={userLikes.has(comment.id) ? "Ne plus aimer" : "J'aime ce commentaire"}
                    disabled={likeAnimations.has(comment.id)}
                  >
                    {userLikes.has(comment.id) ? '❤️' : '🤍'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.replyButton}`}
                    title="Répondre"
                  >
                    💬
                  </button>
                </div>
              </div>

              <div className={styles.commentContent}>
                <p className={styles.commentText}>{comment.text}</p>
              </div>

              <div className={styles.commentStats}>
                <span className={styles.statItem}>
                  <span className={styles.statIcon}>❤️</span>
                  <span className={`${styles.statNumber} ${userLikes.has(comment.id) ? styles.highlighted : ''}`}>
                    {comment.likes}
                  </span>
                  <span className={styles.statLabel}>
                    {comment.likes === 1 ? 'like' : 'likes'}
                  </span>
                </span>
                {comment.replies.length > 0 && (
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>💬</span>
                    <span className={styles.statNumber}>{comment.replies.length}</span>
                    <span className={styles.statLabel}>
                      {comment.replies.length === 1 ? 'réponse' : 'réponses'}
                    </span>
                  </span>
                )}
                
                {comment.replies.length > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className={styles.showRepliesBtn}
                  >
                    {showReplies[comment.id] ? '▼ Masquer' : '▶ Voir'} les réponses
                  </button>
                )}
              </div>

              {/* Réponses avec like system */}
              {showReplies[comment.id] && comment.replies.length > 0 && (
                <div className={styles.replies}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={styles.reply} data-comment-id={reply.id}>
                      <div className={styles.commentHeader}>
                        <div className={styles.commentUser}>
                          <div className={styles.userAvatar} style={{ width: '36px', height: '36px' }}>
                            {reply.user_avatar}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>
                              {reply.user_name}
                              <span className={styles.verifiedBadge}>✅</span>
                            </span>
                            <span className={styles.commentTime}>
                              {formatTimeAgo(reply.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.commentActions}>
                          <button
                            onClick={() => toggleLike(reply.id)}
                            className={`${styles.actionButton} ${styles.likeButton} ${
                              userLikes.has(reply.id) ? styles.liked : ''
                            }`}
                            title={userLikes.has(reply.id) ? "Ne plus aimer" : "J'aime cette réponse"}
                          >
                            {userLikes.has(reply.id) ? '❤️' : '🤍'}
                          </button>
                        </div>
                      </div>
                      <div className={styles.commentContent}>
                        <p className={styles.commentText}>{reply.text}</p>
                      </div>
                      <div className={styles.commentStats}>
                        <span className={styles.statItem}>
                          <span className={styles.statIcon}>❤️</span>
                          <span className={`${styles.statNumber} ${userLikes.has(reply.id) ? styles.highlighted : ''}`}>
                            {reply.likes}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className={styles.loadMoreContainer}>
            <button className={styles.loadMoreButton}>
              📚 Charger plus de commentaires
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.emptyComments}>
          <div className={styles.emptyIcon}>💭</div>
          <h4 className={styles.emptyTitle}>Aucun commentaire pour le moment</h4>
          <p className={styles.emptyMessage}>
            Soyez le premier à partager votre avis ! Vos commentaires aident la communauté à découvrir de nouvelles saveurs.
          </p>
          {user && (
            <button
              onClick={() => document.querySelector(`.${styles.commentTextarea}`)?.focus()}
              className={styles.startConversationBtn}
            >
              💬 Commencer la conversation
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes floatingHeart {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -80%) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -120%) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1.05); }
          75% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
