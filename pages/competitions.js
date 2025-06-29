import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { logInfo, logError } from '../utils/logger'
import RecipeOfWeek from '../components/RecipeOfWeek'
import styles from '../styles/Competitions.module.css'

export default function Competitions() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [competitions, setCompetitions] = useState([])
  const [activeTab, setActiveTab] = useState('week')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCompetition, setSelectedCompetition] = useState(null)
  const [userRecipes, setUserRecipes] = useState([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userVotes, setUserVotes] = useState(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/competitions'))
      return
    }
    
    if (activeTab !== 'week') {
      loadCompetitions()
      loadUserVotes()
    }
    loadUserRecipes()
  }, [user, router, activeTab, refreshKey])

  const loadCompetitions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          *,
          competition_entries (
            id,
            user_id,
            recipe_id,
            votes_count,
            rank,
            submitted_at,
            recipes (
              id,
              title,
              image,
              author,
              description,
              category
            ),
            profiles:user_id (
              display_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const enrichedCompetitions = data?.map(comp => ({
        ...comp,
        competition_entries: comp.competition_entries?.sort((a, b) => 
          (b.votes_count || 0) - (a.votes_count || 0)
        ) || []
      })) || []

      setCompetitions(enrichedCompetitions)
      logInfo('Competitions loaded', { count: enrichedCompetitions.length })
    } catch (error) {
      logError('Error loading competitions', error)
      setError('Erreur lors du chargement des compétitions')
    } finally {
      setLoading(false)
    }
  }

  const loadUserVotes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('competition_votes')
        .select('competition_id')
        .eq('voter_id', user.id)

      if (error) throw error

      setUserVotes(new Set(data?.map(vote => vote.competition_id) || []))
    } catch (error) {
      logError('Error loading user votes', error)
    }
  }

  const loadUserRecipes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at, category, description')
        .eq('user_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setUserRecipes(data || [])
    } catch (error) {
      logError('Error loading user recipes', error)
    }
  }

  const submitToCompetition = async (competitionId, recipeId) => {
    if (!user) return

    setSubmitting(true)
    try {
      // Check if user already submitted
      const { data: existingEntry } = await supabase
        .from('competition_entries')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .single()

      if (existingEntry) {
        throw new Error('Vous participez déjà à cette compétition')
      }

      const { error } = await supabase
        .from('competition_entries')
        .insert({
          competition_id: competitionId,
          user_id: user.id,
          recipe_id: recipeId
        })

      if (error) throw error

      setShowSubmitModal(false)
      setRefreshKey(prev => prev + 1)
      
      // Success notification
      showNotification('🎉 Recette soumise avec succès !', 'success')
      
    } catch (error) {
      logError('Error submitting to competition', error)
      showNotification(error.message || 'Erreur lors de la soumission', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const voteForEntry = async (competitionId, entryId) => {
    if (!user) return

    try {
      // Check if user already voted for this competition
      if (userVotes.has(competitionId)) {
        showNotification('Vous avez déjà voté pour cette compétition', 'warning')
        return
      }

      // Check if user is trying to vote for their own entry
      const entry = competitions
        .find(comp => comp.id === competitionId)
        ?.competition_entries?.find(e => e.id === entryId)

      if (entry?.user_id === user.id) {
        showNotification('Vous ne pouvez pas voter pour votre propre recette', 'warning')
        return
      }

      const { error } = await supabase
        .from('competition_votes')
        .insert({
          competition_id: competitionId,
          entry_id: entryId,
          voter_id: user.id
        })

      if (error) {
        if (error.code === '23505') {
          showNotification('Vous avez déjà voté pour cette compétition', 'warning')
        } else {
          throw error
        }
        return
      }

      // Update local state
      setUserVotes(prev => new Set([...prev, competitionId]))
      setRefreshKey(prev => prev + 1)
      
      showNotification('👍 Vote enregistré !', 'success')
      
    } catch (error) {
      logError('Error voting', error)
      showNotification('Erreur lors du vote', 'error')
    }
  }

  const showNotification = (message, type = 'info') => {
    // Simple notification system - could be enhanced with a proper toast library
    const notification = document.createElement('div')
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669);' : ''}
      ${type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : ''}
      ${type === 'warning' ? 'background: linear-gradient(135deg, #f59e0b, #d97706);' : ''}
      ${type === 'info' ? 'background: linear-gradient(135deg, #3b82f6, #2563eb);' : ''}
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease'
      setTimeout(() => document.body.removeChild(notification), 300)
    }, 3000)
  }

  const getStatusBadge = (competition) => {
    const now = new Date()
    const startDate = new Date(competition.start_date)
    const endDate = new Date(competition.end_date)

    if (now < startDate) {
      return <span className={`${styles.statusBadge} ${styles.upcoming}`}>⏰ Bientôt</span>
    } else if (now > endDate) {
      return <span className={`${styles.statusBadge} ${styles.completed}`}>🏅 Terminé</span>
    } else {
      return <span className={`${styles.statusBadge} ${styles.active}`}>🔥 En cours</span>
    }
  }

  const getCompetitionProgress = (competition) => {
    const now = new Date()
    const startDate = new Date(competition.start_date)
    const endDate = new Date(competition.end_date)
    const total = endDate - startDate
    const elapsed = now - startDate
    return Math.max(0, Math.min(100, (elapsed / total) * 100))
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
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement des compétitions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</span>
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className={styles.submitButton}
            style={{ maxWidth: '200px' }}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Compétitions - COCO</title>
        <meta name="description" content="Participez aux compétitions culinaires et montrez vos talents" />
        <link rel="canonical" href="https://yoursite.com/competitions" />
      </Head>

      {/* Header */}
      <header className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
          aria-label="Retour à la page précédente"
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1>🏆 Compétitions Culinaires</h1>
          <p>Participez aux défis culinaires et gagnez des prix incroyables !</p>
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
              data-id={tab.id}
              aria-selected={activeTab === tab.id}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
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
          <RecipeOfWeek key={refreshKey} />
          
          <div className={styles.weekInfo}>
            <div className={styles.infoCard}>
              <h3>📊 Comment ça marche ?</h3>
              <ul>
                <li>✨ Chaque semaine, les meilleures recettes récentes sont sélectionnées</li>
                <li>🗳️ Vous pouvez voter une fois par semaine pour votre recette préférée</li>
                <li>🚫 Vous ne pouvez pas voter pour votre propre recette</li>
                <li>🏆 La recette avec le plus de votes remporte la semaine !</li>
                <li>📊 Les résultats sont mis à jour en temps réel</li>
              </ul>
            </div>
            
            <div className={styles.infoCard}>
              <h3>🎁 Récompenses</h3>
              <ul>
                <li>🥇 Badge exclusif "Recette de la semaine"</li>
                <li>⭐ Points de réputation bonus (+50 pts)</li>
                <li>📈 Mise en avant sur la page d'accueil pendant 7 jours</li>
                <li>🎉 Notification à toute la communauté</li>
                <li>💎 Accès anticipé aux nouvelles fonctionnalités</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Competitions List */}
      {activeTab !== 'week' && (
        <div className={styles.competitionsGrid}>
          {filteredCompetitions.map(competition => {
            const hasUserEntry = competition.competition_entries?.some(entry => entry.user_id === user?.id)
            const hasUserVoted = userVotes.has(competition.id)
            const progress = getCompetitionProgress(competition)
            
            return (
              <div key={competition.id} className={styles.competitionCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.competitionInfo}>
                    <h3>{competition.title}</h3>
                    <p className={styles.description}>{competition.description}</p>
                    <div className={styles.competitionMeta}>
                      <span className={styles.category}>
                        {competition.category || 'Général'}
                      </span>
                      {getStatusBadge(competition)}
                      {activeTab === 'active' && (
                        <div style={{ 
                          flex: 1, 
                          height: '4px', 
                          background: '#f3f4f6', 
                          borderRadius: '2px', 
                          overflow: 'hidden',
                          minWidth: '100px'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #ff6b35, #f7931e)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      )}
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
                    <span className={styles.statNumber}>
                      {competition.competition_entries?.length || 0}
                    </span>
                    <span className={styles.statLabel}>Participants</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNumber}>
                      {competition.competition_entries?.reduce((sum, entry) => sum + (entry.votes_count || 0), 0) || 0}
                    </span>
                    <span className={styles.statLabel}>Votes</span>
                  </div>
                  {activeTab === 'active' && (
                    <div className={styles.stat}>
                      <span className={styles.statNumber}>
                        {Math.ceil((new Date(competition.end_date) - new Date()) / (1000 * 60 * 60 * 24))}
                      </span>
                      <span className={styles.statLabel}>Jours restants</span>
                    </div>
                  )}
                </div>

                {/* Entries */}
                <div className={styles.entries}>
                  <h4>🏁 Participations ({competition.competition_entries?.length || 0})</h4>
                  {competition.competition_entries?.length > 0 ? (
                    <div className={styles.entriesGrid}>
                      {competition.competition_entries.slice(0, 6).map((entry, index) => (
                        <div key={entry.id} className={styles.entryCard}>
                          <div className={styles.entryImage}>
                            <img 
                              src={entry.recipes?.image || '/placeholder-recipe.jpg'} 
                              alt={entry.recipes?.title}
                              loading="lazy"
                            />
                          </div>
                          <div className={styles.entryInfo}>
                            <h5>
                              {index < 3 && ['🥇', '🥈', '🥉'][index]} {entry.recipes?.title}
                            </h5>
                            <p>Par {entry.profiles?.display_name || entry.recipes?.author}</p>
                            <div className={styles.entryActions}>
                              <button
                                onClick={() => voteForEntry(competition.id, entry.id)}
                                className={styles.voteButton}
                                disabled={entry.user_id === user?.id || hasUserVoted || activeTab !== 'active'}
                                title={entry.user_id === user?.id ? 'Votre recette' : hasUserVoted ? 'Déjà voté' : 'Voter pour cette recette'}
                              >
                                👍 {entry.votes_count || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noEntries}>
                      Aucune participation pour le moment. Soyez le premier à participer ! 🚀
                    </p>
                  )}
                </div>

                {/* Actions */}
                {activeTab === 'active' && (
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => {
                        setSelectedCompetition(competition)
                        setShowSubmitModal(true)
                      }}
                      className={styles.submitButton}
                      disabled={hasUserEntry}
                    >
                      {hasUserEntry ? '✅ Déjà participé' : '🚀 Participer maintenant'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab !== 'week' && filteredCompetitions.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            {activeTab === 'active' ? '🔥' : activeTab === 'upcoming' ? '⏰' : '🏅'}
          </span>
          <h3>
            Aucune compétition {activeTab === 'active' ? 'en cours' : activeTab === 'upcoming' ? 'à venir' : 'terminée'}
          </h3>
          <p>
            {activeTab === 'active' 
              ? 'Toutes les compétitions sont actuellement fermées. Revenez bientôt !' 
              : activeTab === 'upcoming' 
              ? 'De nouveaux défis arrivent bientôt. Restez connecté !' 
              : 'Consultez les résultats des compétitions précédentes.'}
          </p>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedCompetition && (
        <div className={styles.modal} onClick={(e) => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>🚀 Participer à "{selectedCompetition.title}"</h3>
              <button 
                onClick={() => setShowSubmitModal(false)}
                className={styles.closeButton}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p>Choisissez une de vos recettes pour participer à cette compétition :</p>
              <div className={styles.recipesGrid}>
                {userRecipes.map(recipe => (
                  <div key={recipe.id} className={styles.recipeOption}>
                    <img 
                      src={recipe.image || '/placeholder-recipe.jpg'} 
                      alt={recipe.title}
                      loading="lazy"
                    />
                    <div className={styles.recipeInfo}>
                      <h4>{recipe.title}</h4>
                      <p>{recipe.description?.substring(0, 100)}...</p>
                      <p><em>Catégorie: {recipe.category || 'Non spécifiée'}</em></p>
                      <button
                        onClick={() => submitToCompetition(selectedCompetition.id, recipe.id)}
                        className={styles.selectButton}
                        disabled={submitting}
                      >
                        {submitting ? '⏳ Soumission...' : '✨ Choisir cette recette'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {userRecipes.length === 0 && (
                <div className={styles.noRecipes}>
                  <p>Vous n'avez pas encore de recettes publiques.</p>
                  <button 
                    onClick={() => router.push('/add-recipe')}
                    className={styles.createRecipeButton}
                  >
                    ➕ Créer ma première recette
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
    </div>
  )
}