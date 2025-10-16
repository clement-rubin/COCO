import Head from 'next/head'
import Footer from './Footer'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from './AuthContext'
import NotificationCenter from './NotificationCenter'
import styles from '../styles/Layout.module.css'

export default function Layout({ children, title = 'COCO - Communauté Culinaire' }) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const isAuthPage = ['/login', '/signup', '/presentation'].includes(router.pathname)

  // Masquer le header sur certaines pages
  const hideHeader = isAuthPage || router.pathname === '/social-logs'
  const hideFooter = ['/amis', '/profil'].includes(router.pathname)

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
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="COCO - Partagez et découvrez des recettes inspirantes" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        {!hideHeader && (
          <header className={styles.header}>
            <div className={styles.headerContent}>
              {/* Logo */}
              <div className={styles.logo} onClick={() => router.push('/')}>
                <div className={styles.logoIcon}>🥥</div>
                <span className={styles.logoText}>COCO</span>
              </div>

              {/* Navigation */}
              <nav className={styles.nav}>
                <button
                  onClick={() => router.push('/')}
                  className={`${styles.navBtn} ${router.pathname === '/' ? styles.active : ''}`}
                >
                  🏠 Accueil
                </button>
                <button
                  onClick={() => router.push('/progression')}
                  className={`${styles.navBtn} ${router.pathname === '/progression' ? styles.active : ''}`}
                >
                  📈 Progression
                </button>
                <button
                  onClick={() => router.push('/amis')}
                  className={`${styles.navBtn} ${router.pathname === '/amis' ? styles.active : ''}`}
                >
                  👥 Amis
                </button>
                <button
                  onClick={() => router.push('/share-photo')}
                  className={`${styles.navBtn} ${styles.shareBtn} ${router.pathname === '/share-photo' ? styles.active : ''}`}
                >
                  📸 Partager
                </button>
              </nav>

              {/* Actions utilisateur */}
              <div className={styles.userActions}>
                {user ? (
                  <>
                    {/* Centre de notifications */}
                    <NotificationCenter />
                    
                    {/* Menu utilisateur */}
                    <div className={styles.userMenu}>
                      <button
                        className={styles.userButton}
                        onClick={() => router.push('/profile')}
                      >
                        <div className={styles.userAvatar}>
                          {user.user_metadata?.display_name?.charAt(0)?.toUpperCase() || 
                           user.email?.charAt(0)?.toUpperCase() || '👤'}
                        </div>
                        <span className={styles.userName}>
                          {user.user_metadata?.display_name?.split(' ')[0] || 
                           user.email?.split('@')[0] || 'Utilisateur'}
                        </span>
                      </button>
                      
                      <button
                        className={styles.logoutBtn}
                        onClick={logout}
                        title="Se déconnecter"
                      >
                        🚪
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.authActions}>
                    <button
                      onClick={() => router.push('/login')}
                      className={styles.loginBtn}
                    >
                      Connexion
                    </button>
                    <button
                      onClick={() => router.push('/signup')}
                      className={styles.signupBtn}
                    >
                      S'inscrire
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <main className={`${styles.main} ${hideHeader ? styles.noHeader : ''}`}>
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
        {!hideFooter && <Footer />}
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
    </>
  )
}
