import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { logUserInteraction, logError, logInfo } from '../utils/logger'

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [stats, setStats] = useState({})
  const router = useRouter()

  const fetchLogs = async (pageNum = 0, reset = false) => {
    try {
      setLoading(true)
      logInfo('Fetching error logs', { page: pageNum, reset, typeFilter })
      
      const params = new URLSearchParams({
        limit: '50',
        offset: (pageNum * 50).toString()
      })
      
      if (typeFilter) {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/error-logs?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement des logs')
      }

      if (reset) {
        setLogs(data.logs || [])
      } else {
        setLogs(prev => [...prev, ...(data.logs || [])])
      }
      
      setHasMore(data.hasMore || false)
      setError(null)

      // Calculate stats
      const allLogs = reset ? data.logs : [...logs, ...data.logs]
      const newStats = calculateStats(allLogs)
      setStats(newStats)

      logUserInteraction('VIEW_ERROR_LOGS', 'error-logs-page', {
        logsCount: data.logs?.length || 0,
        totalLogs: allLogs.length,
        hasMore: data.hasMore,
        typeFilter
      })
      
    } catch (err) {
      logError('Error fetching logs', err, { page: pageNum, typeFilter })
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (allLogs) => {
    const stats = {
      total: allLogs.length,
      byType: {},
      bySeverity: {},
      recent24h: 0,
      recentHour: 0
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000)

    allLogs.forEach(log => {
      // Count by type
      stats.byType[log.error_type] = (stats.byType[log.error_type] || 0) + 1
      
      // Count by severity
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
      
      // Count recent errors
      const logTime = new Date(log.timestamp)
      if (logTime > last24h) stats.recent24h++
      if (logTime > lastHour) stats.recentHour++
    })

    return stats
  }

  useEffect(() => {
    fetchLogs(0, true)
    setPage(0)
  }, [typeFilter])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(nextPage, false)
  }

  const filteredLogs = logs.filter(log => 
    !filter || 
    log.message?.toLowerCase().includes(filter.toLowerCase()) ||
    log.error_type?.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(log.details || {}).toLowerCase().includes(filter.toLowerCase())
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR')
  }

  const getErrorTypeColor = (type) => {
    const colors = {
      'SERVER_ERROR': 'bg-red-100 text-red-800 border-red-200',
      'RECIPE_LOAD_ERROR': 'bg-orange-100 text-orange-800 border-orange-200',
      'DATABASE_ERROR': 'bg-purple-100 text-purple-800 border-purple-200',
      'IMAGE_UPLOAD_ERROR': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'AUTHENTICATION_ERROR': 'bg-blue-100 text-blue-800 border-blue-200',
      'NETWORK_ERROR': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      'high': 'text-red-600',
      'medium': 'text-yellow-600',
      'low': 'text-green-600'
    }
    return colors[severity] || 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Logs d'erreurs - COCO</title>
        <meta name="description" content="Suivi des erreurs système et de chargement" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🐛 Logs d'erreurs
              </h1>
              <p className="mt-2 text-gray-600">
                Suivi des erreurs de chargement des recettes et autres problèmes système
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Retour
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats.total > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total des erreurs</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-red-600">{stats.bySeverity.high || 0}</div>
              <div className="text-sm text-gray-600">Erreurs critiques</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">{stats.recent24h}</div>
              <div className="text-sm text-gray-600">Dernières 24h</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">{stats.recentHour}</div>
              <div className="text-sm text-gray-600">Dernière heure</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Rechercher
              </label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher dans les messages, types d'erreur..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📂 Type d'erreur
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les types</option>
                <option value="SERVER_ERROR">🔴 Erreurs serveur</option>
                <option value="RECIPE_LOAD_ERROR">🍽️ Erreurs de recettes</option>
                <option value="DATABASE_ERROR">🗄️ Erreurs de base de données</option>
                <option value="IMAGE_UPLOAD_ERROR">📷 Erreurs d'images</option>
                <option value="AUTHENTICATION_ERROR">🔐 Erreurs d'authentification</option>
                <option value="NETWORK_ERROR">📡 Erreurs réseau</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Logs list */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-500 text-lg">
                {loading ? '🔄 Chargement des logs...' : '✨ Aucune erreur trouvée - Système stable !'}
              </p>
              {!loading && (
                <button
                  onClick={() => fetchLogs(0, true)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  🔄 Actualiser
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getErrorTypeColor(log.error_type)}`}>
                          {log.error_type?.replace('_', ' ')}
                        </span>
                        <span className={`text-sm font-medium ${getSeverityColor(log.severity)}`}>
                          {log.severity?.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          🕐 {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {log.message}
                      </h3>
                      
                      {log.details && (
                        <div className="bg-gray-50 p-4 rounded-md mb-3 border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.details.status && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">📊 Status:</span>
                                <span className="ml-2 text-sm text-gray-600">{log.details.status}</span>
                              </div>
                            )}
                            {log.details.url && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">🔗 URL:</span>
                                <span className="ml-2 text-sm text-gray-600 font-mono">{log.details.url}</span>
                              </div>
                            )}
                            {log.details.method && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">🔧 Méthode:</span>
                                <span className="ml-2 text-sm text-gray-600 font-mono">{log.details.method}</span>
                              </div>
                            )}
                            {log.details.context?.operation && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">⚙️ Opération:</span>
                                <span className="ml-2 text-sm text-gray-600">{log.details.context.operation}</span>
                              </div>
                            )}
                          </div>
                          
                          {log.details.stack && (
                            <details className="mt-3">
                              <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                                📋 Stack trace
                              </summary>
                              <pre className="mt-2 text-xs text-gray-600 bg-white p-3 rounded border overflow-auto max-h-32">
                                {log.details.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                      
                      <div className="flex space-x-4 text-xs text-gray-500">
                        {log.user_agent && (
                          <span>🌐 {log.user_agent.substring(0, 50)}...</span>
                        )}
                        {log.ip_address && (
                          <span>📍 {log.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Load more button */}
          {hasMore && !loading && (
            <div className="p-4 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                📄 Charger plus de logs
              </button>
            </div>
          )}
          
          {loading && logs.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">🔄 Chargement...</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">
            📊 Total: {filteredLogs.length} log(s) affiché(s)
            {filter && ` (filtré par "${filter}")`}
            {typeFilter && ` (type: ${typeFilter.replace('_', ' ')})`}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            💡 Les logs sont automatiquement collectés pour diagnostiquer les problèmes système
          </p>
        </div>
      </div>
    </div>
  )
}
