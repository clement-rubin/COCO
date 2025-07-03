import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { logInfo as baseLogInfo, logError as baseLogError } from '../utils/logger'
import RecipeOfWeek from '../components/RecipeOfWeek'
import styles from '../styles/Competitions.module.css'
import { createSafeImageUrl } from '../utils/imageUtils'

export default function Competitions() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [competitions, setCompetitions] = useState([])
  const [activeTab, setActiveTab] = useState('week') // Changed default to 'week'
  const [loading, setLoading] = useState(true)
  const [selectedCompetition, setSelectedCompetition] = useState(null)
  const [userRecipes, setUserRecipes] = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pageLogs, setPageLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Helpers pour logger dans l'état local + logger global
  const logInfo = (message, data = {}) => {
    setPageLogs(logs => [
      {
        id: Date.now() + Math.random(),
        type: 'info',
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString()
      },
      ...logs.slice(0, 99)
    ]);
    baseLogInfo(message, data);
  };
  const logError = (message, data = {}) => {
    setPageLogs(logs => [
      {
        id: Date.now() + Math.random(),
        type: 'error',
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString()
      },
      ...logs.slice(0, 99)
    ]);
    baseLogError(message, data);
  };

  useEffect(() => {
    logInfo('Competitions page mounted', { user: user?.id });
    if (!user) {
      logInfo('User not authenticated, redirecting to login');
      router.push('/login?redirect=' + encodeURIComponent('/competitions'))
      return
    }
    logInfo('Active tab changed', { activeTab });
    if (activeTab !== 'week') {
      loadCompetitions()
    }
    loadUserRecipes()
  }, [user, router, activeTab])

  const loadCompetitions = async () => {
    try {
      setLoading(true)
      logInfo('Loading competitions from supabase');
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          competition_entries (
            id,
            user_id,
            recipe_id,
            votes_count,
            recipes (
              id,
              title,
              image,
              author
            ),
            profiles (
              display_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Log détaillé des images chargées
      if (data) {
        data.forEach(competition => {
          competition.competition_entries?.forEach(entry => {
            const recipe = entry.recipes || entry.recipe || {};
            logInfo('Competition entry image data', {
              competitionId: competition.id,
              entryId: entry.id,
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              imageData: recipe.image,
              imageType: typeof recipe.image,
              imageLength: recipe.image?.length,
              imageSample: typeof recipe.image === 'string' ? recipe.image.substring(0, 100) : null
            });
          });
        });
      }

      setCompetitions(data || [])
      logInfo('Competitions loaded', { count: data?.length || 0 })
    } catch (error) {
      logError('Error loading competitions', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserRecipes = async () => {
    if (!user) return
    logInfo('Loading user recipes', { userId: user.id });
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setUserRecipes(data || [])
      logInfo('User recipes loaded', { count: data?.length || 0, recipes: data });
    } catch (error) {
      logError('Error loading user recipes', error)
    }
  }

  const submitToCompetition = async (competitionId, recipeId) => {
    if (!user) return

    setSubmitting(true)
    logInfo('Submitting recipe to competition', { competitionId, recipeId, userId: user.id });
    try {
      const { error } = await supabase
        .from('competition_entries')
        .insert({
          competition_id: competitionId,
          user_id: user.id,
          recipe_id: recipeId
        })

      if (error) throw error

      setShowSubmitModal(false)
      await loadCompetitions()
      logInfo('Recipe submitted successfully', { competitionId, recipeId, userId: user.id });
      // Show success message
      alert('Recette soumise avec succès !')
      
    } catch (error) {
      logError('Error submitting to competition', error)
      alert('Erreur lors de la soumission: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const voteForEntry = async (competitionId, entryId) => {
    if (!user) {
      alert('Vous devez être connecté pour voter')
      return
    }

    logInfo('Voting for entry', { competitionId, entryId, userId: user.id });
    
    // Ajouter une protection contre les votes multiples rapides
    if (submitting) {
      logInfo('Vote already in progress, ignoring duplicate request');
      return
    }
    
    setSubmitting(true)
    
    try {
      // Vérifier d'abord si l'utilisateur a déjà voté pour cette compétition
      const { data: existingVotes, error: checkError } = await supabase
        .from('competition_votes')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('voter_id', user.id)
        .limit(1)

      if (checkError) {
        logError('Error checking existing votes', checkError)
        throw new Error('Impossible de vérifier les votes existants')
      }

      if (existingVotes && existingVotes.length > 0) {
        logInfo('User already voted for this competition', { competitionId, entryId, userId: user.id });
        alert('Vous avez déjà voté pour cette compétition')
        return
      }

      // Procéder au vote
      const { error: voteError } = await supabase
        .from('competition_votes')
        .insert({
          competition_id: competitionId,
          entry_id: entryId,
          voter_id: user.id
        })

      if (voteError) {
        logError('Error inserting vote', voteError)
        
        if (voteError.code === '23505') {
          logInfo('Duplicate vote attempt detected', { competitionId, entryId, userId: user.id });
          alert('Vous avez déjà voté pour cette compétition')
          return
        }
        
        throw new Error(voteError.message || 'Erreur lors de l\'enregistrement du vote')
      }

      // Mettre à jour le compteur de votes
      const { error: updateError } = await supabase
        .from('competition_entries')
        .update({ 
          votes_count: supabase.sql`votes_count + 1`
        })
        .eq('id', entryId)

      if (updateError) {
        logError('Error updating vote count', updateError)
        // Le vote a été enregistré mais le compteur n'a pas pu être mis à jour
        // On continue quand même car le vote est valide
      }

      logInfo('Vote registered successfully', { competitionId, entryId, userId: user.id });
      
      // Recharger les données pour refléter les changements
      await loadCompetitions()
      
      // Afficher un message de succès
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
      logError('Error voting', error)
      
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Erreur lors du vote: '
      
      if (error.message.includes('not authenticated')) {
        errorMessage += 'Vous devez être connecté pour voter.'
      } else if (error.message.includes('row-level security')) {
        errorMessage += 'Vous n\'avez pas l\'autorisation de voter.'
      } else if (error.message.includes('foreign key')) {
        errorMessage += 'La compétition ou l\'entrée n\'existe plus.'
      } else {
        errorMessage += error.message || 'Veuillez réessayer dans quelques instants.'
      }
      
      alert(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (competition) => {
    const now = new Date()
    const startDate = new Date(competition.start_date)
    const endDate = new Date(competition.end_date)

    if (now < startDate) {
      return <span className={styles.statusBadge + ' ' + styles.upcoming}>Bientôt</span>
    } else if (now > endDate) {
      return <span className={styles.statusBadge + ' ' + styles.completed}>Terminé</span>
    } else {
      return <span className={styles.statusBadge + ' ' + styles.active}>En cours</span>
    }
  }

  const filteredCompetitions = competitions.filter(comp => {
    const now = new Date()
    const startDate = new Date(comp.start_date)
    const endDate = new Date(comp.end_date)

    switch (activeTab) {
      case 'active':
        return now >= startDate && now <= endDate
      case 'upcoming':
        return now < startDate
      case 'completed':
        return now > endDate
      default:
        return true
    }
  })

  if (loading && activeTab !== 'week') {
    logInfo('Loading competitions, showing spinner');
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement des compétitions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Compétitions - COCO</title>
        <meta name="description" content="Participez aux compétitions culinaires et montrez vos talents" />
      </Head>

      {/* Onglet Logs en haut à droite */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
        <button
          onClick={() => setShowLogs(true)}
          style={{
            background: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(30,41,59,0.15)',
            cursor: 'pointer'
          }}
        >
          🪵 Logs ({pageLogs.length})
        </button>
      </div>

      {/* Modal/panneau logs */}
      {showLogs && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '420px',
            maxWidth: '100vw',
            height: '100vh',
            background: 'white',
            boxShadow: '-4px 0 24px rgba(30,41,59,0.15)',
            padding: 0,
            overflowY: 'auto',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>🪵 Logs de la page</span>
              <button onClick={() => setShowLogs(false)} style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#1e293b'
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {pageLogs.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Aucun log pour cette page.</div>
              ) : (
                pageLogs.map(log => (
                  <div key={log.id} style={{
                    background: log.type === 'error' ? '#fee2e2' : '#f3f4f6',
                    border: `1px solid ${log.type === 'error' ? '#f87171' : '#e5e7eb'}`,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: '0.97rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: log.type === 'error' ? '#dc2626' : '#0369a1' }}>
                        {log.type === 'error' ? 'Erreur' : 'Info'}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ fontWeight: 500 }}>{log.message}</div>
                    {log.data && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.92rem' }}>Détails</summary>
                        <pre style={{
                          background: '#f9fafb',
                          borderRadius: 8,
                          padding: 8,
                          fontSize: '0.92rem',
                          color: '#374151',
                          whiteSpace: 'pre-wrap'
                        }}>{log.data}</pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
              <button
                onClick={() => setPageLogs([])}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Vider les logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1>🏆 Compétitions</h1>
          <p>Participez aux défis culinaires et gagnez des prix !</p>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {[
            { id: 'week', label: 'Recette de la semaine', icon: '🏆' },
            { id: 'active', label: 'En cours', icon: '🔥' },
            { id: 'upcoming', label: 'Bientôt', icon: '⏰' },
            { id: 'completed', label: 'Terminées', icon: '🏅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe of the Week Tab */}
      {activeTab === 'week' && (
        <div className={styles.weekContainer}>
          <div className={styles.weekHeader}>
            <h2>🏆 Recette de la Semaine</h2>
            <p>Votez pour votre recette préférée de cette semaine !</p>
          </div>
          <RecipeOfWeek />
          
          <div className={styles.weekInfo}>
            <div className={styles.infoCard}>
              <h3>📊 Comment ça marche ?</h3>
              <ul>
                <li>Chaque semaine, les 5 recettes les plus récentes sont candidates</li>
                <li>Vous pouvez voter une fois par semaine</li>
                <li>Vous ne pouvez pas voter pour votre propre recette</li>
                <li>La recette avec le plus de votes remporte la semaine !</li>
              </ul>
            </div>
            
            <div className={styles.infoCard}>
              <h3>🎁 Récompenses</h3>
              <ul>
                <li>🥇 Badge "Recette de la semaine"</li>
                <li>⭐ Points de réputation bonus</li>
                <li>📈 Mise en avant sur la page d'accueil</li>
                <li>🎉 Notification à toute la communauté</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Competitions List */}
      {activeTab !== 'week' && (
        <div className={styles.competitionsGrid}>
          {filteredCompetitions.map(competition => (
            <div key={competition.id} className={styles.competitionCard}>
              <div className={styles.cardHeader}>
                <div className={styles.competitionInfo}>
                  <h3>{competition.title}</h3>
                  <p className={styles.description}>{competition.description}</p>
                  <div className={styles.competitionMeta}>
                    <span className={styles.category}>{competition.category}</span>
                    {getStatusBadge(competition)}
                  </div>
                </div>
                {competition.prize_description && (
                  <div className={styles.prize}>
                    <span className={styles.prizeIcon}>🎁</span>
                    <span>{competition.prize_description}</span>
                  </div>
                )}
              </div>

              <div className={styles.competitionStats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{competition.competition_entries?.length || 0}</span>
                  <span className={styles.statLabel}>Participants</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>
                    {competition.competition_entries?.reduce((sum, entry) => sum + (entry.votes_count || 0), 0) || 0}
                  </span>
                  <span className={styles.statLabel}>Votes</span>
                </div>
              </div>

              {/* Entries */}
              <div className={styles.entries}>
                <h4>Participations</h4>
                {competition.competition_entries?.length > 0 ? (
                  <div className={styles.entriesGrid}>
                    {competition.competition_entries.slice(0, 6).map((entry, entryIndex) => {
                      // Correction : utiliser entry.recipes ou entry.recipe selon la structure
                      const recipe = entry.recipes || entry.recipe || {};
                      // Utiliser la nouvelle fonction createSafeImageUrl
                      const recipeImage = createSafeImageUrl(recipe.image, '/placeholder-recipe.jpg');

                      // LOG DÉTAILLÉ : état de l'image à chaque étape
                      logInfo('Affichage image participation', {
                        entryId: entry.id,
                        recipeId: recipe.id,
                        recipeTitle: recipe.title,
                        recipeImageRaw: recipe.image,
                        recipeImageRawType: typeof recipe.image,
                        recipeImageRawSample: typeof recipe.image === 'string' ? recipe.image.substring(0, 100) : null,
                        recipeImageProcessed: recipeImage,
                        isProcessedDataUrl: recipeImage?.startsWith?.('data:image/'),
                        isProcessedHttp: recipeImage?.startsWith?.('http'),
                        isProcessedRelative: recipeImage?.startsWith?.('/'),
                        isFallback: recipeImage === '/placeholder-recipe.jpg'
                      });

                      return (
                        <div key={entry.id} className={styles.entryCard}>
                          {/* Badge de position */}
                          {entry.votes_count > 0 && (
                            <div className={`${styles.positionBadge} ${
                              entryIndex === 0 ? styles.first : 
                              entryIndex === 1 ? styles.second : ''
                            }`}>
                              {entryIndex === 0 ? '🥇' : entryIndex === 1 ? '🥈' : '🥉'} 
                              {entry.votes_count}
                            </div>
                          )}
                          
                          <div className={styles.entryImageContainer}>
                            <div className={styles.entryImage}>
                              <img 
                                src={recipeImage} 
                                alt={recipe.title || 'Recette'}
                                onLoad={() => {
                                  logInfo('Image loaded successfully', {
                                    entryId: entry.id,
                                    recipeId: recipe.id,
                                    imageUrl: recipeImage
                                  });
                                }}
                                onError={(e) => {
                                  logError('Erreur chargement image participation', {
                                    entryId: entry.id,
                                    recipeId: recipe.id,
                                    recipeTitle: recipe.title,
                                    originalImageData: recipe.image,
                                    processedImageUrl: recipeImage,
                                    errorTarget: e.target.src,
                                    naturalWidth: e.target.naturalWidth,
                                    naturalHeight: e.target.naturalHeight,
                                    complete: e.target.complete
                                  });
                                  e.target.src = '/placeholder-recipe.jpg';
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className={styles.entryContent}>
                            <h5 className={styles.entryTitle}>
                              {recipe.title || 'Sans titre'}
                            </h5>
                            <p className={styles.entryAuthor}>
                              👤 {entry.profiles?.display_name || recipe.author || 'Auteur inconnu'}
                            </p>
                            
                            <div className={styles.entryMeta}>
                              <div className={styles.voteCount}>
                                👍 {entry.votes_count || 0} vote{(entry.votes_count || 0) !== 1 ? 's' : ''}
                              </div>
                              
                              <button
                                onClick={() => {
                                  logInfo('Vote button clicked', { competitionId: competition.id, entryId: entry.id, userId: user?.id });
                                  voteForEntry(competition.id, entry.id)
                                }}
                                className={`${styles.voteButton} ${
                                  entry.user_id === user?.id ? styles.ownRecipe : ''
                                } ${submitting ? styles.voting : ''}`}
                                disabled={entry.user_id === user?.id || submitting}
                                title={entry.user_id === user?.id ? 
                                  'Vous ne pouvez pas voter pour votre propre recette' : 
                                  submitting ? 'Vote en cours...' :
                                  'Voter pour cette recette'
                                }
                              >
                                {entry.user_id === user?.id ? (
                                  <>👤 Votre recette</>
                                ) : submitting ? (
                                  <>⏳ Vote...</>
                                ) : (
                                  <>🗳️ Voter</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className={styles.noEntries}>Aucune participation pour le moment</p>
                )}
              </div>

              {/* Actions */}
              <div className={styles.cardActions}>
                {activeTab === 'active' && (
                  <button
                    onClick={() => {
                      logInfo('Open submit modal', { competitionId: competition.id, userId: user?.id });
                      setSelectedCompetition(competition)
                      setShowSubmitModal(true)
                    }}
                    className={styles.submitButton}
                    disabled={competition.competition_entries?.some(entry => entry.user_id === user?.id)}
                  >
                    {competition.competition_entries?.some(entry => entry.user_id === user?.id) 
                      ? '✅ Déjà participé' 
                      : '🚀 Participer'
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab !== 'week' && filteredCompetitions.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🏆</span>
          <h3>Aucune compétition {activeTab === 'active' ? 'en cours' : activeTab === 'upcoming' ? 'à venir' : 'terminée'}</h3>
          <p>Revenez plus tard pour découvrir de nouveaux défis !</p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedCompetition && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Participer à "{selectedCompetition.title}"</h3>
              <button 
                onClick={() => {
                  logInfo('Close submit modal');
                  setShowSubmitModal(false)
                }}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p>Choisissez une recette à soumettre :</p>
<div className={styles.recipesGrid}>
  {userRecipes.map(recipe => {
    const recipeImage = createSafeImageUrl(recipe.image, '/placeholder-recipe.jpg');
    // LOG pour debug image dans la modale
    logInfo('Affichage image recette utilisateur dans modale', {
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeImageRaw: recipe.image,
      recipeImageRawType: typeof recipe.image,
      recipeImageRawSample: typeof recipe.image === 'string' ? recipe.image.substring(0, 100) : null,
      recipeImageProcessed: recipeImage,
      isProcessedDataUrl: recipeImage?.startsWith?.('data:image/'),
      isProcessedHttp: recipeImage?.startsWith?.('http'),
      isProcessedRelative: recipeImage?.startsWith?.('/'),
      isFallback: recipeImage === '/placeholder-recipe.jpg'
    });
    return (
      <div key={recipe.id} className={styles.recipeOption}>
        <img 
          src={recipeImage} 
          alt={recipe.title}
          onLoad={() => {
            logInfo('Modal recipe image loaded successfully', {
              recipeId: recipe.id,
              imageUrl: recipeImage
            });
          }}
          onError={(e) => {
            logError('Erreur chargement image recette utilisateur (modale)', {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              originalImageData: recipe.image,
              processedImageUrl: recipeImage,
              errorTarget: e.target.src
            });
            e.target.src = '/placeholder-recipe.jpg';
          }}
        />
        <div className={styles.recipeInfo}>
          <h4>{recipe.title}</h4>
          <button
            onClick={() => {
              logInfo('Submit recipe from modal', { competitionId: selectedCompetition.id, recipeId: recipe.id, userId: user?.id });
              submitToCompetition(selectedCompetition.id, recipe.id)
            }}
            className={styles.selectButton}
            disabled={submitting}
          >
            {submitting ? 'Soumission...' : 'Choisir cette recette'}
          </button>
        </div>
      </div>
    )
  })}
              </div>
              
              {userRecipes.length === 0 && (
                <div className={styles.noRecipes}>
                  <p>Vous n'avez pas encore de recettes.</p>
                  <button 
                    onClick={() => {
                      logInfo('Redirect to create recipe');
                      router.push('/submit-recipe')
                    }}
                    className={styles.createRecipeButton}
                  >
                    Créer une recette
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Competitions() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirection automatique vers la page explorer
    router.replace('/explorer')
  }, [router])
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '20px',
      padding: '20px'
    }}>
      <div style={{ fontSize: '3rem' }}>🔍</div>
      <h2>Redirection vers Explorer...</h2>
      <p>La page des compétitions a été remplacée par l'explorateur de recettes.</p>
    </div>
  )
}