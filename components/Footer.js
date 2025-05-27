import Link from 'next/link'
import styles from '../styles/Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.column}>
          <h3>COCO</h3>
          <p>Votre destination culinaire pour des recettes délicieuses et faciles à réaliser.</p>
        </div>
        
        <div className={styles.column}>
          <h3>Navigation</h3>
          <ul>
            <li><Link href="/">Accueil</Link></li>
            <li><Link href="/recipes">Recettes</Link></li>
            <li><Link href="/categories">Catégories</Link></li>
            <li><Link href="/about">À propos</Link></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h3>Suivez-nous</h3>
          <div className={styles.social}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer">Pinterest</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
        </div>
      </div>
      
      <div className={styles.copyright}>
        <p>&copy; {new Date().getFullYear()} COCO - Cuisine & Saveurs. Tous droits réservés.</p>
      </div>
    </footer>
  )
}
