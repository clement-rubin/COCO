import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import styles from '../styles/FriendsFeed.module.css'

export default function FriendsFeed({ feedType = 'featured' }) {
  const router = useRouter()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    
    // Simulation de chargement des données
    setTimeout(() => {
      setRecipes(generateRecipes(feedType))
      setLoading(false)
    }, 800)
  }, [feedType])

  const generateRecipes = (type) => {
    // Structure de données simplifiée pour les recettes
    const baseRecipes = [
      {
        id: 'r1',
        title: 'Risotto aux champignons',
        image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&q=80',
        chef: 'Marie Dubois',
        chefAvatar: '👩‍🍳',
        category: 'Plat Principal',
        prepTime: '20 min',
        difficulty: 'Moyen'
      },
      {
        id: 'r2',
        title: 'Tarte aux fraises maison',
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&q=80',
        chef: 'Pascal Martin',
        chefAvatar: '👨‍🍳',
        category: 'Dessert',
        prepTime: '40 min',
        difficulty: 'Facile'
      },
      {
        id: 'r3',
        title: 'Buddha bowl méditerranéen',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&q=80',
        chef: 'Emma Green',
        chefAvatar: '🌱',
        category: 'Healthy',
        prepTime: '15 min',
        difficulty: 'Facile'
      },
      {
        id: 'r4',
        title: 'Pizza napolitaine',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&q=80',
        chef: 'Chef Marco',
        chefAvatar: '🍕',
        category: 'Italien',
        prepTime: '30 min',
        difficulty: 'Moyen'
      },
      {
        id: 'r5',
        title: 'Poulet rôti aux herbes',
        image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&q=80',
        chef: 'Sophie Cuisine',
        chefAvatar: '🔪',
        category: 'Viande',
        prepTime: '1h',
        difficulty: 'Facile'
      },
      {
        id: 'r6',
        title: 'Ramen maison',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&q=80',
        chef: 'Kenji Suzuki',
        chefAvatar: '🍜',
        category: 'Asiatique',
        prepTime: '45 min',
        difficulty: 'Difficile'
      }
    ]

    // Ajustement en fonction du type de feed
    if (type === 'trending') {
      return [...baseRecipes].sort(() => 0.5 - Math.random())
    } else if (type === 'recent') {
      return [...baseRecipes].reverse()
    }
    
    return baseRecipes
  }

  const handleRecipeClick = (recipeId) => {
    router.push(`/recipe/${recipeId}`)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingIcon}>🍳</div>
        <p>Préparation en cours...</p>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      <h2 className={styles.sectionTitle}>
        {feedType === 'featured' ? 'Recettes en vedette' : 
         feedType === 'recent' ? 'Nouveautés culinaires' : 
         'Tendances du moment'}
      </h2>
      
      <div className={styles.storiesRow}>
        {recipes.map(recipe => (
          <div 
            key={recipe.id} 
            className={styles.storyCard}
            onClick={() => handleRecipeClick(recipe.id)}
          >
            <div className={styles.storyImageContainer}>
              <Image 
                src={recipe.image} 
                alt={recipe.title} 
                fill
                sizes="(max-width: 768px) 150px, 200px"
                className={styles.storyImage}
              />
              <div className={styles.storyGradient} />
            </div>
            <div className={styles.storyChef}>
              <span className={styles.chefAvatar}>{recipe.chefAvatar}</span>
              <span className={styles.chefName}>{recipe.chef}</span>
            </div>
            <h3 className={styles.storyTitle}>{recipe.title}</h3>
            <div className={styles.storyMeta}>
              <span>{recipe.category}</span>
              <span>•</span>
              <span>{recipe.prepTime}</span>
            </div>
          </div>
        ))}
      </div>
      
      <h2 className={styles.sectionTitle}>Collections culinaires</h2>
      <div className={styles.collectionsGrid}>
        {['Italien', 'Végétarien', 'Desserts', 'Repas rapides'].map((collection, index) => (
          <div key={collection} className={styles.collectionCard}>
            <span className={styles.collectionEmoji}>
              {['🍝', '🥗', '🍰', '⏱️'][index]}
            </span>
            <h3>{collection}</h3>
          </div>
        ))}
      </div>
    </div>
  )
}
