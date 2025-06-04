import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from '../../components/AuthContext'
import { logUserInteraction, logError, logInfo, logRecipeAction } from '../../utils/logger'
import styles from '../../styles/RecipeDetail.module.css'

export default function RecipeDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [servings, setServings] = useState(4)
  const [activeTab, setActiveTab] = useState('ingredients')

  useEffect(() => {
    if (id) {
      loadRecipe()
      loadUserPreferences()
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
    try {
      const savedLikes = localStorage.getItem('userLikedRecipes')
      const savedRecipes = localStorage.getItem('userSavedRecipes')
      
      if (savedLikes) {
        const likes = JSON.parse(savedLikes)
        setIsLiked(likes.includes(id))
      }
      
      if (savedRecipes) {
        const saves = JSON.parse(savedRecipes)
        setIsSaved(saves.includes(id))
      }
    } catch (err) {
      logRecipeAction('LOAD_PREFERENCES_ERROR', null, {
        error: err.message,
        component: 'recipe-detail'
      })
    }
  }

  const toggleLike = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/recipe/${id}`))
      return
    }

    try {
      const savedLikes = JSON.parse(localStorage.getItem('userLikedRecipes') || '[]')
      let newLikes
      
      if (isLiked) {
        newLikes = savedLikes.filter(likeId => likeId !== id)
      } else {
        newLikes = [...savedLikes, id]
      }
      
      localStorage.setItem('userLikedRecipes', JSON.stringify(newLikes))
      setIsLiked(!isLiked)
      
      // Animation effect
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
    } catch (err) {
      console.error('Failed to toggle like', err)
    }
  }

  const toggleSave = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/recipe/${id}`))
      return
    }

    try {
      const savedRecipes = JSON.parse(localStorage.getItem('userSavedRecipes') || '[]')
      let newSaves
      
      if (isSaved) {
        newSaves = savedRecipes.filter(saveId => saveId !== id)
      } else {
        newSaves = [...savedRecipes, id]
      }
      
      localStorage.setItem('userSavedRecipes', JSON.stringify(newSaves))
      setIsSaved(!isSaved)
      
      logUserInteraction('TOGGLE_SAVE_RECIPE', 'recipe-detail', {
        recipeId: id,
        action: isSaved ? 'unsave' : 'save',
        userId: user.id
      })
    } catch (err) {
      console.error('Failed to toggle save', err)
    }
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
        
        <button 
          onClick={toggleSave}
          className={`${styles.actionBtn} ${isSaved ? styles.saved : ''}`}
        >
          {isSaved ? '⭐' : '☆'} Sauvegarder
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
