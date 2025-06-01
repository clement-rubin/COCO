import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'
import { logInfo, logError, logWarning, logDebug, logUserInteraction } from '../utils/logger'

export default function SubmitRecipe() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    category: '',
    difficulty: 'Facile',
    author: ''
  })
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const categories = [
    'Entrées', 'Plats principaux', 'Desserts', 'Apéritifs', 
    'Soupes', 'Salades', 'Végétarien', 'Vegan', 'Sans gluten'
  ]

  const difficulties = ['Facile', 'Moyen', 'Difficile']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    logDebug(`Changement de champ: ${name}`, { 
      fieldName: name, 
      valueLength: value.length,
      isEmpty: !value.trim()
    })
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      logDebug(`Effacement d'erreur pour le champ: ${name}`)
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    logInfo('Début de la validation du formulaire')
    const newErrors = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est obligatoire'
      logWarning('Validation échouée: titre manquant')
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est obligatoire'
      logWarning('Validation échouée: description manquante')
    }
    if (!formData.ingredients.trim()) {
      newErrors.ingredients = 'Les ingrédients sont obligatoires'
      logWarning('Validation échouée: ingrédients manquants')
    }
    if (!formData.instructions.trim()) {
      newErrors.instructions = 'Les instructions sont obligatoires'
      logWarning('Validation échouée: instructions manquantes')
    }
    if (photos.length === 0) {
      newErrors.photos = 'Au moins une photo est obligatoire'
      logWarning('Validation échouée: aucune photo')
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    logInfo('Résultat de la validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      formDataKeys: Object.keys(formData).filter(key => formData[key].trim()),
      photosCount: photos.length
    })
    
    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    logUserInteraction('SUBMIT_FORM', 'recipe-form', {
      hasPhotos: photos.length > 0,
      formFieldsCompleted: Object.keys(formData).filter(key => formData[key].trim()).length
    })
    
    if (!validateForm()) {
      logWarning('Soumission annulée: validation échouée')
      return
    }

    setIsSubmitting(true)
    logInfo('Début de la soumission de la recette')

    try {
      // Préparer les données pour Supabase
      const recipeData = {
        title: formData.title,
        description: formData.description,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
        prepTime: formData.prepTime,
        cookTime: formData.cookTime,
        servings: formData.servings,
        category: formData.category,
        difficulty: formData.difficulty,
        author: formData.author || 'Anonyme',
        image: photos[0]?.preview || '',
        photos: photos.map(p => p.preview),
        created_at: new Date().toISOString()
      }

      logDebug('Données de la recette préparées', {
        dataKeys: Object.keys(recipeData),
        titleLength: recipeData.title.length,
        ingredientsLines: recipeData.ingredients.split('\n').length,
        instructionsLines: recipeData.instructions.split('\n').length,
        photosCount: recipeData.photos.length
      })

      // Insérer dans Supabase
      logInfo('Insertion dans Supabase en cours...')
      const { data, error } = await supabase
        .from('recipes')
        .insert([recipeData])
        .select()
        .single()

      if (error) {
        logError('Erreur Supabase lors de l\'insertion', error, {
          context: 'recipe_submission',
          recipeTitle: formData.title,
          supabaseError: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          }
        })
        throw error
      }

      logInfo('Recette créée avec succès', {
        recipeId: data.id,
        title: data.title,
        author: data.author
      })

      // Rediriger vers la page de la recette créée
      logInfo(`Redirection vers la recette créée: /recipes/${data.id}`)
      router.push(`/recipes/${data.id}`)
      
    } catch (error) {
      logError('Erreur lors de la soumission de la recette', error, {
        context: 'recipe_submission_complete',
        formData: {
          title: formData.title,
          hasDescription: !!formData.description,
          hasIngredients: !!formData.ingredients,
          hasInstructions: !!formData.instructions,
          category: formData.category,
          difficulty: formData.difficulty
        },
        photosCount: photos.length
      })
      
      setErrors({ submit: 'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.' })
    } finally {
      setIsSubmitting(false)
      logDebug('Fin du processus de soumission')
    }
  }

  return (
    <>
      <Head>
        <title>Partager ma recette - COCO</title>
        <meta name="description" content="Partagez votre délicieuse recette avec la communauté COCO" />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← Retour
          </button>
          <h1>📸 Partager ma recette</h1>
          <p className={styles.subtitle}>
            Partagez votre création culinaire avec la communauté COCO
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Section Photos */}
          <div className={styles.section}>
            <h2>📷 Photos de votre plat</h2>
            <PhotoUpload 
              onPhotoSelect={setPhotos}
              maxFiles={5}
            />
            {errors.photos && <span className={styles.error}>{errors.photos}</span>}
          </div>

          {/* Informations de base */}
          <div className={styles.section}>
            <h2>📝 Informations de base</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="title">Nom de votre plat *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ex: Tarte aux pommes de grand-mère"
                className={errors.title ? styles.inputError : ''}
              />
              {errors.title && <span className={styles.error}>{errors.title}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez votre plat, son histoire, ce qui le rend spécial..."
                rows={4}
                className={errors.description ? styles.inputError : ''}
              />
              {errors.description && <span className={styles.error}>{errors.description}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="category">Catégorie</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">Choisir une catégorie</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="difficulty">Difficulté</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleInputChange}
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="prepTime">Temps de préparation</label>
                <input
                  type="text"
                  id="prepTime"
                  name="prepTime"
                  value={formData.prepTime}
                  onChange={handleInputChange}
                  placeholder="30 min"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="cookTime">Temps de cuisson</label>
                <input
                  type="text"
                  id="cookTime"
                  name="cookTime"
                  value={formData.cookTime}
                  onChange={handleInputChange}
                  placeholder="45 min"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="servings">Portions</label>
                <input
                  type="text"
                  id="servings"
                  name="servings"
                  value={formData.servings}
                  onChange={handleInputChange}
                  placeholder="4 personnes"
                />
              </div>
            </div>
          </div>

          {/* Ingrédients */}
          <div className={styles.section}>
            <h2>🛒 Ingrédients</h2>
            <div className={styles.formGroup}>
              <textarea
                id="ingredients"
                name="ingredients"
                value={formData.ingredients}
                onChange={handleInputChange}
                placeholder="Listez vos ingrédients (un par ligne)&#10;Ex:&#10;- 3 pommes&#10;- 200g de farine&#10;- 2 œufs"
                rows={8}
                className={errors.ingredients ? styles.inputError : ''}
              />
              {errors.ingredients && <span className={styles.error}>{errors.ingredients}</span>}
            </div>
          </div>

          {/* Instructions */}
          <div className={styles.section}>
            <h2>👨‍🍳 Instructions</h2>
            <div className={styles.formGroup}>
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Décrivez les étapes de préparation (une par ligne)&#10;Ex:&#10;1. Préchauffer le four à 180°C&#10;2. Éplucher et couper les pommes&#10;3. Mélanger la farine et les œufs"
                rows={10}
                className={errors.instructions ? styles.inputError : ''}
              />
              {errors.instructions && <span className={styles.error}>{errors.instructions}</span>}
            </div>
          </div>

          {/* Auteur */}
          <div className={styles.section}>
            <h2>👤 Signature</h2>
            <div className={styles.formGroup}>
              <label htmlFor="author">Votre nom ou pseudo</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Comment souhaitez-vous être crédité ?"
              />
            </div>
          </div>

          {errors.submit && (
            <div className={styles.submitError}>
              {errors.submit}
            </div>
          )}

          <div className={styles.submitSection}>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Partage en cours...
                </>
              ) : (
                <>
                  🍴 Partager ma recette
                </>
              )}
            </button>
            
            <p className={styles.submitNote}>
              En partageant votre recette, vous acceptez qu'elle soit visible par tous les utilisateurs de COCO.
            </p>
          </div>
        </form>
      </div>
    </>
  )
}
