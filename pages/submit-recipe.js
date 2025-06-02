import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'
import { logDebug, logInfo, logError, logUserInteraction } from '../utils/logger'

export default function SubmitRecipe() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    category: '',
    author: ''
  })
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const categories = [
    'Entrées', 'Plats principaux', 'Desserts', 'Apéritifs', 
    'Soupes', 'Salades', 'Végétarien', 'Vegan', 'Sans gluten'
  ]

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

  const parseIngredients = (text) => {
    if (!text.trim()) return []
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-•*]\s*/, ''))
  }

  const parseInstructions = (text) => {
    if (!text.trim()) return []
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, index) => {
        // Remove existing numbers at start
        const cleanLine = line.replace(/^\d+\.\s*/, '')
        return {
          step: index + 1,
          instruction: cleanLine
        }
      })
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
    
    // Vérifier que toutes les photos sont uploadées
    const pendingUploads = photos.filter(photo => photo.uploading || photo.error)
    if (pendingUploads.length > 0) {
      newErrors.photos = 'Attendez que toutes les photos soient uploadées'
      logWarning('Validation échouée: uploads en cours', { pendingCount: pendingUploads.length })
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    logInfo('Résultat de la validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      photosCount: photos.length,
      uploadedPhotosCount: photos.filter(p => p.uploaded).length
    })
    
    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    logInfo('Début de soumission de recette')
    
    if (!validateForm()) {
      logUserInteraction('ECHEC_VALIDATION', 'formulaire-soumission', {
        errorsCount: Object.keys(errors).length,
        errors: Object.keys(errors)
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Parse ingredients and instructions to JSON format
      const ingredientsArray = parseIngredients(formData.ingredients)
      const instructionsArray = parseInstructions(formData.instructions)
      
      // Préparer les URLs des images
      const imageUrls = photos
        .filter(photo => photo.uploaded && photo.supabaseUrl)
        .map(photo => photo.supabaseUrl)
      
      // Préparer les données selon le schéma de la base
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: ingredientsArray,
        instructions: instructionsArray,
        prepTime: formData.prepTime.trim() || null,
        cookTime: formData.cookTime.trim() || null,
        category: formData.category || null,
        author: formData.author.trim() || 'Anonyme',
        image: imageUrls[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3',
        photos: imageUrls
      }
      
      logDebug('Données de recette préparées', {
        hasTitle: !!recipeData.title,
        hasDescription: !!recipeData.description,
        ingredientsCount: recipeData.ingredients.length,
        instructionsCount: recipeData.instructions.length,
        photosCount: photos.length,
        imageUrlsCount: imageUrls.length,
        category: recipeData.category
      })
      
      // Call API to submit recipe
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la soumission')
      }
      
      logUserInteraction('RECETTE_SOUMISE', 'formulaire-soumission', {
        title: recipeData.title,
        category: recipeData.category,
        ingredientsCount: recipeData.ingredients.length,
        instructionsCount: recipeData.instructions.length
      })
      
      // Redirection après succès
      router.push('/?success=recipe-submitted')
      
    } catch (error) {
      logError('Erreur lors de la soumission de recette', error, {
        formData: {
          title: formData.title,
          hasDescription: !!formData.description,
          category: formData.category
        }
      })
      
      setErrors({ submit: 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.' })
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
              maxFiles={3}
            />
            {errors.photos && <span className={styles.error}>{errors.photos}</span>}
            <small className={styles.helpText}>
              Les images sont automatiquement optimisées et sauvegardées. 
              Attendez que l'upload soit terminé avant de soumettre.
            </small>
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
            </div>
          </div>

          {/* Ingrédients */}
          <div className={styles.section}>
            <h2>🛒 Ingrédients</h2>
            <div className={styles.formGroup}>
              <label htmlFor="ingredients">Liste des ingrédients *</label>
              <textarea
                id="ingredients"
                name="ingredients"
                value={formData.ingredients}
                onChange={handleInputChange}
                placeholder="Listez vos ingrédients (un par ligne)&#10;Ex:&#10;3 pommes&#10;200g de farine&#10;2 œufs&#10;1 cuillère à soupe de sucre"
                rows={8}
                className={errors.ingredients ? styles.inputError : ''}
              />
              {errors.ingredients && <span className={styles.error}>{errors.ingredients}</span>}
              <small className={styles.helpText}>
                Entrez un ingrédient par ligne. Les tirets et puces seront supprimés automatiquement.
              </small>
            </div>
          </div>

          {/* Instructions */}
          <div className={styles.section}>
            <h2>👨‍🍳 Instructions</h2>
            <div className={styles.formGroup}>
              <label htmlFor="instructions">Étapes de préparation *</label>
              <textarea
                id="instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Décrivez les étapes de préparation (une par ligne)&#10;Ex:&#10;Préchauffer le four à 180°C&#10;Éplucher et couper les pommes&#10;Mélanger la farine et les œufs&#10;Cuire pendant 45 minutes"
                rows={10}
                className={errors.instructions ? styles.inputError : ''}
              />
              {errors.instructions && <span className={styles.error}>{errors.instructions}</span>}
              <small className={styles.helpText}>
                Entrez une étape par ligne. Les numéros seront ajoutés automatiquement.
              </small>
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
