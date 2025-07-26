import { logError, logDebug, logInfo } from './logger'

/**
 * Get comments for a recipe
 * @param {string} recipeId 
 * @param {number} limit 
 * @param {number} offset 
 * @returns {Promise<{success: boolean, comments?: any[], error?: string}>}
 */
export async function getRecipeComments(recipeId, limit = 20, offset = 0) {
  const requestId = `get-comments-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
    logDebug('Getting recipe comments', {
      requestId,
      recipeId,
      limit,
      offset
    })

    const response = await fetch(`/api/comments?recipe_id=${recipeId}&limit=${limit}&offset=${offset}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`)
    }

    if (result.success) {
      logInfo('Recipe comments retrieved successfully', {
        requestId,
        recipeId,
        commentsCount: result.comments?.length || 0,
        totalCount: result.pagination?.total || 0
      })

      return {
        success: true,
        comments: result.comments || [],
        pagination: result.pagination
      }
    } else {
      throw new Error(result.message || 'Unknown error')
    }

  } catch (error) {
    logError('Error getting recipe comments', error, {
      requestId,
      recipeId,
      limit,
      offset
    })

    return {
      success: false,
      error: error.message || 'Failed to load comments'
    }
  }
}

/**
 * Add a comment to a recipe
 * @param {string} recipeId 
 * @param {string} userId 
 * @param {string} text 
 * @param {string} userName 
 * @returns {Promise<{success: boolean, comment?: any, error?: string}>}
 */
export async function addRecipeComment(recipeId, userId, text, userName) {
  const requestId = `add-comment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
    logDebug('Adding recipe comment', {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      textLength: text?.length
    })

    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipe_id: recipeId,
        user_id: userId,
        text: text.trim(),
        user_name: userName
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`)
    }

    if (result.success) {
      logInfo('Recipe comment added successfully', {
        requestId,
        recipeId,
        commentId: result.comment?.id,
        userId: userId?.substring(0, 8) + '...'
      })

      return {
        success: true,
        comment: result.comment,
        recipe: result.recipe
      }
    } else {
      throw new Error(result.message || 'Unknown error')
    }

  } catch (error) {
    logError('Error adding recipe comment', error, {
      requestId,
      recipeId,
      userId: userId?.substring(0, 8) + '...',
      textLength: text?.length
    })

    return {
      success: false,
      error: error.message || 'Failed to add comment'
    }
  }
}

/**
 * Delete a comment
 * @param {string} commentId 
 * @param {string} userId 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteRecipeComment(commentId, userId) {
  const requestId = `delete-comment-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
    logDebug('Deleting recipe comment', {
      requestId,
      commentId,
      userId: userId?.substring(0, 8) + '...'
    })

    const response = await fetch(`/api/comments?comment_id=${commentId}&user_id=${userId}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`)
    }

    if (result.success) {
      logInfo('Recipe comment deleted successfully', {
        requestId,
        commentId,
        userId: userId?.substring(0, 8) + '...'
      })

      return {
        success: true
      }
    } else {
      throw new Error(result.message || 'Unknown error')
    }

  } catch (error) {
    logError('Error deleting recipe comment', error, {
      requestId,
      commentId,
      userId: userId?.substring(0, 8) + '...'
    })

    return {
      success: false,
      error: error.message || 'Failed to delete comment'
    }
  }
}

/**
 * Format comment date for display
 * @param {string} dateString 
 * @returns {string}
 */
export function formatCommentDate(dateString) {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'À l\'instant'
    if (diffMinutes < 60) return `${diffMinutes}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  } catch (error) {
    logError('Error formatting comment date', error, { dateString })
    return 'Date inconnue'
  }
}
