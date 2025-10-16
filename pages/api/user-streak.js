import { supabase } from '../../lib/supabase'
import { logError, logInfo } from '../../utils/logger'

const BASE_REWARD = 20
const LOOKBACK_DAYS = 30

const toISODate = (date) => date.toISOString().slice(0, 10)

const computePublicationStreak = (publicationDates, referenceDate = new Date()) => {
  const cursor = new Date(referenceDate)
  let streak = 0

  while (publicationDates.has(toISODate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

const calculateReward = (streak) => (streak >= 2 ? (streak - 1) * BASE_REWARD : 0)

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

    const todayDate = new Date()
    const today = toISODate(todayDate)

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
    let userPassData = currentData

    if (!userPassData) {
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

      userPassData = { streak: 0, last_claimed: null, coins: 250 }
    }

    // Vérifier si l'utilisateur a déjà récupéré aujourd'hui
    if (userPassData.last_claimed === today) {
      logInfo('User already claimed streak today', { requestId, user_id, today })
      return res.status(200).json({
        streak: userPassData.streak || 0,
        lastClaimed: userPassData.last_claimed,
        coins: userPassData.coins || 0,
        canClaim: false,
        message: 'Already claimed today'
      })
    }

    const lookbackStart = new Date(todayDate)
    lookbackStart.setDate(lookbackStart.getDate() - LOOKBACK_DAYS)

    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select('created_at')
      .eq('user_id', user_id)
      .gte('created_at', lookbackStart.toISOString())

    if (recipesError) {
      logError('Error fetching publications for streak', recipesError, { requestId, user_id })
      return res.status(500).json({ error: 'Failed to compute publication streak' })
    }

    const publicationDates = new Set(
      (recipesData || [])
        .map((row) => {
          try {
            return toISODate(new Date(row.created_at))
          } catch (error) {
            logError('Error parsing publication date', error, { requestId, user_id, created_at: row.created_at })
            return null
          }
        })
        .filter(Boolean)
    )

    const publicationStreak = computePublicationStreak(publicationDates, todayDate)

    if (publicationStreak < 2) {
      const message = publicationStreak === 0
        ? "Publiez une recette aujourd'hui pour démarrer votre série."
        : 'Publiez encore demain pour débloquer la récompense de 20 CocoCoins.'

      return res.status(403).json({
        error: 'Publication streak too low',
        message,
        streak: publicationStreak,
        lastClaimed: userPassData.last_claimed,
        coins: userPassData.coins || 0,
        canClaim: false
      })
    }

    const reward = calculateReward(publicationStreak)
    const currentCoins = userPassData.coins || 0
    const newCoins = currentCoins + reward

    // Mise à jour avec vérification de concurrence
    let updateQuery = supabase
      .from('user_pass')
      .update({
        last_claimed: today,
        streak: publicationStreak,
        coins: newCoins,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)

    if (userPassData.last_claimed) {
      updateQuery = updateQuery.eq('last_claimed', userPassData.last_claimed)
    } else {
      updateQuery = updateQuery.is('last_claimed', null)
    }

    const { error: updateError } = await updateQuery

    if (updateError) {
      logError('Error updating user streak', updateError, { requestId, user_id })

      // Si erreur de concurrence, informer le client
      if (updateError.code === '23505' || updateError.message?.includes('duplicate')) {
        return res.status(409).json({
          error: 'Streak already claimed today',
          streak: userPassData.streak || 0,
          lastClaimed: userPassData.last_claimed,
          coins: currentCoins,
          canClaim: false
        })
      }

      return res.status(500).json({ error: 'Failed to update streak' })
    }

    logInfo('Streak claimed successfully', {
      requestId,
      user_id,
      oldStreak: userPassData.streak || 0,
      newStreak: publicationStreak,
      reward,
      newCoins
    })

    return res.status(200).json({
      streak: publicationStreak,
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
