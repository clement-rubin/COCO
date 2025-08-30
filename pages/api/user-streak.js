import { supabase } from '../../lib/supabase'
import { logError, logInfo } from '../../utils/logger'

const REWARDS = [20, 25, 30, 40, 50, 60, 100] // Récompenses croissantes

export default async function handler(req, res) {
  const requestId = `streak-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
  
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { user_id } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const today = new Date().toISOString().slice(0, 10)

    // Récupérer les données actuelles de l'utilisateur
    const { data: currentData, error: fetchError } = await supabase
      .from('user_pass')
      .select('last_claimed, streak, coins')
      .eq('user_id', user_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logError('Error fetching user streak data', fetchError, { requestId, user_id })
      return res.status(500).json({ error: 'Failed to fetch user data' })
    }

    // Si pas de données, créer l'entrée
    if (!currentData) {
      const { error: createError } = await supabase
        .from('user_pass')
        .insert({
          user_id,
          streak: 0,
          last_claimed: null,
          coins: 250,
          created_at: new Date().toISOString()
        })

      if (createError) {
        logError('Error creating user streak data', createError, { requestId, user_id })
        return res.status(500).json({ error: 'Failed to create user data' })
      }

      return res.status(200).json({
        streak: 0,
        lastClaimed: null,
        coins: 250,
        canClaim: true,
        nextReward: REWARDS[0]
      })
    }

    // Vérifier si l'utilisateur a déjà récupéré aujourd'hui
    if (currentData.last_claimed === today) {
      logInfo('User already claimed streak today', { requestId, user_id, today })
      return res.status(200).json({
        streak: currentData.streak || 0,
        lastClaimed: currentData.last_claimed,
        coins: currentData.coins || 0,
        canClaim: false,
        message: 'Already claimed today'
      })
    }

    // Calculer le nouveau streak
    const isYesterday = (dateStr) => {
      if (!dateStr) return false
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      return dateStr === yesterday
    }

    const currentStreak = currentData.streak || 0
    const lastClaimedFromDB = currentData.last_claimed
    const currentCoins = currentData.coins || 0

    const newStreak = !lastClaimedFromDB ? 1 : // Première fois
                     isYesterday(lastClaimedFromDB) ? currentStreak + 1 : // Continuité
                     1 // Rupture, on recommence

    // Calculer la récompense
    const rewardIndex = Math.min(newStreak - 1, REWARDS.length - 1)
    const reward = REWARDS[rewardIndex]
    const newCoins = currentCoins + reward

    // Mise à jour avec vérification de concurrence
    const { error: updateError } = await supabase
      .from('user_pass')
      .update({
        last_claimed: today,
        streak: newStreak,
        coins: newCoins,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('last_claimed', lastClaimedFromDB) // Vérification de concurrence

    if (updateError) {
      logError('Error updating user streak', updateError, { requestId, user_id })
      
      // Si erreur de concurrence, informer le client
      if (updateError.code === '23505' || updateError.message?.includes('duplicate')) {
        return res.status(409).json({ 
          error: 'Streak already claimed today',
          streak: currentStreak,
          lastClaimed: currentData.last_claimed,
          coins: currentCoins,
          canClaim: false
        })
      }
      
      return res.status(500).json({ error: 'Failed to update streak' })
    }

    logInfo('Streak claimed successfully', {
      requestId,
      user_id,
      oldStreak: currentStreak,
      newStreak,
      reward,
      newCoins
    })

    return res.status(200).json({
      streak: newStreak,
      lastClaimed: today,
      coins: newCoins,
      reward,
      canClaim: false,
      message: `Streak claimed! +${reward} CocoCoins`
    })

  } catch (error) {
    logError('Unexpected error in user-streak API', error, { requestId })
    return res.status(500).json({
      error: 'Internal server error',
      requestId
    })
  }
}
