import '../styles/globals.css'
import Footer from '../components/Footer'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorDisplay from '../components/ErrorDisplay'
import Link from 'next/link'
import { useRouter } from 'next/router'

function MyApp({ Component, pageProps }) {
  const [globalError, setGlobalError] = useState(null);
  const router = useRouter();
  
  // Gestionnaire d'erreurs global pour le frontend
  useEffect(() => {
    const handleError = (event) => {
      const error = event.error || event.reason;
      console.error('==== ERREUR FRONTEND GLOBALE ====');
      console.error('Message:', error?.message);
      console.error('Nom:', error?.name);
      console.error('Stack:', error?.stack);
      console.error('URL:', window.location.href);
      console.error('User Agent:', navigator.userAgent);
      console.error('Netlify:', process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF || 'Non disponible');
      console.error('=================================');
      
      // Set global error state to display
      setGlobalError({
        message: error?.message || "Une erreur s'est produite dans l'application",
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        details: {
          url: window.location.href,
          userAgent: navigator.userAgent,
          deployInfo: process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF || 'Non disponible'
        }
      });
    };

    // Attacher notre gestionnaire d'erreurs
    window.addEventListener('error', handleError);

    // Attraper les rejets de promesses non gérés
    window.addEventListener('unhandledrejection', handleError);

    // Nettoyage
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  const resetGlobalError = () => setGlobalError(null);

  const getNavItemClass = (path) => {
    return router.pathname === path ? 'nav-item active' : 'nav-item';
  };

  return (
    <ErrorBoundary>
      <div className="mobile-app">
        {/* Mobile Status Bar */}
        <div className="status-bar">
          <span>9:41</span>
          <div className="status-icons">
            <span>📶</span>
            <span>📱</span>
            <span>🔋</span>
          </div>
        </div>
        
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
          <Link href="/recherche" className="nav-item add-button">
            <span className="nav-icon">🔍</span>
          </Link>
          <Link href="/favoris" className={getNavItemClass('/favoris')}>
            <span className="nav-icon">❤️</span>
            <span className="nav-label">Favoris</span>
          </Link>
          <Link href="/profil" className={getNavItemClass('/profil')}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profil</span>
          </Link>
        </nav>
      </div>
    </ErrorBoundary>
  )
}

export default MyApp
