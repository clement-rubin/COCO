import { createClient } from '@supabase/supabase-js'
import { logInfo, logError, logDebug } from '../../utils/logger'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

function parseRecipeIds(rawValue) {
  if (!rawValue) return []
  if (Array.isArray(rawValue)) {
    return rawValue
      .flatMap(v => String(v).split(','))
      .map(v => v.trim())
      .filter(Boolean)
  }

  return String(rawValue)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Supabase credentials are not configured')
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

async function getRecipeLikeStats(admin, recipeId, userId = null) {
  const { count, error: countError } = await admin
    .from('recipe_likes')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId)

  if (countError) {
    throw countError
  }

  let userHasLiked = false
  if (isUuid(userId)) {
    const { count: userCount, error: userError } = await admin
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)

    if (userError) {
      throw userError
    }

    userHasLiked = (userCount || 0) > 0
  }

  return {
    likes_count: count || 0,
    user_has_liked: userHasLiked
  }
}

async function handleGet(req, res, admin, requestId) {
  const { recipe_id, recipe_ids, user_id, mode } = req.query

  if (mode === 'user_status') {
    if (!isUuid(recipe_id) || !isUuid(user_id)) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        message: 'recipe_id et user_id (UUID) sont requis pour mode=user_status',
        requestId
      })
    }

    const { count, error } = await admin
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipe_id)
      .eq('user_id', user_id)

    if (error) {
      throw error
    }

    return res.status(200).json({
      user_has_liked: (count || 0) > 0
    })
  }

  if (mode === 'details') {
    if (!isUuid(recipe_id)) {
      return res.status(400).json({
        error: 'Paramètre invalide',
        message: 'recipe_id (UUID) est requis pour mode=details',
        requestId
      })
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50)

    const { data: likesRows, error: likesError } = await admin
      .from('recipe_likes')
      .select('id, user_id, created_at, liked_at')
      .eq('recipe_id', recipe_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (likesError) {
      throw likesError
    }

    const { count: totalCount, error: totalError } = await admin
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipe_id)

    if (totalError) {
      throw totalError
    }

    const uniqueUserIds = [...new Set((likesRows || []).map(row => row.user_id).filter(Boolean))]
    let profilesByUserId = new Map()

    if (uniqueUserIds.length > 0) {
      const { data: profilesRows, error: profilesError } = await admin
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', uniqueUserIds)

      if (!profilesError) {
        profilesByUserId = new Map((profilesRows || []).map(row => [row.user_id, row]))
      }
    }

    const likes = (likesRows || []).map(row => {
      const profile = profilesByUserId.get(row.user_id)
      return {
        id: row.id,
        user_id: row.user_id,
        user_name: profile?.display_name || 'Utilisateur',
        avatar_url: profile?.avatar_url || null,
        created_at: row.created_at || row.liked_at
      }
    })

    return res.status(200).json({
      likes,
      total_count: totalCount || 0
    })
  }

  if (recipe_ids) {
    const ids = parseRecipeIds(recipe_ids).filter(isUuid)
    if (ids.length === 0) {
      return res.status(400).json({
        error: 'Paramètre invalide',
        message: 'recipe_ids doit contenir au moins un UUID valide',
        requestId
      })
    }

    const { data: likesRows, error: likesError } = await admin
      .from('recipe_likes')
      .select('recipe_id, user_id')
      .in('recipe_id', ids)

    if (likesError) {
      throw likesError
    }

    const likeSetByRecipe = new Map()
    for (const id of ids) {
      likeSetByRecipe.set(id, { likes_count: 0, user_has_liked: false })
    }

    for (const row of likesRows || []) {
      const entry = likeSetByRecipe.get(row.recipe_id)
      if (!entry) continue
      entry.likes_count += 1
      if (isUuid(user_id) && row.user_id === user_id) {
        entry.user_has_liked = true
      }
    }

    const responsePayload = {}
    for (const [id, value] of likeSetByRecipe.entries()) {
      responsePayload[id] = value
    }

    return res.status(200).json(responsePayload)
  }

  if (recipe_id) {
    if (!isUuid(recipe_id)) {
      return res.status(400).json({
        error: 'Paramètre invalide',
        message: 'recipe_id doit être un UUID valide',
        requestId
      })
    }

    const stats = await getRecipeLikeStats(admin, recipe_id, user_id)
    return res.status(200).json(stats)
  }

  return res.status(400).json({
    error: 'Paramètre manquant',
    message: 'recipe_id, recipe_ids ou mode est requis',
    requestId
  })
}

async function handlePost(req, res, admin, requestId) {
  const { recipe_id, user_id } = req.body || {}

  if (!isUuid(recipe_id) || !isUuid(user_id)) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      message: 'recipe_id et user_id doivent être des UUID valides',
      requestId
    })
  }

  const { data: existingLike, error: existingError } = await admin
    .from('recipe_likes')
    .select('id')
    .eq('recipe_id', recipe_id)
    .eq('user_id', user_id)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError
  }

  if (!existingLike) {
    const { error: insertError } = await admin
      .from('recipe_likes')
      .insert([
        {
          recipe_id,
          user_id,
          created_at: new Date().toISOString()
        }
      ])

    if (insertError && insertError.code !== '23505') {
      throw insertError
    }
  }

  const stats = await getRecipeLikeStats(admin, recipe_id, user_id)

  return res.status(existingLike ? 200 : 201).json({
    success: true,
    stats,
    requestId
  })
}

async function handleDelete(req, res, admin, requestId) {
  const { recipe_id, user_id } = req.query

  if (!isUuid(recipe_id) || !isUuid(user_id)) {
    return res.status(400).json({
      error: 'Paramètres invalides',
      message: 'recipe_id et user_id doivent être des UUID valides',
      requestId
    })
  }

  const { error: deleteError } = await admin
    .from('recipe_likes')
    .delete()
    .eq('recipe_id', recipe_id)
    .eq('user_id', user_id)

  if (deleteError) {
    throw deleteError
  }

  const stats = await getRecipeLikeStats(admin, recipe_id, user_id)

  return res.status(200).json({
    success: true,
    stats: {
      likes_count: stats.likes_count,
      user_has_liked: false
    },
    requestId
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error: 'Service non configur�',
      message: "Variables d'environnement Supabase manquantes"
    })
  }

  const requestId = `like-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  const startTime = Date.now()

  try {
    const admin = getAdminClient()

    logDebug('Recipe likes API request', {
      requestId,
      method: req.method,
      query: req.query,
      hasBody: !!req.body
    })

    if (req.method === 'GET') {
      return await handleGet(req, res, admin, requestId)
    }

    if (req.method === 'POST') {
      return await handlePost(req, res, admin, requestId)
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res, admin, requestId)
    }

    return res.status(405).json({
      error: 'Méthode non autorisée',
      requestId
    })
  } catch (error) {
    logError('Recipe likes API error', error, {
      requestId,
      method: req.method,
      query: req.query,
      durationMs: Date.now() - startTime
    })

    return res.status(500).json({
      error: 'Erreur serveur',
      message: error?.message || 'Erreur inconnue',
      requestId
    })
  } finally {
    logInfo('Recipe likes API request completed', {
      requestId,
      method: req.method,
      durationMs: Date.now() - startTime
    })
  }
}
