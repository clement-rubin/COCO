import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useRouter } from 'next/router'
import { logUserInteraction, logInfo } from '../utils/logger'
import { TidioUtils, ContextualHelp } from './TidioUtils'

export default function TidioChat() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Éviter de charger Tidio plusieurs fois
    if (window.tidioChatApi || document.querySelector('script[src*="tidio"]')) {
      return
    }

    // Charger le script Tidio
    const script = document.createElement('script')
    script.src = '//code.tidio.co/t20tdgapr9jil5is7qeilj62uuksc4mi.js'
    script.async = true
    
    script.onload = () => {
      logInfo('Tidio chat loaded successfully')
      
      // Configuration Tidio après chargement
      if (window.tidioChatApi) {
        // Personnaliser avec les données utilisateur si connecté
        if (user) {
          window.tidioChatApi.setVisitorData({
            name: user.user_metadata?.display_name || 'Chef COCO',
            email: user.email,
            userId: user.id,
            customData: {
              registrationDate: user.created_at,
              lastLogin: new Date().toISOString(),
              currentPage: router.pathname
            }
          })
          
          // Message de bienvenue personnalisé avec contexte
          setTimeout(() => {
            TidioUtils.sendWelcomeMessage(user.user_metadata?.display_name?.split(' ')[0])
            
            // Aide contextuelle après 2 secondes
            setTimeout(() => {
              TidioUtils.sendContextualHelp(router.pathname, user)
            }, 2000)
          }, 1000)
          
          logUserInteraction('TIDIO_USER_IDENTIFIED', 'chat-initialization', {
            userName: user.user_metadata?.display_name,
            userEmail: user.email,
            currentPage: router.pathname
          })
        } else {
          // Message pour utilisateurs non connectés
          setTimeout(() => {
            TidioUtils.sendMessage(
              'Bienvenue sur COCO ! 🍴 Je suis là pour vous aider avec vos questions sur l\'app de recettes.',
              true
            )
            
            // Encourager la connexion
            setTimeout(() => {
              TidioUtils.sendMessage(
                '💡 Conseil : Connectez-vous pour accéder à toutes les fonctionnalités et partager vos recettes !',
                true
              )
            }, 3000)
          }, 1000)
        }

        // Personnalisation du style pour correspondre à COCO
        window.tidioChatApi.setColorPalette('#FF6B35')
        
        // Événements Tidio pour le logging et l'interaction
        window.tidioChatApi.on('ready', () => {
          logInfo('Tidio chat is ready')
        })
        
        window.tidioChatApi.on('open', () => {
          logUserInteraction('TIDIO_CHAT_OPENED', 'chat-widget', {
            userId: user?.id,
            currentPage: router.pathname
          })
        })
        
        window.tidioChatApi.on('close', () => {
          logUserInteraction('TIDIO_CHAT_CLOSED', 'chat-widget', {
            userId: user?.id,
            currentPage: router.pathname
          })
        })
        
        window.tidioChatApi.on('messageFromVisitor', (data) => {
          logUserInteraction('TIDIO_MESSAGE_SENT', 'chat-message', {
            messageLength: data.message?.length,
            userId: user?.id,
            currentPage: router.pathname
          })
          
          // Gestion automatique des mots-clés
          if (data.message) {
            ContextualHelp.handleKeyword(data.message)
          }
        })
        
        window.tidioChatApi.on('messageFromOperator', (data) => {
          logUserInteraction('TIDIO_MESSAGE_RECEIVED', 'chat-message', {
            messageLength: data.message?.length,
            userId: user?.id
          })
        })
      }
    }
    
    script.onerror = () => {
      console.error('Erreur lors du chargement de Tidio')
    }
    
    // Ajouter le script au document
    document.head.appendChild(script)
    
    // Styles personnalisés pour Tidio avec positionnement adapté
    const customStyles = document.createElement('style')
    customStyles.textContent = `
      /* Personnalisation Tidio pour COCO */
      #tidio-chat {
        /* Position adaptée pour coexister avec HuggingFace bot */
        bottom: 100px !important;
        right: 90px !important;
        z-index: 998 !important;
      }
      
      /* Bouton du chat personnalisé */
      #tidio-chat-button {
        background: linear-gradient(135deg, #4CAF50, #45A049) !important;
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4) !important;
        border-radius: 50% !important;
        width: 56px !important;
        height: 56px !important;
        transition: all 0.3s ease !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
      }
      
      #tidio-chat-button:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 12px 35px rgba(76, 175, 80, 0.6) !important;
      }
      
      /* Badge pour distinguer du bot IA */
      #tidio-chat-button::after {
        content: "💬";
        position: absolute;
        top: -4px;
        right: -4px;
        background: #FF6B35;
        color: white;
        font-size: 12px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        font-weight: bold;
      }
      
      /* Widget du chat */
      #tidio-chat-iframe {
        border-radius: 20px 20px 0 0 !important;
        border: 1px solid rgba(76, 175, 80, 0.2) !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
        max-width: 380px !important;
      }
      
      /* Message bubble */
      .tidio-message-bubble {
        background: rgba(76, 175, 80, 0.1) !important;
        border: 1px solid rgba(76, 175, 80, 0.2) !important;
        backdrop-filter: blur(10px) !important;
      }
      
      /* Responsive pour mobile */
      @media (max-width: 768px) {
        #tidio-chat {
          bottom: 100px !important;
          right: 16px !important;
          left: auto !important;
        }
        
        #tidio-chat-button {
          width: 52px !important;
          height: 52px !important;
        }
        
        #tidio-chat-iframe {
          width: calc(100vw - 32px) !important;
          max-width: 350px !important;
          right: 16px !important;
          left: 16px !important;
        }
        
        /* Ajustement quand les deux bots sont présents */
        #tidio-chat {
          right: 80px !important;
        }
      }
      
      @media (max-width: 480px) {
        #tidio-chat {
          right: 16px !important;
        }
        
        /* Stack les bots verticalement sur très petit écran */
        #tidio-chat {
          bottom: 170px !important;
        }
      }
    `
    document.head.appendChild(customStyles)
    
    // Nettoyage
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
      if (document.head.contains(customStyles)) {
        document.head.removeChild(customStyles)
      }
    }
  }, [user, router.pathname])

  // Réagir aux changements de page pour l'aide contextuelle
  useEffect(() => {
    if (window.tidioChatApi && user) {
      // Mettre à jour les données visiteur avec la nouvelle page
      window.tidioChatApi.setVisitorData({
        name: user.user_metadata?.display_name || 'Chef COCO',
        email: user.email,
        userId: user.id,
        customData: {
          currentPage: router.pathname,
          lastPageChange: new Date().toISOString()
        }
      })
    }
  }, [router.pathname, user])

  // Composant invisible - Tidio gère son propre rendu
  return null
}
