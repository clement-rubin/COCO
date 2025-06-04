import { supabase } from '../../lib/supabase'
import { logInfo, logError, logWarning } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    logInfo('Traitement requête error-logs', {
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })

    if (req.method === 'GET') {
      const { type, limit = 100, offset = 0 } = req.query

      logInfo('Récupération des logs d\'erreur', {
        type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      })

      // Generate sample error logs that represent common 500 errors
      const sampleErrorLogs = [
        {
          id: 'error_' + Date.now() + '_1',
          timestamp: new Date().toISOString(),
          error_type: 'SERVER_ERROR',
          message: 'Erreur HTTP: 500 - Internal Server Error',
          details: {
            status: 500,
            url: '/api/recipes',
            method: 'GET',
            context: {
              operation: 'fetch_user_recipes',
              user_id: 'authenticated_user'
            },
            stack: 'Error: Internal Server Error\n    at handler (/api/recipes.js:45:10)\n    at processTicksAndRejections',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          severity: 'high',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip_address: '192.168.1.100'
        },
        {
          id: 'error_' + (Date.now() - 300000) + '_2',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          error_type: 'DATABASE_ERROR',
          message: 'Supabase connection timeout',
          details: {
            status: 500,
            url: '/api/recipes',
            method: 'POST',
            context: {
              operation: 'create_recipe',
              table: 'recipes'
            },
            stack: 'Error: Connection timeout\n    at SupabaseClient.query',
            code: 'PGRST301'
          },
          severity: 'high',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ip_address: '192.168.1.101'
        },
        {
          id: 'error_' + (Date.now() - 600000) + '_3',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          error_type: 'RECIPE_LOAD_ERROR',
          message: 'Failed to parse recipe data',
          details: {
            status: 500,
            url: '/api/recipes',
            method: 'GET',
            context: {
              operation: 'parse_recipe_ingredients',
              recipeId: 'recipe_123'
            },
            stack: 'SyntaxError: Unexpected token in JSON at position 45',
            originalError: 'JSON.parse error'
          },
          severity: 'medium',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
          ip_address: '192.168.1.102'
        },
        {
          id: 'error_' + (Date.now() - 900000) + '_4',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          error_type: 'IMAGE_UPLOAD_ERROR',
          message: 'Storage bucket upload failed',
          details: {
            status: 500,
            url: '/api/upload',
            method: 'POST',
            context: {
              operation: 'upload_recipe_image',
              bucketName: 'recipe-images',
              fileSize: '2.1MB'
            },
            stack: 'Error: Bucket policy violation\n    at StorageApi.upload',
            supabaseError: 'Row level security policy violation'
          },
          severity: 'medium',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          ip_address: '192.168.1.103'
        },
        {
          id: 'error_' + (Date.now() - 1200000) + '_5',
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          error_type: 'AUTHENTICATION_ERROR',
          message: 'JWT token validation failed',
          details: {
            status: 500,
            url: '/api/recipes',
            method: 'POST',
            context: {
              operation: 'verify_user_token',
              tokenPresent: true
            },
            stack: 'Error: Invalid JWT signature\n    at AuthClient.verify',
            authError: 'Token signature verification failed'
          },
          severity: 'high',
          user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          ip_address: '192.168.1.104'
        }
      ]

      // Filter by type if specified
      let filteredLogs = sampleErrorLogs
      if (type) {
        filteredLogs = sampleErrorLogs.filter(log => log.error_type === type)
      }

      // Apply pagination
      const startIndex = parseInt(offset)
      const endIndex = startIndex + parseInt(limit)
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
      const hasMore = endIndex < filteredLogs.length

      logInfo('Logs d\'erreur récupérés', {
        totalLogs: filteredLogs.length,
        returnedLogs: paginatedLogs.length,
        hasMore,
        type: type || 'all'
      })

      res.status(200).json({
        logs: paginatedLogs,
        total: filteredLogs.length,
        hasMore: hasMore,
        pagination: {
          offset: parseInt(offset),
          limit: parseInt(limit),
          total: filteredLogs.length
        }
      })
      return
    }

    if (req.method === 'POST') {
      // Handle error log submission from client
      const errorData = req.body

      logError('Client error reported', new Error(errorData.message), {
        clientErrorId: errorData.id,
        errorType: errorData.error_type,
        severity: errorData.severity,
        clientContext: errorData.context,
        userAgent: req.headers['user-agent'],
        ip: req.connection?.remoteAddress || req.headers['x-forwarded-for']
      })

      res.status(201).json({
        message: 'Error log saved successfully',
        id: errorData.id || `server_error_${Date.now()}`
      })
      return
    }

    res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    logError('Erreur dans l\'API error-logs', error, {
      method: req.method,
      query: req.query,
      url: req.url
    })
    
    res.status(500).json({
      error: 'Erreur serveur interne',
      message: error.message,
      timestamp: new Date().toISOString(),
      reference: `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    })
  }
}
