import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

export default function DailyStreakReward({ user, onCoinsChange }) {
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [lastClaimed, setLastClaimed] = useState(null)
  const [canClaim, setCanClaim] = useState(false)
  const [, setCoins] = useState(0)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    loadUserData()
  }, [user])

  const fetchPublicationStreak = async () => {
    if (!user?.id) return 0

    try {
      const today = new Date()
      const startWindow = new Date(today)
      startWindow.setDate(startWindow.getDate() - LOOKBACK_DAYS)

      const { data: recipeRows, error: recipesError } = await supabase
        .from('recipes')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', startWindow.toISOString())

      if (recipesError) {
        throw recipesError
      }

      const publicationDates = new Set(
        (recipeRows || [])
          .map((row) => {
            try {
              return toISODate(new Date(row.created_at))
            } catch (err) {
              console.error('Erreur de parsing de date de publication:', err)
              return null
            }
          })
          .filter(Boolean)
      )

      return computePublicationStreak(publicationDates, today)
    } catch (error) {
      console.error('Erreur lors du calcul de la série de publications:', error)
      return 0
    }
  }

  const loadUserData = async ({ skipSpinner = false } = {}) => {
    if (!user?.id) return
    if (!skipSpinner) {
      setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('user_pass')
        .select('streak, last_claimed, coins')
        .eq('user_id', user.id)
        .single()

      let userPassData = data

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!userPassData) {
        userPassData = await createInitialUserData()
      }

      const publicationStreak = await fetchPublicationStreak()
      const lastClaimedDate = userPassData?.last_claimed || null
      const currentCoins = userPassData?.coins ?? 250

      setStreak(publicationStreak)
      setLastClaimed(lastClaimedDate)
      setCoins(currentCoins)

      const eligibleToday = publicationStreak >= 2 && calculateCanClaim(lastClaimedDate)
      setCanClaim(eligibleToday)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      setCanClaim(false)
    } finally {
      if (!skipSpinner) {
        setLoading(false)
      }
    }
  }

  const createInitialUserData = async () => {
    if (!user?.id) return { streak: 0, last_claimed: null, coins: 250 }

    try {
      const { error } = await supabase
        .from('user_pass')
        .insert({
          user_id: user.id,
          streak: 0,
          last_claimed: null,
          coins: 250
        })

      if (error && error.code !== '23505') {
        throw error
      }

      return { streak: 0, last_claimed: null, coins: 250 }
    } catch (error) {
      console.error('Erreur lors de la création des données utilisateur:', error)
      return { streak: 0, last_claimed: null, coins: 250 }
    }
  }

  const calculateCanClaim = (lastClaimedDate) => {
    if (!lastClaimedDate) return true
    const today = toISODate(new Date())
    return lastClaimedDate !== today
  }

  const claimReward = async () => {
    if (!user?.id || loading || !canClaim) return

    setLoading(true)
    try {
      const response = await fetch('/api/user-streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user.id })
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.message || data.error || 'Impossible de récupérer la récompense'
        setFeedback(message)
        setTimeout(() => setFeedback(null), 4000)
        await loadUserData({ skipSpinner: true })
        return
      }

      setFeedback(`+${data.reward} CocoCoins ! Série publication : ${data.streak} jour${data.streak > 1 ? 's' : ''}`)
      setTimeout(() => setFeedback(null), 4000)

      if (typeof data.coins === 'number') {
        setCoins(data.coins)
        if (onCoinsChange) {
          onCoinsChange(data.coins)
        }
      }

      setLastClaimed(data.lastClaimed)

      await loadUserData({ skipSpinner: true })
    } catch (error) {
      console.error('Erreur lors de la récupération de la récompense:', error)
      setFeedback('Erreur lors de la récupération')
      setTimeout(() => setFeedback(null), 4000)
      await loadUserData({ skipSpinner: true })
    } finally {
      setLoading(false)
    }
  }

  const rewardForToday = calculateReward(streak)
  const needsAnotherDay = streak < 2
  const helperText = needsAnotherDay
    ? (streak === 0
        ? "Publie aujourd'hui et demain pour débloquer ta récompense quotidienne."
        : 'Encore une publication consécutive pour activer la récompense de 20 CocoCoins.')
    : `Chaque journée publiée ajoute +20 CocoCoins. Série actuelle : ${streak} jour${streak > 1 ? 's' : ''}.`

  if (!user?.id) return null

  return (
    <div style={{
      background: '#fffbe6',
      borderRadius: 16,
      padding: '14px 20px',
      margin: '18px auto 0 auto',
      maxWidth: 420,
      boxShadow: '0 2px 8px #f59e0b11',
      textAlign: 'center',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 6
      }}>
        <span style={{
          background: '#fef3c7',
          color: '#b45309',
          borderRadius: 999,
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '2px 8px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          Nouveauté
        </span>
        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f59e0b' }}>
          🔥 Série de publication
        </span>
      </div>
      <div style={{ fontSize: '0.95rem', color: '#92400e', marginBottom: 10 }}>
        Publie deux jours consécutifs pour débloquer {BASE_REWARD} CocoCoins, puis +{BASE_REWARD} chaque jour supplémentaire.
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 8,
        fontWeight: 600,
        color: '#b45309'
      }}>
        <span>
          Série actuelle : <b>{streak}</b> jour{streak > 1 ? 's' : ''}
        </span>
        <span>
          Gain du jour : <b>+{rewardForToday}</b> 🪙
        </span>
      </div>
      <button
        onClick={claimReward}
        disabled={!canClaim || loading}
        style={{
          background: canClaim ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : '#e5e7eb',
          color: canClaim ? 'white' : '#9ca3af',
          border: 'none',
          borderRadius: 10,
          padding: '8px 18px',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: canClaim ? 'pointer' : 'not-allowed',
          marginBottom: 6,
          boxShadow: canClaim ? '0 2px 8px #f59e0b33' : 'none',
          transition: 'all 0.2s'
        }}
      >
        {loading
          ? 'Traitement...'
          : canClaim
            ? `Récupérer +${rewardForToday} CocoCoins`
            : needsAnotherDay
              ? 'Publie encore demain pour débloquer 20 CocoCoins'
              : 'Récompense du jour récupérée'}
      </button>
      <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
        {helperText}
      </div>
      {feedback && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 18,
          background: feedback.includes('Erreur') ? '#ef4444' : '#10b981',
          color: 'white',
          borderRadius: 10,
          padding: '4px 12px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: '0 2px 8px #10b98133',
          animation: 'shopFeedbackAnim 0.6s'
        }}>
          {feedback}
        </div>
      )}
    </div>
  )
}
