import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/FriendsFeed.module.css'

export default function FriendsFeed() {
  const [posts, setPosts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userLikes, setUserLikes] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)

  // Données simulées de recettes d'amis
  const mockPosts = [
    {
      id: 1,
      user: { name: 'Marie Dubois', avatar: '👩‍🍳', status: 'En ligne' },
      recipe: {
        title: 'Tarte aux fraises maison',
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187',
        description: 'Ma première tarte aux fraises de la saison ! 🍓✨'
      },
      likes: 24,
      timeAgo: '5 min',
      category: 'Dessert'
    },
    {
      id: 2,
      user: { name: 'Pierre Martin', avatar: '👨‍🍳', status: 'Il y a 2h' },
      recipe: {
        title: 'Ramen maison épicé',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
        description: 'Premier essai de ramen fait maison, trop bon ! 🍜🔥'
      },
      likes: 67,
      timeAgo: '1h',
      category: 'Asiatique'
    },
    {
      id: 3,
      user: { name: 'Sophie Laurent', avatar: '👩‍🦳', status: 'En ligne' },
      recipe: {
        title: 'Salade quinoa avocat',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        description: 'Déjeuner healthy et coloré pour bien commencer la semaine 🥑💚'
      },
      likes: 43,
      timeAgo: '3h',
      category: 'Healthy'
    },
    {
      id: 4,
      user: { name: 'Lucas Moreau', avatar: '👨‍🦱', status: 'Hier' },
      recipe: {
        title: 'Pizza margherita authentique',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b',
        description: 'Pizza maison avec de la vraie mozzarella di bufala 🍕🇮🇹'
      },
      likes: 89,
      timeAgo: '6h',
      category: 'Italien'
    },
    {
      id: 5,
      user: { name: 'Emma Petit', avatar: '👩‍🦰', status: 'En ligne' },
      recipe: {
        title: 'Smoothie bowl tropical',
        image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38',
        description: 'Petit-déjeuner vitaminé avec mangue et fruits de la passion 🥭🌴'
      },
      likes: 52,
      timeAgo: '4h',
      category: 'Petit-déj'
    }
  ]

  useEffect(() => {
    // Simuler le chargement de données
    setIsLoading(true)
    setTimeout(() => {
      setPosts(mockPosts)
      setIsLoading(false)
    }, 500)
  }, [])

  const handleScroll = (e) => {
    const container = e.target
    const scrollPercent = container.scrollLeft / (container.scrollWidth - container.clientWidth)
    const newIndex = Math.round(scrollPercent * (posts.length - 1))
    setCurrentIndex(newIndex)
  }

  const scrollToPost = (index) => {
    if (containerRef.current) {
      const container = containerRef.current
      const scrollAmount = (container.scrollWidth / posts.length) * index
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const toggleLike = (postId, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    setUserLikes(prev => {
      const newLikes = new Set(prev)
      if (newLikes.has(postId)) {
        newLikes.delete(postId)
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes - 1 }
            : post
        ))
      } else {
        newLikes.add(postId)
        setPosts(posts.map(post => 
          post.id === postId 
            ? { ...post, likes: post.likes + 1 }
            : post
        ))
        
        // Animation de like
        const heart = document.createElement('div')
        heart.innerHTML = '❤️'
        heart.style.cssText = `
          position: fixed;
          font-size: 2rem;
          z-index: 10000;
          pointer-events: none;
          animation: heartFloat 1s ease-out forwards;
          left: ${e.clientX - 16}px;
          top: ${e.clientY - 16}px;
        `
        document.body.appendChild(heart)
        setTimeout(() => heart.remove(), 1000)
      }
      return newLikes
    })
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>🔄</div>
        <p>Chargement des dernières créations...</p>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      {/* Stories-like horizontal scroll */}
      <div 
        ref={containerRef}
        className={styles.horizontalScroll}
        onScroll={handleScroll}
      >
        {posts.map((post, index) => (
          <div key={post.id} className={styles.postCard}>
            <Link href={`/recipes/${post.id}`} className={styles.postLink}>
              <div className={styles.imageContainer}>
                <Image
                  src={post.recipe.image}
                  alt={post.recipe.title}
                  fill
                  className={styles.recipeImage}
                  onDoubleClick={(e) => toggleLike(post.id, e)}
                />
                <div className={styles.gradient} />
                
                {/* User info overlay */}
                <div className={styles.userOverlay}>
                  <div className={styles.userInfo}>
                    <span className={styles.userAvatar}>{post.user.avatar}</span>
                    <div>
                      <span className={styles.userName}>{post.user.name}</span>
                      <span className={styles.timeAgo}>{post.timeAgo}</span>
                    </div>
                  </div>
                  
                  <div className={styles.categoryBadge}>
                    {post.category}
                  </div>
                </div>

                {/* Recipe info overlay */}
                <div className={styles.recipeOverlay}>
                  <h3 className={styles.recipeTitle}>{post.recipe.title}</h3>
                  <p className={styles.recipeDescription}>{post.recipe.description}</p>
                  
                  <div className={styles.engagement}>
                    <button 
                      className={`${styles.likeBtn} ${userLikes.has(post.id) ? styles.liked : ''}`}
                      onClick={(e) => toggleLike(post.id, e)}
                    >
                      {userLikes.has(post.id) ? '❤️' : '🤍'} {post.likes}
                    </button>
                    <span className={styles.viewCount}>👁️ {Math.floor(Math.random() * 200) + 50}</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Dots indicator */}
      <div className={styles.dotsContainer}>
        {posts.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
            onClick={() => scrollToPost(index)}
          />
        ))}
      </div>

      {/* Quick actions for current post */}
      <div className={styles.quickActions}>
        <button className={styles.actionBtn}>
          💬 Commenter
        </button>
        <button className={styles.actionBtn}>
          📤 Partager
        </button>
        <button className={styles.actionBtn}>
          📖 Voir recette
        </button>
      </div>

      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
