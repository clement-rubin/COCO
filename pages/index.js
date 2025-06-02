import Head from 'next/head'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [showQuickStats, setShowQuickStats] = useState(true)
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [userStats, setUserStats] = useState({
    level: 5,
    xp: 750,
    nextLevelXp: 1000,
    streak: 7,
    badges: 12
  })

  // Charger le défi quotidien
  useEffect(() => {
    const loadDailyChallenge = () => {
      const challenges = [
        {
          id: 'daily_1',
          title: 'Maître du Petit-Déjeuner',
          description: 'Préparez un petit-déjeuner équilibré avec au moins 3 couleurs',
          emoji: '🌅',
          reward: 100,
          progress: 0,
          target: 1
        },
        {
          id: 'daily_2', 
          title: 'Zéro Gaspillage',
          description: 'Utilisez tous vos restes dans une nouvelle recette',
          emoji: '♻️',
          reward: 150,
          progress: 0,
          target: 1
        },
        {
          id: 'daily_3',
          title: 'Chef Social',
          description: 'Partagez 2 recettes et recevez 5 likes',
          emoji: '👥',
          reward: 200,
          progress: 0,
          target: 2
        }
      ]
      
      const today = new Date().getDay()
      setDailyChallenge(challenges[today % challenges.length])
    }

    loadDailyChallenge()
  }, [])

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    router.push('/submit-recipe')
  }

  return (
    <div style={{ background: 'var(--bg-dark, #000)', minHeight: '100vh' }}>
      <Head>
        <title>COCO - Cuisine Addictive</title>
        <meta name="description" content="Découvrez et partagez les meilleures recettes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Quick Stats Bar - Collapsible */}
      {showQuickStats && (
        <div style={{
          background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--secondary-mint) 100%)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          fontSize: '0.8rem',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <span>🎯 Niveau {userStats.level}</span>
            <span>⚡ {userStats.xp}/{userStats.nextLevelXp} XP</span>
            <span>🔥 {userStats.streak} jours</span>
            <span>🏆 {userStats.badges} badges</span>
          </div>
          <button
            onClick={() => setShowQuickStats(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Défi quotidien - Sticky */}
      {dailyChallenge && (
        <div style={{
          position: 'sticky',
          top: showQuickStats ? '40px' : '0',
          zIndex: 100,
          background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
          padding: 'var(--spacing-md)',
          margin: '0',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>{dailyChallenge.emoji}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>
                {dailyChallenge.title}
              </h3>
              <p style={{ margin: '2px 0', fontSize: '0.8rem', opacity: 0.9 }}>
                {dailyChallenge.description}
              </p>
              <div style={{ 
                background: 'rgba(255,255,255,0.3)', 
                borderRadius: '10px', 
                height: '6px',
                marginTop: '6px'
              }}>
                <div style={{
                  background: 'white',
                  height: '100%',
                  width: `${(dailyChallenge.progress / dailyChallenge.target) * 100}%`,
                  borderRadius: '10px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                +{dailyChallenge.reward} XP
              </div>
              <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                {dailyChallenge.progress}/{dailyChallenge.target}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de partage rapide flottant */}
      <button
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: 'var(--spacing-md)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--primary-coral-dark) 100%)',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)',
          transform: 'scale(1)',
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite'
        }}
        onMouseDown={(e) => {
          e.target.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          e.target.style.transform = 'scale(1)'
        }}
      >
        ➕
      </button>

      {/* Feed Principal Addictif */}
      <AddictiveFeed />

      {/* Animations CSS */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.4);
          }
          50% {
            box-shadow: 0 4px 30px rgba(255, 107, 53, 0.7);
          }
          100% {
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.4);
          }
        }
      `}</style>
    </div>
  )
}
