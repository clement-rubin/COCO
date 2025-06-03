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
  const [feedType, setFeedType] = useState('featured')
  const [viewMode, setViewMode] = useState('stories')
  const [isScrolled, setIsScrolled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef(null)

  // Détection du scroll pour les effets de parallaxe et transitions
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)
      setIsScrolled(currentScrollY > 80)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Animation d'entrée
  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => setShowWelcome(false), 2000)
    }
  }, [])

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    router.push('/submit-recipe')
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'stories' ? 'vertical' : 'stories')
    if (navigator.vibrate) {
      navigator.vibrate(30)
    }
  }

  const categories = [
    { id: 'featured', icon: '⭐', label: 'En vedette' },
    { id: 'recent', icon: '🕒', label: 'Récent' },
    { id: 'trending', icon: '🔥', label: 'Tendance' }
  ]

  return (
    <div style={{
      background: 'var(--warm-white)',
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

      {/* Éléments décoratifs flottants avec parallaxe */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        transform: `translateY(${scrollY * 0.1}px)`,
        transition: 'transform 0.1s ease-out'
      }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: `${1.5 + i * 0.3}rem`,
            opacity: 0.05 + (i * 0.01),
            animation: `gentleFloat ${4 + i}s ease-in-out infinite`,
            left: `${10 + i * 20}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.8}s`,
            color: 'var(--primary-orange)',
            transform: `translateY(${scrollY * (0.02 + i * 0.01)}px)`
          }}>
            {['🍳', '🥘', '🍽️', '🧑‍🍳', '🥗'][i]}
          </div>
        ))}
      </div>

      {/* Animation de bienvenue améliorée */}
      {showWelcome && user && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--gradient-hero)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeInScale 0.6s ease, slideOutUp 0.6s ease 1.4s forwards'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            animation: 'slideInUp 0.8s ease'
          }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '1rem',
              animation: 'gentleFloat 2s ease-in-out infinite'
            }}>👨‍🍳</div>
            <h1 style={{ 
              fontSize: '1.8rem', 
              fontWeight: '700', 
              margin: 0,
              textShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              Bienvenue dans votre cuisine
            </h1>
          </div>
        </div>
      )}

      {/* Header avec effet de verre */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: isScrolled 
          ? 'rgba(255, 255, 255, 0.9)' 
          : 'transparent',
        backdropFilter: isScrolled ? 'blur(30px)' : 'none',
        zIndex: 1000,
        padding: '1rem',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        borderBottom: isScrolled ? '1px solid rgba(255, 107, 53, 0.1)' : 'none',
        boxShadow: isScrolled ? 'var(--shadow-soft)' : 'none'
      }}>
        <div style={{
          maxWidth: '430px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--gradient-hero)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              boxShadow: 'var(--shadow-soft)',
              transition: 'all 0.3s ease'
            }}>
              🍳
            </div>
            {user && (
              <span style={{ 
                fontWeight: '600', 
                fontSize: '0.9rem', 
                color: 'var(--primary-orange)',
                opacity: isScrolled ? 1 : 0.9,
                transition: 'opacity 0.3s ease'
              }}>
                Bonjour, {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'}
              </span>
            )}
          </div>

          <button
            onClick={toggleViewMode}
            className="gradient-button"
            style={{
              background: viewMode === 'vertical' 
                ? 'var(--gradient-section2)'
                : 'rgba(255, 107, 53, 0.1)',
              color: viewMode === 'vertical' ? 'white' : 'var(--primary-orange)',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: viewMode === 'vertical' ? 'var(--shadow-soft)' : 'none'
            }}
          >
            {viewMode === 'stories' ? 'Mode Défilement' : 'Mode Stories'}
          </button>
        </div>
      </div>

      {/* Hero Section avec dégradé fluide */}
      <div ref={heroRef} style={{
        paddingTop: '80px',
        background: 'var(--gradient-hero)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        transform: `translateY(${scrollY * 0.3}px)`,
        transition: 'transform 0.1s ease-out'
      }}>
        {/* Overlay pour adoucir la transition */}
        <div className="section-overlay" />
        
        {/* Vague de transition fluide */}
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          left: '0',
          right: '0',
          height: '60px',
          background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z\' opacity=\'.25\' fill=\'%23FFF8F0\'/%3E%3Cpath d=\'M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z\' opacity=\'.5\' fill=\'%23FFF8F0\'/%3E%3Cpath d=\'M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z\' fill=\'%23FFF8F0\'/%3E%3C/svg%3E")',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 2
        }} />

        <div style={{
          maxWidth: '430px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          zIndex: 3
        }}>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.2',
            background: 'linear-gradient(45deg, #FFFFFF, #FFE4D6, #FFFFFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 200%',
            animation: 'colorShift 4s ease-in-out infinite',
            textShadow: '0 2px 20px rgba(0,0,0,0.1)'
          }}>
            Cuisine. Inspiration.<br/>Découverte.
          </h1>
          
          <p style={{
            fontSize: '1rem',
            opacity: 0.95,
            margin: '0 0 2rem 0',
            maxWidth: '300px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textShadow: '0 1px 10px rgba(0,0,0,0.1)'
          }}>
            Des recettes qui correspondent à votre goût
          </p>

          {/* Filtres avec effets de transition */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setFeedType(category.id)}
                style={{
                  background: feedType === category.id
                    ? 'rgba(255, 255, 255, 0.3)'
                    : 'rgba(255, 255, 255, 0.15)',
                  border: `1px solid ${feedType === category.id ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  transform: feedType === category.id ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
                  boxShadow: feedType === category.id ? '0 4px 15px rgba(255, 255, 255, 0.2)' : 'none',
                  animationDelay: `${index * 0.1}s`,
                  animation: 'slideInUp 0.6s ease forwards'
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section de transition avec dégradé */}
      <div style={{
        background: 'var(--gradient-section1)',
        padding: '1rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="section-overlay" />
        
        {/* Vague de transition douce */}
        <div style={{
          position: 'absolute',
          bottom: '-1px',
          left: '0',
          right: '0',
          height: '30px',
          background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1200 120\' preserveAspectRatio=\'none\'%3E%3Cpath d=\'M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z\' fill=\'%23ffffff\'/%3E%3C/svg%3E")',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          zIndex: 2
        }} />
      </div>

      {/* Contenu principal avec fond blanc fluide */}
      <div style={{ 
        maxWidth: '430px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        padding: '0.5rem 0',
        background: 'white',
        borderRadius: '0',
        minHeight: '50vh'
      }}>
        <div style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.8) 10%, white 20%)',
          paddingTop: '2rem'
        }}>
          {viewMode === 'stories' ? (
            <FriendsFeed feedType={feedType} />
          ) : (
            <AddictiveFeed />
          )}
        </div>
      </div>

      {/* Bouton de partage avec effet de pulsation */}
      <button
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--gradient-hero)',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: 'var(--shadow-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'gentleFloat 3s ease-in-out infinite'
        }}
        title="Partager une recette"
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1) translateY(-4px)'
          e.target.style.boxShadow = 'var(--shadow-strong)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = 'var(--shadow-medium)'
        }}
      >
        <span>📝</span>
      </button>

      <style jsx>{`
        @keyframes slideOutUp {
          to {
            transform: translateY(-100%);
            opacity: 0;
            visibility: hidden;
          }
        }
        
        @keyframes colorShift {
          0%, 100% { 
            background-position: 0% 50%; 
          }
          50% { 
            background-position: 100% 50%; 
          }
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        * {
          will-change: auto;
        }
        
        /* Amélioration des transitions de scroll */
        @media (prefers-reduced-motion: no-preference) {
          * {
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </div>
  )
}
