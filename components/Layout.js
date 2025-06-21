import Footer from './Footer'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import styles from '../styles/Layout.module.css'
import { useEffect } from 'react'

export default function Layout({ children }) {
  // Effet pour les animations fluides lors du chargement des pages
  useEffect(() => {
    // Ajouter une classe pour déclencher des animations d'entrée
    document.body.classList.add('page-loaded');
    
    // Nettoyer la classe au démontage
    return () => {
      document.body.classList.remove('page-loaded');
    };
  }, []);
  
  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.pageTransition}>
          {children}
        </div>
      </main>
      <ScrollToTop />
      <Footer />
    </div>
  )
}
