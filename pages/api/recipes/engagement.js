import { logInfo, logError, logDebug } from '../../../utils/logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase credentials are not configured')
  }

  const { createClient } = await import('@supabase/supabase-js')

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Méthode non autorisée'
    })
  }

  const requestId = `recipes-engagement-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

  try {
    const rawIds = req.query.recipe_ids || req.query.ids || ''
    const recipeIds = Array.isArray(rawIds)
      ? rawIds.flatMap(value => String(value).split(',')).map(id => id.trim()).filter(Boolean)
      : String(rawIds)
          .split(',')
          .map(id => id.trim())
          .filter(Boolean)

    logDebug('Aggregated engagement requested', {
      requestId,
      rawIds,
      recipeIdsCount: recipeIds.length
    })

    if (recipeIds.length === 0) {
      return res.status(400).json({
        error: 'Paramètre manquant',
        message: 'recipe_ids est requis',
        requestId
      })
    }

    const supabaseAdmin = await getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('recipes')
      .select('id, likes_count, comments_count')
      .in('id', recipeIds)

    if (error) {
      throw error
    }

    const aggregated = {}
    for (const recipe of data || []) {
      aggregated[recipe.id] = {
        likes_count: recipe.likes_count ?? 0,
        comments_count: recipe.comments_count ?? 0,
        user_has_liked: false
      }
    }

    // Ensure we return entries for each requested id to simplify consumers
    for (const recipeId of recipeIds) {
      if (!aggregated[recipeId]) {
        aggregated[recipeId] = {
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false
        }
      }
    }

    logInfo('Aggregated engagement served', {
      requestId,
      recipeIds: recipeIds.slice(0, 5),
      returnedCount: Object.keys(aggregated).length
    })

    return res.status(200).json(aggregated)
  } catch (error) {
    logError('Failed to aggregate engagement stats', error, { requestId })
    return res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques',
      message: error?.message || 'Erreur inconnue',
      requestId
    })
  }
}
