import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from '../../components/AuthContext'
import { logUserInteraction, logError, logInfo, logRecipeAction } from '../../utils/logger'
import styles from '../../styles/RecipeDetail.module.css'
import commentsStyles from '../../styles/SubmitRecipe.module.css'

export default function RecipeDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [servings, setServings] = useState(4)
  const [activeTab, setActiveTab] = useState('ingredients')
  
  // États pour les commentaires
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentLikes, setCommentLikes] = useState(new Set())

  useEffect(() => {
    if (id) {
      loadRecipe()
      loadUserPreferences()
      loadComments()
    }
  }, [id])

  const loadRecipe = async () => {
    try {
      setLoading(true)
      
      // First try to get from API
      const response = await fetch(`/api/recipes/${id}`)
      
      if (response.ok) {
        const recipeData = await response.json()
        setRecipe(recipeData)
        setServings(parseInt(recipeData.servings) || 4)
      } else {
        // Fallback to mock data if API fails
        const mockRecipe = getMockRecipe(id)
        setRecipe(mockRecipe)
        setServings(mockRecipe.servings || 4)
      }
      
      logUserInteraction('VIEW_RECIPE_DETAIL', 'recipe-page', {
        recipeId: id,
        userId: user?.id
      })
    } catch (err) {
      logError('Failed to load recipe', err, { recipeId: id })
      
      // Use mock data as fallback
      const mockRecipe = getMockRecipe(id)
      setRecipe(mockRecipe)
      setServings(mockRecipe.servings || 4)
    } finally {
      setLoading(false)
    }
  }

  const getMockRecipe = (recipeId) => {
    const mockRecipes = {
      '1': {
        id: '1',
        title: 'Pâtes Carbonara Authentiques',
        description: 'La vraie recette de carbonara romaine, crémeuse et savoureuse, préparée avec des œufs frais et du pecorino romano.',
        image: '/placeholder-recipe.jpg',
        author: 'Chef Marco Romano',
        category: 'Pâtes',
        difficulty: 'Facile',
        prepTime: '10 min',
        cookTime: '15 min',
        servings: 4,
        likes: 234,
        rating: 4.8,
        ingredients: [
          '400g de spaghetti',
          '200g de guanciale ou pancetta',
          '4 œufs entiers + 2 jaunes',
          '100g de pecorino romano râpé',
          '50g de parmesan râpé',
          'Poivre noir fraîchement moulu',
          'Sel pour l\'eau de cuisson'
        ],
        instructions: [
          {
            step: 1,
            instruction: 'Faire bouillir une grande casserole d\'eau salée pour les pâtes.'
          },
          {
            step: 2,
            instruction: 'Couper le guanciale en petits dés et le faire revenir dans une poêle jusqu\'à ce qu\'il soit croustillant.'
          },
          {
            step: 3,
            instruction: 'Dans un bol, battre les œufs avec les fromages râpés et une généreuse quantité de poivre noir.'
          },
          {
            step: 4,
            instruction: 'Cuire les spaghetti selon les instructions jusqu\'à ce qu\'ils soient al dente.'
          },
          {
            step: 5,
            instruction: 'Réserver une tasse d\'eau de cuisson des pâtes, puis égoutter.'
          },
          {
            step: 6,
            instruction: 'Ajouter les pâtes chaudes dans la poêle avec le guanciale, retirer du feu.'
          },
          {
            step: 7,
            instruction: 'Verser le mélange d\'œufs en remuant rapidement pour créer une sauce crémeuse.'
          },
          {
            step: 8,
            instruction: 'Ajouter l\'eau de cuisson si nécessaire pour obtenir la consistance désirée.'
          }
        ],
        tips: [
          'Ne jamais ajouter de crème dans une vraie carbonara',
          'La chaleur des pâtes cuit les œufs, ne pas remettre sur le feu',
          'Utiliser du pecorino romano pour l\'authenticité'
        ],
        nutrition: {
          calories: 520,
          protein: 28,
          carbs: 65,
          fat: 18
        }
      }
    }

    return mockRecipes[recipeId] || {
      id: recipeId,
      title: 'Recette Découverte',
      description: 'Une délicieuse recette à découvrir',
      image: '/placeholder-recipe.jpg',
      author: 'Chef COCO',
      category: 'Autre',
      difficulty: 'Moyen',
      prepTime: '15 min',
      cookTime: '30 min',
      servings: 4,
      likes: 0,
      rating: 4.5,
      ingredients: ['Ingrédients à venir...'],
      instructions: [{ step: 1, instruction: 'Instructions à venir...' }],
      tips: ['Conseils à venir...'],
      nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }
  }

  const loadUserPreferences = () => {
    // Simplified user preferences without favorites system
    console.log('User preferences loaded')
  }

  const toggleLike = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/recipe/${id}`))
      return
    }

    setIsLiked(!isLiked)
    
    // Simple like animation
    if (!isLiked) {
      const hearts = ['❤️', '💖', '💕']
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const heart = document.createElement('div')
          heart.innerHTML = hearts[Math.floor(Math.random() * hearts.length)]
          heart.style.cssText = `
            position: fixed;
            font-size: 1.5rem;
            z-index: 10000;
            pointer-events: none;
            animation: heartFloat 2s ease-out forwards;
            left: ${Math.random() * 100}vw;
            top: 50vh;
          `
          document.body.appendChild(heart)
          setTimeout(() => heart.remove(), 2000)
        }, i * 100)
      }
    }
    
    logUserInteraction('TOGGLE_LIKE_RECIPE', 'recipe-detail', {
      recipeId: id,
      action: isLiked ? 'unlike' : 'like',
      userId: user.id
    })
  }

  const adjustServings = (newServings) => {
    if (newServings < 1 || newServings > 20) return
    setServings(newServings)
  }

  const shareRecipe = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url: window.location.href
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Lien copié dans le presse-papiers!')
      } catch (err) {
        console.error('Error copying to clipboard', err)
      }
    }
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Facile': return '#10b981'
      case 'Moyen': return '#f59e0b'
      case 'Difficile': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Charger les commentaires
  const loadComments = async () => {
    if (!id) return
    
    setLoadingComments(true)
    try {
      const response = await fetch(`/api/comments?recipe_id=${id}`)
      
      if (response.ok) {
        const commentsData = await response.json()
        setComments(Array.isArray(commentsData) ? commentsData : [])
        
        logInfo('Comments loaded successfully', {
          recipeId: id,
          commentsCount: commentsData.length
        })
      } else {
        // Log the error but don't show it to user
        const errorText = await response.text()
        logError('Failed to load comments', new Error(`HTTP ${response.status}: ${errorText}`), { recipeId: id })
        
        // Set empty comments array instead of showing error
        setComments([])
      }
    } catch (error) {
      logError('Error loading comments', error, { recipeId: id })
      // Set empty comments array for graceful degradation
      setComments([])
    } finally {
      setLoadingComments(false)
    }
  }

  // Soumettre un commentaire
  const submitComment = async () => {
    if (!commentText.trim() || !user || !id) return
    
    setIsSubmittingComment(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_id: id,
          user_id: user.id,
          content: commentText.trim()
        })
      })
      
      if (response.ok) {
        const newComment = await response.json()
        setComments(prev => [newComment, ...prev])
        setCommentText('')
        
        logUserInteraction('COMMENT_ADDED', 'recipe-detail', {
          recipeId: id,
          commentLength: commentText.length
        })
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erreur de connexion' }))
        throw new Error(errorData.message || 'Erreur lors de l\'ajout du commentaire')
      }
    } catch (error) {
      logError('Error submitting comment', error, { recipeId: id })
      
      // Show user-friendly error message
      const errorMessage = error.message.includes('Table comments') 
        ? 'La fonctionnalité de commentaires n\'est pas encore disponible.'
        : 'Impossible d\'ajouter le commentaire. Veuillez réessayer.'
      
      alert(errorMessage)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Liker un commentaire
  const toggleCommentLike = (commentId) => {
    setCommentLikes(prev => {
      const newLikes = new Set(prev)
      if (newLikes.has(commentId)) {
        newLikes.delete(commentId)
      } else {
        newLikes.add(commentId)
      }
      return newLikes
    })
    
    logUserInteraction('COMMENT_LIKE_TOGGLE', 'recipe-detail', {
      commentId,
      recipeId: id
    })
  }

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Obtenir les initiales pour l'avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de la recette...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Erreur de chargement</h3>
        <p>{error}</p>
        <button onClick={() => router.back()} className={styles.backButton}>
          Retour
        </button>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>🔍</div>
        <h3>Recette introuvable</h3>
        <p>Cette recette n'existe pas ou a été supprimée.</p>
        <button onClick={() => router.push('/explorer')} className={styles.backButton}>
          Explorer d'autres recettes
        </button>
      </div>
    )
  }

  const multiplier = servings / (recipe.servings || 4)

  return (
    <div className={styles.container}>
      <Head>
        <title>{recipe.title} - COCO</title>
        <meta name="description" content={recipe.description} />
      </Head>

      {/* Header avec image */}
      <div className={styles.heroSection}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ← Retour
        </button>
        
        <div className={styles.heroImage}>
          <Image
            src={recipe.image || '/placeholder-recipe.jpg'}
            alt={recipe.title}
            fill
            className={styles.image}
            priority
          />
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.recipeHeader}>
            <h1 className={styles.title}>{recipe.title}</h1>
            <p className={styles.description}>{recipe.description}</p>
            
            <div className={styles.authorInfo}>
              <span className={styles.authorIcon}>👨‍🍳</span>
              <span className={styles.authorName}>{recipe.author}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className={styles.quickActions}>
        <button 
          onClick={toggleLike}
          className={`${styles.actionBtn} ${isLiked ? styles.liked : ''}`}
        >
          {isLiked ? '❤️' : '🤍'} {recipe.likes || 0}
        </button>
        
        <button onClick={shareRecipe} className={styles.actionBtn}>
          📤 Partager
        </button>
      </div>

      {/* Informations de la recette */}
      <div className={styles.recipeInfo}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>⏱️</span>
            <div>
              <span className={styles.infoLabel}>Préparation</span>
              <span className={styles.infoValue}>{recipe.prepTime}</span>
            </div>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>🔥</span>
            <div>
              <span className={styles.infoLabel}>Cuisson</span>
              <span className={styles.infoValue}>{recipe.cookTime}</span>
            </div>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>👥</span>
            <div>
              <span className={styles.infoLabel}>Portions</span>
              <div className={styles.servingsControl}>
                <button 
                  onClick={() => adjustServings(servings - 1)}
                  className={styles.servingBtn}
                >
                  -
                </button>
                <span className={styles.infoValue}>{servings}</span>
                <button 
                  onClick={() => adjustServings(servings + 1)}
                  className={styles.servingBtn}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          <div className={styles.infoItem}>
            <span 
              className={styles.difficultyBadge}
              style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}
            >
              {recipe.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Onglets de contenu */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabsHeader}>
          <button 
            onClick={() => setActiveTab('ingredients')}
            className={`${styles.tab} ${activeTab === 'ingredients' ? styles.active : ''}`}
          >
            🧾 Ingrédients
          </button>
          <button 
            onClick={() => setActiveTab('instructions')}
            className={`${styles.tab} ${activeTab === 'instructions' ? styles.active : ''}`}
          >
            📝 Étapes
          </button>
          <button 
            onClick={() => setActiveTab('tips')}
            className={`${styles.tab} ${activeTab === 'tips' ? styles.active : ''}`}
          >
            💡 Conseils
          </button>
        </div>

        <div className={styles.tabContent}>
          {/* Onglet Ingrédients */}
          {activeTab === 'ingredients' && (
            <div className={styles.ingredientsTab}>
              <div className={styles.ingredientsList}>
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className={styles.ingredient}>
                    <span className={styles.ingredientBullet}>•</span>
                    <span className={styles.ingredientText}>
                      {multiplier !== 1 ? 
                        ingredient.replace(/(\d+\.?\d*)/g, (match) => {
                          const num = parseFloat(match)
                          return isNaN(num) ? match : (num * multiplier).toFixed(num % 1 === 0 ? 0 : 1)
                        }) : 
                        ingredient
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Instructions */}
          {activeTab === 'instructions' && (
            <div className={styles.instructionsTab}>
              <div className={styles.instructionsList}>
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className={styles.instructionStep}>
                    <div className={styles.stepNumber}>{instruction.step || index + 1}</div>
                    <div className={styles.stepContent}>
                      <p className={styles.stepText}>{instruction.instruction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Onglet Conseils */}
          {activeTab === 'tips' && (
            <div className={styles.tipsTab}>
              {recipe.tips && recipe.tips.length > 0 ? (
                <div className={styles.tipsList}>
                  {recipe.tips.map((tip, index) => (
                    <div key={index} className={styles.tip}>
                      <span className={styles.tipIcon}>💡</span>
                      <span className={styles.tipText}>{tip}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noTips}>
                  <span className={styles.noTipsIcon}>🤔</span>
                  <p>Aucun conseil spécial pour cette recette.</p>
                </div>
              )}
              
              {recipe.nutrition && (
                <div className={styles.nutritionInfo}>
                  <h3 className={styles.nutritionTitle}>Informations nutritionnelles (par portion)</h3>
                  <div className={styles.nutritionGrid}>
                    <div className={styles.nutritionItem}>
                      <span className={styles.nutritionValue}>{Math.round(recipe.nutrition.calories * multiplier / servings)}</span>
                      <span className={styles.nutritionLabel}>Calories</span>
                    </div>
                    <div className={styles.nutritionItem}>
                      <span className={styles.nutritionValue}>{Math.round(recipe.nutrition.protein * multiplier / servings)}g</span>
                      <span className={styles.nutritionLabel}>Protéines</span>
                    </div>
                    <div className={styles.nutritionItem}>
                      <span className={styles.nutritionValue}>{Math.round(recipe.nutrition.carbs * multiplier / servings)}g</span>
                      <span className={styles.nutritionLabel}>Glucides</span>
                    </div>
                    <div className={styles.nutritionItem}>
                      <span className={styles.nutritionValue}>{Math.round(recipe.nutrition.fat * multiplier / servings)}g</span>
                      <span className={styles.nutritionLabel}>Lipides</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Commentaires */}
      <div className={commentsStyles.commentsSection}>
        <div className={commentsStyles.commentsHeader}>
          <h2 className={commentsStyles.commentsTitle}>
            💬 Commentaires
            <span className={commentsStyles.commentsCount}>
              {comments.length}
            </span>
          </h2>
        </div>

        {/* Formulaire d'ajout de commentaire */}
        {user ? (
          <div className={commentsStyles.commentForm}>
            <textarea
              className={commentsStyles.commentTextarea}
              placeholder="Partagez votre avis sur cette recette..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
            />
            <div className={commentsStyles.commentActions}>
              <span className={commentsStyles.commentCharCount}>
                {commentText.length}/500
              </span>
              <button
                className={commentsStyles.commentSubmitBtn}
                onClick={submitComment}
                disabled={!commentText.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? (
                  <>
                    <div className={commentsStyles.commentsSpinner}></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    💬 Commenter
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            background: 'rgba(248, 250, 252, 0.8)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: '0 0 12px 0', color: '#64748b' }}>
              Connectez-vous pour laisser un commentaire
            </p>
            <button
              onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/recipe/${id}`)}`)}
              className={commentsStyles.commentSubmitBtn}
            >
              Se connecter
            </button>
          </div>
        )}

        {/* Liste des commentaires */}
        {loadingComments ? (
          <div className={commentsStyles.loadingComments}>
            <div className={commentsStyles.commentsSpinner}></div>
            Chargement des commentaires...
          </div>
        ) : comments.length === 0 ? (
          <div className={commentsStyles.emptyComments}>
            <div className={commentsStyles.emptyCommentsIcon}>🗨️</div>
            <div className={commentsStyles.emptyCommentsText}>
              Aucun commentaire pour le moment
            </div>
            <div className={commentsStyles.emptyCommentsSubtext}>
              Soyez le premier à partager votre avis sur cette recette !
            </div>
          </div>
        ) : (
          <div className={commentsStyles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} className={commentsStyles.commentItem}>
                <div className={commentsStyles.commentHeader}>
                  <div className={commentsStyles.commentAuthor}>
                    <div className={commentsStyles.commentAuthorAvatar}>
                      {getInitials(comment.author_name || 'Anonyme')}
                    </div>
                    <div>
                      <div className={commentsStyles.commentAuthorName}>
                        {comment.author_name || 'Chef Anonyme'}
                      </div>
                      <div className={commentsStyles.commentDate}>
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className={commentsStyles.commentText}>
                  {comment.content}
                </p>
                
                <div className={commentsStyles.commentActions}>
                  <button
                    className={`${commentsStyles.commentLikeBtn} ${
                      commentLikes.has(comment.id) ? commentsStyles.liked : ''
                    }`}
                    onClick={() => toggleCommentLike(comment.id)}
                  >
                    {commentLikes.has(comment.id) ? '❤️' : '🤍'} 
                    {(comment.likes || 0) + (commentLikes.has(comment.id) ? 1 : 0)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
