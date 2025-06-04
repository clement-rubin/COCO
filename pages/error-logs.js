import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()

  const fetchLogs = async (pageNum = 0, reset = false) => {
    try {
      setLoading(true)
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
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
      'RECIPE_LOAD_ERROR': 'bg-red-100 text-red-800',
      'IMAGE_UPLOAD_ERROR': 'bg-orange-100 text-orange-800',
      'DATABASE_ERROR': 'bg-purple-100 text-purple-800',
      'VALIDATION_ERROR': 'bg-yellow-100 text-yellow-800',
      'NETWORK_ERROR': 'bg-blue-100 text-blue-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Logs d'erreurs
              </h1>
              <p className="mt-2 text-gray-600">
                Suivi des erreurs de chargement des recettes et autres problèmes
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Retour
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher
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
                Type d'erreur
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les types</option>
                <option value="RECIPE_LOAD_ERROR">Erreurs de chargement</option>
                <option value="IMAGE_UPLOAD_ERROR">Erreurs d'image</option>
                <option value="DATABASE_ERROR">Erreurs de base de données</option>
                <option value="VALIDATION_ERROR">Erreurs de validation</option>
                <option value="NETWORK_ERROR">Erreurs réseau</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Logs list */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {loading ? 'Chargement des logs...' : 'Aucun log d\'erreur trouvé'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getErrorTypeColor(log.error_type)}`}>
                          {log.error_type}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {log.message}
                      </h3>
                      
                      {log.details && (
                        <div className="bg-gray-50 p-3 rounded-md mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">
                            Détails:
                          </h4>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div className="flex space-x-4 text-xs text-gray-500">
                        {log.user_agent && (
                          <span>User Agent: {log.user_agent.substring(0, 50)}...</span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
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
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Charger plus de logs
              </button>
            </div>
          )}
          
          {loading && logs.length > 0 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">Chargement...</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">
            Total: {filteredLogs.length} log(s) affiché(s)
            {filter && ` (filtré par "${filter}")`}
            {typeFilter && ` (type: ${typeFilter})`}
          </p>
        </div>
      </div>
    </div>
  )
}
