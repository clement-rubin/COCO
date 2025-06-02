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
  
  const getErrorIcon = (type) => {
    switch (type) {
      case 'auth_error': return '🔐';
      case 'validation_error': return '⚠️';
      case 'network_error': return '📡';
      default: return '❌';
    }
  };

  const getRecoveryAction = (strategy) => {
    switch (strategy) {
      case 'retry': return 'Réessayer';
      case 'check_email': return 'Vérifier email';
      case 'login': return 'Se connecter';
      case 'contact_support': return 'Contacter le support';
      case 'wait': return 'Patienter';
      default: return 'Fermer';
    }
  };

  return (
    <div style={{
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 'var(--border-radius-medium)',
      padding: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-md)'
    }} className={styles.errorContainer}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-md)'
      }} className={styles.errorHeader}>
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>
          {getErrorIcon(error.type)}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <h4 style={{
              margin: 0,
              color: '#dc2626',
              fontSize: '1rem',
              fontWeight: '600'
            }} className={styles.errorTitle}>
              Une erreur s'est produite
            </h4>
            
            <button
              onClick={resetError}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: 'var(--spacing-xs)'
              }} className={styles.dismissButton}
            >
              ✕
            </button>
          </div>
          
          <p style={{
            margin: '0 0 var(--spacing-md) 0',
            color: '#7f1d1d',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }} className={styles.errorMessage}>
            {message}
          </p>
          
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            alignItems: 'center'
          }} className={styles.recoveryActions}>
            {error.recoveryStrategy && (
              <button
                onClick={handleRetry}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--border-radius-small)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {getRecoveryText(error.recoveryStrategy)}
              </button>
            )}
            
            {error.details && (
              <button
                onClick={toggleDetails}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--border-radius-small)',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {showDetails ? 'Masquer' : 'Détails'}
              </button>
            )}
          </div>
          
          {showDetails && error.details && (
            <div style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: '#fff',
              border: '1px solid #fecaca',
              borderRadius: 'var(--border-radius-small)',
              fontSize: '0.8rem',
              color: '#6b7280'
            }}>
              <strong>Détails techniques :</strong>
              <pre style={{
                margin: 'var(--spacing-xs) 0 0 0',
                overflow: 'auto',
                maxHeight: '100px'
              }}>
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
