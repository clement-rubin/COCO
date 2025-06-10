import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { 
  getUserTrophies, 
  getTrophyProgress, 
  TROPHY_RARITIES, 
  syncAllTrophies, 
  getTrophyProgressRealtime, 
  manuallyUnlockTrophy, 
  canManuallyUnlockTrophy,
  calculateUserLevel,
  getUserDailyChallenges,
  updateChallengeProgress
} from '../utils/trophyUtils'
import { logInfo, logError } from '../utils/logger'
import styles from '../styles/Trophy.module.css'

export default function TrophySection({ userId }) {
  const { user } = useAuth()
  const [trophies, setTrophies] = useState({ unlocked: [], locked: [], totalPoints: 0 })
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [realTimeProgress, setRealTimeProgress] = useState({})
  const [lastSyncTime, setLastSyncTime] = useState(null)
  const [unlockingTrophies, setUnlockingTrophies] = useState(new Set())
  const [userLevel, setUserLevel] = useState(null)
  const [dailyChallenges, setDailyChallenges] = useState([])
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [recentUnlocks, setRecentUnlocks] = useState([])

  useEffect(() => {
    if (userId) {
      loadTrophyData()
      loadDailyChallenges()
      setupRealTimeUpdates()
    }

    return () => {
      // Cleanup event listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('trophyUnlocked', handleTrophyUnlocked)
        window.removeEventListener('userActionCompleted', handleUserAction)
        window.removeEventListener('challengeUpdated', handleChallengeUpdated)
      }
    }
  }, [userId])

  // Écouter les événements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('trophyUnlocked', handleTrophyUnlocked)
      window.addEventListener('userActionCompleted', handleUserAction)
      window.addEventListener('challengeUpdated', handleChallengeUpdated)
    }
  }, [])

  const loadTrophyData = async () => {
    try {
      setLoading(true)
      
      const [trophyData, progressData] = await Promise.all([
        getUserTrophies(userId),
        getTrophyProgress(userId)
      ])

      setTrophies(trophyData)
      setProgress(progressData)
      
      // Calculer le niveau
      const level = calculateUserLevel(trophyData.totalPoints)
      setUserLevel(level)
      
      // Récupérer les débloquages récents (dernières 24h)
      const recentUnlocks = trophyData.unlocked
        .filter(trophy => {
          const unlockDate = new Date(trophy.unlockedAt)
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return unlockDate > yesterday
        })
        .slice(0, 3)
      
      setRecentUnlocks(recentUnlocks)

      logInfo('Trophy data loaded', {
        userId: userId?.substring(0, 8) + '...',
        unlockedCount: trophyData.unlockedCount,
        totalPoints: trophyData.totalPoints,
        level: level.level
      })

    } catch (error) {
      logError('Error loading trophy data', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDailyChallenges = () => {
    try {
      const challenges = getUserDailyChallenges(userId)
      setDailyChallenges(challenges)
    } catch (error) {
      logError('Error loading daily challenges', error)
    }
  }

  const handleChallengeUpdated = (event) => {
    const { userId: eventUserId, challenge, allChallenges } = event.detail
    
    if (eventUserId === userId) {
      setDailyChallenges(allChallenges)
      
      if (challenge.completed) {
        showChallengeCompletionAnimation(challenge)
      }
    }
  }

  const showChallengeCompletionAnimation = (challenge) => {
    // Animation de completion de défi
    const element = document.createElement('div')
    element.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 10000;
      text-align: center;
      animation: challengeComplete 3s ease-out forwards;
    `
    
    element.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem;">${challenge.icon}</div>
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem;">Défi Complété !</h3>
      <p style="margin: 0 0 1rem 0; opacity: 0.9;">${challenge.name}</p>
      <div style="font-size: 1.25rem; font-weight: bold;">+${challenge.points} points</div>
    `
    
    document.body.appendChild(element)
    
    setTimeout(() => {
      element.remove()
    }, 3000)
  }

  const refreshTrophies = async () => {
    setLoading(true)
    await syncTrophyProgress()
    setLoading(false)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getTrophyCardClass = (trophy, isUnlocked = false) => {
    const baseClass = `${styles.trophyCard} ${styles[trophy.rarity]}`
    return isUnlocked ? `${baseClass} ${styles.trophyUnlocked}` : `${baseClass} ${styles.trophyLocked}`
  }

  const handleManualUnlock = async (trophyId) => {
    try {
      setUnlockingTrophies(prev => new Set([...prev, trophyId]))

      // Vérifier si le trophée peut être débloqué
      const canUnlock = await canManuallyUnlockTrophy(userId, trophyId)
      
      if (!canUnlock.canUnlock) {
        alert(`Impossible de débloquer ce trophée : ${canUnlock.reason}`)
        return
      }

      // Débloquer le trophée
      const result = await manuallyUnlockTrophy(userId, trophyId)
      
      if (result.success) {
        // Afficher une notification de succès
        showTrophyNotification([result.trophy])
        
        // Recharger les données
        await loadTrophyData()
        
        logInfo('Trophy manually unlocked by user', {
          userId: userId?.substring(0, 8) + '...',
          trophyId
        })
      } else {
        alert(`Erreur : ${result.error}`)
      }

    } catch (error) {
      logError('Error during manual trophy unlock', error)
      alert('Une erreur est survenue lors du déblocage du trophée')
    } finally {
      setUnlockingTrophies(prev => {
        const newSet = new Set(prev)
        newSet.delete(trophyId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className={styles.trophyContainer}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.loadingSpinner} />
          <p style={{ color: '#6b7280', fontWeight: '500' }}>
            Chargement de votre aventure...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.trophyContainer}>
      {/* Vue d'ensemble immersive */}
      <div className={styles.trophyHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className={styles.trophyTitle}>🏆 Votre Aventure Culinaire</h2>
          <button
            onClick={refreshTrophies}
            disabled={loading}
            className={styles.refreshButton}
          >
            {loading ? '🔄' : '✨'} Synchroniser
          </button>
        </div>
        
        {/* Niveau utilisateur avec barre de progression */}
        {userLevel && (
          <div className={styles.levelCard}>
            <div className={styles.levelInfo}>
              <div className={styles.levelIcon}>{userLevel.icon}</div>
              <div className={styles.levelDetails}>
                <h3 className={styles.levelTitle}>{userLevel.title}</h3>
                <p className={styles.levelDescription}>Niveau {userLevel.level}</p>
              </div>
              <div className={styles.levelPoints}>
                {userLevel.currentPoints} pts
              </div>
            </div>
            
            {userLevel.level < 10 && (
              <div className={styles.levelProgress}>
                <div className={styles.progressBarLevel}>
                  <div 
                    className={styles.progressFillLevel}
                    style={{ 
                      width: `${userLevel.progressPercent}%`,
                      background: userLevel.color 
                    }}
                  />
                </div>
                <div className={styles.progressText}>
                  {userLevel.pointsToNext} points jusqu'au prochain niveau
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistiques immersives */}
        <div className={styles.trophyStats}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>🏆</div>
            <div className={styles.statValue}>{trophies.unlockedCount}</div>
            <div className={styles.statLabel}>Trophées</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statValue}>{trophies.totalPoints}</div>
            <div className={styles.statLabel}>Points</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>🔥</div>
            <div className={styles.statValue}>{getUserCurrentStreak(userId)}</div>
            <div className={styles.statLabel}>Streak</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statValue}>
              {Math.round((trophies.unlockedCount / trophies.totalCount) * 100)}%
            </div>
            <div className={styles.statLabel}>Complétude</div>
          </div>
        </div>
      </div>

      {/* Navigation améliorée */}
      <div className={styles.tabNavigation}>
        {{
          id: 'overview', label: '🌟 Vue d\'ensemble', icon: '🌟' },
          { id: 'challenges', label: '🎯 Défis Quotidiens', icon: '🎯' },
          { id: 'unlocked', label: '🏆 Collection', icon: '🏆', count: trophies.unlockedCount },
          { id: 'progress', label: '📈 Progression', icon: '📈', count: progress.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </span>
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'overview' && (
        <div className={styles.overviewSection}>
          {/* Débloquages récents */}
          {recentUnlocks.length > 0 && (
            <div className={styles.recentUnlocksSection}>
              <h3 className={styles.sectionTitle}>✨ Récemment débloqués</h3>
              <div className={styles.recentUnlocksGrid}>
                {recentUnlocks.map(trophy => (
                  <div key={trophy.id} className={styles.recentUnlockCard}>
                    <div className={styles.recentUnlockIcon}>{trophy.icon}</div>
                    <h4 className={styles.recentUnlockName}>{trophy.name}</h4>
                    <p className={styles.recentUnlockTime}>
                      {new Date(trophy.unlockedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prochains objectifs */}
          <div className={styles.nextGoalsSection}>
            <h3 className={styles.sectionTitle}>🎯 Prochains objectifs</h3>
            <div className={styles.nextGoalsGrid}>
              {progress.slice(0, 3).map(trophy => (
                <div key={trophy.id} className={styles.nextGoalCard}>
                  <div className={styles.goalIcon}>{trophy.icon}</div>
                  <div className={styles.goalInfo}>
                    <h4 className={styles.goalName}>{trophy.name}</h4>
                    <div className={styles.goalProgress}>
                      <div className={styles.goalProgressBar}>
                        <div 
                          className={styles.goalProgressFill}
                          style={{ width: `${trophy.progressPercent}%` }}
                        />
                      </div>
                      <span className={styles.goalProgressText}>
                        {trophy.progressPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className={styles.challengesSection}>
          <h3 className={styles.sectionTitle}>🎯 Défis du jour</h3>
          <div className={styles.challengesGrid}>
            {dailyChallenges.map(challenge => (
              <div 
                key={challenge.id} 
                className={`${styles.challengeCard} ${challenge.completed ? styles.challengeCompleted : ''}`}
              >
                <div className={styles.challengeIcon}>{challenge.icon}</div>
                <div className={styles.challengeInfo}>
                  <h4 className={styles.challengeName}>{challenge.name}</h4>
                  <p className={styles.challengeDescription}>{challenge.description}</p>
                  
                  <div className={styles.challengeProgress}>
                    <div className={styles.challengeProgressBar}>
                      <div 
                        className={styles.challengeProgressFill}
                        style={{ 
                          width: `${(challenge.progress / (challenge.target || 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className={styles.challengeProgressText}>
                      {challenge.progress}/{challenge.target || 1}
                    </span>
                  </div>
                  
                  <div className={styles.challengeReward}>
                    <span className={styles.rewardIcon}>⭐</span>
                    <span className={styles.rewardText}>+{challenge.points} points</span>
                  </div>
                </div>
                
                {challenge.completed && (
                  <div className={styles.challengeCompletedBadge}>
                    ✅ Complété !
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {dailyChallenges.length === 0 && (
            <div className={styles.noChallenges}>
              <div className={styles.noChallengesIcon}>🎯</div>
              <h4>Aucun défi disponible</h4>
              <p>Les défis quotidiens se renouvellent chaque jour !</p>
            </div>
          )}
        </div>
      )}

      {/* Autres onglets existants... */}
      {activeTab === 'unlocked' && (
        <div>
          {trophies.unlocked.length > 0 ? (
            <div className={styles.trophyGrid}>
              {trophies.unlocked.map((trophy) => (
                <div key={trophy.id} className={getTrophyCardClass(trophy, true)}>
                  <div className={styles.trophyIcon}>{trophy.icon}</div>
                  <div className={styles.trophyInfo}>
                    <div className={styles.trophyRarity}>
                      {TROPHY_RARITIES[trophy.rarity].name}
                    </div>
                    <h3 className={styles.trophyName}>{trophy.name}</h3>
                    <p className={styles.trophyDescription}>{trophy.description}</p>
                    <div className={styles.trophyPoints}>
                      ⭐ {trophy.points} points
                    </div>
                    <div className={styles.trophyDate}>
                      Débloqué le {formatDate(trophy.unlockedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏆</div>
              <h3 className={styles.emptyTitle}>Aucun trophée débloqué</h3>
              <p className={styles.emptyDesc}>
                Commencez à explorer COCO pour débloquer vos premiers trophées !
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className={styles.progressSection}>
          {progress.length > 0 ? (
            progress.map((trophy) => (
              <div key={trophy.id} className={`${styles.progressCard} ${trophy.progressPercent >= 100 ? styles.readyToUnlock : ''}`}>
                <div className={styles.progressHeader}>
                  <div className={styles.progressIcon}>{trophy.icon}</div>
                  <div className={styles.progressInfo}>
                    <h3 className={styles.progressName}>{trophy.name}</h3>
                    <p className={styles.progressDesc}>{trophy.description}</p>
                  </div>
                  <div style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: '700',
                    color: trophy.progressPercent >= 100 ? '#10b981' : '#3b82f6'
                  }}>
                    {trophy.progressPercent}%
                  </div>
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={`${styles.progressFill} ${trophy.progressPercent >= 100 ? styles.progressReady : ''}`}
                    style={{ 
                      width: `${trophy.progressPercent}%`,
                      background: trophy.progressPercent >= 100 
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                    }}
                  />
                </div>
                <div className={styles.progressText}>
                  {trophy.currentValue} / {trophy.targetValue}
                  {trophy.progressPercent >= 100 && (
                    <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: '600' }}>
                      ✅ Prêt à débloquer !
                    </span>
                  )}
                </div>
                
                {/* Bouton de déblocage manuel */}
                {trophy.progressPercent >= 100 && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleManualUnlock(trophy.id)}
                      disabled={unlockingTrophies.has(trophy.id)}
                      className={styles.unlockButton}
                      style={{
                        background: unlockingTrophies.has(trophy.id) 
                          ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: unlockingTrophies.has(trophy.id) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                        width: '100%',
                        maxWidth: '200px'
                      }}
                    >
                      {unlockingTrophies.has(trophy.id) ? (
                        <>
                          <span className={styles.syncIcon}>🔄</span>
                          Déblocage...
                        </>
                      ) : (
                        <>
                          🏆 Débloquer le trophée
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📈</div>
              <h3 className={styles.emptyTitle}>Aucune progression en cours</h3>
              <p className={styles.emptyDesc}>
                Tous les trophées accessibles sont déjà débloqués !
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Fonction utilitaire pour récupérer le streak actuel
function getUserCurrentStreak(userId) {
  try {
    return parseInt(localStorage.getItem(`daily_streak_${userId}`) || '0')
  } catch {
    return 0
  }
}
