import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import styles from '../styles/FriendsFeed.module.css'

export default function FriendsFeed({ feedType = 'featured' }) {
  const router = useRouter()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedRecipes, setLikedRecipes] = useState(new Set())

  useEffect(() => {
    setLoading(true)
    
    // Simulation de chargement des données
    setTimeout(() => {
      setRecipes(generateRecipes(feedType))
      setLoading(false)
    }, 600)
  }, [feedType])

  const generateRecipes = (type) => {
    // Structure de données simplifiée pour les recettes
    const baseRecipes = [
      {
        id: 'r1',
        title: 'Risotto aux champignons',
        image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&q=80&w=400',
        chef: 'Marie Dubois',
        chefAvatar: '👩‍🍳',
        category: 'Plat Principal',
        prepTime: '20 min',
        difficulty: 'Moyen',
        rating: 4.8,
        likes: 234,
        isNew: type === 'recent'
      },
      {
        id: 'r2',
        title: 'Tarte aux fraises maison',
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&q=80&w=400',
        chef: 'Pascal Martin',
        chefAvatar: '👨‍🍳',
        category: 'Dessert',
        prepTime: '40 min',
        difficulty: 'Facile',
        rating: 4.6,
        likes: 189,
        isTrending: type === 'trending'
      },
      {
        id: 'r3',
        title: 'Buddha bowl méditerranéen',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&q=80&w=400',
        chef: 'Emma Green',
        chefAvatar: '🌱',
        category: 'Healthy',
        prepTime: '15 min',
        difficulty: 'Facile',
        rating: 4.9,
        likes: 456,
        isHealthy: true
      },
      {
        id: 'r4',
        title: 'Pizza napolitaine',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&q=80&w=400',
        chef: 'Chef Marco',
        chefAvatar: '🍕',
        category: 'Italien',
        prepTime: '30 min',
        difficulty: 'Moyen',
        rating: 4.7,
        likes: 312
      },
      {
        id: 'r5',
        title: 'Poulet rôti aux herbes',
        image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&q=80&w=400',
        chef: 'Sophie Cuisine',
        chefAvatar: '🔪',
        category: 'Viande',
        prepTime: '1h',
        difficulty: 'Facile',
        rating: 4.4,
        likes: 167
      },
      {
        id: 'r6',
        title: 'Ramen maison',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&q=80&w=400',
        chef: 'Kenji Suzuki',
        chefAvatar: '🍜',
        category: 'Asiatique',
        prepTime: '45 min',
        difficulty: 'Difficile',
        rating: 4.5,
        likes: 278
      }
    ]

    // Ajustement en fonction du type de feed
    if (type === 'trending') {
      return [...baseRecipes].sort((a, b) => b.likes - a.likes)
    } else if (type === 'recent') {
      return [...baseRecipes].reverse()
    }
    
    return baseRecipes
  }

  const handleRecipeClick = (recipeId) => {
    router.push(`/recipe/${recipeId}`)
  }

  const handleLike = (recipeId, e) => {
    e.stopPropagation()
    setLikedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const getFeedTitle = () => {
    switch(feedType) {
      case 'featured': return 'Recettes en vedette'
      case 'recent': return 'Nouveautés culinaires'
      case 'trending': return 'Tendances du moment'
      default: return 'Découvertes'
    }
  }

  const getFeedIcon = () => {
    switch(feedType) {
      case 'featured': return '⭐'
      case 'recent': return '🆕'
      case 'trending': return '🔥'
      default: return '🍽️'
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Préparation des délices...</p>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      {/* Header de section */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleContainer}>
          <span className={styles.sectionIcon}>{getFeedIcon()}</span>
          <h2 className={styles.sectionTitle}>{getFeedTitle()}</h2>
        </div>
        <button className={styles.seeAllBtn}>
          Voir tout →
        </button>
      </div>
      
      {/* Stories horizontales */}
      <div className={styles.storiesContainer}>
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
                  sizes="(max-width: 768px) 180px, 220px"
                  className={styles.storyImage}
                />
                <div className={styles.storyGradient} />
                
                {/* Badges */}
                <div className={styles.storyBadges}>
                  {recipe.isNew && <span className={styles.newBadge}>Nouveau</span>}
                  {recipe.isTrending && <span className={styles.trendingBadge}>🔥</span>}
                  {recipe.isHealthy && <span className={styles.healthyBadge}>💚</span>}
                </div>
                
                {/* Actions */}
                <div className={styles.storyActions}>
                  <button 
                    className={`${styles.storyLikeBtn} ${likedRecipes.has(recipe.id) ? styles.liked : ''}`}
                    onClick={(e) => handleLike(recipe.id, e)}
                  >
                    {likedRecipes.has(recipe.id) ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>
              
              <div className={styles.storyContent}>
                <div className={styles.storyChef}>
                  <span className={styles.chefAvatar}>{recipe.chefAvatar}</span>
                  <span className={styles.chefName}>{recipe.chef}</span>
                </div>
                
                <h3 className={styles.storyTitle}>{recipe.title}</h3>
                
                <div className={styles.storyMeta}>
                  <span className={styles.metaItem}>
                    <span className={styles.metaIcon}>📂</span>
                    {recipe.category}
                  </span>
                  <span className={styles.metaDivider}>•</span>
                  <span className={styles.metaItem}>
                    <span className={styles.metaIcon}>⏱️</span>
                    {recipe.prepTime}
                  </span>
                </div>
                
                <div className={styles.storyStats}>
                  <span className={styles.statItem}>
                    ⭐ {recipe.rating}
                  </span>
                  <span className={styles.statItem}>
                    ❤️ {recipe.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Collections culinaires */}
      <div className={styles.collectionsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleContainer}>
            <span className={styles.sectionIcon}>📚</span>
            <h2 className={styles.sectionTitle}>Collections culinaires</h2>
          </div>
        </div>
        
        <div className={styles.collectionsGrid}>
          {/*
            { name: 'Italien', emoji: '🍝', count: 24, color: '#ef4444' },
            { name: 'Végétarien', emoji: '🥗', count: 18, color: '#22c55e' },
            { name: 'Desserts', emoji: '🍰', count: 32, color: '#f59e0b' },
            { name: 'Repas rapides', emoji: '⏱️', count: 15, color: '#3b82f6' }
          */}
          {['Italien', 'Végétarien', 'Desserts', 'Repas rapides'].map((collection, index) => (
            <div key={collection} className={styles.collectionCard}>
              <div className={styles.collectionHeader}>
                <span 
                  className={styles.collectionEmoji}
                  style={{ backgroundColor: collection.color }}
                >
                  {collection.emoji}
                </span>
                <span className={styles.collectionCount}>{collection.count}</span>
              </div>
              <h3 className={styles.collectionTitle}>{collection.name}</h3>
              <p className={styles.collectionSubtitle}>Découvrir →</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
