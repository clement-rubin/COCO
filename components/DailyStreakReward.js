import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const REWARDS = [20, 25, 30, 40, 50, 60, 100] // Récompenses croissantes

export default function DailyStreakReward({ user, onCoinsChange }) {
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [lastClaimed, setLastClaimed] = useState(null)
  const [canClaim, setCanClaim] = useState(false)
  const [coins, setCoins] = useState(0)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    loadUserData()
  }, [user])

  const loadUserData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_pass')
        .select('streak, last_claimed, coins')
        .eq('user_id', user.id)
        .single()

      if (data) {
        const currentStreak = data.streak || 0
        const lastClaimedDate = data.last_claimed
        const currentCoins = data.coins || 0
        
        setStreak(currentStreak)
        setLastClaimed(lastClaimedDate)
        setCoins(currentCoins)
        setCanClaim(calculateCanClaim(lastClaimedDate))
      } else {
        // Première connexion - créer l'entrée
        await createInitialUserData()
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const createInitialUserData = async () => {
    try {
      const { error } = await supabase
        .from('user_pass')
        .insert({
          user_id: user.id,
          streak: 0,
          last_claimed: null,
          coins: 250
        })

      if (!error) {
        setStreak(0)
        setLastClaimed(null)
        setCoins(250)
        setCanClaim(true)
      }
    } catch (error) {
      console.error('Erreur lors de la création des données utilisateur:', error)
    }
  }

  const calculateCanClaim = (lastClaimedDate) => {
    if (!lastClaimedDate) return true
    const today = new Date().toISOString().slice(0, 10)
    return lastClaimedDate !== today
  }

  const isYesterday = (dateStr) => {
    if (!dateStr) return false
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    return dateStr === yesterday
  }

  const calculateNewStreak = (currentStreak, lastClaimedDate) => {
    if (!lastClaimedDate) return 1 // Première fois
    if (isYesterday(lastClaimedDate)) return currentStreak + 1 // Continuité
    return 1 // Rupture de série, on recommence
  }

  const calculateReward = (newStreak) => {
    const rewardIndex = Math.min(newStreak - 1, REWARDS.length - 1)
    return REWARDS[rewardIndex]
  }

  const claimReward = async () => {
    if (!user?.id || !canClaim || loading) return

    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const newStreak = calculateNewStreak(streak, lastClaimed)
      const reward = calculateReward(newStreak)
      const newCoins = coins + reward

      // Mise à jour en base
      const { error } = await supabase
        .from('user_pass')
        .upsert({
          user_id: user.id,
          last_claimed: today,
          streak: newStreak,
          coins: newCoins
        })

      if (error) throw error

      // Mise à jour de l'état local
      setStreak(newStreak)
      setLastClaimed(today)
      setCoins(newCoins)
      setCanClaim(false)
      
      // Feedback utilisateur
      setFeedback(`+${reward} CocoCoins ! Série : ${newStreak} jour${newStreak > 1 ? 's' : ''}`)
      setTimeout(() => setFeedback(null), 3000)

      // Notifier le parent si une fonction de callback est fournie
      if (onCoinsChange) {
        onCoinsChange(newCoins)
      }

    } catch (error) {
      console.error('Erreur lors de la récupération de la récompense:', error)
      setFeedback('Erreur lors de la récupération')
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setLoading(false)
    }
  }

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
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b', marginBottom: 4 }}>
        🔥 Streak quotidien : <b>{streak}</b> jour{streak > 1 ? 's' : ''}
      </div>
      <div style={{ fontSize: '1rem', color: '#92400e', marginBottom: 8 }}>
        {canClaim
          ? <>Réclamez votre récompense du jour !</>
          : <>Déjà récupéré aujourd'hui</>
        }
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
        {loading ? (
          'Traitement...'
        ) : canClaim ? (
          `Récupérer +${calculateReward(calculateNewStreak(streak, lastClaimed))} 🪙`
        ) : (
          'Récompense du jour prise'
        )}
      </button>
      <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
        Connectez-vous chaque jour pour augmenter votre série et gagner plus de CocoCoins !
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