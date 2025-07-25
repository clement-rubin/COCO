import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError } from '../utils/logger'
import { showRecipeCommentNotification } from '../utils/notificationUtils'
import styles from '../styles/QuickCommentModal.module.css'

export default function QuickCommentModal({ 
  isOpen, 
  onClose, 
  recipe = null,
  onCommentAdded = null 
}) {
  const { user } = useAuth()
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const textareaRef = useRef(null)
  const modalRef = useRef(null)

  const maxLength = 500
  const charCount = comment.length
  const charPercentage = (charCount / maxLength) * 100

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      return
    }

    if (!comment.trim() || comment.length > maxLength) return

    try {
      setSubmitting(true)
      
      // Simulate API call - replace with real API
      const newComment = {
        id: Date.now(),
        user_id: user.id,
        user_name: user.user_metadata?.display_name || 'Utilisateur',
        text: comment.trim(),
        created_at: new Date().toISOString(),
        recipe_id: recipe?.id
      }
      
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Show success animation
      setSuccess(true)
      
      // Call parent callback
      if (onCommentAdded) {
        onCommentAdded(newComment)
      }
      
      // Send notification if not own recipe
      if (recipe && recipe.user_id !== user.id) {
        showRecipeCommentNotification(recipe, {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'Utilisateur'
        }, newComment)
      }
      
      logUserInteraction('QUICK_COMMENT_SUBMIT', 'quick-comment-modal', {
        recipeId: recipe?.id,
        commentLength: comment.length
      })
      
      // Reset and close after delay
      setTimeout(() => {
        setComment('')
        setSuccess(false)
        onClose()
      }, 1500)
      
    } catch (error) {
      logError('Failed to submit quick comment', error, { recipeId: recipe?.id })
    } finally {
      setSubmitting(false)
    }
  }

  const getCharProgressClass = () => {
    if (charPercentage > 90) return styles.danger
    if (charPercentage > 75) return styles.warning
    return ''
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} role="dialog" aria-labelledby="quick-comment-title" aria-modal="true">
      <div className={styles.modal} ref={modalRef}>
        {success ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>🎉</div>
            <h3 className={styles.successTitle}>Commentaire publié !</h3>
            <p className={styles.successMessage}>
              Merci pour votre contribution à la communauté COCO !
            </p>
          </div>
        ) : (
          <>
            <header className={styles.header}>
              <div className={styles.titleSection}>
                <h2 id="quick-comment-title" className={styles.title}>
                  💬 Commentaire rapide
                </h2>
                {recipe && (
                  <div className={styles.recipeInfo}>
                    <span className={styles.recipeEmoji}>🍴</span>
                    <span className={styles.recipeName}>
                      {recipe.title || 'Recette délicieuse'}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Fermer"
                type="button"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputSection}>
                <label htmlFor="quick-comment-input" className={styles.label}>
                  Partagez votre avis, vos conseils ou vos questions
                </label>
                <textarea
                  id="quick-comment-input"
                  ref={textareaRef}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cette recette a l'air délicieuse ! J'ai hâte d'essayer..."
                  className={styles.textarea}
                  maxLength={maxLength}
                  disabled={submitting}
                  rows={4}
                  required
                />
                
                <div className={styles.inputFooter}>
                  <div className={styles.charCount}>
                    <span className={charPercentage > 90 ? styles.charDanger : ''}>
                      {charCount}/{maxLength}
                    </span>
                    <div className={styles.charProgress}>
                      <div 
                        className={`${styles.charProgressFill} ${getCharProgressClass()}`}
                        style={{ width: `${Math.min(charPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!comment.trim() || charCount > maxLength || submitting}
                  className={styles.submitButton}
                >
                  {submitting ? (
                    <>
                      <span className={styles.spinner}></span>
                      Publication...
                    </>
                  ) : (
                    <>
                      <span className={styles.submitIcon}>💬</span>
                      Publier le commentaire
                    </>
                  )}
                </button>
              </div>
            </form>

            {!user && (
              <div className={styles.loginPrompt}>
                <span className={styles.lockIcon}>🔐</span>
                <span>Connectez-vous pour commenter</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
