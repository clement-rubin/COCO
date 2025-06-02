import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import FriendsFeed from '../components/FriendsFeed'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [feedType, setFeedType] = useState('friends')
  const [viewMode, setViewMode] = useState('stories') // 'stories' ou 'vertical'
  const [isScrolled, setIsScrolled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [userStats, setUserStats] = useState({
    streak: 7,
    points: 2450,
    level: 3,
    nextLevelPoints: 500
  })
  const heroRef = useRef(null)

  // Détection du scroll pour l'effet sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animation d'entrée
  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => setShowWelcome(false), 3000)
    }
  }, [])

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    
    // Animation de feedback
    const btn = document.querySelector('.quick-share-btn')
    if (btn) {
      btn.style.transform = 'scale(0.9)'
      setTimeout(() => {
        btn.style.transform = 'scale(1)'
        router.push('/submit-recipe')
      }, 150)
    }
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'stories' ? 'vertical' : 'stories')
    
    // Feedback haptique
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8F5 0%, #FFFFFF 50%, #F0F9FF 100%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Head>
        <title>COCO - Découvre, Cuisine, Partage</title>
        <meta name="description" content="L'app culinaire addictive qui transforme ta cuisine en aventure" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Animation de bienvenue */}
      {showWelcome && user && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'welcomeFadeOut 3s ease forwards'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            animation: 'welcomePulse 2s ease infinite'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👋</div>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', margin: 0 }}>
              Salut {user.name} !
            </h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, margin: '0.5rem 0 0 0' }}>
              Prêt pour de nouvelles saveurs ?
            </p>
          </div>
        </div>
      )}

      {/* Header moderne sticky */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: isScrolled 
          ? 'rgba(255, 255, 255, 0.95)' 
          : 'transparent',
        backdropFilter: isScrolled ? 'blur(20px)' : 'none',
        zIndex: 1000,
        padding: '1rem',
        transition: 'all 0.3s ease',
        borderBottom: isScrolled ? '1px solid rgba(255, 107, 53, 0.1)' : 'none'
      }}>
        <div style={{
          maxWidth: '430px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo et stats utilisateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              animation: 'logoSpin 20s linear infinite'
            }}>
              🍳
            </div>
            {user && (
              <div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#FF6B35'
                }}>
                  Niveau {userStats.level}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>🔥 {userStats.streak}j</span>
                  <span>⭐ {userStats.points}</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle de vue */}
          <button
            onClick={toggleViewMode}
            style={{
              background: viewMode === 'vertical' 
                ? 'linear-gradient(135deg, #FF6B35, #F7931E)'
                : 'rgba(255, 107, 53, 0.1)',
              color: viewMode === 'vertical' ? 'white' : '#FF6B35',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {viewMode === 'stories' ? '📱 Vertical' : '📸 Stories'}
          </button>
        </div>
      </div>

      {/* Hero Section Dynamique */}
      <div ref={heroRef} style={{
        paddingTop: '80px',
        background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Particules flottantes */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              fontSize: '2rem',
              animation: `float ${3 + i}s ease-in-out infinite`,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`
            }}>
              {['🍳', '🥘', '🍕', '🥗', '🍰', '🍜'][i]}
            </div>
          ))}
        </div>

        <div style={{
          maxWidth: '430px',
          margin: '0 auto',
          padding: '2rem 1rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.1',
            background: 'linear-gradient(45deg, #FFFFFF, #FFE4D6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'titleGlow 3s ease-in-out infinite alternate'
          }}>
            Cuisine.<br/>Partage.<br/>Brille.
          </h1>
          
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.95,
            margin: '0 0 1.5rem 0',
            fontWeight: '500'
          }}>
            L'app qui rend la cuisine addictive
          </p>

          {/* Barre de progression niveau */}
          {user && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                  Niveau {userStats.level}
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                  {userStats.points}/{userStats.points + userStats.nextLevelPoints}
                </span>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                height: '6px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                  height: '100%',
                  width: `${(userStats.points / (userStats.points + userStats.nextLevelPoints)) * 100}%`,
                  borderRadius: '6px',
                  animation: 'progressGlow 2s ease-in-out infinite alternate'
                }} />
              </div>
            </div>
          )}

          {/* Filtres moderne avec badges */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '1rem'
          }}>
            {{
              id: 'friends', icon: '👥', label: 'Amis', count: 12 },
              { id: 'recent', icon: '🕒', label: 'Récent', count: 24 },
              { id: 'popular', icon: '🔥', label: 'Tendance', count: '∞' },
              { id: 'challenges', icon: '🏆', label: 'Défis', count: 3 }
            }.map(filter => (
              <button
                key={filter.id}
                onClick={() => setFeedType(filter.id)}
                style={{
                  background: feedType === filter.id
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${feedType === filter.id ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  transform: feedType === filter.id ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>{filter.icon}</span>
                {filter.label}
                <span style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '0.1rem 0.3rem',
                  fontSize: '0.7rem',
                  marginLeft: '0.25rem'
                }}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ 
        maxWidth: '430px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {viewMode === 'stories' ? (
          <FriendsFeed feedType={feedType} />
        ) : (
          <AddictiveFeed />
        )}
      </div>

      {/* Bouton de partage amélioré */}
      <button
        className="quick-share-btn"
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '20px',
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
          color: 'white',
          border: 'none',
          fontSize: '1.8rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(255, 107, 53, 0.4)',
          transform: 'scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1) rotate(5deg)'
          e.target.style.boxShadow = '0 12px 40px rgba(255, 107, 53, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1) rotate(0deg)'
          e.target.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.4)'
        }}
        title="Partager une recette"
      >
        <span style={{ animation: 'bounceEmoji 2s ease-in-out infinite' }}>
          📸
        </span>
      </button>

      {/* Indicateur de mode */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: '10px',
        transform: 'translateY(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '0.5rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        zIndex: 999,
        opacity: viewMode === 'vertical' ? 1 : 0,
        transition: 'opacity 0.3s ease'
      }}>
        Mode TikTok
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes welcomeFadeOut {
          0%, 80% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        
        @keyframes welcomePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes logoSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes titleGlow {
          0% { text-shadow: 0 0 20px rgba(255, 255, 255, 0.5); }
          100% { text-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 107, 53, 0.3); }
        }
        
        @keyframes progressGlow {
          0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
          100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes bounceEmoji {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        
        @media (max-width: 430px) {
          .quick-share-btn {
            width: 56px !important;
            height: 56px !important;
            bottom: 20px !important;
            right: 15px !important;
            font-size: 1.5rem !important;
          }
        }
        
        /* Smooth scrolling pour toute la page */
        html {
          scroll-behavior: smooth;
        }
        
        /* Optimisations pour les performances */
        * {
          will-change: transform;
        }
      `}</style>
    </div>
  )
}
