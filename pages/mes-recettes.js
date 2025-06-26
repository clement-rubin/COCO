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
  const [filter, setFilter] = useState('all') // all, quick, complete
  // Nouveaux états pour la participation au concours
  const [showParticipationModal, setShowParticipationModal] = useState(false)
  const [participatingRecipes, setParticipatingRecipes] = useState(new Set())
  const [participationLoading, setParticipationLoading] = useState(false)
  const [weekInfo, setWeekInfo] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
      return
    }

    if (user) {
      loadUserRecipes()
      loadParticipationStatus()
    }
  }, [user, authLoading, router])

  const loadUserRecipes = async () => {
    const startTime = performance.now()
    
    try {
      setLoading(true)
      setError(null)

      // Log début du chargement
      logInfo('Starting user recipes loading process', {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        timestamp: new Date().toISOString()
      })

      // Vérification préalable de l'utilisateur avec logs détaillés
      if (!user || !user.id) {
        logError('No user or user ID available during recipe loading', new Error('User not authenticated'), {
          user: !!user,
          userId: user?.id,
          userType: typeof user,
          userKeys: user ? Object.keys(user) : [],
          component: 'MesRecettes',
          context: 'loadUserRecipes'
        })
        setError('Utilisateur non authentifié')
        return
      }

      logInfo('User validation successful for recipe loading', {
        userId: user.id?.substring(0, 8) + '...',
        userIdType: typeof user.id,
        userIdLength: user.id?.length,
        userEmail: user.email?.substring(0, 3) + '***',
        component: 'MesRecettes'
      })

      // Construction de l'URL avec paramètres explicites pour la table recipes
      const apiUrl = `/api/recipes?user_id=${encodeURIComponent(user.id)}&include_user_only=true&_t=${Date.now()}`
      
      logApiCall('GET', apiUrl, {
        userId: user.id?.substring(0, 8) + '...',
        includeUserOnly: true,
        timestamp: Date.now(),
        component: 'MesRecettes'
      })

      // Mesure du temps de requête
      const requestStartTime = performance.now()
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token || ''}`
        }
      })
      
      const requestEndTime = performance.now()
      const requestDuration = requestEndTime - requestStartTime
      
      logPerformance('API request to /api/recipes', requestDuration, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        userId: user.id?.substring(0, 8) + '...',
        url: apiUrl
      })
      
      logInfo('API response received from recipes endpoint', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        userId: user.id?.substring(0, 8) + '...',
        requestDuration: `${requestDuration.toFixed(2)}ms`,
        responseHeaders: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        
        logError('API request to recipes endpoint failed', new Error(`HTTP ${response.status}: ${response.statusText}`), {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText?.substring(0, 500),
          userId: user.id?.substring(0, 8) + '...',
          url: apiUrl,
          requestDuration: `${requestDuration.toFixed(2)}ms`
        })
        
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      
      // Parse de la réponse avec logs détaillés
      let recipesData
      try {
        recipesData = await response.json()
        
        logInfo('API response successfully parsed', {
          dataType: typeof recipesData,
          isArray: Array.isArray(recipesData),
          length: recipesData?.length || 0,
          hasError: !!recipesData?.error,
          userId: user.id?.substring(0, 8) + '...',
          dataKeys: recipesData && typeof recipesData === 'object' ? Object.keys(recipesData) : [],
          sampleDataStructure: Array.isArray(recipesData) && recipesData.length > 0 ? {
            firstRecipe: {
              id: recipesData[0]?.id,
              title: recipesData[0]?.title?.substring(0, 20) + '...',
              user_id: recipesData[0]?.user_id?.substring(0, 8) + '...',
              user_id_match: recipesData[0]?.user_id === user.id,
              form_mode: recipesData[0]?.form_mode,
              category: recipesData[0]?.category,
              created_at: recipesData[0]?.created_at,
              hasImage: !!recipesData[0]?.image,
              imageType: typeof recipesData[0]?.image
            }
          } : 'No recipes available'
        })
      } catch (parseError) {
        logError('Failed to parse API response as JSON', parseError, {
          userId: user.id?.substring(0, 8) + '...',
          responseStatus: response.status,
          contentType: response.headers.get('content-type')
        })
        throw new Error('Réponse API invalide')
      }
      
      // Vérifier si c'est une réponse d'erreur de l'API
      if (recipesData?.error) {
        logError('API returned error response', new Error(recipesData.error), {
          apiError: recipesData.error,
          apiMessage: recipesData.message,
          userId: user.id?.substring(0, 8) + '...'
        })
        throw new Error(recipesData.message || recipesData.error)
      }
      
      // S'assurer que nous avons un tableau valide avec logs détaillés
      const recipes = Array.isArray(recipesData) ? recipesData : []
      
      logDatabaseOperation('SELECT', 'recipes', {
        query: 'user recipes retrieval',
        resultCount: recipes.length,
        userId: user.id?.substring(0, 8) + '...',
        isArray: Array.isArray(recipesData),
        originalDataType: typeof recipesData
      })
      
      // Filtrage de sécurité - s'assurer qu'on a bien les recettes de l'utilisateur depuis la table recipes
      const userRecipes = recipes.filter(recipe => {
        const isValid = recipe && 
                       recipe.user_id === user.id &&
                       recipe.title && // S'assurer que la recette a un titre
                       recipe.id // S'assurer que la recette a un ID
        
        if (!isValid) {
          logWarning('Recipe filtered out during validation', {
            recipeId: recipe?.id,
            hasTitle: !!recipe?.title,
            hasId: !!recipe?.id,
            userIdMatch: recipe?.user_id === user.id,
            recipeUserId: recipe?.user_id?.substring(0, 8) + '...',
            expectedUserId: user.id?.substring(0, 8) + '...',
            reason: !recipe ? 'null recipe' :
                   !recipe.user_id ? 'no user_id' :
                   recipe.user_id !== user.id ? 'user_id mismatch' :
                   !recipe.title ? 'no title' :
                   !recipe.id ? 'no id' : 'unknown'
          })
        }
        
        return isValid
      })
      
      logInfo('Recipes filtered and validated successfully', {
        totalReceived: recipes.length,
        userRecipesCount: userRecipes.length,
        filteredOut: recipes.length - userRecipes.length,
        userId: user.id?.substring(0, 8) + '...',
        allUserIdsInResponse: [...new Set(recipes.map(r => r?.user_id?.substring(0, 8) + '...').filter(Boolean))],
        expectedUserId: user.id?.substring(0, 8) + '...',
        recipeCategories: [...new Set(userRecipes.map(r => r.category).filter(Boolean))],
        formModes: [...new Set(userRecipes.map(r => r.form_mode).filter(Boolean))],
        recipesWithImages: userRecipes.filter(r => r.image).length,
        recipesWithoutImages: userRecipes.filter(r => !r.image).length
      })
      
      // Validation approfondie des données de recettes
      userRecipes.forEach((recipe, index) => {
        if (index < 3) { // Log détaillé des 3 premières recettes seulement
          logDebug(`Recipe ${index + 1} detailed validation`, {
            recipeId: recipe.id,
            title: recipe.title?.substring(0, 30) + '...',
            category: recipe.category,
            formMode: recipe.form_mode,
            hasImage: !!recipe.image,
            imageType: typeof recipe.image,
            imageSize: Array.isArray(recipe.image) ? recipe.image.length : (typeof recipe.image === 'string' ? recipe.image.length : 0),
            hasIngredients: !!recipe.ingredients,
            ingredientsCount: Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0,
            hasInstructions: !!recipe.instructions,
            instructionsCount: Array.isArray(recipe.instructions) ? recipe.instructions.length : 0,
            createdAt: recipe.created_at,
            userId: recipe.user_id?.substring(0, 8) + '...'
          })
        }
      })
      
      // Trier par date de création (plus récentes en premier) avec logs
      const sortedRecipes = userRecipes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateB - dateA
      })
      
      logInfo('Recipes sorted by creation date', {
        totalRecipes: sortedRecipes.length,
        oldestRecipe: sortedRecipes.length > 0 ? {
          id: sortedRecipes[sortedRecipes.length - 1]?.id,
          title: sortedRecipes[sortedRecipes.length - 1]?.title?.substring(0, 20) + '...',
          createdAt: sortedRecipes[sortedRecipes.length - 1]?.created_at
        } : null,
        newestRecipe: sortedRecipes.length > 0 ? {
          id: sortedRecipes[0]?.id,
          title: sortedRecipes[0]?.title?.substring(0, 20) + '...',
          createdAt: sortedRecipes[0]?.created_at
        } : null
      })
      
      setRecipes(sortedRecipes)
      
      const endTime = performance.now()
      const totalDuration = endTime - startTime
      
      logPerformance('Complete user recipes loading', totalDuration, {
        userId: user.id?.substring(0, 8) + '...',
        finalCount: sortedRecipes.length,
        component: 'MesRecettes',
        phases: {
          apiRequest: `${requestDuration.toFixed(2)}ms`,
          total: `${totalDuration.toFixed(2)}ms`
        },
        success: true
      })
      
      logSuccess('User recipes loaded successfully', {
        userId: user.id?.substring(0, 8) + '...',
        recipesCount: sortedRecipes.length,
        component: 'MesRecettes',
        loadTime: `${totalDuration.toFixed(2)}ms`,
        categoriesFound: [...new Set(sortedRecipes.map(r => r.category).filter(Boolean))],
        formModesFound: [...new Set(sortedRecipes.map(r => r.form_mode).filter(Boolean))],
        recentRecipes: sortedRecipes.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title?.substring(0, 25) + '...',
          category: r.category,
          form_mode: r.form_mode,
          created_at: r.created_at
        }))
      })
      
    } catch (err) {
      const endTime = performance.now()
      const totalDuration = endTime - startTime
      
      logError('Failed to load user recipes', err, {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        errorMessage: err.message,
        errorName: err.name,
        errorStack: err.stack?.substring(0, 500) + '...',
        loadTime: `${totalDuration.toFixed(2)}ms`,
        context: 'loadUserRecipes',
        timestamp: new Date().toISOString()
      })
      
      setError(`Impossible de charger vos recettes: ${err.message}`)
    } finally {
      setLoading(false)
      
      logComponentEvent('MesRecettes', 'LOADING_COMPLETED', {
        userId: user?.id?.substring(0, 8) + '...',
        hasError: !!error,
        recipesLoaded: recipes.length
      })
    }
  }

  // Nouvelle fonction pour charger le statut de participation avec logs détaillés
  const loadParticipationStatus = async () => {
    const startTime = performance.now()
    
    try {
      logInfo('Starting participation status loading', {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes'
      })
      
      const apiUrl = `/api/weekly-contest-participation?user_id=${user.id}`
      const response = await fetch(apiUrl)
      
      logApiCall('GET', apiUrl, {
        userId: user?.id?.substring(0, 8) + '...',
        status: response.status,
        component: 'MesRecettes'
      })
      
      if (!response.ok) {
        logWarning('Participation status API call failed', {
          status: response.status,
          statusText: response.statusText,
          userId: user?.id?.substring(0, 8) + '...'
        })
        return
      }

      const data = await response.json()
      
      logDatabaseOperation('SELECT', 'weekly_contest_participation', {
        userId: user?.id?.substring(0, 8) + '...',
        userCandidatesCount: data.userCandidates?.length || 0,
        contestId: data.contest?.id,
        contestWeekStart: data.contest?.week_start,
        contestWeekEnd: data.contest?.week_end
      })
      
      // Identifier les recettes déjà participantes dans le concours hebdomadaire
      const participatingIds = data.userCandidates?.map(c => c.recipe_id) || []
      
      setParticipatingRecipes(new Set(participatingIds))
      setWeekInfo({
        weekStart: data.contest.week_start,
        weekEnd: data.contest.week_end,
        maxCandidates: 5, // Limite fixe pour le concours hebdomadaire
        currentCandidates: data.contest.total_candidates || 0,
        contestId: data.contest.id
      })
      
      const endTime = performance.now()
      logPerformance('Participation status loading', endTime - startTime, {
        userId: user?.id?.substring(0, 8) + '...',
        participatingRecipesCount: participatingIds.length,
        success: true
      })
      
    } catch (error) {
      const endTime = performance.now()
      logError('Failed to load participation status', error, {
        userId: user?.id?.substring(0, 8) + '...',
        loadTime: `${(endTime - startTime).toFixed(2)}ms`,
        component: 'MesRecettes'
      })
    }
  }

  // Nouvelle fonction pour gérer la participation au concours hebdomadaire avec logs
  const handleParticipationToggle = async (recipeId, shouldParticipate) => {
    if (participationLoading) return

    const startTime = performance.now()
    
    logUserInteraction(
      shouldParticipate ? 'PARTICIPATE_RECIPE_CONTEST' : 'WITHDRAW_RECIPE_CONTEST', 
      'participation-toggle',
      {
        recipeId,
        shouldParticipate,
        userId: user?.id?.substring(0, 8) + '...',
        currentParticipatingCount: participatingRecipes.size
      }
    )

    try {
      setParticipationLoading(true)

      if (shouldParticipate) {
        // Vérifier la limite avec logs
        if (weekInfo && participatingRecipes.size >= weekInfo.maxCandidates) {
          logWarning('Recipe participation limit reached', {
            currentCount: participatingRecipes.size,
            maxAllowed: weekInfo.maxCandidates,
            userId: user?.id?.substring(0, 8) + '...',
            recipeId
          })
          alert(`Vous ne pouvez pas inscrire plus de ${weekInfo.maxCandidates} recettes par semaine.`)
          return
        }

        // Inscrire la recette au concours hebdomadaire
        const response = await fetch('/api/weekly-contest-participation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user.id,
            is_manual_entry: true
          })
        })

        logApiCall('POST', '/api/weekly-contest-participation', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          isManualEntry: true,
          status: response.status
        })

        if (!response.ok) {
          const errorData = await response.json()
          logError('Recipe participation API call failed', new Error(errorData.message), {
            recipeId,
            userId: user?.id?.substring(0, 8) + '...',
            status: response.status,
            errorData
          })
          throw new Error(errorData.message || 'Erreur lors de l\'inscription')
        }

        // Mettre à jour l'état local
        setParticipatingRecipes(prev => new Set([...prev, recipeId]))
        showSuccessNotification('🏆 Recette inscrite au concours de la semaine !')
        
        logSuccess('Recipe successfully registered for contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          newParticipatingCount: participatingRecipes.size + 1
        })

      } else {
        // Retirer la recette du concours hebdomadaire
        const response = await fetch('/api/weekly-contest-participation', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user.id
          })
        })

        logApiCall('DELETE', '/api/weekly-contest-participation', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          status: response.status
        })

        if (!response.ok) {
          const errorData = await response.json()
          logError('Recipe withdrawal API call failed', new Error(errorData.message), {
            recipeId,
            userId: user?.id?.substring(0, 8) + '...',
            status: response.status,
            errorData
          })
          throw new Error(errorData.message || 'Erreur lors du retrait')
        }

        // Mettre à jour l'état local
        setParticipatingRecipes(prev => {
          const newSet = new Set(prev)
          newSet.delete(recipeId)
          return newSet
        })
        showSuccessNotification('✅ Recette retirée du concours')
        
        logSuccess('Recipe successfully withdrawn from contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          newParticipatingCount: participatingRecipes.size - 1
        })
      }

      // Recharger le statut
      await loadParticipationStatus()

    } catch (error) {
      const endTime = performance.now()
      logError('Error toggling participation', error, {
        recipeId,
        shouldParticipate,
        userId: user?.id?.substring(0, 8) + '...',
        duration: `${(endTime - startTime).toFixed(2)}ms`
      })
      alert('Erreur: ' + error.message)
    } finally {
      setParticipationLoading(false)
      
      const endTime = performance.now()
      logPerformance('Participation toggle operation', endTime - startTime, {
        recipeId,
        shouldParticipate,
        success: !error,
        userId: user?.id?.substring(0, 8) + '...'
      })
    }
  }

  // Fonction pour afficher les notifications
  const showSuccessNotification = (message) => {
    const notification = document.createElement('div')
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
  }

  const getFilteredRecipes = () => {
    switch (filter) {
      case 'quick':
        return recipes.filter(r => r.form_mode === 'quick' || r.category === 'Photo partagée')
      case 'complete':
        return recipes.filter(r => r.form_mode === 'complete' || (r.form_mode !== 'quick' && r.category !== 'Photo partagée'))
      default:
        return recipes
    }
  }

  // Handler pour suppression d'une recette
  const handleDeleteRecipe = async (recipeId) => {
    if (!user) return
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) return
    const success = await deleteUserRecipe(recipeId, user.id)
    if (success) {
      setRecipes(recipes => recipes.filter(r => r.id !== recipeId))
      // Retirer aussi de la participation si c'était le cas
      setParticipatingRecipes(prev => {
        const newSet = new Set(prev)
        newSet.delete(recipeId)
        return newSet
      })
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
          <span className={styles.backIcon}>←</span>
          Retour
        </button>
        <div className={styles.headerTitle}>
          <h1>Mes Recettes</h1>
          <span className={styles.recipeCount}>{recipes.length} recette{recipes.length > 1 ? 's' : ''}</span>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => router.push('/submit-recipe')} className={styles.addButton}>
            <span className={styles.buttonIcon}>+</span>
            Nouvelle
          </button>
          <button 
            onClick={() => setShowParticipationModal(true)} 
            className={styles.contestButton}
            disabled={recipes.length === 0}
          >
            <span className={styles.contestIcon}>🏆</span>
            Concours
            <span className={styles.contestBadge}>{participatingRecipes.size}</span>
          </button>
        </div>
      </div>

      {/* Indicateur de participation amélioré */}
      {weekInfo && participatingRecipes.size > 0 && (
        <div className={styles.participationBanner}>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>
              <span className={styles.trophyIcon}>🏆</span>
            </div>
            <div className={styles.bannerText}>
              <h3>{participatingRecipes.size} recette{participatingRecipes.size > 1 ? 's' : ''} en concours</h3>
              <p>
                Semaine du {new Date(weekInfo.weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} 
                {' au '} 
                {new Date(weekInfo.weekEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button 
              onClick={() => setShowParticipationModal(true)} 
              className={styles.manageBanner}
            >
              Gérer
              <span className={styles.arrowIcon}>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtres améliorés */}
      <div className={styles.filtersContainer}>
        <div className={styles.filters}>
          <button 
            className={filter === 'all' ? styles.activeFilter : styles.filter}
            onClick={() => setFilter('all')}
          >
            <span className={styles.filterIcon}>📋</span>
            Toutes
            <span className={styles.filterCount}>({recipes.length})</span>
          </button>
          <button 
            className={filter === 'quick' ? styles.activeFilter : styles.filter}
            onClick={() => setFilter('quick')}
          >
            <span className={styles.filterIcon}>📸</span>
            Express
            <span className={styles.filterCount}>({recipes.filter(r => r.form_mode === 'quick' || r.category === 'Photo partagée').length})</span>
          </button>
          <button 
            className={filter === 'complete' ? styles.activeFilter : styles.filter}
            onClick={() => setFilter('complete')}
          >
            <span className={styles.filterIcon}>🍳</span>
            Complètes
            <span className={styles.filterCount}>({recipes.filter(r => r.form_mode === 'complete' || (r.form_mode !== 'quick' && r.category !== 'Photo partagée')).length})</span>
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <span className={styles.emptyIcon}>👨‍🍳</span>
              <div className={styles.emptyBubbles}>
                <span className={styles.bubble}>🍽️</span>
                <span className={styles.bubble}>✨</span>
                <span className={styles.bubble}>🥘</span>
              </div>
            </div>
            <h3>Votre livre de recettes est vide</h3>
            <p>Commencez par partager votre première création culinaire et rejoignez notre communauté de passionnés !</p>
            <button 
              onClick={() => router.push('/submit-recipe')} 
              className={styles.createButton}
            >
              <span className={styles.buttonIcon}>+</span>
              Créer ma première recette
            </button>
          </div>
        ) : (
          <div className={styles.recipesGrid}>
            {getFilteredRecipes().map((recipe) => (
              <div key={recipe.id} className={styles.recipeCardWrapper}>
                {/* Badge de participation amélioré */}
                {participatingRecipes.has(recipe.id) && (
                  <div className={styles.participationBadge}>
                    <span className={styles.badgeIcon}>🏆</span>
                    <span className={styles.badgeText}>En concours</span>
                  </div>
                )}
                <RecipeCard 
                  recipe={recipe} 
                  isPhotoOnly={recipe.category === 'Photo partagée'}
                  onEdit={() => handleEditRecipe(recipe.id)}
                  onDelete={() => handleDeleteRecipe(recipe.id)}
                />
                {/* Bouton de participation flottant */}
                <div className={styles.participationActions}>
                  <button
                    onClick={() => handleParticipationToggle(
                      recipe.id, 
                      !participatingRecipes.has(recipe.id)
                    )}
                    disabled={participationLoading}
                    className={
                      participatingRecipes.has(recipe.id) 
                        ? styles.removeParticipationBtn 
                        : styles.addParticipationBtn
                    }
                    title={participatingRecipes.has(recipe.id) ? 'Retirer du concours' : 'Inscrire au concours'}
                  >
                    {participatingRecipes.has(recipe.id) ? (
                      <>
                        <span className={styles.actionIcon}>✖️</span>
                        <span className={styles.actionText}>Retirer</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.actionIcon}>🏆</span>
                        <span className={styles.actionText}>Inscrire</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de gestion amélioré */}
      {showParticipationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowParticipationModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleSection}>
                <h3>
                  <span className={styles.modalIcon}>🏆</span>
                  Concours Recette de la Semaine
                </h3>
                <p className={styles.modalSubtitle}>Gérez la participation de vos recettes</p>
              </div>
              <button 
                onClick={() => setShowParticipationModal(false)}
                className={styles.closeModal}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.contestInfo}>
                <div className={styles.contestStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{participatingRecipes.size}</span>
                    <span className={styles.statLabel}>Vos participantes</span>
                  </div>
                  <div className={styles.statDivider}>/</div>
                  <div className={styles.statItem}>
                    <span className={styles.statNumber}>{weekInfo?.maxCandidates || 5}</span>
                    <span className={styles.statLabel}>Maximum</span>
                  </div>
                </div>
                <div className={styles.weekDetails}>
                  <div className={styles.weekDates}>
                    <span className={styles.dateLabel}>Semaine du</span>
                    <span className={styles.dateRange}>
                      {weekInfo && new Date(weekInfo.weekStart).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long' 
                      })} 
                      {' au '} 
                      {weekInfo && new Date(weekInfo.weekEnd).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </span>
                  </div>
                  <p className={styles.contestDescription}>
                    🎯 Les recettes les plus votées seront mises en avant sur la page d'accueil !
                  </p>
                </div>
              </div>

              <div className={styles.recipesList}>
                <h4 className={styles.recipesListTitle}>Vos recettes ({recipes.length})</h4>
                <div className={styles.recipesScrollContainer}>
                  {recipes.map(recipe => (
                    <div key={recipe.id} className={styles.recipeItem}>
                      <div className={styles.recipeInfo}>
                        <div className={styles.recipeImageContainer}>
                          <img 
                            src={recipe.image || '/placeholder-recipe.jpg'} 
                            alt={recipe.title}
                            className={styles.recipeThumb}
                          />
                          {participatingRecipes.has(recipe.id) && (
                            <div className={styles.participatingOverlay}>
                              <span className={styles.participatingIcon}>🏆</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.recipeDetails}>
                          <h4 className={styles.recipeTitle}>{recipe.title}</h4>
                          <div className={styles.recipeMetadata}>
                            <span className={styles.recipeCategory}>{recipe.category}</span>
                            <span className={styles.recipeDot}>•</span>
                            <span className={styles.recipeDate}>
                              {new Date(recipe.created_at).toLocaleDateString('fr-FR', { 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleParticipationToggle(
                          recipe.id, 
                          !participatingRecipes.has(recipe.id)
                        )}
                        disabled={
                          participationLoading || 
                          (!participatingRecipes.has(recipe.id) && 
                           participatingRecipes.size >= (weekInfo?.maxCandidates || 5))
                        }
                        className={
                          participatingRecipes.has(recipe.id) 
                            ? styles.removeBtn 
                            : styles.addBtn
                        }
                      >
                        {participatingRecipes.has(recipe.id) ? (
                          <>
                            <span className={styles.btnIcon}>✖️</span>
                            Retirer
                          </>
                        ) : (
                          <>
                            <span className={styles.btnIcon}>🏆</span>
                            Inscrire
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles améliorés */}
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
          padding: 25px 30px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .${styles.headerTitle} {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .${styles.headerTitle} h1 {
          margin: 0;
          color: #1e293b;
          font-size: 2rem;
          font-weight: 700;
        }

        .${styles.recipeCount} {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .${styles.headerActions} {
          display: flex;
          gap: 12px;
        }

        .${styles.backButton} {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(107, 114, 128, 0.3);
        }

        .${styles.backButton}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(107, 114, 128, 0.4);
        }

        .${styles.backIcon} {
          font-size: 1.2rem;
        }

        .${styles.addButton} {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
        }

        .${styles.addButton}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .${styles.contestButton} {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
          position: relative;
        }

        .${styles.contestButton}:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
        }

        .${styles.contestButton}:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .${styles.contestIcon} {
          font-size: 1.1rem;
        }

        .${styles.contestBadge} {
          background: rgba(255, 255, 255, 0.3);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-left: 4px;
        }

        .${styles.buttonIcon} {
          font-size: 1.1rem;
          font-weight: bold;
        }

        /* Banner de participation amélioré */
        .${styles.participationBanner} {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 2px solid #f59e0b;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2);
        }

        .${styles.bannerContent} {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .${styles.bannerIcon} {
          background: #f59e0b;
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .${styles.trophyIcon} {
          font-size: 1.5rem;
        }

        .${styles.bannerText} {
          flex: 1;
        }

        .${styles.bannerText} h3 {
          margin: 0 0 4px 0;
          color: #92400e;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .${styles.bannerText} p {
          margin: 0;
          color: #92400e;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .${styles.manageBanner} {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .${styles.manageBanner}:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .${styles.arrowIcon} {
          font-size: 0.9rem;
        }

        /* Filtres améliorés */
        .${styles.filtersContainer} {
          margin-bottom: 30px;
        }

        .${styles.filters} {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .${styles.filter}, .${styles.activeFilter} {
          background: white;
          color: #475569;
          border: 2px solid #e2e8f0;
          padding: 12px 20px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          min-width: 140px;
          justify-content: center;
        }

        .${styles.filter}:hover {
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .${styles.activeFilter} {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-color: #667eea;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .${styles.filterIcon} {
          font-size: 1.1rem;
        }

        .${styles.filterCount} {
          background: rgba(255, 255, 255, 0.2);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.8rem;
          margin-left: 4px;
        }

        .${styles.filter} .${styles.filterCount} {
          background: rgba(71, 85, 105, 0.1);
          color: #475569;
        }

        /* Styles pour les cartes de recettes */
        .${styles.recipesGrid} {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 25px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .${styles.recipeCardWrapper} {
          position: relative;
          transition: transform 0.3s ease;
        }

        .${styles.recipeCardWrapper}:hover {
          transform: translateY(-5px);
        }

        .${styles.participationBadge} {
          position: absolute;
          top: -8px;
          right: -8px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          z-index: 3;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          display: flex;
          align-items: center;
          gap: 4px;
          border: 2px solid white;
        }

        .${styles.badgeIcon} {
          font-size: 0.9rem;
        }

        .${styles.participationActions} {
          position: absolute;
          bottom: 15px;
          right: 15px;
          z-index: 2;
        }

        .${styles.addParticipationBtn}, .${styles.removeParticipationBtn} {
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .${styles.addParticipationBtn} {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .${styles.addParticipationBtn}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .${styles.removeParticipationBtn} {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .${styles.removeParticipationBtn}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .${styles.actionIcon} {
          font-size: 0.9rem;
        }

        /* Empty state amélioré */
        .${styles.emptyState} {
          text-align: center;
          padding: 80px 40px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          max-width: 500px;
          margin: 50px auto;
        }

        .${styles.emptyIllustration} {
          position: relative;
          margin-bottom: 30px;
          display: inline-block;
        }

        .${styles.emptyIcon} {
          font-size: 5rem;
          display: block;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
        }

        .${styles.emptyBubbles} {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .${styles.bubble} {
          position: absolute;
          font-size: 1.5rem;
          animation: bubble 4s ease-in-out infinite;
        }

        .${styles.bubble}:nth-child(1) {
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }

        .${styles.bubble}:nth-child(2) {
          top: 40%;
          right: 15%;
          animation-delay: 1s;
        }

        .${styles.bubble}:nth-child(3) {
          bottom: 30%;
          left: 20%;
          animation-delay: 2s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes bubble {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
          50% { transform: translateY(-15px) scale(1.1); opacity: 1; }
        }

        .${styles.emptyState} h3 {
          color: #1e293b;
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 15px;
        }

        .${styles.emptyState} p {
          color: #64748b;
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .${styles.createButton} {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1.1rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .${styles.createButton}:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        /* Modal amélioré */
        .${styles.modalOverlay} {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .${styles.modal} {
          background: white;
          border-radius: 20px;
          max-width: 700px;
          width: 100%;
          max-height: 85vh;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .${styles.modalHeader} {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 30px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .${styles.modalTitleSection} {
          flex: 1;
        }

        .${styles.modalTitleSection} h3 {
          margin: 0 0 8px 0;
          color: #1e293b;
          font-size: 1.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .${styles.modalIcon} {
          font-size: 1.3rem;
        }

        .${styles.modalSubtitle} {
          margin: 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        .${styles.closeModal} {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .${styles.closeModal}:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .${styles.modalContent} {
          padding: 30px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .${styles.contestInfo} {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          padding: 25px;
          border-radius: 16px;
          margin-bottom: 30px;
          border: 2px solid #f59e0b;
        }

        .${styles.contestStats} {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .${styles.statItem} {
          text-align: center;
        }

        .${styles.statNumber} {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #92400e;
        }

        .${styles.statLabel} {
          display: block;
          font-size: 0.9rem;
          color: #92400e;
          opacity: 0.8;
        }

        .${styles.statDivider} {
          font-size: 1.5rem;
          color: #92400e;
          opacity: 0.5;
        }

        .${styles.weekDetails} {
          text-align: center;
        }

        .${styles.weekDates} {
          margin-bottom: 12px;
        }

        .${styles.dateLabel} {
          color: #92400e;
          font-weight: 600;
          margin-right: 8px;
        }

        .${styles.dateRange} {
          color: #92400e;
          font-weight: 700;
        }

        .${styles.contestDescription} {
          margin: 0;
          color: #92400e;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .${styles.recipesListTitle} {
          color: #1e293b;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .${styles.recipesScrollContainer} {
          max-height: 300px;
          overflow-y: auto;
          padding-right: 8px;
        }

        .${styles.recipeItem} {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }

        .${styles.recipeItem}:hover {
          border-color: #667eea;
          background: #f8fafc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .${styles.recipeInfo} {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .${styles.recipeImageContainer} {
          position: relative;
        }

        .${styles.recipeThumb} {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          object-fit: cover;
          border: 2px solid #e5e7eb;
        }

        .${styles.participatingOverlay} {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #f59e0b;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          border: 2px solid white;
        }

        .${styles.recipeDetails} {
          flex: 1;
        }

        .${styles.recipeTitle} {
          margin: 0 0 6px 0;
          color: #1e293b;
          font-size: 1rem;
          font-weight: 600;
        }

        .${styles.recipeMetadata} {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 0.85rem;
        }

        .${styles.recipeCategory} {
          background: #e2e8f0;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 500;
        }

        .${styles.recipeDot} {
          opacity: 0.5;
        }

        .${styles.addBtn}, .${styles.removeBtn} {
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .${styles.addBtn} {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .${styles.addBtn}:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .${styles.removeBtn} {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }

        .${styles.removeBtn}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .${styles.addBtn}:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .${styles.btnIcon} {
          font-size: 0.9rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .${styles.container} {
            padding: 15px;
          }

          .${styles.header} {
            flex-direction: column;
            gap: 20px;
            text-align: center;
            padding: 20px;
          }

          .${styles.headerTitle} h1 {
            font-size: 1.6rem;
          }

          .${styles.headerActions} {
            flex-direction: column;
            width: 100%;
            gap: 10px;
          }

          .${styles.bannerContent} {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .${styles.filters} {
            flex-direction: column;
            gap: 10px;
          }

          .${styles.filter}, .${styles.activeFilter} {
            min-width: auto;
          }

          .${styles.recipesGrid} {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .${styles.modal} {
            margin: 10px;
            max-height: 90vh;
          }

          .${styles.modalHeader} {
            padding: 20px;
          }

          .${styles.modalContent} {
            padding: 20px;
          }

          .${styles.recipeItem} {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }

          .${styles.recipeInfo} {
            flex-direction: column;
            gap: 10px;
          }

          .${styles.emptyState} {
            padding: 50px 20px;
            margin: 30px auto;
          }

          .${styles.emptyIcon} {
            font-size: 4rem;
          }
        }

        /* États de chargement */
        .${styles.loadingContainer}, .${styles.errorContainer} {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
        }

        .${styles.loadingSpinner} {
          width: 50px;
          height: 50px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .${styles.retryButton} {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 20px;
          transition: all 0.3s ease;
        }

        .${styles.retryButton}:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
      `}</style>
    </div>
  )
}
