import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getUserTrophies, getTrophyProgress, TROPHY_RARITIES, syncAllTrophies, getTrophyProgressRealtime } from '../utils/trophyUtils'
import { logInfo, logError } from '../utils/logger'
import styles from '../styles/Trophy.module.css'

export default function TrophySection({ userId }) {
  const { user } = useAuth()
  const [trophies, setTrophies] = useState({ unlocked: [], locked: [], totalPoints: 0 })
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('unlocked')
  const [realTimeProgress, setRealTimeProgress] = useState({})
  const [lastSyncTime, setLastSyncTime] = useState(null)

  useEffect(() => {
    if (userId) {
      loadTrophyData()
      setupRealTimeUpdates()
    }

    return () => {
      // Cleanup event listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('trophyUnlocked', handleTrophyUnlocked)
        window.removeEventListener('userActionCompleted', handleUserAction)
      }
    }
  }, [userId])

  // Écouter les événements de trophées débloqués
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('trophyUnlocked', handleTrophyUnlocked)
      window.addEventListener('userActionCompleted', handleUserAction)
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

      logInfo('Trophy data loaded', {
        userId: userId?.substring(0, 8) + '...',
        unlockedCount: trophyData.unlockedCount,
        totalPoints: trophyData.totalPoints
      })

    } catch (error) {
      logError('Error loading trophy data', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    // Synchroniser automatiquement toutes les 30 secondes
    const interval = setInterval(async () => {
      if (userId) {
        await syncTrophyProgress()
      }
    }, 30000)

    return () => clearInterval(interval)
  }

  const handleTrophyUnlocked = async (event) => {
    const { userId: eventUserId, trophies } = event.detail
    
    if (eventUserId === userId) {
      // Recharger les données des trophées
      await loadTrophyData()
      
      // Afficher une notification
      showTrophyNotification(trophies)
    }
  }

  const handleUserAction = async (event) => {
    const { userId: eventUserId, actionType } = event.detail
    
    if (eventUserId === userId) {
      // Synchroniser la progression en temps réel
      await syncTrophyProgress()
    }
  }

  const syncTrophyProgress = async () => {
    try {
      const { newTrophies, updatedProgress } = await syncAllTrophies(userId)
      
      if (newTrophies.length > 0) {
        await loadTrophyData()
        showTrophyNotification(newTrophies)
      } else {
        // Mettre à jour seulement la progression
        setProgress(updatedProgress)
      }
      
      setLastSyncTime(new Date())

    } catch (error) {
      logError('Error syncing trophy progress', error)
    }
  }

  const showTrophyNotification = (trophies) => {
    if (trophies.length === 0) return

    // Créer une notification temporaire
    const notification = document.createElement('div')
    notification.className = `${styles.trophyNotification} ${trophies.length > 1 ? styles.multiple : ''}`
    
    const trophy = trophies[0]
    notification.innerHTML = `
      <div class="${styles.notificationHeader}">
        <div class="${styles.notificationIcon}">${trophy.icon}</div>
        <div class="${styles.notificationTitle}">
          ${trophies.length === 1 ? 'Nouveau trophée !' : `${trophies.length} nouveaux trophées !`}
        </div>
      </div>
      <div class="${styles.notificationDesc}">
        ${trophies.length === 1 ? trophy.name : 'Consultez votre collection'}
      </div>
    `

    document.body.appendChild(notification)

    // Supprimer la notification après 5 secondes
    setTimeout(() => {
      notification.remove()
    }, 5000)
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

  if (loading) {
    return (
      <div className={styles.trophyContainer}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(59, 130, 246, 0.2)',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p style={{ color: '#6b7280', fontWeight: '500' }}>
            Chargement des trophées...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.trophyContainer}>
      {/* Header avec statistiques et bouton de refresh */}
      <div className={styles.trophyHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className={styles.trophyTitle}>🏆 Collection de Trophées</h2>
          <button
            onClick={refreshTrophies}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '🔄' : '🔄'} Actualiser
          </button>
        </div>
        
        {lastSyncTime && (
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280', 
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            Dernière synchronisation : {lastSyncTime.toLocaleTimeString('fr-FR')}
          </div>
        )}
        
        <div className={styles.trophyStats}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{trophies.unlockedCount}</div>
            <div className={styles.statLabel}>Débloqués</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{trophies.totalCount}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{trophies.totalPoints}</div>
            <div className={styles.statLabel}>Points</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>
              {Math.round((trophies.unlockedCount / trophies.totalCount) * 100)}%
            </div>
            <div className={styles.statLabel}>Complétude</div>
          </div>
        </div>
      </div>

      {/* Navigation des onglets */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
        background: '#f8fafc',
        borderRadius: '16px',
        padding: '6px',
        maxWidth: '400px',
        margin: '0 auto 2rem'
      }}>
        {[
          { id: 'unlocked', label: '🏆 Débloqués', count: trophies.unlockedCount },
          { id: 'locked', label: '🔒 Verrouillés', count: trophies.locked.length },
          { id: 'progress', label: '📈 Progression', count: progress.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              background: activeTab === tab.id ? 'white' : 'transparent',
              color: activeTab === tab.id ? '#1f2937' : '#6b7280',
              border: 'none',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
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

      {activeTab === 'locked' && (
        <div>
          {trophies.locked.length > 0 ? (
            <div className={styles.trophyGrid}>
              {trophies.locked.map((trophy) => (
                <div key={trophy.id} className={getTrophyCardClass(trophy, false)}>
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎉</div>
              <h3 className={styles.emptyTitle}>Tous les trophées débloqués !</h3>
              <p className={styles.emptyDesc}>
                Félicitations ! Vous avez débloqué tous les trophées disponibles.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className={styles.progressSection}>
          {progress.length > 0 ? (
            progress.map((trophy) => (
              <div key={trophy.id} className={styles.progressCard}>
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
                    className={styles.progressFill}
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
