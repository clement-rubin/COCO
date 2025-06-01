import { useState } from 'react'
import styles from '../styles/ShareButton.module.css'

export default function ShareButton({ recipe, recipeUrl }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareData = {
    title: recipe.title,
    text: `Découvre cette délicieuse recette: ${recipe.title}`,
    url: recipeUrl || window.location.href,
    image: recipe.image
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.log('Partage annulé')
      }
    } else {
      setIsOpen(true)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${shareData.text} ${shareData.url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(shareData.url)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(shareData.text)
    const url = encodeURIComponent(shareData.url)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const shareToInstagram = () => {
    // Instagram ne permet pas le partage direct via URL
    // On copie le lien et guide l'utilisateur
    copyToClipboard()
    alert('Lien copié ! Vous pouvez maintenant le coller dans votre story Instagram.')
  }

  return (
    <div className={styles.shareContainer}>
      <button 
        className={styles.shareButton}
        onClick={handleNativeShare}
        aria-label="Partager cette recette"
      >
        <span className={styles.shareIcon}>📤</span>
        <span>Partager</span>
      </button>

      {isOpen && (
        <div className={styles.shareMenu}>
          <div className={styles.shareOverlay} onClick={() => setIsOpen(false)} />
          <div className={styles.sharePanel}>
            <div className={styles.shareHeader}>
              <h3>Partager cette recette</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.shareOptions}>
              <button 
                className={styles.shareOption}
                onClick={shareToWhatsApp}
              >
                <span className={styles.optionIcon}>💬</span>
                <span>WhatsApp</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={shareToFacebook}
              >
                <span className={styles.optionIcon}>📘</span>
                <span>Facebook</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={shareToTwitter}
              >
                <span className={styles.optionIcon}>🐦</span>
                <span>Twitter</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={shareToInstagram}
              >
                <span className={styles.optionIcon}>📷</span>
                <span>Instagram</span>
              </button>

              <button 
                className={styles.shareOption}
                onClick={copyToClipboard}
              >
                <span className={styles.optionIcon}>{copied ? '✅' : '🔗'}</span>
                <span>{copied ? 'Copié !' : 'Copier le lien'}</span>
              </button>
            </div>

            <div className={styles.sharePreview}>
              <img 
                src={recipe.image} 
                alt={recipe.title}
                className={styles.previewImage}
              />
              <div className={styles.previewContent}>
                <h4>{recipe.title}</h4>
                <p>{recipe.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
