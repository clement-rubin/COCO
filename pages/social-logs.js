import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { getSocialLogs, clearSocialLogs, logUserInteraction } from '../utils/logger'
import styles from '../styles/SocialLogs.module.css'

export default function SocialLogs() {
  const { user } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState({ interactions: [], errors: [], performance: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, interactions, errors, performance
  const [searchTerm, setSearchTerm] = useState('')
  const [timeFilter, setTimeFilter] = useState('24h') // 1h, 24h, 7d, 30d, all
  const [selectedLog, setSelectedLog] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')

  // Vérification d'accès (seulement pour les admins ou développeurs)
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/social-logs'))
      return
    }

    // Vérifier si l'utilisateur a accès (exemple: email spécifique ou rôle admin)
    const hasAccess = user.email === 'admin@coco.com' || 
                     user.user_metadata?.role === 'admin' ||
                     user.user_metadata?.role === 'developer' ||
                     user.email?.includes('clement.rubin') // Accès développeur

    if (!hasAccess) {
      router.push('/')
      return
    }

    loadLogs()
    
    logUserInteraction('ACCESS_SOCIAL_LOGS', 'social-logs-page', {
      userId: user.id,
      userEmail: user.email
    })
  }, [user, router])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLogs()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadLogs = () => {
    setLoading(true)
    try {
      const allLogs = getSocialLogs()
      setLogs(allLogs)
    } catch (error) {
      console.error('Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearLogs = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer tous les logs? Cette action est irréversible.')) {
      const success = clearSocialLogs()
      if (success) {
        setLogs({ interactions: [], errors: [], performance: [], total: 0 })
        alert('Logs supprimés avec succès')
      } else {
        alert('Erreur lors de la suppression des logs')
      }
    }
  }

  // Filtrage et tri des logs
  const filteredLogs = useMemo(() => {
    let allLogsArray = []
    
    // Sélectionner les types de logs à afficher
    switch (filter) {
      case 'interactions':
        allLogsArray = [...logs.interactions]
        break
      case 'errors':
        allLogsArray = [...logs.errors]
        break
      case 'performance':
        allLogsArray = [...logs.performance]
        break
      default:
        allLogsArray = [...logs.interactions, ...logs.errors, ...logs.performance]
    }

    // Filtrage par temps
    if (timeFilter !== 'all') {
      const now = new Date()
      const timeThresholds = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }
      
      const threshold = timeThresholds[timeFilter]
      if (threshold) {
        allLogsArray = allLogsArray.filter(log => 
          now - new Date(log.timestamp) <= threshold
        )
      }
    }

    // Filtrage par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      allLogsArray = allLogsArray.filter(log => 
        JSON.stringify(log).toLowerCase().includes(term)
      )
    }

    // Tri
    allLogsArray.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'timestamp') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1
      } else {
        return aValue > bValue ? 1 : -1
      }
    })

    return allLogsArray
  }, [logs, filter, searchTerm, timeFilter, sortBy, sortOrder])

  // Statistiques
  const stats = useMemo(() => {
    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    
    const recentInteractions = logs.interactions.filter(log => 
      new Date(log.timestamp) > oneDayAgo
    )
    
    const recentErrors = logs.errors.filter(log => 
      new Date(log.timestamp) > oneDayAgo
    )

    const errorsByAction = logs.errors.reduce((acc, error) => {
      acc[error.action] = (acc[error.action] || 0) + 1
      return acc
    }, {})

    const performanceMetrics = logs.performance.reduce((acc, perf) => {
      if (perf.timing?.duration) {
        acc.durations.push(perf.timing.duration)
      }
      return acc
    }, { durations: [] })

    const avgDuration = performanceMetrics.durations.length > 0 
      ? performanceMetrics.durations.reduce((a, b) => a + b, 0) / performanceMetrics.durations.length
      : 0

    return {
      totalLogs: logs.total,
      recentInteractions: recentInteractions.length,
      recentErrors: recentErrors.length,
      totalErrors: logs.errors.length,
      errorsByAction,
      avgResponseTime: Math.round(avgDuration),
      performanceMetrics: logs.performance.length
    }
  }, [logs])

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getLogTypeIcon = (log) => {
    if (log.type === 'SOCIAL_ERROR') return '🚨'
    if (log.type === 'SOCIAL_PERFORMANCE') return '⚡'
    if (log.action?.includes('LIKE')) return '❤️'
    if (log.action?.includes('COMMENT')) return '💬'
    return '🔍'
  }

  const getLogTypeColor = (log) => {
    if (log.type === 'SOCIAL_ERROR') return '#ff4757'
    if (log.type === 'SOCIAL_PERFORMANCE') return '#7bed9f'
    if (log.action?.includes('LIKE')) return '#ff6b35'
    if (log.action?.includes('COMMENT')) return '#3742fa'
    return '#747d8c'
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `coco-social-logs-${new Date().toISOString().split('T')[0]}.json`
    link.click()
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Chargement des logs d'interactions sociales...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>🔍 Logs d'Interactions Sociales</h1>
          <p>Monitoring détaillé des likes, commentaires et performances</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`${styles.refreshBtn} ${autoRefresh ? styles.active : ''}`}
          >
            {autoRefresh ? '⏸️ Pause' : '▶️ Auto-refresh'}
          </button>
          <button onClick={loadLogs} className={styles.refreshBtn}>
            🔄 Actualiser
          </button>
        </div>
      </header>

      {/* Statistiques */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statNumber}>{stats.totalLogs}</div>
            <div className={styles.statLabel}>Total Logs</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <div className={styles.statNumber}>{stats.recentInteractions}</div>
            <div className={styles.statLabel}>Interactions 24h</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🚨</div>
          <div className={styles.statContent}>
            <div className={styles.statNumber}>{stats.recentErrors}</div>
            <div className={styles.statLabel}>Erreurs 24h</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statContent}>
            <div className={styles.statNumber}>{stats.avgResponseTime}ms</div>
            <div className={styles.statLabel}>Temps Moyen</div>
          </div>
        </div>
      </div>

      {/* Filtres et contrôles */}
      <div className={styles.controlsPanel}>
        <div className={styles.filterSection}>
          <label>Type:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tous les logs</option>
            <option value="interactions">Interactions</option>
            <option value="errors">Erreurs</option>
            <option value="performance">Performances</option>
          </select>
        </div>

        <div className={styles.filterSection}>
          <label>Période:</label>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
            <option value="1h">Dernière heure</option>
            <option value="24h">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="all">Toute la période</option>
          </select>
        </div>

        <div className={styles.filterSection}>
          <label>Tri:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="timestamp">Date</option>
            <option value="action">Action</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className={styles.sortOrderBtn}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="Rechercher dans les logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.actionSection}>
          <button onClick={exportLogs} className={styles.exportBtn}>
            📥 Exporter
          </button>
          <button onClick={handleClearLogs} className={styles.clearBtn}>
            🗑️ Nettoyer
          </button>
        </div>
      </div>

      {/* Liste des logs */}
      <div className={styles.logsContainer}>
        <div className={styles.logsHeader}>
          <h3>Logs Filtrés ({filteredLogs.length})</h3>
        </div>
        
        <div className={styles.logsList}>
          {filteredLogs.map((log, index) => (
            <div
              key={log.id || index}
              className={styles.logEntry}
              style={{ borderLeft: `4px solid ${getLogTypeColor(log)}` }}
              onClick={() => setSelectedLog(log)}
            >
              <div className={styles.logHeader}>
                <span className={styles.logIcon}>{getLogTypeIcon(log)}</span>
                <span className={styles.logAction}>{log.action}</span>
                <span className={styles.logType}>{log.type}</span>
                <span className={styles.logTime}>{formatTimestamp(log.timestamp)}</span>
              </div>
              
              <div className={styles.logDetails}>
                {log.error && (
                  <div className={styles.errorInfo}>
                    <strong>Erreur:</strong> {log.error.message}
                  </div>
                )}
                
                {log.timing && (
                  <div className={styles.performanceInfo}>
                    <strong>Performance:</strong> {log.timing.duration}ms
                  </div>
                )}
                
                {log.details && (
                  <div className={styles.contextInfo}>
                    <strong>Contexte:</strong> 
                    {log.details.recipeId && ` Recipe: ${log.details.recipeId}`}
                    {log.details.userId && ` User: ${log.details.userId?.substring(0, 8)}...`}
                    {log.details.deviceType && ` Device: ${log.details.deviceType}`}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {filteredLogs.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <h3>Aucun log trouvé</h3>
              <p>Aucun log ne correspond aux filtres actuels.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détail */}
      {selectedLog && (
        <div className={styles.modal} onClick={() => setSelectedLog(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Détails du Log</h3>
              <button onClick={() => setSelectedLog(null)} className={styles.closeBtn}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <pre className={styles.jsonDisplay}>
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
            
            <div className={styles.modalActions}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2))
                  alert('Log copié dans le presse-papiers')
                }}
                className={styles.copyBtn}
              >
                📋 Copier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
