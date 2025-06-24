import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logInfo, logError } from '../utils/logger'
import { processImageData } from '../utils/imageUtils'
import { showRecipeParticipationNotification } from '../utils/notificationUtils'

export default function RecipeWeekParticipation({ onParticipationChange }) {
  const { user } = useAuth()
  const [eligibleRecipes, setEligibleRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [participating, setParticipating] = useState(false)
  const [weekInfo, setWeekInfo] = useState(null)
  const [showModal, setShowModal] = useState(false)

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
      setEligibleRecipes(data.eligibleRecipes || [])
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
      const recipe = eligibleRecipes.find(r => r.id === recipeId)
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
      const recipe = eligibleRecipes.find(r => r.id === recipeId)
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

  const candidateRecipes = eligibleRecipes.filter(r => r.isCandidate)
  const availableRecipes = eligibleRecipes.filter(r => r.canParticipate)
  const canAddMore = weekInfo && weekInfo.currentCandidates < weekInfo.maxCandidates

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
          🏆 Participer au concours
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
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 20px 0',
              borderBottom: '1px solid #f3f4f6',
              marginBottom: '16px'
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
                Inscrivez vos recettes créées cette semaine ({weekInfo?.currentCandidates || 0}/{weekInfo?.maxCandidates || 3})
              </p>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
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
                        ✅ Vos recettes inscrites
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
                              Inscrite au concours
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
                        🍽️ Vos recettes disponibles
                      </h4>
                      {availableRecipes.map(recipe => (
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
                              {recipe.category} • Cette semaine
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
                      ))}
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
                        🎯 Limite atteinte ({weekInfo?.maxCandidates} recettes max)
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
                        Aucune recette éligible
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '0.85rem'
                      }}>
                        Créez une recette cette semaine pour participer !
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
