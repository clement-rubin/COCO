import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export function Toast({ message, type = 'info', duration = 4000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📢'
    }
  }

  const getColor = () => {
    switch (type) {
      case 'success': return '#10b981'
      case 'error': return '#ef4444'
      case 'warning': return '#f59e0b'
      case 'info': return '#3b82f6'
      default: return '#6b7280'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'white',
        border: `2px solid ${getColor()}`,
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
        zIndex: 10000,
        maxWidth: '400px',
        animation: 'slideInRight 0.3s ease-out',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>{getIcon()}</span>
      <span style={{ flex: 1, fontWeight: '500', color: '#374151' }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          color: '#9ca3af',
          padding: '4px'
        }}
      >
        ✕
      </button>
    </div>
  )
}

export function ProgressiveToast({ steps, currentStep, onComplete }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (currentStep >= steps.length) {
      setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, 1000)
    }
  }, [currentStep, steps.length, onComplete])

  if (!visible) return null

  const progress = (currentStep / steps.length) * 100

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: '320px',
        animation: 'slideInDown 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>🔄</span>
        <span style={{ fontWeight: '600', color: '#374151' }}>
          {currentStep < steps.length ? steps[currentStep] : 'Terminé!'}
        </span>
      </div>
      
      <div style={{ background: '#f3f4f6', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10b981, #059669)',
            transition: 'width 0.3s ease',
            borderRadius: '8px'
          }}
        />
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
        Étape {Math.min(currentStep + 1, steps.length)} sur {steps.length}
      </div>
    </div>
  )
}

export function ActionConfirmation({ 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'warning'
}) {
  const getIcon = () => {
    switch (type) {
      case 'danger': return '⚠️'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '❓'
    }
  }

  const getConfirmColor = () => {
    switch (type) {
      case 'danger': return '#ef4444'
      case 'warning': return '#f59e0b'
      default: return '#3b82f6'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}>
            {getIcon()}
          </span>
          <p style={{ fontSize: '1.1rem', fontWeight: '500', color: '#374151', margin: 0 }}>
            {message}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              background: getConfirmColor(),
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook pour gérer les feedbacks utilisateur
export function useFeedback() {
  const [toasts, setToasts] = useState([])
  const [confirmation, setConfirmation] = useState(null)
  const [progressToast, setProgressToast] = useState(null)

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  const showConfirmation = (message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmation({
        message,
        onConfirm: () => {
          setConfirmation(null)
          resolve(true)
        },
        onCancel: () => {
          setConfirmation(null)
          resolve(false)
        },
        ...options
      })
    })
  }

  const showProgress = (steps) => {
    let currentStep = 0
    setProgressToast({ steps, currentStep })
    
    return {
      nextStep: () => {
        currentStep++
        setProgressToast(prev => prev ? { ...prev, currentStep } : null)
      },
      complete: () => {
        setProgressToast(null)
      }
    }
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return {
    showToast,
    showConfirmation,
    showProgress,
    toasts,
    confirmation,
    progressToast,
    removeToast
  }
}

// Composant Provider pour les feedbacks
export function FeedbackProvider({ children }) {
  const feedback = useFeedback()

  return (
    <>
      {children}
      
      {/* Render toasts */}
      {feedback.toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => feedback.removeToast(toast.id)}
        />
      ))}
      
      {/* Render confirmation dialog */}
      {feedback.confirmation && (
        <ActionConfirmation {...feedback.confirmation} />
      )}
      
      {/* Render progress toast */}
      {feedback.progressToast && (
        <ProgressiveToast
          steps={feedback.progressToast.steps}
          currentStep={feedback.progressToast.currentStep}
          onComplete={() => feedback.setProgressToast(null)}
        />
      )}
      
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  )
}
