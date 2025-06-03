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

  // Fetch user's recipes
  useEffect(() => {
    const fetchUserRecipes = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        logInfo('Récupération des recettes utilisateur', {
          userEmail: user.email,
          userId: user.id,
          userDisplayName: user.user_metadata?.display_name
        })

        // Récupérer toutes les recettes (sans filtrage côté serveur)
        const response = await fetch('/api/recipes')
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }

        const allRecipes = await response.json()
        
        // Logique de filtrage améliorée côté client
        // Créer plusieurs identifiants possibles pour l'utilisateur
        const userIdentifiers = [
          user.email,
          user.user_metadata?.display_name,
          user.user_metadata?.full_name,
          'Anonyme' // Si l'utilisateur n'a pas renseigné de nom
        ].filter(Boolean) // Enlever les valeurs null/undefined
        
        logInfo('Identifiants utilisateur pour filtrage', {
          identifiers: userIdentifiers,
          totalRecipes: allRecipes.length
        })
        
        const userRecipes = allRecipes.filter(recipe => {
          // Si l'auteur n'est pas défini, on ne peut pas filtrer
          if (!recipe.author) return false
          
          // Vérifier si l'auteur correspond à un des identifiants de l'utilisateur
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
          recipeAuthors: userRecipes.map(r => r.author) // Pour debug
        })

      } catch (err) {
        logError('Erreur lors de la récupération des recettes utilisateur', err, {
          userEmail: user?.email,
          errorMessage: err.message,
          errorStack: err.stack
        })
        setError('Impossible de charger vos recettes. Erreur: ' + (err.message || 'Inconnue'))
      } finally {
        setLoading(false)
      }
    }

    if (user && !authLoading) {
      fetchUserRecipes()
    }
  }, [user, authLoading])

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

      {/* Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: 'var(--spacing-md)'
        }}>👨‍🍳</div>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-dark)'
        }}>
          Mes Recettes
        </h1>
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
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                background: 'var(--primary-coral)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            >
              Réessayer
            </button>
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: 'var(--spacing-md)' 
          }}>
            {recipes.map(recipe => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                isUserRecipe={true}
                isPhotoOnly={recipe.category === 'Photo partagée'}
              />
            ))}
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
