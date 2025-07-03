import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo, logDebug } from '../utils/logger'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import styles from '../styles/AddictiveFeed.module.css'
import { supabase } from '../lib/supabase'

// ...existing code...

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
        
        // Charger TOUTES les recettes publiques d'abord
        const timestamp = Date.now()
        const apiUrl = `/api/recipes?limit=20&_t=${timestamp}`
        const response = await fetch(apiUrl)
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const recipesData = await response.json()
        
        if (recipesData && recipesData.length > 0) {
          logInfo('Public recipes loaded successfully', {
            userId: user.id,
            recipesCount: recipesData.length,
            component: 'AddictiveFeed'
          })
          
          const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe))
          setRecipes(formattedRecipes)
          setPage(1)
          setError(null)
          return
        }
        
        logInfo('No recipes found', {
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
        
        const timestamp = Date.now()
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
        method: 'loadRecipes',
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
      // Récupérer les amitiés pour la pagination
      const { data: friendshipsData, error: friendsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')
      
      if (friendsError || !friendshipsData || friendshipsData.length === 0) {
        setHasMore(false)
        return
      }
      
      // Extraire les IDs des amis
      const friendIds = new Set()
      friendshipsData.forEach(friendship => {
        if (friendship.user_id === user.id) {
          friendIds.add(friendship.friend_id)
        } else if (friendship.friend_id === user.id) {
          friendIds.add(friendship.user_id)
        }
      })
      
      const friendIdsArray = Array.from(friendIds)
      const allUserIds = [...friendIdsArray, user.id]
      
      if (allUserIds.length === 0) {
        setHasMore(false)
        return
      }
      
      const offset = page * 10
      
      // Charger plus de recettes
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select('*')
        .in('user_id', allUserIds)
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
      logError('Failed to load more recipes', err, {
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
        {/* Nouveau loader festif */}
        <div className={styles.festinLoader}>
          <div className={styles.festinTable}>
            <div className={styles.chefAvatar}>👨‍🍳</div>
            <div className={styles.tableCloth}></div>
            <div className={styles.dishes}>
              <span className={styles.dish} style={{ left: '10%' }}>🍲</span>
              <span className={styles.dish} style={{ left: '35%' }}>🥗</span>
              <span className={styles.dish} style={{ left: '60%' }}>🍰</span>
              <span className={styles.dish} style={{ left: '80%' }}>🍕</span>
            </div>
            <div className={styles.steam}>
              <span className={styles.steam1}></span>
              <span className={styles.steam2}></span>
              <span className={styles.steam3}></span>
            </div>
            <div className={styles.sparklesFestin}>
              <span>✨</span>
              <span>✨</span>
              <span>✨</span>
            </div>
          </div>
          <div className={styles.festinText}>
            <span>Préparation du festin culinaire...</span>
          </div>
        </div>
        <style jsx>{`
          .${styles.festinLoader} {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 320px;
            position: relative;
            animation: fadeInFestin 0.7s;
          }
          .${styles.festinTable} {
            position: relative;
            width: 220px;
            height: 120px;
            margin-bottom: 18px;
            background: none;
          }
          .${styles.chefAvatar} {
            position: absolute;
            top: -38px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 2.8rem;
            z-index: 3;
            animation: chefBounce 2.2s infinite;
            filter: drop-shadow(0 2px 8px #f59e0b55);
          }
          .${styles.tableCloth} {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 48px;
            background: linear-gradient(135deg, #fff7ed 60%, #fde68a 100%);
            border-radius: 0 0 40px 40px;
            border: 2px solid #f59e0b;
            z-index: 1;
            box-shadow: 0 8px 24px #f59e0b22;
          }
          .${styles.dishes} {
            position: absolute;
            bottom: 28px;
            left: 0;
            width: 100%;
            height: 40px;
            z-index: 2;
          }
          .${styles.dish} {
            position: absolute;
            font-size: 1.7rem;
            animation: dishPop 1.8s infinite alternate;
          }
          .${styles.dish}:nth-child(1) { animation-delay: 0s; }
          .${styles.dish}:nth-child(2) { animation-delay: 0.3s; }
          .${styles.dish}:nth-child(3) { animation-delay: 0.6s; }
          .${styles.dish}:nth-child(4) { animation-delay: 0.9s; }
          .${styles.steam} {
            position: absolute;
            left: 50%;
            top: 18px;
            width: 60px;
            height: 40px;
            pointer-events: none;
            z-index: 4;
          }
          .${styles.steam1}, .${styles.steam2}, .${styles.steam3} {
            position: absolute;
            width: 16px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(180deg, #fffbe9 60%, transparent 100%);
            opacity: 0.7;
            animation: steamRise 2.2s infinite;
          }
          .${styles.steam1} { left: 10px; animation-delay: 0s; }
          .${styles.steam2} { left: 28px; animation-delay: 0.5s; }
          .${styles.steam3} { left: 46px; animation-delay: 1s; }
          .${styles.sparklesFestin} {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: space-between;
            pointer-events: none;
            z-index: 5;
          }
          .${styles.sparklesFestin} span {
            font-size: 1.2rem;
            opacity: 0.7;
            animation: sparkleFestin 2.2s infinite;
          }
          .${styles.sparklesFestin} span:nth-child(2) { animation-delay: 0.7s; }
          .${styles.sparklesFestin} span:nth-child(3) { animation-delay: 1.3s; }
          .${styles.festinText} {
            color: #f59e0b;
            font-weight: 700;
            font-size: 1.1rem;
            letter-spacing: 0.01em;
            text-shadow: 0 2px 8px #fde68a;
            margin-top: 8px;
            text-align: center;
            animation: fadeInText 1.2s;
          }
          @keyframes chefBounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-8px); }
          }
          @keyframes dishPop {
            0% { transform: translateY(0) scale(1); }
            60% { transform: translateY(-8px) scale(1.08); }
            100% { transform: translateY(0) scale(1); }
          }
          @keyframes steamRise {
            0% { opacity: 0.7; transform: translateY(0) scaleX(1); }
            50% { opacity: 1; transform: translateY(-18px) scaleX(1.1); }
            100% { opacity: 0; transform: translateY(-36px) scaleX(0.9); }
          }
          @keyframes sparkleFestin {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          @keyframes fadeInFestin {
            from { opacity: 0; transform: scale(0.95);}
            to { opacity: 1; transform: scale(1);}
          }
          @keyframes fadeInText {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
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
          {user ? 'Aucune recette d\'amis à afficher' : 'Rejoignez COCO !'}
        </h3>
        <p>
          {user 
            ? 'Vous n\'avez pas encore d\'amis qui ont partagé des recettes, ou vos amis n\'ont pas encore publié de contenu. Les recettes n\'apparaissent que lorsque vous et votre ami vous êtes ajoutés mutuellement !'
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
                onClick={() => router.push('/collections')} 
                className={styles.secondaryButton}
              >
                🔍 Explorer les collections
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
                onClick={() => router.push('/collections')} 
                className={styles.secondaryButton}
              >
                🔍 Explorer les collections
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
        <div className={styles.feedInfoIcon}>🍳</div>
        <div className={styles.feedInfoText}>
          <strong>Feed communautaire</strong>
          <p>Découvrez toutes les recettes de COCO</p>
        </div>
        <button 
          onClick={() => router.push('/amis')} 
          className={styles.exploreAllBtn}
        >
          👥 Mes amis
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
                    <span className={styles.friendIndicator} title="Votre ami">🤝</span>
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
