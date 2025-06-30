import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { logInfo, logError } from '../utils/logger'
import RecipeOfWeek from '../components/RecipeOfWeek'
import styles from '../styles/Competitions.module.css'
import { processImageData } from '../utils/imageUtils'

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

      setCompetitions(data || [])
      logInfo('Competitions loaded', { count: data?.length || 0, competitions: data })
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
    if (!user) return

    logInfo('Voting for entry', { competitionId, entryId, userId: user.id });
    try {
      const { error } = await supabase
        .from('competition_votes')
        .insert({
          competition_id: competitionId,
          entry_id: entryId,
          voter_id: user.id
        })

      if (error) {
        if (error.code === '23505') {
          logInfo('User already voted for this competition', { competitionId, entryId, userId: user.id });
          alert('Vous avez déjà voté pour cette compétition')
        } else {
          throw error
        }
        return
      }

      // Update votes count
      const { error: updateError } = await supabase
        .from('competition_entries')
        .update({ votes_count: supabase.rpc('increment_votes', { entry_id: entryId }) })
        .eq('id', entryId)

      logInfo('Vote registered', { competitionId, entryId, userId: user.id });
      await loadCompetitions()
      
    } catch (error) {
      logError('Error voting', error)
      alert('Erreur lors du vote: ' + error.message)
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
                    {competition.competition_entries.slice(0, 6).map(entry => {
                      // Correction : utiliser entry.recipes ou entry.recipe selon la structure
                      const recipe = entry.recipes || entry.recipe || {};
                      // Correction de l'affichage de l'image
                      const recipeImage = processImageData(recipe.image, '/placeholder-recipe.jpg');
                      // LOG pour debug image
                      logInfo('Affichage image participation', {
                        entryId: entry.id,
                        recipeId: recipe.id,
                        recipeTitle: recipe.title,
                        recipeImageRaw: recipe.image,
                        recipeImageProcessed: recipeImage,
                        entryUserId: entry.user_id,
                        profile: entry.profiles
                      });
                      return (
                        <div key={entry.id} className={styles.entryCard}>
                          <div className={styles.entryImage}>
                            <img 
                              src={recipeImage} 
                              alt={recipe.title || 'Recette'}
                              onError={e => {
                                logError('Erreur chargement image participation', {
                                  entryId: entry.id,
                                  recipeId: recipe.id,
                                  recipeImage
                                });
                                e.target.src = '/placeholder-recipe.jpg';
                              }}
                            />
                          </div>
                          <div className={styles.entryInfo}>
                            <h5>{recipe.title || 'Sans titre'}</h5>
                            <p>Par {entry.profiles?.display_name || recipe.author || 'Auteur inconnu'}</p>
                            <div className={styles.entryActions}>
                              <button
                                onClick={() => {
                                  logInfo('Vote button clicked', { competitionId: competition.id, entryId: entry.id, userId: user?.id });
                                  voteForEntry(competition.id, entry.id)
                                }}
                                className={styles.voteButton}
                                disabled={entry.user_id === user?.id}
                              >
                                👍 {entry.votes_count || 0}
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
                  const recipeImage = processImageData(recipe.image, '/placeholder-recipe.jpg');
                  // LOG pour debug image dans la modale
                  logInfo('Affichage image recette utilisateur dans modale', {
                    recipeId: recipe.id,
                    recipeTitle: recipe.title,
                    recipeImageRaw: recipe.image,
                    recipeImageProcessed: recipeImage
                  });
                  return (
                    <div key={recipe.id} className={styles.recipeOption}>
                      <img 
                        src={recipeImage} 
                        alt={recipe.title}
                        onError={e => {
                          logError('Erreur chargement image recette utilisateur (modale)', {
                            recipeId: recipe.id,
                            recipeImage
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