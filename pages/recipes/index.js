import Head from 'next/head'
import { useState } from 'react'
import RecipeCard from '../../components/RecipeCard'
import styles from '../../styles/Recipes.module.css'

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Toutes')
  
  const allRecipes = [
    {
      id: 1,
      title: "Tarte aux pommes traditionnelle",
      description: "Une délicieuse tarte aux pommes à la française",
      image: "https://images.unsplash.com/photo-1568571780765-9276107cecf3?ixlib=rb-4.0.3",
      prepTime: "30 min",
      cookTime: "45 min",
      category: "Dessert"
    },
    {
      id: 2,
      title: "Poulet rôti aux herbes",
      description: "Poulet rôti juteux avec herbes fraîches",
      image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?ixlib=rb-4.0.3",
      prepTime: "15 min",
      cookTime: "1h30",
      category: "Plat principal"
    },
    {
      id: 3,
      title: "Pasta Carbonara",
      description: "La vraie recette italienne de carbonara",
      image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-4.0.3",
      prepTime: "10 min",
      cookTime: "15 min",
      category: "Plat principal"
    },
    {
      id: 4,
      title: "Salade niçoise",
      description: "Salade fraîche et colorée du sud de la France",
      image: "https://images.unsplash.com/photo-1608032364895-84c5d3c98c6a?ixlib=rb-4.0.3",
      prepTime: "20 min",
      cookTime: "0 min",
      category: "Entrée"
    },
    {
      id: 5,
      title: "Crème brûlée",
      description: "Dessert crémeux avec une couche de caramel croustillant",
      image: "https://images.unsplash.com/photo-1615489546541-911e3dd3f75a?ixlib=rb-4.0.3",
      prepTime: "15 min",
      cookTime: "40 min",
      category: "Dessert"
    },
    {
      id: 6,
      title: "Ratatouille provençale",
      description: "Un classique des légumes d'été mijotés",
      image: "https://images.unsplash.com/photo-1572453800999-e8d2d1589b7c?ixlib=rb-4.0.3",
      prepTime: "30 min",
      cookTime: "1h",
      category: "Plat principal"
    }
  ]
  
  // Get unique categories
  const categories = ['Toutes', ...new Set(allRecipes.map(recipe => recipe.category))];
  
  // Filter recipes by search term and category
  const filteredRecipes = allRecipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'Toutes' || recipe.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Toutes les recettes | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Parcourez notre collection de recettes" />
      </Head>
      
      <h1>Nos recettes</h1>
      
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Rechercher une recette..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      
      <div className={styles.filterContainer}>
        {categories.map(category => (
          <button 
            key={category}
            className={`${styles.filterButton} ${category === activeCategory ? styles.active : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      {filteredRecipes.length > 0 ? (
        <div className={styles.recipeGrid}>
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <p className={styles.noResults}>Aucune recette trouvée. Essayez un autre terme de recherche.</p>
      )}
    </div>
  )
}
