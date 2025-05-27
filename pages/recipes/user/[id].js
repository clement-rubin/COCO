import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import styles from '../../../styles/RecipeDetail.module.css'

export default function UserRecipeDetail() {
  const router = useRouter()
  const { id } = router.query
  
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  useEffect(() => {
    if (!id) return;
    
    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/recipes/${id}`);
        
        if (!response.ok) {
          throw new Error('Recette non trouvée');
        }
        
        const data = await response.json();
        setRecipe(data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger la recette. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchRecipe();
  }, [id]);
  
  // Afficher un message de chargement
  if (loading) {
    return <div className={styles.loading}>Chargement de la recette...</div>
  }
  
  // Afficher un message d'erreur
  if (error || !recipe) {
    return (
      <div className={styles.error}>
        <p>{error || 'Recette non trouvée'}</p>
        <Link href="/user-recipes" className="button">
          Retour aux recettes de la communauté
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{recipe.title} | COCO - Cuisine & Saveurs</title>
        <meta name="description" content={recipe.description} />
      </Head>

      <div className={styles.recipeHeader}>
        <div className={styles.imageContainer}>
          <Image 
            src={recipe.image} 
            alt={recipe.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={true}
            className={styles.recipeImage}
          />
        </div>
        <div className={styles.recipeInfo}>
          <h1>{recipe.title}</h1>
          <p className={styles.description}>{recipe.description}</p>
          
          {recipe.author && (
            <p className={styles.author}>Par {recipe.author}</p>
          )}
          
          <div className={styles.metaInfo}>
            <div>
              <strong>Préparation:</strong> {recipe.prepTime}
            </div>
            <div>
              <strong>Cuisson:</strong> {recipe.cookTime}
            </div>
            <div>
              <strong>Portions:</strong> {recipe.servings}
            </div>
            <div>
              <strong>Difficulté:</strong> {recipe.difficulty}
            </div>
            <div>
              <strong>Catégorie:</strong> {recipe.category}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.recipeContent}>
        <div className={styles.ingredients}>
          <h2>Ingrédients</h2>
          <ul>
            {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>
        
        <div className={styles.instructions}>
          <h2>Préparation</h2>
          <ol>
            {recipe.instructions && recipe.instructions.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
      
      <div className={styles.actions}>
        <Link href="/user-recipes" className={styles.backButton}>
          Retour aux recettes de la communauté
        </Link>
      </div>
    </div>
  )
}
