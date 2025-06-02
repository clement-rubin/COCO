import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logInfo, logDebug, logError } from '../utils/logger'
import { retryOperation } from '../utils/retryOperation'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import ErrorDisplay from '../components/ErrorDisplay'

export default function SubmitRecipe() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: [''],
    instructions: [''],
    prepTime: '',
    cookTime: '',
    servings: '',
    category: '',
    difficulty: 'Facile',
    author: '',
    tags: []
  })
  const [photos, setPhotos] = useState([])
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
    logUserInteraction('PAGE_VISIT', 'submit-recipe', { step })
  }, [step])

  const validateStep = (stepNumber) => {
    const newErrors = {}

    if (stepNumber === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Le titre est obligatoire'
      } else if (formData.title.length < 3) {
        newErrors.title = 'Le titre doit contenir au moins 3 caractères'
      }

      if (!formData.description.trim()) {
        newErrors.description = 'La description est obligatoire'
      } else if (formData.description.length < 10) {
        newErrors.description = 'La description doit contenir au moins 10 caractères'
      }

      if (!formData.category) {
        newErrors.category = 'Veuillez sélectionner une catégorie'
      }
    }

    if (stepNumber === 2) {
      const validIngredients = formData.ingredients.filter(ing => ing.trim())
      if (validIngredients.length < 2) {
        newErrors.ingredients = 'Au moins 2 ingrédients sont requis'
      }

      const validInstructions = formData.instructions.filter(inst => inst.trim())
      if (validInstructions.length < 2) {
        newErrors.instructions = 'Au moins 2 étapes sont requises'
      }
    }

    if (stepNumber === 3) {
      if (photos.length === 0) {
        newErrors.photos = 'Au moins une photo est requise'
      }

      const hasProcessingPhotos = photos.some(photo => photo.processing)
      const hasErrorPhotos = photos.some(photo => photo.error)

      if (hasProcessingPhotos) {
        newErrors.photos = 'Attendez que toutes les photos soient traitées'
      }

      if (hasErrorPhotos) {
        newErrors.photos = 'Certaines photos contiennent des erreurs'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Effacer l'erreur si elle existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }))
    logUserInteraction('ADD_INGREDIENT', 'button-add-ingredient')
  }

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
    logUserInteraction('REMOVE_INGREDIENT', 'button-remove-ingredient', { index })
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
    logUserInteraction('ADD_INSTRUCTION', 'button-add-instruction')
  }

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }))
    logUserInteraction('REMOVE_INSTRUCTION', 'button-remove-instruction', { index })
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
      logUserInteraction('NEXT_STEP', 'button-next-step', { fromStep: step, toStep: step + 1 })
    }
  }

  const prevStep = () => {
    setStep(prev => prev - 1)
    logUserInteraction('PREV_STEP', 'button-prev-step', { fromStep: step, toStep: step - 1 })
  }

  const handlePhotoSelect = (selectedPhotos) => {
    setPhotos(selectedPhotos)
    logDebug('Photos sélectionnées', { photosCount: selectedPhotos.length })
    
    // Effacer l'erreur photos si elle existe
    if (errors.photos) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.photos
        return newErrors
      })
    }
  }

  const submitRecipe = async () => {
    if (!validateStep(3)) return

    setIsSubmitting(true)
    setCurrentError(null)

    try {
      logInfo('Début de soumission de recette', {
        title: formData.title,
        photosCount: photos.length,
        ingredientsCount: formData.ingredients.filter(i => i.trim()).length
      })

      // Préparer les données
      const validIngredients = formData.ingredients.filter(ing => ing.trim())
      const validInstructions = formData.instructions.filter(inst => inst.trim())

      // Utiliser la première photo comme image principale
      const mainPhoto = photos.find(photo => photo.processed && !photo.error)
      if (!mainPhoto) {
        throw new Error('Aucune photo valide trouvée')
      }

      const submissionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: validIngredients,
        instructions: validInstructions.map((instruction, index) => ({
          step: index + 1,
          instruction: instruction.trim()
        })),
        prepTime: formData.prepTime.trim() || null,
        cookTime: formData.cookTime.trim() || null,
        servings: formData.servings.trim() || null,
        category: formData.category,
        difficulty: formData.difficulty,
        author: formData.author.trim() || 'Chef Anonyme',
        image: mainPhoto.imageBytes, // Array de bytes
        photos: photos
          .filter(photo => photo.processed && !photo.error)
          .map(photo => ({
            bytes: photo.imageBytes,
            name: photo.name,
            mimeType: photo.mimeType
          }))
      }

      logDebug('Données préparées pour envoi', {
        ...submissionData,
        image: `[${submissionData.image.length} bytes]`,
        photos: submissionData.photos.map(p => ({ name: p.name, bytes: `[${p.bytes.length} bytes]` }))
      })

      // Envoi avec retry automatique
      const response = await retryOperation(async () => {
        return await supabase
          .from('recipes')
          .insert([submissionData])
          .select()
      }, 3, 1500)

      if (response.error) {
        throw new Error(`Erreur lors de l'envoi: ${response.error.message}`)
      }

      logInfo('Recette soumise avec succès', {
        recipeId: response.data[0]?.id,
        title: submissionData.title
      })

      setShowSuccessMessage(true)
    } catch (error) {
      logError('Erreur lors de la soumission', error, {
        title: formData.title,
        step: 'submission'
      })
      
      setCurrentError({
        message: error.message || 'Une erreur est survenue lors de la soumission',
        type: 'submission_error',
        recoveryStrategy: 'retry'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetError = () => {
    setCurrentError(null)
  }

  if (showSuccessMessage) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)'
      }}>
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-large)',
          padding: 'var(--spacing-xl)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>🎉</div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: 'var(--spacing-md)',
            color: 'var(--primary-orange)'
          }}>
            Recette publiée !
          </h1>
          <p style={{ 
            color: 'var(--text-medium)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Votre recette "{formData.title}" a été publiée avec succès !
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: 'var(--spacing-md) var(--spacing-lg)',
              background: 'var(--primary-orange)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-medium)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Partager une recette - COCO</title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
      </Head>

      {/* Progress Bar */}
      <div style={{
        background: 'white',
        padding: 'var(--spacing-md)',
        borderBottom: '1px solid var(--bg-light)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Étape {step} sur 3
          </span>
          <div style={{
            flex: 1,
            height: '4px',
            background: 'var(--bg-light)',
            borderRadius: '2px',
            margin: '0 var(--spacing-md)',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'var(--primary-coral)',
              width: `${(step / 3) * 100}%`,
              transition: 'width 0.3s ease',
              borderRadius: '2px'
            }}></div>
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--primary-coral)', fontWeight: '600' }}>
            {Math.round((step / 3) * 100)}%
          </span>
        </div>
      </div>

      {/* Error Display */}
      {currentError && (
        <div style={{ padding: 'var(--spacing-md)', maxWidth: '600px', margin: '0 auto' }}>
          <ErrorDisplay error={currentError} resetError={resetError} />
        </div>
      )}

      {/* Step Content */}
      <div style={{ padding: 'var(--spacing-lg)', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📝</div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>
                Informations de base
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Commençons par les détails essentiels de votre recette
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                  Titre de la recette *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ex: Pâtes Carbonara de ma grand-mère"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: errors.title ? '2px solid #ff4444' : '1px solid var(--bg-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem'
                  }}
                />
                {errors.title && (
                  <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)' }}>
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez votre recette, son origine, ce qui la rend spéciale..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: errors.description ? '2px solid #ff4444' : '1px solid var(--bg-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
                {errors.description && (
                  <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)' }}>
                    {errors.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Catégorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-md)',
                      border: errors.category ? '2px solid #ff4444' : '1px solid var(--bg-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Choisir...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)' }}>
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Difficulté
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--bg-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  >
                    {difficulties.map(diff => (
                      <option key={diff} value={diff}>{diff}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Temps de préparation
                  </label>
                  <input
                    type="text"
                    value={formData.prepTime}
                    onChange={(e) => handleInputChange('prepTime', e.target.value)}
                    placeholder="15 min"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--bg-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Temps de cuisson
                  </label>
                  <input
                    type="text"
                    value={formData.cookTime}
                    onChange={(e) => handleInputChange('cookTime', e.target.value)}
                    placeholder="30 min"
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--bg-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                    Portions
                  </label>
                  <input
                    type="text"
                    value={formData.servings}
                    onChange={(e) => handleInputChange('servings', e.target.value)}
                    placeholder="4 pers."
                    style={{
                      width: '100%',
                      padding: 'var(--spacing-md)',
                      border: '1px solid var(--bg-light)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: '500' }}>
                  Votre nom (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="Comment souhaitez-vous être crédité ?"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--bg-light)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Ingredients & Instructions */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🧄</div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>
                Ingrédients et étapes
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Détaillez les ingrédients et les instructions de préparation
              </p>
            </div>

            {/* Ingredients */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Ingrédients *</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      placeholder={`Ingrédient ${index + 1}...`}
                      style={{
                        flex: 1,
                        padding: 'var(--spacing-md)',
                        border: '1px solid var(--bg-light)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem'
                      }}
                    />
                    {formData.ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        style={{
                          padding: 'var(--spacing-md)',
                          border: 'none',
                          background: '#ff4444',
                          color: 'white',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addIngredient}
                style={{
                  marginTop: 'var(--spacing-md)',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px dashed var(--primary-coral)',
                  background: 'transparent',
                  color: 'var(--primary-coral)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                + Ajouter un ingrédient
              </button>
              {errors.ingredients && (
                <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)' }}>
                  {errors.ingredients}
                </p>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Instructions *</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {formData.instructions.map((instruction, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                    <div style={{
                      background: 'var(--primary-coral)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      flexShrink: 0,
                      marginTop: 'var(--spacing-sm)'
                    }}>
                      {index + 1}
                    </div>
                    <textarea
                      value={instruction}
                      onChange={(e) => updateInstruction(index, e.target.value)}
                      placeholder={`Étape ${index + 1}...`}
                      rows={2}
                      style={{
                        flex: 1,
                        padding: 'var(--spacing-md)',
                        border: '1px solid var(--bg-light)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                    {formData.instructions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInstruction(index)}
                        style={{
                          padding: 'var(--spacing-sm)',
                          border: 'none',
                          background: '#ff4444',
                          color: 'white',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          marginTop: 'var(--spacing-sm)'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addInstruction}
                style={{
                  marginTop: 'var(--spacing-md)',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px dashed var(--primary-coral)',
                  background: 'transparent',
                  color: 'var(--primary-coral)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                + Ajouter une étape
              </button>
              {errors.instructions && (
                <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-xs)' }}>
                  {errors.instructions}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📸</div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>
                Photos de votre plat
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Ajoutez des photos appetissantes de votre création
              </p>
            </div>

            <PhotoUpload 
              onPhotoSelect={handlePhotoSelect}
              maxFiles={5}
            />
            
            {errors.photos && (
              <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: 'var(--spacing-md)' }}>
                {errors.photos}
              </p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--spacing-xl)',
          paddingTop: 'var(--spacing-lg)',
          borderTop: '1px solid var(--bg-light)'
        }}>
          {step > 1 ? (
            <button
              onClick={prevStep}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: '1px solid var(--primary-coral)',
                background: 'transparent',
                color: 'var(--primary-coral)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ← Précédent
            </button>
          ) : <div></div>}

          {step < 3 ? (
            <button
              onClick={nextStep}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: 'none',
                background: 'var(--primary-coral)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={submitRecipe}
              disabled={isSubmitting}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: 'none',
                background: isSubmitting ? 'var(--text-light)' : 'var(--primary-coral)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)'
              }}
            >
              {isSubmitting && <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>}
              {isSubmitting ? 'Publication...' : 'Publier la recette'}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
