import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logUserInteraction } from '../utils/logger'
import styles from '../styles/AddictiveFeed.module.css'

export default function AddictiveFeed() {
  const router = useRouter()
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userActions, setUserActions] = useState({
    likes: new Set(),
    saves: new Set(),
    follows: new Set()
  })
  const [showComments, setShowComments] = useState(null)
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  
  const containerRef = useRef(null)
  const videoRefs = useRef({})
  const intersectionObserver = useRef(null)

  // Données simulées pour le feed addictif
  const mockPosts = [
    {
      id: 1,
      type: 'recipe',
      user: {
        id: 'marie123',
        name: 'Marie Dubois',
        avatar: '👩‍🍳',
        verified: true,
        followers: 2400,
        isFollowing: false
      },
      recipe: {
        id: 'rec1',
        title: 'Pasta Carbonara Authentique',
        description: 'La vraie recette italienne de ma nonna ! Aucune crème, juste des œufs, du pecorino et beaucoup d\'amour 🇮🇹✨',
        media: [
          { type: 'image', url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5', duration: 5 },
          { type: 'video', url: '/videos/carbonara-cooking.mp4', duration: 15 },
          { type: 'image', url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141', duration: 5 }
        ],
        tags: ['#italien', '#authentique', '#pasta', '#carbonara'],
        difficulty: 'Moyen',
        prepTime: '15 min',
        cookTime: '10 min',
        portions: 4,
        likes: 1247,
        comments: 89,
        saves: 342,
        shares: 67
      },
      timeAgo: '2h',
      location: 'Rome, Italie',
      music: 'Italian Vibes - Cooking Playlist'
    },
    {
      id: 2,
      type: 'challenge',
      user: {
        id: 'chef_pierre',
        name: 'Chef Pierre',
        avatar: '👨‍🍳',
        verified: true,
        followers: 15600,
        isFollowing: true
      },
      challenge: {
        id: 'challenge_weekly_1',
        title: 'Défi Soufflé Parfait',
        description: 'Relevez le défi de la semaine : réalisez un soufflé qui ne retombe pas ! 🥧⬆️',
        rewardPoints: 500,
        participants: 1203,
        timeLeft: '3j 12h',
        media: [
          { type: 'video', url: '/videos/souffle-challenge.mp4', duration: 30 }
        ]
      },
      timeAgo: '4h'
    },
    {
      id: 3,
      type: 'story',
      user: {
        id: 'emma_healthy',
        name: 'Emma Green',
        avatar: '🌱',
        verified: false,
        followers: 890,
        isFollowing: false
      },
      story: {
        id: 'story_1',
        title: 'Mon petit-déj healthy',
        description: 'Smoothie bowl avocat-banane pour bien commencer la journée ! 💚',
        media: [
          { type: 'image', url: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38', duration: 3 }
        ],
        expiresIn: '16h'
      },
      timeAgo: '30min'
    }
  ]

  // Charger les posts
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true)
      // Simuler un appel API
      setTimeout(() => {
        setPosts(mockPosts)
        setLoading(false)
      }, 1000)
    }
    
    loadPosts()
  }, [])

  // Observer d'intersection pour l'autoplay et les métriques
  useEffect(() => {
    intersectionObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.dataset.index)
          
          if (entry.isIntersecting) {
            setCurrentIndex(index)
            
            // Autoplay vidéo
            const video = videoRefs.current[index]
            if (video) {
              video.play().catch(() => {})
            }
            
            // Log vue
            logUserInteraction('VIEW_POST', 'addictive-feed', {
              postId: posts[index]?.id,
              postType: posts[index]?.type,
              index,
              viewDuration: 0
            })
          } else {
            // Pause vidéo
            const video = videoRefs.current[index]
            if (video) {
              video.pause()
            }
          }
        })
      },
      { threshold: 0.7 }
    )

    return () => {
      if (intersectionObserver.current) {
        intersectionObserver.current.disconnect()
      }
    }
  }, [posts])

  // Actions utilisateur
  const toggleLike = useCallback(async (postId) => {
    setUserActions(prev => {
      const newLikes = new Set(prev.likes)
      if (newLikes.has(postId)) {
        newLikes.delete(postId)
      } else {
        newLikes.add(postId)
        
        // Animation de like explosive
        const hearts = ['❤️', '💖', '💕', '💓', '💗']
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const heart = document.createElement('div')
            heart.innerHTML = hearts[Math.floor(Math.random() * hearts.length)]
            heart.style.cssText = `
              position: fixed;
              font-size: ${1.5 + Math.random()}rem;
              z-index: 10000;
              pointer-events: none;
              animation: heartExplode ${0.8 + Math.random() * 0.4}s ease-out forwards;
              left: ${Math.random() * window.innerWidth}px;
              top: ${window.innerHeight * 0.3 + Math.random() * window.innerHeight * 0.4}px;
            `
            document.body.appendChild(heart)
            setTimeout(() => heart.remove(), 1200)
          }, i * 100)
        }
        
        // Vibration
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50])
        }
      }
      
      return { ...prev, likes: newLikes }
    })
    
    // Mettre à jour le compteur dans le post
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = userActions.likes.has(postId)
        return {
          ...post,
          recipe: post.recipe ? {
            ...post.recipe,
            likes: post.recipe.likes + (isLiked ? -1 : 1)
          } : post.recipe
        }
      }
      return post
    }))
  }, [userActions.likes])

  const toggleSave = useCallback((postId) => {
    setUserActions(prev => {
      const newSaves = new Set(prev.saves)
      if (newSaves.has(postId)) {
        newSaves.delete(postId)
      } else {
        newSaves.add(postId)
        
        // Toast de confirmation
        const toast = document.createElement('div')
        toast.innerHTML = '⭐ Recette sauvegardée !'
        toast.style.cssText = `
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, var(--primary-coral), var(--primary-coral-dark));
          color: white;
          padding: 12px 20px;
          border-radius: 25px;
          z-index: 10000;
          animation: bounceIn 0.5s ease;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 2000)
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
  }, [])

  const openRecipe = useCallback((recipeId) => {
    router.push(`/recipe/${recipeId}`)
  }, [router])

  const sharePost = useCallback((post) => {
    if (navigator.share) {
      navigator.share({
        title: post.recipe?.title || post.challenge?.title,
        text: post.recipe?.description || post.challenge?.description,
        url: window.location.href
      })
    }
  }, [])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.cookingLoader}>
          <div className={styles.chef}>👨‍🍳</div>
          <div className={styles.sparkles}>✨✨✨</div>
        </div>
        <p>Préparation du festin...</p>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer} ref={containerRef}>
      {posts.map((post, index) => (
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
          {/* Media Container */}
          <div className={styles.mediaContainer}>
            {post.recipe?.media?.[0]?.type === 'video' ? (
              <video
                ref={(el) => { videoRefs.current[index] = el }}
                className={styles.media}
                src={post.recipe.media[0].url}
                loop
                muted
                playsInline
              />
            ) : (
              <Image
                src={post.recipe?.media?.[0]?.url || post.challenge?.media?.[0]?.url || post.story?.media?.[0]?.url}
                alt={post.recipe?.title || post.challenge?.title || post.story?.title}
                fill
                className={styles.media}
                priority={index < 2}
              />
            )}
            
            {/* Gradient overlay */}
            <div className={styles.gradientOverlay} />
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
              className={`${styles.followBtn} ${userActions.follows.has(post.user.id) ? styles.following : ''}`}
            >
              {userActions.follows.has(post.user.id) ? 'Suivi ✓' : '+ Suivre'}
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {post.type === 'recipe' && (
              <div className={styles.recipeContent}>
                <h2>{post.recipe.title}</h2>
                <p>{post.recipe.description}</p>
                <div className={styles.recipeBadges}>
                  <span>⏱️ {post.recipe.prepTime}</span>
                  <span>🔥 {post.recipe.difficulty}</span>
                  <span>👥 {post.recipe.portions}</span>
                </div>
                <div className={styles.tags}>
                  {post.recipe.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {post.type === 'challenge' && (
              <div className={styles.challengeContent}>
                <div className={styles.challengeBadge}>🏆 DÉFI</div>
                <h2>{post.challenge.title}</h2>
                <p>{post.challenge.description}</p>
                <div className={styles.challengeStats}>
                  <span>🎯 {post.challenge.rewardPoints} points</span>
                  <span>👥 {post.challenge.participants} participants</span>
                  <span>⏰ {post.challenge.timeLeft}</span>
                </div>
              </div>
            )}
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
                {post.recipe?.likes || '0'}
              </span>
            </button>

            <button
              onClick={() => setShowComments(post.id)}
              className={styles.actionBtn}
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
              onClick={() => sharePost(post)}
              className={styles.actionBtn}
            >
              <span className={styles.actionIcon}>📤</span>
            </button>

            {post.type === 'recipe' && (
              <button
                onClick={() => openRecipe(post.recipe.id)}
                className={styles.recipeBtn}
              >
                <span className={styles.actionIcon}>📝</span>
                <span className={styles.actionLabel}>Recette</span>
              </button>
            )}
          </div>

          {/* Music info */}
          {post.music && (
            <div className={styles.musicInfo}>
              <span className={styles.musicIcon}>🎵</span>
              <span className={styles.musicText}>{post.music}</span>
            </div>
          )}
        </div>
      ))}

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        @keyframes heartExplode {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 1;
          }
          100% {
            transform: scale(0.8) rotate(360deg) translateY(-100px);
            opacity: 0;
          }
        }
        
        @keyframes bounceIn {
          0% {
            transform: translateX(-50%) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scale(1.05);
          }
          70% {
            transform: translateX(-50%) scale(0.9);
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
