import { useState, useEffect } from 'react'
import Image from 'next/image'
import ShareButton from './ShareButton'
import UserProfilePreview from './UserProfilePreview'
import QuickCommentModal from './QuickCommentModal'
import { toggleRecipeLike, getMultipleRecipesLikesStats } from '../utils/likesUtils'
import { useAuth } from './AuthContext'
import styles from '../styles/SocialFeed.module.css'
import { getRecipeImageUrl } from '../lib/supabase'

export default function SocialFeed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [likesData, setLikesData] = useState({}) // Stockage des données de likes réelles
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [activePost, setActivePost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profilePreview, setProfilePreview] = useState({
    isVisible: false,
    user: null,
    position: null
  })
  
  // États pour le commentaire rapide
  const [quickCommentModal, setQuickCommentModal] = useState({
    isOpen: false,
    recipe: null
  })

  // Charger les posts et leurs likes
  useEffect(() => {
    loadSocialFeed()
  }, [])

  const loadSocialFeed = async () => {
    setLoading(true)
    try {
      // Charger les recettes publiques populaires
      const response = await fetch('/api/recipes?limit=20&sort=recent')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      
      const recipes = await response.json()
      
      // Formater les données pour le feed social avec mention cartes
      const formattedPosts = recipes.map(recipe => ({
        id: recipe.id,
        user: { 
          name: recipe.author || 'Chef Anonyme', 
          avatar: '👨‍🍳', 
          verified: Math.random() > 0.7,
          id: recipe.user_id 
        },
        recipe: {
          id: recipe.id,
          title: recipe.title,
          image: getRecipeImageUrl(recipe.image) || '/placeholder-recipe.jpg',
          description: recipe.description || 'Une délicieuse recette à découvrir !'
        },
        shares: Math.floor(Math.random() * 50) + 5,
        timeAgo: getTimeAgo(new Date(recipe.created_at)),
        tags: generateTags(recipe.category, recipe.title),
        hasCardBonus: Math.random() > 0.8 // 20% de chance d'avoir un bonus carte
      }))

      setPosts(formattedPosts)

      // Charger les statistiques de likes pour tous les posts
      const recipeIds = formattedPosts.map(post => post.recipe.id)
      const likesResult = await getMultipleRecipesLikesStats(recipeIds)
      
      if (likesResult.success) {
        setLikesData(likesResult.data)
      }

    } catch (error) {
      console.error('Erreur lors du chargement du feed social:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays}j`
    if (diffHours > 0) return `${diffHours}h`
    return '< 1h'
  }

  const generateTags = (category, title) => {
    const tags = []
    if (category) tags.push(`#${category.toLowerCase().replace(/\s+/g, '')}`)
    
    const commonTags = ['#delicieux', '#faitmaison', '#cuisine', '#recette']
    tags.push(commonTags[Math.floor(Math.random() * commonTags.length)])
    
    return tags.slice(0, 3)
  }

  const toggleLike = async (postId) => {
    if (!user) {
      const wantsToLogin = window.confirm('Connectez-vous pour aimer cette recette. Aller à la page de connexion?')
      if (wantsToLogin) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      }
      return
    }

    const post = posts.find(p => p.id === postId)
    if (!post) return

    const currentLikesData = likesData[postId] || { 
      likes_count: 0, 
      user_has_liked: false 
    }
    const isCurrentlyLiked = currentLikesData.user_has_liked

    try {
      // Optimistic update - UNE SEULE FOIS
      setLikesData(prev => ({
        ...prev,
        [postId]: {
          likes_count: currentLikesData.likes_count + (isCurrentlyLiked ? -1 : 1),
          user_has_liked: !isCurrentlyLiked
        }
      }))

      const result = await toggleRecipeLike(
        postId,
        user.id,
        isCurrentlyLiked,
        {
          id: post.recipe.id,
          title: post.recipe.title,
          image: post.recipe.image,
          user_id: post.user.id
        },
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Utilisateur'
        }
      )

      if (result.success && result.stats) {
        // Mettre à jour avec les vraies données du serveur - CORRECTION
        setLikesData(prev => ({
          ...prev,
          [postId]: {
            likes_count: result.stats.likes_count,
            user_has_liked: result.stats.user_has_liked
          }
        }))

        // Animation de like uniquement si c'est un nouveau like
        if (result.stats.user_has_liked && !isCurrentlyLiked) {
          const heart = document.createElement('div')
          heart.innerHTML = '❤️'
          heart.style.cssText = `
            position: fixed;
            font-size: 2rem;
            z-index: 10000;
            pointer-events: none;
            animation: heartFloat 1s ease-out forwards;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
          `
          document.body.appendChild(heart)
          setTimeout(() => heart.remove(), 1000)
        }
      } else {
        // Revert optimistic update en cas d'erreur
        setLikesData(prev => ({
          ...prev,
          [postId]: currentLikesData
        }))
      }
    } catch (error) {
      console.error('Erreur lors du toggle like:', error)
      // Revert optimistic update
      setLikesData(prev => ({
        ...prev,
        [postId]: currentLikesData
      }))
    }
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

  const handleQuickComment = (post) => {
    setQuickCommentModal({
      isOpen: true,
      recipe: {
        id: post.recipe.id,
        title: post.recipe.title,
        image: post.recipe.image,
        user_id: post.user.id
      }
    })
  }

  const handleQuickCommentAdded = (comment) => {
    // Ajouter le commentaire au post local
    setComments(prev => ({
      ...prev,
      [quickCommentModal.recipe.id]: [
        ...(prev[quickCommentModal.recipe.id] || []),
        {
          id: comment.id,
          user: comment.user_name,
          text: comment.text,
          timeAgo: 'maintenant'
        }
      ]
    }))

    // Fermer le modal
    setQuickCommentModal({ isOpen: false, recipe: null })

    // Animation de succès
    const successMessage = document.createElement('div')
    successMessage.innerHTML = '🎉 Commentaire publié avec succès!'
    successMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 16px 24px;
      border-radius: 16px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
      animation: slideInRight 0.5s ease-out;
    `
    document.body.appendChild(successMessage)
    setTimeout(() => successMessage.remove(), 3000)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Chargement du feed social...</p>
      </div>
    )
  }

  return (
    <>
      <div className={styles.feed}>
        <div className={styles.feedHeader}>
          <h2>🔥 Tendances du moment</h2>
          <p>Découvrez les créations les plus populaires de la communauté</p>
        </div>

        {posts.map(post => {
          const postLikesData = likesData[post.id] || { likes_count: 0, user_has_liked: false }
          
          return (
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
                      className={`${styles.likeBtn} ${postLikesData.user_has_liked ? styles.liked : ''}`}
                      onClick={() => toggleLike(post.id)}
                    >
                      {postLikesData.user_has_liked ? '❤️' : '🤍'}
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
                <span>❤️ {postLikesData.likes_count} likes</span>
                <span>💬 {(comments[post.id] || []).length} commentaires</span>
                <span>📤 {post.shares} partages</span>
              </div>

              <div className={styles.postActions}>
                <button 
                  className={`${styles.actionBtn} ${postLikesData.user_has_liked ? styles.active : ''}`}
                  onClick={() => toggleLike(post.id)}
                >
                  {postLikesData.user_has_liked ? '❤️' : '🤍'} J'aime
                </button>
                
                <button 
                  className={styles.actionBtn}
                  onClick={() => setActivePost(activePost === post.id ? null : post.id)}
                >
                  💬 Commenter
                </button>

                <button 
                  className={styles.actionBtn}
                  onClick={() => handleQuickComment(post)}
                  title="Commentaire rapide"
                >
                  ⚡ Rapide
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
          )
        })}

        {/* Aperçu du profil utilisateur */}
        <UserProfilePreview
          user={profilePreview.user}
          isVisible={profilePreview.isVisible}
          onClose={closeProfilePreview}
          position={profilePreview.position}
        />
      </div>

      {/* Quick Comment Modal */}
      <QuickCommentModal
        isOpen={quickCommentModal.isOpen}
        onClose={() => setQuickCommentModal({ isOpen: false, recipe: null })}
        recipe={quickCommentModal.recipe}
        onCommentAdded={handleQuickCommentAdded}
      />
      
      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -70%) scale(1.5);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -90%) scale(2);
            opacity: 0;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
