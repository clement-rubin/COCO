import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) newErrors.title = 'Le titre est obligatoire'
    if (!formData.description.trim()) newErrors.description = 'La description est obligatoire'
    if (!formData.ingredients.trim()) newErrors.ingredients = 'Les ingrédients sont obligatoires'
    if (!formData.instructions.trim()) newErrors.instructions = 'Les instructions sont obligatoires'
    if (photos.length === 0) newErrors.photos = 'Au moins une photo est obligatoire'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Préparer les données pour Supabase
      const recipeData = {
        title: formData.title,
        description: formData.description,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
        prep_time: formData.prepTime,
        cook_time: formData.cookTime,
        servings: formData.servings,
        category: formData.category,
        difficulty: formData.difficulty,
        author: formData.author || 'Anonyme',
        image: photos[0]?.preview || '',
        photos: photos.map(p => p.preview),
        created_at: new Date().toISOString()
      }

      // Insérer dans Supabase
      const { data, error } = await supabase
        .from('recipes')
        .insert([recipeData])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Rediriger vers la page de la recette créée
      router.push(`/recipes/${data.id}`)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la recette:', error)
      setErrors({ submit: 'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.' })
    } finally {
      setIsSubmitting(false)
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
