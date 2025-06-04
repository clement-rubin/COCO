import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { logUserInteraction, logError, logInfo, logDebug, logWarning, logComponentLifecycle, logApiCall, logPerformance } from '../utils/logger'

export default function MesRecettes() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filter, setFilter] = useState('all') // 'all', 'recipes', 'photos'
  const [showQuickActions, setShowQuickActions] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    logComponentLifecycle('MesRecettes', 'useEffect-auth-check', {
      authLoading,
      hasUser: !!user,
      userEmail: user?.email
    })

    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'mes-recettes-page', {
        reason: 'user_not_authenticated',
        targetPage: '/mes-recettes',
        authLoading,
        timestamp: new Date().toISOString()
      })
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
    }
  }, [user, authLoading, router])

  // Fetch user's recipes - Now includes refreshKey and router.asPath as dependencies
  useEffect(() => {
    const fetchUserRecipes = async () => {
      if (!user) {
        logDebug('fetchUserRecipes: user non défini, arrêt', { 
          authLoading, 
          userExists: !!user,
          step: 'early_return_no_user'
        })
        return
      }
      
      const fetchStartTime = Date.now()
      
      logInfo('fetchUserRecipes: DEBUT du processus', {
        userEmail: user.email,
        userId: user.id,
        userIdType: typeof user.id,
        userIdLength: user.id?.length,
        refreshKey,
        step: 'process_start',
        timestamp: new Date().toISOString(),
        authState: {
          loading: authLoading,
          hasUser: !!user,
          userEmail: user.email
        }
      })
      
      try {
        setLoading(true)
        setError(null) // Reset error state
        
        logDebug('fetchUserRecipes: État initial défini', {
          loadingSet: true,
          errorReset: true,
          step: 'state_reset'
        })
        
        logInfo('Récupération des recettes utilisateur - DEBUT', {
          userEmail: user.email,
          userId: user.id,
          userIdLength: user.id?.length,
          userDisplayName: user.user_metadata?.display_name,
          userFullName: user.user_metadata?.full_name,
          refreshKey,
          timestamp: new Date().toISOString(),
          userMetadata: user.user_metadata,
          authProvider: user.app_metadata?.provider,
          completeUserObject: {
            id: user.id,
            email: user.email,
            email_confirmed_at: user.email_confirmed_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata
          },
          step: 'data_preparation'
        })

        // Force cache bypass with timestamp and add user_id parameter
        const timestamp = Date.now()
        const apiUrl = `/api/recipes?user_id=${encodeURIComponent(user.id)}&_t=${timestamp}`
        
        logDebug('Préparation de l\'appel API - DETAILS', {
          url: apiUrl,
          userId: user.id,
          userIdEncoded: encodeURIComponent(user.id),
          userIdSubstring: user.id?.substring(0, 8) + '...',
          timestamp,
          step: 'api_url_preparation',
          cacheHeaders: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })

        // Première requête: récupérer TOUTES les recettes pour diagnostic
        const allRecipesUrl = `/api/recipes?_t=${timestamp}`
        logDebug('DIAGNOSTIC - Récupération de TOUTES les recettes d\'abord', {
          url: allRecipesUrl,
          step: 'diagnostic_all_recipes_start'
        })

        logInfo('fetchUserRecipes: Début appel API diagnostic (toutes recettes)', {
          url: allRecipesUrl,
          step: 'diagnostic_api_call_start',
          timestamp: new Date().toISOString()
        })

        const allRecipesResponse = await fetch(allRecipesUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })

        logInfo('fetchUserRecipes: Réponse API diagnostic reçue', {
          status: allRecipesResponse.status,
          statusText: allRecipesResponse.statusText,
          ok: allRecipesResponse.ok,
          headers: Object.fromEntries(allRecipesResponse.headers.entries()),
          step: 'diagnostic_api_response'
        })

        if (allRecipesResponse.ok) {
          const allRecipes = await allRecipesResponse.json()
          logInfo('DIAGNOSTIC - Toutes les recettes en base', {
            totalRecipes: allRecipes.length,
            recipesWithUserId: allRecipes.filter(r => r.user_id).length,
            recipesWithoutUserId: allRecipes.filter(r => !r.user_id).length,
            currentUserId: user.id,
            recipesForCurrentUser: allRecipes.filter(r => r.user_id === user.id).length,
            allUserIds: [...new Set(allRecipes.map(r => r.user_id).filter(Boolean))],
            step: 'diagnostic_analysis',
            sampleRecipesUserIds: allRecipes.slice(0, 5).map(r => ({
              title: r.title,
              author: r.author,
              user_id: r.user_id,
              created_at: r.created_at,
              category: r.category,
              userIdMatch: r.user_id === user.id,
              userIdComparison: {
                recipeUserId: r.user_id,
                currentUserId: user.id,
                strictEqual: r.user_id === user.id,
                typeMatch: typeof r.user_id === typeof user.id
              }
            })),
            userIdComparisons: allRecipes.map(r => ({
              recipeUserId: r.user_id,
              currentUserId: user.id,
              strictEqual: r.user_id === user.id,
              typeofRecipeUserId: typeof r.user_id,
              typeofCurrentUserId: typeof user.id,
              lengthRecipeUserId: r.user_id?.length,
              lengthCurrentUserId: user.id?.length
            })).slice(0, 3)
          })
        } else {
          logError('fetchUserRecipes: Erreur lors du diagnostic', {
            status: allRecipesResponse.status,
            statusText: allRecipesResponse.statusText,
            step: 'diagnostic_api_error'
          })
        }

        logInfo('fetchUserRecipes: Début appel API principal (recettes utilisateur)', {
          url: apiUrl,
          step: 'main_api_call_start',
          timestamp: new Date().toISOString()
        })

        const response = await fetch(apiUrl, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        
        const fetchDuration = Date.now() - fetchStartTime
        
        logInfo('fetchUserRecipes: Réponse API principale reçue', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          fetchDuration,
          step: 'main_api_response',
          headers: Object.fromEntries(response.headers.entries())
        })
        
        logPerformance('API recipes fetch', fetchDuration, {
          url: apiUrl,
          status: response.status,
          ok: response.ok,
          step: 'performance_log'
        })

        logApiCall('GET', apiUrl, null, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: fetchDuration
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          logError('fetchUserRecipes: Réponse API non-OK', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            step: 'api_error_response'
          })
          throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`)
        }

        logDebug('fetchUserRecipes: Parsing JSON response', {
          step: 'json_parsing_start'
        })

        const userRecipes = await response.json()
        
        logInfo('fetchUserRecipes: JSON parsé avec succès', {
          dataType: typeof userRecipes,
          isArray: Array.isArray(userRecipes),
          length: userRecipes?.length,
          step: 'json_parsed'
        })
        
        logInfo('Données reçues de l\'API (filtrées par user_id) - DETAILS', {
          userRecipesFound: userRecipes.length,
          photoShares: userRecipes.filter(r => r.category === 'Photo partagée').length,
          fullRecipes: userRecipes.filter(r => r.category !== 'Photo partagée').length,
          requestedUserId: user.id,
          step: 'data_analysis',
          sampleRecipes: userRecipes.slice(0, 3).map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            category: r.category,
            created_at: r.created_at,
            hasImage: !!r.image,
            imageType: typeof r.image,
            hasUserId: !!r.user_id,
            userIdMatch: r.user_id === user.id,
            recipeUserId: r.user_id,
            currentUserId: user.id
          })),
          userRecipesCategories: userRecipes.map(r => r.category).reduce((acc, cat) => {
            acc[cat] = (acc[cat] || 0) + 1
            return acc
          }, {}),
          firstRecipeDetails: userRecipes[0] ? {
            id: userRecipes[0].id,
            title: userRecipes[0].title,
            author: userRecipes[0].author,
            category: userRecipes[0].category,
            created_at: userRecipes[0].created_at,
            hasImage: !!userRecipes[0].image,
            user_id: userRecipes[0].user_id,
            user_id_substring: userRecipes[0].user_id?.substring(0, 8) + '...'
          } : null,
          processingTime: Date.now() - fetchStartTime,
          allRecipeUserIds: userRecipes.map(r => r.user_id),
          currentUserIdForComparison: user.id
        })
        
        logDebug('fetchUserRecipes: Tri des recettes par date', {
          step: 'sorting_recipes',
          beforeSortingCount: userRecipes.length
        })
        
        // Trier les recettes par date de création (plus récente en premier)
        userRecipes.sort((a, b) => {
          const dateA = new Date(a.created_at || 0)
          const dateB = new Date(b.created_at || 0)
          return dateB - dateA
        })

        logDebug('fetchUserRecipes: Mise à jour du state recipes', {
          step: 'state_update',
          recipesCount: userRecipes.length
        })

        setRecipes(userRecipes)
        
        logInfo('Recettes utilisateur définies avec succès - FINAL', {
          userRecipesCount: userRecipes.length,
          photoShares: userRecipes.filter(r => r.category === 'Photo partagée').length,
          fullRecipes: userRecipes.filter(r => r.category !== 'Photo partagée').length,
          userRecipesTitles: userRecipes.map(r => r.title).slice(0, 5),
          processingTime: Date.now() - fetchStartTime,
          finalRecipesUserIds: userRecipes.map(r => r.user_id),
          finalCurrentUserId: user.id,
          step: 'process_complete'
        })

        // Si aucune recette trouvée, logger pour debug
        if (userRecipes.length === 0) {
          logWarning('DIAGNOSTIC - Aucune recette utilisateur trouvée', {
            userId: user.id,
            userIdSubstring: user.id?.substring(0, 8) + '...',
            userEmail: user.email,
            userDisplayName: user.user_metadata?.display_name,
            searchedWith: 'user_id filtering',
            userIdType: typeof user.id,
            userIdLength: user.id?.length,
            step: 'no_recipes_found',
            possibleCauses: [
              'user_id pas renseigné lors de la création',
              'user_id différent entre création et récupération',
              'problème de type de données (string vs uuid)',
              'problème d\'authentification'
            ],
            debugInfo: {
              authLoading,
              hasUser: !!user,
              userMetadata: user.user_metadata,
              appMetadata: user.app_metadata
            }
          })
        }

      } catch (err) {
        const fetchDuration = Date.now() - fetchStartTime
        
        logError('Erreur lors de la récupération des recettes utilisateur', err, {
          userEmail: user?.email,
          userId: user?.id?.substring(0, 8) + '...',
          errorMessage: err.message,
          errorStack: err.stack,
          errorName: err.name,
          refreshKey,
          timestamp: new Date().toISOString(),
          fetchDuration,
          step: 'error_caught',
          networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'server',
          errorDetails: {
            name: err.name,
            message: err.message,
            stack: err.stack?.substring(0, 500)
          }
        })
        
        setError('Impossible de charger vos recettes. Erreur: ' + (err.message || 'Inconnue'))
      } finally {
        const totalDuration = Date.now() - fetchStartTime
        
        logDebug('fetchUserRecipes: Nettoyage final', {
          step: 'cleanup',
          totalDuration
        })
        
        setLoading(false)
        
        logPerformance('fetchUserRecipes total', totalDuration, {
          userEmail: user?.email,
          userId: user?.id?.substring(0, 8) + '...',
          refreshKey,
          step: 'final_performance'
        })
        
        logInfo('fetchUserRecipes: PROCESSUS TERMINÉ', {
          success: !error,
          totalDuration,
          step: 'process_end',
          timestamp: new Date().toISOString()
        })
      }
    }

    if (user && !authLoading) {
      logComponentLifecycle('MesRecettes', 'fetchUserRecipes-start', {
        userEmail: user?.email,
        userId: user?.id?.substring(0, 8) + '...',
        refreshKey,
        routerPath: router.asPath,
        step: 'useEffect_trigger'
      })
      fetchUserRecipes()
    } else {
      logDebug('fetchUserRecipes: Conditions non remplies', {
        hasUser: !!user,
        authLoading,
        step: 'useEffect_skip'
      })
    }
  }, [user, authLoading, refreshKey, router.asPath]) // Added refreshKey and router.asPath

  // Function to manually refresh recipes
  const handleRefresh = () => {
    logUserInteraction('REFRESH_RECIPES', 'mes-recettes-page', {
      currentRefreshKey: refreshKey,
      newRefreshKey: refreshKey + 1,
      userEmail: user?.email,
      currentRecipesCount: recipes.length
    })
    
    setRefreshKey(prev => prev + 1)
  }

  // Auto-refresh when coming back to the page (focus event)
  useEffect(() => {
    const handleFocus = () => {
      if (user && !authLoading && !loading) {
        logInfo('Page refocused, refreshing recipes', {
          userEmail: user?.email,
          currentRecipesCount: recipes.length,
          wasLoading: loading,
          timestamp: new Date().toISOString()
        })
        setRefreshKey(prev => prev + 1)
      }
    }

    logDebug('Setting up focus event listener', {
      userExists: !!user,
      authLoading,
      loading
    })

    window.addEventListener('focus', handleFocus)
    return () => {
      logDebug('Cleaning up focus event listener')
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, authLoading, loading])

  // Filter recipes based on selected filter
  const filteredRecipes = recipes.filter(recipe => {
    if (filter === 'all') return true
    if (filter === 'photos') return recipe.category === 'Photo partagée'
    if (filter === 'recipes') return recipe.category !== 'Photo partagée'
    return true
  })

  const photoSharesCount = recipes.filter(r => r.category === 'Photo partagée').length
  const fullRecipesCount = recipes.filter(r => r.category !== 'Photo partagée').length

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '2rem',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ margin: 0, color: '#6b7280' }}>Connexion en cours...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Gérez vos recettes publiées sur COCO" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Enhanced Header */}
      <section style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '2rem 1rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderBottom: 'none'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>👨‍🍳</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <h1 style={{ 
            fontSize: '1.8rem', 
            margin: 0,
            color: 'white',
            fontWeight: '600'
          }}>
            Mes Créations
          </h1>
          <button
            onClick={handleRefresh}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '1.2rem',
              color: 'white'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              e.target.style.transform = 'translateY(-1px)'
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              e.target.style.transform = 'translateY(0)'
            }}
            title="Actualiser les recettes"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '1rem',
          margin: '0 0 0.5rem 0',
          fontWeight: '500'
        }}>
          Bonjour {user.user_metadata?.display_name || user.email} !
        </p>
        {!loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            flexWrap: 'wrap',
            marginTop: '1rem'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.5rem 1rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                📝 {fullRecipesCount} recette{fullRecipesCount > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.5rem 1rem',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ color: 'white', fontSize: '0.9rem' }}>
                📷 {photoSharesCount} photo{photoSharesCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Enhanced Quick Actions */}
      {showQuickActions && (
        <section style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '1.5rem 1rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: 'none'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              color: 'white',
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              Actions rapides
            </h3>
            <button
              onClick={() => setShowQuickActions(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '0.25rem'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <button 
              onClick={() => router.push('/share-photo')}
              style={{ 
                border: 'none', 
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(34, 197, 94, 0.4)'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📷</span>
              <div style={{ textAlign: 'left' }}>
                <div>Photo rapide</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Partage instantané</div>
              </div>
            </button>
            
            <button 
              onClick={() => router.push('/submit-recipe')}
              style={{ 
                border: 'none', 
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '1rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📝</span>
              <div style={{ textAlign: 'left' }}>
                <div>Nouvelle recette</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Recette complète</div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Main Content */}
      <section style={{
        background: 'white',
        minHeight: 'calc(100vh - 300px)',
        borderRadius: '1rem 1rem 0 0',
        padding: '2rem 1rem',
        marginTop: showQuickActions ? '0' : '1rem'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 2rem'
            }} />
            <h3 style={{ color: '#6b7280', margin: '0 0 0.5rem 0' }}>
              Chargement de vos créations...
            </h3>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.9rem' }}>
              Récupération de vos recettes et photos
            </p>
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', margin: '0 0 1rem 0' }}>Erreur de chargement</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>{error}</p>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={handleRefresh}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 Réessayer
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                🔄 Recharger la page
              </button>
            </div>
          </div>
        ) : recipes.length === 0 ? (
          /* Enhanced Empty State */
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '2rem' }}>🍽️</div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              color: '#1f2937',
              fontWeight: '600'
            }}>
              Votre cuisine vous attend !
            </h2>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '2rem',
              lineHeight: '1.6',
              fontSize: '1.1rem'
            }}>
              Commencez à partager vos créations culinaires avec la communauté COCO.
              Que ce soit une photo rapide ou une recette détaillée, chaque partage compte !
            </p>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '350px',
              margin: '0 auto'
            }}>
              <button 
                onClick={() => router.push('/share-photo')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>📷</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Partager une photo</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Simple et rapide</div>
                </div>
              </button>
              
              <button 
                onClick={() => router.push('/submit-recipe')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '1.25rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>📝</span>
                <div style={{ textAlign: 'left' }}>
                  <div>Créer une recette</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Avec ingrédients et étapes</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Enhanced Recipes Grid with Filters */
          <div>
            {/* Filter Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                {[
                  { key: 'all', label: 'Tout', icon: '🍽️' },
                  { key: 'recipes', label: 'Recettes', icon: '📝' },
                  { key: 'photos', label: 'Photos', icon: '📷' }
                ].map(filterOption => (
                  <button
                    key={filterOption.key}
                    onClick={() => setFilter(filterOption.key)}
                    style={{
                      background: filter === filterOption.key 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : 'white',
                      color: filter === filterOption.key ? 'white' : '#6b7280',
                      border: filter === filterOption.key ? 'none' : '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span>{filterOption.icon}</span>
                    {filterOption.label}
                    {filterOption.key !== 'all' && (
                      <span style={{
                        background: filter === filterOption.key 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : '#f3f4f6',
                        color: filter === filterOption.key ? 'white' : '#6b7280',
                        borderRadius: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.75rem',
                        minWidth: '1.5rem',
                        textAlign: 'center'
                      }}>
                        {filterOption.key === 'recipes' ? fullRecipesCount : photoSharesCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <span style={{
                  color: '#6b7280',
                  fontSize: '0.9rem'
                }}>
                  {filteredRecipes.length} résultat{filteredRecipes.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleRefresh}
                  style={{
                    background: 'none',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s ease'
                  }}
                  disabled={loading}
                >
                  {loading ? '⏳' : '🔄'}
                </button>
              </div>
            </div>
            
            {/* Recipes Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem'
            }}>
              {filteredRecipes.map(recipe => (
                <RecipeCard 
                  key={`${recipe.id}-${refreshKey}`}
                  recipe={recipe} 
                  isUserRecipe={true}
                  isPhotoOnly={recipe.category === 'Photo partagée'}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          section:first-of-type {
            padding: 1.5rem 1rem !important;
          }
          
          section:first-of-type h1 {
            fontSize: 1.5rem !important;
          }
          
          .quick-actions-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
