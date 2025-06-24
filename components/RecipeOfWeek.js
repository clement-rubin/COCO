import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { useAuth } from './AuthContext'
import { logInfo, logError } from '../utils/logger'
import { processImageData } from '../utils/imageUtils'

export default function RecipeOfWeek() {
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
      const url = user ? 
        `/api/recipe-of-week?user_id=${user.id}` : 
        '/api/recipe-of-week'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }
      
      const data = await response.json()
      setCandidates(data.candidates || [])
      setWeekInfo({
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        totalVotes: data.totalVotes
      })
      
      // Vérifier si l'utilisateur a déjà voté
      if (user) {
        const userHasVoted = data.candidates?.some(c => c.hasUserVoted)
        setHasVoted(userHasVoted)
      }

      logInfo('Recipe of week candidates loaded', {
        candidatesCount: data.candidates?.length || 0,
        totalVotes: data.totalVotes || 0,
        userHasVoted: hasVoted
      })

    } catch (error) {
      logError('Error loading recipe of week candidates', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (recipeId) => {
    if (!user || hasVoted || voting) return

    try {
      setVoting(true)
      
      const response = await fetch('/api/recipe-of-week', {
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
        throw new Error(data.message || 'Erreur lors du vote')
      }

      // Recharger les données après le vote
      await loadCandidates()
      setHasVoted(true)

      // Effet visuel de succès
      const successMessage = document.createElement('div')
      successMessage.textContent = '🎉 Vote enregistré avec succès !'
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      `
      document.body.appendChild(successMessage)
      setTimeout(() => successMessage.remove(), 3000)

    } catch (error) {
      logError('Error voting for recipe of week', error)
      alert(error.message || 'Erreur lors du vote')
    } finally {
      setVoting(false)
    }
  }

  if (loading || candidates.length === 0) {
    return null // Ne pas afficher si pas de candidats
  }

  const topCandidate = candidates[0]
  const otherCandidates = candidates.slice(1, 3)

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      borderRadius: '20px',
      padding: '20px',
      margin: '20px',
      border: '2px solid #f59e0b',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Badge "Recette de la semaine" */}
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

      <div style={{ marginTop: '12px' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '1.1rem',
          fontWeight: '700',
          color: '#92400e'
        }}>
          Votez pour votre recette préférée !
        </h3>
        
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '0.85rem',
          color: '#b45309',
          lineHeight: '1.4'
        }}>
          {weekInfo?.totalVotes || 0} vote{(weekInfo?.totalVotes || 0) !== 1 ? 's' : ''} cette semaine
          {hasVoted && ' • ✅ Vous avez voté'}
        </p>

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
            
            {user && !hasVoted && !voting && (
              <button
                onClick={() => handleVote(topCandidate.id)}
                disabled={topCandidate.user_id === user.id}
                style={{
                  background: topCandidate.user_id === user.id ? 
                    '#9ca3af' : 
                    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: topCandidate.user_id === user.id ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '60px'
                }}
                title={topCandidate.user_id === user.id ? 
                  'Vous ne pouvez pas voter pour votre propre recette' : 
                  'Voter pour cette recette'
                }
              >
                {topCandidate.user_id === user.id ? '👤' : '🗳️ Voter'}
              </button>
            )}
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
                
                {user && !hasVoted && !voting && (
                  <button
                    onClick={() => handleVote(candidate.id)}
                    disabled={candidate.user_id === user.id}
                    style={{
                      background: candidate.user_id === user.id ? 
                        '#e5e7eb' : 
                        '#3b82f6',
                      color: candidate.user_id === user.id ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      cursor: candidate.user_id === user.id ? 'not-allowed' : 'pointer',
                      width: '100%'
                    }}
                    title={candidate.user_id === user.id ? 
                      'Votre recette' : 
                      'Voter pour cette recette'
                    }
                  >
                    {candidate.user_id === user.id ? '👤 Votre recette' : '🗳️ Voter'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!user && (
          <div style={{
            textAlign: 'center',
            marginTop: '12px'
          }}>
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
              Se connecter pour voter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
