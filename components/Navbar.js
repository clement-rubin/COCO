import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'

export default function Navbar({ user }) {
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
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              border: 'none',
              boxShadow: profileMenuOpen
                ? '0 8px 32px rgba(255,107,53,0.18)'
                : '0 4px 16px rgba(255,107,53,0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, transform 0.2s',
              transform: profileMenuOpen ? 'scale(1.08)' : 'scale(1)',
              outline: profileMenuOpen ? '2px solid #ff6b35' : 'none'
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid #fff'
                }}
              />
            ) : (
              <span style={{
                fontSize: 28,
                color: 'white',
                fontWeight: 800,
                letterSpacing: '-1px'
              }}>
                {user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || '👤'}
              </span>
            )}
          </button>

          {/* Menu profil flottant */}
          {profileMenuOpen && (
            <div
              ref={profileMenuRef}
              style={{
                marginTop: 12,
                background: 'rgba(255,255,255,0.98)',
                borderRadius: 18,
                boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
                minWidth: 220,
                padding: '18px 0 8px 0',
                position: 'absolute',
                bottom: 64,
                right: 0,
                zIndex: 2100,
                animation: 'profileMenuPop 0.22s'
              }}
            >
              {/* Header profil */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0 18px 10px 18px',
                borderBottom: '1px solid #f3f4f6'
              }}>
                <div style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#ff6b35',
                  border: '2px solid #fff'
                }}>
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    user?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || '👤'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: '#ff6b35',
                    lineHeight: 1.1
                  }}>
                    {user?.user_metadata?.display_name || user?.email || 'Invité'}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: 500,
                    lineHeight: 1.1
                  }}>
                    {user?.email || 'Non connecté'}
                  </div>
                </div>
                <button
                  onClick={() => setProfileMenuOpen(false)}
                  aria-label="Fermer"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 20,
                    color: '#ff6b35',
                    cursor: 'pointer',
                    fontWeight: 700,
                    marginLeft: 2
                  }}
                >✕</button>
              </div>
              {/* Liens rapides */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginTop: 8
              }}>
                <Link href="/profile" style={profileMenuLinkStyle}>
                  👤 Mon profil
                </Link>
                <Link href="/progression" style={profileMenuLinkStyle}>
                  🏆 Progression
                </Link>
                <Link href="/amis" style={profileMenuLinkStyle}>
                  👥 Amis
                </Link>
                <Link href="/settings" style={profileMenuLinkStyle}>
                  ⚙️ Paramètres
                </Link>
                <div style={{ borderTop: '1px solid #f3f4f6', margin: '8px 0 0 0' }} />
                {user ? (
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false)
                      // Redirige ou appelle la déconnexion ici
                      window.location.href = '/logout'
                    }}
                    style={{
                      ...profileMenuLinkStyle,
                      color: '#ef4444',
                      fontWeight: 700,
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    🚪 Déconnexion
                  </button>
                ) : (
                  <Link href="/login" style={{ ...profileMenuLinkStyle, color: '#10b981', fontWeight: 700 }}>
                    🔑 Connexion
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Animations CSS intégrées */}
        <style jsx>{`
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

// Style pour les liens du menu profil
const profileMenuLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 22px',
  fontSize: '1.05rem',
  color: '#374151',
  fontWeight: 600,
  background: 'none',
  border: 'none',
  borderRadius: 10,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background 0.18s, color 0.18s'
}
