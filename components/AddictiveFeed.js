import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import styles from '../styles/AddictiveFeed.module.css'

export default function AddictiveFeed() {
  const router = useRouter()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [userActions, setUserActions] = useState({
    likes: new Set(),
    saves: new Set(),
    follows: new Set()
  })
  const [currentMediaIndex, setCurrentMediaIndex] = useState({})
  
  const containerRef = useRef(null)
  const videoRefs = useRef({})
  const intersectionObserver = useRef(null)
  const mediaIntervalRefs = useRef({})

  // Chargement initial
  useEffect(() => {
    loadInitialRecipes()
  }, [])

  const loadInitialRecipes = async () => {
    setLoading(true)
    try {
      // Add a timestamp to prevent caching
      const timestamp = Date.now()
      const response = await fetch(`/api/recipes?_t=${timestamp}&limit=10`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const recipesData = await response.json()
      
      logInfo('Recipes loaded successfully', {
        count: recipesData.length,
        source: 'AddictiveFeed'
      })
      
      // Map API data to our component's expected format
      const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe))
      setRecipes(formattedRecipes)
      setPage(1)
    } catch (err) {
      logError('Failed to load recipes', err, {
        component: 'AddictiveFeed',
        method: 'loadInitialRecipes'
      })
      setError('Impossible de charger les recettes. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreRecipes = async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    try {
      // Add offset based on current page
      const offset = page * 10
      const timestamp = Date.now()
      const response = await fetch(`/api/recipes?_t=${timestamp}&limit=10&offset=${offset}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const recipesData = await response.json()
      
      if (recipesData.length === 0) {
        setHasMore(false)
        return
      }
      
      // Map API data to our component's expected format
      const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe))
      setRecipes(prev => [...prev, ...formattedRecipes])
      setPage(prev => prev + 1)
    } catch (err) {
      logError('Failed to load more recipes', err, {
        component: 'AddictiveFeed',
        method: 'loadMoreRecipes',
        page
      })
      // Don't set error state here to keep existing recipes visible
    } finally {
      setLoadingMore(false)
    }
  }

  // Helper to format recipe data from API to feed format
  const formatRecipeData = (apiRecipe) => {
    // Extract or generate media URLs from recipe image
    const mediaItems = []
    
    if (apiRecipe.image) {
      try {
        // Try to process the image data - could be base64, URL or array
        const { processImageData } = require('../utils/imageUtils')
        const processedUrl = processImageData(apiRecipe.image, '/placeholder-recipe.jpg')
        mediaItems.push({
          type: 'image',
          url: processedUrl,
          duration: 5
        })
      } catch (err) {
        logError('Error processing image', err, { recipeId: apiRecipe.id })
        mediaItems.push({
          type: 'image',
          url: '/placeholder-recipe.jpg',
          duration: 5
        })
      }
    } else {
      // Use a placeholder for recipes without images
      mediaItems.push({
        type: 'image',
        url: '/placeholder-recipe.jpg',
        duration: 5
      })
    }

    // Extract author info
    const authorName = apiRecipe.author || 'Chef Anonyme'
    const authorEmoji = getAuthorEmoji(apiRecipe.category)
    
    // Calculate approximate statistics based on recipe complexity
    const ingredientsCount = Array.isArray(apiRecipe.ingredients) ? apiRecipe.ingredients.length : 0
    const instructionsCount = Array.isArray(apiRecipe.instructions) ? apiRecipe.instructions.length : 0
    const complexity = ingredientsCount + instructionsCount
    
    const likesBase = 50 + Math.floor(complexity * 10)
    const commentsBase = 5 + Math.floor(complexity * 2)
    const savesBase = 10 + Math.floor(complexity * 5)
    
    // Format created date
    const created = apiRecipe.created_at ? new Date(apiRecipe.created_at) : new Date()
    const timeAgo = getTimeAgo(created)
    
    return {
      id: apiRecipe.id,
      type: 'recipe',
      user: {
        id: apiRecipe.user_id || `author_${authorName.replace(/\s+/g, '_').toLowerCase()}`,
        name: authorName,
        avatar: authorEmoji,
        verified: complexity > 15, // Just a way to mark more complex recipes as "verified"
        followers: Math.floor(100 + complexity * 20),
        isFollowing: false
      },
      recipe: {
        id: apiRecipe.id,
        title: apiRecipe.title,
        description: apiRecipe.description || "Une délicieuse recette à découvrir !",
        media: mediaItems,
        tags: generateTags(apiRecipe.category, apiRecipe.title),
        difficulty: apiRecipe.difficulty || 'Moyen',
        prepTime: apiRecipe.prepTime || '15 min',
        cookTime: apiRecipe.cookTime || '20 min',
        portions: apiRecipe.servings || 4,
        likes: likesBase,
        comments: commentsBase,
        saves: savesBase,
        shares: Math.floor(savesBase / 2),
        category: apiRecipe.category || 'Autre'
      },
      timeAgo,
      location: apiRecipe.location || 'France',
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

  // Rotation automatique des médias pour chaque post
  const startMediaRotation = useCallback((postId, mediaCount) => {
    if (mediaCount <= 1) return
    
    const interval = setInterval(() => {
      setCurrentMediaIndex(prev => ({
        ...prev,
        [postId]: ((prev[postId] || 0) + 1) % mediaCount
      }))
    }, 5000) // Change d'image toutes les 5 secondes
    
    mediaIntervalRefs.current[postId] = interval
  }, [])

  const stopMediaRotation = useCallback((postId) => {
    if (mediaIntervalRefs.current[postId]) {
      clearInterval(mediaIntervalRefs.current[postId])
      delete mediaIntervalRefs.current[postId]
    }
  }, [])

  // Observer d'intersection amélioré
  useEffect(() => {
    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index)
          const recipe = recipes[index]
          
          if (entry.isIntersecting) {
            setCurrentIndex(index)
            
            // Démarrer la rotation des médias
            if (recipe?.recipe?.media?.length > 1) {
              startMediaRotation(recipe.id, recipe.recipe.media.length)
            }
            
            // Autoplay vidéo si c'est le média actuel
            const currentMedia = currentMediaIndex[recipe?.id] || 0
            if (recipe?.recipe?.media?.[currentMedia]?.type === 'video') {
              const video = videoRefs.current[`${recipe.id}_${currentMedia}`]
              if (video) {
                video.play().catch(() => {})
              }
            }
            
            // Précharger le post suivant
            if (index >= recipes.length - 3 && hasMore && !loadingMore) {
              loadMoreRecipes()
            }
            
            logUserInteraction('VIEW_RECIPE', 'addictive-feed', {
              recipeId: recipe?.id,
              recipeTitle: recipe?.recipe?.title,
              index
            })
          } else {
            // Arrêter la rotation des médias
            if (recipe) {
              stopMediaRotation(recipe.id)
            }
            
            // Pause toutes les vidéos du post
            recipe?.recipe?.media?.forEach((_, mediaIndex) => {
              const video = videoRefs.current[`${recipe.id}_${mediaIndex}`]
              if (video) {
                video.pause()
              }
            })
          }
        })
      },
      { 
        threshold: 0.7,
        rootMargin: '50px 0px' // Précharger un peu avant
      }
    )

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
      // Nettoyer tous les intervalles
      Object.values(mediaIntervalRefs.current).forEach(clearInterval)
    }
  }, [recipes, currentMediaIndex, hasMore, loadingMore])

  // Save likes to local storage
  useEffect(() => {
    // Load saved likes from localStorage on mount
    try {
      const savedLikes = localStorage.getItem('userLikedRecipes')
      const savedSaves = localStorage.getItem('userSavedRecipes')
      
      if (savedLikes) {
        setUserActions(prev => ({
          ...prev,
          likes: new Set(JSON.parse(savedLikes))
        }))
      }
      
      if (savedSaves) {
        setUserActions(prev => ({
          ...prev,
          saves: new Set(JSON.parse(savedSaves))
        }))
      }
    } catch (err) {
      console.error('Failed to load saved user actions', err)
    }
  }, [])

  // Actions utilisateur simplifiées
  const toggleLike = useCallback(async (recipeId) => {
    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    setUserActions(prev => {
      const newLikes = new Set(prev.likes)
      const isLiking = !newLikes.has(recipeId)
      
      if (isLiking) {
        newLikes.add(recipeId)
        
        // Animation de like simple
        const heart = document.createElement('div')
        heart.innerHTML = '❤️'
        heart.style.cssText = `
          position: fixed;
          font-size: 2rem;
          z-index: 10000;
          pointer-events: none;
          animation: heartFloat 1.2s ease-out forwards;
          left: ${window.innerWidth * 0.8 + Math.random() * 60 - 30}px;
          top: ${window.innerHeight * 0.4 + Math.random() * 200}px;
        `
        document.body.appendChild(heart)
        setTimeout(() => heart.remove(), 1200)
        
        if (navigator.vibrate) {
          navigator.vibrate(30)
        }
      } else {
        newLikes.delete(recipeId)
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('userLikedRecipes', JSON.stringify([...newLikes]))
      } catch (err) {
        console.error('Failed to save likes to localStorage', err)
      }
      
      return { ...prev, likes: newLikes }
    })
    
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === recipeId) {
        const isLiked = !userActions.likes.has(recipeId)
        return {
          ...recipe,
          recipe: {
            ...recipe.recipe,
            likes: recipe.recipe.likes + (isLiked ? 1 : -1)
          }
        }
      }
      return recipe
    }))
    
    // Log the interaction
    logUserInteraction('TOGGLE_LIKE', 'addictive-feed', {
      recipeId,
      action: userActions.likes.has(recipeId) ? 'unlike' : 'like',
      userId: user?.id
    })
    
    // Update like in the API if implemented
    // This would require an actual API endpoint to like recipes
    // await fetch(`/api/recipes/${recipeId}/like`, { method: 'POST' })
  }, [user, router, userActions.likes])

  const toggleSave = useCallback(async (recipeId) => {
    if (!user) {
      // Prompt to login
      const wantsToLogin = window.confirm('Connectez-vous pour sauvegarder cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    setUserActions(prev => {
      const newSaves = new Set(prev.saves)
      const wasSaved = newSaves.has(recipeId)
      
      if (wasSaved) {
        newSaves.delete(recipeId)
      } else {
        newSaves.add(recipeId)
        
        const toast = document.createElement('div')
        toast.innerHTML = '⭐ Recette sauvegardée !'
        toast.style.cssText = `
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #FF6B35, #F7931E);
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          z-index: 10000;
          animation: bounceIn 0.6s ease;
          box-shadow: 0 6px 25px rgba(255, 107, 53, 0.4);
          font-weight: 600;
        `
        document.body.appendChild(toast)
        setTimeout(() => {
          toast.style.animation = 'bounceOut 0.4s ease forwards'
          setTimeout(() => toast.remove(), 400)
        }, 2000)
      }
      
      // Save to localStorage
      try {
        localStorage.setItem('userSavedRecipes', JSON.stringify([...newSaves]))
      } catch (err) {
        console.error('Failed to save recipes to localStorage', err)
      }
      
      return { ...prev, saves: newSaves }
    })
    
    // Log the interaction
    logUserInteraction('TOGGLE_SAVE', 'addictive-feed', {
      recipeId,
      action: userActions.saves.has(recipeId) ? 'unsave' : 'save',
      userId: user?.id
    })
    
    // Update in the API if implemented
    // This would require an actual API endpoint to save recipes
    // await fetch(`/api/recipes/${recipeId}/save`, { method: 'POST' })
  }, [user, router, userActions.saves])

  const toggleFollow = useCallback((userId) => {
    if (!user) {
      // Prompt to login
      const wantsToLogin = window.confirm('Connectez-vous pour suivre ce chef. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    setUserActions(prev => {
      const newFollows = new Set(prev.follows)
      if (newFollows.has(userId)) {
        newFollows.delete(userId)
      } else {
        newFollows.add(userId)
      }
      return { ...prev, follows: newFollows }
    })
    
    setRecipes(prev => prev.map(recipe => {
      if (recipe.user.id === userId) {
        return {
          ...recipe,
          user: {
            ...recipe.user,
            isFollowing: !recipe.user.isFollowing
          }
        }
      }
      return recipe
    }))
    
    // Log the interaction
    logUserInteraction('TOGGLE_FOLLOW', 'addictive-feed', {
      targetUserId: userId,
      action: userActions.follows.has(userId) ? 'unfollow' : 'follow',
      userId: user?.id
    })
  }, [user, router, userActions.follows])

  const openRecipe = useCallback((recipeId) => {
    router.push(`/recipe/${recipeId}`)
    
    logUserInteraction('OPEN_RECIPE', 'addictive-feed', {
      recipeId,
      userId: user?.id
    })
  }, [router, user])

  const retryLoading = () => {
    setError(null)
    loadInitialRecipes()
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.cookingLoader}>
          <div className={styles.chef}>👨‍🍳</div>
          <div className={styles.sparkles}>✨✨✨</div>
        </div>
        <p>Préparation du festin culinaire...</p>
        <div className={styles.loadingTips}>
          <span>🔥 Recettes authentiques</span>
          <span>📱 Inspirations culinaires</span>
          <span>🌟 Découvertes gourmandes</span>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Oups! Un petit souci en cuisine</h3>
        <p>{error}</p>
        <button onClick={retryLoading} className={styles.retryButton}>
          Réessayer
        </button>
      </div>
    )
  }
  
  if (recipes.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>🍽️</div>
        <h3>Aucune recette disponible</h3>
        <p>Nous n'avons pas trouvé de recettes pour le moment.</p>
        <button onClick={retryLoading} className={styles.retryButton}>
          Rafraîchir
        </button>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer} ref={containerRef}>
      {recipes.map((post, index) => {
        const currentMedia = currentMediaIndex[post.id] || 0
        const media = post.recipe?.media?.[currentMedia]
        
        return (
          <div
            key={post.id}
            className={styles.postContainer}
            data-index={index}
            ref={(el) => {
              if (el && intersectionObserver.current) {
                intersectionObserver.current.observe(el)
              }
            }}
          >
            {/* Media Container avec rotation */}
            <div className={styles.mediaContainer} onClick={() => openRecipe(post.recipe.id)}>
              {post.recipe?.media?.map((mediaItem, mediaIndex) => (
                <div
                  key={mediaIndex}
                  className={`${styles.mediaItem} ${mediaIndex === currentMedia ? styles.active : ''}`}
                >
                  {mediaItem.type === 'video' ? (
                    <video
                      ref={(el) => { videoRefs.current[`${post.id}_${mediaIndex}`] = el }}
                      className={styles.media}
                      src={mediaItem.url}
                      loop
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={mediaItem.url}
                      alt={post.recipe?.title}
                      fill
                      className={styles.media}
                      priority={index < 3 && mediaIndex === 0}
                      sizes="(max-width: 768px) 100vw, 430px"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        e.target.src = '/placeholder-recipe.jpg'
                      }}
                    />
                  )}
                </div>
              ))}
              
              <div className={styles.gradientOverlay} />
              
              {/* Indicateurs de média */}
              {post.recipe?.media?.length > 1 && (
                <div className={styles.mediaIndicators}>
                  {post.recipe.media.map((_, idx) => (
                    <div
                      key={idx}
                      className={`${styles.indicator} ${idx === currentMedia ? styles.active : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* User info */}
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {post.user.avatar}
                {post.user.verified && <span className={styles.verified}>✅</span>}
              </div>
              <div className={styles.userDetails} onClick={() => openRecipe(post.recipe.id)}>
                <h3>{post.user.name}</h3>
                <p>{post.user.followers.toLocaleString()} followers</p>
              </div>
              <button
                onClick={() => toggleFollow(post.user.id)}
                className={`${styles.followBtn} ${userActions.follows.has(post.user.id) || post.user.isFollowing ? styles.following : ''}`}
              >
                {userActions.follows.has(post.user.id) || post.user.isFollowing ? 'Suivi ✓' : '+ Suivre'}
              </button>
            </div>

            {/* Content */}
            <div className={styles.content} onClick={() => openRecipe(post.recipe.id)}>
              <div className={styles.recipeContent}>
                <h2>{post.recipe.title}</h2>
                <p>{post.recipe.description}</p>
                <div className={styles.recipeBadges}>
                  <span>⏱️ {post.recipe.prepTime}</span>
                  <span>🔥 {post.recipe.difficulty}</span>
                  <span>👥 {post.recipe.portions}</span>
                  <span>📂 {post.recipe.category}</span>
                </div>
                
                {/* Show number of ingredients */}
                {Array.isArray(post.ingredients) && post.ingredients.length > 0 && (
                  <div className={styles.ingredientsPreview}>
                    <span className={styles.previewLabel}>🧾 {post.ingredients.length} ingrédients</span>
                  </div>
                )}
                
                <div className={styles.tags}>
                  {post.recipe.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions sidebar */}
            <div className={styles.actionsSidebar}>
              <button
                onClick={() => toggleLike(post.id)}
                className={`${styles.actionBtn} ${userActions.likes.has(post.id) ? styles.liked : ''}`}
              >
                <span className={styles.actionIcon}>
                  {userActions.likes.has(post.id) ? '❤️' : '🤍'}
                </span>
                <span className={styles.actionCount}>
                  {post.recipe?.likes?.toLocaleString() || '0'}
                </span>
              </button>

              <button 
                className={styles.actionBtn}
                onClick={() => openRecipe(post.recipe.id)}
              >
                <span className={styles.actionIcon}>💬</span>
                <span className={styles.actionCount}>
                  {post.recipe?.comments || '0'}
                </span>
              </button>

              <button
                onClick={() => toggleSave(post.id)}
                className={`${styles.actionBtn} ${userActions.saves.has(post.id) ? styles.saved : ''}`}
              >
                <span className={styles.actionIcon}>
                  {userActions.saves.has(post.id) ? '⭐' : '🤍'}
                </span>
              </button>

              <button 
                className={styles.actionBtn}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: post.recipe.title,
                      text: post.recipe.description,
                      url: `${window.location.origin}/recipe/${post.recipe.id}`
                    }).catch(err => console.error('Erreur lors du partage', err))
                  } else {
                    // Fallback for browsers that don't support share API
                    navigator.clipboard.writeText(
                      `${post.recipe.title}: ${window.location.origin}/recipe/${post.recipe.id}`
                    ).then(() => {
                      alert('Lien copié dans le presse-papiers!')
                    })
                  }
                }}
              >
                <span className={styles.actionIcon}>📤</span>
              </button>

              <button
                onClick={() => openRecipe(post.recipe.id)}
                className={styles.recipeBtn}
              >
                <span className={styles.actionIcon}>📝</span>
                <span className={styles.actionLabel}>Recette</span>
              </button>
            </div>

            {/* Time info */}
            {post.timeAgo && (
              <div className={styles.timeInfo}>
                <span className={styles.timeIcon}>🕒</span>
                <span className={styles.timeText}>{post.timeAgo}</span>
              </div>
            )}
          </div>
        )
      })}
      
      {/* Loading more indicator */}
      {loadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner}></div>
          <p>Chargement de nouvelles recettes...</p>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && recipes.length > 0 && (
        <div className={styles.endMessage}>
          <p>Vous avez parcouru toutes nos recettes ! 🎉</p>
          <button onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }} className={styles.scrollTopBtn}>
            Retour en haut ↑
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes heartExplode {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          30% {
            transform: scale(1.3) rotate(120deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.6) rotate(360deg) translateY(-120px) translateX(${Math.random() * 40 - 20}px);
            opacity: 0;
          }
        }
        
        @keyframes bounceIn {
          0% {
            transform: translateX(-50%) scale(0.3) translateY(50px);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scale(1.1) translateY(-10px);
          }
          70% {
            transform: translateX(-50%) scale(0.9) translateY(5px);
          }
          100% {
            transform: translateX(-50%) scale(1) translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes bounceOut {
          0% {
            transform: translateX(-50%) scale(1) translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) scale(0.3) translateY(-50px);
            opacity: 0;
          }
        }

        @keyframes heartFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-30px) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
