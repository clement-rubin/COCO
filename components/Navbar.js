import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'

export default function Navbar({ user: userProp }) {
  const router = useRouter()
  const { user: authUser, signOut } = useAuth()
  const user = userProp ?? authUser
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  // Fermer le menu profil au clic extérieur
  useEffect(() => {
    if (!profileMenuOpen) return
    const handleClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileMenuOpen])

  useEffect(() => {
    if (!profileMenuOpen) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [profileMenuOpen])

  useEffect(() => {
    if (!profileMenuOpen) return
    const closeMenu = () => setProfileMenuOpen(false)
    router.events?.on('routeChangeStart', closeMenu)
    return () => router.events?.off('routeChangeStart', closeMenu)
  }, [profileMenuOpen, router])

  const currentTab = Array.isArray(router.query?.tab)
    ? router.query.tab[0]
    : router.query?.tab

  const profileMenuLinks = [
    {
      href: '/profil',
      icon: '👤',
      label: 'Mon profil',
      description: 'Personnalisez votre présentation et vos informations',
      isActive: (pathname) => pathname === '/profil' && (!currentTab || currentTab === 'info')
    },
    {
      href: '/progression',
      icon: '🏆',
      label: 'Progression',
      description: 'Suivez vos cartes, séries et récompenses quotidiennes',
      isActive: (pathname) => pathname === '/progression'
    },
    {
      href: '/amis',
      icon: '👥',
      label: 'Amis',
      description: 'Retrouvez vos amis gourmets et vos invitations',
      isActive: (pathname) => pathname === '/amis'
    },
    {
      href: '/social',
      icon: '📰',
      label: 'Fil social',
      description: 'Partagez vos photos et découvrez les dernières créations',
      isActive: (pathname) => pathname === '/social'
    },
    {
      href: '/profil?tab=settings',
      icon: '⚙️',
      label: 'Paramètres',
      description: 'Gérez votre compte, la confidentialité et les notifications',
      isActive: (pathname) => pathname === '/profil' && currentTab === 'settings'
    }
  ]

  const handleSignOut = async () => {
    setProfileMenuOpen(false)
    if (typeof signOut === 'function') {
      const { error } = await signOut()
      if (error) {
        console.error('Erreur lors de la déconnexion', error)
      } else {
        router.push('/')
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <>
      <nav style={{
        background: 'rgba(255,255,255,0.96)',
        borderBottom: '1.5px solid #f1f5f9',
        boxShadow: '0 2px 12px rgba(255,107,53,0.05), 0 1.5px 6px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 1200,
        width: '100%',
        backdropFilter: 'blur(18px) saturate(160%)'
      }}>
        <div style={{
          maxWidth: 430,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          height: 64,
          position: 'relative'
        }}>
          {/* Logo amélioré */}
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '8px 12px',
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}
          className="logo-link"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.25)'
            e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
            e.currentTarget.style.background = 'transparent'
          }}>
            {/* Effet de brillance au hover */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              transition: 'left 0.6s',
              pointerEvents: 'none',
              zIndex: 1
            }} className="shine-effect" />
            
            {/* Icône du logo avec animations */}
            <div style={{
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff8c42 100%)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '1.4rem',
              boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            className="logo-icon">
              {/* Effet de pulsation subtile */}
              <div style={{
                position: 'absolute',
                inset: '-2px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                opacity: 0,
                animation: 'logoPulse 3s infinite',
                zIndex: -1
              }} />
              
              {/* Icône principale */}
              <span style={{
                transition: 'all 0.3s ease',
                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
              }}>
                🥥
              </span>
              
              {/* Particules flottantes au hover */}
              <div className="floating-particles" style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}>
                <span style={{
                  position: 'absolute',
                  top: '10%',
                  right: '15%',
                  fontSize: '0.6rem',
                  animation: 'float1 2s infinite ease-in-out'
                }}>✨</span>
                <span style={{
                  position: 'absolute',
                  bottom: '15%',
                  left: '10%',
                  fontSize: '0.5rem',
                  animation: 'float2 2.5s infinite ease-in-out 0.5s'
                }}>🍴</span>
                <span style={{
                  position: 'absolute',
                  top: '20%',
                  left: '70%',
                  fontSize: '0.4rem',
                  animation: 'float3 2.2s infinite ease-in-out 1s'
                }}>⭐</span>
              </div>
            </div>
            
            {/* Texte du logo */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}>
              <h2 style={{
                margin: 0,
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 70%, #ff8c42 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                fontWeight: 900,
                fontSize: '1.35rem',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                transition: 'all 0.3s ease',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              className="logo-text">
                COCO
              </h2>
              
              {/* Sous-titre animé */}
              <span style={{
                fontSize: '0.65rem',
                color: '#64748b',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginTop: '1px',
                opacity: 0.8,
                transition: 'all 0.3s ease'
              }}
              className="logo-subtitle">
                Cuisine & Saveurs
              </span>
            </div>
            
            {/* Badge "nouveau" ou "tendance" occasionnel */}
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '8px',
              opacity: 0,
              transform: 'scale(0.8)',
              animation: 'badgeAppear 4s infinite',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              zIndex: 2
            }}
            className="trending-badge">
              HOT
            </div>
          </Link>

          {/* Navigation Desktop */}
          <div className="desktop-nav" style={{
            display: 'flex',
            gap: 18,
            alignItems: 'center'
          }}>
            <Link href="/" style={navLinkStyle}>Accueil</Link>
            <Link href="/explorer" style={navLinkStyle}>Explorer</Link>
            <Link href="/amis" style={navLinkStyle}>Amis</Link>
            <Link href="/progression" style={navLinkStyle}>Progression</Link>
            <Link href="/share-photo" style={addBtnStyle}>➕ Partager</Link>
          </div>

          {/* Bouton Menu Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              fontSize: 26,
              color: '#ff6b35',
              borderRadius: 12,
              padding: 8,
              cursor: 'pointer'
            }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <div style={{
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            borderRadius: '0 0 18px 18px',
            padding: 18,
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            zIndex: 999
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <Link href="/" style={mobileNavLinkStyle}>🏠 Accueil</Link>
              <Link href="/explorer" style={mobileNavLinkStyle}>🔍 Explorer</Link>
              <Link href="/amis" style={mobileNavLinkStyle}>👥 Amis</Link>
              <Link href="/progression" style={mobileNavLinkStyle}>🏆 Progression</Link>
              <Link href="/share-photo" style={mobileNavLinkStyle}>➕ Partager une photo</Link>
            </div>
          </div>
        )}

        {/* Bouton profil flottant en bas à droite */}
        <div
          style={{
            position: 'fixed',
            bottom: 22,
            right: 22,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}
        >
          <button
            aria-label="Menu profil"
            onClick={() => setProfileMenuOpen(v => !v)}
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: profileMenuOpen
                ? 'linear-gradient(135deg, #ff824d, #ffb347)'
                : 'linear-gradient(135deg, #ff6b35, #f7931e)',
              border: '1.5px solid rgba(255,255,255,0.65)',
              boxShadow: profileMenuOpen
                ? '0 18px 40px rgba(255,107,53,0.28)'
                : '0 10px 26px rgba(255,107,53,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease',
              transform: profileMenuOpen ? 'scale(1.05)' : 'scale(1)',
              outline: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid #fff',
                  boxShadow: '0 6px 18px rgba(15,23,42,0.18)'
                }}
              />
            ) : (
              <span style={{
                fontSize: 24,
                color: 'white',
                fontWeight: 800,
                letterSpacing: '-0.6px'
              }}>
                {user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || '👤'}
              </span>
            )}
          </button>

          {/* Menu profil flottant */}
          {profileMenuOpen && (
            <div
              ref={profileMenuRef}
              className="profile-menu"
              style={{
                position: 'absolute',
                bottom: 72,
                right: 0
              }}
            >
              <div className="profile-menu__header">
                <div className="profile-menu__avatar">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar utilisateur"
                    />
                  ) : (
                    <span>
                      {user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() ||
                        user?.email?.charAt(0)?.toUpperCase() || '👤'}
                    </span>
                  )}
                </div>
                <div className="profile-menu__identity">
                  <span className="profile-menu__name">
                    {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Invité COCO'}
                  </span>
                  <span className="profile-menu__email">
                    {user?.email || 'Connectez-vous pour profiter de toute l’expérience'}
                  </span>
                </div>
                <button
                  onClick={() => setProfileMenuOpen(false)}
                  aria-label="Fermer le menu profil"
                  className="profile-menu__close"
                >
                  ✕
                </button>
              </div>

              {user ? (
                <>
                  <div className="profile-menu__welcome">
                    <span>Continuez votre série quotidienne pour débloquer de nouvelles cartes ✨</span>
                  </div>
                  <p className="profile-menu__section-title">Mon espace</p>
                  <div className="profile-menu__links">
                    {profileMenuLinks.map(link => {
                      const isActive = link.isActive?.(router.pathname) || false
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`profile-menu__link${isActive ? ' is-active' : ''}`}
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <span className="profile-menu__link-icon">{link.icon}</span>
                          <span className="profile-menu__link-content">
                            <span className="profile-menu__link-label">{link.label}</span>
                            <span className="profile-menu__link-description">{link.description}</span>
                          </span>
                          <span className="profile-menu__link-chevron">›</span>
                        </Link>
                      )
                    })}
                  </div>
                  <div className="profile-menu__footer">
                    <button type="button" className="profile-menu__logout" onClick={handleSignOut}>
                      🚪 Se déconnecter
                    </button>
                  </div>
                </>
              ) : (
                <div className="profile-menu__empty">
                  <p>Connectez-vous pour retrouver vos cartes, votre progression et vos amis.</p>
                  <div className="profile-menu__cta-group">
                    <Link
                      href="/login"
                      className="profile-menu__cta"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      🔑 Connexion
                    </Link>
                    <Link
                      href="/signup"
                      className="profile-menu__cta profile-menu__cta--primary"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      ✨ Créer un compte
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animations CSS intégrées */}
        <style jsx>{`
          .profile-menu {
            position: relative;
            background: linear-gradient(150deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 247, 237, 0.98) 100%);
            border-radius: 22px;
            box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
            min-width: 260px;
            padding: 16px 0 12px;
            border: 1px solid rgba(255, 107, 53, 0.12);
            backdrop-filter: blur(16px);
            overflow: hidden;
            animation: profileMenuPop 0.22s ease;
          }

          .profile-menu::after {
            content: '';
            position: absolute;
            bottom: -10px;
            right: 32px;
            width: 20px;
            height: 20px;
            background: inherit;
            transform: rotate(45deg);
            border-radius: 4px;
            border-right: 1px solid rgba(255, 107, 53, 0.12);
            border-bottom: 1px solid rgba(255, 107, 53, 0.12);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
            z-index: -1;
          }

          .profile-menu__header {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 20px 16px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.16);
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.08), rgba(255, 244, 230, 0));
          }

          .profile-menu__avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ffe7d6, #fff6ec);
            border: 2px solid #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            font-weight: 700;
            color: #ff6b35;
            box-shadow: 0 6px 18px rgba(255, 107, 53, 0.18);
            overflow: hidden;
          }

          .profile-menu__avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .profile-menu__identity {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .profile-menu__name {
            font-weight: 700;
            font-size: 1rem;
            color: #111827;
            line-height: 1.1;
          }

          .profile-menu__email {
            font-size: 0.82rem;
            color: #6b7280;
            line-height: 1.2;
          }

          .profile-menu__close {
            background: rgba(255, 255, 255, 0.7);
            border: none;
            color: #ff6b35;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            border-radius: 12px;
            padding: 6px 10px;
            transition: background 0.2s ease, transform 0.2s ease;
          }

          .profile-menu__close:hover {
            background: rgba(255, 107, 53, 0.12);
            transform: scale(1.05);
          }

          .profile-menu__welcome {
            margin: 12px 20px 4px;
            padding: 10px 12px;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(255, 215, 170, 0.35), rgba(255, 240, 224, 0.35));
            color: #b45309;
            font-size: 0.8rem;
            font-weight: 600;
            line-height: 1.35;
          }

          .profile-menu__section-title {
            margin: 8px 20px 4px;
            font-size: 0.74rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #94a3b8;
            font-weight: 700;
          }

          .profile-menu__links {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 4px 10px 8px;
          }

          .profile-menu__link {
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 14px;
            padding: 10px 12px;
            text-decoration: none;
            color: #0f172a;
            background: transparent;
            transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          }

          .profile-menu__link:hover {
            background: rgba(255, 107, 53, 0.08);
            box-shadow: inset 0 0 0 1px rgba(255, 107, 53, 0.18);
            transform: translateX(4px);
          }

          .profile-menu__link.is-active {
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.16), rgba(255, 171, 94, 0.18));
            box-shadow: inset 0 0 0 1px rgba(255, 107, 53, 0.28);
            color: #9a3412;
          }

          .profile-menu__link-icon {
            font-size: 1.25rem;
          }

          .profile-menu__link-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
            flex: 1;
          }

          .profile-menu__link-label {
            font-weight: 700;
            font-size: 0.92rem;
          }

          .profile-menu__link-description {
            font-size: 0.78rem;
            color: #64748b;
          }

          .profile-menu__link.is-active .profile-menu__link-description {
            color: #9a3412;
          }

          .profile-menu__link-chevron {
            font-size: 1.1rem;
            color: rgba(148, 163, 184, 0.9);
          }

          .profile-menu__footer {
            border-top: 1px solid rgba(148, 163, 184, 0.16);
            margin: 12px 0 0;
            padding: 12px 20px 4px;
          }

          .profile-menu__logout {
            width: 100%;
            background: rgba(239, 68, 68, 0.12);
            border: none;
            border-radius: 14px;
            color: #b91c1c;
            font-weight: 700;
            padding: 10px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background 0.2s ease, transform 0.2s ease;
          }

          .profile-menu__logout:hover {
            background: rgba(239, 68, 68, 0.18);
            transform: translateY(-1px);
          }

          .profile-menu__empty {
            padding: 18px 20px 12px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            text-align: left;
          }

          .profile-menu__empty p {
            margin: 0;
            font-size: 0.85rem;
            color: #475569;
            line-height: 1.4;
          }

          .profile-menu__cta-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .profile-menu__cta {
            flex: 1;
            min-width: 120px;
            text-align: center;
            padding: 10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            text-decoration: none;
            font-weight: 600;
            color: #0f172a;
            background: rgba(255, 255, 255, 0.85);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .profile-menu__cta:hover {
            transform: translateY(-1px);
            box-shadow: 0 12px 26px rgba(148, 163, 184, 0.25);
          }

          .profile-menu__cta--primary {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: #fff;
            border: none;
            box-shadow: 0 14px 28px rgba(255, 107, 53, 0.38);
          }

          .profile-menu__cta--primary:hover {
            box-shadow: 0 18px 32px rgba(255, 107, 53, 0.45);
          }

          @media (max-width: 520px) {
            .profile-menu {
              min-width: 240px;
            }

            .profile-menu__header {
              padding: 12px 16px 14px;
            }

            .profile-menu__section-title {
              margin: 6px 16px 4px;
            }
          }

          @keyframes logoPulse {
            0%, 100% {
              opacity: 0;
              transform: scale(1);
            }
            50% {
              opacity: 0.3;
              transform: scale(1.05);
            }
          }

          @keyframes float1 {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
            50% { transform: translateY(-8px) rotate(180deg); opacity: 1; }
          }

          @keyframes float2 {
            0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
            50% { transform: translateY(-6px) rotate(-180deg); opacity: 1; }
          }

          @keyframes float3 {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
            50% { transform: translateY(-4px) scale(1.2); opacity: 1; }
          }

          @keyframes badgeAppear {
            0%, 70%, 100% { opacity: 0; transform: scale(0.8); }
            75%, 95% { opacity: 1; transform: scale(1); }
          }

          @keyframes profileMenuPop {
            0% { opacity: 0; transform: translateY(20px) scale(0.97);}
            100% { opacity: 1; transform: translateY(0) scale(1);}
          }

          .logo-link:hover .shine-effect {
            left: 100% !important;
          }

          .logo-link:hover .floating-particles {
            opacity: 1 !important;
          }

          .logo-link:hover .logo-icon {
            transform: rotate(5deg) scale(1.05);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }

          .logo-link:hover .logo-text {
            transform: translateX(2px);
            filter: brightness(1.1);
          }

          .logo-link:hover .logo-subtitle {
            color: #ff6b35;
            opacity: 1;
            transform: translateX(2px);
          }

          .logo-link:active {
            transform: scale(0.98) translateY(1px) !important;
          }

          @media (max-width: 600px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: block !important; }

            .logo-link {
              gap: 8px !important;
            }

            .logo-icon {
              width: 38px !important;
              height: 38px !important;
              font-size: 1.2rem !important;
            }

            .logo-text {
              font-size: 1.2rem !important;
            }

            .logo-subtitle {
              font-size: 0.6rem !important;
            }
          }

          /* Effet de hover global amélioré */
          @media (hover: hover) {
            .logo-link {
              position: relative;
            }

            .logo-link::before {
              content: '';
              position: absolute;
              inset: -4px;
              background: linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(247, 147, 30, 0.1));
              border-radius: 20px;
              opacity: 0;
              transition: opacity 0.3s ease;
              z-index: -1;
            }

            .logo-link:hover::before {
              opacity: 1;
            }
          }
        `}</style>

        <style jsx>{`
          @media (max-width: 600px) {
            .desktop-nav { display: none !important; }
            .mobile-menu-btn { display: block !important; }
          }
          @media (min-width: 601px) {
            .mobile-menu-btn { display: none !important; }
          }
        `}</style>
      </nav>
    </>
  )
}

// Styles objets pour éviter la répétition
const navLinkStyle = {
  textDecoration: 'none',
  color: '#475569',
  fontWeight: 600,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: '1rem',
  transition: 'all 0.2s',
  background: 'none'
}
const addBtnStyle = {
  ...navLinkStyle,
  background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
  color: 'white',
  fontWeight: 700,
  boxShadow: '0 2px 8px #ff6b3533',
  border: 'none'
}
const mobileNavLinkStyle = {
  textDecoration: 'none',
  color: '#374151',
  fontWeight: 600,
  padding: '12px 0',
  borderRadius: 10,
  fontSize: '1.05rem',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background 0.2s, color 0.2s'
}

