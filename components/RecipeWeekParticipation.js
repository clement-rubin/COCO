import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logInfo, logError } from '../utils/logger'
import { processImageData } from '../utils/imageUtils'
import { showRecipeParticipationNotification } from '../utils/notificationUtils'

export default function RecipeWeekParticipation({ onParticipationChange }) {
  const { user } = useAuth()
  const [allRecipes, setAllRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [participating, setParticipating] = useState(false)
  const [weekInfo, setWeekInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (user) {
      loadEligibleRecipes()
    }
  }, [user])

  const loadEligibleRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/recipe-of-week-participation?user_id=${user.id}`)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }
      
      const data = await response.json()
      setAllRecipes(data.allRecipes || [])
      setWeekInfo({
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        maxCandidates: data.maxCandidates,
        currentCandidates: data.currentCandidates
      })

    } catch (error) {
      logError('Error loading eligible recipes', error)
    } finally {
      setLoading(false)
    }
  }

  const handleParticipate = async (recipeId) => {
    if (!user || participating) return

    try {
      setParticipating(true)
      
      const response = await fetch('/api/recipe-of-week-participation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe_id: recipeId,
          user_id: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'inscription')
      }

      // Notification de succès
      const recipe = allRecipes.find(r => r.id === recipeId)
      showRecipeParticipationNotification(recipe, 'inscrite')

      // Recharger les données
      await loadEligibleRecipes()
      
      // Notifier le parent
      if (onParticipationChange) {
        onParticipationChange()
      }

      // Fermer le modal après succès
      setTimeout(() => setShowModal(false), 1500)

    } catch (error) {
      logError('Error participating in contest', error)
      
      // Notification d'erreur
      const errorMessage = document.createElement('div')
      errorMessage.textContent = '❌ ' + (error.message || 'Erreur lors de l\'inscription')
      errorMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ef4444;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 600;
      `
      document.body.appendChild(errorMessage)
      setTimeout(() => errorMessage.remove(), 4000)
    } finally {
      setParticipating(false)
    }
  }

  const handleWithdraw = async (recipeId) => {
    if (!user || participating) return

    try {
      setParticipating(true)
      
      const response = await fetch(`/api/recipe-of-week-participation?recipe_id=${recipeId}&user_id=${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erreur lors du retrait')
      }

      // Notification de succès
      const recipe = allRecipes.find(r => r.id === recipeId)
      showRecipeParticipationNotification(recipe, 'retirée')

      // Recharger les données
      await loadEligibleRecipes()
      
      // Notifier le parent
      if (onParticipationChange) {
        onParticipationChange()
      }

    } catch (error) {
      logError('Error withdrawing from contest', error)
    } finally {
      setParticipating(false)
    }
  }

  if (!user) return null

  const candidateRecipes = allRecipes.filter(r => r.isCandidate)
  const availableRecipes = allRecipes.filter(r => r.canParticipate)
  const canAddMore = weekInfo && weekInfo.currentCandidates < weekInfo.maxCandidates

  // Filtrer les recettes disponibles selon la recherche et catégorie
  const filteredAvailableRecipes = availableRecipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchFilter.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Obtenir les catégories uniques
  const categories = [...new Set(availableRecipes.map(r => r.category).filter(Boolean))]

  return (
    <>
      {/* Bouton pour ouvrir le modal */}
      <div style={{
        textAlign: 'center',
        margin: '16px 0'
      }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
          }}
        >
          🏆 Gérer mes participations
          {candidateRecipes.length > 0 && (
            <span style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '0.7rem'
            }}>
              {candidateRecipes.length}
            </span>
          )}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 20px 0',
              borderBottom: '1px solid #f3f4f6',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  🏆 Concours de la semaine
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{
                margin: '8px 0 16px 0',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                Gérez vos participations ({weekInfo?.currentCandidates || 0}/{weekInfo?.maxCandidates || 5})
              </p>
            </div>

            <div style={{ 
              padding: '20px', 
              overflow: 'auto',
              flex: 1
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ margin: '12px 0 0 0', color: '#6b7280' }}>
                    Chargement...
                  </p>
                </div>
              ) : (
                <>
                  {/* Recettes déjà candidates */}
                  {candidateRecipes.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        ✅ Vos recettes inscrites cette semaine
                      </h4>
                      {candidateRecipes.map(recipe => (
                        <div
                          key={recipe.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '8px'
                          }}
                        >
                          <div style={{
                            position: 'relative',
                            width: '50px',
                            height: '50px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <Image
                              src={processImageData(recipe.image, '/placeholder-recipe.jpg')}
                              alt={recipe.title}
                              fill
                              className="object-cover"
                              unoptimized={recipe.image?.startsWith('data:')}
                            />
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h5 style={{
                              margin: '0 0 4px 0',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: '#065f46'
                            }}>
                              {recipe.title}
                            </h5>
                            <p style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              color: '#059669'
                            }}>
                              {recipe.isThisWeek ? '🆕 Créée cette semaine' : '📚 Recette archivée'} • Inscrite au concours
                            </p>
                          </div>
                          
                          <button
                            onClick={() => handleWithdraw(recipe.id)}
                            disabled={participating}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              cursor: participating ? 'not-allowed' : 'pointer',
                              opacity: participating ? 0.6 : 1
                            }}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recettes disponibles */}
                  {canAddMore && availableRecipes.length > 0 && (
                    <div>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        🍽️ Vos recettes disponibles ({availableRecipes.length})
                      </h4>

                      {/* Filtres de recherche */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <input
                          type="text"
                          placeholder="Rechercher une recette..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          style={{
                            flex: 1,
                            minWidth: '150px',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.85rem'
                          }}
                        />
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            background: 'white'
                          }}
                        >
                          <option value="all">Toutes catégories</option>
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Liste des recettes filtrées */}
                      <div style={{
                        maxHeight: '300px',
                        overflow: 'auto',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '8px'
                      }}>
                        {filteredAvailableRecipes.length > 0 ? (
                          filteredAvailableRecipes.map(recipe => (
                            <div
                              key={recipe.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '12px',
                                marginBottom: '8px'
                              }}
                            >
                              <div style={{
                                position: 'relative',
                                width: '50px',
                                height: '50px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                <Image
                                  src={processImageData(recipe.image, '/placeholder-recipe.jpg')}
                                  alt={recipe.title}
                                  fill
                                  className="object-cover"
                                  unoptimized={recipe.image?.startsWith('data:')}
                                />
                              </div>
                              
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h5 style={{
                                  margin: '0 0 4px 0',
                                  fontSize: '0.9rem',
                                  fontWeight: '600',
                                  color: '#374151'
                                }}>
                                  {recipe.title}
                                </h5>
                                <p style={{
                                  margin: 0,
                                  fontSize: '0.75rem',
                                  color: '#6b7280'
                                }}>
                                  {recipe.category} • {recipe.isThisWeek ? '🆕 Cette semaine' : `📅 ${new Date(recipe.created_at).toLocaleDateString('fr-FR')}`}
                                </p>
                              </div>
                              
                              <button
                                onClick={() => handleParticipate(recipe.id)}
                                disabled={participating}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '6px 12px',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  cursor: participating ? 'not-allowed' : 'pointer',
                                  opacity: participating ? 0.6 : 1
                                }}
                              >
                                {participating ? '⏳' : '🏆 Inscrire'}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            color: '#6b7280'
                          }}>
                            {searchFilter || categoryFilter !== 'all' ? 
                              'Aucune recette trouvée avec ces filtres' : 
                              'Aucune recette disponible'
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Messages d'état */}
                  {!canAddMore && availableRecipes.length > 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      background: '#fef3c7',
                      borderRadius: '12px',
                      border: '1px solid #f59e0b'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: '#92400e',
                        fontWeight: '600'
                      }}>
                        🎯 Limite atteinte ({weekInfo?.maxCandidates} recettes max par semaine)
                      </p>
                    </div>
                  )}

                  {availableRecipes.length === 0 && candidateRecipes.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🍽️</div>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontWeight: '600'
                      }}>
                        Aucune recette trouvée
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '0.85rem'
                      }}>
                        Créez une recette pour participer !
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
