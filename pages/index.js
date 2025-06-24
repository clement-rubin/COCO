import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'
import { logUserInteraction, logComponentEvent, logInfo } from '../utils/logger'
import AddictiveFeed from '../components/AddictiveFeed'
import RecipeOfWeek from '../components/RecipeOfWeek'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
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

  // Rediriger vers la page de présentation si non connecté
  useEffect(() => {
    if (!loading && !user) {
      // Au lieu de rediriger immédiatement, donner une chance de voir un aperçu
      const timer = setTimeout(() => {
        router.push('/presentation')
      }, 2000) // Attendre 2 secondes pour montrer un aperçu

      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #ff6b35',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '600' }}>
            Chargement...
          </p>
        </div>
      </div>
    )
  }

  // Ne pas afficher le contenu si l'utilisateur n'est pas connecté
  if (!user) {
    return null // Sera redirigé
  }

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

      {/* Header avec navigation sticky supprimé pour un design plus immersif */}

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
        {/* Recette de la semaine */}
        <RecipeOfWeek />

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
            background: '#f0f9ff',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#0369a1',
            border: '1px solid #e0f2fe'
          }}>
            👥 Recettes de mes amis
            <span style={{
              width: '6px',
              height: '6px',
              background: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          
          {/* Options de navigation rapide */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => router.push('/explorer')}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6'
                e.target.style.color = '#374151'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#6b7280'
              }}
            >
              🔍 Explorer tout
            </button>
            
            <button
              onClick={() => router.push('/amis')}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6'
                e.target.style.color = '#374151'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#6b7280'
              }}
            >
              ➕ Ajouter amis
            </button>
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

        {/* Message d'encouragement si peu d'amis */}
        {user && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            margin: '20px',
            borderRadius: '16px',
            border: '1px solid #f59e0b'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🍳</div>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#92400e'
            }}>
              Invitez vos amis à rejoindre COCO !
            </p>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '0.8rem',
              color: '#b45309',
              lineHeight: '1.4'
            }}>
              Plus vous avez d'amis, plus vous découvrirez de délicieuses recettes
            </p>
            <button
              onClick={() => router.push('/amis')}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d97706'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f59e0b'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              👥 Gérer mes amis
            </button>
          </div>
        )}
      </div>

      {/* Styles simplifiés */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
        
        /* États de focus pour l'accessibilité */
        button:focus {
          outline: 3px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Mode sombre automatique (si supporté) */
        @media (prefers-color-scheme: dark) {
          button {
            background: rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  )
}
        <RecipeOfWeek />

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
            background: '#f0f9ff',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#0369a1',
            border: '1px solid #e0f2fe'
          }}>
            👥 Recettes de mes amis
            <span style={{
              width: '6px',
              height: '6px',
              background: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          
          {/* Options de navigation rapide */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => router.push('/explorer')}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6'
                e.target.style.color = '#374151'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#6b7280'
              }}
            >
              🔍 Explorer tout
            </button>
            
            <button
              onClick={() => router.push('/amis')}
              style={{
                background: 'transparent',
                border: '1px solid #e5e7eb',
                color: '#6b7280',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f3f4f6'
                e.target.style.color = '#374151'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#6b7280'
              }}
            >
              ➕ Ajouter amis
            </button>
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

        {/* Message d'encouragement si peu d'amis */}
        {user && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            margin: '20px',
            borderRadius: '16px',
            border: '1px solid #f59e0b'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🍳</div>
            <p style={{
              margin: '0 0 12px 0',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#92400e'
            }}>
              Invitez vos amis à rejoindre COCO !
            </p>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '0.8rem',
              color: '#b45309',
              lineHeight: '1.4'
            }}>
              Plus vous avez d'amis, plus vous découvrirez de délicieuses recettes
            </p>
            <button
              onClick={() => router.push('/amis')}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d97706'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f59e0b'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              👥 Gérer mes amis
            </button>
          </div>
        )}
      </div>

      {/* Styles améliorés pour les animations et interactions */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes iconFloat {
          0%, 100% { 
            transform: translateY(0px); 
          }
          50% { 
            transform: translateY(-4px); 
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.7;
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(-2px);
          }
        }
        
        /* Effet de brillance au survol */
        button:hover .shine-effect {
          left: 100% !important;
        }
        
        /* Effet de glow au survol */
        button:hover .icon-glow {
          opacity: 0.3 !important;
        }
        
        /* Amélioration responsive */
        @media (max-width: 380px) {
          .quick-actions-grid {
            gap: 12px !important;
          }
          
          .quick-action-button {
            padding: 16px 8px !important;
          }
          
          .action-icon {
            font-size: 1.8rem !important;
          }
          
          .action-label {
            font-size: 0.8rem !important;
          }
          
          .action-description {
            font-size: 0.65rem !important;
          }
        }
        
        /* États de focus pour l'accessibilité */
        button:focus {
          outline: 3px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Optimisation des performances */
        button {
          will-change: transform, box-shadow;
          backface-visibility: hidden;
        }
        
        /* Animation d'entrée décalée */
        button:nth-child(1) { animation-delay: 0ms; }
        button:nth-child(2) { animation-delay: 100ms; }
        button:nth-child(3) { animation-delay: 200ms; }
        
        /* Effet de succès après clic */
        button:active {
          animation: successPulse 0.3s ease-out;
        }
        
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        
        /* Mode sombre automatique (si supporté) */
        @media (prefers-color-scheme: dark) {
          button {
            background: rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .action-label {
            color: #f9fafb !important;
          }
          
          .action-description {
            color: #d1d5db !important;
          }
        }
        
        /* Amélioration pour les écrans haute densité */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          button {
            border: 0.5px solid rgba(0,0,0,0.05);
          }
        }
      `}</style>
    </div>
  )
}
