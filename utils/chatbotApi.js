import { logError, logInfo } from './logger'

export class ChatbotService {
  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_CHATBOT_API_URL
    this.apiKey = process.env.NEXT_PUBLIC_CHATBOT_API_KEY
    this.botpressUrl = process.env.NEXT_PUBLIC_BOTPRESS_API_URL
    this.botpressToken = process.env.NEXT_PUBLIC_BOTPRESS_TOKEN
    this.botpressWebhookId = process.env.NEXT_PUBLIC_BOTPRESS_WEBHOOK_ID
    this.messageCount = 0
    this.monthlyLimit = 10000
  }

  async sendMessage(message, userId = null) {
    try {
      // Vérifier le quota mensuel
      if (this.messageCount >= this.monthlyLimit) {
        logInfo('Botpress monthly limit reached, using fallback responses')
        return this.getContextualResponse(message)
      }

      // Essayer d'abord Botpress Cloud
      const botpressResponse = await this.sendToBotpress(message, userId)
      if (botpressResponse) {
        this.messageCount++
        return botpressResponse
      }

      // Fallback vers l'API générique si Botpress échoue
      const fallbackResponse = await this.sendToGenericAPI(message, userId)
      return fallbackResponse

    } catch (error) {
      logError('Chatbot API error', error, { message, userId })
      return this.getContextualResponse(message) || "Je rencontre des difficultés techniques. Essayez de reformuler votre question."
    }
  }

  async sendToBotpress(message, userId) {
    if (!this.botpressUrl || !this.botpressWebhookId) {
      logInfo('Botpress not configured, using fallback')
      return null
    }

    try {
      const webhookUrl = `${this.botpressUrl}/webhooks/${this.botpressWebhookId}`
      
      const payload = {
        type: 'text',
        payload: {
          text: message
        },
        userId: userId || `user_${Date.now()}`,
        conversationId: userId || `conv_${Date.now()}`
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.botpressToken}`,
          'x-bp-messaging-platform': 'webhook'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Botpress API error: ${response.status}`)
      }

      const data = await response.json()
      
      logInfo('Botpress response received', {
        messageLength: message.length,
        responseLength: data.responses?.[0]?.payload?.text?.length,
        userId,
        messageCount: this.messageCount + 1
      })

      // Extraire la réponse de Botpress
      if (data.responses && data.responses.length > 0) {
        const botResponse = data.responses[0]
        if (botResponse.type === 'text' && botResponse.payload?.text) {
          return botResponse.payload.text
        }
      }

      return null

    } catch (error) {
      logError('Botpress API error', error, { message, userId })
      return null
    }
  }

  async sendToGenericAPI(message, userId) {
    if (!this.apiUrl) {
      return this.getContextualResponse(message)
    }

    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userId,
        context: 'coco-app'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    logInfo('Generic chatbot response received', {
      messageLength: message.length,
      responseLength: data.response?.length,
      userId
    })

    return data.response || "Désolé, je n'ai pas pu traiter votre demande."
  }

  // Méthodes prédéfinies pour des réponses contextuelles COCO
  getContextualResponse(message, userContext = {}) {
    const lowerMessage = message.toLowerCase()
    
    // Préfixe bot pour toutes les réponses
    const botPrefix = "🤖 **Coco Bot IA** : "
    
    // Réponses spécifiques à COCO avec emojis
    if (lowerMessage.includes('recette')) {
      return botPrefix + "🍳 Pour trouver des recettes, allez dans l'onglet 'Collections' ou utilisez la recherche. Vous cherchez quelque chose de spécifique ?"
    }
    
    if (lowerMessage.includes('ami')) {
      return botPrefix + "👥 Dans l'onglet 'Amis', vous pouvez rechercher d'autres utilisateurs et leur envoyer des demandes d'amitié. Vos amis verront vos recettes dans leur feed !"
    }
    
    if (lowerMessage.includes('partager') || lowerMessage.includes('publier')) {
      return botPrefix + "📤 Cliquez sur le bouton '+' en bas pour partager une photo de plat ou créer une recette complète. N'oubliez pas d'ajouter une description !"
    }
    
    if (lowerMessage.includes('profil')) {
      return botPrefix + "👤 Votre profil se trouve en cliquant sur votre avatar. Vous pouvez y ajouter une photo, une bio et gérer vos paramètres de confidentialité."
    }

    if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('hello')) {
      return botPrefix + "👋 Bonjour ! Je suis Coco Bot, votre assistant IA culinaire automatisé. Comment puis-je vous aider avec COCO aujourd'hui ?"
    }

    if (lowerMessage.includes('aide') || lowerMessage.includes('help')) {
      return botPrefix + "🆘 Je suis un chatbot IA qui peut vous aider avec : 🔍 Recherche de recettes, 👥 Gestion des amis, 📤 Partage de contenu, ⚙️ Paramètres du compte. Que souhaitez-vous faire ?"
    }

    if (lowerMessage.includes('bot') || lowerMessage.includes('robot') || lowerMessage.includes('ia')) {
      return botPrefix + "🤖 Exactement ! Je suis un chatbot IA (Intelligence Artificielle) conçu pour vous assister avec COCO. Mes réponses sont automatisées et basées sur ma programmation culinaire."
    }
    
    return null // Si aucune réponse prédéfinie ne correspond
  }

  // Méthodes utilitaires pour la gestion du quota
  getMessageCount() {
    return this.messageCount
  }

  getRemainingMessages() {
    return Math.max(0, this.monthlyLimit - this.messageCount)
  }

  resetMonthlyCount() {
    this.messageCount = 0
    logInfo('Monthly message count reset')
  }

  isQuotaExceeded() {
    return this.messageCount >= this.monthlyLimit
  }
}

export const chatbotService = new ChatbotService()
