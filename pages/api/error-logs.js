import { supabase } from '../../lib/supabase'
import { logInfo, logError } from '../../utils/logger'

export default async function handler(req, res) {
  // En-têtes CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  try {
    const { type, limit = 100, offset = 0 } = req.query

    logInfo('Récupération des logs d\'erreur', {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })

    // Requête pour récupérer les logs d'erreur
    // Supposons une table 'error_logs' ou utilisons une vue des logs système
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    // Filtrer par type si spécifié
    if (type) {
      query = query.eq('error_type', type)
    }

    const { data, error, count } = await query

    if (error) {
      logError('Erreur lors de la récupération des logs', error)
      return res.status(500).json({ 
        error: 'Erreur lors de la récupération des logs d\'erreur' 
      })
    }

    // Si la table n'existe pas, créer des logs fictifs pour la démo
    if (!data) {
      const mockLogs = [
        {
          id: 1,
          error_type: 'RECIPE_LOAD_ERROR',
          message: 'Erreur lors du chargement des recettes pour l\'utilisateur',
          details: { user_id: 'user123', error: 'Database timeout' },
          created_at: new Date().toISOString(),
          user_agent: 'Mozilla/5.0...',
          ip_address: '192.168.1.1'
        },
        {
          id: 2,
          error_type: 'IMAGE_UPLOAD_ERROR',
          message: 'Image trop volumineuse lors de l\'upload',
          details: { size: '2MB', max_size: '500KB' },
          created_at: new Date(Date.now() - 86400000).toISOString(),
          user_agent: 'Mozilla/5.0...',
          ip_address: '192.168.1.2'
        }
      ]

      return res.status(200).json({
        logs: mockLogs,
        total: mockLogs.length,
        hasMore: false
      })
    }

    res.status(200).json({
      logs: data,
      total: count,
      hasMore: (parseInt(offset) + parseInt(limit)) < count
    })

  } catch (error) {
    logError('Erreur inattendue dans l\'API error-logs', error)
    res.status(500).json({
      error: 'Erreur serveur interne',
      message: error.message
    })
  }
}
