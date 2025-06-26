import { useState } from 'react'
import styles from '../styles/DebugPanel.module.css'

export default function DebugPanel({ 
  debugLogs = [], 
  onClearLogs, 
  onRefreshAll, 
  additionalData = {},
  apiStatus = {}
}) {
  const [showDebug, setShowDebug] = useState(false)

  const copyDebugData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      logs: debugLogs.slice(0, 20),
      apiStatus,
      additionalData
    }
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
    alert('Debug data copied to clipboard!')
  }

  return (
    <>
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className={styles.debugToggle}
      >
        {showDebug ? '🔍 Masquer Debug' : '🔍 Afficher Debug'}
      </button>

      {showDebug && (
        <div className={styles.debugPanel}>
          <div className={styles.debugHeader}>
            <h3>🐛 Debug Panel</h3>
            <div className={styles.debugStats}>
              <span>Logs: {debugLogs.length}</span>
              {Object.entries(additionalData).map(([key, value]) => (
                <span key={key}>{key}: {String(value)}</span>
              ))}
            </div>
          </div>
          
          {Object.keys(apiStatus).length > 0 && (
            <div className={styles.debugSection}>
              <h4>API Status:</h4>
              <div className={styles.apiStatus}>
                {Object.entries(apiStatus).map(([name, status]) => (
                  <div key={name} className={styles.apiItem}>
                    <strong>{name}:</strong>
                    <span className={styles[status.type || 'loading']}>
                      {status.type === 'error' ? `❌ ${status.message}` :
                       status.type === 'success' ? '✅ Loaded' :
                       '⏳ Loading...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.debugSection}>
            <h4>Recent Logs:</h4>
            <div className={styles.debugLogs}>
              {debugLogs.slice(0, 10).map(log => (
                <div key={log.id} className={`${styles.debugLog} ${styles[log.level.toLowerCase()]}`}>
                  <div className={styles.logHeader}>
                    <span className={`${styles.logLevel} ${styles[log.level.toLowerCase()]}`}>
                      {log.level}
                    </span>
                    <span className={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={styles.logMessage}>{log.message}</div>
                  {log.data && (
                    <details className={styles.logData}>
                      <summary>Détails</summary>
                      <pre>{log.data}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.debugActions}>
            <button onClick={onClearLogs}>
              🗑️ Clear Logs
            </button>
            <button onClick={onRefreshAll}>
              🔄 Refresh All
            </button>
            <button onClick={copyDebugData}>
              📋 Copy Debug Data
            </button>
          </div>
        </div>
      )}
    </>
  )
}
