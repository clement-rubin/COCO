import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import { logInfo as baseLogInfo, logError as baseLogError } from '../utils/logger'
import CulinaryChallenge from '../components/CulinaryChallenge'
import styles from '../styles/Competitions.module.css'

export default function Competitions() {
  const { user } = useAuth()
  const router = useRouter()
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
    logInfo('Culinary Challenges page mounted', { user: user?.id });
    if (!user) {
      logInfo('User not authenticated, redirecting to login');
      router.push('/login?redirect=' + encodeURIComponent('/competitions'))
      return
    }
  }, [user, router])

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Défis Culinaires - COCO</title>
        <meta name="description" content="Relevez des défis culinaires, apprenez de nouvelles techniques et débloquez des badges" />
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
      </header>

      {/* Composant principal des défis culinaires */}
      <CulinaryChallenge />
    </div>
  )
}