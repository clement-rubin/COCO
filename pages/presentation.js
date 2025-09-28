import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'

export default function Presentation() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

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

  // Rotation automatique des témoignages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
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
      details: 'Prenez des photos de vos plats, ajoutez la recette et les étapes de préparation. Inspirez d\'autres cuisiniers avec vos créations originales.',
      color: '#10b981'
    },
    {
      icon: '🔍',
      title: 'Découvrez l\'inspiration',
      description: 'Explorez des milliers de recettes créatives partagées par d\'autres passionnés',
      details: 'Naviguez par catégories, filtrez par ingrédients ou difficulté. Sauvegardez vos recettes préférées pour plus tard.',
      color: '#3b82f6'
    },
    {
      icon: '👥',
      title: 'Connectez-vous',
      description: 'Suivez vos chefs préférés et échangez avec une communauté bienveillante',
      details: 'Créez votre réseau culinaire, échangez des conseils et participez à des défis cuisine entre amis.',
      color: '#ef4444'
    },
    {
      icon: '🏆',
      title: 'Progressez ensemble',
      description: 'Participez à des compétitions amicales et débloquez des trophées',
      details: 'Relevez des défis hebdomadaires, gagnez des points et montez dans le classement communautaire.',
      color: '#f59e0b'
    },
    {
      icon: '🎯',
      title: 'Organisez vos recettes',
      description: 'Créez des collections personnalisées et planifiez vos repas',
      details: 'Organisez vos recettes par occasion, saison ou type de plat. Planifiez vos menus de la semaine facilement.',
      color: '#8b5cf6'
    },
    {
      icon: '💬',
      title: 'Échangez et apprenez',
      description: 'Posez des questions, partagez des astuces et apprenez des autres',
      details: 'Commentez les recettes, demandez des conseils et partagez vos propres astuces de cuisine.',
      color: '#ec4899'
    }
  ]

  const testimonials = [
    {
      name: 'Marie C.',
      role: 'Passionnée de pâtisserie',
      content: 'COCO a transformé ma façon de cuisiner ! Je trouve toujours de nouvelles idées et j\'adore partager mes créations avec la communauté.',
      avatar: '👩‍🍳'
    },
    {
      name: 'Thomas L.',
      role: 'Chef amateur',
      content: 'Une app géniale pour découvrir de nouvelles recettes et progresser. Les défis hebdomadaires me motivent à sortir de ma zone de confort !',
      avatar: '👨‍🍳'
    },
    {
      name: 'Sophie M.',
      role: 'Maman de famille',
      content: 'Parfait pour organiser mes repas de la semaine. Mes enfants adorent participer aux recettes que je trouve sur COCO.',
      avatar: '👩'
    }
  ]

  const stats = [
    { number: '10K+', label: 'Recettes partagées', icon: '📝' },
    { number: '5K+', label: 'Cuisiniers actifs', icon: '👥' },
    { number: '50K+', label: 'Photos de plats', icon: '📸' },
    { number: '1K+', label: 'Défis relevés', icon: '🏆' }
  ]

  return (
    <div style={{
      background: 'linear-gradient(180deg, #fff5f0 0%, #ffffff 40%, #f8fafc 100%)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <Head>
        <title>COCO - La communauté culinaire qui vous inspire</title>
        <meta name="description" content="Rejoignez COCO, la plateforme sociale dédiée à la cuisine. Partagez vos recettes, découvrez de nouvelles saveurs et connectez-vous avec des passionnés de cuisine du monde entier." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="keywords" content="recettes, cuisine, communauté, partage, food, cooking, social" />
        <meta property="og:title" content="COCO - La communauté culinaire qui vous inspire" />
        <meta property="og:description" content="Partagez vos recettes, découvrez de nouvelles saveurs et connectez-vous avec des passionnés de cuisine." />
        <meta property="og:type" content="website" />
      </Head>

      {/* Header fixe amélioré */}
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
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              color: 'white',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
            }}>
              🥥
            </div>
            
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '1.6rem',
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
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                Cuisine & Communauté
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/auth')}
              style={{
                background: 'transparent',
                border: '2px solid #ff6b35',
                color: '#ff6b35',
                padding: '8px 16px',
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
              Se connecter
            </button>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 53, 0.3)'
              }}
            >
              Rejoindre
            </button>
          </div>
        </div>
      </div>

      {/* Section Hero améliorée */}
      <div style={{
        paddingTop: '120px',
        paddingBottom: '80px',
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
          maxWidth: '800px',
          margin: '0 auto',
          padding: '0 20px',
          position: 'relative'
        }}>
          {/* Icône principale animée */}
          <div style={{
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
            borderRadius: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            margin: '0 auto 40px',
            boxShadow: '0 15px 50px rgba(255, 107, 53, 0.3)',
            animation: 'gentleBounce 3s ease-in-out infinite'
          }}>
            🍽️
          </div>

          {/* Titre principal */}
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '800',
            margin: '0 0 24px 0',
            lineHeight: '1.1',
            background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            La cuisine devient
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              sociale et inspirante
            </span>
          </h1>

          {/* Sous-titre explicatif */}
          <p style={{
            fontSize: '1.4rem',
            color: '#6b7280',
            margin: '0 0 40px 0',
            lineHeight: '1.6',
            fontWeight: '400',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            COCO est la première communauté française dédiée au partage de recettes entre passionnés. 
            Découvrez, créez et partagez vos plus belles créations culinaires.
          </p>

          {/* CTAs principaux */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            marginBottom: '60px',
            flexWrap: 'wrap'
          }}>
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
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
              🚀 Rejoindre gratuitement
            </button>

            <button
              onClick={() => {
                document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })
              }}
              style={{
                background: 'transparent',
                color: '#ff6b35',
                border: '2px solid #ff6b35',
                padding: '18px 32px',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ff6b35'
                e.target.style.color = 'white'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#ff6b35'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              📱 Découvrir l'app
            </button>
          </div>

          {/* Statistiques */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '24px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {stats.map((stat, index) => (
              <div
                key={index}
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '20px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 107, 53, 0.1)'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: '800',
                  color: '#ff6b35',
                  marginBottom: '4px'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section démo */}
      <div id="demo" style={{
        background: 'white',
        borderRadius: '40px 40px 0 0',
        marginTop: '40px',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.08)'
      }}>
        {/* Section Fonctionnalités détaillées */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 20px 60px'
        }}>
          {/* Titre section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Tout ce dont vous avez besoin pour cuisiner
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: '#6b7280',
              margin: 0,
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              COCO réunit tous les outils pour transformer votre passion culinaire en expérience sociale enrichissante
            </p>
          </div>

          {/* Grille des fonctionnalités */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '40px'
          }}>
            {features.map((feature, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: `2px solid ${feature.color}20`,
                  borderRadius: '24px',
                  padding: '32px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-8px)'
                  e.target.style.boxShadow = `0 20px 40px ${feature.color}20`
                  e.target.style.borderColor = `${feature.color}40`
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.borderColor = `${feature.color}20`
                }}
              >
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '20px'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  margin: '0 0 16px 0',
                  lineHeight: '1.6'
                }}>
                  {feature.description}
                </p>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#9ca3af',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  {feature.details}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section témoignages */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(247, 147, 30, 0.05))',
          padding: '80px 20px',
          margin: '60px 0'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 20px 0'
            }}>
              Ils adorent cuisiner avec COCO
            </h2>
            <p style={{
              fontSize: '1.1rem',
              color: '#6b7280',
              marginBottom: '50px'
            }}>
              Découvrez ce que nos utilisateurs pensent de leur expérience
            </p>

            <div style={{
              background: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '20px'
              }}>
                {testimonials[currentTestimonial].avatar}
              </div>
              <blockquote style={{
                fontSize: '1.2rem',
                color: '#374151',
                fontStyle: 'italic',
                lineHeight: '1.6',
                margin: '0 0 24px 0'
              }}>
                "{testimonials[currentTestimonial].content}"
              </blockquote>
              <div>
                <div style={{
                  fontWeight: '700',
                  color: '#1f2937',
                  fontSize: '1.1rem'
                }}>
                  {testimonials[currentTestimonial].name}
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: '0.9rem'
                }}>
                  {testimonials[currentTestimonial].role}
                </div>
              </div>

              {/* Indicateurs */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '24px'
              }}>
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: 'none',
                      background: index === currentTestimonial ? '#ff6b35' : '#e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            Prêt à transformer votre cuisine ?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: '#6b7280',
            margin: '0 0 40px 0',
            lineHeight: '1.6'
          }}>
            Rejoignez dès maintenant des milliers de passionnés de cuisine. 
            C'est gratuit et ça prend moins d'une minute !
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                color: 'white',
                border: 'none',
                padding: '20px 40px',
                borderRadius: '16px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 25px rgba(255, 107, 53, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)'
              }}
            >
              🎉 Créer mon compte gratuitement
            </button>
          </div>
          
          <p style={{
            fontSize: '0.9rem',
            color: '#9ca3af',
            marginTop: '20px'
          }}>
            Aucune carte de crédit requise • Accès immédiat • Communauté bienveillante
          </p>
        </div>
      </div>

      {/* Footer simple */}
      <footer style={{
        background: '#1f2937',
        color: 'white',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              🥥
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>COCO</span>
          </div>
          <p style={{ margin: '0 0 16px 0', opacity: 0.8 }}>
            La communauté culinaire qui vous inspire
          </p>
          <div style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            fontSize: '0.9rem',
            opacity: 0.7
          }}>
            <button
              onClick={() => router.push('/auth')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Se connecter
            </button>
            <span>•</span>
            <button
              onClick={() => router.push('/signup')}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              S'inscrire
            </button>
          </div>
        </div>
      </footer>

      {/* Styles pour les animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes gentleBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @media (max-width: 768px) {
          h1 {
            fontSize: '2.5rem !important';
          }
          
          .hero-subtitle {
            fontSize: '1.1rem !important';
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          
          .cta-buttons {
            flex-direction: column !important;
          }
        }
        
        @media (max-width: 480px) {
          h1 {
            fontSize: '2rem !important';
          }
        }
      `}</style>
    </div>
  )
}
