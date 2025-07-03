import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { logUserInteraction, logInfo } from '../utils/logger'
import { chatbotService } from '../utils/chatbotApi'
import styles from '../styles/ChatBot.module.css'

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [quotaInfo, setQuotaInfo] = useState({ used: 0, remaining: 10000 })
  const { user } = useAuth()

  // Messages de bienvenue améliorés
  const welcomeMessages = [
    {
      id: 'welcome',
      text: "🤖 Bonjour ! Je suis **Coco Bot**, votre assistant IA culinaire automatisé, propulsé par Botpress Cloud ! Je suis un chatbot conçu pour vous aider avec vos questions sur les recettes. Comment puis-je vous assister aujourd'hui ?",
      isBot: true,
      timestamp: new Date()
    }
  ]

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages(welcomeMessages)
      updateQuotaInfo()
    }
  }, [isOpen])

  const updateQuotaInfo = () => {
    setQuotaInfo({
      used: chatbotService.getMessageCount(),
      remaining: chatbotService.getRemainingMessages()
    })
  }

  const toggleChatbot = () => {
    setIsOpen(!isOpen)
    logUserInteraction('TOGGLE_CHATBOT', 'chatbot-button', {
      action: !isOpen ? 'open' : 'close',
      userId: user?.id,
      quotaUsed: chatbotService.getMessageCount()
    })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Utiliser le nouveau service ChatBot avec Botpress
      const botResponse = await chatbotService.sendMessage(inputMessage, user?.id)
      
      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        isBot: true,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
      updateQuotaInfo()

      logUserInteraction('CHATBOT_MESSAGE_SENT', 'send-message', {
        messageLength: inputMessage.length,
        responseLength: botResponse.length,
        userId: user?.id,
        quotaUsed: chatbotService.getMessageCount()
      })

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "😅 Désolé, je rencontre des difficultés. Essayez de reformuler votre question ou consultez nos guides d'aide !",
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (actionText) => {
    setInputMessage(actionText)
    // Auto-envoyer après un court délai
    setTimeout(() => {
      if (actionText.trim()) {
        handleSendMessage()
      }
    }, 100)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Bouton flottant du chatbot avec indicateur de quota */}
      <button
        onClick={toggleChatbot}
        className={`${styles.chatbotButton} ${isOpen ? styles.open : ''}`}
        title={`🤖 Coco Bot IA - Assistant automatisé (${quotaInfo.remaining} messages restants)`}
      >
        {isOpen ? '✕' : '🤖'}
        {/* Badge Bot */}
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          right: '-4px',
          background: '#FF6B35',
          color: 'white',
          fontSize: '8px',
          fontWeight: 'bold',
          padding: '2px 4px',
          borderRadius: '6px',
          border: '1px solid white',
          lineHeight: '1'
        }}>
          BOT
        </div>
        {chatbotService.isQuotaExceeded() && (
          <div className={styles.quotaWarning}>!</div>
        )}
      </button>

      {/* Fenêtre du chatbot */}
      {isOpen && (
        <div className={styles.chatbotWindow}>
          <div className={styles.chatbotHeader}>
            <div className={styles.botInfo}>
              <div style={{ position: 'relative' }}>
                <span className={styles.botAvatar}>🤖</span>
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  background: '#FF6B35',
                  color: 'white',
                  fontSize: '7px',
                  fontWeight: 'bold',
                  padding: '1px 3px',
                  borderRadius: '4px',
                  lineHeight: '1'
                }}>
                  BOT
                </div>
              </div>
              <div>
                <h4>🤖 Coco Bot IA</h4>
                <span className={styles.onlineStatus}>
                  Assistant automatisé • Botpress Cloud
                </span>
              </div>
            </div>
            <button onClick={toggleChatbot} className={styles.closeButton}>
              ✕
            </button>
          </div>

          {/* Avertissement Bot */}
          <div style={{
            padding: '12px 20px',
            background: 'rgba(255, 107, 53, 0.05)',
            borderBottom: '1px solid rgba(255, 107, 53, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 107, 53, 0.1)',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#FF6B35'
            }}>
              🤖 CHATBOT IA • RÉPONSES AUTOMATISÉES
            </div>
          </div>

          {/* Indicateur de quota */}
          {quotaInfo.remaining < 1000 && (
            <div className={styles.quotaIndicator}>
              <span className={styles.quotaIcon}>⚠️</span>
              <span className={styles.quotaText}>
                {quotaInfo.remaining} messages restants ce mois
              </span>
            </div>
          )}

          <div className={styles.messagesContainer}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.message} ${message.isBot ? styles.botMessage : styles.userMessage}`}
              >
                <div className={styles.messageContent}>
                  {message.text}
                </div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className={`${styles.message} ${styles.botMessage}`}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.inputContainer}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tapez votre message..."
              className={styles.messageInput}
              rows={1}
              disabled={chatbotService.isQuotaExceeded()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || chatbotService.isQuotaExceeded()}
              className={styles.sendButton}
            >
              {chatbotService.isQuotaExceeded() ? '🚫' : '🚀'}
            </button>
          </div>

          <div className={styles.quickActions}>
            <button onClick={() => handleQuickAction('Comment ajouter des amis ?')}>
              👥 Amis
            </button>
            <button onClick={() => handleQuickAction('Comment partager une recette ?')}>
              📤 Partager
            </button>
            <button onClick={() => handleQuickAction('Aide pour mon profil')}>
              👤 Profil
            </button>
            <button onClick={() => handleQuickAction('Trouver des recettes végétariennes')}>
              🥗 Recettes
            </button>
          </div>

          {/* Footer avec info Botpress */}
          <div className={styles.chatbotFooter}>
            <span className={styles.footerText}>
              🤖 Assistant IA automatisé • Botpress Cloud • {quotaInfo.remaining}/10000 messages
            </span>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatBot
