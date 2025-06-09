import { useState, useEffect } from 'react'
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
import { TROPHY_DEFINITIONS } from '../utils/trophyUtils'

export default function TestNotifications() {
  const [permissionStatus, setPermissionStatus] = useState({ supported: false, permission: 'default' })
  const [notificationLog, setNotificationLog] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Update permission status
    const updateStatus = () => {
      const status = notificationManager.getPermissionStatus()
      setPermissionStatus(status)
    }

    updateStatus()
    
    // Listen for permission changes
    const interval = setInterval(updateStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  const addToLog = (type, message, result) => {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      result,
      success: result?.success || false
    }
    setNotificationLog(prev => [logEntry, ...prev.slice(0, 9)]) // Keep last 10 entries
  }

  const requestPermission = async () => {
    setIsLoading(true)
    try {
      const result = await notificationManager.requestPermission()
      addToLog('permission', 'Permission demandée', { success: result === 'granted', permission: result })
      setPermissionStatus(notificationManager.getPermissionStatus())
    } catch (error) {
      addToLog('permission', 'Erreur permission', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testBasicNotification = async (forceFallback = false) => {
    setIsLoading(true)
    try {
      // Log de diagnostic avant le test
      const status = notificationManager.getPermissionStatus()
      addToLog('diagnostic', `État avant test: ${JSON.stringify(status)}`, { success: true })
      
      const result = await notificationManager.show(
        NOTIFICATION_TYPES.SYSTEM,
        'Test de notification basique',
        {
          body: `Notification ${forceFallback ? 'fallback' : 'native'} - ${new Date().toLocaleTimeString()}`,
          forceFallback
        }
      )
      addToLog('basic', `Test ${forceFallback ? 'fallback' : 'native'}`, result)
    } catch (error) {
      addToLog('basic', 'Erreur test basique', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testTrophyNotification = async () => {
    setIsLoading(true)
    try {
      const trophy = TROPHY_DEFINITIONS.first_recipe
      const result = await showTrophyNotification(trophy)
      addToLog('trophy', 'Test trophée', result)
    } catch (error) {
      addToLog('trophy', 'Erreur test trophée', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testFriendNotification = async () => {
    setIsLoading(true)
    try {
      const mockUser = {
        user_id: 'test-user',
        display_name: 'Jean Test'
      }
      const result = await showFriendRequestNotification(mockUser)
      addToLog('friend', 'Test demande ami', result)
    } catch (error) {
      addToLog('friend', 'Erreur test ami', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testRecipeNotification = async () => {
    setIsLoading(true)
    try {
      const mockRecipe = {
        id: 'test-recipe',
        title: 'Tarte aux pommes test',
        image: '/images/placeholder-recipe.jpg'
      }
      const mockUser = {
        user_id: 'test-user',
        display_name: 'Marie Test'
      }
      const result = await showRecipeSharedNotification(mockRecipe, mockUser)
      addToLog('recipe', 'Test recette partagée', result)
    } catch (error) {
      addToLog('recipe', 'Erreur test recette', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testCookingReminder = async () => {
    setIsLoading(true)
    try {
      const mockRecipe = {
        id: 'test-recipe',
        title: 'Bœuf bourguignon',
        image: '/images/placeholder-recipe.jpg'
      }
      const result = await showCookingReminderNotification(mockRecipe, 'Vérifier la cuisson (étape 3/5)')
      addToLog('cooking', 'Test rappel cuisson', result)
    } catch (error) {
      addToLog('cooking', 'Erreur test rappel', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const testMultipleNotifications = async () => {
    setIsLoading(true)
    try {
      const notifications = [
        { type: NOTIFICATION_TYPES.SYSTEM, title: 'Notification 1', body: 'Première notification' },
        { type: NOTIFICATION_TYPES.FRIEND_ACCEPTED, title: 'Notification 2', body: 'Deuxième notification' },
        { type: NOTIFICATION_TYPES.RECIPE_LIKED, title: 'Notification 3', body: 'Troisième notification' }
      ]

      for (let i = 0; i < notifications.length; i++) {
        const notif = notifications[i]
        const result = await notificationManager.show(notif.type, notif.title, { body: notif.body })
        addToLog('multiple', `Test multiple ${i + 1}/3`, result)
        await new Promise(resolve => setTimeout(resolve, 500)) // Délai entre notifications
      }
    } catch (error) {
      addToLog('multiple', 'Erreur test multiple', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const clearAllNotifications = () => {
    notificationManager.clearAll()
    addToLog('clear', 'Toutes les notifications supprimées', { success: true })
  }

  const clearLog = () => {
    setNotificationLog([])
  }

  const testPermissionDiagnostic = async () => {
    setIsLoading(true)
    try {
      const status = notificationManager.getPermissionStatus()
      addToLog('diagnostic', 'État détaillé des permissions', status)
      
      // Test de création directe d'une notification
      if (status.isGranted && typeof window !== 'undefined') {
        try {
          const testNotif = new Notification('Test direct', {
            body: 'Test de création directe',
            icon: '/icons/coco-icon-96.png'
          })
          testNotif.close()
          addToLog('diagnostic', 'Création directe réussie', { success: true })
        } catch (error) {
          addToLog('diagnostic', 'Échec création directe', { success: false, error: error.message })
        }
      }
    } catch (error) {
      addToLog('diagnostic', 'Erreur diagnostic', { success: false, error: error.message })
    }
    setIsLoading(false)
  }

  const getPermissionStatusColor = () => {
    switch (permissionStatus.permission) {
      case 'granted': return 'text-green-600'
      case 'denied': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getPermissionStatusText = () => {
    if (!permissionStatus.supported) return 'Non supporté'
    switch (permissionStatus.permission) {
      case 'granted': return 'Accordé ✅'
      case 'denied': return 'Refusé ❌'
      default: return 'En attente ⏳'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🔔 Test des Notifications COCO
            </h1>
            <p className="text-gray-600">
              Testez tous les types de notifications et leurs fonctionnalités
            </p>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">📊 Statut des Notifications</h2>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {permissionStatus.supported ? '✅' : '❌'}
                </div>
                <div className="font-medium">Support</div>
                <div className="text-sm text-gray-600">
                  {permissionStatus.supported ? 'Supporté' : 'Non supporté'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🔐</div>
                <div className="font-medium">Permission</div>
                <div className={`text-sm ${getPermissionStatusColor()}`}>
                  {getPermissionStatusText()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🌐</div>
                <div className="font-medium">Environnement</div>
                <div className="text-sm text-gray-600">
                  {typeof window !== 'undefined' ? 'Client' : 'Serveur'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="font-medium">Diagnostic</div>
                <button
                  onClick={testPermissionDiagnostic}
                  disabled={isLoading}
                  className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                  Tester
                </button>
              </div>
            </div>
            
            {permissionStatus.canRequest && (
              <div className="mt-4 text-center">
                <button
                  onClick={requestPermission}
                  disabled={isLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Demande en cours...' : 'Demander la Permission'}
                </button>
              </div>
            )}

            {/* Détails de debugging */}
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
              <strong>Debug Info:</strong>
              <div>Navigator: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 80) + '...' : 'N/A'}</div>
              <div>Notification API: {typeof window !== 'undefined' && 'Notification' in window ? 'Disponible' : 'Non disponible'}</div>
              <div>Permission actuelle: {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'N/A'}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Test Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6">🧪 Tests de Notifications</h2>
              
              <div className="space-y-4">
                {/* Basic Tests */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Tests Basiques</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => testBasicNotification(false)}
                      disabled={isLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      Native
                    </button>
                    <button
                      onClick={() => testBasicNotification(true)}
                      disabled={isLoading}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      Fallback
                    </button>
                  </div>
                </div>

                {/* Specific Tests */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Tests Spécifiques</h3>
                  <div className="space-y-2">
                    <button
                      onClick={testTrophyNotification}
                      disabled={isLoading}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      🏆 Trophée Débloqué
                    </button>
                    <button
                      onClick={testFriendNotification}
                      disabled={isLoading}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      👥 Demande d'Ami
                    </button>
                    <button
                      onClick={testRecipeNotification}
                      disabled={isLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      🍽️ Recette Partagée
                    </button>
                    <button
                      onClick={testCookingReminder}
                      disabled={isLoading}
                      className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                    >
                      ⏰ Rappel Cuisson
                    </button>
                  </div>
                </div>

                {/* Advanced Tests */}
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-3">Tests Avancés</h3>
                  <button
                    onClick={testMultipleNotifications}
                    disabled={isLoading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    📱 Multiple (3 notifications)
                  </button>
                </div>

                {/* Controls */}
                <div>
                  <h3 className="font-medium mb-3">Contrôles</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={clearAllNotifications}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      🗑️ Effacer Notifs
                    </button>
                    <button
                      onClick={clearLog}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
                    >
                      📝 Effacer Log
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Log */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6">📋 Journal des Tests</h2>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notificationLog.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Aucun test effectué
                  </div>
                ) : (
                  notificationLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        entry.success
                          ? 'bg-green-50 border-green-500'
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={entry.success ? 'text-green-600' : 'text-red-600'}>
                              {entry.success ? '✅' : '❌'}
                            </span>
                            <span className="font-medium">{entry.message}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {entry.timestamp} • Type: {entry.type}
                          </div>
                          {entry.result?.type && (
                            <div className="text-xs text-gray-600 mt-1">
                              Mode: {entry.result.type}
                              {entry.result.id && ` • ID: ${entry.result.id.substring(0, 8)}...`}
                            </div>
                          )}
                          {entry.result?.error && (
                            <div className="text-xs text-red-600 mt-1">
                              Erreur: {entry.result.error}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 rounded-xl p-6 mt-8">
            <h3 className="font-semibold text-blue-800 mb-3">ℹ️ Informations</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• <strong>Native</strong> : Utilise l'API Notification du navigateur</p>
              <p>• <strong>Fallback</strong> : Utilise les notifications intégrées à la page</p>
              <p>• Les notifications natives nécessitent une permission utilisateur</p>
              <p>• Les notifications fallback fonctionnent toujours</p>
              <p>• Les tests multiples montrent la gestion de plusieurs notifications simultanées</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
