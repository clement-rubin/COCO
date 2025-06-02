import Link from 'next/link'
import { useState } from 'react'
import styles from '../styles/Navbar.module.css'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            🍴
          </div>
          <h2 className={styles.logo}>
            COCO
          </h2>
        </Link>
        
        {/* Desktop Navigation */}
        <div className={styles.desktopNav}>
          <Link href="/" className={styles.navLink}>
            Accueil
          </Link>
          <Link href="/explorer" className={styles.navLink}>
            Explorer
          </Link>
          <Link href="/recherche" className={styles.navLink}>
            Recherche
          </Link>
          <Link href="/favoris" className={styles.navLink}>
            Favoris
          </Link>
          <Link href="/submit-recipe" className={styles.addButton}>
            ➕ Ajouter une recette
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <div className={styles.mobileNavLinks}>
              <Link href="/" className={styles.mobileNavLink}>
                🏠 Accueil
              </Link>
              <Link href="/explorer" className={styles.mobileNavLink}>
                🔍 Explorer
              </Link>
              <Link href="/recherche" className={styles.mobileNavLink}>
                🔎 Recherche
              </Link>
              <Link href="/favoris" className={styles.mobileNavLink}>
                ❤️ Favoris
              </Link>
              <Link href="/submit-recipe" className={styles.mobileNavLink}>
                ➕ Ajouter une recette
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
