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
        {isOpen ? (
          <div style={{
            width: '20px',
            height: '20px',
            position: 'relative',
            animation: 'closeRotate 0.3s ease'
          }}>
            <div style={{
              position: 'absolute',
              width: '14px',
              height: '2px',
              background: 'white',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              borderRadius: '1px'
            }} />
            <div style={{
              position: 'absolute',
              width: '14px',
              height: '2px',
              background: 'white',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              borderRadius: '1px'
            }} />
          </div>
        ) : (
          <div style={{
            width: '24px',
            height: '24px',
            position: 'relative',
            animation: 'botAnimation 3s ease-in-out infinite'
          }}>
            {/* Tête du robot */}
            <div style={{
              width: '16px',
              height: '14px',
              background: 'white',
              borderRadius: '4px 4px 2px 2px',
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {/* Yeux */}
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '2px',
                height: '2px',
                background: '#ff6b35',
                borderRadius: '50%',
                animation: 'eyeBlink 4s infinite'
              }} />
              <div style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                width: '2px',
                height: '2px',
                background: '#ff6b35',
                borderRadius: '50%',
                animation: 'eyeBlink 4s infinite 0.1s'
              }} />
              
              {/* Bouche */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '6px',
                height: '1px',
                background: '#ff6b35',
                borderRadius: '1px',
                animation: 'mouthMove 2s ease-in-out infinite'
              }} />
            </div>
            
            {/* Corps */}
            <div style={{
              width: '12px',
              height: '8px',
              background: 'white',
              borderRadius: '2px',
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {/* Bouton central */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '2px',
                background: '#4caf50',
                borderRadius: '50%',
                animation: 'buttonPulse 2s ease-in-out infinite'
              }} />
            </div>
            
            {/* Antennes */}
            <div style={{
              position: 'absolute',
              top: '0',
              left: '6px',
              width: '1px',
              height: '3px',
              background: 'white',
              animation: 'antennaWiggle 1.5s ease-in-out infinite'
            }}>
              <div style={{
                position: 'absolute',
                top: '-1px',
                left: '-1px',
                width: '3px',
                height: '3px',
                border: '1px solid white',
                borderRadius: '50%',
                background: 'transparent'
              }} />
            </div>
            <div style={{
              position: 'absolute',
              top: '0',
              right: '6px',
              width: '1px',
              height: '3px',
              background: 'white',
              animation: 'antennaWiggle 1.5s ease-in-out infinite 0.3s'
            }}>
              <div style={{
                position: 'absolute',
                top: '-1px',
                right: '-1px',
                width: '3px',
                height: '3px',
                border: '1px solid white',
                borderRadius: '50%',
                background: 'transparent'
              }} />
            </div>
          </div>
        )}
        
        {/* Badge IA amélioré */}
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          right: '-4px',
          background: 'linear-gradient(135deg, #4CAF50, #45a049)',
          color: 'white',
          fontSize: isMobile ? '7px' : '8px',
          fontWeight: 'bold',
          padding: isMobile ? '1px 3px' : '2px 4px',
          borderRadius: '6px',
          border: '2px solid white',
          lineHeight: '1',
          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
          animation: 'badgePulse 3s ease-in-out infinite'
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
      <style jsx>{`
        @keyframes botAnimation {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
          }
          25% { 
            transform: translateY(-2px) rotate(1deg);
          }
          50% { 
            transform: translateY(0px) rotate(0deg);
          }
          75% { 
            transform: translateY(-1px) rotate(-1deg);
          }
        }
        
        @keyframes eyeBlink {
          0%, 90%, 100% { 
            transform: scaleY(1);
            opacity: 1;
          }
          95% { 
            transform: scaleY(0.1);
            opacity: 0.5;
          }
        }
        
        @keyframes mouthMove {
          0%, 100% { 
            width: 6px;
            opacity: 1;
          }
          50% { 
            width: 4px;
            opacity: 0.8;
          }
        }
        
        @keyframes buttonPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            background: #4caf50;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            background: #45a049;
          }
        }
        
        @keyframes antennaWiggle {
          0%, 100% { 
            transform: rotate(0deg);
          }
          25% { 
            transform: rotate(5deg);
          }
          75% { 
            transform: rotate(-5deg);
          }
        }
        
        @keyframes badgePulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.5);
          }
        }
        
        @keyframes closeRotate {
          from { 
            transform: rotate(0deg) scale(0.8);
            opacity: 0.8;
          }
          to { 
            transform: rotate(180deg) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
