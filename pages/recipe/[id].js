import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../components/AuthContext'
import { getRecipeImageUrl } from '../../lib/supabase'
import { logDebug, logInfo, logError } from '../../utils/logger'

export default function RecipeDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTimers, setActiveTimers] = useState({})
  const [currentStep, setCurrentStep] = useState(0)
  const [isCookingMode, setIsCookingMode] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [cookingProgress, setCookingProgress] = useState({})
  const [ingredients, setIngredients] = useState({})
  const [portions, setPortions] = useState(2)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  
  const timerRefs = useRef({})
  const speechSynthesis = useRef(null)

  // Charger la recette
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/recipes?id=${id}`)
        if (response.ok) {
          const data = await response.json()
          setRecipe(data)
        } else {
          throw new Error('Recette non trouvée')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRecipe()
  }, [id])

  // Initialiser speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesis.current = window.speechSynthesis
    }
  }, [])

  // Fonction pour convertir bytea en URL d'image - VERSION AMÉLIORÉE
  const getImageUrl = (imageData) => {
    logDebug('RecipeDetail: Conversion image pour affichage', {
      recipeId: recipe?.id,
      recipeTitle: recipe?.title,
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataLength: imageData?.length,
      isArray: Array.isArray(imageData)
    })
    
    return getRecipeImageUrl(imageData, '/placeholder-recipe.jpg')
  }

  // Gestion des minuteurs
  const startTimer = (stepIndex, minutes) => {
    const duration = minutes * 60 * 1000
    
    setActiveTimers(prev => ({
      ...prev,
      [stepIndex]: {
        startTime: Date.now(),
        duration,
        remaining: duration
      }
    }))

    const intervalId = setInterval(() => {
      setActiveTimers(prev => {
        const timer = prev[stepIndex]
        if (!timer) return prev
        
        const elapsed = Date.now() - timer.startTime
        const remaining = Math.max(0, timer.duration - elapsed)
        
        if (remaining === 0) {
          clearInterval(intervalId)
          showTimerComplete(stepIndex)
          const { [stepIndex]: _, ...rest } = prev
          return rest
        }
        
        return {
          ...prev,
          [stepIndex]: { ...timer, remaining }
        }
      })
    }, 1000)

    timerRefs.current[stepIndex] = intervalId
  }

  const showTimerComplete = (stepIndex) => {
    // Notification et vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
    
    // Notification audio
    if (speechSynthesis.current) {
      const utterance = new SpeechSynthesisUtterance(`Étape ${stepIndex + 1} terminée !`)
      speechSynthesis.current.speak(utterance)
    }
    
    alert(`⏰ Minuteur terminé pour l'étape ${stepIndex + 1} !`)
  }

  // Mode cuisson
  const toggleCookingMode = () => {
    setIsCookingMode(!isCookingMode)
    if (!isCookingMode) {
      setCurrentStep(0)
    }
  }

  // Marquer un ingrédient comme utilisé
  const toggleIngredient = (index) => {
    setIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Ajuster les portions
  const adjustPortions = (newPortions) => {
    setPortions(Math.max(1, newPortions))
  }

  // Calculer les quantités ajustées
  const getAdjustedQuantity = (originalQuantity) => {
    const basePortions = recipe?.portions || 2
    const multiplier = portions / basePortions
    return originalQuantity * multiplier
  }

  // Actions sociales
  const toggleLike = async () => {
    setIsLiked(!isLiked)
    // Animation de like
    if (!isLiked && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  const toggleSave = () => {
    setIsSaved(!isSaved)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🍳</div>
          <p>Préparation de la recette...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
          <h2>Recette non trouvée</h2>
          <p>{error}</p>
          <button onClick={() => router.back()}>
            Retour
          </button>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <div>
      <Head>
        <title>{recipe.title} - COCO</title>
        <meta name="description" content={recipe.description} />
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
        {/* Image principale avec logging amélioré */}
        {recipe.image && (
          <div style={{
            width: '100%',
            height: '300px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '1rem'
          }}>
            <img
              src={getImageUrl(recipe.image)}
              alt={recipe.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onLoad={() => {
                logInfo('Image de recette chargée avec succès', {
                  recipeId: recipe.id,
                  recipeTitle: recipe.title
                })
              }}
              onError={(e) => {
                logError('Erreur de chargement d\'image de recette', new Error('Image load failed'), {
                  recipeId: recipe.id,
                  recipeTitle: recipe.title,
                  imageSrc: e.target.src
                })
                e.target.src = '/placeholder-recipe.jpg'
              }}
            />
          </div>
        )}

        {/* Titre et métadonnées */}
        <div style={{ marginBottom: '2rem' }}>
          <h1>{recipe.title}</h1>
          <p style={{ color: 'var(--text-medium)' }}>{recipe.description}</p>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            margin: '1rem 0'
          }}>
            {recipe.prepTime && <span>⏱️ Prep: {recipe.prepTime}</span>}
            {recipe.cookTime && <span>🔥 Cuisson: {recipe.cookTime}</span>}
            {recipe.difficulty && <span>⭐ {recipe.difficulty}</span>}
            {recipe.category && <span>📂 {recipe.category}</span>}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
            <button
              onClick={toggleLike}
              style={{
                background: isLiked ? 'var(--primary-coral)' : 'var(--bg-light)',
                color: isLiked ? 'white' : 'var(--text-dark)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isLiked ? '❤️' : '🤍'} J'aime
            </button>
            
            <button
              onClick={toggleSave}
              style={{
                background: isSaved ? 'var(--secondary-mint)' : 'var(--bg-light)',
                color: isSaved ? 'white' : 'var(--text-dark)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isSaved ? '⭐' : '🤍'} Sauvegarder
            </button>
            
            <button
              onClick={toggleCookingMode}
              style={{
                background: 'var(--primary-orange)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {isCookingMode ? '📖 Mode lecture' : '👨‍🍳 Mode cuisson'}
            </button>
          </div>
        </div>

        {/* Ingrédients */}
        {recipe.ingredients && Array.isArray(recipe.ingredients) && (
          <div style={{ marginBottom: '2rem' }}>
            <h2>Ingrédients</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label>Portions: </label>
              <button onClick={() => adjustPortions(portions - 1)}>-</button>
              <span style={{ margin: '0 1rem' }}>{portions}</span>
              <button onClick={() => adjustPortions(portions + 1)}>+</button>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: ingredients[index] ? 'var(--bg-light)' : 'transparent',
                    textDecoration: ingredients[index] ? 'line-through' : 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    margin: '0.25rem 0'
                  }}
                  onClick={() => toggleIngredient(index)}
                >
                  {ingredients[index] ? '✅' : '⭕'} {ingredient}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && Array.isArray(recipe.instructions) && (
          <div>
            <h2>Instructions</h2>
            {recipe.instructions.map((instruction, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  margin: '1rem 0',
                  backgroundColor: isCookingMode && index === currentStep 
                    ? 'var(--primary-coral-light)' 
                    : 'var(--bg-light)',
                  borderRadius: '8px',
                  border: isCookingMode && index === currentStep 
                    ? '2px solid var(--primary-coral)' 
                    : '1px solid var(--border-light)'
                }}
              >
                <h3>Étape {index + 1}</h3>
                <p>
                  {typeof instruction === 'string' 
                    ? instruction 
                    : instruction.instruction || instruction}
                </p>
                
                {isCookingMode && index === currentStep && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      onClick={() => startTimer(index, 5)}
                      style={{
                        background: 'var(--accent-yellow)',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '0.5rem'
                      }}
                    >
                      ⏲️ Timer 5min
                    </button>
                    
                    {activeTimers[index] && (
                      <span style={{ color: 'var(--primary-coral)', fontWeight: 'bold' }}>
                        ⏰ {Math.ceil(activeTimers[index].remaining / 1000)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isCookingMode && (
              <div style={{
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '1rem',
                background: 'white',
                padding: '1rem',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }}>
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  style={{
                    background: 'var(--bg-light)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⬅️ Précédent
                </button>
                
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'var(--text-medium)'
                }}>
                  {currentStep + 1} / {recipe.instructions.length}
                </span>
                
                <button
                  onClick={() => setCurrentStep(Math.min(recipe.instructions.length - 1, currentStep + 1))}
                  disabled={currentStep === recipe.instructions.length - 1}
                  style={{
                    background: 'var(--primary-coral)',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: currentStep === recipe.instructions.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Suivant ➡️
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
