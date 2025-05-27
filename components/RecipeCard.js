import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/RecipeCard.module.css'

export default function RecipeCard({ recipe, isUserRecipe = true }) {
  // Déterminez le lien en fonction du type de recette
  const recipeLink = isUserRecipe
    ? `/recipes/user/${recipe.id}`
    : `/recipes/${recipe.id}`

  return (
    <div className={styles.card}>
      <Link href={recipeLink} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            priority={false}
            className={styles.image}
          />
        </div>
        <div className={styles.content}>
          <h3>{recipe.title}</h3>
          <p className={styles.description}>{recipe.description}</p>
          {recipe.author && <p className={styles.author}>Par {recipe.author}</p>}
          <div className={styles.meta}>
            <span>⏱️ Préparation: {recipe.prepTime}</span>
            <span>🍳 Cuisson: {recipe.cookTime}</span>
            {recipe.category && <span>📋 {recipe.category}</span>}
          </div>
        </div>
      </Link>
    </div>
  )
}
