import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import ShareButton from './ShareButton'
import { processImageData } from '../utils/imageUtils'
import { logDebug, logInfo, logError } from '../utils/logger'
import styles from '../styles/RecipeCard.module.css'

export default function RecipeCard({ recipe, isUserRecipe = true, isPhotoOnly = false }) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Defensive programming: ensure recipe exists and has required properties
  if (!recipe) {
    return null;
  }

  // Fonction améliorée pour traiter les images avec debugging détaillé
  const getImageUrl = (imageData) => {
    try {
      logDebug('RecipeCard: Processing image data', {
        recipeId: recipe?.id,
        dataType: typeof imageData,
        isArray: Array.isArray(imageData),
        hasData: !!imageData,
        dataLength: imageData?.length
      });

      const processedUrl = processImageData(imageData, '/placeholder-recipe.jpg');
      
      logDebug('RecipeCard: Image processed successfully', {
        recipeId: recipe?.id,
        originalDataType: typeof imageData,
        processedUrl: processedUrl?.substring(0, 100) + (processedUrl?.length > 100 ? '...' : ''),
        isDataUrl: processedUrl?.startsWith('data:'),
        isPlaceholder: processedUrl === '/placeholder-recipe.jpg'
      });

      return processedUrl;
    } catch (error) {
      logError('RecipeCard: Error processing image', error, {
        recipeId: recipe?.id,
        imageData: typeof imageData,
        hasData: !!imageData
      });
      return '/placeholder-recipe.jpg';
    }
  }

  const toggleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
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
    description: recipe.description || 'Aucune description disponible',
    image: getImageUrl(recipe.image),
    author: recipe.author || 'Chef Anonyme',
    prepTime: recipe.prepTime || 'Non spécifié',
    cookTime: recipe.cookTime || 'Non spécifié',
    category: recipe.category || 'Autre',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : []
  };

  // Debug final de l'URL d'image
  logDebug('RecipeCard: Image finale utilisée', {
    recipeId: safeRecipe.id,
    finalImageUrl: safeRecipe.image?.substring(0, 100) + (safeRecipe.image?.length > 100 ? '...' : ''),
    imageLength: safeRecipe.image?.length,
    isDataUrl: safeRecipe.image?.startsWith('data:'),
    isPlaceholder: safeRecipe.image === '/placeholder-recipe.jpg'
  })
  
  // Déterminez le lien en fonction du type de recette
  const recipeLink = isUserRecipe
    ? `/recipes/user/${safeRecipe.id}`
    : `/recipes/${safeRecipe.id}`

  // Détecter automatiquement si c'est un partage rapide
  const isQuickShare = recipe.form_mode === 'quick' || 
                      recipe.category === 'Photo partagée' ||
                      (Array.isArray(recipe.ingredients) && recipe.ingredients.length === 0 &&
                       Array.isArray(recipe.instructions) && recipe.instructions.length === 0) ||
                      isPhotoOnly

  return (
    <div 
      className={`${styles.card} ${isQuickShare ? styles.photoOnly : ''} ${imageLoading ? styles.loading : ''}`} 
      onClick={navigateToRecipe}
    >
      <div className={styles.imageContainer}>
        <Image
          src={imageError ? '/placeholder-recipe.jpg' : safeRecipe.image}
          alt={safeRecipe.title}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          priority={false}
          className={styles.image}
          onLoad={() => {
            setImageLoading(false)
            logInfo('RecipeCard: Image chargée avec succès', {
              recipeId: safeRecipe.id,
              imageUrl: safeRecipe.image?.substring(0, 50) + '...'
            })
          }}
          onError={(e) => {
            setImageError(true)
            setImageLoading(false)
            logError('RecipeCard: Erreur de chargement d\'image', new Error('Image load failed'), {
              recipeId: safeRecipe.id,
              imageUrl: safeRecipe.image?.substring(0, 50) + '...',
              errorTarget: e.target?.src?.substring(0, 50) + '...'
            })
          }}
        />
        
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
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.recipeTitle}>{safeRecipe.title}</h3>
        
        {safeRecipe.description && !isQuickShare && (
          <p className={styles.recipeDescription}>
            {safeRecipe.description.length > 100 
              ? `${safeRecipe.description.substring(0, 100)}...` 
              : safeRecipe.description}
          </p>
        )}
        
        {isQuickShare && (
          <p className={styles.recipeDescription}>
            {safeRecipe.description === 'Photo partagée rapidement avec COCO ✨' 
              ? 'Une délicieuse création partagée instantanément ✨'
              : safeRecipe.description
            }
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
    </div>
  )
}
