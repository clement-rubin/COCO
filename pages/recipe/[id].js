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
  const [editingComment, setEditingComment] = useState(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [savingComment, setSavingComment] = useState(false)

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
    // Extended mock recipes data including collection recipes
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
          { step: 1, instruction: 'Faire bouillir une grande casserole d\'eau salée pour les pâtes.' },
          { step: 2, instruction: 'Couper le guanciale en petits dés et le faire revenir dans une poêle jusqu\'à ce qu\'il soit croustillant.' },
          { step: 3, instruction: 'Dans un bol, battre les œufs avec les fromages râpés et une généreuse quantité de poivre noir.' },
          { step: 4, instruction: 'Cuire les spaghetti selon les instructions jusqu\'à ce qu\'ils soient al dente.' },
          { step: 5, instruction: 'Réserver une tasse d\'eau de cuisson des pâtes, puis égoutter.' },
          { step: 6, instruction: 'Ajouter les pâtes chaudes dans la poêle avec le guanciale, retirer du feu.' },
          { step: 7, instruction: 'Verser le mélange d\'œufs en remuant rapidement pour créer une sauce crémeuse.' },
          { step: 8, instruction: 'Ajouter l\'eau de cuisson si nécessaire pour obtenir la consistance désirée.' }
        ],
        tips: [
          'Ne jamais ajouter de crème dans une vraie carbonara',
          'La chaleur des pâtes cuit les œufs, ne pas remettre sur le feu',
          'Utiliser du pecorino romano pour l\'authenticité'
        ],
        nutrition: { calories: 520, protein: 28, carbs: 65, fat: 18 }
      },
      // Add collection recipes
      '101': {
        id: '101',
        title: 'Pancakes aux myrtilles',
        description: 'Des pancakes moelleux garnis de myrtilles fraîches pour un petit-déjeuner vitaminé',
        image: '/placeholder-recipe.jpg',
        author: 'Chef Sarah',
        category: 'Petit déjeuner',
        difficulty: 'Facile',
        prepTime: '15 min',
        cookTime: '10 min',
        servings: 4,
        likes: 156,
        rating: 4.6,
        ingredients: [
          '2 œufs',
          '250ml de lait',
          '200g de farine',
          '2 c.à.s de sucre',
          '1 c.à.c de levure chimique',
          '150g de myrtilles fraîches',
          'Beurre pour la cuisson'
        ],
        instructions: [
          { step: 1, instruction: 'Dans un bol, battre les œufs avec le lait.' },
          { step: 2, instruction: 'Dans un autre bol, mélanger la farine, le sucre et la levure.' },
          { step: 3, instruction: 'Incorporer le mélange liquide aux ingrédients secs.' },
          { step: 4, instruction: 'Ajouter délicatement les myrtilles à la pâte.' },
          { step: 5, instruction: 'Chauffer une poêle avec un peu de beurre.' },
          { step: 6, instruction: 'Verser une louche de pâte et cuire 2-3 minutes de chaque côté.' },
          { step: 7, instruction: 'Servir chaud avec du sirop d\'érable.' }
        ],
        tips: [
          'Ne pas trop mélanger la pâte pour garder des pancakes moelleux',
          'Les myrtilles congelées peuvent être utilisées sans décongélation',
          'Maintenir au chaud dans un four à 60°C'
        ],
        nutrition: { calories: 280, protein: 12, carbs: 45, fat: 8 }
      },
      '102': {
        id: '102',
        title: 'Granola maison croustillant',
        description: 'Un mélange parfait d\'avoine, noix et miel pour un petit-déjeuner sain et énergisant',
        image: '/placeholder-recipe.jpg',
        author: 'Chef Marie',
        category: 'Petit déjeuner',
        difficulty: 'Facile',
        prepTime: '10 min',
        cookTime: '25 min',
        servings: 8,
        likes: 203,
        rating: 4.7,
        ingredients: [
          '300g d\'avoine',
          '100g de noix mélangées',
          '50ml de miel',
          '2 c.à.s d\'huile de coco',
          '1 c.à.c de cannelle',
          '50g de graines de tournesol',
          '75g de fruits secs'
        ],
        instructions: [
          { step: 1, instruction: 'Préchauffer le four à 160°C.' },
          { step: 2, instruction: 'Mélanger l\'avoine, les noix et les graines dans un grand bol.' },
          { step: 3, instruction: 'Faire fondre le miel avec l\'huile de coco.' },
          { step: 4, instruction: 'Verser le mélange liquide sur les ingrédients secs.' },
          { step: 5, instruction: 'Ajouter la cannelle et bien mélanger.' },
          { step: 6, instruction: 'Étaler sur une plaque et cuire 25 minutes en remuant à mi-cuisson.' },
          { step: 7, instruction: 'Laisser refroidir et ajouter les fruits secs.' }
        ],
        tips: [
          'Remuer régulièrement pour une cuisson uniforme',
          'Se conserve 2 semaines dans un récipient hermétique',
          'Personnaliser avec vos fruits secs préférés'
        ],
        nutrition: { calories: 320, protein: 8, carbs: 42, fat: 14 }
      },
      '201': {
        id: '201',
        title: 'Pot-au-feu grand-mère',
        description: 'La recette traditionnelle qui réunit toute la famille autour de saveurs authentiques',
        image: '/placeholder-recipe.jpg',
        author: 'Chef Pierre',
        category: 'Plat principal',
        difficulty: 'Moyen',
        prepTime: '30 min',
        cookTime: '2h30',
        servings: 6,
        likes: 89,
        rating: 4.9,
        ingredients: [
          '1kg de bœuf (gîte, jarret)',
          '4 carottes',
          '2 navets',
          '1 chou vert',
          '4 poireaux',
          '1 bouquet garni',
          'Gros sel',
          'Poivre en grains'
        ],
        instructions: [
          { step: 1, instruction: 'Faire revenir la viande dans une grande cocotte.' },
          { step: 2, instruction: 'Couvrir d\'eau froide et porter à ébullition.' },
          { step: 3, instruction: 'Écumer régulièrement les premières 30 minutes.' },
          { step: 4, instruction: 'Ajouter le bouquet garni et laisser mijoter 1h30.' },
          { step: 5, instruction: 'Ajouter les légumes racines et poursuivre 45 minutes.' },
          { step: 6, instruction: 'Terminer avec le chou les 15 dernières minutes.' },
          { step: 7, instruction: 'Servir avec des cornichons et de la moutarde.' }
        ],
        tips: [
          'Écumer régulièrement pour un bouillon clair',
          'Ne pas faire bouillir fort, juste frémir',
          'Les légumes doivent rester légèrement fermes'
        ],
        nutrition: { calories: 450, protein: 35, carbs: 25, fat: 18 }
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
      logInfo('Attempting to submit comment', {
        recipeId: id,
        userId: user.id.substring(0, 8) + '...',
        contentLength: commentText.trim().length,
        userEmail: user.email
      })

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
        
        logError('Comment submission failed', new Error(`HTTP ${response.status}`), {
          recipeId: id,
          userId: user.id.substring(0, 8) + '...',
          status: response.status,
          errorData
        })
        
        throw new Error(errorData.message || 'Erreur lors de l\'ajout du commentaire')
      }
    } catch (error) {
      logError('Error submitting comment', error, { 
        recipeId: id,
        userId: user.id.substring(0, 8) + '...',
        errorMessage: error.message
      })
      
      // Afficher un message d'erreur plus informatif
      let errorMessage = 'Impossible d\'ajouter le commentaire. '
      
      if (error.message.includes('row-level security')) {
        errorMessage += 'Problème d\'autorisation. Veuillez vous reconnecter et réessayer.'
      } else if (error.message.includes('Table comments')) {
        errorMessage += 'La fonctionnalité de commentaires n\'est pas encore disponible.'
      } else {
        errorMessage += 'Veuillez réessayer dans quelques instants.'
      }
      
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

  // Éditer un commentaire
  const startEditComment = (comment) => {
    setEditingComment(comment.id)
    setEditCommentText(comment.content)
  }

  const cancelEditComment = () => {
    setEditingComment(null)
    setEditCommentText('')
  }

  const saveEditComment = async (commentId) => {
    if (!editCommentText.trim() || editCommentText.trim().length > 500) {
      alert('Le commentaire doit contenir entre 1 et 500 caractères.')
      return
    }

    setSavingComment(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: commentId,
          user_id: user.id,
          content: editCommentText.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la modification')
      }

      const updatedComment = await response.json()

      // Mettre à jour le commentaire dans la liste
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? updatedComment : comment
      ))

      setEditingComment(null)
      setEditCommentText('')
      
      // Afficher un message de succès temporaire
      const successMessage = document.createElement('div')
      successMessage.textContent = 'Commentaire modifié avec succès ✓'
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

    } catch (error) {
      console.error('Erreur lors de la modification du commentaire:', error)
      alert('Erreur lors de la modification du commentaire: ' + error.message)
    } finally {
      setSavingComment(false)
    }
  }

  // Supprimer un commentaire
  const deleteComment = async (commentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      return
    }

    try {
      const response = await fetch(`/api/comments?id=${commentId}&user_id=${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la suppression')
      }

      // Retirer le commentaire de la liste
      setComments(prev => prev.filter(comment => comment.id !== commentId))
      
      // Afficher un message de succès temporaire
      const successMessage = document.createElement('div')
      successMessage.textContent = 'Commentaire supprimé avec succès ✓'
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error)
      alert('Erreur lors de la suppression du commentaire: ' + error.message)
    }
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
        <button onClick={() => router.push('/collections')} className={styles.backButton}>
          Voir les collections
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
                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                          <span className={commentsStyles.editedBadge}> (modifié)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions du propriétaire du commentaire */}
                  {user && comment.user_id === user.id && (
                    <div className={commentsStyles.commentOwnerActions}>
                      <button
                        onClick={() => startEditComment(comment)}
                        className={commentsStyles.editCommentBtn}
                        title="Modifier le commentaire"
                        disabled={editingComment === comment.id}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className={commentsStyles.deleteCommentBtn}
                        title="Supprimer le commentaire"
                        disabled={editingComment === comment.id}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Contenu du commentaire ou formulaire d'édition */}
                {editingComment === comment.id ? (
                  <div className={commentsStyles.editCommentForm}>
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      className={commentsStyles.editCommentTextarea}
                      placeholder="Modifier votre commentaire..."
                      maxLength={500}
                      disabled={savingComment}
                    />
                    <div className={commentsStyles.editCommentActions}>
                      <span className={commentsStyles.editCommentCharCount}>
                        {editCommentText.length}/500
                      </span>
                      <div className={commentsStyles.editCommentButtons}>
                        <button
                          onClick={cancelEditComment}
                          className={commentsStyles.cancelEditBtn}
                          disabled={savingComment}
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => saveEditComment(comment.id)}
                          className={commentsStyles.saveEditBtn}
                          disabled={!editCommentText.trim() || savingComment || editCommentText.length > 500}
                        >
                          {savingComment ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={commentsStyles.commentText}>
                    {comment.content}
                  </p>
                )}
                
                <div className={commentsStyles.commentActions}>
                  <button
                    className={`${commentsStyles.commentLikeBtn} ${
                      commentLikes.has(comment.id) ? commentsStyles.liked : ''
                    }`}
                    onClick={() => toggleCommentLike(comment.id)}
                    disabled={editingComment === comment.id}
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
