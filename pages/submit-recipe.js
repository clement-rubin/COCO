import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import PhotoUpload from '../components/PhotoUpload'
import styles from '../styles/SubmitRecipe.module.css'
import { logDebug, logInfo, logError, logWarning, logUserInteraction } from '../utils/logger'

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
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

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
    
    // Validation améliorée des photos avec vérification des bytes (pas des URLs Supabase)
    if (photos.length > 0) {
      const processingPhotos = photos.filter(photo => photo.processing)
      const errorPhotos = photos.filter(photo => photo.error)
      const processedPhotos = photos.filter(photo => 
        photo.processed && 
        photo.imageBytes && 
        Array.isArray(photo.imageBytes) &&
        photo.imageBytes.length > 0
      )
      
      if (processingPhotos.length > 0) {
        newErrors.photos = `Attendez que ${processingPhotos.length} photo(s) finissent d'être traitées`
        logWarning('Validation échouée: traitement en cours', { 
          processingCount: processingPhotos.length,
          totalPhotos: photos.length 
        })
      } else if (errorPhotos.length > 0) {
        newErrors.photos = `${errorPhotos.length} photo(s) ont échoué. Supprimez-les et réessayez.`
        logWarning('Validation échouée: photos en erreur', { 
          errorCount: errorPhotos.length,
          totalPhotos: photos.length,
          errorMessages: errorPhotos.map(p => p.errorMessage)
        })
      } else if (processedPhotos.length === 0) {
        newErrors.photos = 'Aucune photo n\'a été correctement traitée. Veuillez réessayer.'
        logWarning('Validation échouée: aucune photo traitée', {
          totalPhotos: photos.length,
          photosWithBytes: photos.filter(p => p.imageBytes).length,
          processedPhotos: photos.filter(p => p.processed).length
        })
      }
    }
    
    const isValid = Object.keys(newErrors).length === 0
    
    logInfo('Résultat de la validation', {
      isValid,
      errorsCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
      photosCount: photos.length,
      processedPhotosCount: photos.filter(p => p.processed).length,
      photosWithBytes: photos.filter(p => p.imageBytes?.length > 0).length
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
      
      // Préparer les photos validées (avec bytes) - pas d'URLs Supabase nécessaires
      const validPhotos = photos.filter(photo => 
        photo.processed && 
        photo.imageBytes && 
        Array.isArray(photo.imageBytes) &&
        photo.imageBytes.length > 0 &&
        !photo.error
      )
      
      if (validPhotos.length === 0) {
        logError('Aucune photo valide trouvée', null, {
          totalPhotos: photos.length,
          photosState: photos.map(p => ({
            processed: p.processed,
            hasImageBytes: !!p.imageBytes,
            imageBytesType: typeof p.imageBytes,
            imageBytesIsArray: Array.isArray(p.imageBytes),
            imageBytesLength: p.imageBytes?.length,
            error: p.error,
            errorMessage: p.errorMessage
          }))
        })
        throw new Error('Aucune photo valide trouvée. Veuillez réessayer le traitement des photos.')
      }
      
      logDebug('Photos validées pour soumission', {
        totalPhotos: photos.length,
        validPhotos: validPhotos.length,
        firstImageBytesLength: validPhotos[0].imageBytes.length,
        allImageSizes: validPhotos.map(p => p.imageBytes.length)
      })
      
      // Préparer les données selon le schéma bytes
      const recipeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        ingredients: ingredientsArray,
        instructions: instructionsArray,
        prepTime: formData.prepTime.trim() || null,
        cookTime: formData.cookTime.trim() || null,
        category: formData.category || null,
        author: formData.author.trim() || 'Anonyme',
        image: validPhotos[0].imageBytes, // Image principale en bytes
        photos: validPhotos.map(p => p.imageBytes) // Toutes les photos en bytes
      }
      
      logDebug('Données de recette préparées pour API', {
        hasTitle: !!recipeData.title,
        hasDescription: !!recipeData.description,
        ingredientsCount: recipeData.ingredients.length,
        instructionsCount: recipeData.instructions.length,
        photosCount: recipeData.photos.length,
        mainImageBytesLength: recipeData.image.length,
        category: recipeData.category,
        author: recipeData.author
      })
      
      // Valider que les données sont complètes avant l'envoi
      if (!recipeData.image || !Array.isArray(recipeData.image) || recipeData.image.length === 0) {
        throw new Error('Image principale manquante ou invalide')
      }
      
      // Call API to submit recipe
      logInfo('Envoi des données vers l\'API /api/recipes')
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      })
      
      logDebug('Réponse de l\'API reçue', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })
      
      const result = await response.json()
      
      logDebug('Contenu de la réponse API', {
        hasResult: !!result,
        resultKeys: Object.keys(result || {}),
        message: result?.message,
        id: result?.id,
        error: result?.error
      })
      
      if (!response.ok) {
        const errorMessage = result.message || result.error || `Erreur HTTP ${response.status}: ${response.statusText}`
        logError('Erreur de l\'API lors de la soumission', null, {
          status: response.status,
          statusText: response.statusText,
          responseBody: result,
          errorMessage
        })
        throw new Error(errorMessage)
      }
      
      logUserInteraction('RECETTE_SOUMISE', 'formulaire-soumission', {
        title: recipeData.title,
        category: recipeData.category,
        ingredientsCount: recipeData.ingredients.length,
        instructionsCount: recipeData.instructions.length,
        photosCount: validPhotos.length,
        recipeId: result.id
      })
      
      // Afficher le message de succès
      setShowSuccessMessage(true)
      
      // Redirection après 3 secondes
      setTimeout(() => {
        router.push('/?success=recipe-submitted')
      }, 3000)
      
    } catch (error) {
      logError('Erreur lors de la soumission de recette', error, {
        errorName: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack,
        formData: {
          title: formData.title,
          hasDescription: !!formData.description,
          category: formData.category,
          ingredientsLength: formData.ingredients.length,
          instructionsLength: formData.instructions.length
        },
        photosState: {
          total: photos.length,
          processed: photos.filter(p => p.processed).length,
          withBytes: photos.filter(p => p.imageBytes?.length > 0).length,
          withErrors: photos.filter(p => p.error).length
        }
      })
      
      // Fournir un message d'erreur plus spécifique
      let errorMessage = 'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
      
      if (error.message.includes('photo')) {
        errorMessage = 'Problème avec les photos. Veuillez les recharger et réessayer.'
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Problème de connexion. Vérifiez votre connexion internet et réessayez.'
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Erreur de format des données. Veuillez recharger la page et réessayer.'
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`
      }
      
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculer l'état des traitements pour l'affichage (pas uploads)
  const processingPhotosCount = photos.filter(photo => photo.processing).length
  const errorPhotosCount = photos.filter(photo => photo.error).length
  const processedPhotosCount = photos.filter(photo => photo.processed && photo.imageBytes).length
  const allPhotosProcessed = photos.length > 0 && photos.every(photo => 
    photo.processed && 
    photo.imageBytes && 
    Array.isArray(photo.imageBytes)
  )

  // Message de confirmation de soumission
  if (showSuccessMessage) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          <div className={styles.successIcon}>🎉</div>
          <h1>Recette partagée avec succès !</h1>
          <p>Votre délicieuse recette "<strong>{formData.title}</strong>" a été ajoutée à COCO.</p>
          <p>Redirection en cours vers l'accueil...</p>
          <div className={styles.successSpinner}></div>
        </div>
      </div>
    )
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
            
            {/* Status des traitements */}
            {processingPhotosCount > 0 && (
              <div className={styles.uploadStatus}>
                ⏳ {processingPhotosCount} photo(s) en cours de traitement...
              </div>
            )}
            
            {errorPhotosCount > 0 && (
              <div className={styles.uploadError}>
                ❌ {errorPhotosCount} photo(s) ont échoué. Supprimez-les et réessayez.
              </div>
            )}
            
            {allPhotosProcessed && photos.length > 0 && (
              <div className={styles.uploadSuccess}>
                ✅ Toutes les photos sont prêtes !
              </div>
            )}
            
            <small className={styles.helpText}>
              Les images sont automatiquement optimisées et traitées. 
              Attendez que le traitement soit terminé avant de soumettre.
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
              disabled={isSubmitting || processingPhotosCount > 0}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Partage en cours...
                </>
              ) : processingPhotosCount > 0 ? (
                <>
                  ⏳ Traitement en cours ({processingPhotosCount} photo(s))
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
