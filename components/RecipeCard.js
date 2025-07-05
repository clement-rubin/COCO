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
  showLikes = true // Nouveau prop pour afficher/masquer les likes
}) => {
  const router = useRouter()
  const { user } = useAuth()
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [showActionsState, setShowActions] = useState(showActions)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState(defaultCompact)
  
  // États pour le système de likes - utiliser les vraies données
  const [likesStats, setLikesStats] = useState({ 
    likes_count: recipe.likes_count || 0, 
    user_has_liked: false 
  })
  const [likesLoading, setLikesLoading] = useState(false)

  // Defensive programming: ensure recipe exists and has required properties
  if (!recipe) {
    return null;
  }

  // Charger les statistiques de likes au montage du composant
  useEffect(() => {
    if (recipe.id && showLikes) {
      loadLikesStats()
    }
  }, [recipe.id, showLikes])

  const loadLikesStats = async () => {
    try {
      const result = await getRecipeLikesStats(recipe.id)
      if (result.success) {
        setLikesStats({
          likes_count: result.likes_count,
          user_has_liked: result.user_has_liked
        })
      } else {
        // Fallback sur les données de la recette si l'API échoue
        setLikesStats({
          likes_count: recipe.likes_count || 0,
          user_has_liked: false
        })
      }
    } catch (error) {
      logError('Error loading likes stats for recipe card', error, {
        recipeId: recipe.id
      })
      // Utiliser les données de la recette en fallback
      setLikesStats({
        likes_count: recipe.likes_count || 0,
        user_has_liked: false
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

    if (likesLoading) return

    setLikesLoading(true)
    
    try {
      const result = await toggleRecipeLike(
        recipe.id,
        user.id,
        likesStats.user_has_liked,
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
        setLikesStats({
          likes_count: result.stats.likes_count,
          user_has_liked: result.stats.user_has_liked
        })

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
      }
    } catch (error) {
      logError('Error toggling like in recipe card', error, {
        recipeId: recipe.id,
        userId: user?.id
      })
      
      // Animation d'erreur
      const likeButton = e.target.closest(`.${styles.likeBtn}`)
      if (likeButton) {
        likeButton.style.animation = 'shake 0.5s ease-in-out'
        setTimeout(() => {
          if (likeButton) likeButton.style.animation = ''
        }, 500)
      }
    } finally {
      setLikesLoading(false)
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
    >
      {/* Badge pour identifier le type de partage */}
      {isQuickShare && (
        <div className={styles.quickShareBadge}>
          📸 Partage Express
        </div>
      )}
      
      <div className={styles.imageContainer}>
        <Image
          src={safeRecipe.image}
          alt={safeRecipe.title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          priority={false}
          className={styles.image}
          unoptimized={safeRecipe.image.startsWith('data:')}
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
            
            // En cas d'erreur, essayer de charger l'illustration générée
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
        <div className={styles.imageOverlay}>
          <button 
            className={styles.viewToggleBtn}
            onClick={toggleViewMode}
            title={isCompactMode ? "Voir les détails" : "Vue compacte"}
          >
            {isCompactMode ? '📋' : '📖'}
          </button>
        </div>
        
        {isQuickShare && (
          <div className={styles.photoTag}>
            📷 Partage Rapide
          </div>
        )}
        
        <div className={styles.cardActions}>
          {/* Bouton de like */
          showLikes && (
            <button 
              className={`${styles.likeBtn} ${likesStats.user_has_liked ? styles.liked : ''} ${likesLoading ? styles.loading : ''}`}
              onClick={toggleLike}
              disabled={likesLoading}
              aria-label={likesStats.user_has_liked ? "Retirer des likes" : "Ajouter aux likes"}
              title={`${likesStats.likes_count} like${likesStats.likes_count > 1 ? 's' : ''}`}
            >
              {likesLoading ? '⏳' : (likesStats.user_has_liked ? '❤️' : '🤍')}
              {likesStats.likes_count > 0 && (
                <span className={styles.likesCount}>{likesStats.likes_count}</span>
              )}
            </button>
         ) }

          {/* Actions du propriétaire */}
          {canEdit && (
            <div className={styles.ownerActions}>
              <button 
                className={styles.editBtn}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(recipe.id); }}
                title="Modifier la recette"
                aria-label="Modifier cette recette"
              >
                ✏️
              </button>
              <button 
                className={styles.deleteBtn}
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(recipe.id); }}
                title="Supprimer la recette"
                aria-label="Supprimer cette recette"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.content}>
        {/* Titre toujours visible */}
        <h3 className={styles.recipeTitle}>{safeRecipe.title}</h3>
        
        {/* Auteur compact toujours visible */}
        <div className={styles.compactAuthor}>
          <span className={styles.authorEmoji}>👤</span>
          <span className={styles.authorName}>{safeRecipe.author}</span>
          {recipe.created_at && (
            <span className={styles.compactDate}>
              • {new Date(recipe.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short'
              })}
            </span>
          )}
          {/* Affichage compact des likes */}
          {showLikes && likesStats.likes_count > 0 && (
            <span className={styles.compactLikes}>
              • ❤️ {likesStats.likes_count}
            </span>
          )}
        </div>
        
        {/* Contenu détaillé - affiché seulement en mode détaillé */}
        {!isCompactMode && (
          <div className={styles.detailedContent}>
            {safeRecipe.description && !isQuickShare && (
              <p className={styles.recipeDescription}>
                {safeRecipe.description.length > 100 
                  ? `${safeRecipe.description.substring(0, 100)}...` 
                  : safeRecipe.description}
              </p>
            )}
            
            {isQuickShare && (
              <p className={styles.recipeDescription}>
                {safeRecipe.description}
              </p>
            )}
            
            <div className={styles.recipeDetails}>
              {!isQuickShare && recipe.difficulty && (
                <span className={styles.recipeDifficulty}>
                  {recipe.difficulty === 'Facile' ? '🟢' : 
                   recipe.difficulty === 'Moyen' ? '🟠' : '🔴'} {recipe.difficulty}
                </span>
              )}
              
              {!isQuickShare && safeRecipe.prepTime && (
                <span className={styles.recipeTime}>
                  ⏱️ {safeRecipe.prepTime}
                </span>
              )}
              
              {safeRecipe.category && (
                <span className={styles.recipeCategory}>
                  {isQuickShare ? '📸' : '📂'} {safeRecipe.category}
                </span>
              )}
            </div>
            
            <div className={styles.recipeFooter}>
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
              
              {/* Affichage détaillé des likes */}
              {showLikes && (
                <span className={styles.detailedLikes}>
                  ❤️ {likesStats.likes_count} like{likesStats.likes_count > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Mode compact - juste une indication de catégorie */}
        {isCompactMode && safeRecipe.category && (
          <div className={styles.compactCategory}>
            <span className={styles.categoryChip}>
              {isQuickShare ? '📸' : '📂'} {safeRecipe.category}
            </span>
          </div>
        )}
      </div>

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
