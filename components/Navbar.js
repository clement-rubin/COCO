import Link from 'next/link'
import { useState } from 'react'
import styles from '../styles/Navbar.module.css'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/">
            COCO
          </Link>
        </div>
        
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          ☰
        </button>
        
        <ul className={`${styles.navLinks} ${mobileMenuOpen ? styles.active : ''}`}>
          <li>
            <Link href="/" className={styles.navLink}>
              Accueil
            </Link>
          </li>
          <li>
            <Link href="/recipes" className={styles.navLink}>
              Recettes
            </Link>
          </li>
          <li>
            <Link href="/categories" className={styles.navLink}>
              Catégories
            </Link>
          </li>
          <li>
            <Link href="/about" className={styles.navLink}>
              À propos
            </Link>
          </li>
          <li>
            <Link href="/contact" className={styles.navLink}>
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
