import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { useErrorHandler } from '../components/ErrorBoundary'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'

export default function SubmitRecipe() {
  const router = useRouter()
  const { user } = useAuth()
  const { lastError, handleError: handleComponentError, clearError, retryLastAction } = useErrorHandler()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    prepTime: '',
    cookTime: '',
    category: '',
    difficulty: 'Facile',
    author: ''
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [currentError, setCurrentError] = useState(null)

  const categories = [
    'Entrées', 'Plats principaux', 'Desserts', 'Pâtes', 
    'Salades', 'Soupes', 'Boissons', 'Snacks', 'Végétarien', 'Vegan'
  ]

  const difficulties = ['Facile', 'Moyen', 'Difficile']

  useEffect(() => {
    if (user?.user_metadata?.display_name || user?.email) {
      setFormData(prev => ({
        ...prev,
        author: user.user_metadata?.display_name || user.email
      }))
    }
  }, [user])

  const validateStep = (stepNumber) => {
    const newErrors = {}
    
    if (stepNumber === 1) {
      if (!formData.title.trim()) newErrors.title = 'Le titre est requis'
      if (!formData.description.trim()) newErrors.description = 'La description est requise'
    }
    
    if (stepNumber === 2) {
      if (formData.ingredients.filter(i => i.trim()).length === 0) {
        newErrors.ingredients = 'Au moins un ingrédient est requis'
      }
      if (formData.instructions.filter(i => i.trim()).length === 0) {
        newErrors.instructions = 'Au moins une instruction est requise'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }))
  }

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }

  const updateIngredient = (index, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === index ? value : ing)
    }))
  }

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }))
  }

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }))
  }

  const updateInstruction = (index, value) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => i === index ? value : inst)
    }))
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setStep(prev => prev - 1)
  }

  const handleImageSelect = (imageData) => {
    setSelectedImage(imageData)
  }

  const submitRecipe = async () => {
    if (!validateStep(step)) return

    setIsSubmitting(true)
    setCurrentError(null)

    try {
      const recipeData = {
        ...formData,
        ingredients: formData.ingredients.filter(i => i.trim()),
        instructions: formData.instructions.filter(i => i.trim()),
        image: selectedImage
      }

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la recette')
      }

      setShowSuccessMessage(true)
      setTimeout(() => {
        router.push('/mes-recettes')
      }, 2000)

    } catch (error) {
      setCurrentError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetError = () => {
    setCurrentError(null)
    clearError?.()
  }

  const handleRetry = () => {
    resetError()
    if (retryLastAction) {
      retryLastAction()
    } else {
      submitRecipe()
    }
  }

  // Afficher l'erreur centralisée si elle existe
  const displayError = currentError || lastError?.error

  if (showSuccessMessage) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'var(--bg-gradient)'
      }}>
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2>Recette créée avec succès !</h2>
          <p>Redirection vers vos recettes...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Publier une recette - COCO</title>
      </Head>

      <div className={styles.container}>
        {/* Affichage des erreurs */}
        {displayError && (
          <div className={styles.errorMessage}>
            <p>{displayError}</p>
            <button onClick={handleRetry}>Réessayer</button>
          </div>
        )}

        {/* Progress indicator */}
        <div className={styles.progress}>
          <div 
            className={styles.progressBar}
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step content */}
        {step === 1 && (
          <div className={styles.step}>
            <h2>Informations de base</h2>
            <input
              type="text"
              placeholder="Titre de la recette"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? styles.error : ''}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? styles.error : ''}
            />
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}

            <button onClick={nextStep} className={styles.nextButton}>
              Suivant
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <h2>Ingrédients et Instructions</h2>
            
            <div className={styles.section}>
              <h3>Ingrédients</h3>
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className={styles.inputGroup}>
                  <input
                    type="text"
                    placeholder={`Ingrédient ${index + 1}`}
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                  />
                  {formData.ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(index)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addIngredient} className={styles.addButton}>
                + Ajouter un ingrédient
              </button>
            </div>

            <div className={styles.section}>
              <h3>Instructions</h3>
              {formData.instructions.map((instruction, index) => (
                <div key={index} className={styles.inputGroup}>
                  <textarea
                    placeholder={`Étape ${index + 1}`}
                    value={instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                  />
                  {formData.instructions.length > 1 && (
                    <button onClick={() => removeInstruction(index)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addInstruction} className={styles.addButton}>
                + Ajouter une étape
              </button>
            </div>

            <div className={styles.navigation}>
              <button onClick={prevStep} className={styles.prevButton}>
                Précédent
              </button>
              <button onClick={nextStep} className={styles.nextButton}>
                Suivant
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.step}>
            <h2>Finalisation</h2>
            
            <PhotoUpload onImageSelect={handleImageSelect} />
            
            <div className={styles.metadata}>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Choisir une catégorie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
              >
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Temps de préparation (ex: 30 min)"
                value={formData.prepTime}
                onChange={(e) => handleInputChange('prepTime', e.target.value)}
              />

              <input
                type="text"
                placeholder="Temps de cuisson (ex: 15 min)"
                value={formData.cookTime}
                onChange={(e) => handleInputChange('cookTime', e.target.value)}
              />
            </div>

            <div className={styles.navigation}>
              <button onClick={prevStep} className={styles.prevButton}>
                Précédent
              </button>
              <button 
                onClick={submitRecipe} 
                className={styles.submitButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publication...' : 'Publier la recette'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
