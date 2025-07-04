import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError } from '../utils/logger'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import { getRecipeIllustration } from '../utils/recipeIllustrations'
import styles from '../styles/FriendsFeed.module.css'
import RecipeCard from './RecipeCard'

export default function FriendsFeed({ feedType = 'featured' }) {
  const router = useRouter()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedRecipes, setLikedRecipes] = useState(new Set())
  const [error, setError] = useState(null)
  const [collections, setCollections] = useState([
    { name: 'Italien', emoji: '🍝', count: 0, color: '#ef4444' },
    { name: 'Végétarien', emoji: '🥗', count: 0, color: '#22c55e' },
    { name: 'Desserts', emoji: '🍰', count: 0, color: '#f59e0b' },
    { name: 'Repas rapides', emoji: '⏱️', count: 0, color: '#3b82f6' }
  ])

  // Load saved likes from localStorage
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('userLikedRecipes')
      if (savedLikes) {
        setLikedRecipes(new Set(JSON.parse(savedLikes)))
      }
    } catch (err) {
      console.error('Error loading saved likes', err)
    }
  }, [])

  useEffect(() => {
    loadRecipes(feedType)
  }, [feedType])

  const loadRecipes = async (type) => {
    setLoading(true)
    try {
      // Paramètres de requête différents selon le feedType
      let apiUrl = '/api/recipes?limit=10'
      
      if (type === 'trending') {
        // Dans une vraie app, vous utiliseriez un tri par popularité
        apiUrl += '&sort=popular'
      } else if (type === 'recent') {
        apiUrl += '&sort=created_at'
      } else if (type === 'featured') {
        // Par défaut, les recettes en vedette (une requête personnalisée)
        apiUrl += '&featured=true'
      }
      
      // Ajouter un timestamp pour éviter la mise en cache
      apiUrl += `&_t=${Date.now()}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Impossible de charger les recettes')
      }
      
      const data = await response.json()
      
      // Transformer les données pour le format attendu par le composant
      const formattedRecipes = formatRecipesForDisplay(data, type)
      setRecipes(formattedRecipes)
      
      // Update collection counts
      updateCollectionCounts(data)
    } catch (err) {
      setError('Erreur lors du chargement des recettes')
      logError('Failed to load recipes in FriendsFeed', err, { feedType: type })
    } finally {
      setLoading(false)
    }
  }
  
  const formatRecipesForDisplay = (apiRecipes, type) => {
    return apiRecipes.map(recipe => {
      // Process image data with illustration fallback
      let imageUrl = getRecipeIllustration(recipe)
      
      if (recipe.image) {
        try {
          const { processImageData } = require('../utils/imageUtils')
          const processedUrl = processImageData(recipe.image, null)
          
          // Si l'URL traitée est valide, l'utiliser, sinon garder l'illustration
          if (processedUrl && 
              (processedUrl.startsWith('data:image/') || processedUrl.startsWith('http'))) {
            imageUrl = processedUrl
          }
          
          logDebug('FriendsFeed: Image processed', {
            recipeId: recipe.id,
            hasOriginalImage: !!recipe.image,
            usesIllustration: imageUrl.includes('svg'),
            processedUrl: imageUrl?.substring(0, 50) + '...'
          })
        } catch (err) {
          logError('FriendsFeed: Error processing image, using illustration', err, {
            recipeId: recipe.id,
            imageType: typeof recipe.image
          })
          // L'illustration est déjà définie comme fallback
        }
      }
      
      // Calculate metrics based on recipe complexity
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0
      const instructions = Array.isArray(recipe.instructions) ? recipe.instructions.length : 0
      const complexity = ingredients + instructions
      
      const rating = 4 + (Math.random() * 1)
      const likes = 50 + Math.floor(complexity * 10)
      
      // Get emoji for chef based on category
      const chefEmoji = getCategoryEmoji(recipe.category)
      
      return {
        id: recipe.id,
        name: recipe.title,
        category: recipe.category || 'Autre',
        time: recipe.prepTime || recipe.cookTime || '15 min',
        rating: parseFloat(rating.toFixed(1)),
        emoji: chefEmoji,
        difficulty: recipe.difficulty || 'Moyen',
        chef: recipe.author || 'Chef Anonyme',
        likes,
        image: imageUrl, // Utilise l'illustration ou l'image traitée
        isNew: type === 'recent',
        isTrending: type === 'trending',
        isHealthy: recipe.category === 'Healthy' || recipe.category === 'Végétarien'
      }
    })
  }
  
  const getCategoryEmoji = (category) => {
    const emojiMap = {
      'Dessert': '🍰',
      'Italien': '🍝',
      'Asiatique': '🍜',
      'Végétarien': '🥗',
      'Entrée': '🥗',
      'Plat principal': '🍽️',
      'Healthy': '🥬',
      'BBQ': '🔥'
    }
    
    return emojiMap[category] || '🍴'
  }
  
  const updateCollectionCounts = (recipes) => {
    // Count recipes by category
    const categoryCounts = recipes.reduce((acc, recipe) => {
      const category = recipe.category || 'Autre'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
    
    // Update collections with counts
    setCollections(prev => prev.map(collection => ({
      ...collection,
      count: categoryCounts[collection.name] || 0
    })))
  }

  const handleRecipeClick = (recipeId) => {
    router.push(`/recipe/${recipeId}`)
    
    logUserInteraction('OPEN_RECIPE', 'friends-feed', {
      recipeId,
      feedType
    })
  }

  const handleLike = (recipeId, e) => {
    e.stopPropagation()
    
    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    const recipe = recipes.find(r => r.id === recipeId)
    const isLiking = !likedRecipes.has(recipeId)
    
    setLikedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
        
        // Déclencher une notification pour le chef de la recette
        if (recipe && recipe.chef !== user.user_metadata?.display_name) {
          showRecipeLikeInteractionNotification(
            {
              id: recipe.id,
              title: recipe.name,
              image: recipe.image
            },
            {
              user_id: user.id,
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
            }
          )
        }
      }
      
      // Save to localStorage safely
      try {
        localStorage.setItem('userLikedRecipes', JSON.stringify([...newSet]))
      } catch (err) {
        console.error('Error saving likes to localStorage', err)
        // Continue without localStorage if it fails
      }
      
      return newSet
    })
    
    logUserInteraction('TOGGLE_LIKE', 'friends-feed', {
      recipeId,
      action: likedRecipes.has(recipeId) ? 'unlike' : 'like',
      feedType
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
  
  const handleSeeAllClick = () => {
    router.push('/collections')
  }
  
  const handleCollectionClick = (collection) => {
    router.push(`/collections?category=${encodeURIComponent(collection.name)}`)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Préparation des délices...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <p>{error}</p>
        <button 
          onClick={() => loadRecipes(feedType)} 
          className={styles.retryBtn}
        >
          Réessayer
        </button>
      </div>
    )
  }
  
  if (recipes.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>🍽️</div>
        <p>Aucune recette disponible pour le moment.</p>
        <button 
          onClick={() => loadRecipes(feedType)} 
          className={styles.retryBtn}
        >
          Actualiser
        </button>
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
        <button 
          className={styles.seeAllBtn}
          onClick={handleSeeAllClick}
        >
          Voir tout →
        </button>
      </div>
      
      {/* Stories horizontales - utilisation du nouveau RecipeCard */}
      <div className={styles.storiesContainer}>
        <div className={styles.storiesRow}>
          {recipes.map((recipe, index) => (
            <div key={recipe.id} className={styles.storyCardWrapper}>
              <RecipeCard 
                recipe={{
                  id: recipe.id,
                  title: recipe.name,
                  description: `Une délicieuse recette ${recipe.category.toLowerCase()}`,
                  image: recipe.image,
                  category: recipe.category,
                  author: recipe.chef,
                  difficulty: recipe.difficulty,
                  prepTime: recipe.time,
                  created_at: new Date().toISOString(),
                  form_mode: 'complete'
                }}
                defaultCompact={true} // Mode compact pour les stories
                showActions={false} // Pas d'actions dans les stories
              />
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
          {collections.map((collection) => (
            <div 
              key={collection.name} 
              className={styles.collectionCard}
              onClick={() => handleCollectionClick(collection)}
            >
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
