import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import { useRetryOperation } from '../utils/retryOperation'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { uploadImageAsBytes } from '../lib/supabase'

export default function SubmitRecipe() {
  const router = useRouter()
  const { user } = useAuth()
  const { loading, executeWithRetry, progress, error } = useRetryOperation()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prepTime: '',
    cookTime: '',
    category: '',
    difficulty: 'Facile',
    author: '',
    ingredients: [{ name: '', quantity: '', unit: '' }],
    instructions: [{ step: 1, description: '' }]
  })
  const [photos, setPhotos] = useState([])
  const [errors, setErrors] = useState({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const categories = [
    'Entrée', 'Plat principal', 'Dessert', 'Apéritif', 
    'Boisson', 'Sauce', 'Accompagnement', 'Petit-déjeuner',
    'Snack', 'Végétarien', 'Vegan', 'Sans gluten'
  ]

  const difficulties = ['Facile', 'Moyen', 'Difficile']

  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      setFormData(prev => ({ ...prev, author: user.user_metadata.display_name }))
    }
  }, [user])

  // Protection contre la perte de données
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    
    // Effacer les erreurs lors de la saisie
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const addIngredient = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }]
    }))
    setIsDirty(true)
  }, [])

  const removeIngredient = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
    setIsDirty(true)
  }, [])

  const updateIngredient = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }))
    setIsDirty(true)
  }, [])

  const addInstruction = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { 
        step: prev.instructions.length + 1, 
        description: '' 
      }]
    }))
    setIsDirty(true)
  }, [])

  const removeInstruction = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions
        .filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, step: i + 1 }))
    }))
    setIsDirty(true)
  }, [])

  const updateInstruction = useCallback((index, value) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, description: value } : inst
      )
    }))
    setIsDirty(true)
  }, [])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis'
    }
    
    if (formData.ingredients.some(ing => !ing.name.trim())) {
      newErrors.ingredients = 'Tous les ingrédients doivent avoir un nom'
    }
    
    if (formData.instructions.some(inst => !inst.description.trim())) {
      newErrors.instructions = 'Toutes les instructions doivent être remplies'
    }
    
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est requise'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      logUserInteraction('FORM_VALIDATION_FAILED', 'submit-recipe', { errors })
      return
    }

    const submitOperation = async () => {
      logInfo('Début soumission recette', { 
        title: formData.title,
        photosCount: photos.length,
        ingredientsCount: formData.ingredients.length
      })

      // Préparer les données pour la base
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        prepTime: formData.prepTime.trim() || null,
        cookTime: formData.cookTime.trim() || null,
        category: formData.category || null,
        difficulty: formData.difficulty,
        author: formData.author.trim() || null,
        user_id: user?.id,
        ingredients: formData.ingredients
          .filter(ing => ing.name.trim())
          .map(ing => ({
            name: ing.name.trim(),
            quantity: ing.quantity.trim() || null,
            unit: ing.unit.trim() || null
          })),
        instructions: formData.instructions
          .filter(inst => inst.description.trim())
          .map((inst, index) => ({
            step: index + 1,
            description: inst.description.trim()
          })),
        image: photos[0]?.imageBytes || null // Utiliser la première photo
      }

      // Simulation d'envoi (remplacer par vraie API)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      return recipeData
    }

    try {
      await executeWithRetry(submitOperation, {
        maxRetries: 2,
        baseDelay: 1000
      })
      
      setShowSuccess(true)
      setIsDirty(false)
      
      logUserInteraction('RECIPE_SUBMITTED_SUCCESS', 'submit-recipe', {
        title: formData.title,
        category: formData.category
      })
      
      // Redirection après succès
      setTimeout(() => {
        router.push('/mes-recettes')
      }, 2000)
      
    } catch (error) {
      logError('Erreur soumission recette', error, {
        title: formData.title,
        hasPhotos: photos.length > 0
      })
    }
  }

  if (showSuccess) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: 'var(--spacing-lg)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>🎉</div>
        <h1 style={{ 
          color: 'var(--primary-orange)', 
          marginBottom: 'var(--spacing-md)',
          fontSize: '1.8rem'
        }}>
          Recette publiée avec succès !
        </h1>
        <p style={{ 
          color: 'var(--text-medium)', 
          marginBottom: 'var(--spacing-lg)',
          maxWidth: '400px',
          lineHeight: '1.5'
        }}>
          Votre délicieuse création "{formData.title}" est maintenant disponible pour la communauté COCO !
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button 
            onClick={() => router.push('/mes-recettes')}
            style={{
              background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
              color: 'white',
              border: 'none',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderRadius: 'var(--border-radius-medium)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Voir mes recettes
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              color: 'var(--primary-orange)',
              border: '2px solid var(--primary-orange)',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderRadius: 'var(--border-radius-medium)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Nouvelle recette
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--spacing-md)' }}>
      <Head>
        <title>Partager une recette - COCO</title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
      </Head>

      {/* Header */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: 'var(--spacing-xl)',
        padding: 'var(--spacing-lg)',
        background: 'linear-gradient(135deg, var(--warm-cream) 0%, white 100%)',
        borderRadius: 'var(--border-radius-large)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>👨‍🍳</div>
        <h1 style={{ 
          margin: '0 0 var(--spacing-sm) 0',
          color: 'var(--primary-orange)',
          fontSize: '1.8rem',
          fontFamily: 'Playfair Display, serif'
        }}>
          Partager une recette
        </h1>
        <p style={{ 
          margin: 0,
          color: 'var(--text-medium)',
          fontSize: '1rem'
        }}>
          Partagez votre création culinaire avec la communauté
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Photos */}
        <div className="form-section">
          <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-dark)' }}>
            📷 Photos de votre plat
          </h3>
          <PhotoUpload onPhotoSelect={setPhotos} maxFiles={5} />
          {errors.photos && (
            <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginTop: 'var(--spacing-sm)' }}>
              {errors.photos}
            </div>
          )}
        </div>

        {/* Informations de base */}
        <div className="form-section">
          <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--text-dark)' }}>
            📝 Informations de base
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--spacing-xs)',
                fontWeight: '600',
                color: 'var(--text-dark)'
              }}>
                Titre de la recette *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ex: Tarte aux pommes de grand-mère"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: `2px solid ${errors.title ? 'var(--error-color)' : 'var(--border-light)'}`,
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-orange)'}
                onBlur={(e) => e.target.style.borderColor = errors.title ? 'var(--error-color)' : 'var(--border-light)'}
              />
              {errors.title && (
                <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginTop: 'var(--spacing-xs)' }}>
                  {errors.title}
                </div>
              )}
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--spacing-xs)',
                fontWeight: '600',
                color: 'var(--text-dark)'
              }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez votre recette, son histoire, ses saveurs..."
                rows={4}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 'var(--spacing-md)' 
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-xs)',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}>
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-medium)',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-xs)',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}>
                  Difficulté
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-medium)',
                    fontSize: '1rem',
                    background: 'white'
                  }}
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-xs)',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}>
                  Temps de préparation
                </label>
                <input
                  type="text"
                  value={formData.prepTime}
                  onChange={(e) => handleInputChange('prepTime', e.target.value)}
                  placeholder="Ex: 30 min"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-medium)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 'var(--spacing-xs)',
                  fontWeight: '600',
                  color: 'var(--text-dark)'
                }}>
                  Temps de cuisson
                </label>
                <input
                  type="text"
                  value={formData.cookTime}
                  onChange={(e) => handleInputChange('cookTime', e.target.value)}
                  placeholder="Ex: 45 min"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-md)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-medium)',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ingrédients */}
        <div className="form-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-md)'
          }}>
            <h3 style={{ margin: 0, color: 'var(--text-dark)' }}>
              🥕 Ingrédients *
            </h3>
            <button
              type="button"
              onClick={addIngredient}
              style={{
                background: 'var(--primary-orange)',
                color: 'white',
                border: 'none',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius-medium)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Ajouter
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr auto', 
                gap: 'var(--spacing-sm)',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  placeholder="Nom de l'ingrédient"
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-small)',
                    fontSize: '0.9rem'
                  }}
                />
                <input
                  type="text"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                  placeholder="Quantité"
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-small)',
                    fontSize: '0.9rem'
                  }}
                />
                <input
                  type="text"
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="Unité"
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-small)',
                    fontSize: '0.9rem'
                  }}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    style={{
                      background: 'var(--error-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.ingredients && (
            <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginTop: 'var(--spacing-sm)' }}>
              {errors.ingredients}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="form-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 'var(--spacing-md)'
          }}>
            <h3 style={{ margin: 0, color: 'var(--text-dark)' }}>
              📋 Instructions *
            </h3>
            <button
              type="button"
              onClick={addInstruction}
              style={{
                background: 'var(--primary-orange)',
                color: 'white',
                border: 'none',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--border-radius-medium)',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Ajouter
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {formData.instructions.map((instruction, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: 'auto 1fr auto', 
                gap: 'var(--spacing-sm)',
                alignItems: 'start'
              }}>
                <div style={{
                  background: 'var(--primary-orange)',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  marginTop: 'var(--spacing-sm)'
                }}>
                  {instruction.step}
                </div>
                <textarea
                  value={instruction.description}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder="Décrivez cette étape..."
                  rows={3}
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '2px solid var(--border-light)',
                    borderRadius: 'var(--border-radius-small)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    style={{
                      background: 'var(--error-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 'var(--spacing-sm)'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.instructions && (
            <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', marginTop: 'var(--spacing-sm)' }}>
              {errors.instructions}
            </div>
          )}
        </div>

        {/* Feedback de progression */}
        {(loading || progress) && (
          <div style={{
            padding: 'var(--spacing-md)',
            background: 'var(--bg-light)',
            borderRadius: 'var(--border-radius-medium)',
            border: '1px solid var(--border-light)',
            textAlign: 'center'
          }}>
            {progress?.retrying ? (
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>🔄</div>
                <p style={{ margin: 0, color: 'var(--text-medium)' }}>
                  Tentative {progress.attempt}/{progress.maxRetries + 1}...
                </p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-sm)' }}>📤</div>
                <p style={{ margin: 0, color: 'var(--text-medium)' }}>
                  Publication de votre recette en cours...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-md)',
          justifyContent: 'flex-end',
          padding: 'var(--spacing-lg) 0'
        }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              color: 'var(--text-medium)',
              border: '2px solid var(--border-light)',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderRadius: 'var(--border-radius-medium)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'var(--text-light)' : 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
              color: 'white',
              border: 'none',
              padding: 'var(--spacing-md) var(--spacing-xl)',
              borderRadius: 'var(--border-radius-medium)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              minWidth: '160px'
            }}
          >
            {loading ? 'Publication...' : 'Publier la recette'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .form-section {
          background: white;
          padding: var(--spacing-lg);
          border-radius: var(--border-radius-large);
          box-shadow: var(--shadow-light);
          border: 1px solid var(--border-light);
        }

        @media (max-width: 768px) {
          .form-section {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  )
}
