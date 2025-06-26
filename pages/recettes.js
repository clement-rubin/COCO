import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { logInfo, logError, logWarning } from '../utils/logger'
import styles from '../styles/Recettes.module.css'

export default function Recettes() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, quick: 0, complete: 0 })

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/recettes'))
      return
    }
    
    loadUserRecipes()
  }, [user, authLoading, router])

  const loadUserRecipes = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      logInfo('Loading user recipes', {
        userId: user.id.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      })

      const response = await fetch(`/api/recipes?user_id=${user.id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const userRecipes = await response.json()
      
      // Validation et tri des recettes
      const validRecipes = Array.isArray(userRecipes) ? userRecipes : []
      const sortedRecipes = validRecipes.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )

      setRecipes(sortedRecipes)

      // Calcul des statistiques
      const quickCount = sortedRecipes.filter(r => r.form_mode === 'quick').length
      const completeCount = sortedRecipes.filter(r => r.form_mode === 'complete' || !r.form_mode).length
      
      setStats({
        total: sortedRecipes.length,
        quick: quickCount,
        complete: completeCount
      })

      logInfo('User recipes loaded successfully', {
        userId: user.id.substring(0, 8) + '...',
        recipesCount: sortedRecipes.length,
        quickRecipes: quickCount,
        completeRecipes: completeCount
      })

    } catch (error) {
      logError('Error loading user recipes', error, {
        userId: user.id?.substring(0, 8) + '...',
        errorMessage: error.message
      })
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredRecipes = () => {
    switch (filter) {
      case 'quick':
        return recipes.filter(recipe => recipe.form_mode === 'quick')
      case 'complete':
        return recipes.filter(recipe => recipe.form_mode === 'complete' || !recipe.form_mode)
      case 'recent':
        return recipes.filter(recipe => {
          const recipeDate = new Date(recipe.created_at)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return recipeDate >= weekAgo
        })
      default:
        return recipes
    }
  }

  const handleEditRecipe = (recipeId) => {
    router.push(`/edit-recipe/${recipeId}`)
  }

  const handleDeleteRecipe = async (recipeId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
      return
    }

    try {
      const response = await fetch(`/api/recipes?id=${recipeId}&user_id=${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Retirer la recette de la liste
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId))
      
      // Mettre à jour les stats
      const deletedRecipe = recipes.find(r => r.id === recipeId)
      if (deletedRecipe) {
        setStats(prev => ({
          total: prev.total - 1,
          quick: prev.quick - (deletedRecipe.form_mode === 'quick' ? 1 : 0),
          complete: prev.complete - (deletedRecipe.form_mode !== 'quick' ? 1 : 0)
        }))
      }

      logInfo('Recipe deleted successfully', { recipeId, userId: user.id })
      
    } catch (error) {
      logError('Error deleting recipe', error, { recipeId })
      alert('Erreur lors de la suppression de la recette')
    }
  }

  const filteredRecipes = getFilteredRecipes()

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement de vos recettes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>❌ Erreur</h2>
          <p>{error}</p>
          <button onClick={loadUserRecipes} className={styles.retryButton}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Gérez vos recettes publiées sur COCO" />
      </Head>

      {/* Header */}
      <header className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1>📚 Mes Recettes</h1>
          <p>Gérez et partagez vos créations culinaires</p>
        </div>
        <button 
          onClick={() => router.push('/submit-recipe')}
          className={styles.addButton}
        >
          ➕ Nouvelle recette
        </button>
      </header>

      {/* Statistiques */}
      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{stats.complete}</span>
          <span className={styles.statLabel}>Complètes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{stats.quick}</span>
          <span className={styles.statLabel}>Partages Express</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>
            {recipes.filter(r => {
              const recipeDate = new Date(r.created_at)
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return recipeDate >= weekAgo
            }).length}
          </span>
          <span className={styles.statLabel}>Cette semaine</span>
        </div>
      </div>

      {/* Filtres */}
      <div className={styles.filtersContainer}>
        <div className={styles.filters}>
          {[
            { id: 'all', label: 'Toutes', icon: '📋' },
            { id: 'complete', label: 'Complètes', icon: '📖' },
            { id: 'quick', label: 'Express', icon: '📸' },
            { id: 'recent', label: 'Récentes', icon: '🆕' }
          ].map(filterOption => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              className={`${styles.filterButton} ${filter === filterOption.id ? styles.active : ''}`}
            >
              <span className={styles.filterIcon}>{filterOption.icon}</span>
              {filterOption.label}
              <span className={styles.filterCount}>
                ({filterOption.id === 'all' ? stats.total :
                  filterOption.id === 'complete' ? stats.complete :
                  filterOption.id === 'quick' ? stats.quick :
                  recipes.filter(r => {
                    const recipeDate = new Date(r.created_at)
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    return recipeDate >= weekAgo
                  }).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des recettes */}
      <div className={styles.content}>
        {filteredRecipes.length > 0 ? (
          <div className={styles.recipesGrid}>
            {filteredRecipes.map((recipe, index) => (
              <div key={recipe.id} className={styles.recipeCardWrapper}>
                <RecipeCard
                  recipe={recipe}
                  isPhotoOnly={recipe.form_mode === 'quick'}
                  onEdit={handleEditRecipe}
                  onDelete={handleDeleteRecipe}
                  showActions={true}
                />
                {recipe.form_mode === 'quick' && (
                  <div className={styles.quickShareBadge}>
                    📸 Partage Express
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              {filter === 'all' ? '📚' : 
               filter === 'quick' ? '📸' : 
               filter === 'complete' ? '📖' : '🆕'}
            </div>
            <h3>
              {filter === 'all' ? 'Aucune recette publiée' :
               filter === 'quick' ? 'Aucun partage express' :
               filter === 'complete' ? 'Aucune recette complète' :
               'Aucune recette récente'}
            </h3>
            <p>
              {filter === 'all' ? 'Commencez par créer votre première recette !' :
               filter === 'quick' ? 'Partagez rapidement vos créations avec un partage express' :
               filter === 'complete' ? 'Créez des recettes détaillées avec ingrédients et instructions' :
               'Publiez une nouvelle recette pour la voir apparaître ici'}
            </p>
            <button 
              onClick={() => router.push('/submit-recipe')}
              className={styles.createFirstButton}
            >
              {filter === 'quick' ? '📸 Partage Express' : '➕ Créer une recette'}
            </button>
          </div>
        )}
      </div>

      {/* Actions flottantes */}
      <div className={styles.floatingActions}>
        <button 
          onClick={() => router.push('/submit-recipe')}
          className={styles.floatingButton}
          title="Créer une nouvelle recette"
        >
          ➕
        </button>
        <button 
          onClick={() => router.push('/share-photo')}
          className={styles.floatingButton}
          title="Partage express"
        >
          📸
        </button>
      </div>
    </div>
  )
}
