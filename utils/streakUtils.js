import { supabase } from '../lib/supabase'
import { logError, logInfo } from './logger'

const BASE_REWARD = 20

/**
 * Vérifie si l'utilisateur peut récupérer sa récompense quotidienne
 */
export async function canClaimDailyReward(userId) {
  try {
    const today = new Date().toISOString().slice(0, 10)
    
    const { data, error } = await supabase
      .from('user_pass')
      .select('last_claimed')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !data?.last_claimed || data.last_claimed !== today
  } catch (error) {
    logError('Error checking daily reward eligibility', error, { userId })
    return false
  }
}

/**
 * Récupère les données de streak de l'utilisateur
 */
export async function getUserStreakData(userId) {
  try {
    const { data, error } = await supabase
      .from('user_pass')
      .select('streak, last_claimed, coins')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return {
        streak: 0,
        lastClaimed: null,
        coins: 250,
        canClaim: true,
        nextReward: calculateReward(2)
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const canClaim = !data.last_claimed || data.last_claimed !== today
    
    // Calculer la prochaine récompense
    const isYesterday = (dateStr) => {
      if (!dateStr) return false
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      return dateStr === yesterday
    }

    const currentStreak = data.streak || 0
    const nextStreak = !data.last_claimed ? Math.max(currentStreak, 1) :
                      isYesterday(data.last_claimed) ? currentStreak + 1 : 1

    const nextReward = calculateReward(nextStreak)

    return {
      streak: currentStreak,
      lastClaimed: data.last_claimed,
      coins: data.coins || 0,
      canClaim,
      nextReward
    }
  } catch (error) {
    logError('Error getting user streak data', error, { userId })
    return {
      streak: 0,
      lastClaimed: null,
      coins: 0,
      canClaim: false,
      nextReward: calculateReward(2)
    }
  }
}

/**
 * Réclame la récompense quotidienne via l'API sécurisée
 */
export async function claimDailyReward(userId) {
  try {
    const response = await fetch('/api/user-streak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to claim reward')
    }

    logInfo('Daily reward claimed successfully', {
      userId,
      streak: data.streak,
      reward: data.reward
    })

    return {
      success: true,
      ...data
    }
  } catch (error) {
    logError('Error claiming daily reward', error, { userId })
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Calcule le nouveau streak basé sur la date de dernière réclamation
 */
export function calculateNewStreak(currentStreak, lastClaimedDate) {
  if (!lastClaimedDate) return Math.max(currentStreak, 1)

  const isYesterday = (dateStr) => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    return dateStr === yesterday
  }

  return isYesterday(lastClaimedDate) ? currentStreak + 1 : 1
}

/**
 * Calcule la récompense basée sur le streak
 */
export function calculateReward(streak) {
  if (streak < 2) {
    return 0
  }

  return (streak - 1) * BASE_REWARD
}
