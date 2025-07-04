import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'
import ShareButton from './ShareButton'
import { processImageData } from '../utils/imageUtils'
import { getRecipeIllustration } from '../utils/recipeIllustrations'
import { logDebug, logInfo, logError } from '../utils/logger'
import { canUserEditRecipe, deleteUserRecipe } from '../utils/profileUtils'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import styles from '../styles/RecipeCard.module.css'

const RecipeCard = ({ 
  recipe, 
  isPhotoOnly = false, 
  onEdit, 
  onDelete, 
  showActions = true,
  defaultCompact = true // Nouveau prop pour définir le mode par défaut
}) => {
  const router = useRouter()
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [showActionsState, setShowActions] = useState(showActions)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompactMode, setIsCompactMode] = useState(defaultCompact) // Nouveau state pour le mode d'affichage

  // Defensive programming: ensure recipe exists and has required properties
  if (!recipe) {
    return null;
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

  const toggleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const isLiking = !isFavorite
    setIsFavorite(!isFavorite)
    
    // Déclencher une notification pour l'auteur de la recette si ce n'est pas soi-même
    if (isLiking && user && recipe.user_id && recipe.user_id !== user.id) {
      showRecipeLikeInteractionNotification(
        {
          id: safeRecipe.id,
          title: safeRecipe.title,
          image: safeRecipe.image
        },
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
        }
      )
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
          <button 
            className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ''}`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Retirer des likes" : "Ajouter aux likes"}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>

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
    </div>
  )
}

export default RecipeCard
