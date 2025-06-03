import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import ShareButton from './ShareButton'
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

  // Function to convert bytea to image URL
  const getImageUrl = (imageData) => {
    if (!imageData) return '/placeholder-recipe.jpg'
    
    try {
      // If imageData is already a string (URL), return it
      if (typeof imageData === 'string' && imageData.startsWith('http')) {
        return imageData
      }
      
      // If imageData is a base64 string, convert to URL
      if (typeof imageData === 'string' && !imageData.startsWith('http')) {
        return `data:image/jpeg;base64,${imageData}`
      }
      
      // If imageData is an array of bytes (bytea), convert to base64
      if (Array.isArray(imageData)) {
        const uint8Array = new Uint8Array(imageData)
        const base64 = btoa(String.fromCharCode.apply(null, uint8Array))
        return `data:image/jpeg;base64,${base64}`
      }
      
      return '/placeholder-recipe.jpg'
    } catch (error) {
      console.error('Erreur lors de la conversion de l\'image:', error)
      return '/placeholder-recipe.jpg'
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
          onLoad={handleImageLoad}
          onError={handleImageError}
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
