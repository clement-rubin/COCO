import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import FriendsFeed from '../components/FriendsFeed'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [feedType, setFeedType] = useState('featured') // Changement de valeur par défaut
  const [viewMode, setViewMode] = useState('stories')
  const [isScrolled, setIsScrolled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const heroRef = useRef(null)

  // Détection du scroll pour l'effet sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animation d'entrée
  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => setShowWelcome(false), 2000) // Durée réduite
    }
  }, [])

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    
    // Feedback d'animation simplifié
    router.push('/submit-recipe')
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'stories' ? 'vertical' : 'stories')
    
    // Feedback haptique
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  // Simplification des filtres de catégories culinaires
  const categories = [
    { id: 'featured', icon: '⭐', label: 'En vedette' },
    { id: 'recent', icon: '🕒', label: 'Récent' },
    { id: 'trending', icon: '🔥', label: 'Tendance' }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8F5 0%, #FFFFFF 100%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Head>
        <title>COCO - Cuisine, Découverte, Partage</title>
        <meta name="description" content="Découvrez des recettes inspirantes et partagez vos créations culinaires" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Animation de bienvenue simplifiée */}
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
          animation: 'welcomeFadeOut 2s ease forwards'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👨‍🍳</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>
              Bienvenue dans votre cuisine
            </h1>
          </div>
        </div>
      )}

      {/* Header épuré */}
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
          {/* Logo simplifié */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              🍳
            </div>
            {user && (
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#FF6B35' }}>
                Bonjour, {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'}
              </span>
            )}
          </div>

          {/* Toggle de vue simplifié */}
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
              transition: 'all 0.3s ease'
            }}
          >
            {viewMode === 'stories' ? 'Mode Défilement' : 'Mode Stories'}
          </button>
        </div>
      </div>

      {/* Hero Section Simplifiée */}
      <div ref={heroRef} style={{
        paddingTop: '80px',
        background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Éléments de cuisine subtils */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05, // Opacité réduite
          pointerEvents: 'none'
        }}>
          {[...Array(3)].map((_, i) => ( // Moins d'éléments
            <div key={i} style={{
              position: 'absolute',
              fontSize: '2.5rem',
              animation: `float ${4 + i}s ease-in-out infinite`,
              left: `${15 + i * 30}%`,
              top: `${30 + (i % 3) * 15}%`,
              animationDelay: `${i * 0.7}s`
            }}>
              {['🍳', '🥘', '🍽️'][i]}
            </div>
          ))}
        </div>

        <div style={{
          maxWidth: '430px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <h1 style={{
            fontSize: '2rem', // Taille réduite
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.2',
            background: 'linear-gradient(45deg, #FFFFFF, #FFE4D6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Cuisine. Inspiration.<br/>Découverte.
          </h1>
          
          <p style={{
            fontSize: '1rem',
            opacity: 0.9,
            margin: '0 0 1.5rem 0',
            maxWidth: '300px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Des recettes qui correspondent à votre goût
          </p>

          {/* Filtres simplifiés */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setFeedType(category.id)}
                style={{
                  background: feedType === category.id
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${feedType === category.id ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  transform: feedType === category.id ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Image décorative subtile */}
        <div style={{
          position: 'absolute',
          bottom: '-10px',
          left: '0',
          right: '0',
          height: '40px',
          background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z\' fill=\'%23ffffff\'/%3E%3C/svg%3E")',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 3
        }} />
      </div>

      {/* Contenu principal */}
      <div style={{ 
        maxWidth: '430px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        padding: '0.5rem 0'
      }}>
        {viewMode === 'stories' ? (
          <FriendsFeed feedType={feedType} />
        ) : (
          <AddictiveFeed />
        )}
      </div>

      {/* Bouton de partage élégant */}
      <button
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 8px 20px rgba(255, 107, 53, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="Partager une recette"
      >
        <span>📝</span>
      </button>

      <style jsx>{`
        @keyframes welcomeFadeOut {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        * {
          will-change: transform;
        }
      `}</style>
    </div>
  )
}
