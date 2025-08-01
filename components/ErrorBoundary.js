import React from 'react';
import { useState, useCallback } from 'react';
import ErrorDisplay from './ErrorDisplay';
import { logComponentEvent, logError, logUserInteraction } from '../utils/logger';
import { createUserFriendlyError } from '../utils/errorHandler';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    
    // Log la création du ErrorBoundary
    logComponentEvent('ErrorBoundary', 'CONSTRUCTED', {
      hasChildren: !!props.children,
      childrenType: typeof props.children
    });
  }

  static getDerivedStateFromError(error) {
    // Ensure error is always an Error instance
    let safeError = error;
    if (!(error instanceof Error)) {
      // If error is an object (e.g. {data, error}), wrap it
      safeError = new Error(
        error?.error?.message ||
        error?.message ||
        "Une erreur inattendue s'est produite"
      );
      // Attach original error object for debugging
      safeError.originalData = error;
    }
    // Log l'interception de l'erreur
    logError('ErrorBoundary - Erreur interceptée dans getDerivedStateFromError', safeError);
    // Update state so the next render will show the fallback UI
    return { hasError: true, error: safeError };
  }

  componentDidCatch(error, errorInfo) {
    // Log complet de l'erreur avec toutes les informations disponibles
    logError('ErrorBoundary - componentDidCatch appelé', error, null);
    
    logComponentEvent('ErrorBoundary', 'ERROR_CAUGHT', {
      errorName: error?.name,
      errorMessage: error?.message,
      componentStack: errorInfo?.componentStack,
      errorBoundaryStack: errorInfo?.errorBoundaryStack,
      stackLines: error?.stack ? error.stack.split('\n').length : 0
    });
    
    // Stocker errorInfo dans le state pour debugging
    this.setState({ errorInfo });
    
    // You can log the error to an error reporting service
    console.error("🔴 ErrorBoundary - Erreur complète:", error);
    console.error("🔴 ErrorBoundary - Info erreur:", errorInfo);
    console.error("🔴 ErrorBoundary - Stack composant:", errorInfo?.componentStack);
  }

  resetError = () => {
    logUserInteraction('RESET_ERROR_BOUNDARY', 'bouton-reessayer', {
      errorName: this.state.error?.name,
      errorMessage: this.state.error?.message,
      hadErrorInfo: !!this.state.errorInfo
    });
    
    logComponentEvent('ErrorBoundary', 'RESET', {
      previousError: this.state.error?.message
    });
    
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (this.state.hasError) {
      logComponentEvent('ErrorBoundary', 'RENDERING_ERROR_UI', {
        errorId: this.state.error?.id,
        errorMessage: this.state.error?.message,
        hasErrorInfo: !!this.state.errorInfo
      });
      
      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <h2>Une erreur est survenue</h2>
          <ErrorDisplay 
            error={{
              message: this.state.error?.message || "Une erreur inattendue s'est produite",
              stack: this.state.error?.stack,
              timestamp: new Date().toISOString(),
              id: `boundary-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
              details: this.state.errorInfo ? {
                componentStack: this.state.errorInfo.componentStack,
                errorBoundaryStack: this.state.errorInfo.errorBoundaryStack
              } : null
            }} 
            resetError={this.resetError}
          />
          <button 
            onClick={this.resetError}
            style={{
              padding: '10px 15px',
              backgroundColor: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Réessayer
          </button>
        </div>
      );
    }

    logComponentEvent('ErrorBoundary', 'RENDERING_CHILDREN', {
      hasChildren: !!this.props.children
    });

    return this.props.children;
  }
}

/**
 * Hook pour la gestion d'erreurs dans les composants
 */
export function useErrorHandler() {
  const [lastError, setLastError] = useState(null)
  const [lastAction, setLastAction] = useState(null)

  const handleError = useCallback((error, context = {}) => {
    const friendlyError = createUserFriendlyError(error, context)
    setLastError({ error: friendlyError, context })
    return friendlyError
  }, [])

  const clearError = useCallback(() => {
    setLastError(null)
    setLastAction(null)
  }, [])

  const retryLastAction = useCallback(async () => {
    if (lastAction) {
      try {
        clearError()
        await lastAction()
      } catch (error) {
        handleError(error)
      }
    }
  }, [lastAction, clearError, handleError])

  const setRetryAction = useCallback((action) => {
    setLastAction(() => action)
  }, [])

  return {
    lastError,
    handleError,
    clearError,
    retryLastAction,
    setRetryAction
  }
}

export default ErrorBoundary;
