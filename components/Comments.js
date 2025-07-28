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
  const [ariaLiveMsg, setAriaLiveMsg] = useState('')

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
      logError('Error loading saved comment likes from localStorage', err, { userId: user?.id })
    }
  }, [user?.id])

  // Save user likes to localStorage
  const saveLikesToStorage = (likesSet) => {
    if (user?.id) {
      try {
        localStorage.setItem(`commentLikes_${user.id}`, JSON.stringify([...likesSet]))
      } catch (err) {
        logError('Error saving comment likes to localStorage', err, { userId: user.id })
      }
    }
  }

  const loadComments = async () => {
    try {
      setLoading(true)
      
      // Real API call instead of mock data
      const response = await fetch(`/api/comments?recipe_id=${targetId}&limit=20&offset=0`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors du chargement des commentaires')
      }
      
      if (result.success) {
        setComments(result.comments || [])
      } else {
        throw new Error(result.message || 'Erreur lors du chargement des commentaires')
      }
    } catch (err) {
      logError('Failed to load comments', err, { targetId, targetType })
      setError('Impossible de charger les commentaires')
    } finally {
      setLoading(false)
    }
  }

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }

  const submitComment = async () => {
    if (!user) {
      const shouldLogin = window.confirm('Connectez-vous pour commenter. Aller à la page de connexion?')
      if (shouldLogin) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
      return
    }

    if (!newComment.trim() || newComment.length > maxLength) return

    try {
      setSubmitting(true)
      setAriaLiveMsg('Envoi du commentaire en cours...')
      
      // Real API call instead of simulation
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_id: targetId,
          user_id: user.id,
          text: newComment.trim(),
          user_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de l\'ajout du commentaire')
      }

      if (result.success) {
        // Add the new comment to the state
        const formattedComment = {
          ...result.comment,
          isNew: true // Mark as new for animation
        }
        
        setComments(prev => [formattedComment, ...prev])
        setNewComment('')
        setAriaLiveMsg('Commentaire publié avec succès !')
        
        // Send notification if not own recipe
        if (result.recipe && result.recipe.user_id !== user.id) {
          showRecipeCommentNotification(
            {
              id: result.recipe.id,
              title: result.recipe.title,
              image: '/placeholder-recipe.jpg' // Fallback image
            }, 
            {
              user_id: user.id,
              display_name: user.user_metadata?.display_name || 'Utilisateur'
            }, 
            {
              id: result.comment.id,
              text: result.comment.text
            }
          )
        }
        
        // Success animation
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
        
        // Remove new indicator after 5 seconds
        setTimeout(() => {
          setComments(prev => prev.map(c => 
            c.id === result.comment.id ? { ...c, isNew: false } : c
          ))
        }, 5000)
        
        setTimeout(() => successMessage.remove(), 3000)
        
        logUserInteraction('SUBMIT_COMMENT', 'comment-form', {
          targetId,
          targetType,
          commentLength: result.comment.text.length,
          commentId: result.comment.id
        })
      } else {
        throw new Error(result.message || 'Erreur inconnue')
      }
    } catch (err) {
      logError('Failed to submit comment', err, { targetId, targetType })
      
      // Show user-friendly error message
      let errorMessage = 'Impossible d\'ajouter le commentaire. '
      
      if (err.message.includes('not found') || err.message.includes('non trouvé')) {
        errorMessage += 'La recette n\'existe plus.'
      } else if (err.message.includes('trop long')) {
        errorMessage += 'Le commentaire est trop long.'
      } else if (err.message.includes('unauthorized') || err.message.includes('auth')) {
        errorMessage += 'Problème d\'autorisation. Veuillez vous reconnecter.'
      } else {
        errorMessage += 'Veuillez réessayer dans quelques instants.'
      }
      
      setError(errorMessage)
      setAriaLiveMsg('Erreur lors de l\'ajout du commentaire')
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
      <div className={containerClass} role="region" aria-busy="true" aria-label="Chargement des commentaires">
        <div className={styles.loadingComments}>
          <div className={styles.loadingSpinner} aria-hidden="true"></div>
          <span className={styles.loadingText}>Chargement des commentaires...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass} role="region" aria-label="Section commentaires">
      {/* Zone ARIA live pour feedback utilisateur */}
      <div aria-live="polite" aria-atomic="true" style={{position:'absolute',left:'-9999px',height:'1px',width:'1px',overflow:'hidden'}}>{ariaLiveMsg}</div>

      {/* Header */}
      <header className={styles.commentsHeader} tabIndex={-1}>
        <h3 className={styles.commentsTitle} id="comments-title">
          <span className={styles.commentsIcon} aria-hidden="true">💬</span>
          Commentaires
        </h3>
        <div className={styles.commentsCount} aria-label={`${comments.length} commentaire${comments.length > 1 ? 's' : ''}`}>
          {comments.length}
        </div>
      </header>

      {/* Formulaire de nouveau commentaire */}
      {user ? (
        <form 
          className={styles.commentForm}
          onSubmit={e => { e.preventDefault(); submitComment(); }}
          aria-labelledby="comments-title"
        >
          <div className={styles.quickCommentPrompt}>
            <span className={styles.quickCommentIcon}>⚡</span>
            <span>Astuce: Utilisez le commentaire rapide depuis la page d'accueil !</span>
          </div>
          
          <label htmlFor="new-comment" className={styles.visuallyHidden}>Votre commentaire</label>
          <textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Partagez votre avis, vos conseils ou vos questions..."
            className={styles.commentTextarea}
            maxLength={maxLength}
            disabled={submitting}
            aria-label="Saisir un commentaire"
            required
            rows={3}
            style={{resize:'vertical'}}
          />
          
          <div className={styles.commentActions}>
            <div className={styles.commentCharCount} aria-live="polite">
              <span>{charCount}/{maxLength}</span>
              <div className={styles.charProgress} aria-hidden="true">
                <div 
                  className={`${styles.charProgressFill} ${getCharProgressClass()}`}
                  style={{ width: `${Math.min(charPercentage, 100)}%` }}
                />
              </div>
            </div>
            
            <button
              type="submit"
              onClick={submitComment}
              disabled={!newComment.trim() || charCount > maxLength || submitting}
              className={styles.commentSubmitBtn}
              aria-label="Publier le commentaire"
            >
              {submitting ? '📤 Envoi...' : '💬 Commenter'}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.commentForm} tabIndex={0} aria-label="Connexion requise pour commenter">
          <div style={{ 
            textAlign: 'center', 
            padding: '24px',
            color: '#64748b',
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '12px' }} aria-hidden="true">🔐</span>
            Connectez-vous pour rejoindre la conversation
            <div style={{ 
              marginTop: '16px',
              padding: '12px 20px',
              background: 'rgba(251, 146, 60, 0.1)',
              borderRadius: '12px',
              border: '2px solid rgba(251, 146, 60, 0.2)',
              fontSize: '0.9rem'
            }}>
              💡 Ou utilisez le <strong>commentaire rapide</strong> depuis la page d'accueil !
            </div>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '2px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            margin: '16px 0',
            color: '#dc2626',
            fontWeight: '600',
            textAlign: 'center'
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Liste des commentaires */}
      {comments.length > 0 ? (
        <ul className={styles.commentsList} aria-labelledby="comments-title">
          {comments.map((comment) => (
            <li 
              key={comment.id} 
              className={`${styles.comment} ${comment.isNew ? styles.new : ''}`}
              data-comment-id={comment.id}
              tabIndex={0}
              aria-label={`Commentaire de ${comment.user_name}, ${formatTimeAgo(comment.created_at)}`}
            >
              {comment.isNew && (
                <div className={styles.newCommentBadge} aria-label="Nouveau commentaire">
                  ✨ Nouveau
                </div>
              )}
              
              <div className={styles.commentHeader}>
                <div className={styles.commentUser}>
                  <div className={styles.userAvatar} aria-hidden="true">
                    {comment.user_avatar}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>
                      {comment.user_name}
                      {comment.user_id === 'user2' && (
                        <span className={styles.verifiedBadge} title="Utilisateur vérifié" aria-label="Utilisateur vérifié">✅</span>
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
                    aria-pressed={userLikes.has(comment.id)}
                    aria-label={userLikes.has(comment.id) ? "Retirer le like" : "Aimer ce commentaire"}
                    disabled={likeAnimations.has(comment.id)}
                    tabIndex={0}
                  >
                    {userLikes.has(comment.id) ? '❤️' : '🤍'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.replyButton}`}
                    title="Répondre"
                    aria-label="Répondre à ce commentaire"
                    tabIndex={0}
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
                  <span className={styles.statIcon} aria-hidden="true">❤️</span>
                  <span className={`${styles.statNumber} ${userLikes.has(comment.id) ? styles.highlighted : ''}`}>
                    {comment.likes}
                  </span>
                  <span className={styles.statLabel}>
                    {comment.likes === 1 ? 'like' : 'likes'}
                  </span>
                </span>
                {comment.replies.length > 0 && (
                  <span className={styles.statItem}>
                    <span className={styles.statIcon} aria-hidden="true">💬</span>
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
                    aria-expanded={!!showReplies[comment.id]}
                    aria-controls={`replies-${comment.id}`}
                  >
                    {showReplies[comment.id] ? '▼ Masquer' : '▶ Voir'} les réponses
                  </button>
                )}
              </div>

              {/* Réponses avec like system */}
              {showReplies[comment.id] && comment.replies.length > 0 && (
                <ul className={styles.replies} id={`replies-${comment.id}`} aria-label={`Réponses à ${comment.user_name}`}>
                  {comment.replies.map((reply) => (
                    <li key={reply.id} className={styles.reply} data-comment-id={reply.id} tabIndex={0}>
                      <div className={styles.commentHeader}>
                        <div className={styles.commentUser}>
                          <div className={styles.userAvatar} style={{ width: '36px', height: '36px' }} aria-hidden="true">
                            {reply.user_avatar}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>
                              {reply.user_name}
                              <span className={styles.verifiedBadge} title="Utilisateur vérifié" aria-label="Utilisateur vérifié">✅</span>
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
                            aria-pressed={userLikes.has(reply.id)}
                            aria-label={userLikes.has(reply.id) ? "Retirer le like" : "Aimer cette réponse"}
                            tabIndex={0}
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
                          <span className={styles.statIcon} aria-hidden="true">❤️</span>
                          <span className={`${styles.statNumber} ${userLikes.has(reply.id) ? styles.highlighted : ''}`}>
                            {reply.likes}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}

          <li className={styles.loadMoreContainer}>
            <button className={styles.loadMoreButton} aria-label="Charger plus de commentaires">
              📚 Charger plus de commentaires
            </button>
          </li>
        </ul>
      ) : (
        <div className={styles.emptyComments} tabIndex={0} aria-label="Aucun commentaire pour le moment">
          <div className={styles.emptyIcon} aria-hidden="true">💭</div>
          <h4 className={styles.emptyTitle}>Aucun commentaire pour le moment</h4>
          <p className={styles.emptyMessage}>
            Soyez le premier à partager votre avis ! Vos commentaires aident la communauté à découvrir de nouvelles saveurs.
          </p>
          {user && (
            <button
              onClick={() => document.querySelector(`.${styles.commentTextarea}`)?.focus()}
              className={styles.startConversationBtn}
              aria-label="Commencer la conversation"
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

/*
  This component is imported and used in other pages, not accessed directly via URL
  Check your pages/ directory for files that import this component
  Common locations might be:
  - /pages/recipe/[id].js (for recipe comments)
  - /pages/posts/[id].js (for post comments)
  - Any page that imports: import Comments from '../components/Comments'
*/
