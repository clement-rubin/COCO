import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logComponentEvent, logInfo } from '../utils/logger'
import AddictiveFeed from '../components/AddictiveFeed'

export default function Home() {
  const { user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [feedType, setFeedType] = useState('all')
  const heroRef = useRef(null)

  // Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 50)
      
      // Masquer le message de bienvenue en scrollant
      if (scrollPosition > 100) {
        setShowWelcome(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-masquer le message de bienvenue après 5 secondes
  useEffect(() => {
    if (user && showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [user, showWelcome])

  const quickActions = [
    {
      id: 'share',
      label: 'Partager',
      description: 'Photo & recette',
      icon: '📸',
      color: '#10b981',
      action: () => {
        if (user) {
          window.location.href = '/share-photo'
        } else {
          window.location.href = '/login?redirect=' + encodeURIComponent('/share-photo')
        }
      }
    },
    {
      id: 'explore',
      label: 'Explorer',
      description: 'Découvrir',
      icon: '🔍',
      color: '#3b82f6',
      action: () => window.location.href = '/explorer'
    },
    {
      id: 'friends',
      label: 'Amis',
      description: 'Mon réseau',
      icon: '👥',
      color: '#ef4444',
      action: () => {
        if (user) {
          window.location.href = '/amis'
        } else {
          window.location.href = '/login?redirect=' + encodeURIComponent('/amis')
        }
      }
    }
  ]

  const categories = [
    { id: 'all', label: 'Tout', icon: '🍽️', color: '#6366f1' },
    { id: 'dessert', label: 'Desserts', icon: '🍰', color: '#ec4899' },
    { id: 'plat', label: 'Plats', icon: '🍝', color: '#f59e0b' },
    { id: 'apero', label: 'Apéro', icon: '🥂', color: '#10b981' }
  ]

  // Check for welcome message
  useEffect(() => {
    if (user && !showWelcome) {
      const hasSeenWelcome = localStorage.getItem(`welcome_${user.id}`)
      if (!hasSeenWelcome) {
        setShowWelcome(true)
        localStorage.setItem(`welcome_${user.id}`, 'true')
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          setShowWelcome(false)
        }, 5000)
      }
    }
  }, [user, showWelcome])

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <Head>
        <title>COCO - Cuisine, Découverte, Partage</title>
        <meta name="description" content="Découvrez des recettes inspirantes et partagez vos créations culinaires" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Header avec navigation sticky */}
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
        padding: '12px 20px',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        borderBottom: isScrolled ? '1px solid rgba(255, 107, 53, 0.1)' : 'none',
        boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo et titre */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{
              width: isScrolled ? '32px' : '40px',
              height: isScrolled ? '32px' : '40px',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isScrolled ? '1rem' : '1.2rem',
              color: 'white',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}>
              🥥
            </div>
            
            {!isScrolled && (
              <div style={{
                opacity: isScrolled ? 0 : 1,
                transform: isScrolled ? 'scale(0.8)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>
                  COCO
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Cuisine & Saveurs
                </p>
              </div>
            )}
          </div>

          {/* Salutation utilisateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user && (
              <span style={{ 
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                Salut {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'} 👋
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message de bienvenue */}
      {user && showWelcome && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #4caf50, #45a049)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: '600',
          zIndex: 999,
          maxWidth: '350px',
          textAlign: 'center',
          boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
          animation: 'welcomeSlide 0.5s ease',
          cursor: 'pointer'
        }}
        onClick={() => setShowWelcome(false)}
        >
          <span style={{ marginRight: '8px' }}>🎉</span>
          Bon retour {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'} !
          <span style={{ marginLeft: '8px', fontSize: '0.7rem', opacity: 0.8 }}>
            (Cliquez pour masquer)
          </span>
        </div>
      )}

      {/* Section Hero */}
      <div ref={heroRef} style={{
        paddingTop: '100px',
        paddingBottom: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Gradient de fond décoratif */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'radial-gradient(circle at 30% 20%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Titre principal */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: '800',
              margin: '0 0 16px 0',
              lineHeight: '1.1',
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Découvrez.<br/>
              <span style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Créez. Partagez.
              </span>
            </h2>
            
            <p style={{
              fontSize: '1.1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.4',
              fontWeight: '400'
            }}>
              L'univers culinaire qui vous ressemble
            </p>
          </div>

          {/* Actions rapides */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '32px'
          }}>
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={action.action}
                style={{
                  background: 'white',
                  border: `2px solid ${action.color}20`,
                  borderRadius: '16px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px) scale(1.02)'
                  e.target.style.boxShadow = `0 8px 25px ${action.color}40`
                  e.target.style.borderColor = `${action.color}40`
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)'
                  e.target.style.borderColor = `${action.color}20`
                }}
              >
                <div style={{
                  fontSize: '1.8rem',
                  marginBottom: '6px'
                }}>
                  {action.icon}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  {action.label}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {action.description}
                </div>
              </button>
            ))}
          </div>

          {/* Filtres de catégories */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setFeedType(category.id)}
                style={{
                  background: feedType === category.id
                    ? `linear-gradient(135deg, ${category.color}, ${category.color}dd)`
                    : 'rgba(255, 255, 255, 0.8)',
                  color: feedType === category.id ? 'white' : '#374151',
                  border: `1px solid ${feedType === category.id ? category.color : '#e5e7eb'}`,
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxShadow: feedType === category.id 
                    ? `0 4px 15px ${category.color}40` 
                    : '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <span style={{ marginRight: '6px' }}>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section Feed principale */}
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        marginTop: '-12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        {/* En-tête du feed */}
        <div style={{
          padding: '16px 20px 8px',
          textAlign: 'center',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#6b7280'
          }}>
            📋 Feed des recettes
            <span style={{
              width: '4px',
              height: '4px',
              background: '#10b981',
              borderRadius: '50%'
            }} />
          </div>
        </div>

        {/* Contenu du feed */}
        <div style={{ 
          minHeight: '60vh',
          padding: '0 8px 20px'
        }}>
          <div style={{
            maxWidth: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              '--max-image-height': '250px',
              '--max-image-width': '100%'
            }}>
              <AddictiveFeed />
            </div>
          </div>
        </div>
      </div>

      {/* Styles globaux pour les animations et responsive */}
      <style jsx>{`
        @keyframes welcomeSlide {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        /* Fix photo sizes in feeds */
        :global(.feed-image),
        :global(.story-image),
        :global(.recipe-image) {
          max-height: var(--max-image-height, 300px) !important;
          max-width: var(--max-image-width, 100%) !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          border-radius: 12px !important;
        }
        
        :global(.feed-item img),
        :global(.story-item img) {
          max-height: 300px !important;
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          border-radius: 12px !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        @media (max-width: 380px) {
          .hero-title {
            fontSize: '1.8rem !important';
          }
          
          .quick-actions {
            gridTemplateColumns: '1fr 1fr !important';
          }
          
          :global(.feed-image),
          :global(.story-image) {
            max-height: 250px !important;
          }
        }
      `}</style>
    </div>
  )
}
