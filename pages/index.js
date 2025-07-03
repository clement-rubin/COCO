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
            <div className={styles.spinner} />
            <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '600' }}>
              Chargement...
            </p>
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

        {/* Section Hero améliorée */}
        <section className={styles.section} style={{
          background: 'linear-gradient(135deg, #fef3e2 0%, #fff5e6 50%, #fef7ed 100%)',
          borderRadius: '0 0 32px 32px',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '40px',
          paddingBottom: '60px'
        }}>
          {/* Éléments décoratifs de fond */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            borderRadius: '50%',
            opacity: 0.1,
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(45deg, #4caf50, #45a049)',
            borderRadius: '50%',
            opacity: 0.08,
            animation: 'float 8s ease-in-out infinite reverse'
          }} />

          <div className={styles.content} style={{ 
            maxWidth: 400, 
            margin: '0 auto', 
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Logo animé */}
            <div style={{
              width: '90px',
              height: '90px',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              borderRadius: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              margin: '0 auto 20px',
              boxShadow: '0 16px 40px rgba(255, 107, 53, 0.25), 0 8px 20px rgba(255, 107, 53, 0.15)',
              animation: 'heroLogo 3s ease-in-out infinite',
              border: '3px solid rgba(255, 255, 255, 0.8)',
              position: 'relative'
            }}>
              🥥
              {/* Effet de brillance */}
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '20%',
                width: '30%',
                height: '30%',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                filter: 'blur(8px)',
                animation: 'shine 2s ease-in-out infinite'
              }} />
            </div>

            {/* Titre principal avec effet de gradient */}
            <h1 style={{
              fontSize: '3.2rem',
              fontWeight: '900',
              margin: '0 0 12px 0',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e, #ff8a50)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
              lineHeight: '1.1',
              textShadow: '0 4px 8px rgba(255, 107, 53, 0.1)'
            }}>
              COCO
            </h1>

            {/* Sous-titre avec animation */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{
                fontSize: '1.4rem',
                fontWeight: '700',
                margin: '0 0 8px 0',
                color: '#1f2937',
                lineHeight: '1.3'
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
                fontWeight: '500'
              }}>
                L'univers culinaire qui vous ressemble
              </p>
            </div>

            {/* Statistiques de la communauté */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              marginBottom: '32px',
              flexWrap: 'wrap'
            }}>
              {[
                { number: '1000+', label: 'Recettes', icon: '📸' },
                { number: '500+', label: 'Chefs', icon: '👨‍🍳' },
                { number: '50+', label: 'Collections', icon: '📚' }
              ].map((stat, index) => (
                <div key={index} style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  padding: '16px 20px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 107, 53, 0.1)',
                  minWidth: '80px',
                  animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                    {stat.icon}
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#ff6b35',
                    marginBottom: '2px'
                  }}>
                    {stat.number}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions rapides */}
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '24px'
            }}>
              <button
                onClick={() => router.push('/share-photo')}
                style={{
                  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(255, 107, 53, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)'
                  e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)'
                }}
              >
                📸 Partager une recette
              </button>
              <button
                onClick={() => router.push('/collections')}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#ff6b35',
                  border: '2px solid #ff6b35',
                  padding: '14px 28px',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '1rem',
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
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.9)'
                  e.target.style.color = '#ff6b35'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                📚 Collections
              </button>
            </div>

            {/* Indicateur de scroll */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginTop: '20px',
              opacity: 0.6
            }}>
              <span style={{
                fontSize: '0.85rem',
                color: '#9ca3af',
                fontWeight: '500'
              }}>
                Découvrez les dernières recettes
              </span>
              <div style={{
                width: '24px',
                height: '24px',
                border: '2px solid #ff6b35',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'bounce 2s infinite'
              }}>
                <span style={{ fontSize: '0.8rem' }}>↓</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section Feed principale */}
        <section className={styles.section}>
          <div className={styles.content} style={{
            maxWidth: '400px',
            margin: '0 auto',
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
        </section>
      </main>
      <style jsx>{`
        @keyframes heroLogo {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
          }
          50% { 
            transform: translateY(-8px) rotate(2deg);
          }
        }
        
        @keyframes shine {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
          }
          50% { 
            transform: translateY(-20px) rotate(180deg);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
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
            transform: translateY(-8px);
          }
          60% {
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
        
        /* États de focus pour l'accessibilité */
        button:focus {
          outline: 3px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Responsive amélioré */
        @media (max-width: 400px) {
          h1 {
            fontSize: 2.5rem !important;
          }
          h2 {
            fontSize: 1.2rem !important;
          }
        }
      `}</style>
    </div>
  )
}
