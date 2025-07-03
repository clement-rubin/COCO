// Utilitaires pour l'intégration Tidio

export const TidioUtils = {
  // Ouvrir le chat programmatiquement
  openChat() {
    if (window.tidioChatApi) {
      window.tidioChatApi.open()
    }
  },

  // Fermer le chat
  closeChat() {
    if (window.tidioChatApi) {
      window.tidioChatApi.close()
    }
  },

  // Envoyer un message automatique
  sendMessage(message, isFromBot = true) {
    if (window.tidioChatApi) {
      window.tidioChatApi.addMessage({
        type: 'text',
        text: message,
        author: isFromBot ? 'operator' : 'visitor'
      })
    }
  },

  // Définir les données du visiteur
  setVisitorData(userData) {
    if (window.tidioChatApi) {
      window.tidioChatApi.setVisitorData(userData)
    }
  },

  // Vérifier si Tidio est disponible
  isAvailable() {
    return typeof window !== 'undefined' && window.tidioChatApi
  },

  // Messages prédéfinis pour COCO
  sendWelcomeMessage(userName = null) {
    const message = userName 
      ? `Bonjour ${userName} ! 👨‍🍳 Comment puis-je vous aider avec COCO aujourd'hui ?`
      : 'Bienvenue sur COCO ! 🍴 Comment puis-je vous aider avec l\'app de recettes ?'
    
    this.sendMessage(message, true)
  },

  sendRecipeHelp() {
    this.sendMessage(
      '🍳 Pour trouver des recettes :\n' +
      '• Utilisez l\'onglet "Collections"\n' +
      '• Filtrez par catégorie ou difficulté\n' +
      '• Suivez des amis pour découvrir leurs recettes !', 
      true
    )
  },

  sendSharingHelp() {
    this.sendMessage(
      '📤 Pour partager une recette :\n' +
      '• Cliquez sur le bouton "+" en bas\n' +
      '• Prenez une photo de votre plat\n' +
      '• Ajoutez une description et des tags\n' +
      '• Partagez avec vos amis !', 
      true
    )
  },

  sendFriendsHelp() {
    this.sendMessage(
      '👥 Pour gérer vos amis :\n' +
      '• Allez dans l\'onglet "Amis"\n' +
      '• Recherchez par nom d\'utilisateur\n' +
      '• Envoyez des demandes d\'amitié\n' +
      '• Découvrez leurs recettes !', 
      true
    )
  },

  // Aide contextuelle basée sur la page
  sendContextualHelp(pathname, user = null) {
    switch (pathname) {
      case '/':
        this.sendMessage(
          '🏠 Vous êtes sur l\'accueil ! Ici vous pouvez voir les dernières recettes de vos amis et découvrir les tendances culinaires.',
          true
        )
        break
      case '/collections':
        this.sendMessage(
          '📚 Dans les Collections, explorez toutes nos recettes par catégories, filtrez par difficulté ou temps de préparation !',
          true
        )
        break
      case '/amis':
        this.sendMessage(
          '👥 Connectez-vous avec d\'autres passionnés de cuisine ! Recherchez des amis et découvrez leurs créations culinaires.',
          true
        )
        break
      case '/profil':
        this.sendMessage(
          '👤 Personnalisez votre profil en ajoutant une photo, une bio et vos préférences culinaires !',
          true
        )
        break
      case '/share-photo':
        this.sendMessage(
          '📸 Partagez votre création ! Prenez une belle photo, ajoutez les ingrédients et étapes, puis inspirez la communauté !',
          true
        )
        break
      default:
        this.sendMessage(
          '🍴 Besoin d\'aide sur COCO ? Je suis là pour vous accompagner dans votre aventure culinaire !',
          true
        )
    }
  },

  // Messages d'onboarding pour nouveaux utilisateurs
  sendOnboardingFlow(step = 1) {
    const messages = {
      1: '🎉 Bienvenue dans COCO ! Commençons par découvrir les fonctionnalités principales.',
      2: '📸 Première étape : partagez votre première recette en cliquant sur le bouton "+" !',
      3: '👥 Deuxième étape : trouvez des amis dans l\'onglet "Amis" pour découvrir leurs créations.',
      4: '🔍 Troisième étape : explorez les Collections pour vous inspirer !',
      5: '✨ Parfait ! Vous êtes maintenant prêt à profiter pleinement de COCO. Bon appétit !'
    }
    
    if (messages[step]) {
      this.sendMessage(messages[step], true)
    }
  }
}

// Messages d'aide contextuelle améliorés
export const ContextualHelp = {
  getHelpForPage(pathname, user = null) {
    return TidioUtils.sendContextualHelp(pathname, user)
  },
  
  // Suggestions d'actions rapides
  sendQuickActions() {
    TidioUtils.sendMessage(
      '⚡ Actions rapides :\n' +
      '• Tapez "aide" pour obtenir de l\'aide\n' +
      '• Tapez "recette" pour des conseils recettes\n' +
      '• Tapez "amis" pour gérer vos amis\n' +
      '• Tapez "problème" pour signaler un bug',
      true
    )
  },

  // Gestion des mots-clés
  handleKeyword(message) {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('aide') || lowerMessage.includes('help')) {
      this.sendQuickActions()
    } else if (lowerMessage.includes('recette')) {
      TidioUtils.sendRecipeHelp()
    } else if (lowerMessage.includes('ami')) {
      TidioUtils.sendFriendsHelp()
    } else if (lowerMessage.includes('partag')) {
      TidioUtils.sendSharingHelp()
    } else if (lowerMessage.includes('problème') || lowerMessage.includes('bug')) {
      TidioUtils.sendMessage(
        '🐛 Pour signaler un problème :\n' +
        '• Décrivez ce qui ne fonctionne pas\n' +
        '• Mentionnez sur quelle page\n' +
        '• Précisez votre navigateur\n' +
        'Notre équipe va rapidement examiner le problème !',
        true
      )
    }
  }
}
