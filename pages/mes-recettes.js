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
    try {
      setLoading(true)
      setError(null)

      logInfo('Loading user recipes', {
        userId: user.id,
        userIdLength: user.id?.length,
        component: 'MesRecettes'
      })

      // Récupérer TOUTES les recettes de l'utilisateur (sans limite)
      const response = await fetch(`/api/recipes?user_id=${encodeURIComponent(user.id)}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        logError('Failed to fetch user recipes', new Error(`HTTP ${response.status}`), {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText,
          userId: user.id
        })
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      
      const recipesData = await response.json()
      
      logInfo('Raw recipes data received', {
        dataType: typeof recipesData,
        isArray: Array.isArray(recipesData),
        length: recipesData?.length || 0,
        hasError: !!recipesData?.error,
        userId: user.id
      })
      
      // Vérifier si c'est une réponse d'erreur
      if (recipesData?.error) {
        throw new Error(recipesData.message || recipesData.error)
      }
      
      // S'assurer que nous avons un tableau
      const recipes = Array.isArray(recipesData) ? recipesData : []
      
      // Trier par date de création (plus récentes en premier)
      const sortedRecipes = recipes.sort((a, b) => {
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateB - dateA
      })
      
      setRecipes(sortedRecipes)
      
      logInfo('User recipes loaded and sorted', {
        userId: user.id,
        totalRecipes: sortedRecipes.length,
        recipesBreakdown: {
          total: sortedRecipes.length,
          quick: sortedRecipes.filter(r => r.form_mode === 'quick' || r.category === 'Photo partagée').length,
          complete: sortedRecipes.filter(r => r.form_mode === 'complete' || (r.form_mode !== 'quick' && r.category !== 'Photo partagée')).length,
          withImages: sortedRecipes.filter(r => r.image).length,
          categories: sortedRecipes.reduce((acc, r) => {
            const cat = r.category || 'Uncategorized'
            acc[cat] = (acc[cat] || 0) + 1
            return acc
          }, {})
        },
        latestRecipes: sortedRecipes.slice(0, 3).map(r => ({
          id: r.id,
          title: r.title,
          created_at: r.created_at,
          category: r.category
        }))
      })
      
    } catch (err) {
      logError('Failed to load user recipes', err, {
        userId: user?.id,
        component: 'MesRecettes',
        errorMessage: err.message,
        errorStack: err.stack
      })
      setError(`Impossible de charger vos recettes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Nouvelle fonction pour charger le statut de participation
  const loadParticipationStatus = async () => {
    try {
      const response = await fetch(`/api/recipe-of-week-participation?user_id=${user.id}`)
      if (!response.ok) return

      const data = await response.json()
      
      // Identifier les recettes déjà participantes
      const participatingIds = data.allRecipes
        ?.filter(r => r.isCandidate)
        ?.map(r => r.id) || []
      
      setParticipatingRecipes(new Set(participatingIds))
      setWeekInfo({
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        maxCandidates: data.maxCandidates || 5,
        currentCandidates: data.currentCandidates || 0
      })
    } catch (error) {
      logError('Failed to load participation status', error)
    }
  }

  // Nouvelle fonction pour gérer la participation
  const handleParticipationToggle = async (recipeId, shouldParticipate) => {
    if (participationLoading) return

    try {
      setParticipationLoading(true)

      if (shouldParticipate) {
        // Vérifier la limite
        if (weekInfo && participatingRecipes.size >= weekInfo.maxCandidates) {
          alert(`Vous ne pouvez pas inscrire plus de ${weekInfo.maxCandidates} recettes par semaine.`)
          return
        }

        // Inscrire la recette
        const response = await fetch('/api/recipe-of-week-participation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user.id
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Erreur lors de l\'inscription')
        }

        // Mettre à jour l'état local
        setParticipatingRecipes(prev => new Set([...prev, recipeId]))
        showSuccessNotification('✅ Recette inscrite au concours !')

      } else {
        // Retirer la recette
        const response = await fetch(`/api/recipe-of-week-participation?recipe_id=${recipeId}&user_id=${user.id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Erreur lors du retrait')
        }

        // Mettre à jour l'état local
        setParticipatingRecipes(prev => {
          const newSet = new Set(prev)
          newSet.delete(recipeId)
          return newSet
        })
        showSuccessNotification('✅ Recette retirée du concours')
      }

      // Recharger le statut
      await loadParticipationStatus()

    } catch (error) {
      logError('Error toggling participation', error)
      alert('Erreur: ' + error.message)
    } finally {
      setParticipationLoading(false)
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
          ← Retour
        </button>
        <h1>Mes Recettes ({recipes.length})</h1>
        <div className={styles.headerActions}>
          <button onClick={() => router.push('/submit-recipe')} className={styles.addButton}>
            + Nouvelle
          </button>
          {/* Nouveau bouton pour gérer la participation */}
          <button 
            onClick={() => setShowParticipationModal(true)} 
            className={styles.contestButton}
            disabled={recipes.length === 0}
          >
            🏆 Concours ({participatingRecipes.size})
          </button>
        </div>
      </div>

      {/* Indicateur de participation */}
      {weekInfo && participatingRecipes.size > 0 && (
        <div className={styles.participationBanner}>
          <span className={styles.participationIcon}>🏆</span>
          <span>
            {participatingRecipes.size} de vos recettes participent au concours cette semaine
          </span>
          <button 
            onClick={() => setShowParticipationModal(true)} 
            className={styles.manageBanner}
          >
            Gérer
          </button>
        </div>
      )}

      <div className={styles.filters}>
        <button 
          className={filter === 'all' ? styles.activeFilter : styles.filter}
          onClick={() => setFilter('all')}
        >
          Toutes ({recipes.length})
        </button>
        <button 
          className={filter === 'quick' ? styles.activeFilter : styles.filter}
          onClick={() => setFilter('quick')}
        >
          📸 Express ({recipes.filter(r => r.form_mode === 'quick').length})
        </button>
        <button 
          className={filter === 'complete' ? styles.activeFilter : styles.filter}
          onClick={() => setFilter('complete')}
        >
          🍳 Complètes ({recipes.filter(r => r.form_mode === 'complete').length})
        </button>
      </div>

      <div className={styles.content}>
        {recipes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <h3>Aucune recette pour le moment</h3>
            <p>Commencez par partager votre première création culinaire !</p>
            <button 
              onClick={() => router.push('/submit-recipe')} 
              className={styles.createButton}
            >
              Créer ma première recette
            </button>
          </div>
        ) : (
          <div className={styles.recipesGrid}>
            {getFilteredRecipes().map((recipe) => (
              <div key={recipe.id} className={styles.recipeCardWrapper}>
                {/* Badge de participation */}
                {participatingRecipes.has(recipe.id) && (
                  <div className={styles.participationBadge}>
                    🏆 En concours
                  </div>
                )}
                <RecipeCard 
                  recipe={recipe} 
                  isPhotoOnly={recipe.category === 'Photo partagée'}
                  onEdit={() => handleEditRecipe(recipe.id)}
                  onDelete={() => handleDeleteRecipe(recipe.id)}
                />
                {/* Bouton rapide de participation */}
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
                >
                  {participatingRecipes.has(recipe.id) ? '✖️ Retirer' : '🏆 Inscrire'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de gestion de la participation */}
      {showParticipationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowParticipationModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>🏆 Concours Recette de la Semaine</h3>
              <button 
                onClick={() => setShowParticipationModal(false)}
                className={styles.closeModal}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.contestInfo}>
                <p>
                  <strong>Participantes:</strong> {participatingRecipes.size}/{weekInfo?.maxCandidates || 5}
                </p>
                <p className={styles.weekInfo}>
                  Semaine du {weekInfo && new Date(weekInfo.weekStart).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className={styles.recipesList}>
                {recipes.map(recipe => (
                  <div key={recipe.id} className={styles.recipeItem}>
                    <div className={styles.recipeInfo}>
                      <img 
                        src={recipe.image || '/placeholder-recipe.jpg'} 
                        alt={recipe.title}
                        className={styles.recipeThumb}
                      />
                      <div>
                        <h4>{recipe.title}</h4>
                        <p className={styles.recipeCategory}>
                          {recipe.category} • {new Date(recipe.created_at).toLocaleDateString('fr-FR')}
                        </p>
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
                      {participatingRecipes.has(recipe.id) ? '✖️ Retirer' : '🏆 Inscrire'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles existants + nouveaux styles */}
      <style jsx>{`
        /* Styles existants... */
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

        .${styles.headerActions} {
          display: flex;
          gap: 10px;
        }

        .${styles.backButton}, .${styles.addButton}, .${styles.contestButton} {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .${styles.contestButton} {
          background: #f59e0b;
        }

        .${styles.contestButton}:hover {
          background: #d97706;
        }

        .${styles.contestButton}:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* Nouveau style pour le banner de participation */
        .${styles.participationBanner} {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 15px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .${styles.participationIcon} {
          font-size: 1.2rem;
        }

        .${styles.manageBanner} {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          margin-left: auto;
        }

        /* Styles pour les cartes de recettes avec participation */
        .${styles.recipeCardWrapper} {
          position: relative;
        }

        .${styles.participationBadge} {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #f59e0b;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .${styles.addParticipationBtn}, .${styles.removeParticipationBtn} {
          position: absolute;
          bottom: 10px;
          right: 10px;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          z-index: 2;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .${styles.addParticipationBtn} {
          background: #f59e0b;
          color: white;
        }

        .${styles.removeParticipationBtn} {
          background: #ef4444;
          color: white;
        }

        /* Styles pour le modal */
        .${styles.modalOverlay} {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .${styles.modal} {
          background: white;
          border-radius: 15px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .${styles.modalHeader} {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .${styles.closeModal} {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }

        .${styles.modalContent} {
          padding: 20px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .${styles.contestInfo} {
          background: #fef3c7;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          border: 1px solid #f59e0b;
        }

        .${styles.weekInfo} {
          margin: 5px 0 0 0;
          font-size: 0.9rem;
          color: #92400e;
        }

        .${styles.recipesList} {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .${styles.recipeItem} {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
        }

        .${styles.recipeInfo} {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .${styles.recipeThumb} {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
        }

        .${styles.recipeCategory} {
          margin: 4px 0 0 0;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .${styles.addBtn}, .${styles.removeBtn} {
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .${styles.addBtn} {
          background: #f59e0b;
          color: white;
        }

        .${styles.removeBtn} {
          background: #ef4444;
          color: white;
        }

        .${styles.addBtn}:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* Styles responsive */
        @media (max-width: 768px) {
          .${styles.header} {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .${styles.headerActions} {
            flex-direction: column;
            width: 100%;
          }

          .${styles.participationBanner} {
            flex-direction: column;
            text-align: center;
            gap: 8px;
          }

          .${styles.modal} {
            margin: 10px;
            max-height: 90vh;
          }

          .${styles.recipeItem} {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }

        /* Autres styles existants... */
        .${styles.filters} {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 10px;
          flex-wrap: wrap;
        }

        .${styles.filter}, .${styles.activeFilter} {
          background: white;
          color: #333;
          border: 2px solid #667eea;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
          flex: 1;
          min-width: 120px;
        }

        .${styles.activeFilter} {
          background: #667eea;
          color: white;
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
      `}</style>
    </div>
  )
}
