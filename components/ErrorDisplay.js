import { useState } from 'react';
import styles from '../styles/ErrorDisplay.module.css';

export default function ErrorDisplay({ error, resetError = null }) {
  const [showDetails, setShowDetails] = useState(false);
  
  // If no error provided, don't render anything
  if (!error) return null;
  
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
  
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorHeader}>
        <h3 className={styles.errorTitle}>⚠️ Erreur</h3>
        {resetError && (
          <button onClick={resetError} className={styles.dismissButton}>
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
            onClick={() => setShowDetails(!showDetails)}
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
