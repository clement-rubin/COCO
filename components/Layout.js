import Footer from './Footer'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import styles from '../styles/Layout.module.css'
import { useEffect, useState } from 'react'

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
  
  // Flèche "haut de page"
  const [showArrow, setShowArrow] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      setShowArrow(window.scrollY > 120)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.pageTransition}>
          {children}
        </div>
      </main>
      {/* Flèche haut de page flottante */}
      {showArrow && (
        <button
          aria-label="Remonter en haut"
          className="scroll-top-arrow"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
      <ScrollToTop />
      <Footer />
      <style jsx global>{`
        .scroll-top-arrow {
          position: fixed;
          right: 24px;
          bottom: 76px; /* Juste au-dessus de la bottom-nav (56px + 20px de marge) */
          z-index: 1201;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          font-size: 2rem;
          box-shadow: 0 4px 16px #ff6b3533;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.2s;
        }
        .scroll-top-arrow:hover {
          background: linear-gradient(135deg, #f7931e, #ff6b35);
          transform: scale(1.08);
        }
        @media (max-width: 600px) {
          .scroll-top-arrow {
            right: 16px;
            bottom: 72px;
            width: 44px;
            height: 44px;
            font-size: 1.7rem;
          }
        }
      `}</style>
    </div>
  )
}
