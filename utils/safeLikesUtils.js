import { logError } from './logger'

function toQueryString(params) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  return searchParams.toString()
}

async function fetchJson(url) {
  const response = await fetch(url)
  const responseText = await response.text()

  let data = {}
  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = {}
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(message)
  }

  return data
}

/**
 * Verify if a user liked a recipe using the API.
 * @param {string} recipeId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function safeCheckUserLike(recipeId, userId) {
  if (!recipeId || !userId) {
    return false
  }

  try {
    const query = toQueryString({
      mode: 'user_status',
      recipe_id: recipeId,
      user_id: userId
    })

    const data = await fetchJson(`/api/recipe-likes?${query}`)
    return Boolean(data.user_has_liked)
  } catch (err) {
    logError('Error checking user like safely', err, { recipeId, userId })
    return false
  }
}

/**
 * Count recipe likes using the API.
 * @param {string} recipeId
 * @returns {Promise<number>}
 */
export async function safeCountRecipeLikes(recipeId) {
  if (!recipeId) {
    return 0
  }

  try {
    const query = toQueryString({ recipe_id: recipeId })
    const data = await fetchJson(`/api/recipe-likes?${query}`)
    return Number(data.likes_count) || 0
  } catch (err) {
    logError('Error counting recipe likes safely', err, { recipeId })
    return 0
  }
}

/**
 * Get recipe like stats using the API.
 * @param {string} recipeId
 * @param {string | null} userId
 * @returns {Promise<{likes_count: number, user_has_liked: boolean}>}
 */
export async function safeGetRecipeLikesStats(recipeId, userId = null) {
  if (!recipeId) {
    return {
      likes_count: 0,
      user_has_liked: false
    }
  }

  try {
    const query = toQueryString({
      recipe_id: recipeId,
      user_id: userId
    })

    const data = await fetchJson(`/api/recipe-likes?${query}`)

    return {
      likes_count: Number(data.likes_count) || 0,
      user_has_liked: Boolean(data.user_has_liked)
    }
  } catch (err) {
    logError('Error getting recipe likes stats safely', err, { recipeId, userId })
    return {
      likes_count: 0,
      user_has_liked: false
    }
  }
}

/**
 * Get like details (who liked and when) for a recipe.
 * @param {string} recipeId
 * @param {number} limit
 * @returns {Promise<{success: boolean, likes: Array, total_count: number, error?: string}>}
 */
export async function getRecipeLikesDetails(recipeId, limit = 10) {
  if (!recipeId) {
    return {
      success: false,
      likes: [],
      total_count: 0,
      error: 'recipeId is required'
    }
  }

  try {
    const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10))
    const query = toQueryString({
      mode: 'details',
      recipe_id: recipeId,
      limit: safeLimit
    })

    const data = await fetchJson(`/api/recipe-likes?${query}`)

    return {
      success: true,
      likes: data.likes || [],
      total_count: Number(data.total_count) || 0
    }
  } catch (error) {
    logError('Error getting recipe likes details', error, { recipeId, limit })
    return {
      success: false,
      likes: [],
      total_count: 0,
      error: error.message
    }
  }
}

/**
 * Get like stats plus recent likers.
 * @param {string} recipeId
 * @param {string | null} userId
 * @returns {Promise<{likes_count: number, user_has_liked: boolean, recent_likers: Array, total_likers: number}>}
 */
export async function safeGetRecipeLikesWithDetails(recipeId, userId = null) {
  try {
    const [stats, details] = await Promise.all([
      safeGetRecipeLikesStats(recipeId, userId),
      getRecipeLikesDetails(recipeId, 5)
    ])

    return {
      likes_count: stats.likes_count,
      user_has_liked: stats.user_has_liked,
      recent_likers: details.success ? details.likes : [],
      total_likers: details.success ? details.total_count : 0
    }
  } catch (err) {
    logError('Error getting recipe likes with details safely', err, { recipeId, userId })
    return {
      likes_count: 0,
      user_has_liked: false,
      recent_likers: [],
      total_likers: 0
    }
  }
}
