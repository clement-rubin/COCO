import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { logUserInteraction, logInfo } from '../utils/logger'

export default function HuggingFaceBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen) {
      logUserInteraction('HUGGINGFACE_BOT_OPENED', 'chat-widget', {
        userId: user?.id,
        userName: user?.user_metadata?.display_name
      })
      setIsLoaded(true)
    }
  }, [isOpen, user])

  // Détecter la taille d'écran
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleBot = () => {
    setIsOpen(!isOpen)
    
    if (!isOpen) {
      logUserInteraction('HUGGINGFACE_BOT_TOGGLE_OPEN', 'chat-button', {
        userId: user?.id
      })
    } else {
      logUserInteraction('HUGGINGFACE_BOT_TOGGLE_CLOSE', 'chat-button', {
        userId: user?.id
      })
    }
  }

  const closeBot = () => {
    setIsOpen(false)
    logUserInteraction('HUGGINGFACE_BOT_CLOSED', 'close-button', {
      userId: user?.id
    })
  }

  // Styles adaptatifs pour mobile/desktop
  const getButtonStyles = () => ({
    position: 'fixed',
    bottom: isMobile ? '90px' : '100px',
    right: isMobile ? '16px' : '20px',
    width: isMobile ? '56px' : '60px',
    height: isMobile ? '56px' : '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(255, 107, 53, 0.4)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '1.6rem' : '1.8rem',
    color: 'white',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    transform: 'scale(1)',
  })

  const getWidgetStyles = () => ({
    position: 'fixed',
    bottom: isMobile ? '160px' : '180px',
    right: isMobile ? '16px' : '20px',
    left: isMobile ? '16px' : 'auto',
    width: isMobile ? 'auto' : '400px',
    maxWidth: isMobile ? '100%' : '400px',
    height: isMobile ? '60vh' : '500px',
    maxHeight: isMobile ? '80vh' : '600px',
    background: 'white',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 107, 53, 0.2)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideUpBot 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  })

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggleBot}
        style={getButtonStyles()}
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.6)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)'
          }
        }}
        title="🤖 Assistant IA - Chatbot automatisé de recettes"
      >
        {isOpen ? '✕' : '🤖'}
        {/* Badge IA responsive */}
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          right: '-4px',
          background: '#4CAF50',
          color: 'white',
          fontSize: isMobile ? '7px' : '8px',
          fontWeight: 'bold',
          padding: isMobile ? '1px 3px' : '2px 4px',
          borderRadius: '6px',
          border: '1px solid white',
          lineHeight: '1'
        }}>
          IA
        </div>
      </button>

      {/* Widget du chatbot responsive */}
      {isOpen && (
        <>
          {/* Overlay pour mobile */}
          {isMobile && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998,
              animation: 'fadeIn 0.3s ease'
            }} onClick={closeBot} />
          )}
          
          <div style={getWidgetStyles()}>
            {/* Header du chatbot responsive */}
            <div style={{
              background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
              color: 'white',
              padding: isMobile ? '12px 16px' : '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '20px 20px 0 0',
              minHeight: isMobile ? '56px' : '72px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '12px',
                flex: 1,
                minWidth: 0
              }}>
                <div style={{
                  position: 'relative',
                  fontSize: isMobile ? '1.3rem' : '1.5rem',
                  flexShrink: 0
                }}>
                  🤖
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: '#4CAF50',
                    color: 'white',
                    fontSize: isMobile ? '6px' : '7px',
                    fontWeight: 'bold',
                    padding: '1px 3px',
                    borderRadius: '4px',
                    lineHeight: '1'
                  }}>
                    IA
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: isMobile ? '0.95rem' : '1.1rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    🤖 Assistant IA Recettes
                  </h3>
                  <p style={{ 
                    margin: 0, 
                    fontSize: isMobile ? '0.75rem' : '0.85rem',
                    opacity: 0.9,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user ? 
                      `Salut ${user.user_metadata?.display_name?.split(' ')[0] || 'Chef'} !` : 
                      'Chatbot automatisé • Spécialisé cuisine'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={closeBot}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '50%',
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  marginLeft: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                ✕
              </button>
            </div>

            {/* Message d'introduction responsive */}
            <div style={{
              padding: isMobile ? '12px 16px' : '16px 20px',
              background: 'rgba(255, 107, 53, 0.05)',
              borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
              flexShrink: 0
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>🤖</span>
                <span style={{
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  fontWeight: '600',
                  color: '#4CAF50',
                  background: 'rgba(76, 175, 80, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '8px'
                }}>
                  ASSISTANT IA
                </span>
              </div>
              <p style={{
                margin: 0,
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                color: '#4B5563',
                lineHeight: '1.4'
              }}>
                💬 Je suis un chatbot IA spécialisé en cuisine. Posez-moi vos questions sur les recettes, les ingrédients, ou demandez des suggestions culinaires !
              </p>
            </div>

            {/* Iframe du chatbot responsive */}
            <div style={{ 
              flex: 1, 
              position: 'relative',
              minHeight: isMobile ? '200px' : '300px'
            }}>
              {isLoaded && (
                <iframe
                  src="https://elizabathhelen-recipe-and-cooking-chatbot.hf.space"
                  frameBorder="0"
                  width="100%"
                  height="100%"
                  style={{
                    border: 'none',
                    borderRadius: '0 0 20px 20px'
                  }}
                  title="Assistant Recettes IA"
                  onLoad={() => {
                    logInfo('Hugging Face chatbot iframe loaded successfully')
                  }}
                />
              )}
              
              {/* Indicateur de chargement responsive */}
              {!isLoaded && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: '16px',
                  color: '#6B7280',
                  padding: isMobile ? '20px' : '40px'
                }}>
                  <div style={{
                    width: isMobile ? '32px' : '40px',
                    height: isMobile ? '32px' : '40px',
                    border: '3px solid #F3F4F6',
                    borderTop: '3px solid #FF6B35',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <p style={{ 
                    margin: 0, 
                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    Chargement de l'assistant...
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Styles CSS responsive améliorés */}
      <style jsx>{`
        @keyframes slideUpBot {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounceSubtle {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }
          40%, 43% {
            transform: translate3d(0,-8px,0) scale(1.05);
          }
          70% {
            transform: translate3d(0,-4px,0) scale(1.02);
          }
          90% {
            transform: translate3d(0,-1px,0) scale(1.01);
          }
        }
        
        /* Responsive breakpoints */
        @media (max-width: 480px) {
          button[title*="Assistant IA"] {
            bottom: 85px !important;
            right: 12px !important;
            width: 52px !important;
            height: 52px !important;
            font-size: 1.4rem !important;
          }
          
          div[style*="position: fixed"][style*="bottom: 160px"] {
            bottom: 140px !important;
            left: 12px !important;
            right: 12px !important;
            height: 55vh !important;
            max-height: 420px !important;
          }
        }
        
        @media (max-width: 360px) {
          button[title*="Assistant IA"] {
            width: 48px !important;
            height: 48px !important;
            font-size: 1.3rem !important;
            bottom: 80px !important;
          }
          
          div[style*="position: fixed"][style*="bottom: 160px"] {
            height: 50vh !important;
            max-height: 380px !important;
            bottom: 130px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Tablette */
          button[title*="Assistant IA"] {
            width: 64px !important;
            height: 64px !important;
            font-size: 1.9rem !important;
            right: 24px !important;
            bottom: 110px !important;
          }
          
          div[style*="position: fixed"][style*="bottom: 180px"] {
            width: 450px !important;
            height: 550px !important;
            bottom: 190px !important;
            right: 24px !important;
          }
        }
        
        @media (min-width: 1025px) {
          /* Desktop large */
          button[title*="Assistant IA"] {
            width: 65px !important;
            height: 65px !important;
            font-size: 2rem !important;
            right: 30px !important;
            bottom: 120px !important;
          }
          
          div[style*="position: fixed"][style*="bottom: 180px"] {
            width: 420px !important;
            height: 580px !important;
            bottom: 200px !important;
            right: 30px !important;
          }
        }
        
        /* Amélioration de l'interaction tactile sur mobile */
        @media (hover: none) and (pointer: coarse) {
          button[title*="Assistant IA"]:active {
            transform: scale(0.95) !important;
            transition: transform 0.1s ease !important;
          }
          
          button[style*="rgba(255, 255, 255, 0.2)"]:active {
            background: rgba(255, 255, 255, 0.4) !important;
          }
        }
        
        /* Support pour les écrans pliables */
        @media (min-height: 600px) and (max-width: 480px) {
          div[style*="position: fixed"][style*="bottom: 160px"] {
            height: 65vh !important;
            max-height: 500px !important;
          }
        }
        
        /* Animation au hover uniquement sur desktop */
        @media (hover: hover) and (pointer: fine) {
          button[title*="Assistant IA"]:hover {
            animation: bounceSubtle 1s infinite;
          }
        }
        
        /* Accessibilité - support pour reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  )
}
