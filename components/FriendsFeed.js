import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from './AuthContext'
import styles from '../styles/FriendsFeed.module.css'

export default function FriendsFeed({ feedType = 'friends' }) {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userLikes, setUserLikes] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)

  // Données simulées enrichies basées sur le type de feed
  const generateFriendsData = (type) => {
    const baseFriends = [
      { id: 'marie123', name: 'Marie Dubois', avatar: '👩‍🍳', status: 'En ligne', isBestFriend: true },
      { id: 'pierre_chef', name: 'Pierre Martin', avatar: '👨‍🍳', status: 'Il y a 2h', isBestFriend: true },
      { id: 'sophie_pat', name: 'Sophie Laurent', avatar: '👩‍🦳', status: 'En ligne', isBestFriend: false },
      { id: 'lucas_cook', name: 'Lucas Moreau', avatar: '👨‍🦱', status: 'Hier', isBestFriend: true },
      { id: 'emma_green', name: 'Emma Petit', avatar: '👩‍🦰', status: 'En ligne', isBestFriend: false },
      { id: 'tom_grill', name: 'Tom Barbier', avatar: '🧔', status: 'Il y a 3h', isBestFriend: true },
      { id: 'julie_sweet', name: 'Julie Sucré', avatar: '👱‍♀️', status: 'Il y a 1h', isBestFriend: false },
      { id: 'alex_fusion', name: 'Alex Fusion', avatar: '🧑‍🦱', status: 'En ligne', isBestFriend: true }
    ]

    const recipes = [
      {
        title: 'Tarte aux fraises du jardin',
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187',
        description: 'Première récolte de fraises du jardin ! 🍓✨',
        category: 'Dessert',
        timeAgo: '5 min',
        likes: 24,
        location: 'Chez moi'
      },
      {
        title: 'Ramen maison épicé',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
        description: 'Premier essai de ramen fait maison, trop bon ! 🍜🔥',
        category: 'Asiatique',
        timeAgo: '1h',
        likes: 67,
        location: 'Ma cuisine'
      },
      {
        title: 'Salade quinoa avocat colorée',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        description: 'Déjeuner healthy pour bien commencer la semaine 🥑💚',
        category: 'Healthy',
        timeAgo: '3h',
        likes: 43,
        location: 'Bureau'
      },
      {
        title: 'Pizza margherita authentique',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b',
        description: 'Pizza maison avec mozzarella di bufala 🍕🇮🇹',
        category: 'Italien',
        timeAgo: '6h',
        likes: 89,
        location: 'Cuisine'
      },
      {
        title: 'Smoothie bowl tropical',
        image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38',
        description: 'Petit-déjeuner vitaminé mangue passion 🥭🌴',
        category: 'Petit-déj',
        timeAgo: '4h',
        likes: 52,
        location: 'Terrasse'
      },
      {
        title: 'Burger gourmet BBQ',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
        description: 'Soirée BBQ entre amis, un délice ! 🍔🔥',
        category: 'BBQ',
        timeAgo: '8h',
        likes: 76,
        location: 'Jardin'
      },
      {
        title: 'Tarte citron meringuée',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587',
        description: 'Recette de grand-mère revisitée 🍋✨',
        category: 'Pâtisserie',
        timeAgo: '12h',
        likes: 94,
        location: 'Atelier'
      },
      {
        title: 'Curry vert thaï épicé',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
        description: 'Voyage gustatif en Thaïlande 🌶️🥥',
        category: 'Exotique',
        timeAgo: '1j',
        likes: 61,
        location: 'Ma cuisine'
      }
    ]

    // Filtrer selon le type de feed
    let filteredFriends = baseFriends
    if (type === 'friends') {
      filteredFriends = baseFriends.filter(friend => friend.isBestFriend)
    }

    return filteredFriends.map((friend, index) => ({
      id: `${friend.id}_${index}`,
      user: friend,
      recipe: recipes[index % recipes.length],
      isStory: Math.random() > 0.7, // 30% chance d'être une story
      viewCount: 50 + Math.floor(Math.random() * 200)
    }))
  }

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      const friendsData = generateFriendsData(feedType)
      setPosts(friendsData)
      setIsLoading(false)
    }, 500)
  }, [feedType])

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
        <p>Chargement des photos de tes amis...</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--spacing-xl)',
        color: 'var(--text-medium)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>👥</div>
        <h3 style={{ color: 'var(--primary-orange)', marginBottom: 'var(--spacing-sm)' }}>
          Aucune photo d'amis
        </h3>
        <p>Invite tes amis à rejoindre COCO pour voir leurs créations !</p>
        <button style={{
          background: 'linear-gradient(135deg, var(--primary-orange), var(--primary-orange-dark))',
          color: 'white',
          border: 'none',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--border-radius-medium)',
          fontWeight: '600',
          cursor: 'pointer',
          marginTop: 'var(--spacing-md)'
        }}>
          Inviter des amis
        </button>
      </div>
    )
  }

  return (
    <div className={styles.feedContainer}>
      {/* En-tête du feed */}
      <div style={{
        background: 'white',
        padding: 'var(--spacing-lg)',
        margin: '0 var(--spacing-md) var(--spacing-lg)',
        borderRadius: 'var(--border-radius-large)',
        boxShadow: 'var(--shadow-light)',
        textAlign: 'center'
      }}>
        <h2 style={{
          color: 'var(--primary-orange)',
          margin: '0 0 var(--spacing-sm) 0',
          fontFamily: "'Playfair Display', serif"
        }}>
          {feedType === 'friends' ? '👥 Tes amis proches' : 
           feedType === 'recent' ? '🕒 Photos récentes' :
           feedType === 'popular' ? '🔥 Photos populaires' : '📸 Photos de tes amis'}
        </h2>
        <p style={{ color: 'var(--text-medium)', margin: 0 }}>
          {posts.length} {posts.length > 1 ? 'nouvelles créations' : 'nouvelle création'}
        </p>
      </div>

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
                
                {/* User info overlay avec badge d'ami proche */}
                <div className={styles.userOverlay}>
                  <div className={styles.userInfo}>
                    <span className={styles.userAvatar}>{post.user.avatar}</span>
                    <div>
                      <span className={styles.userName}>
                        {post.user.name}
                        {post.user.isBestFriend && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            marginLeft: '4px',
                            color: '#FFD700' 
                          }}>⭐</span>
                        )}
                      </span>
                      <span className={styles.timeAgo}>
                        📍 {post.recipe.location} • {post.recipe.timeAgo}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.categoryBadge}>
                    {post.recipe.category}
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
                      {userLikes.has(post.id) ? '❤️' : '🤍'} {post.recipe.likes}
                    </button>
                    <span className={styles.viewCount}>👁️ {post.viewCount}</span>
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
