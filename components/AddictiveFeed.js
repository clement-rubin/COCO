import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction } from '../utils/logger'
import styles from '../styles/AddictiveFeed.module.css'

// Générateur de contenu varié
const generateRandomPosts = (startIndex = 0, count = 10) => {
  const users = [
    { id: 'marie123', name: 'Marie Dubois', avatar: '👩‍🍳', verified: true, followers: 2400 },
    { id: 'chef_pierre', name: 'Chef Pierre', avatar: '👨‍🍳', verified: true, followers: 15600 },
    { id: 'emma_healthy', name: 'Emma Green', avatar: '🌱', verified: false, followers: 890 },
    { id: 'lucas_baker', name: 'Lucas Baker', avatar: '🧑‍🍳', verified: true, followers: 5200 },
    { id: 'sophie_patiss', name: 'Sophie Patiss', avatar: '👩‍🦳', verified: true, followers: 8900 },
    { id: 'tom_bbq', name: 'Tom BBQ', avatar: '🔥', verified: false, followers: 3400 },
    { id: 'nina_vegan', name: 'Nina Vegan', avatar: '🥬', verified: true, followers: 12000 },
    { id: 'alex_fusion', name: 'Alex Fusion', avatar: '🌍', verified: false, followers: 1800 }
  ]

  const recipeTemplates = [
    {
      titles: ['Pasta Carbonara Authentique', 'Spaghetti Aglio e Olio', 'Risotto aux Champignons', 'Lasagnes Maison'],
      category: 'Italien',
      tags: ['#italien', '#pasta', '#authentique', '#fait-maison'],
      images: [
        'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5',
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
        'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d',
        'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb'
      ]
    },
    {
      titles: ['Tarte aux Fraises', 'Tiramisu Classique', 'Éclair au Chocolat', 'Crème Brûlée'],
      category: 'Dessert',
      tags: ['#dessert', '#sucré', '#pâtisserie', '#french'],
      images: [
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187',
        'https://images.unsplash.com/photo-1571115764595-644a1f56a55c',
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
        'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3'
      ]
    },
    {
      titles: ['Buddha Bowl Coloré', 'Smoothie Bowl Tropical', 'Salade Quinoa Avocat', 'Wrap Végétarien'],
      category: 'Healthy',
      tags: ['#healthy', '#végétarien', '#coloré', '#équilibré'],
      images: [
        'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        'https://images.unsplash.com/photo-1540420773420-3366772f4999',
        'https://images.unsplash.com/photo-1547592180-85f173990554'
      ]
    },
    {
      titles: ['Ramen Épicé Maison', 'Pad Thaï Authentique', 'Sushi Rolls', 'Curry Vert Thaï'],
      category: 'Asiatique',
      tags: ['#asiatique', '#épicé', '#authentique', '#umami'],
      images: [
        'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
        'https://images.unsplash.com/photo-1559181567-c3190ca9959b',
        'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
      ]
    },
    {
      titles: ['Burger Gourmet BBQ', 'Côtes de Porc Laquées', 'Pulled Pork Sandwich', 'Ribs Fumés'],
      category: 'BBQ',
      tags: ['#bbq', '#grillé', '#fumé', '#carnivore'],
      images: [
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5',
        'https://images.unsplash.com/photo-1586190848861-99aa4a171e90',
        'https://images.unsplash.com/photo-1561758033-d89a9ad46330'
      ]
    }
  ]

  const descriptions = [
    "Ma recette secrète transmise par ma grand-mère ! 👵✨",
    "Premier essai et c'est un succès total ! 🎉",
    "La technique qui change tout, vous allez adorer ! 💫",
    "Recette healthy et délicieuse, parfaite pour l'été ! ☀️",
    "Mon nouveau plat préféré, addictif ! 😍",
    "Technique de chef à la maison ! 👨‍🍳",
    "Comfort food qui réchauffe le cœur ! ❤️",
    "Explosion de saveurs garantie ! 💥"
  ]

  return Array.from({ length: count }, (_, i) => {
    const index = startIndex + i
    const user = users[index % users.length]
    const template = recipeTemplates[index % recipeTemplates.length]
    const title = template.titles[index % template.titles.length]
    const description = descriptions[index % descriptions.length]
    
    // Sélectionner 2-4 images aléatoires du template
    const imageCount = 2 + (index % 3) // 2, 3, ou 4 images
    const shuffledImages = [...template.images].sort(() => Math.random() - 0.5)
    const selectedImages = shuffledImages.slice(0, imageCount)

    return {
      id: `post_${index}`,
      type: index % 5 === 0 ? 'challenge' : 'recipe',
      user: {
        ...user,
        isFollowing: Math.random() > 0.7
      },
      recipe: {
        id: `recipe_${index}`,
        title,
        description,
        media: selectedImages.map((url, mediaIndex) => ({
          type: mediaIndex === 0 && Math.random() > 0.7 ? 'video' : 'image',
          url,
          duration: mediaIndex === 0 ? 15 : 5
        })),
        tags: [...template.tags],
        difficulty: ['Facile', 'Moyen', 'Difficile'][index % 3],
        prepTime: `${10 + (index % 20)} min`,
        cookTime: `${15 + (index % 30)} min`,
        portions: 2 + (index % 6),
        likes: 50 + Math.floor(Math.random() * 2000),
        comments: 5 + Math.floor(Math.random() * 200),
        saves: 10 + Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 100),
        category: template.category
      },
      timeAgo: ['5min', '15min', '1h', '2h', '4h', '1j'][index % 6],
      location: ['Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France'][index % 4],
      music: [
        'Cooking Vibes - Lofi Hip Hop',
        'Kitchen Beats - Chill Mix',
        'Food Mood - Jazz Café',
        'Cooking Time - Acoustic'
      ][index % 4]
    }
  })
}

