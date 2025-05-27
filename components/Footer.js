import Link from 'next/link'
import styles from '../styles/Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        <div className={styles.footerSection}>
          <h3>COCO - Cuisine & Saveurs</h3>
          <p>Découvrez des recettes savoureuses, simples et authentiques.</p>
        </div>
        
        <div className={styles.footerSection}>
          <h3>Navigation</h3>
          <ul>
            <li><Link href="/">Accueil</Link></li>
            <li><Link href="/recipes">Recettes</Link></li>
            <li><Link href="/categories">Catégories</Link></li>
            <li><Link href="/submit-recipe">Partager une recette</Link></li>
            <li><Link href="/about">À propos</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        
        <div className={styles.footerSection}>
          <h3>Suivez-nous</h3>
          <div className={styles.socialLinks}>
            <a href="#" aria-label="Instagram">Instagram</a>
            <a href="#" aria-label="Facebook">Facebook</a>
            <a href="#" aria-label="Pinterest">Pinterest</a>
          </div>
        </div>
      </div>
      
      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} COCO - Cuisine & Saveurs. Tous droits réservés.</p>
      </div>
    </footer>
  )
}
