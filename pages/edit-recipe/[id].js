import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../components/AuthContext'
import RecipeForm from '../../components/RecipeForm'
import { canUserEditRecipe } from '../../utils/profileUtils'
import { logInfo, logError, logUserInteraction } from '../../utils/logger'
import styles from '../../styles/EditRecipe.module.css'

export default function EditRecipe() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent(`/edit-recipe/${id}`))
      return
    }

    if (user && id) {
      loadRecipe()
    }
  }, [user, authLoading, id, router])

  const loadRecipe = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/recipes/${id}`)
      if (!response.ok) {
        throw new Error(`Recipe not found: ${response.status}`)
      }
      
      const recipeData = await response.json()
      
      // Vérifier que l'utilisateur peut modifier cette recette
      if (!canUserEditRecipe(recipeData.user_id, user.id)) {
        setError('Vous n\'êtes pas autorisé à modifier cette recette.')
        return
      }
      
      setRecipe(recipeData)
      
      logUserInteraction('EDIT_RECIPE_OPENED', 'edit-recipe', {
        recipeId: id,
        userId: user.id
      })
      
    } catch (err) {
      logError('Failed to load recipe for editing', err, { recipeId: id, userId: user?.id })
      setError('Impossible de charger la recette. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      const updateData = {
        ...formData,
        id: recipe.id,
        user_id: recipe.user_id // Conserver le propriétaire original
      }
      
      const response = await fetch('/api/recipes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la mise à jour')
      }
      
      logUserInteraction('RECIPE_UPDATED', 'edit-recipe', {
        recipeId: recipe.id,
        userId: user.id
      })
      
      // Rediriger vers la page de la recette ou mes recettes
      router.push(`/recipe/${recipe.id}`)
      
    } catch (error) {
      logError('Failed to update recipe', error, { recipeId: recipe?.id, userId: user?.id })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  if (authLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de la recette...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Erreur</h3>
        <p>{error}</p>
        <button onClick={() => router.back()} className={styles.backButton}>
          Retour
        </button>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>🔍</div>
        <h3>Recette introuvable</h3>
        <p>Cette recette n'existe pas ou a été supprimée.</p>
        <button onClick={() => router.push('/mes-recettes')} className={styles.backButton}>
          Mes recettes
        </button>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Modifier "{recipe.title}" - COCO</title>
        <meta name="description" content={`Modification de la recette ${recipe.title}`} />
      </Head>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← Retour
          </button>
          <h1>Modifier votre recette</h1>
        </div>

        <RecipeForm
          initialData={{
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            category: recipe.category,
            difficulty: recipe.difficulty,
            imageUrl: recipe.image,
            likes_count: recipe.likes_count || 0, // Préserver les likes existants
            includeIngredients: Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0,
            includeInstructions: Array.isArray(recipe.instructions) && recipe.instructions.length > 0
          }}
          onSubmit={handleSave}
          onCancel={handleCancel}
          isEditing={true}
        />
      </div>
    </>
  )
}
