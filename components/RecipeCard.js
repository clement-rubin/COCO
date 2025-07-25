import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'
import ShareButton from './ShareButton'
import { processImageData } from '../utils/imageUtils'
import { getRecipeIllustration } from '../utils/recipeIllustrations'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'
import { canUserEditRecipe, deleteUserRecipe } from '../utils/profileUtils'
import { toggleRecipeLike, getRecipeLikesStats } from '../utils/likesUtils'
import styles from '../styles/RecipeCard.module.css'

const RecipeCard = ({ 
  recipe, 
  isPhotoOnly = false, 
  onEdit, 
  onDelete, 
  showActions = true,
  defaultCompact = true,
  showLikes = true,
  showComments = true // Nouveau prop pour afficher/masquer les commentaires
}) => {
  const router = useRouter()
  const { user } = useAuth()
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [showActionsState, setShowActions] = useState(showActions)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState(defaultCompact)
  
  // États pour le système de likes et commentaires - utiliser les vraies données
  const [engagementStats, setEngagementStats] = useState({ 
    likes_count: recipe.likes_count || 0, 
    user_has_liked: false,
    comments_count: 0
  })
  const [engagementLoading, setEngagementLoading] = useState(false)

  // Defensive programming: ensure recipe exists and has required properties
  if (!recipe) {
    return null;
  }

  // Charger les statistiques d'engagement au montage du composant
  useEffect(() => {
    if (recipe.id && (showLikes || showComments)) {
      loadEngagementStats()
    }
  }, [recipe.id, showLikes, showComments])

  const loadEngagementStats = async () => {
    try {
      const { getRecipeEngagementStats } = await import('../utils/likesUtils')
      const result = await getRecipeEngagementStats(recipe.id)
      if (result.success) {
        setEngagementStats({
          likes_count: result.likes_count,
          user_has_liked: result.user_has_liked,
          comments_count: result.comments_count
        })
      } else {
        // Fallback sur les données de la recette si l'API échoue
        setEngagementStats({
          likes_count: recipe.likes_count || 0,
          user_has_liked: false,
          comments_count: 0
        })
      }
    } catch (error) {
      logError('Error loading engagement stats for recipe card', error, {
        recipeId: recipe.id
      })
      // Utiliser les données de la recette en fallback
      setEngagementStats({
        likes_count: recipe.likes_count || 0,
        user_has_liked: false,
        comments_count: 0
      })
    }
  }

  // Fonction améliorée pour traiter les images avec illustrations de fallback
  const getImageUrl = (imageData) => {
    try {
      logDebug('RecipeCard: Processing image data', {
        recipeId: recipe?.id,
        dataType: typeof imageData,
        isArray: Array.isArray(imageData),
        hasData: !!imageData,
        dataLength: imageData?.length
      });

      // Si pas d'image, générer une illustration
      if (!imageData) {
        const illustration = getRecipeIllustration(recipe)
        logDebug('RecipeCard: Generated illustration', {
          recipeId: recipe?.id,
          category: recipe?.category,
          hasTitle: !!recipe?.title
        });
        return illustration
      }

      const processedUrl = processImageData(imageData, null);
      
      // Valider l'URL traitée
      if (processedUrl && 
          (processedUrl.startsWith('data:image/') || processedUrl.startsWith('http'))) {
        
        logDebug('RecipeCard: Image processed successfully', {
          recipeId: recipe?.id,
          processedUrl: processedUrl?.substring(0, 100) + '...',
          isDataUrl: processedUrl?.startsWith('data:'),
        });

        return processedUrl;
      } else {
        // Fallback vers illustration générée
        const illustration = getRecipeIllustration(recipe)
        logDebug('RecipeCard: Using generated illustration as fallback', {
          recipeId: recipe?.id,
          reason: 'Invalid processed URL'
        });
        return illustration
      }
    } catch (error) {
      logError('RecipeCard: Error processing image', error, {
        recipeId: recipe?.id,
        imageData: typeof imageData,
        hasData: !!imageData
      });
      // En cas d'erreur, utiliser l'illustration générée
      return getRecipeIllustration(recipe)
    }
  }

  const toggleLike = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      // Rediriger vers la connexion si pas connecté
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent(router.asPath))
      }
      return
    }

    if (engagementLoading) return

    setEngagementLoading(true)
    
    try {
      const { toggleRecipeLike } = await import('../utils/likesUtils')
      const result = await toggleRecipeLike(
        recipe.id,
        user.id,
        engagementStats.user_has_liked,
        {
          id: recipe.id,
          title: recipe.title,
          image: recipe.image,
          user_id: recipe.user_id
        },
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
        }
      )

      if (result.success && result.stats) {
        setEngagementStats(prev => ({
          ...prev,
          likes_count: result.stats.likes_count,
          user_has_liked: result.stats.user_has_liked
        }))

        // Animation de like améliorée
        if (result.stats.user_has_liked) {
          // Créer une animation de coeur flottant plus sophistiquée
          const heart = document.createElement('div')
          heart.innerHTML = '❤️'
          heart.style.cssText = `
            position: fixed;
            font-size: 2rem;
            z-index: 10000;
            pointer-events: none;
            animation: enhancedHeartFloat 1.5s ease-out forwards;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.5));
          `
          document.body.appendChild(heart)
          setTimeout(() => heart.remove(), 1500)

          // Ajouter une animation de pulsation sur le bouton
          const likeButton = e.target.closest(`.${styles.likeBtn}`)
          if (likeButton) {
            likeButton.style.animation = 'heartBeat 0.6s ease-in-out'
            setTimeout(() => {
              if (likeButton) likeButton.style.animation = ''
            }, 600)
          }

          // Vibration légère sur mobile
          if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50])
          }

          // Effet de particules
          createLikeParticles(e.target)
        }

        logUserInteraction('TOGGLE_RECIPE_LIKE', 'recipe-card', {
          recipeId: recipe.id,
          action: result.stats.user_has_liked ? 'like' : 'unlike',
          newLikesCount: result.stats.likes_count
        })
      } else {
        // Handle authentication or other API errors
        if (result.status === 401 || result.error?.includes('auth')) {
          // Authentication error - redirect to login
          const wantsToLogin = window.confirm('Votre session a expiré. Reconnectez-vous pour continuer.')
          if (wantsToLogin) {
            router.push('/login?redirect=' + encodeURIComponent(router.asPath))
          }
        } else {
          // Other errors - show error message
          console.error('Like toggle failed:', result.error)
        }
      }
    } catch (error) {
      logError('Error toggling like in recipe card', error, {
        recipeId: recipe.id,
        userId: user?.id,
        errorStatus: error.status,
        errorMessage: error.message
      })
      
      // Handle specific error types
      if (error.status === 401) {
        // Authentication error
        const wantsToLogin = window.confirm('Votre session a expiré. Reconnectez-vous pour continuer.')
        if (wantsToLogin) {
          router.push('/login?redirect=' + encodeURIComponent(router.asPath))
        }
      } else {
        // Animation d'erreur
        const likeButton = e.target.closest(`.${styles.likeBtn}`)
        if (likeButton) {
          likeButton.style.animation = 'shake 0.5s ease-in-out'
          setTimeout(() => {
            if (likeButton) likeButton.style.animation = ''
          }, 500)
        }
      }
    } finally {
      setEngagementLoading(false)
    }
  }

  // Nouvelle fonction pour créer des particules
  const createLikeParticles = (target) => {
    const rect = target.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div')
      particle.innerHTML = ['💖', '✨', '💕', '⭐', '💫'][Math.floor(Math.random() * 5)]
      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 1rem;
        pointer-events: none;
        z-index: 10000;
        animation: particleFloat 1.2s ease-out forwards;
        animation-delay: ${i * 0.1}s;
        transform: translate(-50%, -50%);
      `
      document.body.appendChild(particle)
      setTimeout(() => particle.remove(), 1200 + (i * 100))
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const navigateToRecipe = () => {
    // Always use the standard recipe route
    router.push(`/recipe/${recipe.id}`)
  }

  // Safe access to recipe properties with defaults
  const safeRecipe = {
    id: recipe.id || Math.random().toString(36),
    title: recipe.title || 'Recette sans titre',
    description: recipe.description || 'Une délicieuse recette à découvrir !',
    image: getImageUrl(recipe.image),
    author: recipe.author || 'Chef Anonyme',
    prepTime: recipe.prepTime || 'Non spécifié',
    cookTime: recipe.cookTime || 'Non spécifié',
    category: recipe.category || 'Autre',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : []
  };

  // Debug final de l'URL d'image
  logDebug('RecipeCard: Final image URL', {
    recipeId: safeRecipe.id,
    finalImageUrl: safeRecipe.image?.substring(0, 100) + '...',
    imageLength: safeRecipe.image?.length,
    isDataUrl: safeRecipe.image?.startsWith('data:'),
    isSVG: safeRecipe.image?.includes('svg')
  })
  
  // Détecter automatiquement si c'est un partage rapide
  const isQuickShare = recipe.form_mode === 'quick' || 
                      recipe.category === 'Photo partagée' ||
                      (Array.isArray(recipe.ingredients) && recipe.ingredients.length === 0 &&
                       Array.isArray(recipe.instructions) && recipe.instructions.length === 0) ||
                      isPhotoOnly

  // Vérifier si l'utilisateur peut modifier cette recette
  const canEdit = user && recipe.user_id && canUserEditRecipe(recipe.user_id, user.id)

  const toggleViewMode = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsCompactMode(!isCompactMode)
    
    logUserInteraction('RECIPE_CARD_VIEW_TOGGLE', 'recipe-card', {
      recipeId: safeRecipe.id,
      newMode: isCompactMode ? 'detailed' : 'compact',
      userId: user?.id
    })
  }

  return (
    <div 
      className={`${styles.card} ${isQuickShare ? styles.photoOnly : ''} ${imageLoading ? styles.loading : ''} ${isCompactMode ? styles.compact : styles.detailed}`} 
      onClick={navigateToRecipe}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{
        borderRadius: '22px',
        boxShadow: imageLoading
          ? '0 2px 12px 0 rgba(16,24,40,0.06)'
          : '0 8px 32px 0 rgba(16,24,40,0.10)',
        background: isQuickShare
          ? 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)'
          : 'white',
        border: isQuickShare ? '2px solid #f59e0b' : '1px solid #f3f4f6',
        transition: 'box-shadow 0.25s, transform 0.18s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '320px',
        maxWidth: '360px',
        margin: '0 auto'
      }}
    >
      {/* Badge pour identifier le type de partage */}
      {isQuickShare && (
        <div className={styles.quickShareBadge} style={{
          position: 'absolute',
          top: 14,
          left: 14,
          background: 'linear-gradient(90deg, #f59e0b 60%, #fde68a 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.85rem',
          padding: '6px 16px',
          borderRadius: '16px',
          boxShadow: '0 2px 8px #f59e0b22',
          zIndex: 3,
          letterSpacing: '0.01em'
        }}>
          📸 Partage Express
        </div>
      )}
      
      <div className={styles.imageContainer} style={{
        position: 'relative',
        width: '100%',
        height: '180px',
        borderRadius: '18px 18px 0 0',
        overflow: 'hidden',
        background: '#f3f4f6'
      }}>
        <Image
          src={safeRecipe.image}
          alt={safeRecipe.title}
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          priority={false}
          className={styles.image}
          unoptimized={safeRecipe.image.startsWith('data:')}
          style={{
            objectFit: 'cover',
            borderRadius: '18px 18px 0 0',
            transition: 'filter 0.2s',
            filter: imageLoading ? 'blur(6px) grayscale(0.2)' : 'none'
          }}
          onLoad={() => {
            setImageLoading(false)
            logInfo('RecipeCard: Image loaded successfully', {
              recipeId: safeRecipe.id,
              imageType: safeRecipe.image?.includes('svg') ? 'svg' : 'raster'
            })
          }}
          onError={(e) => {
            setImageError(true)
            setImageLoading(false)
            const fallbackIllustration = getRecipeIllustration(recipe)
            e.target.src = fallbackIllustration
            logError('RecipeCard: Image load failed, using illustration', new Error('Image load failed'), {
              recipeId: safeRecipe.id,
              originalSrc: safeRecipe.image?.substring(0, 50) + '...',
              fallbackSrc: fallbackIllustration?.substring(0, 50) + '...'
            })
          }}
        />
        
        {/* Overlay avec toggle de vue */}
        <div className={styles.imageOverlay} style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 4
        }}>
          <button 
            className={styles.viewToggleBtn}
            onClick={toggleViewMode}
            title={isCompactMode ? "Voir les détails" : "Vue compacte"}
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              fontSize: '1.2rem',
              boxShadow: '0 2px 8px #0001',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {isCompactMode ? '📋' : '📖'}
          </button>
        </div>
        
        {/* Actions flottantes */}
        <div className={styles.cardActions} style={{
          position: 'absolute',
          bottom: 12,
          right: 16,
          display: 'flex',
          gap: '10px',
          zIndex: 4
        }}>
          {/* Bouton de like */
          showLikes && (
            <button 
              className={`${styles.likeBtn} ${engagementStats.user_has_liked ? styles.liked : ''} ${engagementLoading ? styles.loading : ''}`}
              onClick={toggleLike}
              disabled={engagementLoading}
              aria-label={engagementStats.user_has_liked ? "Retirer des likes" : "Ajouter aux likes"}
              title={`${engagementStats.likes_count} like${engagementStats.likes_count > 1 ? 's' : ''}`}
              style={{
                background: engagementStats.user_has_liked ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : '#fff',
                color: engagementStats.user_has_liked ? '#fff' : '#ef4444',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                fontSize: '1.25rem',
                boxShadow: engagementStats.user_has_liked ? '0 2px 8px #ef444422' : '0 1px 4px #0001',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              {engagementLoading ? '⏳' : (engagementStats.user_has_liked ? '❤️' : '🤍')}
              {engagementStats.likes_count > 0 && (
                <span className={styles.likesCount} style={{
                  marginLeft: 4,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: engagementStats.user_has_liked ? '#fff' : '#ef4444'
                }}>{engagementStats.likes_count}</span>
              )}
            </button>
         ) }

          {/* Bouton de commentaires avec vraies données */}
          {showComments && engagementStats.comments_count > 0 && (
            <button 
              className={styles.commentsBtn}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigateToRecipe(); }}
              title={`${engagementStats.comments_count} commentaire${engagementStats.comments_count > 1 ? 's' : ''}`}
              style={{
                background: '#fff',
                color: '#3b82f6',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                fontSize: '1.25rem',
                boxShadow: '0 1px 4px #0001',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s'
              }}
            >
              💬
              <span className={styles.commentsCount} style={{
                marginLeft: 4,
                fontWeight: 700,
                fontSize: '0.95rem',
                color: '#3b82f6'
              }}>{engagementStats.comments_count}</span>
            </button>
          )}

          {/* Actions du propriétaire */}
          {canEdit && (
            <div className={styles.ownerActions} style={{ display: 'flex', gap: 6 }}>
              <button 
                className={styles.editBtn}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(recipe.id); }}
                title="Modifier la recette"
                aria-label="Modifier cette recette"
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: '1.1rem',
                  color: '#3b82f6',
                  cursor: 'pointer'
                }}
              >
                ✏️
              </button>
              <button 
                className={styles.deleteBtn}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(recipe.id); }}
                title="Supprimer la recette"
                aria-label="Supprimer cette recette"
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  fontSize: '1.1rem',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.content} style={{
        padding: '18px 18px 12px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Titre toujours visible */}
        <h3 className={styles.recipeTitle} style={{
          fontSize: '1.18rem',
          fontWeight: 700,
          margin: 0,
          color: '#1e293b',
          lineHeight: '1.2',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}>{safeRecipe.title}</h3>
        
        {/* Auteur compact toujours visible */}
        <div className={styles.compactAuthor} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.97rem',
          color: '#64748b',
          fontWeight: 500
        }}>
          <span className={styles.authorEmoji}>👤</span>
          <span className={styles.authorName}>{safeRecipe.author}</span>
          {recipe.created_at && (
            <span className={styles.compactDate} style={{ fontSize: '0.88rem', color: '#a1a1aa' }}>
              • {new Date(recipe.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short'
              })}
            </span>
          )}
          {/* Affichage compact des statistiques d'engagement RÉELLES */}
          {showLikes && engagementStats.likes_count > 0 && (
            <span className={styles.compactLikes} style={{
              marginLeft: 6,
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}>
              • ❤️ {engagementStats.likes_count}
            </span>
          )}
          {showComments && engagementStats.comments_count > 0 && (
            <span className={styles.compactComments} style={{
              marginLeft: 6,
              color: '#3b82f6',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}>
              • 💬 {engagementStats.comments_count}
            </span>
          )}
        </div>
        
        {/* Contenu détaillé - affiché seulement en mode détaillé */}
        {!isCompactMode && (
          <div className={styles.detailedContent} style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {safeRecipe.description && !isQuickShare && (
              <p className={styles.recipeDescription} style={{
                fontSize: '0.98rem',
                color: '#374151',
                margin: 0,
                lineHeight: 1.4,
                maxHeight: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {safeRecipe.description.length > 100 
                  ? `${safeRecipe.description.substring(0, 100)}...` 
                  : safeRecipe.description}
              </p>
            )}
            
            {isQuickShare && (
              <p className={styles.recipeDescription} style={{
                fontSize: '0.98rem',
                color: '#374151',
                margin: 0,
                lineHeight: 1.4
              }}>
                {safeRecipe.description}
              </p>
            )}
            
            <div className={styles.recipeDetails} style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              fontSize: '0.95rem'
            }}>
              {!isQuickShare && recipe.difficulty && (
                <span className={styles.recipeDifficulty} style={{
                  color: recipe.difficulty === 'Facile' ? '#10b981' : 
                        recipe.difficulty === 'Moyen' ? '#f59e0b' : '#ef4444',
                  fontWeight: 600
                }}>
                  {recipe.difficulty === 'Facile' ? '🟢' : 
                   recipe.difficulty === 'Moyen' ? '🟠' : '🔴'} {recipe.difficulty}
                </span>
              )}
              
              {!isQuickShare && safeRecipe.prepTime && (
                <span className={styles.recipeTime} style={{
                  color: '#64748b'
                }}>
                  ⏱️ {safeRecipe.prepTime}
                </span>
              )}
              
              {safeRecipe.category && (
                <span className={styles.recipeCategory} style={{
                  color: isQuickShare ? '#f59e0b' : '#3b82f6',
                  fontWeight: 500
                }}>
                  {isQuickShare ? '📸' : '📂'} {safeRecipe.category}
                </span>
              )}
            </div>
            
            <div className={styles.recipeFooter} style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontSize: '0.93rem',
              color: '#6b7280'
            }}>
              <span className={styles.recipeAuthor}>
                👤 {safeRecipe.author || 'Chef Anonyme'}
              </span>
              
              {recipe.created_at && (
                <span className={styles.recipeDate}>
                  {new Date(recipe.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short'
                  })}
                </span>
              )}
              
              {/* Affichage détaillé des statistiques d'engagement RÉELLES */}
              {showLikes && (
                <span className={styles.detailedLikes} style={{
                  color: '#ef4444',
                  fontWeight: 600
                }}>
                  ❤️ {engagementStats.likes_count} like{engagementStats.likes_count > 1 ? 's' : ''}
                </span>
              )}
              
              {showComments && (
                <span className={styles.detailedComments} style={{
                  color: '#3b82f6',
                  fontWeight: 600
                }}>
                  💬 {engagementStats.comments_count} commentaire{engagementStats.comments_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Mode compact - juste une indication de catégorie */}
        {isCompactMode && safeRecipe.category && (
          <div className={styles.compactCategory} style={{
            marginTop: 6
          }}>
            <span className={styles.categoryChip} style={{
              background: isQuickShare
                ? 'linear-gradient(90deg, #f59e0b 60%, #fde68a 100%)'
                : '#f3f4f6',
              color: isQuickShare ? '#fff' : '#3b82f6',
              fontWeight: 600,
              fontSize: '0.93rem',
              borderRadius: '12px',
              padding: '4px 12px'
            }}>
              {isQuickShare ? '📸' : '📂'} {safeRecipe.category}
            </span>
          </div>
        )}
      </div>
      
      {/* Actions flottantes avec vraies données */}
      <div className={styles.cardActions} style={{
        position: 'absolute',
        bottom: 12,
        right: 16,
        display: 'flex',
        gap: '10px',
        zIndex: 4
      }}>
        {/* Bouton de like avec vraies données */}
        {showLikes && (
          <button 
            className={`${styles.likeBtn} ${engagementStats.user_has_liked ? styles.liked : ''} ${engagementLoading ? styles.loading : ''}`}
            onClick={toggleLike}
            disabled={engagementLoading}
            aria-label={engagementStats.user_has_liked ? "Retirer des likes" : "Ajouter aux likes"}
            title={`${engagementStats.likes_count} like${engagementStats.likes_count > 1 ? 's' : ''}`}
            style={{
              background: engagementStats.user_has_liked ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : '#fff',
              color: engagementStats.user_has_liked ? '#fff' : '#ef4444',
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              fontSize: '1.25rem',
              boxShadow: engagementStats.user_has_liked ? '0 2px 8px #ef444422' : '0 1px 4px #0001',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            {engagementLoading ? '⏳' : (engagementStats.user_has_liked ? '❤️' : '🤍')}
            {engagementStats.likes_count > 0 && (
              <span className={styles.likesCount} style={{
                marginLeft: 4,
                fontWeight: 700,
                fontSize: '0.95rem',
                color: engagementStats.user_has_liked ? '#fff' : '#ef4444'
              }}>{engagementStats.likes_count}</span>
            )}
          </button>
        )}

        {/* Bouton de commentaires avec vraies données */}
        {showComments && engagementStats.comments_count > 0 && (
          <button 
            className={styles.commentsBtn}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigateToRecipe(); }}
            title={`${engagementStats.comments_count} commentaire${engagementStats.comments_count > 1 ? 's' : ''}`}
            style={{
              background: '#fff',
              color: '#3b82f6',
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              fontSize: '1.25rem',
              boxShadow: '0 1px 4px #0001',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s'
            }}
          >
            💬
            <span className={styles.commentsCount} style={{
              marginLeft: 4,
              fontWeight: 700,
              fontSize: '0.95rem',
              color: '#3b82f6'
            }}>{engagementStats.comments_count}</span>
          </button>
        )}

        {/* Actions du propriétaire */}
        {canEdit && (
          <div className={styles.ownerActions} style={{ display: 'flex', gap: 6 }}>
            <button 
              className={styles.editBtn}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(recipe.id); }}
              title="Modifier la recette"
              aria-label="Modifier cette recette"
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: '1.1rem',
                color: '#3b82f6',
                cursor: 'pointer'
              }}
            >
              ✏️
            </button>
            <button 
              className={styles.deleteBtn}
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(recipe.id); }}
              title="Supprimer la recette"
              aria-label="Supprimer cette recette"
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: '1.1rem',
                color: '#ef4444',
                cursor: 'pointer'
              }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      
      {/* Responsive et hover amélioré */}
      <style jsx>{`
        @media (max-width: 480px) {
          :global(.${styles.card}) {
            max-width: 98vw !important;
            min-height: 260px !important;
          }
          :global(.${styles.imageContainer}) {
            height: 120px !important;
          }
        }
        :global(.${styles.card}:hover) {
          box-shadow: 0 12px 36px 0 rgba(16,24,40,0.16);
          transform: translateY(-2px) scale(1.02);
        }
        :global(.${styles.card}.${styles.photoOnly}:hover) {
          border-color: #f59e0b;
          box-shadow: 0 8px 32px #f59e0b33;
        }
      `}</style>
      <style jsx>{`
        @keyframes enhancedHeartFloat {
          0% {
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -80%) scale(1.3) rotate(10deg);
            opacity: 0.9;
          }
          100% {
            transform: translate(-50%, -120%) scale(0.8) rotate(20deg);
            opacity: 0;
          }
        }
        
        @keyframes heartBeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(1.1); }
          75% { transform: scale(1.3); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        @keyframes particleFloat {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translate(
              calc(-50% + ${Math.random() * 60 - 30}px), 
              calc(-50% - ${Math.random() * 40 + 20}px)
            ) scale(1) rotate(${Math.random() * 360}deg);
            opacity: 0.8;
          }
          100% {
            transform: translate(
              calc(-50% + ${Math.random() * 100 - 50}px), 
              calc(-50% - ${Math.random() * 80 + 40}px)
            ) scale(0) rotate(${Math.random() * 720}deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default RecipeCard
