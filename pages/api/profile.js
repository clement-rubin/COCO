import { supabase } from '../../lib/supabase'
import { logError, logInfo, logApiCall } from '../../utils/logger'

export default async function handler(req, res) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(2, 15)
  
  try {
    logApiCall(req.method, '/api/profile', req.body || req.query, null)
    
    if (req.method === 'GET') {
      return await handleGetProfile(req, res, requestId)
    } else if (req.method === 'PUT') {
      return await handleUpdateProfile(req, res, requestId)
    } else {
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logError('Erreur dans l\'API profile', error, {
      requestId,
      method: req.method,
      url: req.url,
      responseTime,
      query: req.query,
      body: req.body
    })
    
    return res.status(500).json({
      error: 'Erreur serveur interne',
      message: error.message,
      reference: `profile-api-${Date.now()}-${requestId}`,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleGetProfile(req, res, requestId) {
  const { user_id } = req.query
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      logError('Erreur récupération profil', error, { requestId, user_id })
      throw new Error(`Erreur lors de la récupération du profil: ${error.message}`)
    }
    
    logInfo('Profil récupéré', {
      requestId,
      user_id: user_id.substring(0, 8) + '...',
      hasProfile: !!profile
    })
    
    return res.status(200).json(profile || {})
    
  } catch (error) {
    logError('Erreur dans handleGetProfile', error, { requestId, user_id })
    throw error
  }
}

async function handleUpdateProfile(req, res, requestId) {
  const { user_id, display_name, bio } = req.body
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        user_id,
        display_name: display_name || null,
        bio: bio || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      logError('Erreur mise à jour profil', error, { requestId, user_id })
      throw new Error(`Erreur lors de la mise à jour du profil: ${error.message}`)
    }
    
    logInfo('Profil mis à jour', {
      requestId,
      user_id: user_id.substring(0, 8) + '...',
      profileId: profile.id
    })
    
    return res.status(200).json(profile)
    
  } catch (error) {
    logError('Erreur dans handleUpdateProfile', error, { requestId, user_id })
    throw error
  }
}
