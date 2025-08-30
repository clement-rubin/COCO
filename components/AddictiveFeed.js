import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction, logError, logInfo, logDebug } from '../utils/logger'
import { showRecipeLikedNotification } from '../utils/notificationUtils'
import { getMultipleRecipesEngagementStats } from '../utils/likesUtils'
import styles from '../styles/AddictiveFeed.module.css'
import { supabase } from '../lib/supabase'

// Ajout d'un tableau de messages d'accueil dynamiques
const WELCOME_MESSAGES = [
  "Bienvenue sur COCO ! 🍽️ Préparation de votre univers culinaire...",
  "Recherche des recettes de vos amis... 👀",
  "Mélange des ingrédients sociaux... 🥗",
  "Connexion à la communauté gourmande... 👩‍🍳",
  "Un instant, on prépare vos découvertes ! ✨"
]

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
  const [welcomeStep, setWelcomeStep] = useState(0)
  const [showWelcome, setShowWelcome] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  
  const containerRef = useRef(null)

  // Chargement initial
  useEffect(() => {
    let welcomeInterval
    setShowWelcome(true)
    setWelcomeStep(0)
    // Animation de messages cycliques pendant le chargement initial
    welcomeInterval = setInterval(() => {
      setWelcomeStep(prev => (prev + 1) % WELCOME_MESSAGES.length)
    }, 1200)
    loadRecipes().finally(() => {
      setTimeout(() => setShowWelcome(false), 600) // Laisse le message s'effacer en douceur
      clearInterval(welcomeInterval)
    })
    return () => clearInterval(welcomeInterval)
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

    // Récupérer l'avatar_url si présent dans apiRecipe.author_profile ou apiRecipe
    let avatar_url = null;
    if (apiRecipe.author_profile && apiRecipe.author_profile.avatar_url) {
      avatar_url = apiRecipe.author_profile.avatar_url;
    } else if (apiRecipe.avatar_url) {
      avatar_url = apiRecipe.avatar_url;
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
        avatar_url, // <-- avatar_url réel ou null
        emoji: authorEmoji,
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
    setLeaderboardLoading(true)
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        setLeaderboardLoading(false)
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
    setLeaderboardLoading(false)
  }

  // Affichage du message d'accueil pendant le chargement initial
  if (showWelcome) {
    return (
      <div className={styles.loadingContainer} style={{
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
      }}>
        <div style={{
          fontSize: '2.2rem',
          marginBottom: 16,
          animation: 'cocoBounce 1.5s infinite'
        }}>
          🥥
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: '#ff6b35',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          {/* Defensive: fallback if welcomeStep is out of bounds */}
          {WELCOME_MESSAGES[welcomeStep] || WELCOME_MESSAGES[0]}
        </div>
        <div style={{
          marginTop: 16,
          display: 'flex',
          gap: 6,
          justifyContent: 'center'
        }}>
          {[0, 1, 2].map(idx => (
            <span
              key={idx}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ff6b35',
                opacity: welcomeStep === idx ? 1 : 0.3,
                transition: 'opacity 0.3s'
              }}
            />
          ))}
        </div>
        <style jsx>{`
          @keyframes cocoBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        {/* Nouveau loader culinaire ultra-moderne */}
        <div className={styles.modernCulinaryLoader}>
          {/* Plateau rotatif avec chef au centre */}
          <div className={styles.culinaryPlate}>
            <div className={styles.rotatingPlate}>
              {/* Chef principal animé */}
              <div className={styles.masterChef}>👨‍🍳</div>
              
              {/* Ingrédients qui tournent autour */}
              <div className={styles.ingredientOrbit}>
                <span className={styles.ingredient} style={{ '--orbit-angle': '0deg' }}>🥕</span>
                <span className={styles.ingredient} style={{ '--orbit-angle': '60deg' }}>🍅</span>
                <span className={styles.ingredient} style={{ '--orbit-angle': '120deg' }}>🧄</span>
                <span className={styles.ingredient} style={{ '--orbit-angle': '180deg' }}>🥒</span>
                <span className={styles.ingredient} style={{ '--orbit-angle': '240deg' }}>🧅</span>
                <span className={styles.ingredient} style={{ '--orbit-angle': '300deg' }}>🌶️</span>
              </div>
              
              {/* Plats qui apparaissent progressivement */}
              <div className={styles.dishSequence}>
                <span className={styles.dish} style={{ '--delay': '0s' }}>🥗</span>
                <span className={styles.dish} style={{ '--delay': '0.5s' }}>🍲</span>
                <span className={styles.dish} style={{ '--delay': '1s' }}>🍰</span>
                <span className={styles.dish} style={{ '--delay': '1.5s' }}>🍕</span>
              </div>
            </div>
            
            {/* Fumée et étincelles */}
            <div className={styles.cookingEffects}>
              <div className={styles.steamCloud}>
                <span>💨</span>
                <span>💨</span>
                <span>💨</span>
              </div>
              <div className={styles.sparkles}>
                <span>✨</span>
                <span>⭐</span>
                <span>💫</span>
                <span>🌟</span>
              </div>
            </div>
          </div>
          
          {/* Messages dynamiques et amusantes */}
          <div className={styles.loadingMessages}>
            <div className={styles.primaryMessage}>
              <span className={styles.messageText}>Préparation des meilleures recettes</span>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            
            <div className={styles.secondaryMessage}>
              <span>🔥 Données fraîches en cours de collecte</span>
            </div>
            
            {/* Barre de progression stylisée */}
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
              <div className={styles.progressGlow}></div>
            </div>
            
            {/* Stats de chargement amusantes */}
            <div className={styles.loadingStats}>
              <div className={styles.loadingStat}>
                <span className={styles.statIcon}>📊</span>
                <span className={styles.statText}>Analyse des likes en temps réel</span>
              </div>
              <div className={styles.loadingStat}>
                <span className={styles.statIcon}>🤝</span>
                <span className={styles.statText}>Synchronisation avec vos amis</span>
              </div>
              <div className={styles.loadingStat}>
                <span className={styles.statIcon}>🍽️</span>
                <span className={styles.statText}>Chargement des recettes authentiques</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .${styles.modernCulinaryLoader} {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 40px 20px;
            position: relative;
            background: linear-gradient(135deg, #fef7ed 0%, #fff7ed 50%, #fef3e2 100%);
            border-radius: 24px;
            margin: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            animation: containerBreathe 4s ease-in-out infinite;
          }

          .${styles.culinaryPlate} {
            position: relative;
            width: 200px;
            height: 200px;
            margin-bottom: 40px;
          }

          .${styles.rotatingPlate} {
            position: relative;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #fff7ed, #fde68a);
            border-radius: 50%;
            border: 4px solid #f59e0b;
            box-shadow: 
              0 0 30px rgba(245, 158, 11, 0.3),
              inset 0 0 20px rgba(255, 255, 255, 0.5);
            animation: plateRotate 3s linear infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .${styles.masterChef} {
            font-size: 3.5rem;
            z-index: 10;
            animation: chefCook 2s ease-in-out infinite;
            filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.4));
            position: relative;
          }

          .${styles.ingredientOrbit} {
            position: absolute;
            width: 260px;
            height: 260px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: orbitRotate 8s linear infinite reverse;
          }

          .${styles.ingredient} {
            position: absolute;
            font-size: 1.8rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            transform: 
              rotate(var(--orbit-angle)) 
              translateX(130px) 
              rotate(calc(-1 * var(--orbit-angle)));
            animation: ingredientBounce 2s ease-in-out infinite;
            animation-delay: calc(var(--orbit-angle) / 60deg * 0.1s);
          }

          .${styles.dishSequence} {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
          }

          .${styles.dish} {
            position: absolute;
            font-size: 2rem;
            opacity: 0;
            animation: dishAppear 2s ease-in-out infinite;
            animation-delay: var(--delay);
          }

          .${styles.dish}:nth-child(1) { top: 20%; left: 50%; transform: translateX(-50%); }
          .${styles.dish}:nth-child(2) { top: 50%; right: 20%; }
          .${styles.dish}:nth-child(3) { bottom: 20%; left: 50%; transform: translateX(-50%); }
          .${styles.dish}:nth-child(4) { top: 50%; left: 20%; }

          .${styles.cookingEffects} {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            pointer-events: none;
          }

          .${styles.steamCloud} {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
          }

          .${styles.steamCloud} span {
            font-size: 1.5rem;
            opacity: 0.7;
            animation: steamRise 3s ease-in-out infinite;
            animation-delay: calc(var(--i, 0) * 0.5s);
          }

          .${styles.steamCloud} span:nth-child(1) { --i: 0; }
          .${styles.steamCloud} span:nth-child(2) { --i: 1; }
          .${styles.steamCloud} span:nth-child(3) { --i: 2; }

          .${styles.sparkles} {
            position: absolute;
            width: 100%;
            height: 100%;
          }

          .${styles.sparkles} span {
            position: absolute;
            font-size: 1.2rem;
            animation: sparkleFloat 4s ease-in-out infinite;
            opacity: 0;
          }

          .${styles.sparkles} span:nth-child(1) { 
            top: 10%; left: 80%; 
            animation-delay: 0s; 
          }
          .${styles.sparkles} span:nth-child(2) { 
            top: 70%; right: 85%; 
            animation-delay: 1s; 
          }
          .${styles.sparkles} span:nth-child(3) { 
            bottom: 15%; left: 15%; 
            animation-delay: 2s; 
          }
          .${styles.sparkles} span:nth-child(4) { 
            top: 30%; left: 10%; 
            animation-delay: 3s; 
          }

          .${styles.loadingMessages} {
            text-align: center;
            max-width: 350px;
          }

          .${styles.primaryMessage} {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 16px;
          }

          .${styles.messageText} {
            font-size: 1.3rem;
            font-weight: 700;
            color: #d97706;
            text-shadow: 0 2px 8px rgba(217, 119, 6, 0.2);
          }

          .${styles.loadingDots} {
            display: flex;
            gap: 4px;
          }

          .${styles.loadingDots} span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #f59e0b;
            animation: dotPulse 1.4s ease-in-out infinite;
          }

          .${styles.loadingDots} span:nth-child(1) { animation-delay: 0s; }
          .${styles.loadingDots} span:nth-child(2) { animation-delay: 0.2s; }
          .${styles.loadingDots} span:nth-child(3) { animation-delay: 0.4s; }

          .${styles.secondaryMessage} {
            color: #92400e;
            font-weight: 600;
            font-size: 1rem;
            margin-bottom: 24px;
            opacity: 0.8;
          }

          .${styles.progressBar} {
            width: 100%;
            height: 6px;
            background: rgba(245, 158, 11, 0.2);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 24px;
            position: relative;
          }

          .${styles.progressFill} {
            height: 100%;
            background: linear-gradient(90deg, #f59e0b, #d97706, #f59e0b);
            background-size: 200% 100%;
            border-radius: 10px;
            animation: progressFill 3s ease-in-out infinite;
          }

          .${styles.progressGlow} {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 30px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
            animation: progressGlow 2s ease-in-out infinite;
          }

          .${styles.loadingStats} {
            display: flex;
            flex-direction: column;
            gap: 12px;
            width: 100%;
          }

          .${styles.loadingStat} {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid rgba(245, 158, 11, 0.2);
            animation: statFadeIn 0.6s ease-out;
            animation-fill-mode: both;
          }

          .${styles.loadingStat}:nth-child(1) { animation-delay: 0.2s; }
          .${styles.loadingStat}:nth-child(2) { animation-delay: 0.4s; }
          .${styles.loadingStat}:nth-child(3) { animation-delay: 0.6s; }

          .${styles.statIcon} {
            font-size: 1.2rem;
            animation: iconPulse 2s ease-in-out infinite;
          }

          .${styles.statText} {
            font-size: 0.9rem;
            color: #92400e;
            font-weight: 600;
          }

          /* Animations */
          @keyframes containerBreathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }

          @keyframes plateRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes chefCook {
            0%, 100% { 
              transform: scale(1) rotate(0deg); 
            }
            25% { 
              transform: scale(1.1) rotate(-5deg); 
            }
            75% { 
              transform: scale(1.1) rotate(5deg); 
            }
          }

          @keyframes orbitRotate {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }

          @keyframes ingredientBounce {
            0%, 100% { transform: rotate(var(--orbit-angle)) translateX(130px) rotate(calc(-1 * var(--orbit-angle))) scale(1); }
            50% { transform: rotate(var(--orbit-angle)) translateX(130px) rotate(calc(-1 * var(--orbit-angle))) scale(1.2); }
          }

          @keyframes dishAppear {
            0%, 80% { 
              opacity: 0; 
              transform: translateX(-50%) scale(0.5); 
            }
            90% { 
              opacity: 1; 
              transform: translateX(-50%) scale(1.2); 
            }
            100% { 
              opacity: 1; 
              transform: translateX(-50%) scale(1); 
            }
          }

          @keyframes steamRise {
            0% { 
              opacity: 0.7; 
              transform: translateY(0) scale(1); 
            }
            50% { 
              opacity: 1; 
              transform: translateY(-30px) scale(1.2); 
            }
            100% { 
              opacity: 0; 
              transform: translateY(-60px) scale(0.8); 
            }
          }

          @keyframes sparkleFloat {
            0%, 100% { 
              opacity: 0; 
              transform: translateY(0) scale(1) rotate(0deg); 
            }
            50% { 
              opacity: 1; 
              transform: translateY(-20px) scale(1.2) rotate(180deg); 
            }
          }

          @keyframes dotPulse {
            0%, 80%, 100% { 
              transform: scale(1); 
              opacity: 0.5; 
            }
            40% { 
              transform: scale(1.3); 
              opacity: 1; 
            }
          }

          @keyframes progressFill {
            0% { 
              width: 0%; 
              background-position: 0% 50%; 
            }
            50% { 
              width: 70%; 
              background-position: 100% 50%; 
            }
            100% { 
              width: 100%; 
              background-position: 200% 50%; 
            }
          }

          @keyframes progressGlow {
            0% { transform: translateX(-30px); }
            100% { transform: translateX(350px); }
          }

          @keyframes statFadeIn {
            from { 
              opacity: 0; 
              transform: translateX(-20px); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }

          @keyframes iconPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
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
      {/* Suppression du podium du classement mensuel - gardé seulement dans index.js */}
      
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
                {/* Avatar utilisateur */}
                <span className={styles.userAvatar}>
                  {post.user.avatar_url ? (
                    <img
                      src={post.user.avatar_url}
                      alt={post.user.name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #f3f4f6',
                        background: '#fffbe6'
                      }}
                    />
                  ) : (
                    post.user.name?.charAt(0)?.toUpperCase() || post.user.emoji || '👤'
                  )}
                </span>
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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