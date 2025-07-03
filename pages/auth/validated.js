import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../components/AuthContext'
import { logInfo, logUserInteraction } from '../../utils/logger'

export default function AccountValidated() {
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Extraire les paramètres de l'URL
    const { email, name } = router.query
    
    // Si un nom est fourni dans l'URL, l'utiliser
    if (name) {
      setUserName(decodeURIComponent(name))
      setLoading(false)
    } 
    // Sinon, essayer d'utiliser les informations de l'utilisateur connecté
    else if (user?.user_metadata?.display_name) {
      setUserName(user.user_metadata.display_name)
      setLoading(false)
    }
    // Si aucun nom n'est disponible
    else {
      setUserName('')
      setLoading(false)
    }
    
    // Journaliser la visite sur cette page
    logInfo('Visite page de validation de compte réussie', { 
      email: email || user?.email,
      hasUser: !!user,
      referrer: document.referrer,
      query: router.query
    })
    
    // Journaliser l'interaction utilisateur
    logUserInteraction('ACCOUNT_VALIDATED_VIEW', 'auth-validated', {
      email: email || user?.email
    })
    
  }, [router.query, user])

  // Déterminer une salutation appropriée en fonction de l'heure
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="validated-page">
      <Head>
        <title>Compte validé - COCO</title>
        <meta name="description" content="Votre compte COCO a été validé avec succès" />
      </Head>

      <div className="container">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            <div className="success-header">
              <div className="success-icon">✨</div>
              <h1>
                {userName ? `${getGreeting()}, ${userName}!` : 'Compte validé !'}
              </h1>
              <p className="success-message">
                Votre compte a été validé avec succès. Bienvenue dans la communauté COCO !
              </p>
            </div>
            
            <div className="info-card">
              <h2>Que pouvez-vous faire maintenant ?</h2>
              <div className="feature-grid">
                <div className="feature-item">
                  <div className="feature-icon">📝</div>
                  <h3>Créer votre profil</h3>
                  <p>Personnalisez votre profil pour vous présenter à la communauté</p>
                  <Link href="/profile/edit" className="action-button secondary">
                    Éditer le profil
                  </Link>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">🍳</div>
                  <h3>Partager des recettes</h3>
                  <p>Partagez vos meilleures créations culinaires</p>
                  <Link href="/submit-recipe" className="action-button secondary">
                    Créer une recette
                  </Link>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">🔍</div>
                  <h3>Découvrir des recettes</h3>
                  <p>Explorez les délicieuses recettes de notre communauté</p>
                  <Link href="/collections" className="action-button secondary">
                    Collections
                  </Link>
                </div>

                <div className="feature-item">
                  <div className="feature-icon">👥</div>
                  <h3>Trouver des amis</h3>
                  <p>Connectez-vous avec d'autres passionnés de cuisine</p>
                  <Link href="/friends" className="action-button secondary">
                    Trouver des amis
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="action-buttons">
              {!user && (
                <Link href="/login" className="action-button primary">
                  Se connecter maintenant
                </Link>
              )}
              <Link href="/" className="action-button outline">
                Aller à l'accueil
              </Link>
            </div>
            
            <div className="confetti-container">
              <div className="confetti confetti-1"></div>
              <div className="confetti confetti-2"></div>
              <div className="confetti confetti-3"></div>
              <div className="confetti confetti-4"></div>
              <div className="confetti confetti-5"></div>
              <div className="confetti confetti-6"></div>
              <div className="confetti confetti-7"></div>
              <div className="confetti confetti-8"></div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .validated-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          position: relative;
          overflow: hidden;
        }
        
        .container {
          width: 100%;
          max-width: 900px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          padding: 3rem 2rem;
          text-align: center;
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 107, 53, 0.2);
          border-top: 4px solid #ff6b35;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .success-header {
          margin-bottom: 3rem;
        }
        
        .success-icon {
          font-size: 5rem;
          margin-bottom: 1.5rem;
          animation: bounce 2s ease infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 1.5rem 0;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .success-message {
          font-size: 1.2rem;
          color: #4b5563;
          margin: 0;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }
        
        .info-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2.5rem;
        }
        
        .info-card h2 {
          font-size: 1.5rem;
          color: #334155;
          margin: 0 0 1.5rem 0;
        }
        
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        
        .feature-item {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        
        .feature-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .feature-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        
        .feature-item h3 {
          font-size: 1.2rem;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }
        
        .feature-item p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0 0 1.5rem 0;
          line-height: 1.4;
        }
        
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .action-button {
          padding: 0.8rem 2rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }
        
        .action-button.primary {
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          color: white;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
        }
        
        .action-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(255, 107, 53, 0.3);
        }
        
        .action-button.secondary {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }
        
        .action-button.secondary:hover {
          background: #f8fafc;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .action-button.outline {
          background: transparent;
          color: #64748b;
          border: 2px solid #e2e8f0;
        }
        
        .action-button.outline:hover {
          color: #334155;
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          opacity: 0.7;
          animation: fall linear infinite;
        }
        
        .confetti-1 {
          background: #ff6b35;
          left: 10%;
          animation-duration: 5s;
          animation-delay: 0s;
        }
        
        .confetti-2 {
          background: #f7931e;
          left: 20%;
          animation-duration: 7s;
          animation-delay: 1s;
        }
        
        .confetti-3 {
          background: #3b82f6;
          left: 35%;
          animation-duration: 6s;
          animation-delay: 2s;
        }
        
        .confetti-4 {
          background: #10b981;
          left: 50%;
          animation-duration: 8s;
          animation-delay: 0.5s;
        }
        
        .confetti-5 {
          background: #f59e0b;
          left: 65%;
          animation-duration: 5s;
          animation-delay: 1.5s;
        }
        
        .confetti-6 {
          background: #8b5cf6;
          left: 80%;
          animation-duration: 7s;
          animation-delay: 2.5s;
        }
        
        .confetti-7 {
          background: #ec4899;
          left: 90%;
          animation-duration: 6s;
          animation-delay: 1s;
        }
        
        .confetti-8 {
          background: #6366f1;
          left: 95%;
          animation-duration: 8s;
          animation-delay: 0s;
        }
        
        @keyframes fall {
          0% {
            top: -10px;
            transform: rotate(0deg) scale(0.7);
          }
          100% {
            top: 100%;
            transform: rotate(360deg) scale(1);
          }
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 2rem 1.5rem;
          }
          
          h1 {
            font-size: 2rem;
          }
          
          .success-message {
            font-size: 1rem;
          }
          
          .feature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
