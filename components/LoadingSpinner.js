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

export default function LoadingSpinner({ 
  size = 'medium', 
  message = null, 
  showProgress = false,
  progress = 0,
  duration = 3000,
  className = ''
}) {
  const [currentMessage, setCurrentMessage] = useState(
    message || LOADING_MESSAGES[0]
  )
  const [messageIndex, setMessageIndex] = useState(0)

  // Rotation automatique des messages
  useEffect(() => {
    if (message) return // Ne pas changer si un message spécifique est fourni

    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const next = (prev + 1) % LOADING_MESSAGES.length
        setCurrentMessage(LOADING_MESSAGES[next])
        return next
      })
    }, duration / LOADING_MESSAGES.length)

    return () => clearInterval(interval)
  }, [message, duration])

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
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
        
        {/* Barre de progression */}
        {showProgress && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>

      {/* Message */}
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
          height: 6px;
          background: rgba(255, 107, 53, 0.2);
          border-radius: 10px;
          overflow: hidden;
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

        .progress-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-medium);
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

// Composant de skeleton pour le chargement de contenu
export function SkeletonLoader({ 
  lines = 3, 
  showAvatar = false, 
  showImage = false,
  className = '' 
}) {
  return (
    <div className={`skeleton-loader ${className}`}>
      {showAvatar && (
        <div className="skeleton-avatar"></div>
      )}
      
      {showImage && (
        <div className="skeleton-image"></div>
      )}
      
      <div className="skeleton-content">
        {Array.from({ length: lines }, (_, i) => (
          <div 
            key={i} 
            className="skeleton-line"
            style={{ 
              width: i === lines - 1 ? '70%' : '100%',
              animationDelay: `${i * 0.1}s`
            }}
          ></div>
        ))}
      </div>

      <style jsx>{`
        .skeleton-loader {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          animation: fadeIn 0.3s ease;
        }

        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          flex-shrink: 0;
        }

        .skeleton-image {
          width: 100%;
          height: 200px;
          border-radius: var(--radius-md);
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          margin-bottom: 1rem;
        }

        .skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .skeleton-line {
          height: 16px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
