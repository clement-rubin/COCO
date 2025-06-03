import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import ShareButton from './ShareButton'
import { getRecipeImageUrl } from '../lib/supabase'
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
    logDebug('RecipeCard: getImageUrl appelée', {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataLength: imageData?.length,
      isArray: Array.isArray(imageData),
      isString: typeof imageData === 'string',
      rawImageData: imageData // Log complet pour debug
    })
    
    // Utiliser la fonction améliorée de conversion
    const processedUrl = getRecipeImageUrl(imageData, '/placeholder-recipe.jpg')
    
    logInfo('RecipeCard: URL d\'image traitée', {
      recipeId: recipe.id,
      originalDataType: typeof imageData,
      processedUrl: processedUrl?.substring(0, 100) + (processedUrl?.length > 100 ? '...' : ''),
      isDataUrl: processedUrl?.startsWith('data:'),
      isHttpUrl: processedUrl?.startsWith('http'),
      isFallback: processedUrl === '/placeholder-recipe.jpg'
    })
    
    return processedUrl
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

  return (
    <div 
      className={`${styles.card} ${isPhotoOnly ? styles.photoOnly : ''} ${imageLoading ? styles.loading : ''}`} 
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
        
        {isPhotoOnly && (
          <div className={styles.photoTag}>
            📷 Photo Instantanée
          </div>
        )}
        
        <div className={styles.cardActions}>
          <button 
            className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ''}`}
            onClick={toggleFavorite}
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
      
      <div className={styles.content}>
        <h3 className={styles.recipeTitle}>{safeRecipe.title}</h3>
        
        {safeRecipe.description && !isPhotoOnly && (
          <p className={styles.recipeDescription}>
            {safeRecipe.description.length > 100 
              ? `${safeRecipe.description.substring(0, 100)}...` 
              : safeRecipe.description}
          </p>
        )}
        
        {isPhotoOnly && (
          <p className={styles.recipeDescription}>
            Une délicieuse création partagée par un membre de la communauté COCO ✨
          </p>
        )}
        
        <div className={styles.recipeDetails}>
          {recipe.difficulty && !isPhotoOnly && (
            <span className={styles.recipeDifficulty}>
              {recipe.difficulty === 'Facile' ? '🟢' : 
               recipe.difficulty === 'Moyen' ? '🟠' : '🔴'} {recipe.difficulty}
            </span>
          )}
          
          {safeRecipe.prepTime && !isPhotoOnly && (
            <span className={styles.recipeTime}>
              ⏱️ {safeRecipe.prepTime}
            </span>
          )}
          
          {safeRecipe.category && (
            <span className={styles.recipeCategory}>
              {isPhotoOnly ? '📸' : '📂'} {safeRecipe.category}
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
