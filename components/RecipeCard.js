import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import ShareButton from './ShareButton'
import styles from '../styles/RecipeCard.module.css'

export default function RecipeCard({ recipe, isUserRecipe = true }) {
  const [isFavorite, setIsFavorite] = useState(false)
  
  // Defensive programming: ensure recipe exists and has required properties
  if (!recipe) {
    return null;
  }

  // Safe access to recipe properties with defaults
  const safeRecipe = {
    id: recipe.id || Math.random().toString(36),
    title: recipe.title || 'Recette sans titre',
    description: recipe.description || 'Aucune description disponible',
    image: recipe.image || '/placeholder-recipe.jpg',
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

  const toggleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsFavorite(!isFavorite)
  }

  return (
    <div className={styles.card}>
      <Link href={recipeLink} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          <Image
            src={safeRecipe.image}
            alt={safeRecipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            priority={false}
            className={styles.image}
            onError={(e) => {
              e.target.src = '/placeholder-recipe.jpg';
            }}
          />
          <div className={styles.cardActions}>
            <button 
              className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ''}`}
              onClick={toggleFavorite}
              aria-label="Ajouter aux favoris"
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          </div>
        </div>
        <div className={styles.content}>
          <h3>{safeRecipe.title}</h3>
          <p className={styles.description}>{safeRecipe.description}</p>
          <p className={styles.author}>Par {safeRecipe.author}</p>
          <div className={styles.meta}>
            <span>⏱️ Préparation: {safeRecipe.prepTime}</span>
            <span>🍳 Cuisson: {safeRecipe.cookTime}</span>
            <span>📋 {safeRecipe.category}</span>
          </div>
          <div className={styles.shareContainer}>
            <ShareButton 
              recipe={safeRecipe} 
              recipeUrl={typeof window !== 'undefined' ? `${window.location.origin}${recipeLink}` : recipeLink}
            />
          </div>
        </div>
      </Link>
    </div>
  )
}
