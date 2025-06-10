import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { logUserInteraction, logError } from '../utils/logger'
import styles from '../styles/Comments.module.css'

export default function Comments({ 
  targetId, 
  targetType = 'recipe', // 'recipe', 'post', 'photo'
  className = '',
  theme = 'default' // 'default', 'recipe', 'social'
}) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showReplies, setShowReplies] = useState({})

  const maxLength = 500
  const charCount = newComment.length
  const charPercentage = (charCount / maxLength) * 100

  useEffect(() => {
    if (targetId) {
      loadComments()
    }
  }, [targetId])

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
          text: 'Cette recette a l\'air absolument délicieuse ! J\'ai hâte de l\'essayer ce weekend. Merci pour le partage ! 🤤',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: 12,
          replies: [
            {
              id: 101,
              user_id: 'user2',
              user_name: 'Chef Pierre',
              user_avatar: '👨‍🍳',
              text: 'N\'hésitez pas si vous avez des questions !',
              created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
              likes: 3
            }
          ]
        },
        {
          id: 2,
          user_id: 'user3',
          user_name: 'Sophie Laurent',
          user_avatar: '👩‍🦳',
          text: 'J\'ai testé hier soir, un vrai régal ! Toute la famille a adoré. Je recommande vivement cette recette. 🌟',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          likes: 8,
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
        replies: []
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setComments(prev => [comment, ...prev])
      setNewComment('')
      
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
      alert('Connectez-vous pour aimer ce commentaire')
      return
    }

    // Simulation de like - remplacer par vraie logique
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.likes + (Math.random() > 0.5 ? 1 : -1)
        }
      }
      return comment
    }))

    logUserInteraction('TOGGLE_COMMENT_LIKE', 'comment-like', {
      commentId,
      targetId,
      targetType
    })
  }

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
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
            <div key={comment.id} className={styles.comment}>
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
                    className={`${styles.actionButton} ${styles.likeButton}`}
                    title="J'aime ce commentaire"
                  >
                    ❤️
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

              <div className={styles.commentFooter}>
                <div className={styles.commentStats}>
                  <span className={styles.statItem}>
                    <span className={styles.statIcon}>❤️</span>
                    {comment.likes}
                  </span>
                  {comment.replies.length > 0 && (
                    <span className={styles.statItem}>
                      <span className={styles.statIcon}>💬</span>
                      {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {comment.replies.length > 0 && (
                  <button
                    onClick={() => toggleReplies(comment.id)}
                    className={styles.showRepliesBtn}
                  >
                    {showReplies[comment.id] ? '▼' : '▶'} 
                    {showReplies[comment.id] ? 'Masquer' : 'Voir'} les réponses
                  </button>
                )}
              </div>

              {/* Réponses */}
              {showReplies[comment.id] && comment.replies.length > 0 && (
                <div className={styles.replies}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={styles.reply}>
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
                      </div>
                      <div className={styles.commentContent}>
                        <p className={styles.commentText}>{reply.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
    </div>
  )
}
