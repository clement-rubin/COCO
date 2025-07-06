import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { 
  logUserInteraction, 
  logError, 
  logInfo, 
  logApiCall,
  logPerformance,
  logComponentEvent,
  logDatabaseOperation,
  logSuccess,
  logDebug,
  logWarning
} from '../utils/logger'
import { canUserEditRecipe, deleteUserRecipe } from '../utils/profileUtils'
import styles from '../styles/UserRecipes.module.css'

export default function MesRecettes() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, quick, complete
  // États pour les logs de debug
  const [debugLogs, setDebugLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  // Nouveaux états pour la participation au concours
  const [showParticipationModal, setShowParticipationModal] = useState(false)
  const [participatingRecipes, setParticipatingRecipes] = useState(new Set())
  const [participationLoading, setParticipationLoading] = useState(false)
  const [weekInfo, setWeekInfo] = useState(null)

  useEffect(() => {
    addDebugLog('INFO', 'Component mounted', {
      authLoading,
      user: user ? { id: user.id?.substring(0, 8) + '...', email: user.email } : null
    })

    if (!authLoading && !user) {
      addDebugLog('WARNING', 'No user found, redirecting to login')
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
      return
    }

    if (user) {
      addDebugLog('INFO', 'User authenticated, loading data')
      loadUserRecipes()
      loadParticipationStatus()
    }
  }, [user, authLoading, router])

  const loadUserRecipes = async () => {
    const startTime = performance.now()
    
    try {
      setLoading(true)
      setError(null)

      // Vérification préalable de l'utilisateur
      if (!user || !user.id) {
        addDebugLog('ERROR', 'No user or user ID available during recipe loading', {
          user: !!user,
          userId: user?.id
        })
        logError('No user or user ID available during recipe loading', new Error('User not authenticated'), {
          user: !!user,
          userId: user?.id,
          component: 'MesRecettes'
        })
        setError('Utilisateur non authentifié')
        return
      }

      addDebugLog('INFO', 'Loading user recipes directly from database', {
        userId: user.id?.substring(0, 8) + '...',
        timestamp: new Date().toISOString()
      })

      logInfo('Loading user recipes directly from database', {
        userId: user.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        timestamp: new Date().toISOString()
      })

      // Utilisation directe de Supabase comme dans test-recipes.js
      const { supabase } = await import('../lib/supabase')
      
      addDebugLog('INFO', 'Supabase client imported successfully', {
        userId: user.id?.substring(0, 8) + '...'
      })

      logInfo('Supabase client imported successfully', {
        userId: user.id?.substring(0, 8) + '...',
        component: 'MesRecettes'
      })

      // Requête directe à la table recipes avec filtrage par user_id
      const { data: userRecipes, error: supabaseError } = await supabase
        .from('recipes')
        .select(`
          id,
          title,
          description,
          image,
          category,
          author,
          user_id,
          created_at,
          updated_at,
          prepTime,
          cookTime,
          difficulty,
          servings,
          ingredients,
          instructions,
          form_mode
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (supabaseError) {
        addDebugLog('ERROR', 'Supabase query error for user recipes', {
          userId: user.id?.substring(0, 8) + '...',
          errorCode: supabaseError.code,
          errorMessage: supabaseError.message,
          errorDetails: supabaseError.details,
          errorHint: supabaseError.hint
        })
        logError('Supabase query error for user recipes', supabaseError, {
          userId: user.id?.substring(0, 8) + '...',
          errorCode: supabaseError.code,
          errorMessage: supabaseError.message,
          errorDetails: supabaseError.details,
          errorHint: supabaseError.hint
        })
        throw new Error(`Erreur base de données: ${supabaseError.message}`)
      }

      addDebugLog('INFO', 'Raw Supabase query results', {
        userId: user.id?.substring(0, 8) + '...',
        resultCount: userRecipes?.length || 0,
        isArray: Array.isArray(userRecipes),
        hasData: !!userRecipes,
        firstRecipePreview: userRecipes?.[0] ? {
          id: userRecipes[0].id,
          title: userRecipes[0].title?.substring(0, 20) + '...',
          user_id: userRecipes[0].user_id?.substring(0, 8) + '...',
          category: userRecipes[0].category,
          form_mode: userRecipes[0].form_mode,
          created_at: userRecipes[0].created_at
        } : 'No first recipe'
      })

      logInfo('Raw Supabase query results', {
        userId: user.id?.substring(0, 8) + '...',
        resultCount: userRecipes?.length || 0,
        isArray: Array.isArray(userRecipes),
        hasData: !!userRecipes,
        firstRecipePreview: userRecipes?.[0] ? {
          id: userRecipes[0].id,
          title: userRecipes[0].title?.substring(0, 20) + '...',
          user_id: userRecipes[0].user_id?.substring(0, 8) + '...',
          category: userRecipes[0].category,
          form_mode: userRecipes[0].form_mode,
          created_at: userRecipes[0].created_at
        } : 'No first recipe'
      })

      // S'assurer que nous avons un tableau valide
      const safeRecipes = Array.isArray(userRecipes) ? userRecipes : []

      // Validation et nettoyage des données
      const validatedRecipes = safeRecipes
        .filter(recipe => {
          const isValid = recipe && 
                         recipe.id && 
                         recipe.title && 
                         recipe.user_id === user.id

          if (!isValid) {
            addDebugLog('WARNING', 'Recipe filtered out during validation', {
              recipeId: recipe?.id,
              hasTitle: !!recipe?.title,
              hasId: !!recipe?.id,
              userIdMatch: recipe?.user_id === user.id,
              recipeUserId: recipe?.user_id?.substring(0, 8) + '...',
              expectedUserId: user.id?.substring(0, 8) + '...'
            })
            logWarning('Recipe filtered out during validation', {
              recipeId: recipe?.id,
              hasTitle: !!recipe?.title,
              hasId: !!recipe?.id,
              userIdMatch: recipe?.user_id === user.id,
              recipeUserId: recipe?.user_id?.substring(0, 8) + '...',
              expectedUserId: user.id?.substring(0, 8) + '...'
            })
          }

          return isValid
        })
        .map(recipe => ({
          // S'assurer que tous les champs nécessaires sont présents
          id: recipe.id,
          title: recipe.title || 'Sans titre',
          description: recipe.description || '',
          image: recipe.image || null,
          category: recipe.category || 'Autre',
          author: recipe.author || 'Chef Anonyme',
          user_id: recipe.user_id,
          created_at: recipe.created_at,
          updated_at: recipe.updated_at,
          prepTime: recipe.prepTime || null,
          cookTime: recipe.cookTime || null,
          difficulty: recipe.difficulty || 'Facile',
          servings: recipe.servings || null,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : 
                      typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients || '[]') : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions :
                       typeof recipe.instructions === 'string' ? JSON.parse(recipe.instructions || '[]') : [],
          form_mode: recipe.form_mode || 'complete'
        }))

      addDebugLog('SUCCESS', 'Recipes validated and processed', {
        userId: user.id?.substring(0, 8) + '...',
        totalFromDB: safeRecipes.length,
        validatedCount: validatedRecipes.length,
        filteredOut: safeRecipes.length - validatedRecipes.length,
        categories: [...new Set(validatedRecipes.map(r => r.category))],
        formModes: [...new Set(validatedRecipes.map(r => r.form_mode))],
        hasImages: validatedRecipes.filter(r => r.image).length,
        recentRecipes: validatedRecipes.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title?.substring(0, 25) + '...',
          category: r.category,
          form_mode: r.form_mode,
          created_at: r.created_at
        }))
      })
      
      logInfo('Recipes validated and processed', {
        userId: user.id?.substring(0, 8) + '...',
        totalFromDB: safeRecipes.length,
        validatedCount: validatedRecipes.length,
        filteredOut: safeRecipes.length - validatedRecipes.length,
        categories: [...new Set(validatedRecipes.map(r => r.category))],
        formModes: [...new Set(validatedRecipes.map(r => r.form_mode))],
        hasImages: validatedRecipes.filter(r => r.image).length,
        recentRecipes: validatedRecipes.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title?.substring(0, 25) + '...',
          category: r.category,
          form_mode: r.form_mode,
          created_at: r.created_at
        }))
      })

      setRecipes(validatedRecipes)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      addDebugLog('SUCCESS', 'User recipes loaded successfully via direct Supabase query', {
        userId: user.id?.substring(0, 8) + '...',
        recipesCount: validatedRecipes.length,
        loadTime: `${totalDuration.toFixed(2)}ms`,
        method: 'direct_supabase',
        success: true
      })

      logSuccess('User recipes loaded successfully via direct Supabase query', {
        userId: user.id?.substring(0, 8) + '...',
        recipesCount: validatedRecipes.length,
        loadTime: `${totalDuration.toFixed(2)}ms`,
        component: 'MesRecettes',
        method: 'direct_supabase',
        success: true
      })

    } catch (err) {
      const endTime = performance.now()
      const totalDuration = endTime - startTime

      addDebugLog('ERROR', 'Failed to load user recipes via direct query', {
        userId: user?.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        errorName: err.name,
        loadTime: `${totalDuration.toFixed(2)}ms`,
        method: 'direct_supabase'
      })

      logError('Failed to load user recipes via direct query', err, {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        errorMessage: err.message,
        errorName: err.name,
        loadTime: `${totalDuration.toFixed(2)}ms`,
        method: 'direct_supabase'
      })

      setError(`Impossible de charger vos recettes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Nouvelle fonction pour charger le statut de participation avec logs détaillés
  const loadParticipationStatus = async () => {
    const startTime = performance.now()
    
    try {
      addDebugLog('INFO', 'Starting participation status loading', {
        userId: user?.id?.substring(0, 8) + '...'
      })
      
      logInfo('Starting participation status loading', {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes'
      })
      
      const apiUrl = `/api/weekly-contest-participation?user_id=${user.id}`
      
      addDebugLog('INFO', 'Making API call for participation status', {
        userId: user?.id?.substring(0, 8) + '...',
        apiUrl: apiUrl,
        context: 'loadParticipationStatus'
      })
      
      logApiCall('GET', apiUrl, {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        context: 'loadParticipationStatus'
      })
      
      const response = await fetch(apiUrl)
      
      addDebugLog('INFO', 'Participation status API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        userId: user?.id?.substring(0, 8) + '...',
        url: apiUrl
      })
      
      logInfo('Participation status API response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        userId: user?.id?.substring(0, 8) + '...',
        url: apiUrl
      })
      
      if (!response.ok) {
        let errorDetails = {}
        try {
          const errorData = await response.text()
          errorDetails = {
            status: response.status,
            statusText: response.statusText,
            responseText: errorData?.substring(0, 500),
            userId: user?.id?.substring(0, 8) + '...'
          }
        } catch (parseError) {
          errorDetails = {
            status: response.status,
            statusText: response.statusText,
            parseError: parseError.message,
            userId: user?.id?.substring(0, 8) + '...'
          }
        }
        
        addDebugLog('ERROR', 'Participation status API call failed', errorDetails)
        logError('Participation status API call failed', new Error(`HTTP ${response.status}: ${response.statusText}`), errorDetails)
        
        // Don't throw error here, just return early to continue with recipe loading
        return
      }

      let data
      try {
        data = await response.json()
        
        addDebugLog('SUCCESS', 'Participation status response parsed successfully', {
          hasUserCandidates: !!data.userCandidates,
          userCandidatesCount: data.userCandidates?.length || 0,
          hasContest: !!data.contest,
          contestId: data.contest?.id,
          contestWeekStart: data.contest?.week_start,
          contestWeekEnd: data.contest?.week_end,
          userId: user?.id?.substring(0, 8) + '...'
        })
        
        logInfo('Participation status response parsed successfully', {
          hasUserCandidates: !!data.userCandidates,
          userCandidatesCount: data.userCandidates?.length || 0,
          hasContest: !!data.contest,
          contestId: data.contest?.id,
          contestWeekStart: data.contest?.week_start,
          contestWeekEnd: data.contest?.week_end,
          userId: user?.id?.substring(0, 8) + '...'
        })
      } catch (parseError) {
        addDebugLog('ERROR', 'Failed to parse participation status response', {
          userId: user?.id?.substring(0, 8) + '...',
          responseStatus: response.status,
          parseError: parseError.message
        })
        logError('Failed to parse participation status response', parseError, {
          userId: user?.id?.substring(0, 8) + '...',
          responseStatus: response.status
        })
        return
      }
      
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
      
      addDebugLog('SUCCESS', 'Participation status loaded successfully', {
        userId: user?.id?.substring(0, 8) + '...',
        participatingRecipesCount: participatingIds.length,
        contestId: data.contest?.id,
        weekStart: data.contest?.week_start,
        weekEnd: data.contest?.week_end,
        loadTime: `${(endTime - startTime).toFixed(2)}ms`
      })
      
      logPerformance('Participation status loading', endTime - startTime, {
        userId: user?.id?.substring(0, 8) + '...',
        participatingRecipesCount: participatingIds.length,
        success: true
      })
      
      logSuccess('Participation status loaded successfully', {
        userId: user?.id?.substring(0, 8) + '...',
        participatingRecipesCount: participatingIds.length,
        contestId: data.contest?.id,
        weekStart: data.contest?.week_start,
        weekEnd: data.contest?.week_end
      })
      
    } catch (error) {
      const endTime = performance.now()
      
      addDebugLog('ERROR', 'Failed to load participation status', {
        userId: user?.id?.substring(0, 8) + '...',
        loadTime: `${(endTime - startTime).toFixed(2)}ms`,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500)
      })
      
      logError('Failed to load participation status', error, {
        userId: user?.id?.substring(0, 8) + '...',
        loadTime: `${(endTime - startTime).toFixed(2)}ms`,
        component: 'MesRecettes',
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500)
      })
      
      // Set default values to prevent UI errors
      setParticipatingRecipes(new Set())
      setWeekInfo(null)
    }
  }

  // Nouvelle fonction pour gérer la participation au concours hebdomadaire avec logs
  const handleParticipationToggle = async (recipeId, shouldParticipate) => {
    if (participationLoading) return

    const startTime = performance.now()
    
    addDebugLog('INFO', 'Participation toggle initiated', {
      recipeId,
      shouldParticipate,
      userId: user?.id?.substring(0, 8) + '...',
      currentParticipatingCount: participatingRecipes.size
    })
    
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
          addDebugLog('WARNING', 'Recipe participation limit reached', {
            currentCount: participatingRecipes.size,
            maxAllowed: weekInfo.maxCandidates,
            userId: user?.id?.substring(0, 8) + '...',
            recipeId
          })
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
        addDebugLog('INFO', 'Registering recipe for contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          isManualEntry: true
        })
        
        const response = await fetch('/api/weekly-contest-participation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user.id,
            is_manual_entry: true
          })
        })

        addDebugLog('INFO', 'Recipe participation API response', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          isManualEntry: true,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        logApiCall('POST', '/api/weekly-contest-participation', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          isManualEntry: true,
          status: response.status
        })

        if (!response.ok) {
          const errorData = await response.json()
          addDebugLog('ERROR', 'Recipe participation API call failed', {
            recipeId,
            userId: user?.id?.substring(0, 8) + '...',
            status: response.status,
            errorData
          })
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
        
        addDebugLog('SUCCESS', 'Recipe successfully registered for contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          newParticipatingCount: participatingRecipes.size + 1
        })
        
        logSuccess('Recipe successfully registered for contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          newParticipatingCount: participatingRecipes.size + 1
        })

      } else {
        // Retirer la recette du concours hebdomadaire
        addDebugLog('INFO', 'Withdrawing recipe from contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...'
        })
        
        const response = await fetch('/api/weekly-contest-participation', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user.id
          })
        })

        addDebugLog('INFO', 'Recipe withdrawal API response', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        logApiCall('DELETE', '/api/weekly-contest-participation', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          status: response.status
        })

        if (!response.ok) {
          const errorData = await response.json()
          addDebugLog('ERROR', 'Recipe withdrawal API call failed', {
            recipeId,
            userId: user?.id?.substring(0, 8) + '...',
            status: response.status,
            errorData
          })
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
        
        addDebugLog('SUCCESS', 'Recipe successfully withdrawn from contest', {
          recipeId,
          userId: user?.id?.substring(0, 8) + '...',
          newParticipatingCount: participatingRecipes.size - 1
        })
        
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
      addDebugLog('ERROR', 'Error toggling participation', {
        recipeId,
        shouldParticipate,
        userId: user?.id?.substring(0, 8) + '...',
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        errorMessage: error.message
      })
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
    
    addDebugLog('INFO', 'Delete recipe initiated', {
      recipeId,
      userId: user?.id?.substring(0, 8) + '...'
    })
    
    const success = await deleteUserRecipe(recipeId, user.id)
    if (success) {
      setRecipes(recipes => recipes.filter(r => r.id !== recipeId))
      // Retirer aussi de la participation si c'était le cas
      setParticipatingRecipes(prev => {
        const newSet = new Set(prev)
        newSet.delete(recipeId)
        return newSet
      })
      
      addDebugLog('SUCCESS', 'Recipe deleted successfully', {
        recipeId,
        userId: user?.id?.substring(0, 8) + '...'
      })
    } else {
      addDebugLog('ERROR', 'Failed to delete recipe', {
        recipeId,
        userId: user?.id?.substring(0, 8) + '...'
      })
      alert('Erreur lors de la suppression de la recette.')
    }
  }

  // Handler pour édition d'une recette
  const handleEditRecipe = (recipeId) => {
    addDebugLog('INFO', 'Edit recipe initiated', {
      recipeId,
      userId: user?.id?.substring(0, 8) + '...'
    })
    router.push(`/edit-recipe/${recipeId}`)
  }

  // Fonction pour vider les logs
  const handleClearLogs = () => {
    setDebugLogs([])
    addDebugLog('INFO', 'Debug logs cleared by user')
  }

  // Fonction pour copier les logs
  const handleCopyLogs = () => {
    const logsData = {
      timestamp: new Date().toISOString(),
      logs: debugLogs.slice(0, 20),
      user: user ? { id: user.id?.substring(0, 8) + '...', email: user.email } : null,
      recipes: recipes.length,
      participatingRecipes: participatingRecipes.size
    }
    navigator.clipboard.writeText(JSON.stringify(logsData, null, 2))
    alert('Logs copiés dans le presse-papiers !')
  }

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
    console.log(`[MES-RECETTES-${level}] ${message}`, data)
  }

  return (
    <div className={styles.container} style={{
      background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
      minHeight: '100vh',
      position: 'relative'
    }}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Toutes mes recettes sur COCO" />
      </Head>

      {/* Éléments décoratifs de fond */}
      <div style={{
        position: 'fixed',
        top: '-40px',
        right: '-40px',
        width: '160px',
        height: '160px',
        background: 'linear-gradient(45deg, #10b981, #059669)',
        borderRadius: '50%',
        opacity: 0.08,
        animation: 'float 6s ease-in-out infinite'
      }} />
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '-60px',
        width: '120px',
        height: '120px',
        background: 'linear-gradient(45deg, #f59e0b, #d97706)',
        borderRadius: '50%',
        opacity: 0.06,
        animation: 'float 8s ease-in-out infinite reverse'
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-50px',
        right: '10%',
        width: '100px',
        height: '100px',
        background: 'linear-gradient(45deg, #10b981, #059669)',
        borderRadius: '50%',
        opacity: 0.05,
        animation: 'float 10s ease-in-out infinite'
      }} />

      {/* Hero section modernisé */}
      <section style={{
        width: '100%',
        background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
        padding: '80px 0 40px 0',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 0,
        marginTop: '-64px'
      }}>
        {/* Éléments décoratifs spécifiques au hero */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle at 60% 40%, #10b981 0%, transparent 70%)',
          opacity: 0.06,
          animation: 'float 12s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          right: '15%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle at 40% 60%, #f59e0b 0%, transparent 70%)',
          opacity: 0.08,
          animation: 'float 10s ease-in-out infinite reverse'
        }} />

        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '24px 20px 0'
        }}>
          {/* Logo animé COCO-style */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 20px',
            boxShadow: '0 12px 35px rgba(16, 185, 129, 0.3), 0 6px 15px rgba(16, 185, 129, 0.15)',
            animation: 'heroLogo 3s ease-in-out infinite',
            border: '3px solid rgba(255, 255, 255, 0.9)',
            position: 'relative'
          }}>
            👨‍🍳
            {/* Effet de brillance */}
            <div style={{
              position: 'absolute',
              top: '15%',
              left: '20%',
              width: '35%',
              height: '35%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(4px)',
              animation: 'shine 2s ease-in-out infinite'
            }} />
          </div>

          {/* Titre principal avec effet gradient */}
          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: '900',
            margin: '0 0 12px 0',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
            lineHeight: '1',
            textShadow: '0 2px 10px rgba(16, 185, 129, 0.1)'
          }}>
            Mes Recettes COCO
          </h1>

          {/* Sous-titre avec animation */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              margin: '0 0 8px 0',
              color: '#1f2937',
              lineHeight: '1.2'
            }}>
              Créez.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative'
              }}>
                Partagez.
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  left: '0',
                  right: '0',
                  height: '2px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  borderRadius: '1px',
                  animation: 'expandLine 2s ease-in-out infinite'
                }} />
              </span>
              {' '}Inspirez.
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.4',
              fontWeight: '500'
            }}>
              Votre collection personnelle de délices culinaires
            </p>
          </div>

          {/* Statistiques avec design amélioré */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '28px',
            flexWrap: 'wrap'
          }}>
            {[
              { 
                number: recipes.length, 
                label: 'Recettes', 
                icon: '🍽️', 
                color: '#10b981' 
              },
              { 
                number: getFilteredRecipes().filter(r => r.form_mode === 'quick').length, 
                label: 'Express', 
                icon: '⚡', 
                color: '#f59e0b' 
              },
              { 
                number: participatingRecipes.size, 
                label: 'En concours', 
                icon: '🏆', 
                color: '#8b5cf6',
                clickable: participatingRecipes.size > 0,
                onClick: () => setShowParticipationModal(true)
              }
            ].map((stat, index) => (
              <div 
                key={index} 
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(15px)',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: `2px solid ${stat.color}20`,
                  minWidth: '80px',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  cursor: stat.clickable ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  ...(stat.clickable && {
                    border: `2px solid ${stat.color}`,
                    transform: 'scale(1.02)'
                  })
                }}
                onClick={stat.onClick}
                onMouseEnter={stat.clickable ? (e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.05)'
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)'
                } : undefined}
                onMouseLeave={stat.clickable ? (e) => {
                  e.target.style.transform = 'translateY(0) scale(1.02)'
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)'
                } : undefined}
              >
                <div style={{ 
                  fontSize: '1.4rem', 
                  marginBottom: '6px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: stat.color,
                  marginBottom: '4px'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  fontWeight: '600'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Actions rapides redessinées */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => router.push('/submit-recipe')}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '16px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px)'
                e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✨ Nouvelle Recette
            </button>
            
            {participatingRecipes.size > 0 && (
              <button
                onClick={() => setShowParticipationModal(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#8b5cf6',
                  border: '2px solid #8b5cf6',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#8b5cf6'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  e.target.style.color = '#8b5cf6'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                🏆 Gérer Concours ({participatingRecipes.size})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section Logs redessinée */}
      <div style={{
        maxWidth: '900px',
        margin: '-20px auto 20px',
        padding: '0 20px'
      }}>
        <button 
          onClick={() => setShowLogs(!showLogs)}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '2px solid #e5e7eb',
            color: '#1f2937',
            padding: '12px 20px',
            borderRadius: '16px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)'
            e.target.style.borderColor = '#10b981'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)'
            e.target.style.borderColor = '#e5e7eb'
          }}
        >
          {showLogs ? '📋 Masquer Debug' : '📋 Debug & Logs'}
          <span style={{
            background: debugLogs.length > 0 ? '#10b981' : '#6b7280',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: '700',
            marginLeft: '4px'
          }}>
            {debugLogs.length}
          </span>
        </button>

        {showLogs && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(15px)',
            borderRadius: '20px',
            padding: '24px',
            marginTop: '12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              paddingRight: '8px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {debugLogs.slice(0, 15).map(log => (
                  <div key={log.id} className={`${styles.logEntry} ${styles[log.level.toLowerCase()]}`}>
                    <div className={styles.logHeader}>
                      <span className={`${styles.logLevel} ${styles[log.level.toLowerCase()]}`}>
                        {log.level}
                      </span>
                      <span className={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={styles.logMessage}>{log.message}</div>
                    {log.data && (
                      <details className={styles.logDetails}>
                        <summary>Détails</summary>
                        <pre className={styles.logData}>{log.data}</pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.logsActions}>
              <button onClick={handleClearLogs} className={styles.clearLogsBtn}>
                🗑️ Vider
              </button>
              <button onClick={handleCopyLogs} className={styles.copyLogsBtn}>
                📋 Copier
              </button>
              <button onClick={() => {loadUserRecipes(); loadParticipationStatus();}} className={styles.refreshBtn}>
                🔄 Actualiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Indicateur de participation amélioré */}
      {weekInfo && participatingRecipes.size > 0 && (
        <div style={{
          maxWidth: '900px',
          margin: '0 auto 24px',
          padding: '0 20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '2px solid #f59e0b',
            borderRadius: '20px',
            padding: '20px 24px',
            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Particules décoratives */}
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '40px',
              height: '40px',
              background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
              borderRadius: '50%',
              opacity: 0.3,
              animation: 'float 4s ease-in-out infinite'
            }} />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                background: '#f59e0b',
                color: 'white',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
              }}>
                🏆
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: '0 0 4px 0',
                  color: '#92400e',
                  fontSize: '1.2rem',
                  fontWeight: '800'
                }}>
                  {participatingRecipes.size} recette{participatingRecipes.size > 1 ? 's' : ''} en concours !
                </h3>
                <p style={{
                  margin: 0,
                  color: '#92400e',
                  fontSize: '0.95rem',
                  opacity: 0.9
                }}>
                  Semaine du {weekInfo && new Date(weekInfo.weekStart).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long' 
                  })} au {weekInfo && new Date(weekInfo.weekEnd).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
              
              <button 
                onClick={() => setShowParticipationModal(true)}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                Gérer
                <span style={{ fontSize: '0.8rem' }}>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section principale avec transition fluide */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '28px 28px 0 0',
        boxShadow: '0 -12px 40px rgba(0,0,0,0.1), 0 -4px 15px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2,
        minHeight: '60vh'
      }}>
        {/* Filtres redessinés avec navigation sticky */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(15px)',
          borderBottom: '1px solid #f3f4f6',
          padding: '24px 24px 16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {[
              { key: 'all', label: 'Toutes', icon: '📋', count: recipes.length, color: '#6366f1' },
              { key: 'quick', label: 'Express', icon: '⚡', count: recipes.filter(r => r.form_mode === 'quick' || r.category === 'Photo partagée').length, color: '#f59e0b' },
              { key: 'complete', label: 'Complètes', icon: '🍳', count: recipes.filter(r => r.form_mode === 'complete' || (r.form_mode !== 'quick' && r.category !== 'Photo partagée')).length, color: '#10b981' }
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                style={{
                  position: 'relative',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  color: filter === filterOption.key ? filterOption.color : '#374151',
                  background: filter === filterOption.key ? `${filterOption.color}15` : 'rgba(255, 255, 255, 0.8)',
                  border: `2px solid ${filter === filterOption.key ? filterOption.color : '#e5e7eb'}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '130px',
                  justifyContent: 'center',
                  boxShadow: filter === filterOption.key ? `0 4px 15px ${filterOption.color}20` : '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = filterOption.color
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = `0 4px 15px ${filterOption.color}15`
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{filterOption.icon}</span>
                <span>{filterOption.label}</span>
                <span style={{
                  background: filter === filterOption.key ? filterOption.color : '#6b7280',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  marginLeft: '4px'
                }}>
                  {filterOption.count}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Contenu principal */}
        <main style={{ padding: '32px 24px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #f3f4f6',
                borderTop: '4px solid #10b981',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
              }} />
              <h3 style={{
                color: '#1f2937',
                fontSize: '1.2rem',
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                Chargement de vos recettes...
              </h3>
              <p style={{
                color: '#6b7280',
                margin: 0
              }}>
                Préparation de vos délicieuses créations
              </p>
            </div>
          ) : error ? (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              color: '#dc2626'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '600' }}>
                Erreur de chargement
              </h3>
              <p style={{ margin: '0 0 16px 0' }}>{error}</p>
              <button
                onClick={() => {loadUserRecipes(); loadParticipationStatus();}}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                🔄 Réessayer
              </button>
            </div>
          ) : recipes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 40px',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '24px',
              border: '2px solid #0ea5e9',
              maxWidth: '500px',
              margin: '40px auto'
            }}>
              <div style={{
                position: 'relative',
                marginBottom: '30px',
                display: 'inline-block'
              }}>
                <div style={{
                  fontSize: '4rem',
                  marginBottom: '16px',
                  animation: 'float 3s ease-in-out infinite'
                }}>
                  👨‍🍳
                </div>
                
                {/* Bulles d'inspiration */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '-20px',
                  fontSize: '1.5rem',
                  animation: 'bubble 4s ease-in-out infinite'
                }}>
                  🍽️
                </div>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '-15px',
                  fontSize: '1.2rem',
                  animation: 'bubble 4s ease-in-out infinite 1s'
                }}>
                  ✨
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  fontSize: '1.3rem',
                  animation: 'bubble 4s ease-in-out infinite 2s'
                }}>
                  🥘
                </div>
              </div>
              
              <h3 style={{
                color: '#0369a1',
                fontSize: '1.8rem',
                fontWeight: '800',
                margin: '0 0 16px 0'
              }}>
                Votre livre de recettes vous attend !
              </h3>
              
              <p style={{
                color: '#0284c7',
                fontSize: '1.1rem',
                lineHeight: '1.6',
                margin: '0 0 32px 0',
                fontWeight: '500'
              }}>
                Créez votre première recette et rejoignez notre communauté de passionnés de cuisine. 
                Chaque chef a commencé par un premier plat !
              </p>
              
              <button 
                onClick={() => router.push('/submit-recipe')}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.02)'
                  e.target.style.boxShadow = '0 12px 35px rgba(16, 185, 129, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>✨</span>
                Créer ma première recette
              </button>
            </div>
          ) : (
            <>
              {/* En-tête des résultats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                padding: '0 8px'
              }}>
                <div>
                  <h2 style={{
                    margin: '0 0 4px 0',
                    color: '#1f2937',
                    fontSize: '1.5rem',
                    fontWeight: '800'
                  }}>
                    {filter === 'all' ? 'Toutes vos recettes' :
                     filter === 'quick' ? 'Recettes express' : 'Recettes complètes'}
                  </h2>
                  <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '0.95rem'
                  }}>
                    {getFilteredRecipes().length} recette{getFilteredRecipes().length > 1 ? 's' : ''} trouvée{getFilteredRecipes().length > 1 ? 's' : ''}
                  </p>
                </div>
                
                <button
                  onClick={() => router.push('/submit-recipe')}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>+</span>
                  Nouvelle
                </button>
              </div>

              {/* Grille de recettes améliorée */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
                marginBottom: '40px'
              }}>
                {getFilteredRecipes().map((recipe, index) => (
                  <div
                    key={recipe.id}
                    style={{
                      position: 'relative',
                      background: 'white',
                      borderRadius: '20px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      border: '1px solid #f3f4f6',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)'
                      e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {/* Badge de participation */}
                    {participatingRecipes.has(recipe.id) && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        zIndex: 3,
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '2px solid white'
                      }}>
                        <span>🏆</span>
                        En concours
                      </div>
                    )}

                    {/* Contenu de la RecipeCard */}
                    <RecipeCard 
                      recipe={recipe} 
                      isPhotoOnly={recipe.category === 'Photo partagée'}
                      onEdit={() => handleEditRecipe(recipe.id)}
                      onDelete={() => handleDeleteRecipe(recipe.id)}
                    />

                    {/* Actions de participation flottantes */}
                    <div style={{
                      position: 'absolute',
                      bottom: '16px',
                      right: '16px',
                      zIndex: 2
                    }}>
                      <button
                        onClick={() => handleParticipationToggle(
                          recipe.id, 
                          !participatingRecipes.has(recipe.id)
                        )}
                        disabled={participationLoading}
                        style={{
                          background: participatingRecipes.has(recipe.id) 
                            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                            : 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.3s ease',
                          boxShadow: participatingRecipes.has(recipe.id)
                            ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                            : '0 4px 15px rgba(245, 158, 11, 0.4)',
                          opacity: participationLoading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!participationLoading) {
                            e.target.style.transform = 'translateY(-2px) scale(1.05)'
                            e.target.style.boxShadow = participatingRecipes.has(recipe.id)
                              ? '0 6px 20px rgba(239, 68, 68, 0.5)'
                              : '0 6px 20px rgba(245, 158, 11, 0.5)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0) scale(1)'
                          e.target.style.boxShadow = participatingRecipes.has(recipe.id)
                            ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                            : '0 4px 15px rgba(245, 158, 11, 0.4)'
                        }}
                        title={participatingRecipes.has(recipe.id) ? 'Retirer du concours' : 'Inscrire au concours'}
                      >
                        <span style={{ fontSize: '0.9rem' }}>
                          {participatingRecipes.has(recipe.id) ? '✖️' : '🏆'}
                        </span>
                        {participatingRecipes.has(recipe.id) ? 'Retirer' : 'Inscrire'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
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
          background: linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%);
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

        @keyframes heroLogo {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.05) rotate(2deg); }
        }

        @keyframes shine {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }

        @keyframes expandLine {
          0%, 100% { transform: scaleX(0.8); }
          50% { transform: scaleX(1.2); }
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        /* Responsive amélioré */
        @media (max-width: 768px) {
          .container {
            padding: 10px !important;
          }
          
          h1 {
            font-size: 2.2rem !important;
          }
          
          .statsContainer {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .actionsContainer {
            flex-direction: column !important;
            width: 100% !important;
          }
          
          .filtersContainer {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .recipesGrid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }

        /* Scrollbar personnalisé */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 10px;
          border: 2px solid #f1f5f9;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #059669, #047857);
        }
      `}</style>
    </div>
  )
}
