import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { canUserEditRecipe, deleteUserRecipe } from '../utils/profileUtils'
import styles from '../styles/UserRecipes.module.css'

export default function MesRecettes() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
      return
    }

    if (user) {
      loadUserRecipes()
    }
  }, [user, authLoading, router])

  const loadUserRecipes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/recipes?user_id=${user.id}`)
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      
      const recipesData = await response.json()
      setRecipes(Array.isArray(recipesData) ? recipesData : [])
      
      logInfo('User recipes loaded successfully', {
        userId: user.id,
        recipesCount: Array.isArray(recipesData) ? recipesData.length : 0
      })
    } catch (err) {
      logError('Failed to load user recipes', err, {
        userId: user?.id,
        component: 'MesRecettes'
      })
      setError('Impossible de charger vos recettes. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // Handler pour suppression d'une recette
  const handleDeleteRecipe = async (recipeId) => {
    if (!user) return
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) return
    const success = await deleteUserRecipe(recipeId, user.id)
    if (success) {
      setRecipes(recipes => recipes.filter(r => r.id !== recipeId))
    } else {
      alert('Erreur lors de la suppression de la recette.')
    }
  }

  // Handler pour édition d'une recette
  const handleEditRecipe = (recipeId) => {
    router.push(`/edit-recipe/${recipeId}`)
  }

  if (authLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Chargement de vos recettes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>😓</div>
        <h3>Erreur de chargement</h3>
        <p>{error}</p>
        <button onClick={loadUserRecipes} className={styles.retryButton}>
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Toutes mes recettes sur COCO" />
      </Head>

      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Retour
        </button>
        <h1>Mes Recettes ({recipes.length})</h1>
        <button onClick={() => router.push('/share-photo')} className={styles.addButton}>
          + Nouvelle
        </button>
      </div>

      <div className={styles.content}>
        {recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <h3>Aucune recette pour le moment</h3>
            <p>Commencez par partager votre première création culinaire !</p>
            <button 
              onClick={() => router.push('/share-photo')} 
              className={styles.createButton}
            >
              Créer ma première recette
            </button>
          </div>
        ) : (
          <div className={styles.recipesGrid}>
            {recipes.map((recipe) => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                isPhotoOnly={recipe.category === 'Photo partagée'}
                onEdit={() => handleEditRecipe(recipe.id)}
                onDelete={() => handleDeleteRecipe(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .${styles.container} {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 20px;
        }

        .${styles.header} {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .${styles.backButton}, .${styles.addButton} {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .${styles.backButton}:hover, .${styles.addButton}:hover {
          background: #5a67d8;
        }

        .${styles.content} {
          max-width: 1200px;
          margin: 0 auto;
        }

        .${styles.recipesGrid} {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .${styles.emptyState} {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .${styles.emptyIcon} {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .${styles.createButton} {
          background: #10b981;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1.1rem;
          margin-top: 20px;
        }

        .${styles.loadingContainer}, .${styles.errorContainer} {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
        }

        .${styles.loadingSpinner} {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .${styles.retryButton} {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          margin-top: 20px;
        }

        @media (max-width: 768px) {
          .${styles.header} {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .${styles.recipesGrid} {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