export default function AddictiveFeed() {
  const router = useRouter()
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
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
    loadInitialPosts()
  }, [])

  const loadInitialPosts = async () => {
    setLoading(true)
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const initialPosts = generateRandomPosts(0, 10)
    setPosts(initialPosts)
    setPage(1)
    setLoading(false)
  }

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return
    
    setLoadingMore(true)
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const newPosts = generateRandomPosts(page * 10, 10)
    setPosts(prev => [...prev, ...newPosts])
    setPage(prev => prev + 1)
    setLoadingMore(false)
    
    // Simuler une fin éventuelle (très lointaine)
    if (page > 50) {
      setHasMore(false)
    }
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
          const post = posts[index]
          
          if (entry.isIntersecting) {
            setCurrentIndex(index)
            
            // Démarrer la rotation des médias
            if (post?.recipe?.media?.length > 1) {
              startMediaRotation(post.id, post.recipe.media.length)
            }
            
            // Autoplay vidéo si c'est le média actuel
            const currentMedia = currentMediaIndex[post?.id] || 0
            if (post?.recipe?.media?.[currentMedia]?.type === 'video') {
              const video = videoRefs.current[`${post.id}_${currentMedia}`]
              if (video) {
                video.play().catch(() => {})
              }
            }
            
            // Précharger le post suivant
            if (index >= posts.length - 3 && hasMore && !loadingMore) {
              loadMorePosts()
            }
            
            logUserInteraction('VIEW_POST', 'addictive-feed', {
              postId: post?.id,
              postType: post?.type,
              index,
              mediaCount: post?.recipe?.media?.length || 0
            })
          } else {
            // Arrêter la rotation des médias
            if (post) {
              stopMediaRotation(post.id)
            }
            
            // Pause toutes les vidéos du post
            post?.recipe?.media?.forEach((_, mediaIndex) => {
              const video = videoRefs.current[`${post.id}_${mediaIndex}`]
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
  }, [posts, currentMediaIndex, hasMore, loadingMore])

  // Actions utilisateur
  const toggleLike = useCallback(async (postId) => {
    setUserActions(prev => {
      const newLikes = new Set(prev.likes)
      if (newLikes.has(postId)) {
        newLikes.delete(postId)
      } else {
        newLikes.add(postId)
        
        // Animation de like explosive améliorée
        const hearts = ['❤️', '💖', '💕', '💓', '💗', '🧡', '💛']
        for (let i = 0; i < 8; i++) {
          setTimeout(() => {
            const heart = document.createElement('div')
            heart.innerHTML = hearts[Math.floor(Math.random() * hearts.length)]
            heart.style.cssText = `
              position: fixed;
              font-size: ${1.2 + Math.random() * 0.8}rem;
              z-index: 10000;
              pointer-events: none;
              animation: heartExplode ${0.8 + Math.random() * 0.6}s ease-out forwards;
              left: ${window.innerWidth * 0.8 + Math.random() * 60 - 30}px;
              top: ${window.innerHeight * 0.4 + Math.random() * 200}px;
            `
            document.body.appendChild(heart)
            setTimeout(() => heart.remove(), 1400)
          }, i * 80)
        }
        
        if (navigator.vibrate) {
          navigator.vibrate([30, 20, 30])
        }
      }
      
      return { ...prev, likes: newLikes }
    })
    
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = userActions.likes.has(postId)
        return {
          ...post,
          recipe: {
            ...post.recipe,
            likes: post.recipe.likes + (isLiked ? -1 : 1)
          }
        }
      }
      return post
    }))
  }, [userActions.likes])

  const toggleSave = useCallback((postId) => {
    setUserActions(prev => {
      const newSaves = new Set(prev.saves)
      const wasSaved = newSaves.has(postId)
      
      if (wasSaved) {
        newSaves.delete(postId)
      } else {
        newSaves.add(postId)
        
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
      
      return { ...prev, saves: newSaves }
    })
  }, [])

  const toggleFollow = useCallback((userId) => {
    setUserActions(prev => {
      const newFollows = new Set(prev.follows)
      if (newFollows.has(userId)) {
        newFollows.delete(userId)
      } else {
        newFollows.add(userId)
      }
      return { ...prev, follows: newFollows }
    })
    
    setPosts(prev => prev.map(post => {
      if (post.user.id === userId) {
        return {
          ...post,
          user: {
            ...post.user,
            isFollowing: !post.user.isFollowing
          }
        }
      }
      return post
    }))
  }, [])

  const openRecipe = useCallback((recipeId) => {
    router.push(`/recipe/${recipeId}`)
  }, [router])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.cookingLoader}>
          <div className={styles.chef}>👨‍🍳</div>
          <div className={styles.sparkles}>✨✨✨</div>
        </div>
        <p>Préparation du festin culinaire...</p>
        <div className={styles.loadingTips}>
          <span>🔥 Contenu personnalisé</span>
          <span>📱 Défilement infini</span>
          <span>🎬 Médias optimisés</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer} ref={containerRef}>
      {posts.map((post, index) => {
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
            <div className={styles.mediaContainer}>
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
              <div className={styles.userDetails}>
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
            <div className={styles.content}>
              <div className={styles.recipeContent}>
                <h2>{post.recipe.title}</h2>
                <p>{post.recipe.description}</p>
                <div className={styles.recipeBadges}>
                  <span>⏱️ {post.recipe.prepTime}</span>
                  <span>🔥 {post.recipe.difficulty}</span>
                  <span>👥 {post.recipe.portions}</span>
                  <span>📂 {post.recipe.category}</span>
                </div>
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

              <button className={styles.actionBtn}>
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

              <button className={styles.actionBtn}>
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

            {/* Music info */}
            {post.music && (
              <div className={styles.musicInfo}>
                <span className={styles.musicIcon}>🎵</span>
                <span className={styles.musicText}>{post.music}</span>
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
      `}</style>
    </div>
  )
}
