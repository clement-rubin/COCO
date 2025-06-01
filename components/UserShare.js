import { useState } from 'react'
import styles from '../styles/UserShare.module.css'

export default function UserShare({ recipe, isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [message, setMessage] = useState(`Regarde cette délicieuse recette: ${recipe?.title}`)

  // Simulation d'utilisateurs - à remplacer par vraies données
  const users = [
    { id: 1, name: 'Marie Dubois', avatar: '👩‍🍳', lastSeen: 'En ligne' },
    { id: 2, name: 'Pierre Martin', avatar: '👨‍🍳', lastSeen: 'Il y a 2h' },
    { id: 3, name: 'Sophie Laurent', avatar: '👩‍🦳', lastSeen: 'Hier' },
    { id: 4, name: 'Lucas Moreau', avatar: '👨‍🦱', lastSeen: 'En ligne' },
    { id: 5, name: 'Emma Petit', avatar: '👩‍🦰', lastSeen: 'Il y a 1h' }
  ]

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
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
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Partager avec des amis</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.recipePreview}>
          <img src={recipe?.image} alt={recipe?.title} className={styles.recipeImage} />
          <div>
            <h4>{recipe?.title}</h4>
            <p>{recipe?.description}</p>
          </div>
        </div>

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
          {filteredUsers.map(user => (
            <div 
              key={user.id}
              className={`${styles.userItem} ${selectedUsers.includes(user.id) ? styles.selected : ''}`}
              onClick={() => toggleUserSelection(user.id)}
            >
              <div className={styles.userAvatar}>{user.avatar}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
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
          <button className={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button 
            className={styles.sendBtn} 
            onClick={handleSend}
            disabled={selectedUsers.length === 0}
          >
            Partager ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  )
}
