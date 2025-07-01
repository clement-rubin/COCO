import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logInfo, logError } from '../utils/logger'
import { processImageData } from '../utils/imageUtils'
import RecipeWeekParticipation from './RecipeWeekParticipation'

export default function RecipeOfWeek({ isInCompetitionPage = false }) {
  const { user } = useAuth()
  const router = useRouter()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)
  const [weekInfo, setWeekInfo] = useState(null)

  useEffect(() => {
    loadCandidates()
  }, [user])

  const loadCandidates = async () => {
    try {
      setLoading(true)
      
      // Build URL with optional user_id parameter
      let url = '/api/weekly-recipe-contest'
      if (user?.id) {
        url += `?user_id=${user.id}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      setCandidates(data.candidates || [])
      setWeekInfo({
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        totalVotes: data.totalVotes,
        contest: data.contest
      })
      
      // Vérifier si l'utilisateur a déjà voté (only if logged in)
      setHasVoted(user?.id ? (data.hasUserVoted || false) : false)

      logInfo('Recipe of week candidates loaded', {
        candidatesCount: data.candidates?.length || 0,
        totalVotes: data.totalVotes || 0,
        userHasVoted: data.hasUserVoted || false,
        isAuthenticated: !!user?.id
      })

    } catch (error) {
      logError('Error loading recipe of week candidates', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (candidateId) => {
    if (!user || hasVoted || voting) return

    try {
      setVoting(true)
      
      const response = await fetch('/api/weekly-recipe-contest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'vote',
          candidate_id: candidateId,
          voter_id: user.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du vote')
      }

      // Recharger les données après le vote
      await loadCandidates()

      // Effet visuel de succès
      const successMessage = document.createElement('div')
      successMessage.textContent = '🎉 Vote enregistré avec succès !'
      successMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        animation: successPulse 0.5s ease-out;
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

    } catch (error) {
      logError('Error voting for recipe of week', error)
      
      // Afficher l'erreur de manière plus visible
      const errorMessage = document.createElement('div')
      errorMessage.textContent = '❌ ' + (error.message || 'Erreur lors du vote')
      errorMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
      `
      document.body.appendChild(errorMessage)
      setTimeout(() => errorMessage.remove(), 4000)
    } finally {
      setVoting(false)
    }
  }

  // Ne pas afficher si pas de candidats ou en cours de chargement
  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
        borderRadius: '20px',
        padding: '20px',
        margin: '20px',
        border: '2px solid #f59e0b',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          width: '20px',
          height: '20px',
          border: '2px solid #f59e0b',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ margin: '12px 0 0 0', color: '#92400e', fontSize: '0.9rem' }}>
          Chargement des candidats...
        </p>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
        borderRadius: '20px',
        padding: '20px',
        margin: '20px',
        border: '2px solid #d1d5db',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🍽️</div>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: '#374151'
        }}>
          Aucun candidat cette semaine
        </h3>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          color: '#6b7280'
        }}>
          Soyez le premier à partager une recette !
        </p>
      </div>
    )
  }

  const topCandidate = candidates[0]
  const otherCandidates = candidates.slice(1, 3)

  // Styles conditionnels selon le contexte
  const containerStyle = isInCompetitionPage ? {
    background: 'transparent',
    borderRadius: '16px',
    padding: '0',
    margin: '0',
    border: 'none',
    position: 'relative',
    overflow: 'hidden'
  } : {
    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    borderRadius: '20px',
    padding: '20px',
    margin: '20px',
    border: '2px solid #f59e0b',
    position: 'relative',
    overflow: 'hidden'
  }

  return (
    <div style={containerStyle}>
      {/* Badge "Recette de la semaine" - seulement si pas dans la page compétition */}
      {!isInCompetitionPage && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          right: '20px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '0 0 12px 12px',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.05em'
        }}>
          🏆 RECETTE DE LA SEMAINE
        </div>
      )}

      <div style={{ marginTop: isInCompetitionPage ? '0' : '12px' }}>
        {/* Titre conditionnel */}
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: isInCompetitionPage ? '1.3rem' : '1.1rem',
          fontWeight: '700',
          color: isInCompetitionPage ? '#1e293b' : '#92400e'
        }}>
          {isInCompetitionPage ? 'Candidats de cette semaine' : 'Votez pour votre recette préférée !'}
        </h3>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.85rem',
            color: '#b45309',
            lineHeight: '1.4'
          }}>
            {weekInfo?.totalVotes || 0} vote{(weekInfo?.totalVotes || 0) !== 1 ? 's' : ''} cette semaine
          </p>
          {hasVoted && (
            <div style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✅ Vous avez voté
            </div>
          )}
          {user && !hasVoted && (
            <div style={{
              background: '#3b82f6',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              animation: 'pulse 2s infinite'
            }}>
              🗳️ Vous pouvez voter
            </div>
          )}
        </div>

        {/* Candidat principal */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '12px',
          border: topCandidate.votes > 0 ? '2px solid #10b981' : '1px solid #e5e7eb',
          position: 'relative'
        }}>
          {topCandidate.votes > 0 && (
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#10b981',
              color: 'white',
              borderRadius: '20px',
              padding: '4px 8px',
              fontSize: '0.7rem',
              fontWeight: '600'
            }}>
              🥇 {topCandidate.votes} vote{topCandidate.votes !== 1 ? 's' : ''}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <div style={{
              position: 'relative',
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <Image
                src={processImageData(topCandidate.image, '/placeholder-recipe.jpg')}
                alt={topCandidate.title}
                fill
                className="object-cover"
                unoptimized={topCandidate.image?.startsWith('data:')}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {topCandidate.title}
              </h4>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                Par {topCandidate.author}
              </p>
            </div>
            
            {/* Bouton de vote toujours visible pour le candidat principal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {user && !hasVoted && (
                <button
                  onClick={() => handleVote(topCandidate.id)}
                  disabled={topCandidate.user_id === user.id || voting}
                  style={{
                    background: topCandidate.user_id === user.id ? 
                      '#9ca3af' : 
                      voting ? '#6b7280' :
                      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: topCandidate.user_id === user.id || voting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '70px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={topCandidate.user_id === user.id ? 
                    'Vous ne pouvez pas voter pour votre propre recette' : 
                    'Voter pour cette recette'
                  }
                >
                  {voting ? (
                    <>🔄 Vote...</>
                  ) : topCandidate.user_id === user.id ? (
                    <>👤 Vôtre</>
                  ) : (
                    <>🗳️ Voter</>
                  )}
                </button>
              )}
              
              {user && hasVoted && topCandidate.hasUserVoted && (
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  minWidth: '70px',
                  textAlign: 'center'
                }}>
                  ✅ Voté
                </div>
              )}
              
              {!user && (
                <button
                  onClick={() => router.push('/login')}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minWidth: '70px'
                  }}
                >
                  🔐 Voter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Autres candidats */}
        {otherCandidates.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {otherCandidates.map((candidate, index) => (
              <div
                key={candidate.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: '12px',
                  padding: '12px',
                  flex: '1',
                  minWidth: '140px',
                  border: '1px solid #e5e7eb',
                  position: 'relative'
                }}
              >
                {candidate.votes > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: index === 0 ? '#f59e0b' : '#6b7280',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '2px 6px',
                    fontSize: '0.6rem',
                    fontWeight: '600'
                  }}>
                    {index === 0 ? '🥈' : '🥉'} {candidate.votes}
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    position: 'relative',
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    <Image
                      src={processImageData(candidate.image, '/placeholder-recipe.jpg')}
                      alt={candidate.title}
                      fill
                      className="object-cover"
                      unoptimized={candidate.image?.startsWith('data:')}
                    />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{
                      margin: '0 0 2px 0',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#374151',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {candidate.title}
                    </h5>
                    <p style={{
                      margin: 0,
                      fontSize: '0.7rem',
                      color: '#6b7280'
                    }}>
                      {candidate.author}
                    </p>
                  </div>
                </div>
                
                {/* Boutons de vote pour les autres candidats */}
                {user && !hasVoted && (
                  <button
                    onClick={() => handleVote(candidate.id)}
                    disabled={candidate.user_id === user.id || voting}
                    style={{
                      background: candidate.user_id === user.id ? 
                        '#e5e7eb' : 
                        voting ? '#9ca3af' :
                        '#3b82f6',
                      color: candidate.user_id === user.id || voting ? '#6b7280' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      cursor: candidate.user_id === user.id || voting ? 'not-allowed' : 'pointer',
                      width: '100%'
                    }}
                    title={candidate.user_id === user.id ? 
                      'Votre recette' : 
                      'Voter pour cette recette'
                    }
                  >
                    {voting ? '🔄 Vote...' : 
                     candidate.user_id === user.id ? '👤 Vôtre' : 
                     '🗳️ Voter'}
                  </button>
                )}
                
                {user && hasVoted && candidate.hasUserVoted && (
                  <div style={{
                    background: '#10b981',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    ✅ Voté
                  </div>
                )}
                
                {!user && (
                  <button
                    onClick={() => router.push('/login')}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    🔐 Se connecter
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message d'encouragement */}
        {!user && (
          <div style={{
            textAlign: 'center',
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <p style={{
              margin: '0 0 8px 0',
              fontSize: '0.85rem',
              color: '#1d4ed8',
              fontWeight: '600'
            }}>
              Connectez-vous pour voter !
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Se connecter
            </button>
          </div>
        )}
      </div>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
        
        @keyframes successPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
