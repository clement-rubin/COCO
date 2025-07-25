import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'
import { logUserInteraction, logComponentEvent, logInfo } from '../utils/logger'
import AddictiveFeed from '../components/AddictiveFeed'
import RecipeOfWeek from '../components/RecipeOfWeek'
import styles from '../styles/Layout.module.css'

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
      // Montrer un aperçu pendant 3 secondes avant de rediriger
      const timer = setTimeout(() => {
        router.push('/presentation')
      }, 3000) // Augmenter à 3 secondes pour mieux voir l'aperçu

      return () => clearTimeout(timer)
    }
  }, [user, loading, router])

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <div className={styles.loading}>
            {/* Animation de chargement sophistiquée */}
            <div style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              marginBottom: '20px'
            }}>
              {/* Cercles animés concentriques */}
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '3px solid transparent',
                borderTop: '3px solid #ff6b35',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 2s linear infinite'
              }} />
              <div style={{
                position: 'absolute',
                width: '60%',
                height: '60%',
                top: '20%',
                left: '20%',
                border: '2px solid transparent',
                borderRight: '2px solid #f7931e',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 1.5s linear infinite reverse'
              }} />
              <div style={{
                position: 'absolute',
                width: '40%',
                height: '40%',
                top: '30%',
                left: '30%',
                border: '2px solid transparent',
                borderBottom: '2px solid #4caf50',
                borderRadius: '50%',
                animation: 'sophisticatedSpin 1s linear infinite'
              }} />
              
              {/* Centre avec icône animée */}
              <div style={{
                position: 'absolute',
                width: '30%',
                height: '30%',
                top: '35%',
                left: '35%',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulseGlow 2s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(255, 107, 53, 0.4)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'white',
                  borderRadius: '50%',
                  animation: 'innerPulse 1s ease-in-out infinite alternate'
                }} />
              </div>
            </div>
            
            {/* Texte avec animation de points */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                color: '#64748b', 
                fontSize: '1.1rem', 
                fontWeight: '600',
                margin: '0 0 8px 0'
              }}>
                Préparation de vos recettes
                <span style={{ 
                  display: 'inline-block',
                  width: '20px',
                  textAlign: 'left',
                  animation: 'loadingDots 1.5s infinite'
                }}>...</span>
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '4px',
                marginTop: '12px'
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px',
                    height: '6px',
                    background: '#ff6b35',
                    borderRadius: '50%',
                    animation: `waveDots 1.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Afficher un aperçu pour les utilisateurs non connectés
  if (!user) {
    return (
      <div className={styles.container}>
        <Head>
          <title>COCO - Aperçu de la communauté culinaire</title>
          <meta name="description" content="Découvrez COCO, la communauté pour partager et découvrir des recettes" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className={styles.main}>
          <div className={styles.content} style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center' }}>
            {/* Logo et titre */}
            <div style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 24px',
              boxShadow: '0 12px 30px rgba(255, 107, 53, 0.3)',
              animation: 'gentleBounce 3s ease-in-out infinite'
            }}>
              🥥
            </div>

            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              margin: '0 0 16px 0',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              COCO
            </h1>

            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              margin: '0 0 32px 0',
              lineHeight: '1.5'
            }}>
              La communauté culinaire qui vous inspire
            </p>

            {/* Aperçu des fonctionnalités */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {[
                { icon: '📸', text: 'Partagez vos recettes' },
                { icon: '🔍', text: 'Découvrez de nouvelles saveurs' },
                { icon: '👥', text: 'Connectez-vous avec des passionnés' },
                { icon: '🏆', text: 'Participez à des défis' }
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '20px 16px',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 107, 53, 0.1)',
                    transition: 'all 0.3s ease',
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
                    {feature.icon}
                  </div>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#374151',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Message de redirection */}
            <div style={{
              background: 'rgba(255, 107, 53, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <p style={{
                margin: '0 0 12px 0',
                color: '#ff6b35',
                fontWeight: '600',
                fontSize: '1rem'
              }}>
                ✨ Découvrez tout ce que COCO peut vous offrir
              </p>
              <p style={{
                margin: 0,
                color: '#9ca3af',
                fontSize: '0.9rem'
              }}>
                Redirection en cours vers la présentation complète...
              </p>
            </div>

            {/* Actions rapides */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => router.push('/presentation')}
                style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)'
                }}
              >
                En savoir plus
              </button>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  background: 'transparent',
                  color: '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff6b35'
                  e.target.style.color = 'white'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent'
                  e.target.style.color = '#ff6b35'
                }}
              >
                Rejoindre
              </button>
            </div>
          </div>
        </main>
        <style jsx>{`
          @keyframes gentleBounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>COCO - Cuisine, Découverte, Partage</title>
        <meta name="description" content="Découvrez des recettes inspirantes et partagez vos créations culinaires" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      
      <main className={styles.main}>
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

        {/* Section Hero intégrée */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '64px', // Hauteur de la navbar
          paddingBottom: '32px',
          marginBottom: '0',
          marginTop: '-64px', // Compenser le padding-top du main
          minHeight: '50vh'
        }}>
          {/* Éléments décoratifs de fond */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '160px',
            height: '160px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.08,
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '-60px',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #4caf50, #45a049)',
            borderRadius: '50%',
            opacity: 0.06,
            animation: 'float 8s ease-in-out infinite reverse'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-50px',
            right: '10%',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.05,
            animation: 'float 10s ease-in-out infinite'
          }} />

          <div className={styles.content} style={{ 
            maxWidth: 400, 
            margin: '0 auto', 
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            padding: '24px 20px 0' // Augmenter le padding-top pour compenser
          }}>
            {/* Logo animé sophistiqué */}
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              margin: '0 auto 20px',
              boxShadow: '0 12px 35px rgba(255, 107, 53, 0.3), 0 6px 15px rgba(255, 107, 53, 0.15)',
              animation: 'heroLogo 3s ease-in-out infinite',
              border: '3px solid rgba(255, 255, 255, 0.9)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Icône SVG personnalisée remplaçant l'emoji */}
              <div style={{
                width: '40px',
                height: '40px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'logoRotate 4s linear infinite'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" 
                    fill="#ff6b35" 
                    style={{ animation: 'checkmark 2s ease-in-out infinite' }} />
                </svg>
              </div>
              
              {/* Particules flottantes */}
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: '4px',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '50%',
                  animation: `floatingParticles 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                  top: `${20 + i * 20}%`,
                  left: `${15 + i * 25}%`
                }} />
              ))}
              
              {/* Effet de brillance amélioré */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '15%',
                width: '40%',
                height: '40%',
                background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.6) 0%, transparent 50%)',
                borderRadius: '50%',
                filter: 'blur(6px)',
                animation: 'advancedShine 3s ease-in-out infinite'
              }} />
            </div>

            {/* Titre principal avec effet de gradient amélioré */}
            <h1 style={{
              fontSize: '2.8rem',
              fontWeight: '900',
              margin: '0 0 12px 0',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8a50 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
              lineHeight: '1',
              textShadow: '0 2px 10px rgba(255, 107, 53, 0.1)'
            }}>
              COCO
            </h1>

            {/* Sous-titre avec animation améliorée */}
            <div style={{
              marginBottom: '28px'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                margin: '0 0 8px 0',
                color: '#1f2937',
                lineHeight: '1.2'
              }}>
                Découvrez. Créez.{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  position: 'relative'
                }}>
                  Partagez.
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '0',
                    right: '0',
                    height: '2px',
                    background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    borderRadius: '1px',
                    animation: 'expandLine 2s ease-in-out infinite'
                  }} />
                </span>
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4',
                fontWeight: '500'
              }}>
                L'univers culinaire qui vous ressemble
              </p>
            </div>

            {/* Actions rapides avec animations d'icônes */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '28px'
            }}>
              <button
                onClick={() => router.push('/share-photo')}
                style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)'
                  e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.3)'
                }}
              >
                {/* Icône caméra animée */}
                <div style={{
                  width: '16px',
                  height: '16px',
                  background: 'white',
                  borderRadius: '4px',
                  position: 'relative',
                  animation: 'cameraShutter 2s ease-in-out infinite'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: '#ff6b35',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'lensFocus 2s ease-in-out infinite'
                  }} />
                </div>
                Partager
              </button>
              <button
                onClick={() => router.push('/collections')}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '12px 24px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff6b35'
                  e.target.style.color = 'white'
                  e.target.style.transform = 'translateY(-3px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)'
                  e.target.style.color = '#ff6b35'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                {/* Icône livre animée */}
                <div style={{
                  width: '16px',
                  height: '12px',
                  border: '2px solid currentColor',
                  borderRadius: '2px',
                  position: 'relative',
                  animation: 'bookOpen 3s ease-in-out infinite'
                }}>
                  <div style={{
                    width: '1px',
                    height: '8px',
                    background: 'currentColor',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }} />
                </div>
                Collections
              </button>
            </div>

            {/* Statistiques avec icônes animées */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              {[
                { number: '1000+', label: 'Recettes', color: '#ff6b35', animation: 'recipeIcon' },
                { number: '500+', label: 'Chefs', color: '#4caf50', animation: 'chefIcon' },
                { number: '50+', label: 'Collections', color: '#2196f3', animation: 'collectionIcon' }
              ].map((stat, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(15px)',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: `2px solid ${stat.color}20`,
                  minWidth: '70px',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.15}s both`,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
                }}>
                  {/* Icônes animées personnalisées */}
                  <div style={{ 
                    fontSize: '1.2rem', 
                    marginBottom: '4px',
                    animation: `${stat.animation} 2s ease-in-out infinite`,
                    transformOrigin: 'center'
                  }}>
                    {index === 0 && (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: stat.color,
                        borderRadius: '50%',
                        margin: '0 auto',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }} />
                      </div>
                    )}
                    {index === 1 && (
                      <div style={{
                        width: '20px',
                        height: '16px',
                        background: stat.color,
                        borderRadius: '8px 8px 0 0',
                        margin: '0 auto',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: '16px',
                          height: '4px',
                          background: 'white',
                          borderRadius: '2px',
                          position: 'absolute',
                          bottom: '-6px',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }} />
                      </div>
                    )}
                    {index === 2 && (
                      <div style={{
                        width: '18px',
                        height: '14px',
                        border: `2px solid ${stat.color}`,
                        borderRadius: '2px',
                        margin: '0 auto',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: '1px',
                          height: '10px',
                          background: stat.color,
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }} />
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    color: stat.color,
                    marginBottom: '2px'
                  }}>
                    {stat.number}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    fontWeight: '600'
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Indicateur de scroll redessiné */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              opacity: 0.6
            }}>
              <span style={{
                fontSize: '0.8rem',
                color: '#9ca3af',
                fontWeight: '600'
              }}>
                Découvrez les dernières recettes
              </span>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ff6b35',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounceDown 2s infinite',
                background: 'rgba(255, 107, 53, 0.1)'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#ff6b35' }}>↓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Feed principale - transition parfaitement fluide */}
        <div style={{
          maxWidth: '400px',
          margin: '-24px auto 0',
          background: 'white',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.1), 0 -4px 15px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2
        }}>
          {/* En-tête du feed */}
          <div style={{
            padding: '20px 20px 12px',
            textAlign: 'center',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f0f9ff',
              padding: '8px 16px',
              borderRadius: '20px',
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
                onClick={() => router.push('/amis')}
                style={{
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  padding: '6px 12px',
                  borderRadius: '14px',
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
      </main>
      
      <style jsx>{`
        @keyframes heroLogo {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          50% { 
            transform: translateY(-8px) rotate(2deg) scale(1.05);
          }
        }
        
        @keyframes shine {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1) rotate(0deg);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.1) rotate(90deg);
          }
        }
        
        @keyframes expandLine {
          0%, 100% { 
            transform: scaleX(0);
            opacity: 0;
          }
          50% { 
            transform: scaleX(1);
            opacity: 1;
          }
        }
        
        @keyframes bounceDown {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          33% { 
            transform: translateY(-20px) rotate(120deg) scale(1.1);
          }
          66% { 
            transform: translateY(-10px) rotate(240deg) scale(0.9);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-6px);
          }
          60% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
        
        @keyframes welcomeSlide {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes sophisticatedSpin {
          0% { 
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
          50% { 
            transform: rotate(180deg) scale(1.1);
            opacity: 0.8;
          }
          100% { 
            transform: rotate(360deg) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes pulseGlow {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 20px rgba(255, 107, 53, 0.4);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 0 30px rgba(255, 107, 53, 0.6), 0 0 40px rgba(255, 107, 53, 0.3);
          }
        }
        
        @keyframes innerPulse {
          0% { 
            transform: scale(1);
            opacity: 1;
          }
          100% { 
            transform: scale(1.3);
            opacity: 0.7;
          }
        }
        
        @keyframes loadingDots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        @keyframes waveDots {
          0%, 40%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          20% { 
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes logoRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes checkmark {
          0%, 50% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes floatingParticles {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) scale(1);
            opacity: 0.8;
          }
          33% { 
            transform: translateY(-15px) translateX(10px) scale(1.2);
            opacity: 1;
          }
          66% { 
            transform: translateY(-8px) translateX(-5px) scale(0.8);
            opacity: 0.6;
          }
        }
        
        @keyframes advancedShine {
          0%, 100% { 
            opacity: 0.6;
            transform: rotate(0deg) scale(1);
          }
          50% { 
            opacity: 1;
            transform: rotate(180deg) scale(1.3);
          }
        }
        
        @keyframes cameraShutter {
          0%, 90%, 100% { transform: scale(1); }
          5%, 15% { transform: scale(0.95); }
          10% { transform: scale(0.9); }
        }
        
        @keyframes lensFocus {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }
        
        @keyframes bookOpen {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }
        
        @keyframes recipeIcon {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
        
        @keyframes chefIcon {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes collectionIcon {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(15deg); }
        }

        /* États de focus pour l'accessibilité */
        button:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Responsive amélioré pour header sans espaces */
        @media (max-width: 400px) {
          h1 {
            fontSize: 2.4rem !important;
          }
          h2 {
            fontSize: 1.1rem !important;
          }
          div[style*="maxWidth: 400"] {
            padding: 20px 16px 0 !important; /* Ajuster pour mobile */
          }
        }
        
        @media (max-width: 360px) {
          h1 {
            fontSize: 2.2rem !important;
          }
          div[style*="width: 80px"] {
            width: 70px !important;
            height: 70px !important;
            fontSize: 2.2rem !important;
          }
        }
        
        /* Suppression des espacements sur très petits écrans */
        @media (max-width: 320px) {
          div[style*="padding: 24px 20px 0"] {
            padding: 16px 12px 0 !important; /* Ajuster le padding responsive */
          }
        }
      `}</style>
    </div>
  )
}

