import { useRouter } from 'next/router'
import styles from '../styles/ShareButton.module.css'

export default function ShareButton({ recipe, recipeUrl, onShare, compact = false }) {
  const router = useRouter()

  const handleShareClick = () => {
    // Rediriger vers la page de partage de photo
    router.push('/share-photo')
  }

  if (compact) {
    return (
      <button 
        className={styles.shareButton}
        onClick={handleShareClick}
        aria-label="Partager une photo"
      >
        <span className={styles.shareIcon}>📤</span>
      </button>
    )
  }

  return (
    <div className={styles.shareContainer}>
      <button 
        className={styles.shareButton}
        onClick={handleShareClick}
        aria-label="Partager une photo"
      >
        <span className={styles.shareIcon}>📤</span>
        <span>Partager une photo</span>
      </button>
    </div>
  )
}
