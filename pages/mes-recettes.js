import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import RecipeCard from '../components/RecipeCard'
import { logUserInteraction, logError, logInfo } from '../utils/logger'

export default function MesRecettes() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'mes-recettes-page', {
        reason: 'user_not_authenticated',
        targetPage: '/mes-recettes'
      })
      router.push('/login?redirect=' + encodeURIComponent('/mes-recettes'))
    }
  }, [user, authLoading, router])

  // Fetch user's recipes - Now includes refreshKey and router.asPath as dependencies
  useEffect(() => {
    const fetchUserRecipes = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null) // Reset error state
        
        logInfo('Récupération des recettes utilisateur', {
          userEmail: user.email,
          userId: user.id,
          userDisplayName: user.user_metadata?.display_name,
          refreshKey,
          timestamp: new Date().toISOString()
        })

        // Force cache bypass with timestamp
        const timestamp = Date.now()
        const response = await fetch(`/api/recipes?_t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }

        const allRecipes = await response.json()
        
        // Logique de filtrage améliorée côté client
        const userIdentifiers = [
          user.email,
          user.user_metadata?.display_name,
          user.user_metadata?.full_name,
          'Anonyme'
        ].filter(Boolean)
        
        logInfo('Identifiants utilisateur pour filtrage', {
          identifiers: userIdentifiers,
          totalRecipes: allRecipes.length,
          fetchTimestamp: timestamp
        })
        
        const userRecipes = allRecipes.filter(recipe => {
          if (!recipe.author) return false
          
          return userIdentifiers.some(identifier => 
            recipe.author === identifier || 
            recipe.author.toLowerCase() === identifier.toLowerCase()
          )
        })
        
        // Trier les recettes par date de création (plus récente en premier)
        userRecipes.sort((a, b) => {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        })

        setRecipes(userRecipes)
        logInfo('Recettes utilisateur filtrées avec succès', {
          totalRecipes: allRecipes.length,
          userRecipesFound: userRecipes.length,
          identifiersUsed: userIdentifiers.length,
          hasPhotoShares: userRecipes.some(r => r.category === 'Photo partagée'),
          recipeAuthors: userRecipes.map(r => r.author)
        })

      } catch (err) {
        logError('Erreur lors de la récupération des recettes utilisateur', err, {
          userEmail: user?.email,
          errorMessage: err.message,
          errorStack: err.stack,
          refreshKey,
          timestamp: new Date().toISOString()
        })
        setError('Impossible de charger vos recettes. Erreur: ' + (err.message || 'Inconnue'))
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      fetchUserRecipes()
    }
  }, [user, authLoading, refreshKey, router.asPath]) // Added refreshKey and router.asPath

  // Function to manually refresh recipes
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    logUserInteraction('REFRESH_RECIPES', 'mes-recettes-page', {
      refreshKey: refreshKey + 1,
      userEmail: user?.email
    })
  }

  // Auto-refresh when coming back to the page (focus event)
  useEffect(() => {
    const handleFocus = () => {
      if (user && !authLoading && !loading) {
        logInfo('Page refocused, refreshing recipes')
        setRefreshKey(prev => prev + 1)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, authLoading, loading])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-light)',
          borderTop: '4px solid var(--primary-coral)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Gérez vos recettes publiées sur COCO" />
      </Head>

      {/* Header with refresh button */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: 'var(--spacing-md)'
        }}>👨‍🍳</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          <h1 style={{ 
            fontSize: '1.8rem', 
            margin: 0,
            color: 'var(--text-dark)'
          }}>
            Mes Recettes
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
              fontSize: '1.2rem'
            }}
            title="Actualiser les recettes"
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          margin: 0
        }}>
          Bonjour {user.user_metadata?.display_name || user.email} !
        </p>
        {!loading && (
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.8rem',
            margin: 'var(--spacing-xs) 0 0 0'
          }}>
            {recipes.length} recette{recipes.length > 1 ? 's' : ''} publiée{recipes.length > 1 ? 's' : ''}
            <span style={{ opacity: 0.7, marginLeft: 'var(--spacing-xs)' }}>
              • Dernière MAJ: {new Date().toLocaleTimeString()}
            </span>
          </p>
        )}
      </section>

      {/* Action Buttons */}
      <section style={{ padding: 'var(--spacing-lg) var(--spacing-md) 0' }}>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <button 
            onClick={() => router.push('/submit-recipe')}
            className="card" 
            style={{ 
              flex: 1,
              border: 'none', 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--primary-coral-dark) 100%)',
              color: 'white',
              padding: 'var(--spacing-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)',
              fontWeight: '600'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            Nouvelle recette
          </button>
          
          <button 
            onClick={() => router.push('/share-photo')}
            className="card" 
            style={{ 
              flex: 1,
              border: 'none', 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--secondary-mint) 0%, var(--secondary-mint-dark) 100%)',
              color: 'white',
              padding: 'var(--spacing-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)',
              fontWeight: '600'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>📷</span>
            Photo rapide
          </button>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-light)',
              borderTop: '4px solid var(--primary-coral)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto var(--spacing-md)'
            }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              Chargement de vos recettes...
            </p>
          </div>
        ) : error ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-xl)',
            color: 'var(--primary-coral)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>⚠️</div>
            <p>{error}</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
              <button 
                onClick={handleRefresh}
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  background: 'var(--primary-coral)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                🔄 Réessayer
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  background: 'var(--text-medium)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                🔄 Recharger la page
              </button>
            </div>
          </div>
        ) : recipes.length === 0 ? (
          /* Empty State */
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-xl)' 
          }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>📝</div>
            <h2 style={{ 
              fontSize: '1.3rem', 
              marginBottom: 'var(--spacing-md)',
              color: 'var(--text-medium)'
            }}>
              Aucune recette publiée
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: 'var(--spacing-lg)',
              lineHeight: '1.5'
            }}>
              Commencez à partager vos créations culinaires avec la communauté COCO !
            </p>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
              maxWidth: '300px',
              margin: '0 auto'
            }}>
              <button 
                className="card"
                onClick={() => router.push('/submit-recipe')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--primary-coral-dark) 100%)',
                  color: 'white',
                  padding: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-sm)',
                  fontWeight: '600'
                }}
              >
                <span>📝</span>
                Créer ma première recette
              </button>
              
              <button 
                className="card"
                onClick={() => router.push('/share-photo')}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--secondary-mint) 0%, var(--secondary-mint-dark) 100%)',
                  color: 'white',
                  padding: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-sm)',
                  fontWeight: '600'
                }}
              >
                <span>📷</span>
                Partager une photo rapide
              </button>
            </div>
          </div>
        ) : (
          /* Recipes Grid */
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
              padding: '0 var(--spacing-xs)'
            }}>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                margin: 0
              }}>
                {recipes.length} recette{recipes.length > 1 ? 's' : ''} trouvée{recipes.length > 1 ? 's' : ''}
              </p>
              <button
                onClick={handleRefresh}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)'
                }}
                disabled={loading}
              >
                {loading ? '⏳' : '🔄'} Actualiser
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: 'var(--spacing-md)' 
            }}>
              {recipes.map(recipe => (
                <RecipeCard 
                  key={`${recipe.id}-${refreshKey}`} // Force re-render with refreshKey
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
      `}</style>
    </div>
  )
}
