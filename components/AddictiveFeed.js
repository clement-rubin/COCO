import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo, logDebug } from '../utils/logger'
import { showRecipeLikedNotification } from '../utils/notificationUtils'
import { getMultipleRecipesEngagementStats } from '../utils/likesUtils'
import styles from '../styles/AddictiveFeed.module.css'
import { supabase } from '../lib/supabase'
import FeedFilters from './feed/FeedFilters'
import CommunitySpotlight from './feed/CommunitySpotlight'
import RecipeCard from './feed/RecipeCard'

const FEED_FILTERS = [
  {
    id: 'all',
    label: 'Tout',
    description: 'Dernières inspirations de la communauté'
  },
  {
    id: 'trending',
    label: 'Tendances',
    description: 'Recettes les plus applaudies de la semaine'
  },
  {
    id: 'quick',
    label: 'Express',
    description: 'Partages rapides et stories du quotidien'
  },
  {
    id: 'veggie',
    label: 'Végétal',
    description: 'Sélections végétariennes et healthy'
  }
]

export default function AddictiveFeed({ initialRecipes = [], initialEngagement = {}, initialPage = 1 } = {}) {
  const router = useRouter()
  const { user } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(initialRecipes.length === 0)
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [userActions, setUserActions] = useState({
    likes: new Set(),
    saves: new Set()
  })
  const [leaderboard, setLeaderboard] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [friendIds, setFriendIds] = useState([])

  const containerRef = useRef(null)
  const hasHydratedInitialData = useRef(false)
  const numberFormatter = useMemo(() => new Intl.NumberFormat('fr-FR'), [])
  const formatCount = useCallback(
    (value) => numberFormatter.format(value || 0),
    [numberFormatter]
  )
  const skeletonPlaceholders = useMemo(() => Array.from({ length: 6 }), [])

  const communityInsights = useMemo(() => {
    if (!recipes || recipes.length === 0) {
      return {
        totalRecipes: 0,
        totalLikes: 0,
        totalComments: 0,
        totalInteractions: 0,
        activeCooks: 0,
        topCreators: [],
        topCategories: []
      }
    }

    const categoryCount = new Map()
    const creatorMap = new Map()

    let totalLikes = 0
    let totalComments = 0

    recipes.forEach(recipe => {
      const likes = recipe?.recipe?.likes || 0
      const comments = recipe?.recipe?.comments || 0
      totalLikes += likes
      totalComments += comments

      const categoryLabel = recipe?.recipe?.category?.trim()
      if (categoryLabel) {
        const normalized = categoryLabel.toLowerCase()
        categoryCount.set(normalized, {
          label: categoryLabel,
          count: (categoryCount.get(normalized)?.count || 0) + 1,
          interactions: (categoryCount.get(normalized)?.interactions || 0) + likes + comments
        })
      }

      const creatorId = recipe?.user?.id || `anon-${recipe.id}`
      const existingCreator = creatorMap.get(creatorId)
      if (existingCreator) {
        existingCreator.recipesCount += 1
        existingCreator.likes += likes
        existingCreator.comments += comments
      } else {
        creatorMap.set(creatorId, {
          id: creatorId,
          name: recipe?.user?.name || 'Chef anonyme',
          avatar: recipe?.user?.avatar_url || null,
          emoji: recipe?.user?.emoji,
          recipesCount: 1,
          likes,
          comments
        })
      }
    })

    const topCreators = Array.from(creatorMap.values())
      .sort((a, b) => {
        const diffLikes = b.likes - a.likes
        if (diffLikes !== 0) return diffLikes
        const diffRecipes = b.recipesCount - a.recipesCount
        if (diffRecipes !== 0) return diffRecipes
        return b.comments - a.comments
      })
      .slice(0, 3)

    const topCategories = Array.from(categoryCount.values())
      .sort((a, b) => {
        if (b.interactions !== a.interactions) {
          return b.interactions - a.interactions
        }
        return b.count - a.count
      })
      .slice(0, 3)

    return {
      totalRecipes: recipes.length,
      totalLikes,
      totalComments,
      totalInteractions: totalLikes + totalComments,
      activeCooks: creatorMap.size,
      topCreators,
      topCategories
    }
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    if (!recipes || recipes.length === 0) {
      return []
    }

    if (activeFilter === 'all') {
      return recipes
    }

    if (activeFilter === 'trending') {
      return [...recipes].sort((a, b) => {
        const scoreA = (a?.recipe?.likes || 0) * 2 + (a?.recipe?.comments || 0)
        const scoreB = (b?.recipe?.likes || 0) * 2 + (b?.recipe?.comments || 0)
        if (scoreA === scoreB) {
          return (new Date(b?.recipe?.createdAt || 0)).getTime() - (new Date(a?.recipe?.createdAt || 0)).getTime()
        }
        return scoreB - scoreA
      })
    }

    if (activeFilter === 'quick') {
      return recipes.filter(recipe => recipe.isQuickShare)
    }

    if (activeFilter === 'veggie') {
      return recipes.filter(recipe => {
        const category = recipe?.recipe?.category?.toLowerCase() || ''
        return ['veg', 'healthy', 'salade', 'green'].some(keyword => category.includes(keyword))
      })
    }

    return recipes
  }, [recipes, activeFilter])

  const spotlightCreators = useMemo(() => {
    if (communityInsights.topCreators.length > 0) {
      if (communityInsights.topCreators.length >= 3 || leaderboard.length === 0) {
        return communityInsights.topCreators
      }

      const existingIds = new Set(communityInsights.topCreators.map(creator => creator.id))
      const leaderboardFallback = leaderboard
        .filter(entry => !existingIds.has(entry.user_id))
        .map(entry => ({
          id: entry.user_id,
          name: entry.display_name || 'Cuisinier COCO',
          avatar: entry.avatar_url,
          emoji: '👩‍🍳',
          recipesCount: entry.recipesCount || 0,
          likes: entry.recipesCount || 0
        }))

      return [...communityInsights.topCreators, ...leaderboardFallback].slice(0, 3)
    }

    if (leaderboard.length > 0) {
      return leaderboard.slice(0, 3).map(entry => ({
        id: entry.user_id,
        name: entry.display_name || 'Cuisinier COCO',
        avatar: entry.avatar_url,
        emoji: '👨‍🍳',
        recipesCount: entry.recipesCount || 0,
        likes: entry.recipesCount || 0
      }))
    }

    return []
  }, [communityInsights.topCreators, leaderboard])

  // Chargement initial
  useEffect(() => {
    if (initialRecipes.length > 0 && !hasHydratedInitialData.current && recipes.length === 0) {
      return
    }

    loadRecipes({ skipLoader: recipes.length > 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, recipes.length, initialRecipes.length])

  const loadRecipes = async ({ skipLoader = false } = {}) => {
    if (!skipLoader) {
      setLoading(true)
    }
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
          const recipeIds = recipesData.map(r => r.id)
          const engagementStats = await getMultipleRecipesEngagementStats(recipeIds)
          const loadedFriendIds = await fetchFriendIds()
          setFriendIds(Array.from(loadedFriendIds))

          logInfo('Public recipes loaded successfully', {
            userId: user.id,
            recipesCount: recipesData.length,
            hasEngagementStats: engagementStats.success,
            component: 'AddictiveFeed'
          })

          const formattedRecipes = recipesData.map(recipe =>
            formatRecipeData(recipe, engagementStats.data?.[recipe.id], {
              friendIds: loadedFriendIds,
              currentUserId: user.id
            })
          )

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
        setFriendIds([])
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
          const formatted = formatRecipeData(recipe, engagementStats.data?.[recipe.id], {
            friendIds: new Set(),
            currentUserId: user?.id
          })
          formatted.isPreview = true
          return formatted
        })

        setRecipes(formattedRecipes)
        setPage(1)
        setFriendIds([])
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
      let activeFriendIds = new Set(friendIds)
      if (activeFriendIds.size === 0) {
        activeFriendIds = await fetchFriendIds()
        setFriendIds(Array.from(activeFriendIds))
      }

      const allUserIds = [user.id, ...activeFriendIds]

      if (allUserIds.length === 0) {
        setHasMore(false)
        return
      }

      const offset = page * 10

      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select('*')
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + 9)
      
      if (error) {
        throw error
      }
      
      if (!recipesData || recipesData.length === 0) {
        setHasMore(false)
        return
      }

      const newRecipeIds = recipesData.map(r => r.id)
      const engagementStats = await getMultipleRecipesEngagementStats(newRecipeIds)

      const formattedRecipes = recipesData.map(recipe =>
        formatRecipeData(recipe, engagementStats.data?.[recipe.id], {
          friendIds: activeFriendIds,
          currentUserId: user.id
        })
      )
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
  const formatRecipeData = useCallback((apiRecipe, engagementStats = null, options = {}) => {
    const { friendIds: friendIdSource = new Set(), currentUserId } = options
    const friendIdsSet = friendIdSource instanceof Set ? friendIdSource : new Set(friendIdSource || [])

    let imageUrl = '/placeholder-recipe.jpg'

    if (apiRecipe.image) {
      try {
        const { processImageData } = require('../utils/imageUtils')
        const processedUrl = processImageData(apiRecipe.image, '/placeholder-recipe.jpg')

        if (
          processedUrl &&
          processedUrl !== '/placeholder-recipe.jpg' &&
          (processedUrl.startsWith('data:image/') || processedUrl.startsWith('http'))
        ) {
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

    let avatar_url = null
    if (apiRecipe.author_profile?.avatar_url) {
      avatar_url = apiRecipe.author_profile.avatar_url
    } else if (apiRecipe.avatar_url) {
      avatar_url = apiRecipe.avatar_url
    }

    const authorName = apiRecipe.author || 'Chef Anonyme'
    const authorEmoji = getAuthorEmoji(apiRecipe.category)

    const realLikes = engagementStats?.likes_count || apiRecipe.likes_count || 0
    const realComments = engagementStats?.comments_count || 0

    const created = apiRecipe.created_at ? new Date(apiRecipe.created_at) : new Date()
    const timeAgo = getTimeAgo(created)

    const verified = Boolean(
      apiRecipe?.author_profile?.is_verified ??
      apiRecipe?.is_verified ??
      apiRecipe?.user?.is_verified
    )

    const isFriend = Boolean(
      currentUserId &&
      apiRecipe?.user_id &&
      apiRecipe.user_id !== currentUserId &&
      friendIdsSet.has(apiRecipe.user_id)
    )

    logDebug('Formatting recipe with real engagement data', {
      recipeId: apiRecipe.id,
      realLikes,
      realComments,
      hasEngagementStats: !!engagementStats,
      userHasLiked: engagementStats?.user_has_liked || false,
      isFriend
    })

    return {
      id: apiRecipe.id,
      user: {
        id: apiRecipe.user_id || `author_${authorName.replace(/\s+/g, '_').toLowerCase()}`,
        name: authorName,
        avatar_url,
        emoji: authorEmoji,
        verified
      },
      recipe: {
        id: apiRecipe.id,
        title: apiRecipe.title,
        description: apiRecipe.description || 'Une délicieuse recette à découvrir !',
        image: imageUrl,
        category: apiRecipe.category || 'Autre',
        createdAt: apiRecipe.created_at || null,
        likes: realLikes,
        comments: realComments,
        user_has_liked: engagementStats?.user_has_liked || false
      },
      timeAgo,
      isFriend,
      isQuickShare: apiRecipe.form_mode === 'quick' || apiRecipe.category === 'Photo partagée'
    }
  }, [])

  // Helper functions for formatting recipe data
  function getAuthorEmoji(category) {
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

  function getTimeAgo(date) {
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

  const fetchFriendIds = useCallback(async () => {
    if (!user?.id) {
      return new Set()
    }

    const { data, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (error) {
      logError('Failed to load friend ids for feed', error, {
        component: 'AddictiveFeed',
        userId: user.id
      })
      return new Set()
    }

    const ids = new Set()
    ;(data || []).forEach(friendship => {
      if (friendship.user_id === user.id) {
        ids.add(friendship.friend_id)
      } else if (friendship.friend_id === user.id) {
        ids.add(friendship.user_id)
      }
    })

    return ids
  }, [user?.id])

  useEffect(() => {
    if (hasHydratedInitialData.current) {
      return
    }

    if (!initialRecipes || initialRecipes.length === 0) {
      return
    }

    const currentFriendIds = new Set(friendIds)
    const formatted = initialRecipes.map(recipe =>
      formatRecipeData(recipe, initialEngagement?.[recipe.id], {
        friendIds: currentFriendIds,
        currentUserId: user?.id
      })
    )

    setRecipes(formatted)
    setPage(initialPage)
    setLoading(false)
    hasHydratedInitialData.current = true
  }, [initialRecipes, initialEngagement, initialPage, formatRecipeData, friendIds, user?.id])

  // Actions utilisateur - CORRECTION POUR ÉVITER DOUBLE AJOUT
  const openAuthorProfile = useCallback(
    (authorId) => {
      if (!authorId || authorId.startsWith('author_')) {
        return
      }

      if (user?.id && authorId === user.id) {
        router.push('/profil')
        return
      }

      logUserInteraction('open_public_profile', {
        authorId,
        source: 'addictive_feed'
      })

      router.push(`/profile/${authorId}`)
    },
    [router, user]
  )

  const handleProfileKeyDown = useCallback(
    (event, authorId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openAuthorProfile(authorId)
      }
    },
    [openAuthorProfile]
  )

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
      if (
        recipe &&
        recipe.user &&
        recipe.user.id !== user.id && // Ne pas notifier si l'utilisateur like sa propre recette
        recipe.user.id // S'assurer que la recette a bien un propriétaire
      ) {
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

  // Load saved likes from localStorage - VERSION SÉCURISÉE
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
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
    }
  }, [])

  // Charger le classement mensuel (top 3)
  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  // Fonction pour charger le classement (extracted for reuse)
  const fetchLeaderboard = async () => {
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        return
      }

      // 2. Récupérer toutes les recettes du dernier mois
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', oneMonthAgo.toISOString())
      if (recipesError) {
        console.error("[Classement] Erreur recipes:", recipesError)
      }

      // 3. Compter les recettes par utilisateur sur le dernier mois
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })

      // 4. Mapper les profils avec le nombre de recettes publiées
      const leaderboardData = (profilesData || []).map(profile => {
        const count = recipesCountMap[profile.user_id] || 0
        return {
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: count,
          isYou: user?.id === profile.user_id
        }
      })

      leaderboardData.sort((a, b) => b.recipesCount - a.recipesCount)
      setLeaderboard(leaderboardData.slice(0, 10)) // Garde les 10 premiers pour affichage complet si besoin
    } catch (e) {
      console.error("[Classement] Exception générale:", e)
      setLeaderboard([])
    }
  }

  if (loading) {
    return (
      <div className={`${styles.feedContainer} ${styles.feedLoading}`} aria-busy="true">
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonTitlePlaceholder} />
          <div className={styles.skeletonSubtitlePlaceholder} />
        </div>

        <div className={styles.skeletonGrid}>
          {skeletonPlaceholders.map((_, index) => (
            <div key={index} className={styles.skeletonCard}>
              <div className={styles.skeletonThumbnail} />
              <div className={styles.skeletonContent}>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
        throw error
      }
      
      if (!recipesData || recipesData.length === 0) {
        setHasMore(false)
        return
      }

      const newRecipeIds = recipesData.map(r => r.id)
      const engagementStats = await getMultipleRecipesEngagementStats(newRecipeIds)

      const formattedRecipes = recipesData.map(recipe =>
        formatRecipeData(recipe, engagementStats.data?.[recipe.id], {
          friendIds: activeFriendIds,
          currentUserId: user.id
        })
      )
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
  const formatRecipeData = useCallback((apiRecipe, engagementStats = null, options = {}) => {
    const { friendIds: friendIdSource = new Set(), currentUserId } = options
    const friendIdsSet = friendIdSource instanceof Set ? friendIdSource : new Set(friendIdSource || [])

    let imageUrl = '/placeholder-recipe.jpg'

    if (apiRecipe.image) {
      try {
        const { processImageData } = require('../utils/imageUtils')
        const processedUrl = processImageData(apiRecipe.image, '/placeholder-recipe.jpg')

        if (
          processedUrl &&
          processedUrl !== '/placeholder-recipe.jpg' &&
          (processedUrl.startsWith('data:image/') || processedUrl.startsWith('http'))
        ) {
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

    let avatar_url = null
    if (apiRecipe.author_profile?.avatar_url) {
      avatar_url = apiRecipe.author_profile.avatar_url
    } else if (apiRecipe.avatar_url) {
      avatar_url = apiRecipe.avatar_url
    }

    const authorName = apiRecipe.author || 'Chef Anonyme'
    const authorEmoji = getAuthorEmoji(apiRecipe.category)

    const realLikes = engagementStats?.likes_count || apiRecipe.likes_count || 0
    const realComments = engagementStats?.comments_count || 0

    const created = apiRecipe.created_at ? new Date(apiRecipe.created_at) : new Date()
    const timeAgo = getTimeAgo(created)

    const verified = Boolean(
      apiRecipe?.author_profile?.is_verified ??
      apiRecipe?.is_verified ??
      apiRecipe?.user?.is_verified
    )

    const isFriend = Boolean(
      currentUserId &&
      apiRecipe?.user_id &&
      apiRecipe.user_id !== currentUserId &&
      friendIdsSet.has(apiRecipe.user_id)
    )

    logDebug('Formatting recipe with real engagement data', {
      recipeId: apiRecipe.id,
      realLikes,
      realComments,
      hasEngagementStats: !!engagementStats,
      userHasLiked: engagementStats?.user_has_liked || false,
      isFriend
    })

    return {
      id: apiRecipe.id,
      user: {
        id: apiRecipe.user_id || `author_${authorName.replace(/\s+/g, '_').toLowerCase()}`,
        name: authorName,
        avatar_url,
        emoji: authorEmoji,
        verified
      },
      recipe: {
        id: apiRecipe.id,
        title: apiRecipe.title,
        description: apiRecipe.description || 'Une délicieuse recette à découvrir !',
        image: imageUrl,
        category: apiRecipe.category || 'Autre',
        createdAt: apiRecipe.created_at || null,
        likes: realLikes,
        comments: realComments,
        user_has_liked: engagementStats?.user_has_liked || false
      },
      timeAgo,
      isFriend,
      isQuickShare: apiRecipe.form_mode === 'quick' || apiRecipe.category === 'Photo partagée'
    }
  }, [])

  // Helper functions for formatting recipe data
  function getAuthorEmoji(category) {
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

  function getTimeAgo(date) {
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

  const fetchFriendIds = useCallback(async () => {
    if (!user?.id) {
      return new Set()
    }

    const { data, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (error) {
      logError('Failed to load friend ids for feed', error, {
        component: 'AddictiveFeed',
        userId: user.id
      })
      return new Set()
    }

    const ids = new Set()
    ;(data || []).forEach(friendship => {
      if (friendship.user_id === user.id) {
        ids.add(friendship.friend_id)
      } else if (friendship.friend_id === user.id) {
        ids.add(friendship.user_id)
      }
    })

    return ids
  }, [user?.id])

  useEffect(() => {
    if (hasHydratedInitialData.current) {
      return
    }

    if (!initialRecipes || initialRecipes.length === 0) {
      return
    }

    const currentFriendIds = new Set(friendIds)
    const formatted = initialRecipes.map(recipe =>
      formatRecipeData(recipe, initialEngagement?.[recipe.id], {
        friendIds: currentFriendIds,
        currentUserId: user?.id
      })
    )

    setRecipes(formatted)
    setPage(initialPage)
    setLoading(false)
    hasHydratedInitialData.current = true
  }, [initialRecipes, initialEngagement, initialPage, formatRecipeData, friendIds, user?.id])

  // Actions utilisateur - CORRECTION POUR ÉVITER DOUBLE AJOUT
  const openAuthorProfile = useCallback(
    (authorId) => {
      if (!authorId || authorId.startsWith('author_')) {
        return
      }

      if (user?.id && authorId === user.id) {
        router.push('/profil')
        return
      }

      logUserInteraction('open_public_profile', {
        authorId,
        source: 'addictive_feed'
      })

      router.push(`/profile/${authorId}`)
    },
    [router, user]
  )

  const handleProfileKeyDown = useCallback(
    (event, authorId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openAuthorProfile(authorId)
      }
    },
    [openAuthorProfile]
  )

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
      if (
        recipe &&
        recipe.user &&
        recipe.user.id !== user.id && // Ne pas notifier si l'utilisateur like sa propre recette
        recipe.user.id // S'assurer que la recette a bien un propriétaire
      ) {
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

  // Load saved likes from localStorage - VERSION SÉCURISÉE
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
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
    }
  }, [])

  // Charger le classement mensuel (top 3)
  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  // Fonction pour charger le classement (extracted for reuse)
  const fetchLeaderboard = async () => {
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        return
      }

      // 2. Récupérer toutes les recettes du dernier mois
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', oneMonthAgo.toISOString())
      if (recipesError) {
        console.error("[Classement] Erreur recipes:", recipesError)
      }

      // 3. Compter les recettes par utilisateur sur le dernier mois
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })

      // 4. Mapper les profils avec le nombre de recettes publiées
      const leaderboardData = (profilesData || []).map(profile => {
        const count = recipesCountMap[profile.user_id] || 0
        return {
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: count,
          isYou: user?.id === profile.user_id
        }
      })

      leaderboardData.sort((a, b) => b.recipesCount - a.recipesCount)
      setLeaderboard(leaderboardData.slice(0, 10)) // Garde les 10 premiers pour affichage complet si besoin
    } catch (e) {
      console.error("[Classement] Exception générale:", e)
      setLeaderboard([])
    }
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Oups! Un petit souci en cuisine</h3>
        <p>{error}</p>
        <button onClick={() => loadRecipes()} className={styles.retryButton}>
          Réessayer
        </button>
      </div>
    )
  }
  
  if (recipes.length === 0) {
    // Container vide simplifié sans le podium
    return (
      <div className={styles.emptyContainer}>
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🍽️</div>
          <h3 style={{ 
            fontSize: '1.2rem', 
            fontWeight: '700', 
            color: '#374151',
            marginBottom: '12px'
          }}>
            Aucune recette à afficher
          </h3>
          <p style={{ 
            fontSize: '0.9rem', 
            lineHeight: '1.5',
            marginBottom: '24px',
            maxWidth: '300px',
            margin: '0 auto 24px'
          }}>
            Ajoutez des amis pour voir leurs délicieuses recettes dans votre feed !
          </p>
          <button
            onClick={() => router.push('/amis')}
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}
          >
            👥 Ajouter des amis
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer} ref={containerRef}>
      <header className={styles.communityHeader}>
        <div className={styles.headerIntro}>
          <div className={styles.headerText}>
            <p className={styles.communityEyebrow}>Le meilleur de la communauté</p>
            <h2 className={styles.communityTitle}>Les recettes qui font vibrer COCO</h2>
            <p className={styles.communitySubtitle}>
              Explore les créations de la communauté et découvre de nouveaux talents culinaires.
            </p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.headerStat}>
              <span className={styles.headerStatValue}>{formatCount(communityInsights.totalRecipes)}</span>
              <span className={styles.headerStatLabel}>recettes partagées</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatValue}>{formatCount(communityInsights.activeCooks)}</span>
              <span className={styles.headerStatLabel}>cuisiniers actifs</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatValue}>{formatCount(communityInsights.totalInteractions)}</span>
              <span className={styles.headerStatLabel}>interactions</span>
            </div>
          </div>
        </div>

        {communityInsights.topCategories.length > 0 && (
          <div className={styles.trendingCategories}>
            <span className={styles.trendingLabel}>Tendances du moment</span>
            <div className={styles.categoryChips}>
              {communityInsights.topCategories.map(category => (
                <span key={category.label} className={styles.categoryChip}>
                  #{category.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </header>

      <FeedFilters
        filters={FEED_FILTERS}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filteredCount={filteredRecipes.length}
        formatCount={formatCount}
      />

      <CommunitySpotlight
        creators={spotlightCreators}
        onOpenProfile={openAuthorProfile}
        formatCount={formatCount}
      />

      <div className={styles.recipesGrid}>
        {filteredRecipes.length === 0 && recipes.length > 0 ? (
          <div className={styles.emptyFilterContainer}>
            <div className={styles.emptyFilterCard}>
              <span role="img" aria-hidden="true">🍽️</span>
              <p>Aucune recette ne correspond à ce filtre pour le moment.</p>
              <button type="button" onClick={() => setActiveFilter('all')}>
                Revenir au flux complet
              </button>
            </div>
          </div>
        ) : (
          filteredRecipes.map((post, index) => (
            <RecipeCard
              key={post.id}
              post={post}
              index={index}
              onOpenRecipe={openRecipe}
              onOpenProfile={openAuthorProfile}
              onProfileKeyDown={handleProfileKeyDown}
              onToggleLike={toggleLike}
            />
          ))
        )}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner}></div>
          <p>Chargement de nouvelles recettes avec statistiques réelles...</p>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && activeFilter === 'all' && recipes.length > 0 && (
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

      {/* Message d'encouragement - VERSION COMPACTE */}
      {user && (
        <div style={{
          textAlign: 'center',
          padding: '16px', // Réduction
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          margin: '16px', // Réduction
          borderRadius: '14px', // Réduction
          border: '1px solid #f59e0b'
        }}>
          <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>🍳</div>
          <p style={{
            margin: '0 0 8px 0', // Réduction
            fontSize: '0.85rem', // Réduction
            fontWeight: '600',
            color: '#92400e'
          }}>
            Invitez vos amis à rejoindre COCO !
          </p>
          <p style={{
            margin: '0 0 12px 0', // Réduction
            fontSize: '0.75rem', // Réduction
            color: '#b45309',
            lineHeight: '1.4'
          }}>
            Plus vous avez d'amis, plus vous découvrirez de recettes
          </p>
          <button
            onClick={() => router.push('/amis')}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '6px 14px', // Réduction
              borderRadius: '8px',
              fontSize: '0.75rem', // Réduction
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#d97706'
              e.target.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#f59e0b'
              e.target.style.transform = 'translateY(0)'
            }}
          >
            👥 Gérer mes amis
          </button>
        </div>
      )}

      {/* Nouvelle section : Aperçu Collection de Cartes - Discrète */}
      {user && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
          margin: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(2, 132, 199, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Effet de brillance subtil */}
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 40,
            height: 40,
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'floatingGlow 4s ease-in-out infinite'
          }} />

          <div style={{ 
            fontSize: '1rem', 
            marginBottom: '6px',
            position: 'relative',
            zIndex: 1
          }}>🃏</div>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#0284c7',
            position: 'relative',
            zIndex: 1
          }}>
            Collection de Cartes Culinaires
          </p>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '0.7rem',
            color: '#0369a1',
            lineHeight: '1.3',
            position: 'relative',
            zIndex: 1
          }}>
            Découvrez les secrets des grands chefs
          </p>

          {/* Mini aperçu des cartes */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            marginBottom: 8,
            position: 'relative',
            zIndex: 1
          }}>
            {[
              { icon: '🌸', color: '#f59e0b' },
              { icon: '🍄', color: '#8b5cf6' },
              { icon: '👑', color: '#ef4444' }
            ].map((card, idx) => (
              <div key={idx} style={{
                width: 20,
                height: 20,
                background: `${card.color}20`,
                border: `1px solid ${card.color}40`,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                animation: `miniCardFloat 2s ease-in-out infinite ${idx * 0.3}s`
              }}>
                {card.icon}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push('/progression')}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: 'white',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #0369a1, #1e40af)'
              e.target.style.transform = 'translateY(-1px)'
              e.target.style.boxShadow = '0 3px 8px rgba(2, 132, 199, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 2px 6px rgba(2, 132, 199, 0.2)'
            }}
          >
            🎯 Découvrir les cartes
          </button>
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

        @keyframes cardFloat {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-3px);
          }
        }
        
        @keyframes rarityPulse {
          0%, 100% { 
            opacity: 0.6;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        @keyframes miniCardFloat {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-2px) scale(1.1);
          }
        }
        
        @keyframes floatingGlow {
          0%, 100% { 
            transform: translate(0, 0) scale(1); 
            opacity: 0.6; 
          }
          50% { 
            transform: translate(5px, -3px) scale(1.1); 
            opacity: 0.8; 
          }
        }
        
        @keyframes slowRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes trophyFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
          }
          50% { 
            transform: translateY(-3px) rotate(2deg);
          }
        }

        @keyframes buttonShine {
          0%, 100% { left: -100%; }
          50% { left: 100%; }
        }

        @keyframes crownFloat {
          0%, 100% { 
            transform: scale(1.15) translateZ(25px) translateY(0px);
          }
          50% { 
            transform: scale(1.15) translateZ(25px) translateY(-5px);
          }
        }

        @keyframes podiumFloat {
          0%, 100% { 
            transform: rotateY(-8deg) translateZ(15px) translateY(0px);
          }
          50% { 
            transform: rotateY(-8deg) translateZ(15px) translateY(-3px);
          }
        }

        @keyframes goldenGlow {
          0% { 
            box-shadow: 0 12px 30px rgba(245, 158, 11, 0.5), inset 0 2px 4px rgba(255,255,255,0.3);
          }
          100% { 
            box-shadow: 0 16px 40px rgba(245, 158, 11, 0.7), inset 0 2px 4px rgba(255,255,255,0.4);
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .${styles.modernCulinaryLoader} {
            min-height: 350px;
            padding: 30px 15px;
            margin: 15px;
          }

          .${styles.culinaryPlate} {
            width: 160px;
            height: 160px;
            margin-bottom: 30px;
          }

          .${styles.masterChef} {
            font-size: 2.8rem;
          }

          .${styles.ingredientOrbit} {
            width: 200px;
            height: 200px;
          }

          .${styles.ingredient} {
            transform: 
              rotate(var(--orbit-angle)) 
              translateX(100px) 
              rotate(calc(-1 * var(--orbit-angle)));
          }

          .${styles.messageText} {
            font-size: 1.1rem;
          }

          .${styles.loadingStats} {
            gap: 8px;
          }

          .${styles.loadingStat} {
            padding: 10px 12px;
          }

          .${styles.statText} {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  )
}