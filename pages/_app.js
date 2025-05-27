import '../styles/globals.css'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { useEffect } from 'react'

function MyApp({ Component, pageProps }) {
  // Gestionnaire d'erreurs global pour le frontend
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      console.error('==== ERREUR FRONTEND GLOBALE ====');
      console.error('Message:', error?.message);
      console.error('Nom:', error?.name);
      console.error('Stack:', error?.stack);
      console.error('Info:', JSON.stringify(errorInfo));
      console.error('URL:', window.location.href);
      console.error('User Agent:', navigator.userAgent);
      console.error('Netlify:', process.env.NEXT_PUBLIC_NETLIFY_COMMIT_REF || 'Non disponible');
      console.error('=================================');
    };

    // Attacher notre gestionnaire d'erreurs
    window.addEventListener('error', (event) => {
      handleError(event.error);
    });

    // Attraper les rejets de promesses non gérés
    window.addEventListener('unhandledrejection', (event) => {
      handleError(event.reason);
    });

    // Nettoyage
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <>
      <Navigation />
      <main>
        <Component {...pageProps} />
      </main>
      <Footer />
    </>
  )
}

export default MyApp
