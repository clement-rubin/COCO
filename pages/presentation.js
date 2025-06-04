import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'

export default function Presentation() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)

  // Rediriger si l'utilisateur est connecté
  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Détection du scroll pour l'header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fff5f0 0%, #ffffff 100%)'
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

  if (user) {
    return null // Sera redirigé
  }

  const features = [
    {
      icon: '📸',
      title: 'Partagez vos créations',
      description: 'Capturez et partagez vos plus belles réalisations culinaires avec la communauté',
      color: '#10b981'
    },
    {
      icon: '🔍',
      title: 'Découvrez l\'inspiration',
      description: 'Explorez des milliers de recettes créatives partagées par d\'autres passionnés',
      color: '#3b82f6'
    },
    {
      icon: '👥',
      title: 'Connectez-vous',
      description: 'Suivez vos chefs préférés et échangez avec une communauté bienveillante',
      color: '#ef4444'
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%, #f8fafc 100%)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <Head>
        <title>COCO - Bienvenue dans l'univers culinaire</title>
        <meta name="description" content="Rejoignez COCO, la communauté qui célèbre la cuisine et le partage. Découvrez, créez et partagez vos plus belles créations culinaires." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Header fixe */}
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
        padding: '16px 20px',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        borderBottom: isScrolled ? '1px solid rgba(255, 107, 53, 0.1)' : 'none',
        boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.08)' : 'none'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              color: 'white',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}>
              🥥
            </div>
            
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.4rem',
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
                fontSize: '0.7rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Cuisine & Saveurs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Hero */}
      <div style={{
        paddingTop: '120px',
        paddingBottom: '60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Fond décoratif */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'radial-gradient(circle at 50% 30%, rgba(255, 107, 53, 0.1) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '0 20px',
          position: 'relative'
        }}>
          {/* Icône principale */}
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 32px',
            boxShadow: '0 12px 40px rgba(255, 107, 53, 0.3)',
            animation: 'gentleBounce 3s ease-in-out infinite'
          }}>
            🍽️
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            margin: '0 0 20px 0',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Bienvenue dans
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              l'univers COCO
            </span>
          </h1>

          {/* Sous-titre */}
          <p style={{
            fontSize: '1.2rem',
            color: '#6b7280',
            margin: '0 0 40px 0',
            lineHeight: '1.5',
            fontWeight: '400'
          }}>
            La communauté qui célèbre la cuisine,
            <br />
            la créativité et le partage
          </p>

          {/* CTA principal */}
          <button
            onClick={() => router.push('/signup')}
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              color: 'white',
              border: 'none',
              padding: '18px 32px',
              borderRadius: '16px',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 8px 25px rgba(255, 107, 53, 0.3)',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px) scale(1.02)'
              e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)'
              e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)'
            }}
          >
            🚀 Rejoindre COCO
          </button>

          {/* Lien connexion */}
          <p style={{
            fontSize: '0.9rem',
            color: '#6b7280',
            margin: 0
          }}>
            Déjà membre ?{' '}
            <button
              onClick={() => router.push('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ff6b35',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit'
              }}
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      {/* Section Fonctionnalités */}
      <div style={{
        background: 'white',
        borderRadius: '32px 32px 0 0',
        marginTop: '20px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '50px 20px'
        }}>
          {/* Titre section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 12px 0'
            }}>
              Pourquoi COCO ?
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0
            }}>
              Découvrez ce qui rend notre communauté unique
            </p>
          </div>

          {/* Grille des fonctionnalités */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: `2px solid ${feature.color}20`,
                  borderRadius: '20px',
                  padding: '24px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px)'
                  e.target.style.boxShadow = `0 12px 30px ${feature.color}20`
                  e.target.style.borderColor = `${feature.color}40`
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.borderColor = `${feature.color}20`
                }}
              >
                <div style={{
                  fontSize: '2.5rem',
                  marginBottom: '16px'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA final */}
          <div style={{
            textAlign: 'center',
            marginTop: '50px',
            padding: '30px 24px',
            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(247, 147, 30, 0.05))',
            borderRadius: '24px',
            border: '1px solid rgba(255, 107, 53, 0.1)'
          }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 12px 0'
            }}>
              Prêt à commencer ?
            </h3>
            <p style={{
              fontSize: '0.95rem',
              color: '#6b7280',
              margin: '0 0 24px 0'
            }}>
              Rejoignez des milliers de passionnés de cuisine
            </p>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                color: 'white',
                border: 'none',
                padding: '16px 28px',
                borderRadius: '14px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(255, 107, 53, 0.25)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.35)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.25)'
              }}
            >
              Créer mon compte gratuitement
            </button>
          </div>
        </div>
      </div>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @media (max-width: 380px) {
          .hero-title {
            fontSize: '2rem !important';
          }
        }
      `}</style>
    </div>
  )
}
