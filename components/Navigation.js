import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from '../styles/Navigation.module.css'

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  const closeMenu = () => {
    setIsMenuOpen(false)
  }
  
  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          COCO
        </Link>
        
        <button 
          className={styles.menuButton} 
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <span className={styles.menuIcon}></span>
        </button>
        
        <ul className={`${styles.navMenu} ${isMenuOpen ? styles.active : ''}`}>
          <li>
            <Link 
              href="/" 
              className={router.pathname === "/" ? styles.active : ""}
              onClick={closeMenu}
            >
              Accueil
            </Link>
          </li>
          <li>
            <Link 
              href="/recipes" 
              className={router.pathname === "/recipes" ? styles.active : ""}
              onClick={closeMenu}
            >
              Recettes
            </Link>
          </li>
          <li>
            <Link 
              href="/categories" 
              className={router.pathname === "/categories" ? styles.active : ""}
              onClick={closeMenu}
            >
              Catégories
            </Link>
          </li>
          <li>
            <Link 
              href="/submit-recipe" 
              className={router.pathname === "/submit-recipe" ? styles.active : ""}
              onClick={closeMenu}
            >
              Partager une recette
            </Link>
          </li>
          <li>
            <Link 
              href="/about" 
              className={router.pathname === "/about" ? styles.active : ""}
              onClick={closeMenu}
            >
              À propos
            </Link>
          </li>
          <li>
            <Link 
              href="/contact" 
              className={router.pathname === "/contact" ? styles.active : ""}
              onClick={closeMenu}
            >
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
