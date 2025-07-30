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
    setLoading(true)
    supabase
      .from('user_pass')
      .select('streak,last_claimed,coins')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setStreak(data.streak || 0)
          setLastClaimed(data.last_claimed)
          setCoins(data.coins || 0)
          setCanClaim(!isToday(data.last_claimed))
        } else {
          // Première connexion
          setStreak(0)
          setLastClaimed(null)
          setCoins(250)
          setCanClaim(true)
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  function isToday(dateStr) {
    if (!dateStr) return false
    const today = new Date().toISOString().slice(0, 10)
    return dateStr === today
  }

  async function claimReward() {
    if (!user?.id || !canClaim) return
    const today = new Date().toISOString().slice(0, 10)
    const newStreak = isYesterday(lastClaimed) ? streak + 1 : 1
    const reward = REWARDS[(newStreak - 1) % REWARDS.length]
    const newCoins = coins + reward

    // Update DB
    await supabase.from('user_pass').upsert({
      user_id: user.id,
      last_claimed: today,
      streak: newStreak,
      coins: newCoins
    })

    setStreak(newStreak)
    setLastClaimed(today)
    setCoins(newCoins)
    setCanClaim(false)
    setFeedback(`+${reward} CocoCoins !`)
    if (onCoinsChange) onCoinsChange(newCoins)
    setTimeout(() => setFeedback(null), 2000)
  }

  function isYesterday(dateStr) {
    if (!dateStr) return false
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    return dateStr === yesterday
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
          ? <>Réclamez votre récompense du jour !</>
          : <>Déjà récupéré aujourd’hui</>
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
        {canClaim ? `Récupérer +${REWARDS[(streak % REWARDS.length)]} 🪙` : 'Récompense du jour prise'}
      </button>
      <div style={{ fontSize: '0.95rem', color: '#6b7280' }}>
        Connectez-vous chaque jour pour augmenter votre série et gagner plus de CocoCoins !
      </div>
      {feedback && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 18,
          background: '#10b981',
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