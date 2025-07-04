import { useState } from 'react'
import styles from '../styles/UserShare.module.css'
import { processImageData } from '../utils/imageUtils'
import UserProfilePreview from './UserProfilePreview'

export default function UserShare({ recipe, isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [message, setMessage] = useState(`Regarde cette délicieuse recette: ${recipe?.title}`)
  const [profilePreview, setProfilePreview] = useState({
    isVisible: false,
    user: null,
    position: null
  })

  // Simulation d'utilisateurs - à remplacer par vraies données
  const users = [
    { id: 1, user_id: 'user1', display_name: 'Marie Dubois', avatar_url: null, bio: 'Passionnée de pâtisserie française 🧁', lastSeen: 'En ligne' },
    { id: 2, user_id: 'user2', display_name: 'Pierre Martin', avatar_url: null, bio: 'Chef cuisinier amateur, spécialisé en cuisine méditerranéenne', lastSeen: 'Il y a 2h' },
    { id: 3, user_id: 'user3', display_name: 'Sophie Laurent', avatar_url: null, bio: 'Blogueuse culinaire et photographe food', lastSeen: 'Hier' },
    { id: 4, user_id: 'user4', display_name: 'Lucas Moreau', avatar_url: null, bio: 'Étudiant en cuisine, toujours à la recherche de nouvelles saveurs', lastSeen: 'En ligne' },
    { id: 5, user_id: 'user5', display_name: 'Emma Petit', avatar_url: null, bio: 'Nutritionniste et amatrice de cuisine saine', lastSeen: 'Il y a 1h' }
  ]

  const filteredUsers = users.filter(user =>
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleUserNameClick = (user, event) => {
    event.stopPropagation()
    const rect = event.target.getBoundingClientRect()
    setProfilePreview({
      isVisible: true,
      user,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    })
  }

  const closeProfilePreview = () => {
    setProfilePreview({
      isVisible: false,
      user: null,
      position: null
    })
  }

  const handleSend = () => {
    if (selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un utilisateur')
      return
    }

    // Simulation d'envoi - à remplacer par vraie logique
    console.log('Envoi à:', selectedUsers, 'Message:', message)
    alert(`Recette partagée avec ${selectedUsers.length} utilisateur(s) !`)
    
    // Reset et fermeture
    setSelectedUsers([])
    setMessage(`Regarde cette délicieuse recette: ${recipe?.title}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h3>Partager avec des amis</h3>
            <button onClick={onClose} className={styles.closeButton}>✕</button>
          </div>

          {recipe && (
            <div className={styles.recipePreview}>
              {recipe.image && (
                <img 
                  src={processImageData(recipe.image, '/placeholder-recipe.jpg')} 
                  alt={recipe.title}
                  className={styles.recipeImage}
                  onError={(e) => {
                    e.target.src = '/placeholder-recipe.jpg'
                  }}
                />
              )}
              <div className={styles.recipeInfo}>
                <h4>{recipe.title}</h4>
                <p>{recipe.description}</p>
                {/* Suppression des détails techniques pour simplifier */}
              </div>
            </div>
          )}

          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Rechercher des amis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.usersList}>
            {filteredUsers.map((user, index) => (
              <div 
                key={user.id}
                className={`${styles.userItem} ${selectedUsers.includes(user.id) ? styles.selected : ''}`}
                onClick={() => toggleUserSelection(user.id)}
                style={{ '--index': index }}
              >
                <div className={styles.userAvatar}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} />
                  ) : (
                    user.display_name?.charAt(0)?.toUpperCase() || '👤'
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span 
                    className={styles.userName}
                    onClick={(e) => handleUserNameClick(user, e)}
                  >
                    {user.display_name}
                  </span>
                  <span className={styles.userStatus}>{user.lastSeen}</span>
                </div>
                <div className={styles.checkbox}>
                  {selectedUsers.includes(user.id) ? '✅' : '⚪'}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.messageContainer}>
            <textarea
              placeholder="Ajouter un message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles.messageInput}
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <button onClick={onClose} className={styles.cancelButton}>
              Annuler
            </button>
            <button 
              onClick={handleSend}
              disabled={selectedUsers.length === 0}
              className={styles.sendButton}
            >
              Partager ({selectedUsers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Aperçu du profil utilisateur */}
      <UserProfilePreview
        user={profilePreview.user}
        isVisible={profilePreview.isVisible}
        onClose={closeProfilePreview}
        position={profilePreview.position}
      />
    </>
  )
}
