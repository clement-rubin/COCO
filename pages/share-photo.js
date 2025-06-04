import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import PhotoUpload from '../components/PhotoUpload'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import styles from '../styles/SharePhoto.module.css'

export default function SharePhoto() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  // États du formulaire
  const [photos, setPhotos] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('Facile')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState(4)
  const [ingredients, setIngredients] = useState([''])
  const [instructions, setInstructions] = useState([{ step: 1, instruction: '' }])
  const [tags, setTags] = useState('')
  
  // États de l'interface
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const categories = [
    'Entrée', 'Plat principal', 'Dessert', 'Apéritif', 'Petit-déjeuner',
    'Goûter', 'Boisson', 'Sauce', 'Accompagnement', 'Italien', 'Asiatique',
    'Français', 'Végétarien', 'Végan', 'Sans gluten', 'Healthy'
  ]

  const difficulties = ['Très facile', 'Facile', 'Moyen', 'Difficile', 'Expert']

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent('/share-photo'))
    }
  }, [user, authLoading, router])

  // Gestion des ingrédients
  const addIngredient = () => {
    setIngredients([...ingredients, ''])
  }

  const updateIngredient = (index, value) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = value
    setIngredients(newIngredients)
  }

  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  // Gestion des instructions
  const addInstruction = () => {
    setInstructions([...instructions, { step: instructions.length + 1, instruction: '' }])
  }

  const updateInstruction = (index, value) => {
    const newInstructions = [...instructions]
    newInstructions[index].instruction = value
    setInstructions(newInstructions)
  }

  const removeInstruction = (index) => {
    if (instructions.length > 1) {
      const newInstructions = instructions.filter((_, i) => i !== index)
      // Renuméroter les étapes
      newInstructions.forEach((inst, i) => {
        inst.step = i + 1
      })
      setInstructions(newInstructions)
    }
  }

  // Validation du formulaire
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return photos.length > 0
      case 2:
        return title.trim() && description.trim() && category
      case 3:
        return ingredients.some(ing => ing.trim()) && 
               instructions.some(inst => inst.instruction.trim())
      default:
        return true
    }
  }

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    setSubmitError('')

    try {
      logUserInteraction('RECIPE_SUBMIT_STARTED', 'share-photo-form', {
        photosCount: photos.length,
        category,
        difficulty,
        ingredientsCount: ingredients.filter(ing => ing.trim()).length,
        instructionsCount: instructions.filter(inst => inst.instruction.trim()).length
      })

      // Préparer les données
      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        category,
        difficulty,
        prepTime: prepTime || null,
        cookTime: cookTime || null,
        servings: parseInt(servings),
        ingredients: ingredients.filter(ing => ing.trim()),
        instructions: instructions.filter(inst => inst.instruction.trim()),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        photos: photos.map(photo => ({
          imageUrl: photo.imageUrl,
          mimeType: photo.mimeType
        })),
        author: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Chef Anonyme'
      }

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipeData)
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorData}`)
      }

      const result = await response.json()
      
      logInfo('Recipe created successfully', {
        recipeId: result.id,
        userId: user.id,
        category,
        photosCount: photos.length
      })

      // Redirection vers la recette créée
      router.push(`/recipe/${result.id}?created=true`)
      
    } catch (error) {
      logError('Recipe creation failed', error, {
        userId: user.id,
        formData: { title, category, difficulty }
      })
      
      setSubmitError(
        error.message.includes('413') 
          ? 'Les images sont trop volumineuses. Veuillez réduire leur taille.'
          : 'Erreur lors de la création de la recette. Veuillez réessayer.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Interface de chargement
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Préparation de votre espace créatif...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Partager une recette - COCO</title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
      </Head>

      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Retour
        </button>
        <h1>Partager ma recette</h1>
        <button 
          onClick={() => setShowPreview(!showPreview)} 
          className={styles.previewButton}
        >
          {showPreview ? 'Éditer' : 'Aperçu'}
        </button>
      </div>

      {/* Indicateur de progression */}
      <div className={styles.progressBar}>
        <div className={styles.progressSteps}>
          {[1, 2, 3].map(step => (
            <div 
              key={step}
              className={`${styles.progressStep} ${
                currentStep >= step ? styles.active : ''
              } ${validateStep(step) ? styles.completed : ''}`}
            >
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div 
          className={styles.progressFill}
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>

      {/* Formulaire */}
      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        {/* Étape 1: Photos */}
        {currentStep === 1 && (
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <h2>📸 Ajoutez vos photos</h2>
              <p>Montrez votre délicieuse création</p>
            </div>
            
            <PhotoUpload 
              onPhotoSelect={setPhotos}
              maxFiles={5}
            />
            
            {photos.length > 0 && (
              <div className={styles.photoTips}>
                <p>✨ Parfait ! {photos.length} photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''}</p>
                <p>💡 Conseil : Ajoutez des photos sous différents angles pour inspirer votre communauté</p>
              </div>
            )}
          </div>
        )}

        {/* Étape 2: Informations de base */}
        {currentStep === 2 && (
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <h2>📝 Décrivez votre recette</h2>
              <p>Donnez envie avec un titre et une description alléchante</p>
            </div>

            <div className={styles.formGroup}>
              <label>Titre de la recette *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Pasta Carbonara de ma grand-mère"
                maxLength={100}
                className={styles.input}
              />
              <span className={styles.charCount}>{title.length}/100</span>
            </div>

            <div className={styles.formGroup}>
              <label>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Racontez l'histoire de cette recette, son origine, ce qui la rend spéciale..."
                maxLength={500}
                rows={4}
                className={styles.textarea}
              />
              <span className={styles.charCount}>{description.length}/500</span>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Catégorie *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Choisir une catégorie</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Difficulté</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className={styles.select}
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Temps de préparation</label>
                <input
                  type="text"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="Ex: 20 min"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Temps de cuisson</label>
                <input
                  type="text"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="Ex: 30 min"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Portions</label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  min="1"
                  max="20"
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Étape 3: Ingrédients et Instructions */}
        {currentStep === 3 && (
          <div className={styles.step}>
            <div className={styles.stepHeader}>
              <h2>🥘 Ingrédients et étapes</h2>
              <p>Détaillez votre recette pour que chacun puisse la réaliser</p>
            </div>

            {/* Ingrédients */}
            <div className={styles.section}>
              <h3>Ingrédients</h3>
              {ingredients.map((ingredient, index) => (
                <div key={index} className={styles.ingredientRow}>
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    placeholder={`Ingrédient ${index + 1} (ex: 200g de pâtes)`}
                    className={styles.input}
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredient}
                className={styles.addButton}
              >
                + Ajouter un ingrédient
              </button>
            </div>

            {/* Instructions */}
            <div className={styles.section}>
              <h3>Instructions</h3>
              {instructions.map((instruction, index) => (
                <div key={index} className={styles.instructionRow}>
                  <div className={styles.stepNumber}>{instruction.step}</div>
                  <textarea
                    value={instruction.instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Étape ${instruction.step}: Décrivez cette étape en détail...`}
                    rows={3}
                    className={styles.textarea}
                  />
                  {instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className={styles.removeButton}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addInstruction}
                className={styles.addButton}
              >
                + Ajouter une étape
              </button>
            </div>

            {/* Tags optionnels */}
            <div className={styles.formGroup}>
              <label>Tags (optionnel)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="italien, fait-maison, rapide (séparés par des virgules)"
                className={styles.input}
              />
            </div>
          </div>
        )}

        {/* Erreur de soumission */}
        {submitError && (
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className={styles.navigation}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className={styles.navButton}
              disabled={isSubmitting}
            >
              ← Précédent
            </button>
          )}
          
          <div className={styles.navSpacer} />
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              className={styles.navButton}
              disabled={!validateStep(currentStep)}
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitButton}
              disabled={!validateStep(3) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.spinner}></div>
                  Publication...
                </>
              ) : (
                <>
                  🚀 Publier ma recette
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
