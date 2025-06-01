import { useState, useEffect } from 'react';
import styles from '../styles/ErrorDisplay.module.css';
import { logComponentEvent, logUserInteraction, logDebug } from '../utils/logger';

export default function ErrorDisplay({ error, resetError = null }) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Log le montage du composant et les détails de l'erreur
  useEffect(() => {
    logComponentEvent('ErrorDisplay', 'MOUNTED', {
      errorId: error?.id,
      errorMessage: error?.message,
      hasResetFunction: !!resetError,
      hasDetails: !!(error?.stack || error?.details)
    });
    
    // Log les détails complets de l'erreur pour debug
    if (error) {
      logDebug('ErrorDisplay - Détails complets de l\'erreur', {
        error: error,
        errorType: typeof error,
        errorKeys: Object.keys(error || {}),
        stackPresent: !!error?.stack,
        detailsPresent: !!error?.details
      });
    }
    
    return () => {
      logComponentEvent('ErrorDisplay', 'UNMOUNTED', { errorId: error?.id });
    };
  }, [error, resetError]);
  
  // If no error provided, don't render anything
  if (!error) {
    logDebug('ErrorDisplay - Aucune erreur fournie, pas de rendu');
    return null;
  }
  
  // Extract error information or use defaults
  const {
    message = "Une erreur inattendue s'est produite",
    id = null,
    timestamp = new Date().toISOString(),
    stack = null,
    details = null
  } = error;
  
  const formattedTimestamp = new Date(timestamp).toLocaleString();
  const hasDetails = stack || details;
  
  const handleToggleDetails = () => {
    const newShowState = !showDetails;
    setShowDetails(newShowState);
    
    logUserInteraction(
      newShowState ? 'AFFICHER_DETAILS' : 'MASQUER_DETAILS',
      'bouton-toggle-details',
      {
        errorId: id,
        newState: newShowState,
        hasStack: !!stack,
        hasDetails: !!details
      }
    );
  };
  
  const handleReset = () => {
    logUserInteraction('FERMER_ERREUR', 'bouton-fermer', {
      errorId: id,
      errorMessage: message,
      detailsWereVisible: showDetails
    });
    
    if (resetError) {
      resetError();
    }
  };
  
  // Log le rendu du composant
  logDebug('ErrorDisplay - Rendu du composant', {
    errorId: id,
    hasDetails,
    showDetails,
    messageLength: message?.length,
    stackLines: stack ? (Array.isArray(stack) ? stack.length : stack.split('\n').length) : 0
  });
  
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorHeader}>
        <h3 className={styles.errorTitle}>⚠️ Erreur</h3>
        {resetError && (
          <button onClick={handleReset} className={styles.dismissButton}>
            Fermer
          </button>
        )}
      </div>
      
      <p className={styles.errorMessage}>{message}</p>
      
      {id && (
        <p className={styles.errorId}>
          Référence: <code>{id}</code>
        </p>
      )}
      
      <p className={styles.timestamp}>
        Date: {formattedTimestamp}
      </p>
      
      {hasDetails && (
        <div className={styles.detailsSection}>
          <button 
            onClick={handleToggleDetails}
            className={styles.toggleButton}
          >
            {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
          </button>
          
          {showDetails && (
            <div className={styles.details}>
              {details && (
                <div className={styles.detailsBlock}>
                  <h4>Informations supplémentaires</h4>
                  <pre>{typeof details === 'object' ? JSON.stringify(details, null, 2) : details}</pre>
                </div>
              )}
              
              {stack && (
                <div className={styles.detailsBlock}>
                  <h4>Stack Trace</h4>
                  <pre className={styles.stackTrace}>{Array.isArray(stack) ? stack.join('\n') : stack}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
