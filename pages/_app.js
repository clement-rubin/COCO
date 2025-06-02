import '../styles/globals.css'
import Footer from '../components/Footer'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorDisplay from '../components/ErrorDisplay'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { AuthProvider, useAuth } from '../components/AuthContext'
import { logFrontendError, logComponentEvent, logUserInteraction, logInfo, logDebug } from '../utils/logger'

function AuthenticatedNav({ user, signOut }) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
    router.push('/')
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="nav-item"
        style={{
          background: 'none',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <span className="nav-icon">
          {user?.user_metadata?.display_name ? 
            user.user_metadata.display_name.charAt(0).toUpperCase() : 
            '👤'}
        </span>
        <span className="nav-label">
          {user?.user_metadata?.display_name || 'Profil'}
        </span>
      </button>

      {showUserMenu && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          background: 'white',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--border-radius-medium)',
          padding: 'var(--spacing-sm)',
          minWidth: '200px',
          boxShadow: 'var(--shadow-medium)',
          zIndex: 1000
        }}>
          <div style={{
            padding: 'var(--spacing-sm)',
            borderBottom: '1px solid var(--border-light)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <p style={{ 
              margin: 0, 
              fontWeight: '600',
              color: 'var(--text-dark)',
              fontSize: '0.9rem'
            }}>
              {user?.user_metadata?.display_name || 'Utilisateur'}
            </p>
            <p style={{ 
              margin: 0, 
              color: 'var(--text-medium)',
              fontSize: '0.8rem'
            }}>
              {user?.email}
            </p>
          </div>

          <Link 
            href="/mes-recettes" 
            style={{
              display: 'block',
              padding: 'var(--spacing-sm)',
              color: 'var(--text-dark)',
              textDecoration: 'none',
              borderRadius: 'var(--border-radius-small)',
              fontSize: '0.9rem'
            }}
            onClick={() => setShowUserMenu(false)}
          >
            📝 Mes recettes
          </Link>

          <Link 
            href="/profil" 
            style={{
              display: 'block',
              padding: 'var(--spacing-sm)',
              color: 'var(--text-dark)',
              textDecoration: 'none',
              borderRadius: 'var(--border-radius-small)',
              fontSize: '0.9rem'
            }}
            onClick={() => setShowUserMenu(false)}
          >
            👤 Mon profil
          </Link>

          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: 'var(--spacing-sm)',
              background: 'none',
              border: 'none',
              color: 'var(--primary-orange)',
              textAlign: 'left',
              cursor: 'pointer',
              borderRadius: 'var(--border-radius-small)',
              fontSize: '0.9rem'
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>
      )}
    </div>
  )
}

