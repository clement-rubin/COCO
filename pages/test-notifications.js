import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { 
  notificationManager, 
  NOTIFICATION_TYPES,
  showTrophyNotification,
  showFriendRequestNotification,
  showFriendAcceptedNotification,
  showRecipeSharedNotification,
  showRecipeLikedNotification,
  showCookingReminderNotification
} from '../utils/notificationUtils'

export default function TestNotifications() {
  const { user } = useAuth()
  const [permissionStatus, setPermissionStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [testing, setTesting] = useState(false)
  const [activeSection, setActiveSection] = useState(null)

  useEffect(() => {
    updatePermissionStatus()
    
    // Écouter les événements de notifications
    const handleTrophyUnlocked = (event) => {
      addLog('info', `Événement trophée reçu: ${event.detail.trophies?.length} nouveaux trophées`)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('trophiesUnlocked', handleTrophyUnlocked)
      return () => window.removeEventListener('trophiesUnlocked', handleTrophyUnlocked)
    }
  }, [])

  const updatePermissionStatus = () => {
    const status = notificationManager.getPermissionStatus()
    setPermissionStatus(status)
    addLog('info', `Statut permissions: ${status.permission} (Supporté: ${status.supported})`)
  }

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, { type, message, data, timestamp }].slice(-20))
  }

  const requestPermission = async () => {
    setTesting(true)
    try {
      const result = await notificationManager.requestPermission()
      addLog('success', `Permission demandée: ${result}`)
      updatePermissionStatus()
    } catch (error) {
      addLog('error', `Erreur permission: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const testTrophyNotification = async () => {
    setActiveSection('trophy')
    setTesting(true)
    try {
      const mockTrophy = {
        id: Date.now(),
        name: 'Premier Cuisinier',
        description: 'Votre première recette publiée !',
        icon: '🏆',
        image: '/placeholder-trophy.jpg'
      }
      
      const result = await showTrophyNotification(mockTrophy)
      addLog('success', `Notification trophée envoyée`, result)
    } catch (error) {
      addLog('error', `Erreur notification trophée: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const testFriendRequestNotification = async () => {
    setActiveSection('friend')
    setTesting(true)
    try {
      const mockUser = {
        user_id: 'test-user-123',
        display_name: 'Marie Dupont',
        avatar_url: '/placeholder-avatar.jpg'
      }
      
      const result = await showFriendRequestNotification(mockUser)
      addLog('success', `Notification demande d'ami envoyée`, result)
    } catch (error) {
      addLog('error', `Erreur notification ami: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const testFriendAcceptedNotification = async () => {
    setActiveSection('friend')
    setTesting(true)
    try {
      const mockUser = {
        user_id: 'test-user-456',
        display_name: 'Pierre Martin'
      }
      
      const result = await showFriendAcceptedNotification(mockUser)
      addLog('success', `Notification ami accepté envoyée`, result)
    } catch (error) {
      addLog('error', `Erreur notification acceptation: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const testRecipeNotifications = async () => {
    setActiveSection('recipe')
    setTesting(true)
    try {
      const mockRecipe = {
        id: 'recipe-123',
        title: 'Tarte aux pommes de grand-mère',
        image: '/placeholder-recipe.jpg'
      }
      
      const mockUser = {
        user_id: 'test-user-789',
        display_name: 'Sophie Laurent'
      }
      
      // Test partage
      await showRecipeSharedNotification(mockRecipe, mockUser)
      addLog('success', `Notification recette partagée envoyée`)
      
      // Test like (avec délai)
      setTimeout(async () => {
        await showRecipeLikedNotification(mockRecipe, mockUser)
        addLog('success', `Notification recette likée envoyée`)
      }, 1000)
      
    } catch (error) {
      addLog('error', `Erreur notifications recette: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 3000)
    }
  }

  const testCookingReminder = async () => {
    setActiveSection('cooking')
    setTesting(true)
    try {
      const mockRecipe = {
        id: 'recipe-456',
        title: 'Risotto aux champignons',
        image: '/placeholder-recipe.jpg'
      }
      
      const result = await showCookingReminderNotification(mockRecipe, 'Remuer le risotto et ajouter du bouillon')
      addLog('success', `Rappel de cuisson envoyé`, result)
    } catch (error) {
      addLog('error', `Erreur rappel cuisson: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const testCustomNotification = async () => {
    setActiveSection('custom')
    setTesting(true)
    try {
      const result = await notificationManager.show(
        NOTIFICATION_TYPES.SYSTEM,
        'Test personnalisé',
        {
          body: 'Ceci est une notification de test avec du contenu personnalisé',
          data: { custom: true, timestamp: Date.now() }
        }
      )
      addLog('success', `Notification personnalisée envoyée`, result)
    } catch (error) {
      addLog('error', `Erreur notification custom: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const testMultipleNotifications = async () => {
    setActiveSection('multiple')
    setTesting(true)
    try {
      const notifications = [
        { type: NOTIFICATION_TYPES.SYSTEM, title: 'Notification 1', body: 'Premier test en série' },
        { type: NOTIFICATION_TYPES.FRIEND_ACCEPTED, title: 'Notification 2', body: 'Deuxième test en série' },
        { type: NOTIFICATION_TYPES.RECIPE_LIKED, title: 'Notification 3', body: 'Troisième test en série' }
      ]
      
      for (let i = 0; i < notifications.length; i++) {
        const notif = notifications[i]
        await notificationManager.show(notif.type, notif.title, { body: notif.body })
        addLog('success', `Notification ${i + 1}/3 envoyée`)
        if (i < notifications.length - 1) await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      addLog('error', `Erreur notifications multiples: ${error.message}`)
    } finally {
      setTesting(false)
      setTimeout(() => setActiveSection(null), 2000)
    }
  }

  const clearAllNotifications = () => {
    notificationManager.clearAll()
    addLog('info', 'Toutes les notifications supprimées')
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getPermissionStatusClass = () => {
    if (!permissionStatus) return 'permission-default'
    switch (permissionStatus.permission) {
      case 'granted': return 'permission-granted'
      case 'denied': return 'permission-denied'
      default: return 'permission-default'
    }
  }

  const getPermissionStatusText = () => {
    if (!permissionStatus?.supported) return '❌ Non supporté par ce navigateur'
    switch (permissionStatus.permission) {
      case 'granted': return '✅ Autorisées'
      case 'denied': return '❌ Refusées'
      default: return '⏳ Non demandées'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', padding: '20px' }}>
      <div className="notification-test-container">
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: 'var(--primary-orange)', marginBottom: '10px' }}>
            🔔 Test des Notifications COCO
          </h1>
          <p style={{ color: 'var(--text-medium)' }}>
            Testez tous les types de notifications de l'application
          </p>
          {user ? (
            <p style={{ color: 'var(--text-dark)', fontWeight: '600' }}>
              Connecté en tant que: {user.email}
            </p>
          ) : (
            <p style={{ color: 'var(--text-medium)' }}>
              ⚠️ Non connecté - certains tests peuvent ne pas fonctionner
            </p>
          )}
        </header>

        {/* Statut des permissions */}
        <div className={`permission-status ${getPermissionStatusClass()}`}>
          <strong>Statut des notifications: {getPermissionStatusText()}</strong>
          {permissionStatus?.canRequest && (
            <button 
              onClick={requestPermission}
              disabled={testing}
              className="test-button"
              style={{ marginLeft: '15px' }}
            >
              {testing ? 'Demande...' : 'Demander permission'}
            </button>
          )}
        </div>

        {/* Tests de notifications */}
        <div style={{ display: 'grid', gap: '20px', marginBottom: '30px' }}>
          <div className={`notification-section ${activeSection === 'trophy' ? 'active' : ''}`}>
            <h3>🏆 Notifications de Trophées</h3>
            <p>Test des notifications lors du déblocage de trophées</p>
            <button 
              onClick={testTrophyNotification}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'trophy' ? 'Envoi...' : 'Test trophée débloqué'}
            </button>
          </div>

          <div className={`notification-section ${activeSection === 'friend' ? 'active' : ''}`}>
            <h3>👥 Notifications d'Amis</h3>
            <p>Test des notifications liées aux demandes d'amitié</p>
            <button 
              onClick={testFriendRequestNotification}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'friend' ? 'Envoi...' : 'Test demande d\'ami'}
            </button>
            <button 
              onClick={testFriendAcceptedNotification}
              disabled={testing}
              className="test-button"
            >
              Test ami accepté
            </button>
          </div>

          <div className={`notification-section ${activeSection === 'recipe' ? 'active' : ''}`}>
            <h3>🍽️ Notifications de Recettes</h3>
            <p>Test des notifications de partage et d'interaction avec les recettes</p>
            <button 
              onClick={testRecipeNotifications}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'recipe' ? 'Envoi...' : 'Test partage + like'}
            </button>
          </div>

          <div className={`notification-section ${activeSection === 'cooking' ? 'active' : ''}`}>
            <h3>⏰ Rappels de Cuisson</h3>
            <p>Test des notifications de rappel pendant la cuisine</p>
            <button 
              onClick={testCookingReminder}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'cooking' ? 'Envoi...' : 'Test rappel cuisson'}
            </button>
          </div>

          <div className={`notification-section ${activeSection === 'multiple' ? 'active' : ''}`}>
            <h3>🔄 Tests Avancés</h3>
            <p>Tests de notifications multiples et personnalisées</p>
            <button 
              onClick={testCustomNotification}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'custom' ? 'Envoi...' : 'Test personnalisé'}
            </button>
            <button 
              onClick={testMultipleNotifications}
              disabled={testing}
              className="test-button"
            >
              {testing && activeSection === 'multiple' ? 'Envoi...' : 'Test série (3)'}
            </button>
          </div>
        </div>

        {/* Actions générales */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button 
            onClick={clearAllNotifications}
            className="test-button"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            🗑️ Effacer toutes les notifications
          </button>
          <button 
            onClick={updatePermissionStatus}
            className="test-button"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
          >
            🔄 Rafraîchir statut
          </button>
        </div>

        {/* Journal des tests */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>📋 Journal des tests</h3>
            <button 
              onClick={clearLogs}
              className="test-button"
              style={{ 
                background: 'transparent', 
                color: 'var(--text-medium)', 
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem',
                padding: '6px 12px'
              }}
            >
              Effacer
            </button>
          </div>
          <div className="notification-log">
            {logs.length === 0 ? (
              <p style={{ color: 'var(--text-medium)', textAlign: 'center', margin: 0 }}>
                Aucun test effectué
              </p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="log-timestamp">[{log.timestamp}]</span>
                  <span style={{ marginLeft: '8px' }}>{log.message}</span>
                  {log.data && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '2px' }}>
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
