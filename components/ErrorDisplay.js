import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { logComponentEvent, logUserInteraction, logDebug } from '../utils/logger';
import { RECOVERY_STRATEGIES } from '../utils/errorHandler';
import styles from '../styles/ErrorDisplay.module.css';

export default function ErrorDisplay({ error, resetError = null, onRetry = null, email }) {
  const [showDetails, setShowDetails] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { resendConfirmation } = useAuth();

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

  const handleRetry = () => {
    logUserInteraction('RETRY_ERROR', 'bouton-retry', {
      errorId: id,
      recoveryStrategy: error?.recoveryStrategy
    });
    
    if (onRetry) {
      onRetry();
    }
  };
  
  const handleResendEmail = async () => {
    if (!email) return
    
    setResending(true)
    try {
      const { error: resendError } = await resendConfirmation(email)
      if (resendError) {
        throw resendError
      }
      setResendSuccess(true)
      setTimeout(() => {
        setResendSuccess(false)
        resetError()
      }, 3000)
    } catch (err) {
      console.error('Erreur lors du renvoi:', err)
    } finally {
      setResending(false)
    }
  }
  
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
      case 'captcha_error': return '🤖';
      default: return '❌';
    }
  };

  const getErrorColor = (type) => {
    switch (type) {
      case 'auth_error': return '#ff6b35';
      case 'validation_error': return '#feca57';
      case 'network_error': return '#ff6b6b';
      default: return '#ff4757';
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

  if (resendSuccess) {
    return (
      <div style={{
        background: '#e7f7e7',
        border: '2px solid #4CAF50',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <div style={{ flex: 1 }}>
          <p style={{ 
            margin: 0,
            color: '#2e7d32',
            fontWeight: '600'
          }}>
            Email renvoyé avec succès !
          </p>
          <p style={{ 
            margin: '4px 0 0 0',
            fontSize: '0.9rem',
            color: '#2e7d32'
          }}>
            Vérifiez votre boîte mail (et vos spams).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#fff5f5',
      border: `2px solid ${getErrorColor(error.type)}`,
      borderRadius: '12px',
      padding: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>
          {getErrorIcon(error.type)}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ 
            margin: '0 0 8px 0',
            color: getErrorColor(error.type),
            fontWeight: '600',
            fontSize: '1rem'
          }}>
            {error.message}
          </p>
          
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap',
            marginTop: '12px'
          }}>
            {error.recoveryStrategy === RECOVERY_STRATEGIES.RETRY && onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '8px 16px',
                  background: getErrorColor(error.type),
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Réessayer
              </button>
            )}
            
            {error.recoveryStrategy === RECOVERY_STRATEGIES.RESEND_EMAIL && email && (
              <button
                onClick={handleResendEmail}
                disabled={resending}
                style={{
                  padding: '8px 16px',
                  background: resending ? '#ccc' : getErrorColor(error.type),
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: resending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {resending && (
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
                {resending ? 'Envoi...' : 'Renvoyer l\'email'}
              </button>
            )}
            
            <button
              onClick={resetError}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: getErrorColor(error.type),
                border: `1px solid ${getErrorColor(error.type)}`,
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
