import { logInfo, logWarning, logError } from './logger'
import { useState, useCallback } from 'react'

/**
 * Système de retry intelligent avec feedback utilisateur
 */
export class RetryOperation {
  constructor(operation, options = {}) {
    this.operation = operation
    this.maxRetries = options.maxRetries || 3
    this.baseDelay = options.baseDelay || 1000
    this.maxDelay = options.maxDelay || 10000
    this.backoffFactor = options.backoffFactor || 2
    this.onProgress = options.onProgress || (() => {})
    this.onRetry = options.onRetry || (() => {})
    this.shouldRetry = options.shouldRetry || this.defaultShouldRetry
  }

  defaultShouldRetry(error, attempt) {
    // Ne pas réessayer pour les erreurs de validation ou d'authentification
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return false
    }
    
    // Réessayer pour les erreurs réseau
    if (error.name === 'NetworkError' || error.status >= 500) {
      return attempt <= this.maxRetries
    }
    
    return false
  }

  async execute() {
    let lastError
    let attempt = 0

    while (attempt <= this.maxRetries) {
      try {
        this.onProgress({ 
          attempt: attempt + 1, 
          maxRetries: this.maxRetries + 1,
          stage: attempt === 0 ? 'initial' : 'retry'
        })

        const result = await this.operation()
        
        if (attempt > 0) {
          logInfo('Opération réussie après retry', { 
            attempts: attempt + 1,
            operationName: this.operation.name
          })
        }
        
        return result
      } catch (error) {
        lastError = error
        attempt++

        logWarning('Échec de l\'opération', {
          attempt,
          maxRetries: this.maxRetries,
          error: error.message,
          willRetry: this.shouldRetry(error, attempt)
        })

        if (!this.shouldRetry(error, attempt)) {
          break
        }

        if (attempt <= this.maxRetries) {
          const delay = Math.min(
            this.baseDelay * Math.pow(this.backoffFactor, attempt - 1),
            this.maxDelay
          )

          this.onRetry({
            attempt,
            maxRetries: this.maxRetries,
            delay,
            error: error.message
          })

          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    logError('Opération échouée définitivement', lastError, {
      totalAttempts: attempt,
      operationName: this.operation.name
    })
    
    throw lastError
  }
}

/**
 * Hook React pour les opérations avec retry
 */
export function useRetryOperation() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    progress: null
  })

  const executeWithRetry = useCallback(async (operation, options = {}) => {
    setState({ loading: true, error: null, progress: null })

    const retryOp = new RetryOperation(operation, {
      ...options,
      onProgress: (progress) => {
        setState(prev => ({ ...prev, progress }))
        options.onProgress?.(progress)
      },
      onRetry: (retryInfo) => {
        setState(prev => ({ 
          ...prev, 
          progress: { 
            ...prev.progress, 
            retrying: true, 
            ...retryInfo 
          } 
        }))
        options.onRetry?.(retryInfo)
      }
    })

    try {
      const result = await retryOp.execute()
      setState({ loading: false, error: null, progress: null })
      return result
    } catch (error) {
      setState({ loading: false, error, progress: null })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, progress: null })
  }, [])

  return { ...state, executeWithRetry, reset }
}

/**
 * Composant de feedback pour les opérations en cours
 */
export function RetryFeedback({ progress, error, onRetry, className = '' }) {
  if (!progress && !error) return null

  return (
    <div className={`retry-feedback ${className}`}>
      {progress && (
        <div className="retry-progress">
          {progress.retrying ? (
            <div className="retry-message">
              <div className="spinner" />
              <span>
                Tentative {progress.attempt}/{progress.maxRetries + 1}...
                {progress.delay && ` Nouvelle tentative dans ${Math.ceil(progress.delay / 1000)}s`}
              </span>
            </div>
          ) : (
            <div className="initial-message">
              <div className="spinner" />
              <span>Traitement en cours...</span>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="retry-error">
          <span className="error-icon">⚠️</span>
          <span>{error.message}</span>
          {onRetry && (
            <button onClick={onRetry} className="retry-button">
              Réessayer
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .retry-feedback {
          padding: 12px;
          border-radius: 8px;
          background: var(--bg-light, #f8f9fa);
          border: 1px solid var(--border-light, #e9ecef);
        }

        .retry-message, .initial-message {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-medium, #6c757d);
        }

        .retry-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--error-color, #dc3545);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .retry-button {
          padding: 4px 8px;
          background: var(--primary-color, #007bff);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