function AppContent({ Component, pageProps }) {
  const [globalError, setGlobalError] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth()
  
  // Log le montage de l'application
  useEffect(() => {
    logComponentEvent('MyApp', 'MOUNTED', {
      pathname: router.pathname,
      nodeEnv: process.env.NODE_ENV,
      netlifyCommit: process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF
    });
  }, []);
  
  // Log les changements de route
  useEffect(() => {
    const handleRouteChange = (url) => {
      logInfo('Navigation vers nouvelle page', { url, from: router.pathname });
    };
    
    const handleRouteChangeError = (err, url) => {
      logFrontendError(err, { 
        type: 'ROUTE_CHANGE_ERROR',
        targetUrl: url,
        currentPath: router.pathname
      });
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);
  
  // Gestionnaire d'erreurs global pour le frontend
  useEffect(() => {
    const handleError = (event) => {
      const error = event.error || event.reason;
      
      // Utiliser le logger centralisé pour un logging uniforme
      const loggedError = logFrontendError(error, {
        type: event.type,
        eventSource: 'window.addEventListener',
        pathname: router.pathname,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        performance: {
          navigationStart: performance.timing?.navigationStart,
          loadEventEnd: performance.timing?.loadEventEnd,
          memoryUsed: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          } : null
        }
      });
      
      // Set global error state to display
      setGlobalError({
        message: error?.message || "Une erreur s'est produite dans l'application",
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        id: loggedError.id,
        details: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          deployInfo: process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF || 'Non disponible',
          performance: loggedError.context.performance,
          viewport: loggedError.context.viewport
        }
      });
    };

    // Attacher notre gestionnaire d'erreurs
    window.addEventListener('error', handleError);

    // Attraper les rejets de promesses non gérés
    window.addEventListener('unhandledrejection', handleError);

    // Log l'attachement des handlers
    logDebug('Gestionnaires d\'erreurs globaux attachés', {
      pathname: router.pathname,
      userAgent: navigator.userAgent.substring(0, 100) // Limiter la longueur
    });

    // Nettoyage
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      logDebug('Gestionnaires d\'erreurs globaux détachés');
    };
  }, [router.pathname]);

  const resetGlobalError = () => {
    logUserInteraction('RESET_GLOBAL_ERROR', 'bouton-fermer-erreur-globale', {
      errorId: globalError?.id,
      errorMessage: globalError?.message
    });
    
    setGlobalError(null);
  };

  const getNavItemClass = (path) => {
    return router.pathname === path ? 'nav-item active' : 'nav-item';
  };

  const handleShare = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    
    logUserInteraction('OPEN_SHARE_MENU', 'bouton-partage', {
      currentPath: router.pathname,
      isAuthenticated: !!user
    });
    
    router.push('/submit-recipe')
  };

  const copyToClipboard = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.origin);
        alert('Lien copié dans le presse-papiers !');
        setShowShareMenu(false);
      }
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const shareToWhatsApp = () => {
    if (typeof window !== 'undefined') {
      const text = encodeURIComponent('🍴 Découvrez COCO, l\'app pour partager et découvrir de délicieuses recettes ! ' + window.location.origin);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      setShowShareMenu(false);
    }
  };

  const shareToFacebook = () => {
    if (typeof window !== 'undefined') {
      const url = encodeURIComponent(window.location.origin);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
      setShowShareMenu(false);
    }
  };

  return (
    <>
      <div className="mobile-app">
        {/* Mobile Status Bar supprimée */}
        
        <main className="app-content">
          {globalError && (
            <div style={{ maxWidth: '1200px', margin: '1rem auto', padding: '0 1rem' }}>
              <ErrorDisplay error={globalError} resetError={resetGlobalError} />
            </div>
          )}
          <Component {...pageProps} />
        </main>
        
        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <Link href="/" className={getNavItemClass('/')}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Accueil</span>
          </Link>
          <Link href="/explorer" className={getNavItemClass('/explorer')}>
            <span className="nav-icon">🔍</span>
            <span className="nav-label">Explorer</span>
          </Link>
          <button onClick={handleShare} className="nav-item add-button">
            <span className="nav-icon">📤</span>
          </button>
          <Link href="/favoris" className={getNavItemClass('/favoris')}>
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Favoris</span>
          </Link>
          
          {user ? (
            <AuthenticatedNav user={user} signOut={signOut} />
          ) : (
            <Link href="/login" className={getNavItemClass('/login')}>
              <span className="nav-icon">👤</span>
              <span className="nav-label">Connexion</span>
            </Link>
          )}
        </nav>

        {/* Share Menu Overlay */}
        {showShareMenu && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 1000,
            maxWidth: '430px',
            margin: '0 auto'
          }}>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              width: '100%',
              padding: 'var(--spacing-lg)',
              animation: 'slideUp 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <h3 style={{
                  margin: 0,
                  color: 'var(--primary-coral)',
                  fontSize: '1.3rem',
                  fontWeight: '600'
                }}>
                  Partager COCO
                </h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: 'var(--spacing-sm)',
                    borderRadius: '50%'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--spacing-md)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <button
                  onClick={shareToWhatsApp}
                  className="card"
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    background: 'var(--bg-card)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>💬</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>WhatsApp</span>
                </button>

                <button
                  onClick={shareToFacebook}
                  className="card"
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    background: 'var(--bg-card)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>📘</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Facebook</span>
                </button>

                <button
                  onClick={copyToClipboard}
                  className="card"
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    background: 'var(--bg-card)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>🔗</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Copier</span>
                </button>
              </div>

              <div style={{
                background: 'var(--bg-gradient)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-md)',
                textAlign: 'center'
              }}>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)'
                }}>
                  🍴 Partagez COCO avec vos amis et découvrez ensemble de délicieuses recettes !
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default MyApp
