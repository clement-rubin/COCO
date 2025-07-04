import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import DebugPanel from '../components/DebugPanel'
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
  
  // États pour le debugging
  const [debugLogs, setDebugLogs] = useState([])
  const [weeklyContestData, setWeeklyContestData] = useState(null)
  const [weeklyContestError, setWeeklyContestError] = useState(null)
  const [participationData, setParticipationData] = useState(null)
  const [participationError, setParticipationError] = useState(null)

  // Fonction pour ajouter des logs de debug
  const addDebugLog = (level, message, data = null) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      id: `${timestamp}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp,
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    }
    
    setDebugLogs(prev => [logEntry, ...prev.slice(0, 49)]) // Garder les 50 derniers logs
    
    // Log aussi dans la console
    console.log(`[RECETTES-${level}] ${message}`, data)
  }

  useEffect(() => {
    addDebugLog('INFO', 'Component mounted', {
      authLoading,
      user: user ? { id: user.id?.substring(0, 8) + '...', email: user.email } : null
    })

    if (authLoading) {
      addDebugLog('INFO', 'Auth loading, waiting...')
      return
    }
    
    if (!user) {
      addDebugLog('WARNING', 'No user found, redirecting to login')
      router.push('/login?redirect=' + encodeURIComponent('/recettes'))
      return
    }
    
    addDebugLog('INFO', 'User authenticated, loading recipes')
    loadUserRecipes()
    loadWeeklyContestData()
    loadParticipationData()
  }, [user, authLoading, router])

  const loadUserRecipes = async () => {
    if (!user?.id) {
      addDebugLog('ERROR', 'Cannot load recipes: no user ID')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      addDebugLog('INFO', 'Loading user recipes', {
        userId: user.id.substring(0, 8) + '...',
        apiUrl: `/api/recipes?user_id=${user.id}`
      })

      const response = await fetch(`/api/recipes?user_id=${user.id}`)
      
      addLog('INFO', 'Recipes API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const userRecipes = await response.json()
      
      addDebugLog('INFO', 'Recipes data parsed', {
        dataType: typeof userRecipes,
        isArray: Array.isArray(userRecipes),
        length: userRecipes?.length || 0,
        firstRecipe: userRecipes?.[0] ? {
          id: userRecipes[0].id,
          title: userRecipes[0].title,
          form_mode: userRecipes[0].form_mode,
          created_at: userRecipes[0].created_at
        } : null
      })

      // Validation et tri des recettes
      const validRecipes = Array.isArray(userRecipes) ? userRecipes : []
      const sortedRecipes = validRecipes.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )

      setRecipes(sortedRecipes)

      // Calcul des statistiques
      const quickCount = sortedRecipes.filter(r => r.form_mode === 'quick').length
      const completeCount = sortedRecipes.filter(r => r.form_mode === 'complete' || !r.form_mode).length
      
      const newStats = {
        total: sortedRecipes.length,
        quick: quickCount,
        complete: completeCount
      }
      
      setStats(newStats)

      addDebugLog('SUCCESS', 'User recipes loaded successfully', {
        stats: newStats,
        recipeTitles: sortedRecipes.map(r => r.title).slice(0, 5)
      })

      logInfo('User recipes loaded successfully', {
        userId: user.id.substring(0, 8) + '...',
        recipesCount: sortedRecipes.length,
        quickRecipes: quickCount,
        completeRecipes: completeCount
      })

    } catch (error) {
      addDebugLog('ERROR', 'Error loading user recipes', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name
      })
      
      logError('Error loading user recipes', error, {
        userId: user.id?.substring(0, 8) + '...',
        errorMessage: error.message
      })
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklyContestData = async () => {
    if (!user?.id) {
      addDebugLog('ERROR', 'Cannot load weekly contest: no user ID')
      return
    }

    try {
      addDebugLog('INFO', 'Loading weekly contest data', {
        userId: user.id.substring(0, 8) + '...',
        apiUrl: `/api/weekly-recipe-contest?user_id=${user.id}`
      })

      const response = await fetch(`/api/weekly-recipe-contest?user_id=${user.id}`)
      
      addDebugLog('INFO', 'Weekly contest API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      })

      if (!response.ok) {
        const errorText = await response.text()
        addDebugLog('ERROR', 'Weekly contest API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        })
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contestData = await response.json()
      
      addDebugLog('SUCCESS', 'Weekly contest data loaded', {
        contest: contestData.contest ? {
          id: contestData.contest.id,
          weekStart: contestData.contest.week_start,
          weekEnd: contestData.contest.week_end,
          totalVotes: contestData.contest.total_votes
        } : null,
        candidatesCount: contestData.candidates?.length || 0,
        hasUserVoted: contestData.hasUserVoted
      })

      setWeeklyContestData(contestData)
      setWeeklyContestError(null)

    } catch (error) {
      addDebugLog('ERROR', 'Error loading weekly contest data', {
        errorMessage: error.message,
        errorStack: error.stack
      })
      setWeeklyContestError(error.message)
    }
  }

  const loadParticipationData = async () => {
    if (!user?.id) {
      addDebugLog('ERROR', 'Cannot load participation data: no user ID')
      return
    }

    try {
      addDebugLog('INFO', 'Loading participation data', {
        userId: user.id.substring(0, 8) + '...',
        apiUrl: `/api/weekly-contest-participation?user_id=${user.id}`
      })

      const response = await fetch(`/api/weekly-contest-participation?user_id=${user.id}`)
      
      addDebugLog('INFO', 'Participation API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      })

      if (!response.ok) {
        const errorText = await response.text()
        addDebugLog('ERROR', 'Participation API error response', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500)
        })
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const participationData = await response.json()
      
      addDebugLog('SUCCESS', 'Participation data loaded', {
        contest: participationData.contest ? {
          id: participationData.contest.id,
          weekStart: participationData.contest.week_start,
          weekEnd: participationData.contest.week_end
        } : null,
        userCandidatesCount: participationData.userCandidates?.length || 0,
        requestId: participationData.requestId
      })

      setParticipationData(participationData)
      setParticipationError(null)

    } catch (error) {
      addDebugLog('ERROR', 'Error loading participation data', {
        errorMessage: error.message,
        errorStack: error.stack
      })
      setParticipationError(error.message)
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
    addDebugLog('INFO', 'Navigating to edit recipe', { recipeId })
    router.push(`/edit-recipe/${recipeId}`)
  }

  const handleDeleteRecipe = async (recipeId) => {
    addDebugLog('INFO', 'Delete recipe requested', { recipeId })
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
      addDebugLog('INFO', 'Delete recipe cancelled by user')
      return
    }

    try {
      addDebugLog('INFO', 'Deleting recipe', { recipeId, userId: user.id?.substring(0, 8) + '...' })
      
      const response = await fetch(`/api/recipes?id=${recipeId}&user_id=${user.id}`, {
        method: 'DELETE'
      })

      addDebugLog('INFO', 'Delete recipe API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      // Retirer la recette de la liste
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId))
      
      // Mettre à jour les stats
      const deletedRecipe = recipes.find(r => r.id === recipeId)
      if (deletedRecipe) {
        const newStats = {
          total: stats.total - 1,
          quick: stats.quick - (deletedRecipe.form_mode === 'quick' ? 1 : 0),
          complete: stats.complete - (deletedRecipe.form_mode !== 'quick' ? 1 : 0)
        }
        setStats(newStats)
        
        addDebugLog('SUCCESS', 'Recipe deleted and stats updated', {
          deletedRecipeId: recipeId,
          newStats
        })
      }

      logInfo('Recipe deleted successfully', { recipeId, userId: user.id })
      
    } catch (error) {
      addDebugLog('ERROR', 'Error deleting recipe', {
        recipeId,
        errorMessage: error.message
      })
      logError('Error deleting recipe', error, { recipeId })
      alert('Erreur lors de la suppression de la recette')
    }
  }

  const filteredRecipes = getFilteredRecipes()

  const handleRefreshAll = () => {
    addDebugLog('INFO', 'Manual refresh triggered')
    loadUserRecipes()
    loadWeeklyContestData()
    loadParticipationData()
  }

  const handleClearLogs = () => {
    setDebugLogs([])
  }

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement de vos recettes...</p>
        </div>
        <DebugPanel
          debugLogs={debugLogs}
          onClearLogs={handleClearLogs}
          onRefreshAll={handleRefreshAll}
          additionalData={{
            recipes: recipes.length,
            authLoading,
            loading
          }}
          apiStatus={{
            'Weekly Contest': weeklyContestError ? 
              { type: 'error', message: weeklyContestError } :
              weeklyContestData ? { type: 'success' } : { type: 'loading' },
            'Participation': participationError ?
              { type: 'error', message: participationError } :
              participationData ? { type: 'success' } : { type: 'loading' }
          }}
        />
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
        <DebugPanel
          debugLogs={debugLogs}
          onClearLogs={handleClearLogs}
          onRefreshAll={handleRefreshAll}
          additionalData={{
            recipes: recipes.length,
            error: error
          }}
          apiStatus={{
            'Weekly Contest': weeklyContestError ? 
              { type: 'error', message: weeklyContestError } :
              weeklyContestData ? { type: 'success' } : { type: 'loading' },
            'Participation': participationError ?
              { type: 'error', message: participationError } :
              participationData ? { type: 'success' } : { type: 'loading' }
          }}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Gérez vos recettes publiées sur COCO" />
      </Head>

      <DebugPanel
        debugLogs={debugLogs}
        onClearLogs={handleClearLogs}
        onRefreshAll={handleRefreshAll}
        additionalData={{
          recipes: recipes.length,
          user: user ? { id: user.id?.substring(0, 8) + '...', email: user.email } : null
        }}
        apiStatus={{
          'Weekly Contest': weeklyContestError ? 
            { type: 'error', message: weeklyContestError } :
            weeklyContestData ? { type: 'success' } : { type: 'loading' },
          'Participation': participationError ?
            { type: 'error', message: participationError } :
            participationData ? { type: 'success' } : { type: 'loading' }
        }}
      />

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
