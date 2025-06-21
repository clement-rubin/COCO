import { useState, useEffect } from 'react'
import Image from 'next/image'
import ShareButton from './ShareButton'
import UserProfilePreview from './UserProfilePreview'
import { showRecipeLikeInteractionNotification } from '../utils/notificationUtils'
import styles from '../styles/SocialFeed.module.css'
import { getRecipeImageUrl } from '../lib/supabase'

export default function SocialFeed() {
  const [posts, setPosts] = useState([])
  const [userLikes, setUserLikes] = useState(new Set())
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [activePost, setActivePost] = useState(null)
  const [profilePreview, setProfilePreview] = useState({
    isVisible: false,
    user: null,
    position: null
  })

  // Données simulées pour le feed social
  useEffect(() => {
    const mockPosts = [
      {
        id: 1,
        user: { name: 'Marie Dubois', avatar: '👩‍🍳', verified: true },
        recipe: {
          id: 1,
          title: 'Pâtes Carbonara Authentiques',
          image: getRecipeImageUrl('https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5'),
          description: 'Ma recette familiale de carbonara, transmise par ma nonna italienne 🇮🇹'
        },
        likes: 156,
        shares: 23,
        timeAgo: '2h',
        tags: ['#italien', '#authentique', '#famille']
      },
      {
        id: 2,
        user: { name: 'Chef Pierre', avatar: '👨‍🍳', verified: true },
        recipe: {
          id: 2,
          title: 'Tarte Tatin Revisitée',
          image: getRecipeImageUrl('https://images.unsplash.com/photo-1571115764595-644a1f56a55c'),
          description: 'Une version moderne du classique français 🍎✨'
        },
        likes: 289,
        shares: 45,
        timeAgo: '4h',
        tags: ['#français', '#dessert', '#modernité']
      }
    ]
    setPosts(mockPosts)
  }, [])

  const toggleLike = (postId) => {
    const post = posts.find(p => p.id === postId)
    const isLiking = !userLikes.has(postId)
    
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
        
        // Déclencher une notification pour l'auteur du post
        if (post && post.user.name !== 'Vous') { // Supposons que "Vous" indique l'utilisateur actuel
          showRecipeLikeInteractionNotification(
            {
              id: post.recipe.id,
              title: post.recipe.title,
              image: post.recipe.image
            },
            {
              user_id: 'current_user_id', // À remplacer par l'ID de l'utilisateur actuel
              display_name: 'Utilisateur actuel' // À remplacer par le nom de l'utilisateur actuel
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
          animation: heartFloat 1s ease-out forwards;
        `
        document.body.appendChild(heart)
        setTimeout(() => heart.remove(), 1000)
      }
      return newLikes
    })
  }

  const addComment = (postId) => {
    if (!newComment.trim()) return
    
    const comment = {
      id: Date.now(),
      user: 'Vous',
      text: newComment,
      timeAgo: 'maintenant'
    }
    
    setComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), comment]
    }))
    
    setNewComment('')
  }

  const handleShare = (platform, post) => {
    setPosts(posts.map(p => 
      p.id === post.id 
        ? { ...p, shares: p.shares + 1 }
        : p
    ))
  }

  const handleUserNameClick = (user, event) => {
    event.stopPropagation()
    const rect = event.target.getBoundingClientRect()
    setProfilePreview({
      isVisible: true,
      user: {
        user_id: user.id || user.user_id,
        display_name: user.name,
        bio: 'Chef passionné de la communauté COCO',
        avatar_url: null
      },
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    })
  }

  const closeProfilePreview = () => {
    setProfilePreview({
      isVisible: false,
      user: null,
      position: null
    })
  }

  return (
    <>
      <div className={styles.feed}>
        <div className={styles.feedHeader}>
          <h2>🔥 Tendances du moment</h2>
          <p>Découvrez les créations les plus populaires de la communauté</p>
        </div>

        {posts.map(post => (
          <article key={post.id} className={styles.post}>
            <div className={styles.postHeader}>
              <div className={styles.userInfo}>
                <span className={styles.avatar}>{post.user.avatar}</span>
                <div>
                  <div 
                    className={styles.userName}
                    onClick={(e) => handleUserNameClick(post.user, e)}
                  >
                    {post.user.name}
                    {post.user.verified && <span className={styles.verified}>✅</span>}
                  </div>
                  <div className={styles.timeAgo}>{post.timeAgo}</div>
                </div>
              </div>
              <button className={styles.followBtn}>+ Suivre</button>
            </div>

            <div className={styles.recipeContent}>
              <div className={styles.imageContainer}>
                <Image
                  src={post.recipe.image}
                  alt={post.recipe.title}
                  fill
                  className={styles.recipeImage}
                  onDoubleClick={() => toggleLike(post.id)}
                />
                <div className={styles.imageOverlay}>
                  <button 
                    className={`${styles.likeBtn} ${userLikes.has(post.id) ? styles.liked : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    {userLikes.has(post.id) ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>
              
              <div className={styles.recipeInfo}>
                <h3>{post.recipe.title}</h3>
                <p>{post.recipe.description}</p>
                <div className={styles.tags}>
                  {post.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.postStats}>
              <span>❤️ {post.likes} likes</span>
              <span>💬 {(comments[post.id] || []).length} commentaires</span>
              <span>📤 {post.shares} partages</span>
            </div>

            <div className={styles.postActions}>
              <button 
                className={`${styles.actionBtn} ${userLikes.has(post.id) ? styles.active : ''}`}
                onClick={() => toggleLike(post.id)}
              >
                {userLikes.has(post.id) ? '❤️' : '🤍'} J'aime
              </button>
              
              <button 
                className={styles.actionBtn}
                onClick={() => setActivePost(activePost === post.id ? null : post.id)}
              >
                💬 Commenter
              </button>
              
              <ShareButton 
                recipe={post.recipe}
                onShare={(platform) => handleShare(platform, post)}
              />
            </div>

            {activePost === post.id && (
              <div className={styles.commentsSection}>
                <div className={styles.comments}>
                  {(comments[post.id] || []).map(comment => (
                    <div key={comment.id} className={styles.comment}>
                      <strong>{comment.user}:</strong> {comment.text}
                      <span className={styles.commentTime}>{comment.timeAgo}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.addComment}>
                  <input
                    type="text"
                    placeholder="Ajouter un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                    className={styles.commentInput}
                  />
                  <button 
                    onClick={() => addComment(post.id)}
                    className={styles.sendComment}
                  >
                    ➤
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}

        {/* Aperçu du profil utilisateur */}
        <UserProfilePreview
          user={profilePreview.user}
          isVisible={profilePreview.isVisible}
          onClose={closeProfilePreview}
          position={profilePreview.position}
        />
      </div>      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-50px) scale(1.5);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-100px) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
