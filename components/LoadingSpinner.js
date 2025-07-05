import { useState, useEffect } from 'react'

const LOADING_MESSAGES = [
  "🍳 Préparation en cours...",
  "👨‍🍳 Mélange des ingrédients...",
  "🔥 Cuisson à feu doux...",
  "✨ Finalisation du plat...",
  "🍽️ Dressage de l'assiette...",
  "🧂 Assaisonnement...",
  "📝 Vérification de la recette..."
]

// Skeleton loader component for better UX
export function RecipeSkeleton({ count = 1 }) {
  return (
    <div className="skeleton-container">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="recipe-skeleton">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-description"></div>
            <div className="skeleton-meta">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text-short"></div>
            </div>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        .skeleton-container {
          display: grid;
          gap: 1rem;
          padding: 1rem;
        }
        
        .recipe-skeleton {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          animation: fadeIn 0.3s ease;
        }
        
        .skeleton-image {
          width: 100%;
          height: 200px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-content {
          padding: 1rem;
        }
        
        .skeleton-title {
          height: 20px;
          width: 80%;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          margin-bottom: 0.5rem;
        }
        
        .skeleton-description {
          height: 14px;
          width: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          margin-bottom: 1rem;
        }
        
        .skeleton-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .skeleton-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-text-short {
          height: 12px;
          width: 60px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export default function LoadingSpinner({ 
  size = 'medium', 
  message = null, 
  showProgress = false,
  progress = 0,
  duration = 3000,
  className = '',
  variant = 'default', // default, minimal, festive
  steps = null // Array of step descriptions
}) {
  const [currentMessage, setCurrentMessage] = useState(
    message || LOADING_MESSAGES[0]
  )
  const [messageIndex, setMessageIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  // Enhanced message rotation with steps
  useEffect(() => {
    if (message || !steps) return

    const messages = steps || LOADING_MESSAGES
    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const next = (prev + 1) % messages.length
        setCurrentMessage(messages[next])
        setCurrentStep(next)
        return next
      })
    }, duration / messages.length)

    return () => clearInterval(interval)
  }, [message, duration, steps])

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  if (variant === 'minimal') {
    return (
      <div className={`minimal-spinner ${className}`}>
        <div className={`spinner-dot ${sizeClasses[size]}`}></div>
        {message && <span className="minimal-message">{message}</span>}
        
        <style jsx>{`
          .minimal-spinner {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          
          .spinner-dot {
            border-radius: 50%;
            background: var(--primary-orange);
            animation: pulse 1.5s ease-in-out infinite;
          }
          
          .minimal-message {
            font-size: 0.875rem;
            color: var(--text-medium);
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
        `}</style>
      </div>
    )
  }

  if (variant === 'festive') {
    return (
      <div className={`festive-spinner ${className}`}>
        <div className="festive-container">
          <div className="chef-hat">👨‍🍳</div>
          <div className="cooking-items">
            <span className="item item-1">🍳</span>
            <span className="item item-2">🥘</span>
            <span className="item item-3">🍲</span>
          </div>
          <div className="sparkles">
            <span>✨</span>
            <span>✨</span>
            <span>✨</span>
          </div>
        </div>
        
        <div className="festive-message">
          <span className="message-text">{currentMessage}</span>
          {steps && (
            <div className="step-indicator">
              Étape {currentStep + 1} sur {steps.length}
            </div>
          )}
        </div>

        <style jsx>{`
          .festive-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            padding: 2rem;
            text-align: center;
          }
          
          .festive-container {
            position: relative;
            width: 120px;
            height: 120px;
          }
          
          .chef-hat {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            animation: bounce 2s infinite;
          }
          
          .cooking-items {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          
          .item {
            position: absolute;
            font-size: 1.5rem;
            animation: orbit 3s linear infinite;
          }
          
          .item-1 {
            animation-delay: 0s;
          }
          
          .item-2 {
            animation-delay: 1s;
          }
          
          .item-3 {
            animation-delay: 2s;
          }
          
          .sparkles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          
          .sparkles span {
            position: absolute;
            font-size: 1rem;
            animation: twinkle 1.5s infinite;
          }
          
          .sparkles span:nth-child(1) {
            top: 20%;
            left: 20%;
            animation-delay: 0s;
          }
          
          .sparkles span:nth-child(2) {
            top: 20%;
            right: 20%;
            animation-delay: 0.5s;
          }
          
          .sparkles span:nth-child(3) {
            bottom: 20%;
            left: 50%;
            animation-delay: 1s;
          }
          
          .festive-message {
            max-width: 300px;
          }
          
          .message-text {
            font-size: 1rem;
            font-weight: 600;
            color: var(--primary-orange);
            display: block;
            margin-bottom: 0.5rem;
          }
          
          .step-indicator {
            font-size: 0.875rem;
            color: var(--text-medium);
            background: var(--bg-card);
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            display: inline-block;
          }
          
          @keyframes bounce {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -60%) scale(1.1); }
          }
          
          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`loading-spinner ${className}`}>
      {/* Spinner principal */}
      <div className="spinner-container">
        <div className={`spinner ${sizeClasses[size]}`}>
          <div className="spinner-ring"></div>
          <div className="spinner-inner">
            <span className="spinner-emoji">🍴</span>
          </div>
        </div>
        
        {/* Enhanced progress bar */}
        {showProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <div className="progress-info">
              <span className="progress-text">{Math.round(progress)}%</span>
              {steps && (
                <span className="progress-step">
                  {currentStep + 1}/{steps.length}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message avec indicateur d'étapes */}
      <div className="loading-message">
        <span className="message-text">{currentMessage}</span>
        <div className="dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
      </div>

      <style jsx>{`
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          text-align: center;
        }

        .spinner-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid rgba(255, 107, 53, 0.2);
          border-top: 3px solid var(--primary-orange);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size === 'small' ? '0.75rem' : 
                       size === 'medium' ? '1rem' :
                       size === 'large' ? '1.5rem' : '2rem'};
          animation: pulse 2s ease-in-out infinite;
        }

        .spinner-emoji {
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          width: 200px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 107, 53, 0.2);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-orange), var(--primary-coral));
          border-radius: 10px;
          transition: width 0.3s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 1.5s infinite;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-medium);
        }

        .progress-text {
          color: var(--primary-orange);
        }

        .progress-step {
          color: var(--text-light);
        }

        .loading-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          max-width: 300px;
        }

        .message-text {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-dark);
          animation: fadeInOut 3s ease-in-out infinite;
        }

        .dots {
          display: flex;
          gap: 0.25rem;
        }

        .dots span {
          width: 4px;
          height: 4px;
          background: var(--primary-orange);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }

        .dots span:nth-child(1) { animation-delay: -0.32s; }
        .dots span:nth-child(2) { animation-delay: -0.16s; }
        .dots span:nth-child(3) { animation-delay: 0s; }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .loading-spinner {
            padding: 1rem;
          }
          
          .message-text {
            font-size: 0.875rem;
          }
          
          .progress-container {
            width: 150px;
          }
        }
      `}</style>
    </div>
  )
}
