import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { logUserInteraction, logInfo } from '../utils/logger'

export default function HuggingFaceBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
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

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggleBot}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(255, 107, 53, 0.4)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          color: 'white',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: 'scale(1)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)'
          e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.6)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)'
        }}
        title="Assistant COCO - Chatbot de recettes IA"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Widget du chatbot */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '180px',
          right: '20px',
          width: '400px',
          height: '500px',
          background: 'white',
          borderRadius: '20px 20px 20px 20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 107, 53, 0.2)',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpBot 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header du chatbot */}
          <div style={{
            background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '20px 20px 0 0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  Assistant Recettes IA
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.85rem',
                  opacity: 0.9
                }}>
                  {user ? `Salut ${user.user_metadata?.display_name?.split(' ')[0] || 'Chef'} !` : 'Spécialiste en cuisine'}
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
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              ✕
            </button>
          </div>

          {/* Message d'introduction */}
          <div style={{
            padding: '16px 20px',
            background: 'rgba(255, 107, 53, 0.05)',
            borderBottom: '1px solid rgba(255, 107, 53, 0.1)'
          }}>
            <p style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#4B5563',
              lineHeight: '1.4'
            }}>
              💬 Posez-moi vos questions sur les recettes, les ingrédients, ou demandez des suggestions culinaires !
            </p>
          </div>

          {/* Iframe du chatbot Hugging Face */}
          <div style={{ flex: 1, position: 'relative' }}>
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
            
            {/* Indicateur de chargement */}
            {!isLoaded && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '16px',
                color: '#6B7280'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #F3F4F6',
                  borderTop: '3px solid #FF6B35',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>
                  Chargement de l'assistant...
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version mobile responsive */}
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
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0) scale(1);
          }
          40%, 43% {
            transform: translate3d(0,-10px,0) scale(1.1);
          }
          70% {
            transform: translate3d(0,-5px,0) scale(1.05);
          }
          90% {
            transform: translate3d(0,-2px,0) scale(1.02);
          }
        }
        
        button:hover {
          animation: bounce 1s infinite;
        }
        
        /* Responsive mobile */
        @media (max-width: 768px) {
          button {
            bottom: 100px !important;
            right: 16px !important;
            width: 56px !important;
            height: 56px !important;
            font-size: 1.6rem !important;
          }
          
          div[style*="position: fixed"][style*="bottom: 180px"] {
            bottom: 160px !important;
            right: 16px !important;
            left: 16px !important;
            width: auto !important;
            max-width: none !important;
            height: 60vh !important;
            max-height: 450px !important;
          }
        }
        
        @media (max-width: 480px) {
          div[style*="position: fixed"][style*="bottom: 180px"] {
            height: 50vh !important;
            max-height: 400px !important;
          }
        }
      `}</style>
    </>
  )
}
