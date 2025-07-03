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
  }
}

// Messages d'aide contextuelle
export const ContextualHelp = {
  homePage: () => TidioUtils.sendMessage(
    '🏠 Vous êtes sur l\'accueil ! Ici vous pouvez voir les dernières recettes de vos amis et découvrir les tendances culinaires.', 
    true
  ),

  collectionsPage: () => TidioUtils.sendMessage(
    '🔍 Dans les Collections, vous pouvez explorer toutes nos recettes par catégories, filtrer par difficulté ou temps de préparation !', 
    true
  ),

  friendsPage: () => TidioUtils.sendMessage(
    '👥 Connectez-vous avec d\'autres passionnés de cuisine ! Recherchez des amis et découvrez leurs créations culinaires.', 
    true
  ),

  profilePage: () => TidioUtils.sendMessage(
    '👤 Personnalisez votre profil en ajoutant une photo, une bio et vos préférences culinaires !', 
    true
  )
}
