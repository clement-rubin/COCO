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
  const [participatingRecipes, setParticipatingRecipes] = useState(new Set())
  const [weekInfo, setWeekInfo] = useState(null)
  const [showParticipationModal, setShowParticipationModal] = useState(false)
  const [participationLoading, setParticipationLoading] = useState(false)

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

      // Utilisation directe de Supabase
      const { supabase } = await import('../lib/supabase')
      
      addDebugLog('INFO', 'Supabase client imported successfully', {
        userId: user.id?.substring(0, 8) + '...'
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
          errorMessage: supabaseError.message
        })
        throw new Error(`Erreur base de données: ${supabaseError.message}`)
      }

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
              userIdMatch: recipe?.user_id === user.id
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

      setRecipes(validatedRecipes)

      const endTime = performance.now()
      const totalDuration = endTime - startTime

      addDebugLog('SUCCESS', 'User recipes loaded successfully', {
        userId: user.id?.substring(0, 8) + '...',
        recipesCount: validatedRecipes.length,
        loadTime: `${totalDuration.toFixed(2)}ms`
      })

      logSuccess('User recipes loaded successfully', {
        userId: user.id?.substring(0, 8) + '...',
        recipesCount: validatedRecipes.length,
        loadTime: `${totalDuration.toFixed(2)}ms`,
        component: 'MesRecettes'
      })

    } catch (err) {
      const endTime = performance.now()
      const totalDuration = endTime - startTime

      addDebugLog('ERROR', 'Failed to load user recipes', {
        userId: user?.id?.substring(0, 8) + '...',
        errorMessage: err.message,
        loadTime: `${totalDuration.toFixed(2)}ms`
      })

      logError('Failed to load user recipes', err, {
        userId: user?.id?.substring(0, 8) + '...',
        component: 'MesRecettes',
        errorMessage: err.message
      })

      setError(`Impossible de charger vos recettes: ${err.message}`)
    } finally {
      setLoading(false)
    }
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
      recipes: recipes.length
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Head>
        <title>Mes Recettes - COCO</title>
        <meta name="description" content="Toutes mes recettes sur COCO" />
      </Head>

      {/* Particules de fond animées */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              background: `radial-gradient(circle, ${
                i % 3 === 0 ? '#10b98150' : 
                i % 3 === 1 ? '#f59e0b50' : '#8b5cf650'
              } 0%, transparent 70%)`,
              borderRadius: '50%',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `floatParticle ${10 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Hero section ultra-moderne */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(254, 243, 226, 0.95) 0%, rgba(255, 245, 230, 0.98) 50%, rgba(254, 247, 237, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        padding: '80px 0 60px 0',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '0',
        borderRadius: '0 0 40px 40px',
        zIndex: 1
      }}>
        {/* Effets de lumière en arrière-plan */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(16, 185, 129, 0.1) 90deg, transparent 180deg, rgba(245, 158, 11, 0.1) 270deg, transparent 360deg)',
          animation: 'slowRotate 60s linear infinite'
        }} />

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          {/* Logo COCO avec effets 3D */}
          <div style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(145deg, #10b981, #34d399, #059669)',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 32px',
            boxShadow: `
              0 20px 40px rgba(16, 185, 129, 0.3),
              0 10px 20px rgba(16, 185, 129, 0.2),
              inset 0 2px 0 rgba(255, 255, 255, 0.4),
              inset 0 -2px 0 rgba(0, 0, 0, 0.1)
            `,
            border: '4px solid rgba(255, 255, 255, 0.9)',
            animation: 'logoFloat3D 4s ease-in-out infinite',
            position: 'relative',
            overflow: 'hidden'
          }}>
            👨‍🍳
            {/* Effet de brillance qui traverse */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)',
              transform: 'rotate(45deg)',
              animation: 'shine3D 3s ease-in-out infinite'
            }} />
          </div>

          {/* Titre avec effet de dégradé animé */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '900',
            margin: '0 0 20px 0',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #34d399 50%, #10b981 75%, #059669 100%)',
            backgroundSize: '300% 300%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
            animation: 'gradientShift 6s ease-in-out infinite',
            textShadow: '0 4px 8px rgba(16, 185, 129, 0.2)',
            position: 'relative'
          }}>
            Mes Recettes COCO
            {/* Effet de lueur */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'blur(2px)',
              opacity: 0.3,
              zIndex: -1
            }} />
          </h1>

          {/* Sous-titre animé */}
          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            color: '#059669',
            margin: '0 0 40px 0',
            fontWeight: '600',
            animation: 'fadeInUp 1s ease-out 0.5s both',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{
              background: 'linear-gradient(90deg, #10b981, #f59e0b, #8b5cf6, #10b981)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'rainbowText 4s ease-in-out infinite'
            }}>
              Votre collection personnelle de délices culinaires
            </span>
          </p>

          {/* Statistiques avec design card moderne */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '24px',
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            {[
              {
                number: recipes.length, 
                label: 'Recettes', 
                icon: '🍽️', 
                color: '#10b981',
                gradient: 'linear-gradient(145deg, #10b981, #34d399)'
              },
              { 
                number: getFilteredRecipes().filter(r => r.form_mode === 'quick').length, 
                label: 'Express', 
                icon: '⚡', 
                color: '#f59e0b',
                gradient: 'linear-gradient(145deg, #f59e0b, #fbbf24)'
              },
              { 
                number: getFilteredRecipes().filter(r => r.form_mode === 'complete').length, 
                label: 'Complètes', 
                icon: '🍳', 
                color: '#8b5cf6',
                gradient: 'linear-gradient(145deg, #8b5cf6, #a78bfa)'
              }
            ].map((stat, index) => (
              <div 
                key={index} 
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  padding: '28px 20px',
                  borderRadius: '24px',
                  border: `2px solid ${stat.color}30`,
                  animation: `cardFloat 0.8s ease-out ${index * 0.2}s both`,
                  boxShadow: `
                    0 8px 32px rgba(0, 0, 0, 0.1),
                    0 4px 16px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8)
                  `,
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-12px) scale(1.05)'
                  e.target.style.boxShadow = `
                    0 20px 60px rgba(0, 0, 0, 0.15),
                    0 8px 30px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9)
                  `
                  e.target.style.borderColor = `${stat.color}60`
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = `
                    0 8px 32px rgba(0, 0, 0, 0.1),
                    0 4px 16px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8)
                  `
                  e.target.style.borderColor = `${stat.color}30`
                }}
              >
                {/* Effet de particules dans la carte */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '8px',
                  height: '8px',
                  background: stat.gradient,
                  borderRadius: '50%',
                  animation: `pulse3D 2s ease-in-out infinite ${index * 0.5}s`
                }} />
                
                <div style={{ 
                  fontSize: '2.5rem', 
                  marginBottom: '12px',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                  animation: `iconBounce 2s ease-in-out infinite ${index * 0.3}s`
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '900',
                  background: stat.gradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                  lineHeight: '1'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  color: '#64748b',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {stat.label}
                </div>
                
                {/* Effet de brillance au survol */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                  transition: 'left 0.6s ease'
                }} className="shine-effect" />
              </div>
            ))}
          </div>

          {/* Actions rapides avec design moderne */}
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'fadeInUp 1s ease-out 1s both'
          }}>
            <button
              onClick={() => router.push('/submit-recipe')}
              style={{
                background: 'linear-gradient(145deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '18px 36px',
                borderRadius: '20px',
                fontWeight: '800',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `
                  0 12px 32px rgba(16, 185, 129, 0.4),
                  0 6px 16px rgba(16, 185, 129, 0.2),
                  inset 0 2px 0 rgba(255, 255, 255, 0.3)
                `,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-6px) scale(1.05)'
                e.target.style.boxShadow = `
                  0 20px 50px rgba(16, 185, 129, 0.5),
                  0 10px 25px rgba(16, 185, 129, 0.3),
                  inset 0 2px 0 rgba(255, 255, 255, 0.4)
                `
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)'
                e.target.style.boxShadow = `
                  0 12px 32px rgba(16, 185, 129, 0.4),
                  0 6px 16px rgba(16, 185, 129, 0.2),
                  inset 0 2px 0 rgba(255, 255, 255, 0.3)
                `
              }}
            >
              <span style={{ 
                fontSize: '1.4rem',
                animation: 'sparkle 2s ease-in-out infinite'
              }}>✨</span>
              Nouvelle Recette
              
              {/* Effet d'onde au clic */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0',
                height: '0',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.6s ease'
              }} className="ripple-effect" />
            </button>
            
            <button 
              onClick={() => router.back()}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#6b7280',
                border: '2px solid rgba(107, 114, 128, 0.2)',
                padding: '18px 36px',
                borderRadius: '20px',
                fontWeight: '800',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: `
                  0 8px 24px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.8)
                `
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(243, 244, 246, 0.95)'
                e.target.style.transform = 'translateY(-6px)'
                e.target.style.borderColor = 'rgba(107, 114, 128, 0.4)'
                e.target.style.color = '#374151'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                e.target.style.transform = 'translateY(0)'
                e.target.style.borderColor = 'rgba(107, 114, 128, 0.2)'
                e.target.style.color = '#6b7280'
              }}
            >
              <span style={{ 
                fontSize: '1.4rem',
                transition: 'transform 0.3s ease'
              }}>←</span>
              Retour
            </button>
          </div>
        </div>
      </section>

      {/* Section Logs avec design amélioré */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '30px auto', 
        padding: '0 24px',
        position: 'relative',
        zIndex: 2
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
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.borderColor = '#10b981'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              <button onClick={loadUserRecipes} className={styles.refreshBtn}>
                🔄 Actualiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section principale avec transition fluide améliorée */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: '32px 32px 0 0',
        boxShadow: `
          0 -20px 60px rgba(0,0,0,0.15),
          0 -8px 30px rgba(0,0,0,0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.9)
        `,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 2,
        minHeight: '70vh',
        border: '1px solid rgba(255, 255, 255, 0.5)'
      }}>
        {/* Filtres redessinés avec effets glassmorphism */}
        <nav style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(25px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '32px 32px 24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
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
                  padding: '16px 28px',
                  borderRadius: '20px',
                  fontWeight: '800',
                  fontSize: '1rem',
                  color: filter === filterOption.key ? 'white' : '#374151',
                  background: filter === filterOption.key 
                    ? `linear-gradient(145deg, ${filterOption.color}, ${filterOption.color}cc)` 
                    : 'rgba(255, 255, 255, 0.8)',
                  border: filter === filterOption.key 
                    ? `2px solid ${filterOption.color}` 
                    : '2px solid rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: '160px',
                  justifyContent: 'center',
                  boxShadow: filter === filterOption.key 
                    ? `0 8px 32px ${filterOption.color}40, 0 4px 16px ${filterOption.color}20` 
                    : '0 4px 16px rgba(0, 0, 0, 0.05)',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = `${filterOption.color}60`
                    e.target.style.transform = 'translateY(-4px) scale(1.02)'
                    e.target.style.boxShadow = `0 12px 40px ${filterOption.color}30`
                    e.target.style.background = `linear-gradient(145deg, ${filterOption.color}20, rgba(255, 255, 255, 0.9))`
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.05)'
                    e.target.style.transform = 'translateY(0) scale(1)'
                    e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.05)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.8)'
                  }
                }}
              >
                {/* Effet de particules dans le bouton actif */}
                {filter === filterOption.key && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '6px',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '50%',
                    animation: 'pulse3D 1.5s ease-in-out infinite'
                  }} />
                )}
                
                <span style={{ 
                  fontSize: '1.3rem',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>
                  {filterOption.icon}
                </span>
                <span>{filterOption.label}</span>
                <span style={{
                  background: filter === filterOption.key 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : filterOption.color,
                  color: filter === filterOption.key ? 'white' : 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '900',
                  marginLeft: '8px',
                  boxShadow: filter === filterOption.key 
                    ? 'inset 0 2px 4px rgba(0,0,0,0.1)' 
                    : `0 2px 8px ${filterOption.color}40`
                }}>
                  {filterOption.count}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Contenu principal amélioré */}
        <main style={{ padding: '40px 32px 60px' }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'conic-gradient(from 0deg, #10b981, #f59e0b, #8b5cf6, #10b981)',
                borderRadius: '50%',
                animation: 'modernSpin 2s linear infinite',
                marginBottom: '32px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '64px',
                  height: '64px',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  👨‍🍳
                </div>
              </div>
              <h3 style={{
                color: '#1f2937',
                fontSize: '1.5rem',
                fontWeight: '800',
                margin: '0 0 12px 0',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Chargement de vos recettes...
              </h3>
              <p style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '1.1rem'
              }}>
                Préparation de vos délicieuses créations
              </p>
            </div>
          ) : error ? (
            // Enhanced error state
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #ef4444',
              borderRadius: '24px',
              padding: '40px',
              textAlign: 'center',
              color: '#dc2626',
              maxWidth: '500px',
              margin: '40px auto'
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
            // Enhanced empty state
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '32px',
              border: '2px solid #0ea5e9',
              maxWidth: '600px',
              margin: '40px auto',
              position: 'relative',
              overflow: 'hidden'
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
              {/* Enhanced results header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                padding: '0 8px'
              }}>
                <div>
                  <h2 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '1.8rem',
                    fontWeight: '800'
                  }}>
                    {filter === 'all' ? 'Toutes vos recettes' :
                     filter === 'quick' ? 'Recettes express' : 'Recettes complètes'}
                  </h2>
                  <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '1rem'
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
                    padding: '14px 24px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>+</span>
                  Nouvelle
                </button>
              </div>

              {/* Grille de recettes avec design amélioré */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '32px',
                marginBottom: '60px'
              }}>
                {getFilteredRecipes().map((recipe, index) => (
                  <div
                    key={recipe.id}
                    style={{
                      position: 'relative',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '28px',
                      boxShadow: `
                        0 12px 40px rgba(0, 0, 0, 0.12),
                        0 6px 20px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `,
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      overflow: 'hidden',
                      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: `cardSlideIn 0.8s ease-out ${index * 0.1}s both`,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-16px) rotateX(5deg) rotateY(2deg)'
                      e.currentTarget.style.boxShadow = `
                        0 25px 60px rgba(0, 0, 0, 0.2),
                        0 12px 30px rgba(0, 0, 0, 0.1),
                        0 6px 15px rgba(16, 185, 129, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 1)
                      `
                      // Effet de brillance
                      const shine = e.currentTarget.querySelector('.card-shine')
                      if (shine) shine.style.left = '100%'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)'
                      e.currentTarget.style.boxShadow = `
                        0 12px 40px rgba(0, 0, 0, 0.12),
                        0 6px 20px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `
                      // Reset brillance
                      const shine = e.currentTarget.querySelector('.card-shine')
                      if (shine) shine.style.left = '-100%'
                    }}
                  >
                    {/* Effet de brillance qui traverse */}
                    <div 
                      className="card-shine"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        transition: 'left 0.8s ease',
                        zIndex: 1,
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Badge de type de recette amélioré */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: recipe.form_mode === 'quick' 
                        ? 'linear-gradient(145deg, #f59e0b, #d97706)'
                        : 'linear-gradient(145deg, #10b981, #059669)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      zIndex: 3,
                      boxShadow: `
                        0 6px 20px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3)
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{
                        animation: recipe.form_mode === 'quick' ? 'sparkle 1.5s ease-in-out infinite' : 'none'
                      }}>
                        {recipe.form_mode === 'quick' ? '⚡' : '🍳'}
                      </span>
                      {recipe.form_mode === 'quick' ? 'Express' : 'Complète'}
                    </div>

                    {/* Contenu de la RecipeCard avec améliorations */}
                    <RecipeCard 
                      recipe={recipe} 
                      isPhotoOnly={recipe.category === 'Photo partagée'}
                      onEdit={() => handleEditRecipe(recipe.id)}
                      onDelete={() => handleDeleteRecipe(recipe.id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Styles avec animations avancées */}
      <style jsx>{`
        @keyframes floatParticle {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.6;
          }
          25% { 
            transform: translateY(-20px) translateX(10px) scale(1.1);
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-10px) translateX(-5px) scale(0.9);
            opacity: 1;
          }
          75% { 
            transform: translateY(-30px) translateX(15px) scale(1.05);
            opacity: 0.7;
          }
        }

        @keyframes slowRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes logoFloat3D {
          0%, 100% { 
            transform: translateY(0px) rotateX(0deg) rotateY(0deg) scale(1);
          }
          25% { 
            transform: translateY(-8px) rotateX(5deg) rotateY(2deg) scale(1.02);
          }
          50% { 
            transform: translateY(-4px) rotateX(-2deg) rotateY(-1deg) scale(1.05);
          }
          75% { 
            transform: translateY(-12px) rotateX(3deg) rotateY(-3deg) scale(1.03);
          }
        }

        @keyframes shine3D {
          0% { 
            transform: translateX(-200%) translateY(-200%) rotate(45deg);
            opacity: 0;
          }
          50% { 
            transform: translateX(0%) translateY(0%) rotate(45deg);
            opacity: 1;
          }
          100% { 
            transform: translateX(200%) translateY(200%) rotate(45deg);
            opacity: 0;
          }
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes rainbowText {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes cardFloat {
          0% { 
            opacity: 0; 
            transform: translateY(50px) scale(0.9) rotateX(10deg);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0px) scale(1) rotateX(0deg);
          }
        }

        @keyframes pulse3D {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% { 
            transform: scale(1.3);
            opacity: 1;
            box-shadow: 0 0 20px 10px transparent;
          }
        }

        @keyframes iconBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-5px) scale(1.1); }
        }

        @keyframes sparkle {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          25% { 
            transform: scale(1.2) rotate(90deg);
            filter: brightness(1.3);
          }
          50% { 
            transform: scale(0.9) rotate(180deg);
            filter: brightness(1.1);
          }
          75% { 
            transform: scale(1.1) rotate(270deg);
            filter: brightness(1.2);
          }
        }

        @keyframes modernSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes cardSlideIn {
          0% { 
            opacity: 0; 
            transform: translateY(40px) scale(0.95) rotateX(10deg);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1) rotateX(0deg);
          }
        }

        @keyframes fadeInUp {
          0% { 
            opacity: 0; 
            transform: translateY(30px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        /* Effet de brillance au survol des cartes de stats */
        div:hover .shine-effect {
          left: 100% !important;
        }

        /* Responsive amélioré */
        @media (max-width: 768px) {
          section {
            padding: 60px 16px 40px !important;
          }
          
          h1 {
            font-size: 2.5rem !important;
          }
          
          .statsGrid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            max-width: 400px !important;
          }
          
          .actionsContainer {
            flex-direction: column !important;
            width: 100% !important;
            max-width: 300px !important;
            margin: 0 auto !important;
          }
          
          .filtersContainer {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 24px 16px !important;
          }
          
          .recipesGrid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
            padding: 24px 16px !important;
          }
        }

        @media (max-width: 480px) {
          h1 {
            font-size: 2rem !important;
          }
          
          .logoContainer {
            width: 80px !important;
            height: 80px !important;
            fontSize: 2.5rem !important;
          }
          
          .statCard {
            padding: 20px 16px !important;
          }
          
          .actionButton {
            padding: 14px 24px !important;
            fontSize: 0.95rem !important;
          }
        }

        /* Améliorations pour les animations sur mobile */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

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
                  background: filter === filterOption.key 
                    ? `linear-gradient(145deg, ${filterOption.color}, ${filterOption.color}cc)` 
                    : 'rgba(255, 255, 255, 0.8)',
                  border: filter === filterOption.key 
                    ? `2px solid ${filterOption.color}` 
                    : '2px solid rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '130px',
                  justifyContent: 'center',
                  boxShadow: filter === filterOption.key 
                    ? `0 4px 15px ${filterOption.color}20` 
                    : '0 2px 8px rgba(0, 0, 0, 0.05)',
                  backdropFilter: 'blur(10px)',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = `${filterOption.color}60`
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = `0 4px 15px ${filterOption.color}15`
                    e.target.style.background = `linear-gradient(145deg, ${filterOption.color}20, rgba(255, 255, 255, 0.9))`
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== filterOption.key) {
                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.05)'
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)'
                    e.target.style.background = 'rgba(255, 255, 255, 0.8)'
                  }
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{filterOption.icon}</span>
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
                width: '80px',
                height: '80px',
                background: 'conic-gradient(from 0deg, #10b981, #f59e0b, #8b5cf6, #10b981)',
                borderRadius: '50%',
                animation: 'modernSpin 2s linear infinite',
                marginBottom: '32px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '64px',
                  height: '64px',
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  👨‍🍳
                </div>
              </div>
              <h3 style={{
                color: '#1f2937',
                fontSize: '1.5rem',
                fontWeight: '800',
                margin: '0 0 12px 0',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Chargement de vos recettes...
              </h3>
              <p style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '1.1rem'
              }}>
                Préparation de vos délicieuses créations
              </p>
            </div>
          ) : error ? (
            // Enhanced error state
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #ef4444',
              borderRadius: '24px',
              padding: '40px',
              textAlign: 'center',
              color: '#dc2626',
              maxWidth: '500px',
              margin: '40px auto'
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
            // Enhanced empty state
            <div style={{
              textAlign: 'center',

              padding: '80px 40px',
              background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
              borderRadius: '32px',
              border: '2px solid #0ea5e9',
              maxWidth: '600px',
              margin: '40px auto',
              position: 'relative',
              overflow: 'hidden'
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
              {/* Enhanced results header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                padding: '0 8px'
              }}>
                <div>
                  <h2 style={{
                    margin: '0 0 8px 0',
                    color: '#1f2937',
                    fontSize: '1.8rem',
                    fontWeight: '800'
                  }}>
                    {filter === 'all' ? 'Toutes vos recettes' :
                     filter === 'quick' ? 'Recettes express' : 'Recettes complètes'}
                  </h2>
                  <p style={{
                    margin: 0,
                    color: '#6b7280',
                    fontSize: '1rem'
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
                    padding: '14px 24px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>+</span>
                  Nouvelle
                </button>
              </div>

              {/* Grille de recettes avec design amélioré */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '32px',
                marginBottom: '60px'
              }}>
                {getFilteredRecipes().map((recipe, index) => (
                  <div
                    key={recipe.id}
                    style={{
                      position: 'relative',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '28px',
                      boxShadow: `
                        0 12px 40px rgba(0, 0, 0, 0.12),
                        0 6px 20px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `,
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      overflow: 'hidden',
                      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      animation: `cardSlideIn 0.8s ease-out ${index * 0.1}s both`,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-16px) rotateX(5deg) rotateY(2deg)'
                      e.currentTarget.style.boxShadow = `
                        0 25px 60px rgba(0, 0, 0, 0.2),
                        0 12px 30px rgba(0, 0, 0, 0.1),
                        0 6px 15px rgba(16, 185, 129, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 1)
                      `
                      // Effet de brillance
                      const shine = e.currentTarget.querySelector('.card-shine')
                      if (shine) shine.style.left = '100%'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) rotateX(0deg) rotateY(0deg)'
                      e.currentTarget.style.boxShadow = `
                        0 12px 40px rgba(0, 0, 0, 0.12),
                        0 6px 20px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `
                      // Reset brillance
                      const shine = e.currentTarget.querySelector('.card-shine')
                      if (shine) shine.style.left = '-100%'
                    }}
                  >
                    {/* Effet de brillance qui traverse */}
                    <div 
                      className="card-shine"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        transition: 'left 0.8s ease',
                        zIndex: 1,
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Badge de type de recette amélioré */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: recipe.form_mode === 'quick' 
                        ? 'linear-gradient(145deg, #f59e0b, #d97706)'
                        : 'linear-gradient(145deg, #10b981, #059669)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: '800',
                      zIndex: 3,
                      boxShadow: `
                        0 6px 20px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3)
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{
                        animation: recipe.form_mode === 'quick' ? 'sparkle 1.5s ease-in-out infinite' : 'none'
                      }}>
                        {recipe.form_mode === 'quick' ? '⚡' : '🍳'}
                      </span>
                      {recipe.form_mode === 'quick' ? 'Express' : 'Complète'}
                    </div>

                    {/* Contenu de la RecipeCard avec améliorations */}
                    <RecipeCard 
                      recipe={recipe} 
                      isPhotoOnly={recipe.category === 'Photo partagée'}
                      onEdit={() => handleEditRecipe(recipe.id)}
                      onDelete={() => handleDeleteRecipe(recipe.id)}
                    />
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

        /* Responsive */
        @media (max-width: 768px) {
          .container {
            padding: 10px !important;
          }
          
          h1 {
            font-size: 2.5rem !important;
          }
          
          .recipesGrid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
            }
          `}</style>
        </div>
      )
    }
  
