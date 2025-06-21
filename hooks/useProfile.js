import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { logInfo, logError } from '../utils/logger'

/**
 * Hook for managing user profile data
 * @param {string} userId - Optional user ID. If not provided, uses authenticated user ID
 * @returns {Object} Profile data and functions
 */
export default function useProfile(userId = null) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const targetUserId = userId || user?.id

  // Load profile data
  const loadProfile = async () => {
    if (!targetUserId) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      logInfo('Loading user profile', { userId: targetUserId })
      
      // Fetch profile from database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single()
      
      if (error) {
        throw error
      }
      
      setProfile(data)
      logInfo('Profile loaded successfully', { 
        userId: targetUserId,
        hasProfile: !!data
      })
    } catch (err) {
      logError('Failed to load profile', err)
      setError(err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Update profile data
  const updateProfile = async (updates) => {
    if (!targetUserId) {
      throw new Error('No user ID available')
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new Error('Updates must be an object')
    }
    
    try {
      logInfo('Updating user profile', { 
        userId: targetUserId,
        fields: Object.keys(updates)
      })
      
      // Clean up updates to ensure no null values
      const cleanUpdates = { ...updates }
      
      // Add updated_at timestamp
      cleanUpdates.updated_at = new Date().toISOString()
      
      // Update profile in database
      const { data, error } = await supabase
        .from('profiles')
        .update(cleanUpdates)
        .eq('user_id', targetUserId)
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      setProfile(data)
      logInfo('Profile updated successfully', { userId: targetUserId })
      
      return { data, error: null }
    } catch (err) {
      logError('Failed to update profile', err)
      return { data: null, error: err }
    }
  }

  // Create a profile if it doesn't exist
  const ensureProfile = async (defaultData = {}) => {
    if (!targetUserId) {
      throw new Error('No user ID available')
    }
    
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .single()
      
      // If profile exists, no action needed
      if (existingProfile) {
        return { created: false, profile: existingProfile }
      }
      
      // Create default profile data
      const defaultProfile = {
        user_id: targetUserId,
        display_name: defaultData.display_name || user?.email?.split('@')[0] || 'Utilisateur',
        bio: defaultData.bio || null,
        is_private: defaultData.is_private || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([defaultProfile])
        .select()
        .single()
      
      if (createError) {
        throw createError
      }
      
      // Update local state
      setProfile(newProfile)
      
      logInfo('Profile created successfully', { userId: targetUserId })
      return { created: true, profile: newProfile }
    } catch (err) {
      logError('Failed to create profile', err)
      throw err
    }
  }

  // Load profile on mount or when userId changes
  useEffect(() => {
    if (targetUserId) {
      loadProfile()
    }
  }, [targetUserId])

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    ensureProfile
  }
}