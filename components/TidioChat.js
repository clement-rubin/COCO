import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import { logUserInteraction, logInfo } from '../utils/logger'

export default function TidioChat() {
  const { user } = useAuth()

  useEffect(() => {
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
            userId: user.id
          })
          
          // Message de bienvenue personnalisé
          window.tidioChatApi.addMessage({
            type: 'text',
            text: `Bonjour ${user.user_metadata?.display_name || 'Chef'} ! 👨‍🍳 Comment puis-je vous aider avec COCO aujourd'hui ?`,
            author: 'operator'
          })
          
          logUserInteraction('TIDIO_USER_IDENTIFIED', 'chat-initialization', {
            userName: user.user_metadata?.display_name,
            userEmail: user.email
          })
        } else {
          // Message pour utilisateurs non connectés
          window.tidioChatApi.addMessage({
            type: 'text',
            text: 'Bienvenue sur COCO ! 🍴 Je suis là pour vous aider avec vos questions sur l\'app de recettes.',
            author: 'operator'
          })
        }

        // Personnalisation du style pour correspondre à COCO
        window.tidioChatApi.setColorPalette('#FF6B35')
        
        // Événements Tidio pour le logging
        window.tidioChatApi.on('ready', () => {
          logInfo('Tidio chat is ready')
        })
        
        window.tidioChatApi.on('open', () => {
          logUserInteraction('TIDIO_CHAT_OPENED', 'chat-widget', {
            userId: user?.id
          })
        })
        
        window.tidioChatApi.on('close', () => {
          logUserInteraction('TIDIO_CHAT_CLOSED', 'chat-widget', {
            userId: user?.id
          })
        })
        
        window.tidioChatApi.on('messageFromVisitor', (data) => {
          logUserInteraction('TIDIO_MESSAGE_SENT', 'chat-message', {
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
    
    // Styles personnalisés pour Tidio
    const customStyles = document.createElement('style')
    customStyles.textContent = `
      /* Personnalisation Tidio pour COCO */
      #tidio-chat {
        /* Position au-dessus de la navigation */
        bottom: 100px !important;
        right: 20px !important;
        z-index: 999 !important;
      }
      
      /* Bouton du chat personnalisé */
      #tidio-chat-button {
        background: linear-gradient(135deg, #FF6B35, #F7931E) !important;
        box-shadow: 0 8px 25px rgba(255, 107, 53, 0.4) !important;
        border-radius: 50% !important;
        width: 60px !important;
        height: 60px !important;
        transition: all 0.3s ease !important;
      }
      
      #tidio-chat-button:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 12px 35px rgba(255, 107, 53, 0.6) !important;
      }
      
      /* Widget du chat */
      #tidio-chat-iframe {
        border-radius: 20px 20px 0 0 !important;
        border: 1px solid rgba(255, 107, 53, 0.2) !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
      }
      
      /* Message bubble */
      .tidio-message-bubble {
        background: rgba(255, 107, 53, 0.1) !important;
        border: 1px solid rgba(255, 107, 53, 0.2) !important;
        backdrop-filter: blur(10px) !important;
      }
      
      /* Responsive pour mobile */
      @media (max-width: 768px) {
        #tidio-chat {
          bottom: 100px !important;
          right: 16px !important;
        }
        
        #tidio-chat-button {
          width: 56px !important;
          height: 56px !important;
        }
        
        #tidio-chat-iframe {
          width: calc(100vw - 32px) !important;
          max-width: 350px !important;
          right: 16px !important;
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
      
      // Nettoyer Tidio si nécessaire
      if (window.tidioChatApi) {
        try {
          window.tidioChatApi.close()
        } catch (error) {
          console.warn('Erreur lors de la fermeture de Tidio:', error)
        }
      }
    }
  }, [user])

  // Composant invisible - Tidio gère son propre rendu
  return null
}
