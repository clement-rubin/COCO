import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo, logDebug } from '../utils/logger'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import styles from '../styles/AddictiveFeed.module.css'
import { supabase } from '../utils/supabaseClient'

export default function AddictiveFeed() {
  const router = useRouter()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [userActions, setUserActions] = useState({
    likes: new Set(),
    saves: new Set()
  })
  
  const containerRef = useRef(null)

  // Chargement initial
  useEffect(() => {
    loadRecipes()
  }, [user])

  const loadRecipes = async () => {
    setLoading(true)
    try {
      if (user && user.id) {
        logInfo('Loading recipes for authenticated user', {
          userId: user.id,
          component: 'AddictiveFeed'
        })
        
        // Étape 1: Récupérer les amitiés mutuelles acceptées
        const { data: friendshipsData, error: friendsError } = await supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted')
        
        if (friendsError) {
          logError('Error getting friendships for mutual check:', friendsError)
        } else if (friendshipsData && friendshipsData.length > 0) {
          // Identifier les amis mutuels
          const friendshipCounts = {}
          
          friendshipsData.forEach(friendship => {
            const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id
            friendshipCounts[friendId] = (friendshipCounts[friendId] || 0) + 1
          })
          
          // Ne garder que les amis mutuels (qui apparaissent 2 fois)
          const mutualFriendIds = Object.keys(friendshipCounts)
            .filter(friendId => friendshipCounts[friendId] === 2)
          
          logInfo('Mutual friends found', {
            mutualFriendIds,
            count: mutualFriendIds.length,
            userId: user.id
          })
          
          if (mutualFriendIds.length > 0) {
            // Charger uniquement les recettes des amis mutuels
            const { data: mutualFriendsRecipesData, error: recipesError } = await supabase
              .from('recipes')
              .select('*')
              .in('user_id', mutualFriendIds)
              .order('created_at', { ascending: false })
              .limit(15)
            
            if (!recipesError && mutualFriendsRecipesData && mutualFriendsRecipesData.length > 0) {
              const formattedMutualRecipes = mutualFriendsRecipesData.map(recipe => formatRecipeData(recipe))
              setRecipes(formattedMutualRecipes)
              setPage(1)
              setError(null)
              return
            }
          }
        }
        
        // Si pas d'amis mutuels ou pas de recettes, afficher un message
        logInfo('No mutual friends or mutual friends recipes found', {
          userId: user.id,
          component: 'AddictiveFeed'
        })
        
        setRecipes([])
        setPage(1)
        
      } else {
        // Utilisateur non connecté - charger quelques recettes publiques comme aperçu
        logInfo('User not logged in, loading public recipes preview', {
          component: 'AddictiveFeed'
        })
        
        const publicApiUrl = `/api/recipes?_t=${timestamp}&limit=6`
        const response = await fetch(publicApiUrl)
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const recipesData = await response.json()
        const formattedRecipes = recipesData.map(recipe => {
          const formatted = formatRecipeData(recipe)
          formatted.isPreview = true
          return formatted
        })
        
        setRecipes(formattedRecipes)
        setPage(1)
      }
      
    } catch (err) {
      logError('Failed to load recipes', err, {
        component: 'AddictiveFeed',
        method: 'loadInitialRecipes',
        userId: user?.id
      })
      
      setError('Impossible de charger les recettes. Vérifiez votre connexion et réessayez.')
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const loadMoreRecipes = async () => {
    if (loadingMore || !hasMore || !user?.id) return
    
    setLoadingMore(true)
    try {
      // Récupérer les amitiés mutuelles pour la pagination
      const { data: friendshipsData, error: friendsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
      
      if (friendsError || !friendshipsData || friendshipsData.length === 0) {
        setHasMore(false)
        return
      }
      
      // Identifier les amis mutuels
      const friendshipCounts = {}
      friendshipsData.forEach(friendship => {
        const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id
        friendshipCounts[friendId] = (friendshipCounts[friendId] || 0) + 1
      })
      
      const mutualFriendIds = Object.keys(friendshipCounts)
        .filter(friendId => friendshipCounts[friendId] === 2)
      
      if (mutualFriendIds.length === 0) {
        setHasMore(false)
        return
      }
      
      const offset = page * 10
      
      // Charger plus de recettes des amis mutuels seulement
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select('*')
        .in('user_id', mutualFriendIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + 9)
      
      if (error) {
        throw error
      }
      
      if (recipesData.length === 0) {
        setHasMore(false)
        return
      }
      
      const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe))
      setRecipes(prev => [...prev, ...formattedRecipes])
      setPage(prev => prev + 1)
    } catch (err) {
      logError('Failed to load more mutual friends recipes', err, {
        component: 'AddictiveFeed',
        method: 'loadMoreRecipes',
        page,
        userId: user?.id
      })
    } finally {
      setLoadingMore(false)
    }
  }

  // Helper to format recipe data from API to feed format
  const formatRecipeData = (apiRecipe) => {
    let imageUrl = '/placeholder-recipe.jpg'
    
    if (apiRecipe.image) {
      try {
        const { processImageData } = require('../utils/imageUtils')
        const processedUrl = processImageData(apiRecipe.image, '/placeholder-recipe.jpg')
        
        // Validate the processed URL
        if (processedUrl && processedUrl !== '/placeholder-recipe.jpg' && 
            (processedUrl.startsWith('data:image/') || processedUrl.startsWith('http'))) {
          imageUrl = processedUrl
        }
        
        logDebug('AddictiveFeed: Image processed', {
          recipeId: apiRecipe.id,
          originalImageType: typeof apiRecipe.image,
          isArray: Array.isArray(apiRecipe.image),
          arrayLength: Array.isArray(apiRecipe.image) ? apiRecipe.image.length : null,
          processedUrl: imageUrl?.substring(0, 50) + '...',
          isDataUrl: imageUrl?.startsWith('data:'),
          isFallback: imageUrl === '/placeholder-recipe.jpg'
        })
      } catch (err) {
        logError('Error processing image in AddictiveFeed', err, { 
          recipeId: apiRecipe.id,
          imageDataType: typeof apiRecipe.image,
          isArray: Array.isArray(apiRecipe.image),
          hasImageData: !!apiRecipe.image
        })
        imageUrl = '/placeholder-recipe.jpg'
      }
    }

    // Utiliser le nom d'auteur de la recette (qui vient maintenant du profil)
    const authorName = apiRecipe.author || 'Chef Anonyme'
    const authorEmoji = getAuthorEmoji(apiRecipe.category)
    
    const ingredientsCount = Array.isArray(apiRecipe.ingredients) ? apiRecipe.ingredients.length : 0
    const instructionsCount = Array.isArray(apiRecipe.instructions) ? apiRecipe.instructions.length : 0
    const complexity = ingredientsCount + instructionsCount
    
    const likesBase = 50 + Math.floor(complexity * 10)
    const commentsBase = 5 + Math.floor(complexity * 2)
    
    const created = apiRecipe.created_at ? new Date(apiRecipe.created_at) : new Date()
    const timeAgo = getTimeAgo(created)
    
    return {
      id: apiRecipe.id,
      user: {
        id: apiRecipe.user_id || `author_${authorName.replace(/\s+/g, '_').toLowerCase()}`,
        name: authorName, // Utilise directement le nom d'auteur de la recette
        avatar: authorEmoji,
        verified: complexity > 15
      },
      recipe: {
        id: apiRecipe.id,
        title: apiRecipe.title,
        description: apiRecipe.description || "Une délicieuse recette à découvrir !",
        image: imageUrl,
        category: apiRecipe.category || 'Autre',
        difficulty: apiRecipe.difficulty || 'Moyen',
        prepTime: apiRecipe.prepTime || '15 min',
        cookTime: apiRecipe.cookTime || '20 min',
        portions: apiRecipe.servings || 4,
        likes: likesBase,
        comments: commentsBase
      },
      timeAgo,
      ingredients: apiRecipe.ingredients,
      instructions: apiRecipe.instructions
    }
  }
  
  // Helper functions for formatting recipe data
  const getAuthorEmoji = (category) => {
    const emojiMap = {
      'Dessert': '🍰',
      'Entrée': '🥗',
      'Plat principal': '🍽️',
      'Italien': '🍝',
      'Asiatique': '🍜',
      'Végétarien': '🥬',
      'Healthy': '🌱',
      'BBQ': '🔥',
      'Photo partagée': '📸',
      'Autre': '👨‍🍳'
    }
    return emojiMap[category] || '👨‍🍳'
  }
  
  const generateTags = (category, title) => {
    const tags = []
    if (category) {
      tags.push(`#${category.toLowerCase().replace(/\s+/g, '')}`)
    }
    
    // Extract potential keywords from title
    const keywords = title.toLowerCase().split(/\s+/)
    const commonTags = ['fait-maison', 'cuisine', 'recette', 'délice']
    
    // Add a common tag
    tags.push(`#${commonTags[Math.floor(Math.random() * commonTags.length)]}`)
    
    // Add a tag from the title if it's long enough
    keywords.forEach(word => {
      if (word.length > 4 && !tags.includes(`#${word}`)) {
        tags.push(`#${word}`)
      }
    })
    
    return tags.slice(0, 4) // Limit to 4 tags
  }
  
  const getTimeAgo = (date) => {
    const now = new Date()
    const diffMs = now - date
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffDay > 0) return `${diffDay}j`
    if (diffHour > 0) return `${diffHour}h`
    if (diffMin > 0) return `${diffMin}min`
    return 'à l\'instant'
  }

  // Actions utilisateur
  const toggleLike = useCallback(async (recipeId) => {
    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    const recipe = recipes.find(r => r.id === recipeId)
    const isLiking = !userActions.likes.has(recipeId)
    
    setUserActions(prev => {
      const newLikes = new Set(prev.likes)
      
      if (isLiking) {
        newLikes.add(recipeId)
        
        // Déclencher une notification pour le propriétaire de la recette
        if (recipe && recipe.user && recipe.user.id !== user.id) {
          showRecipeLikeInteractionNotification(
            {
              id: recipe.recipe.id,
              title: recipe.recipe.title,
              image: recipe.recipe.image
            },
            {
              user_id: user.id,
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
            }
          )
        }
        
        // Animation de like simple
        const heart = document.createElement('div')
        heart.innerHTML = '❤️'
        heart.style.cssText = `
          position: fixed;
          font-size: 2rem;
          z-index: 10000;
          pointer-events: none;
          animation: heartFloat 1.2s ease-out forwards;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        `
        document.body.appendChild(heart)
        setTimeout(() => heart.remove(), 1200)
        
        if (navigator.vibrate) {
          navigator.vibrate(30)
        }
      } else {
        newLikes.delete(recipeId)
      }
      
      try {
        localStorage.setItem('userLikedRecipes', JSON.stringify([...newLikes]))
      } catch (err) {
        console.error('Failed to save likes to localStorage', err)
      }
      
      return { ...prev, likes: newLikes }
    })
    
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === recipeId) {
        return {
          ...recipe,
          recipe: {
            ...recipe.recipe,
            likes: recipe.recipe.likes + (isLiking ? 1 : -1)
          }
        }
      }
      return recipe
    }))
    
    logUserInteraction('TOGGLE_LIKE', 'addictive-feed', {
      recipeId,
      action: isLiking ? 'like' : 'unlike',
      userId: user?.id
    })
  }, [user, router, userActions.likes, recipes])

  const openRecipe = useCallback((recipeId) => {
    router.push(`/recipe/${recipeId}`)
    
    logUserInteraction('OPEN_RECIPE', 'addictive-feed', {
      recipeId,
      userId: user?.id
    })
  }, [router, user])

  // Load more when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop 
          >= document.documentElement.offsetHeight - 1000) {
        loadMoreRecipes()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [page, hasMore, loadingMore])

  // Load saved likes from localStorage
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('userLikedRecipes')
      if (savedLikes) {
        setUserActions(prev => ({
          ...prev,
          likes: new Set(JSON.parse(savedLikes))
        }))
      }
    } catch (err) {
      console.error('Failed to load saved user actions', err)
    }
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.cookingLoader}>
          <div className={styles.chef}>👨‍🍳</div>
          <div className={styles.sparkles}>✨✨✨</div>
        </div>
        <p>Préparation du festin culinaire...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Oups! Un petit souci en cuisine</h3>
        <p>{error}</p>
        <button onClick={() => loadInitialRecipes()} className={styles.retryButton}>
          Réessayer
        </button>
      </div>
    )
  }
  
  if (recipes.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>👥</div>
        <h3>
          {user ? 'Connectez-vous avec vos amis culinaires !' : 'Rejoignez COCO !'}
        </h3>
        <p>
          {user 
            ? 'Vos amis n\'ont pas encore partagé de recettes. Invitez-les à rejoindre COCO pour découvrir leurs créations culinaires !'
            : 'Connectez-vous pour découvrir les délicieuses recettes de vos amis sur COCO.'
          }
        </p>
        <div className={styles.emptyActions}>
          {user ? (
            <>
              <button 
                onClick={() => router.push('/amis')} 
                className={styles.primaryButton}
              >
                👥 Gérer mes amis
              </button>
              <button 
                onClick={() => router.push('/explorer')} 
                className={styles.secondaryButton}
              >
                🔍 Explorer toutes les recettes
              </button>
              <button 
                onClick={() => router.push('/share-photo')} 
                className={styles.tertiaryButton}
              >
                📸 Partager une recette
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => router.push('/login')} 
                className={styles.primaryButton}
              >
                🔐 Se connecter
              </button>
              <button 
                onClick={() => router.push('/explorer')} 
                className={styles.secondaryButton}
              >
                🔍 Découvrir les recettes
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer} ref={containerRef}>
      {/* Bannière d'information pour clarifier que c'est le feed des amis */}
      <div className={styles.feedInfo}>
        <div className={styles.feedInfoIcon}>👥</div>
        <div className={styles.feedInfoText}>
          <strong>Feed de vos amis</strong>
          <p>Découvrez les dernières recettes partagées par vos amis culinaires</p>
        </div>
        <button 
          onClick={() => router.push('/explorer')} 
          className={styles.exploreAllBtn}
        >
          🔍 Explorer tout
        </button>
      </div>

      <div className={styles.recipesGrid}>
        {recipes.map((post) => (
          <div key={post.id} className={styles.recipeCard}>
            {/* Ajout d'un badge "Ami" pour clarifier */}
            <div className={styles.friendBadge}>
              <span className={styles.friendIcon}>🤝</span>
              <span className={styles.friendLabel}>Ami</span>
            </div>
            
            {/* Image */}
            <div className={styles.recipeImageContainer} onClick={() => openRecipe(post.recipe.id)}>
              <Image
                src={post.recipe.image}
                alt={post.recipe.title}
                fill
                className={styles.recipeImage}
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized={post.recipe.image.startsWith('data:')}
                onLoad={() => {
                  logDebug('AddictiveFeed: Image loaded successfully', {
                    recipeId: post.recipe.id,
                    imageUrl: post.recipe.image?.substring(0, 50) + '...'
                  })
                }}
                onError={(e) => {
                  logError('AddictiveFeed: Image load error', new Error('Image failed to load'), {
                    recipeId: post.recipe.id,
                    imageUrl: post.recipe.image?.substring(0, 50) + '...',
                    errorSrc: e.target?.src?.substring(0, 50) + '...'
                  })
                  e.target.src = '/placeholder-recipe.jpg'
                }}
              />
              <div className={styles.imageOverlay}>
                <div className={styles.categoryBadge}>
                  {post.recipe.category}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className={styles.recipeContent}>
              {/* User info */}
              <div className={styles.userInfo}>
                <span className={styles.userAvatar}>{post.user.avatar}</span>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>
                    {post.user.name}
                    {post.user.verified && <span className={styles.verified}>✅</span>}
                    <span className={styles.friendIndicator} title="Votre ami">👥</span>
                  </span>
                  <span className={styles.timeAgo}>{post.timeAgo}</span>
                </div>
              </div>

              {/* Recipe info */}
              <h3 className={styles.recipeTitle} onClick={() => openRecipe(post.recipe.id)}>
                {post.recipe.title}
              </h3>
              
              <p className={styles.recipeDescription}>
                {post.recipe.description}
              </p>

              {/* Recipe meta */}
              <div className={styles.recipeMeta}>
                <span className={styles.metaItem}>⏱️ {post.recipe.prepTime}</span>
                <span className={styles.metaItem}>🔥 {post.recipe.difficulty}</span>
                <span className={styles.metaItem}>👥 {post.recipe.portions}</span>
              </div>

              {/* Actions */}
              <div className={styles.recipeActions}>
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`${styles.actionBtn} ${userActions.likes.has(post.id) ? styles.liked : ''}`}
                >
                  {userActions.likes.has(post.id) ? '❤️' : '🤍'} {post.recipe.likes}
                </button>
                
                <button 
                  className={styles.actionBtn}
                  onClick={() => openRecipe(post.recipe.id)}
                >
                  💬 {post.recipe.comments}
                </button>
                
                <button
                  onClick={() => openRecipe(post.recipe.id)}
                  className={styles.viewRecipeBtn}
                >
                  Voir la recette →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Loading more indicator */}
      {loadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner}></div>
          <p>Chargement de nouvelles recettes de vos amis...</p>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && recipes.length > 0 && (
        <div className={styles.endMessage}>
          <p>Vous avez vu toutes les recettes de vos amis ! 🎉</p>
          <div className={styles.endActions}>
            <button onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }} className={styles.scrollTopBtn}>
              Retour en haut ↑
            </button>
            <button onClick={() => router.push('/amis')} className={styles.addMoreFriendsBtn}>
              👥 Ajouter plus d'amis
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -70%) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
