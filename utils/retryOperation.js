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
    logWarning('Checking retry condition for error', {
      errorMessage: error?.message,
      errorStatus: error?.status,
      errorCode: error?.code,
      errorType: typeof error
    })
    
    const isRetryableStatus = error.status >= 500 || error.status === 429 || error.status === 408
    const isNetworkError = !error.status && (error.name === 'NetworkError' || error.message?.includes('fetch'))
    
    const shouldRetry = isRetryableStatus || isNetworkError
    
    logInfo('Retry condition result', {
      shouldRetry,
      isRetryableStatus,
      isNetworkError,
      errorStatus: error?.status,
      errorMessage: error?.message
    })
    
    return shouldRetry
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
        
        logError(`Retry operation attempt ${attempt + 1} échouée`, error, {
          attempt,
          maxRetries: this.maxRetries,
          willRetry: attempt < this.maxRetries && this.retryCondition(error),
          errorStatus: error?.status,
          errorCode: error?.code
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
    progress: null,
    retryCount: 0,
    success: false
  })

  const execute = useCallback(async (operation, options = {}) => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onProgress,
      onRetry,
      progressSteps = []
    } = options

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      retryCount: 0,
      success: false,
      progress: progressSteps.length > 0 ? { current: 0, total: progressSteps.length, step: progressSteps[0] } : null
    }))

    let lastError = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          setState(prev => ({ ...prev, retryCount: attempt }))
          onRetry?.(attempt)
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
        }

        // Simulate progress steps
        if (progressSteps.length > 0) {
          for (let i = 0; i < progressSteps.length; i++) {
            setState(prev => ({
              ...prev,
              progress: { current: i, total: progressSteps.length, step: progressSteps[i] }
            }))
            onProgress?.(i, progressSteps.length, progressSteps[i])
            
            if (i < progressSteps.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
        }

        const result = await operation()
        
        setState(prev => ({
          ...prev,
          loading: false,
          success: true,
          progress: progressSteps.length > 0 ? { current: progressSteps.length, total: progressSteps.length, step: 'Terminé ✅' } : null
        }))

        return { success: true, data: result, error: null }

      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Une erreur est survenue',
            retryCount: attempt
          }))
          break
        }
      }
    }

    return { success: false, data: null, error: lastError }
  }, [])

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      progress: null,
      retryCount: 0,
      success: false
    })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

export default useRetryOperation

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
