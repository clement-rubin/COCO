import { logInfo, logWarning, logError, logDebug, logPerformance } from './logger'
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
    this.retryCondition = options.retryCondition || this.defaultRetryCondition
    this.onRetry = options.onRetry || (() => {})
    this.onMaxRetriesReached = options.onMaxRetriesReached || (() => {})
    
    // ID unique pour tracer les opérations
    this.operationId = `retry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    logDebug('RetryOperation créée', {
      operationId: this.operationId,
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
      backoffFactor: this.backoffFactor
    })
  }

  defaultRetryCondition(error) {
    // Conditions par défaut pour retry
    const retryableErrors = [
      'NetworkError',
      'TypeError',
      'Failed to fetch',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ]
    
    const isRetryableError = retryableErrors.some(errorType => 
      error.name === errorType || 
      error.message?.includes(errorType) ||
      error.code === errorType
    )
    
    const isRetryableStatus = error.status >= 500 || error.status === 429 || error.status === 408
    
    logDebug('Vérification condition de retry', {
      operationId: this.operationId,
      errorName: error.name,
      errorMessage: error.message,
      errorStatus: error.status,
      isRetryableError,
      isRetryableStatus,
      shouldRetry: isRetryableError || isRetryableStatus
    })
    
    return isRetryableError || isRetryableStatus
  }

  calculateDelay(attempt) {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.backoffFactor, attempt),
      this.maxDelay
    )
    
    // Ajouter un peu de jitter pour éviter la thundering herd
    const jitter = Math.random() * 0.1 * delay
    const finalDelay = Math.round(delay + jitter)
    
    logDebug('Calcul du délai de retry', {
      operationId: this.operationId,
      attempt,
      baseDelay: this.baseDelay,
      calculatedDelay: delay,
      jitter,
      finalDelay
    })
    
    return finalDelay
  }

  async execute() {
    const startTime = Date.now()
    let lastError
    
    logInfo('Début de l\'exécution avec retry', {
      operationId: this.operationId,
      maxRetries: this.maxRetries,
      startTime: new Date(startTime).toISOString()
    })

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const attemptStartTime = Date.now()
        
        logDebug('Tentative d\'exécution', {
          operationId: this.operationId,
          attempt: attempt + 1,
          totalAttempts: this.maxRetries + 1,
          attemptStartTime: new Date(attemptStartTime).toISOString()
        })

        const result = await this.operation()
        const attemptDuration = Date.now() - attemptStartTime
        const totalDuration = Date.now() - startTime
        
        logInfo('Opération réussie', {
          operationId: this.operationId,
          attempt: attempt + 1,
          attemptDuration,
          totalDuration,
          success: true
        })
        
        logPerformance(`RetryOperation ${this.operationId}`, totalDuration, {
          attempts: attempt + 1,
          success: true
        })

        return result

      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime
        lastError = error
        
        logWarning('Tentative échouée', {
          operationId: this.operationId,
          attempt: attempt + 1,
          totalAttempts: this.maxRetries + 1,
          attemptDuration,
          errorName: error.name,
          errorMessage: error.message,
          errorStatus: error.status,
          errorCode: error.code
        })

        // Vérifier si on doit retry
        const shouldRetry = attempt < this.maxRetries && this.retryCondition(error)
        
        if (!shouldRetry) {
          if (attempt >= this.maxRetries) {
            logError('Nombre maximum de tentatives atteint', error, {
              operationId: this.operationId,
              maxRetries: this.maxRetries,
              totalDuration: Date.now() - startTime
            })
            
            this.onMaxRetriesReached(error, attempt + 1)
          } else {
            logError('Condition de retry non remplie', error, {
              operationId: this.operationId,
              attempt: attempt + 1,
              errorName: error.name,
              errorMessage: error.message
            })
          }
          break
        }

        // Calculer le délai et notifier
        const delay = this.calculateDelay(attempt)
        
        logInfo('Retry programmé', {
          operationId: this.operationId,
          nextAttempt: attempt + 2,
          delay,
          delaySeconds: Math.round(delay / 1000),
          scheduledFor: new Date(Date.now() + delay).toISOString()
        })

        this.onRetry(error, attempt + 1, delay)

        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    const totalDuration = Date.now() - startTime
    
    logError('Opération définitivement échouée', lastError, {
      operationId: this.operationId,
      totalAttempts: this.maxRetries + 1,
      totalDuration,
      finalError: {
        name: lastError.name,
        message: lastError.message,
        status: lastError.status,
        code: lastError.code
      }
    })
    
    logPerformance(`RetryOperation ${this.operationId} FAILED`, totalDuration, {
      attempts: this.maxRetries + 1,
      success: false
    })

    throw lastError
  }

  // Méthode statique pour créer et exécuter en une fois
  static async execute(operation, options = {}) {
    const retryOp = new RetryOperation(operation, options)
    return await retryOp.execute()
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

/**
 * Fonctions utilitaires pour des cas d'usage courants
 */
export const retryFetch = (url, fetchOptions = {}, retryOptions = {}) => {
  const operation = () => fetch(url, fetchOptions)
  
  return RetryOperation.execute(operation, {
    maxRetries: 3,
    baseDelay: 1000,
    retryCondition: (error) => {
      // Retry pour les erreurs réseau et 5xx
      return error.name === 'TypeError' || 
             (error.status >= 500) ||
             error.status === 429
    },
    onRetry: (error, attempt, delay) => {
      logInfo('Retry fetch programmé', {
        url,
        attempt,
        delay,
        errorMessage: error.message
      })
    },
    ...retryOptions
  })
}

export const retryApiCall = async (apiFunction, ...args) => {
  return RetryOperation.execute(
    () => apiFunction(...args),
    {
      maxRetries: 2,
      baseDelay: 500,
      maxDelay: 5000,
      onRetry: (error, attempt, delay) => {
        logWarning('Retry API call', {
          functionName: apiFunction.name,
          attempt,
          delay,
          args: args.length,
          errorMessage: error.message
        })
      }
    }
  )
}
