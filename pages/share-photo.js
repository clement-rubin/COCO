import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import QuickRecipeForm from '../components/QuickRecipeForm'
import PhotoUpload from '../components/PhotoUpload'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { uploadImageToSupabaseAndGetUrl } from '../utils/imageUtils'
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
  
  // Nouveaux états pour le choix du mode
  const [formMode, setFormMode] = useState(null) // 'quick' ou 'complete'
  const [showModeSelector, setShowModeSelector] = useState(true)

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

  // Validation du formulaire avec messages d'aide - adaptée selon le mode
  const validateStep = (step) => {
    if (formMode === 'quick') {
      // Mode rapide : seule la photo et le titre sont requis
      switch (step) {
        case 1:
          return photos.length > 0
        case 2:
          return title.trim()
        default:
          return true
      }
    }
    
    // Mode complet (comportement original)
    switch (step) {
      case 1:
        return photos.length > 0
      case 2:
        return title.trim() && description.trim()
      case 3:
        return true
      default:
        return true
    }
  }

  const getStepValidationMessage = (step) => {
    if (formMode === 'quick') {
      switch (step) {
        case 1:
          return photos.length === 0 ? "Ajoutez une photo pour continuer" : ""
        case 2:
          return !title.trim() ? "Donnez un nom à votre plat" : ""
        default:
          return ""
      }
    }
    
    // Mode complet (comportement original)
    switch (step) {
      case 1:
        return photos.length === 0 ? "Ajoutez au moins une photo pour continuer" : ""
      case 2:
        if (!title.trim()) return "Le titre est requis"
        if (!description.trim()) return "La description est requise"
        return ""
      case 3:
        return ""
      default:
        return ""
    }
  }

  // Navigation avec animations - adaptée selon le mode
  const goToStep = (targetStep) => {
    if (formMode === 'quick') {
      // En mode rapide, on saute directement à l'étape 2 après les photos
      if (targetStep > currentStep && !validateStep(currentStep)) {
        return
      }
      setCurrentStep(targetStep)
      return
    }
    
    // Mode complet (comportement original)
    if (targetStep > currentStep && !validateStep(currentStep)) {
      return
    }
    setCurrentStep(targetStep)
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

      // Upload des images vers Supabase Storage et récupération des URLs
      let uploadedImageUrls = []
      if (photos.length > 0) {
        logInfo('Début de l\'upload des images vers Supabase', { photosCount: photos.length })
        
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i]
          if (photo.imageFile && photo.imageFile instanceof File) {
            try {
              const imageUrl = await uploadImageToSupabaseAndGetUrl(photo.imageFile, `recipe_${Date.now()}_${i}`)
              uploadedImageUrls.push(imageUrl)
              logInfo(`Image ${i + 1} uploadée avec succès`, { imageUrl: imageUrl?.substring(0, 50) + '...' })
            } catch (uploadError) {
              logError(`Erreur upload image ${i + 1}`, uploadError)
              // Continue avec les autres images
            }
          }
        }
        
        logInfo('Upload des images terminé', { 
          totalPhotos: photos.length, 
          successfulUploads: uploadedImageUrls.length 
        })
      }

      // Préparer les données avec la première image uploadée comme image principale
      const recipeData = {
        title: title.trim(),
        description: formMode === 'quick' 
          ? (description.trim() || '')
          : description.trim(),
        category: formMode === 'quick' ? 'Photo partagée' : category,
        difficulty: formMode === 'quick' ? 'Facile' : difficulty,
        prepTime: formMode === 'quick' ? null : (prepTime || null),
        cookTime: formMode === 'quick' ? null : (cookTime || null),
        servings: formMode === 'quick' ? null : (servings ? servings.toString() : null),
        ingredients: formMode === 'quick' ? [] : ingredients.filter(ing => ing.trim()),
        instructions: formMode === 'quick' ? [] : instructions.filter(inst => inst.instruction.trim()),
        tags: formMode === 'quick' ? [] : tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        image: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        author: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Chef Anonyme',
        user_id: user.id,
        formMode: formMode
      }

      logInfo('Données de recette préparées', {
        hasMainImage: !!recipeData.image,
        photosCount: uploadedImageUrls.length,
        title: recipeData.title
      })

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
        photosCount: uploadedImageUrls.length,
        hasMainImage: !!result.image
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

  // Composant de sélection du mode amélioré
  const ModeSelector = () => (
    <div className={styles.modeSelector}>
      <div className={styles.modeSelectorHeader}>
        <h2>Partager votre création</h2>
        <p>Choisissez la méthode qui vous convient le mieux</p>
      </div>
      
      <div className={styles.modeOptions}>
        {/* Mode rapide - Design premium */}
        <div 
          className={`${styles.modeOption} ${styles.recommended}`}
          onClick={() => {
            setFormMode('quick')
            setShowModeSelector(false)
            logUserInteraction('MODE_QUICK_SELECTED', 'share-photo')
          }}
        >
          <div className={styles.modeIcon}>⚡</div>
          <div className={styles.recommendedBadge}>RECOMMANDÉ</div>
          <h3>Partage Express</h3>
          <p>Partagez instantanément avec style</p>
          <div className={styles.modeFeatures}>
            <span>📸 Une photo qui fait envie</span>
            <span>✏️ Un titre accrocheur</span>
            <span>🚀 Publié en 30 secondes</span>
            <span>✨ Parfait pour l'inspiration</span>
          </div>
          <div className={styles.modeButton}>Partager maintenant ⚡</div>
        </div>

        {/* Mode complet - Design cohérent */}
        <div 
          className={styles.modeOption}
          onClick={() => {
            setFormMode('complete')
            setShowModeSelector(false)
            logUserInteraction('MODE_COMPLETE_SELECTED', 'share-photo')
          }}
        >
          <div className={styles.modeIcon}>📝</div>
          <h3>Recette Complète</h3>
          <p>Tous les détails pour reproduire</p>
          <div className={styles.modeFeatures}>
            <span>🥘 Ingrédients détaillés</span>
            <span>👨‍🍳 Étapes pas à pas</span>
            <span>⏱️ Temps de préparation</span>
            <span>🎯 Guide complet</span>
          </div>
          <div className={styles.modeButton}>Créer la recette complète</div>
        </div>
      </div>
      
      {/* Indication d'aide */}
      <div className={styles.modeHelp} style={{
        textAlign: 'center',
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.1)',
        color: '#374151',
        fontSize: '0.9rem'
      }}>
        💡 <strong>Astuce :</strong> Vous pouvez toujours modifier votre recette après publication
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <Head>
        <title>
          {formMode === 'quick' ? 'Partager une photo - COCO' : 'Partager une recette - COCO'}
        </title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {showModeSelector ? (
        <ModeSelector />
      ) : (
        <>
          {/* Mode EXPRESS : tout le design est géré par QuickRecipeForm */}
          {formMode === 'quick' ? (
            <QuickRecipeForm />
          ) : (
            // Mode complet : formulaire classique (inchangé)
            <>
              {/* Header */}
              <div className={styles.header}>
                <button 
                  onClick={() => setShowModeSelector(true)} 
                  className={styles.backButton}
                >
                  ← Changer le mode
                </button>
                <h1>✨ Partager ma recette</h1>
                <button 
                  onClick={() => setShowPreview && setShowPreview(prev => !prev)} 
                  className={styles.previewButton}
                >
                  👁️ Aperçu
                </button>
              </div>

              {/* Indicateur de progression - adapté au mode */}
              <div className={styles.progressBar}>
                <div className={styles.progressSteps}>
                  { (formMode === 'quick' ? [
                    { step: 1, label: '📸', title: 'Photo' },
                    { step: 2, label: '✏️', title: 'Titre' }
                  ] : [
                    { step: 1, label: '📸', title: 'Photos' },
                    { step: 2, label: '📝', title: 'Détails' },
                    { step: 3, label: '🥘', title: 'Recette' }
                  ]).map(({ step, label, title }) => (
                    <div 
                      key={step}
                      className={`${styles.progressStep} ${
                        currentStep >= step ? styles.active : ''
                      } ${validateStep(step) ? styles.completed : ''}`}
                      onClick={() => goToStep(step)}
                      style={{ cursor: step <= currentStep ? 'pointer' : 'default' }}
                      title={title}
                    >
                      {validateStep(step) ? '✓' : label}
                    </div>
                  ))}
                </div>
                <div 
                  className={styles.progressFill}
                  style={{ 
                    width: formMode === 'quick' 
                      ? `${((currentStep - 1) / 1) * 100}%`
                      : `${((currentStep - 1) / 2) * 100}%`
                  }}
                />
              </div>

              {/* Formulaire */}
              <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                {/* Étape 1: Photos - Style adapté selon le mode */}
                {currentStep === 1 && (
                  <div className={`${styles.step} ${formMode === 'quick' ? styles.quickModeStep : ''}`}>
                    <div className={styles.stepHeader}>
                      <h2>
                        {formMode === 'quick' ? 'Votre belle photo' : 'Montrez-nous votre création'}
                      </h2>
                      <p>
                        {formMode === 'quick' 
                          ? 'Une image qui inspire, c\'est la magie du partage express !'
                          : 'Ajoutez des photos appétissantes de votre plat'
                        }
                      </p>
                    </div>
                    
                    <PhotoUpload 
                      onPhotoSelect={setPhotos}
                      maxFiles={formMode === 'quick' ? 1 : 5}
                    />
                    
                    {photos.length > 0 && (
                      <div className={styles.photoTips}>
                        <p>🎉 Parfait ! {photos.length} photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''}</p>
                        {formMode === 'quick' ? (
                          <>
                            <p>⚡ Mode express activé - Vous êtes à un clic du partage !</p>
                            <p>✨ Votre photo va inspirer la communauté</p>
                          </>
                        ) : (
                          <>
                            <p>💡 Conseil : La première photo sera votre image principale</p>
                            <p>✨ Astuce : Variez les angles pour inspirer votre communauté</p>
                          </>
                        )}
                      </div>
                    )}

                    {!validateStep(1) && (
                      <div className={styles.validationHint}>
                        <span className={styles.errorIcon}>📷</span>
                        {getStepValidationMessage(1)}
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 2: Informations de base - Interface adaptée */}
                {currentStep === 2 && (
                  <div className={`${styles.step} ${formMode === 'quick' ? styles.quickModeStep : ''}`}>
                    <div className={styles.stepHeader}>
                      <h2>
                        {formMode === 'quick' ? 'Donnez-lui un nom' : 'Décrivez votre chef-d\'œuvre'}
                      </h2>
                      <p>
                        {formMode === 'quick'
                          ? 'Un titre qui fait saliver, et le tour est joué !'
                          : 'Donnez envie avec un titre accrocheur et une description savoureuse'
                        }
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        {formMode === 'quick' ? '✨ Nom de votre création *' : 'Titre de la recette *'}
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          formMode === 'quick'
                            ? "Ex: Mon plat du moment 😋"
                            : "Ex: Pasta Carbonara de ma grand-mère"
                        }
                        maxLength={100}
                        className={styles.input}
                        style={formMode === 'quick' ? {
                          borderColor: '#ff6b35',
                          boxShadow: '0 0 0 3px rgba(255, 107, 53, 0.1)'
                        } : {}}
                      />
                      <span className={styles.charCount}>{title.length}/100</span>
                    </div>

                    {formMode === 'complete' && (
                      <>
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
                              <option value="">🍽️ Choisir une catégorie</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.formGroup}>
                            <label>Niveau de difficulté</label>
                            <select
                              value={difficulty}
                              onChange={(e) => setDifficulty(e.target.value)}
                              className={styles.select}
                            >
                              {difficulties.map(diff => (
                                <option key={diff} value={diff}>
                                  {diff === 'Très facile' ? '🟢' : 
                                   diff === 'Facile' ? '🟡' : 
                                   diff === 'Moyen' ? '🟠' : 
                                   diff === 'Difficile' ? '🔴' : '🔴'} {diff}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label>⏱️ Temps de préparation</label>
                            <input
                              type="text"
                              value={prepTime}
                              onChange={(e) => setPrepTime(e.target.value)}
                              placeholder="Ex: 20 min"
                              className={styles.input}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>🔥 Temps de cuisson</label>
                            <input
                              type="text"
                              value={cookTime}
                              onChange={(e) => setCookTime(e.target.value)}
                              placeholder="Ex: 30 min"
                              className={styles.input}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label>👥 Portions</label>
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
                      </>
                    )}

                    {!validateStep(2) && (
                      <div className={styles.validationHint}>
                        <span className={styles.errorIcon}>📝</span>
                        {getStepValidationMessage(2)}
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 3: Ingrédients et Instructions - seulement en mode complet */}
                {currentStep === 3 && formMode === 'complete' && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <h2>🥘 Détaillez votre recette</h2>
                      <p>Listez les ingrédients et décrivez chaque étape pour que tout le monde puisse la réaliser</p>
                    </div>

                    {/* Ingrédients */}
                    <div className={styles.section}>
                      <h3>🛒 Liste des ingrédients</h3>
                      {ingredients.map((ingredient, index) => (
                        <div key={index} className={styles.ingredientRow}>
                          <input
                            type="text"
                            value={ingredient}
                            onChange={(e) => updateIngredient(index, e.target.value)}
                            placeholder={`Ingrédient ${index + 1} (ex: 200g de pâtes fraîches)`}
                            className={styles.input}
                          />
                          {ingredients.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className={styles.removeButton}
                              title="Supprimer cet ingrédient"
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
                        ➕ Ajouter un ingrédient
                      </button>
                    </div>

                    {/* Instructions */}
                    <div className={styles.section}>
                      <h3>👨‍🍳 Étapes de préparation</h3>
                      {instructions.map((instruction, index) => (
                        <div key={index} className={styles.instructionRow}>
                          <div className={styles.stepNumber}>{instruction.step}</div>
                          <textarea
                            value={instruction.instruction}
                            onChange={(e) => updateInstruction(index, e.target.value)}
                            placeholder={`Étape ${instruction.step}: Décrivez cette étape en détail (ex: Dans une grande casserole, faites bouillir l'eau salée...)`}
                            rows={3}
                            className={styles.textarea}
                          />
                          {instructions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInstruction(index)}
                              className={styles.removeButton}
                              title="Supprimer cette étape"
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
                        ➕ Ajouter une étape
                      </button>
                    </div>

                    {/* Tags optionnels */}
                    <div className={styles.formGroup}>
                      <label>🏷️ Tags (optionnel)</label>
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="italien, fait-maison, rapide, végétarien (séparés par des virgules)"
                        className={styles.input}
                      />
                    </div>

                    {!validateStep(3) && (
                      <div className={styles.validationHint}>
                        <span className={styles.errorIcon}>🥘</span>
                        {getStepValidationMessage(3)}
                      </div>
                    )}
                  </div>
                )}

                {/* Erreur de soumission */}
                {submitError && (
                  <div className={styles.errorMessage}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <div>
                      <strong>Oups ! Une erreur s'est produite</strong>
                      <p>{submitError}</p>
                    </div>
                  </div>
                )}

                {/* Navigation - adaptée au mode */}
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
                  
                  {(formMode === 'quick' && currentStep === 2) || (formMode === 'complete' && currentStep === 3) ? (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className={styles.submitButton}
                      disabled={!validateStep(currentStep) || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className={styles.spinner}></div>
                          Publication en cours...
                        </>
                      ) : (
                        <>
                          {formMode === 'quick' ? '⚡ Partager maintenant' : '🚀 Publier ma recette'}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className={styles.navButton}
                      disabled={!validateStep(currentStep)}
                      title={!validateStep(currentStep) ? getStepValidationMessage(currentStep) : ''}
                    >
                      Suivant →
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  )
}
