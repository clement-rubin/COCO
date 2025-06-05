import { useState } from 'react'
import styles from '../styles/UserShare.module.css'
import { getRecipeImageUrl } from '../lib/supabase'

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-md)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--border-radius-large)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--spacing-lg)',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <h3 style={{ margin: 0, color: 'var(--primary-orange)' }}>Partager avec des amis</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-medium)'
            }}
          >
            ✕
          </button>
        </div>

        {recipe && (
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-lg)',
            borderBottom: '1px solid var(--border-light)'
          }}>
            {recipe.image && (
              <img 
                src={getRecipeImageUrl(recipe.image)} 
                alt={recipe.title}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--border-radius-medium)',
                  objectFit: 'cover'
                }}
              />
            )}
            <div>
              <h4 style={{ margin: '0 0 var(--spacing-xs) 0', color: 'var(--primary-orange)' }}>
                {recipe.title}
              </h4>
              <p style={{ margin: 0, color: 'var(--text-medium)', fontSize: '0.9rem' }}>
                {recipe.description}
              </p>
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
          <button 
            onClick={onClose}
            style={{
              flex: 1,
              padding: 'var(--spacing-md)',
              background: 'var(--text-light)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-medium)',
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          <button 
            onClick={handleSend}
            disabled={selectedUsers.length === 0}
            style={{
              flex: 1,
              padding: 'var(--spacing-md)',
              background: selectedUsers.length === 0 ? 'var(--text-light)' : 'var(--primary-orange)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius-medium)',
              cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Partager ({selectedUsers.length})
          </button>
        </div>
      </div>
    </div>
  )
}
