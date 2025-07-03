import { logInfo, logError } from '../../utils/logger'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, userId, context } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    logInfo('Chatbot request received', {
      messageLength: message.length,
      userId,
      context
    })

    // Générer une réponse avec Botpress ou fallback
    const response = await generateResponse(message, userId)

    return res.status(200).json({
      response,
      timestamp: new Date().toISOString(),
      source: 'botpress-cloud'
    })

  } catch (error) {
    logError('Chatbot API error', error, { message, userId })
    
    // Fallback vers réponses prédéfinies en cas d'erreur
    const fallbackResponse = getFallbackResponse(message)
    
    return res.status(200).json({
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    })
  }
}

async function generateResponse(message, userId) {
  const botpressUrl = process.env.BOTPRESS_API_URL
  const botpressToken = process.env.BOTPRESS_TOKEN
  const webhookId = process.env.BOTPRESS_WEBHOOK_ID

  // Si Botpress est configuré, l'utiliser
  if (botpressUrl && botpressToken && webhookId) {
    try {
      const webhookUrl = `${botpressUrl}/webhooks/${webhookId}`
      
      const payload = {
        type: 'text',
        payload: {
          text: message
        },
        userId: userId || `user_${Date.now()}`,
        conversationId: userId ? `conv_${userId}` : `conv_${Date.now()}`
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${botpressToken}`,
          'x-bp-messaging-platform': 'webhook'
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 secondes de timeout
      })

      if (response.ok) {
        const data = await response.json()
        
        logInfo('Botpress response successful', {
          status: response.status,
          responseType: data.responses?.[0]?.type,
          userId
        })

        // Extraire la réponse de Botpress
        if (data.responses && data.responses.length > 0) {
          const botResponse = data.responses[0]
          if (botResponse.type === 'text' && botResponse.payload?.text) {
            return botResponse.payload.text
          }
        }
      } else {
        logError('Botpress API error', new Error(`HTTP ${response.status}`), {
          status: response.status,
          statusText: response.statusText
        })
      }
    } catch (error) {
      logError('Botpress request failed', error, { webhookUrl: `${botpressUrl}/webhooks/${webhookId}` })
    }
  }

  // Fallback vers réponses intelligentes locales
  return getIntelligentResponse(message, userId)
}

function getIntelligentResponse(message, userId) {
  const lowerMessage = message.toLowerCase()
  
  const responses = {
    salutation: [
      "👋 Bonjour ! Comment puis-je vous aider avec COCO aujourd'hui ? 😊",
      "Salut ! Que puis-je faire pour améliorer votre expérience culinaire ?",
      "Hello ! Prêt à découvrir de nouvelles saveurs ?"
    ],
    recette: [
      "🍳 COCO propose des milliers de recettes ! Utilisez les filtres par catégorie, difficulté ou temps de préparation pour trouver votre bonheur.",
      "Avez-vous exploré nos collections thématiques ? Elles regroupent les meilleures recettes par thème !",
      "Pour des recettes personnalisées, suivez des amis aux goûts similaires aux vôtres !"
    ],
    aide: [
      "Je peux vous aider avec : 🔍 Recherche de recettes, 👥 Gestion des amis, 📤 Partage de contenu, ⚙️ Paramètres du compte",
      "Besoin d'aide spécifique ? Demandez-moi comment faire quelque chose de précis !",
      "COCO est simple à utiliser ! N'hésitez pas à explorer les différents onglets."
    ],
    amis: [
      "👥 Pour ajouter des amis, allez dans l'onglet 'Amis' et utilisez la recherche par nom d'utilisateur.",
      "Vos amis peuvent voir vos recettes publiques et vous pouvez découvrir les leurs !",
      "Créez une communauté culinaire en ajoutant des amis qui partagent vos goûts !"
    ],
    profil: [
      "👤 Personnalisez votre profil en cliquant sur votre avatar. Ajoutez une photo, une bio et vos préférences !",
      "Un profil complet vous aide à vous connecter avec d'autres passionnés de cuisine.",
      "Vous pouvez choisir de rendre votre profil privé dans les paramètres."
    ]
  }

  // Détection d'intention améliorée
  if (/(bonjour|salut|hello|hey|coucou)/i.test(lowerMessage)) {
    return getRandomResponse(responses.salutation)
  }
  
  if (/(recette|cuisine|plat|ingrédient|cuisinier|cooking)/i.test(lowerMessage)) {
    return getRandomResponse(responses.recette)
  }
  
  if (/(aide|help|comment|support|assistance)/i.test(lowerMessage)) {
    return getRandomResponse(responses.aide)
  }

  if (/(ami|friend|social|communauté|partage)/i.test(lowerMessage)) {
    return getRandomResponse(responses.amis)
  }

  if (/(profil|profile|compte|account|paramètre)/i.test(lowerMessage)) {
    return getRandomResponse(responses.profil)
  }

  // Réponse par défaut contextuelle
  return "🤖 C'est une bonne question ! Pour vous aider au mieux, pouvez-vous être plus spécifique ? Par exemple : 'Comment trouver des recettes végétariennes ?' ou 'Comment ajouter des amis ?'"
}

function getFallbackResponse(message) {
  return "🤖 Je rencontre des difficultés techniques temporaires. En attendant, explorez les onglets Collections pour découvrir de nouvelles recettes ou l'onglet Amis pour vous connecter avec d'autres passionnés de cuisine !"
}

function getRandomResponse(responseArray) {
  return responseArray[Math.floor(Math.random() * responseArray.length)]
}
