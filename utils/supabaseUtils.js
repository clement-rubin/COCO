import { supabase } from '../lib/supabase'
import { logError, logDebug } from './logger'

/**
 * Safe single row query that handles 406 errors
 * @param {string} table - Table name
 * @param {string} select - Select clause
 * @param {Object} filters - Where filters
 * @returns {Promise<{data: any, error: any}>}
 */
export async function safeSingleQuery(table, select, filters) {
  try {
    let query = supabase.from(table).select(select)
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { data, error } = await query.limit(1)
    
    if (error) {
      logError(`Error in safeSingleQuery for ${table}`, error, { filters })
      return { data: null, error }
    }
    
    // Return single item or null
    return { 
      data: data && data.length > 0 ? data[0] : null, 
      error: null 
    }
  } catch (err) {
    logError(`Exception in safeSingleQuery for ${table}`, err, { filters })
    return { data: null, error: err }
  }
}

/**
 * Safe exists check that avoids 406 errors
 * @param {string} table - Table name
 * @param {Object} filters - Where filters
 * @returns {Promise<boolean>}
 */
export async function safeExistsQuery(table, filters) {
  try {
    const { data, error } = await safeSingleQuery(table, 'id', filters)
    
    if (error) {
      logError(`Error checking existence in ${table}`, error, { filters })
      return false
    }
    
    return !!data
  } catch (err) {
    logError(`Exception checking existence in ${table}`, err, { filters })
    return false
  }
}

/**
 * Safe count query
 * @param {string} table - Table name
 * @param {Object} filters - Where filters
 * @returns {Promise<number>}
 */
export async function safeCountQuery(table, filters) {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true })
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    const { count, error } = await query
    
    if (error) {
      logError(`Error in safeCountQuery for ${table}`, error, { filters })
      return 0
    }
    
    return count || 0
  } catch (err) {
    logError(`Exception in safeCountQuery for ${table}`, err, { filters })
    return 0
  }
}
