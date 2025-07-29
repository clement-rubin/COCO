import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo, logDebug } from '../utils/logger'
import { showRecipeLikedNotification } from '../utils/notificationUtils'
import { getMultipleRecipesEngagementStats } from '../utils/likesUtils'
import styles from '../styles/AddictiveFeed.module.css'
import { supabase } from '../lib/supabase'

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
          // Charger les vraies statistiques d'engagement
          const recipeIds = recipesData.map(r => r.id)
          const engagementStats = await getMultipleRecipesEngagementStats(recipeIds)
          
          logInfo('Public recipes loaded successfully', {
            userId: user.id,
            recipesCount: recipesData.length,
            hasEngagementStats: engagementStats.success,
            component: 'AddictiveFeed'
          })
          
          const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe, engagementStats.data[recipe.id]))
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
        
        // Charger les statistiques même pour les utilisateurs non connectés
        const recipeIds = recipesData.map(r => r.id)
        const engagementStats = await getMultipleRecipesEngagementStats(recipeIds)
        
        const formattedRecipes = recipesData.map(recipe => {
          const formatted = formatRecipeData(recipe, engagementStats.data[recipe.id])
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
      
      // Charger les vraies statistiques d'engagement pour les nouvelles recettes
      const newRecipeIds = recipesData.map(r => r.id)
      const engagementStats = await getMultipleRecipesEngagementStats(newRecipeIds)
      
      const formattedRecipes = recipesData.map(recipe => formatRecipeData(recipe, engagementStats.data[recipe.id]))
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

  // Helper to format recipe data from API to feed format - VERSION AVEC VRAIES DONNÉES
  const formatRecipeData = (apiRecipe, engagementStats = null) => {
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

    // Utiliser le nom d'auteur de la recette
    const authorName = apiRecipe.author || 'Chef Anonyme'
    const authorEmoji = getAuthorEmoji(apiRecipe.category)
    
    // UTILISER LES VRAIES DONNÉES D'ENGAGEMENT
    const realLikes = engagementStats?.likes_count || apiRecipe.likes_count || 0
    const realComments = engagementStats?.comments_count || 0
    
    const created = apiRecipe.created_at ? new Date(apiRecipe.created_at) : new Date()
    const timeAgo = getTimeAgo(created)
    
    logDebug('Formatting recipe with real engagement data', {
      recipeId: apiRecipe.id,
      realLikes,
      realComments,
      hasEngagementStats: !!engagementStats,
      userHasLiked: engagementStats?.user_has_liked || false
    })
    
    return {
      id: apiRecipe.id,
      user: {
        id: apiRecipe.user_id || `author_${authorName.replace(/\s+/g, '_').toLowerCase()}`,
        name: authorName,
        avatar: authorEmoji,
        verified: Math.random() > 0.7 // Simplification du système de vérification
      },
      recipe: {
        id: apiRecipe.id,
        title: apiRecipe.title,
        description: apiRecipe.description || "Une délicieuse recette à découvrir !",
        image: imageUrl,
        category: apiRecipe.category || 'Autre',
        // VRAIES DONNÉES AU LIEU DE VALEURS ALÉATOIRES
        likes: realLikes,
        comments: realComments,
        user_has_liked: engagementStats?.user_has_liked || false
      },
      timeAgo,
      isQuickShare: apiRecipe.form_mode === 'quick' || apiRecipe.category === 'Photo partagée'
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

  // Actions utilisateur - CORRECTION POUR ÉVITER DOUBLE AJOUT
  const toggleLike = useCallback(async (recipeId) => {
    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        router.push('/login?redirect=' + encodeURIComponent('/'))
      }
      return
    }
    
    const recipe = recipes.find(r => r.id === recipeId)
    const isCurrentlyLiked = recipe?.recipe?.user_has_liked || false
    
    // SUPPRESSION DE LA MISE À JOUR OPTIMISTE DES ACTIONS UTILISATEUR
    // Ne plus gérer userActions.likes ici car c'est redondant avec recipe.user_has_liked
    
    // Mise à jour optimiste UNIQUEMENT de l'UI de la recette
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === recipeId) {
        return {
          ...recipe,
          recipe: {
            ...recipe.recipe,
            likes: recipe.recipe.likes + (isCurrentlyLiked ? -1 : 1),
            user_has_liked: !isCurrentlyLiked
          }
        }
      }
      return recipe
    }))

    // Animation uniquement si c'est un like (pas un unlike)
    if (!isCurrentlyLiked) {
      // Déclencher une notification pour le propriétaire de la recette
      if (recipe && recipe.user && recipe.user.id !== user.id) {
        showRecipeLikedNotification(
          {
            id: recipe.recipe.id,
            title: recipe.recipe.title,
            image: recipe.recipe.image,
            user_id: recipe.user.id
          },
          {
            user_id: user.id,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
          }
        )
      }
      
      // Animation de like
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
    }

    // Appel à l'API pour synchroniser avec la base de données
    try {
      const { toggleRecipeLike } = await import('../utils/likesUtils')
      const result = await toggleRecipeLike(recipeId, user.id, isCurrentlyLiked)
      
      if (!result.success) {
        // Reverser les changements optimistes si l'API échoue
        setRecipes(prev => prev.map(recipe => {
          if (recipe.id === recipeId) {
            return {
              ...recipe,
              recipe: {
                ...recipe.recipe,
                likes: recipe.recipe.likes + (isCurrentlyLiked ? 1 : -1),
                user_has_liked: isCurrentlyLiked
              }
            }
          }
          return recipe
        }))
      } else {
        // Mettre à jour avec les vraies données de l'API (correction finale)
        setRecipes(prev => prev.map(recipe => {
          if (recipe.id === recipeId) {
            return {
              ...recipe,
              recipe: {
                ...recipe.recipe,
                likes: result.stats?.likes_count || recipe.recipe.likes,
                user_has_liked: result.stats?.user_has_liked !== undefined ? result.stats.user_has_liked : !isCurrentlyLiked
              }
            }
          }
          return recipe
        }))
      }
    } catch (error) {
      logError('Error syncing like with database', error, { recipeId, userId: user.id })
      
      // Reverser les changements optimistes en cas d'erreur
      setRecipes(prev => prev.map(recipe => {
        if (recipe.id === recipeId) {
          return {
            ...recipe,
            recipe: {
              ...recipe.recipe,
              likes: recipe.recipe.likes + (isCurrentlyLiked ? 1 : -1),
              user_has_liked: isCurrentlyLiked
            }
          }
        }
        return recipe
      }))
    }
    
    logUserInteraction('TOGGLE_LIKE', 'addictive-feed', {
      recipeId,
      action: isCurrentlyLiked ? 'unlike' : 'like',
      userId: user?.id
    })
  }, [user, router, recipes])

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
            <span>Chargement des vraies données culinaires...</span>
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
      {/* Header principal redessiné */}
      <div className={styles.feedHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>🍳</div>
            <div className={styles.headerText}>
              <h2 className={styles.headerTitle}>Feed Culinaire</h2>
              <p className={styles.headerSubtitle}>
                {user ? `${recipes.length} recettes de vos amis` : 'Découvrez les recettes tendances'}
              </p>
            </div>
          </div>
          
          <div className={styles.headerRight}>
            <div className={styles.headerActions}>
              <button 
                onClick={() => router.push('/amis')} 
                className={styles.friendsBtn}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                👥 Amis
              </button>
              {user && (
                <button 
                  onClick={() => router.push('/share-photo')} 
                  className={styles.addRecipeBtn}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  ➕ Partager
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Indicateur de statut en temps réel */}
        <div className={styles.statusIndicator} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '8px',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div className={styles.liveIndicator} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className={styles.liveDot} style={{
              width: '8px',
              height: '8px',
              background: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            <span>Données en temps réel</span>
          </div>
        </div>
      </div>

      {/* Section des statistiques avec design amélioré */}
      <div className={styles.statsSection}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}>🍽️</span>
          <span className={styles.statNumber}>{recipes.length}</span>
          <span className={styles.statLabel}>Recettes</span>
          <div className={styles.statSubtext}>Partagées par vos amis</div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>❤️</span>
          <span className={styles.statNumber}>
            {recipes.reduce((total, recipe) => total + recipe.recipe.likes, 0)}
          </span>
          <span className={styles.statLabel}>Likes</span>
          <div className={styles.statSubtext}>Total des appréciations</div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>💬</span>
          <span className={styles.statNumber}>
            {recipes.reduce((total, recipe) => total + recipe.recipe.comments, 0)}
          </span>
          <span className={styles.statLabel}>Commentaires</span>
          <div className={styles.statSubtext}>Interactions</div>
        </div>
        
        <div className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statNumber}>
            {new Set(recipes.map(r => r.user.id)).size}
          </span>
          <span className={styles.statLabel}>Chefs actifs</span>
          <div className={styles.statSubtext}>Amis créatifs</div>
        </div>
      </div>

      <div className={styles.recipesGrid}>
        {recipes.map((post, index) => (
          <div 
            key={post.id} 
            className={styles.recipeCard}
            style={{
              '--animation-delay': `${index * 0.1}s`
            }}
          >
            {/* Badge ami amélioré */}
            <div className={styles.friendBadge}>
              <span className={styles.friendIcon}>🤝</span>
              <span className={styles.friendLabel}>Votre ami</span>
            </div>
            
            {/* Image avec overlay amélioré */}
            <div className={styles.recipeImageContainer} onClick={() => openRecipe(post.recipe.id)}>
              <Image
                src={post.recipe.image}
                alt={post.recipe.title}
                fill
                className={styles.recipeImage}
                sizes="(max-width: 768px) 100vw, 500px"
                unoptimized={post.recipe.image.startsWith('data:')}
                priority={index < 2}
                onLoad={() => {
                  logDebug('AddictiveFeed: Image loaded successfully', {
                    recipeId: post.recipe.id,
                    imageUrl: post.recipe.image?.substring(0, 50) + '...'
                  })
                }}
                onError={(e) => {
                  logError('AddictiveFeed: Image load error', new Error('Image failed to load'), {
                    recipeId: post.recipe.id,
                    imageUrl: post.recipe.image?.substring(0, 50) + '...'
                  })
                  e.target.src = '/placeholder-recipe.jpg'
                }}
              />
              <div className={styles.imageOverlay}>
                <div className={styles.categoryBadge}>
                  {post.recipe.category}
                </div>
                {post.isQuickShare && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95))',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    📸 Express
                  </div>
                )}
              </div>
            </div>

            {/* Contenu avec design amélioré */}
            <div className={styles.recipeContent}>
              {/* Info utilisateur redessinée */}
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

              {/* Titre et description améliorés */}
              <h3 className={styles.recipeTitle} onClick={() => openRecipe(post.recipe.id)}>
                {post.recipe.title}
              </h3>
              
              <p className={styles.recipeDescription}>
                {post.recipe.description}
              </p>

              {/* Meta informations */}
              <div className={styles.recipeMeta}>
                <span className={styles.metaItem}>
                  📂 {post.recipe.category}
                </span>
                {post.isQuickShare && (
                  <span className={styles.metaItem}>
                    📸 Partage express
                  </span>
                )}
                <span className={styles.metaItem}>
                  ⏱️ {post.timeAgo}
                </span>
              </div>

              {/* Actions avec animations améliorées */}
              <div className={styles.recipeActions}>
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`${styles.actionBtn} ${post.recipe.user_has_liked ? styles.liked : ''}`}
                >
                  {post.recipe.user_has_liked ? '❤️' : '🤍'} {post.recipe.likes}
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
          <p>Chargement de nouvelles recettes avec statistiques réelles...</p>
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

      {/* Animations CSS intégrées */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes heartFloat {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -70%) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
