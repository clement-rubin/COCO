import '../styles/globals.css'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorDisplay from '../components/ErrorDisplay'

function MyApp({ Component, pageProps }) {
  const [globalError, setGlobalError] = useState(null);
  
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

  return (
    <ErrorBoundary>
      <Navigation />
      <main>
        {globalError && (
          <div style={{ maxWidth: '1200px', margin: '1rem auto', padding: '0 1rem' }}>
            <ErrorDisplay error={globalError} resetError={resetGlobalError} />
          </div>
        )}
        <Component {...pageProps} />
      </main>
      <Footer />
    </ErrorBoundary>
  )
}

export default MyApp
