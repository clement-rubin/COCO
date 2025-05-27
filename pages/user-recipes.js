import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import RecipeCard from '../components/RecipeCard'
import styles from '../styles/Recipes.module.css'

export default function UserRecipes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [userRecipes, setUserRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Charger les recettes depuis l'API au chargement de la page
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des recettes');
        }
        const data = await response.json();
        setUserRecipes(data);
        setLoading(false);
      } catch (err) {
        console.error('Erreur:', err);
        setError('Impossible de charger les recettes. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchRecipes();
  }, []);
  
  // Filtrage des recettes par recherche
  const filteredRecipes = userRecipes.filter(recipe => {
    return recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (recipe.author && recipe.author.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div className={styles.container}>
      <Head>
        <title>Recettes de la communauté | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Découvrez les recettes créées par notre communauté de passionnés" />
      </Head>
      
      <h1>Recettes de la communauté</h1>
      <p className={styles.intro}>Explorez les créations culinaires partagées par nos utilisateurs.</p>
      
      <div className={styles.actions}>
        <Link href="/submit-recipe" className={styles.submitButton}>
          Partagez votre recette
        </Link>
      </div>
      
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Rechercher une recette ou un auteur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      
      {loading ? (
        <p className={styles.loading}>Chargement des recettes...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : filteredRecipes.length > 0 ? (
        <div className={styles.recipeGrid}>
          {filteredRecipes.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              isUserRecipe={true}
            />
          ))}
        </div>
      ) : (
        <p className={styles.noResults}>
          {searchTerm 
            ? "Aucune recette trouvée. Essayez un autre terme de recherche." 
            : "Aucune recette n'a encore été partagée. Soyez le premier à soumettre votre création !"}
        </p>
      )}
    </div>
  )
}
