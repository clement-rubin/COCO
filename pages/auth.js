import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { useAuth } from '../components/AuthContext'

export default function AuthPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  return (
    <div className="auth-page">
      <Head>
        <title>Authentification - COCO</title>
        <meta name="description" content="Connectez-vous ou créez un compte sur COCO" />
      </Head>

      <div className="container">
        <div className="header">
          <div className="logo">
            <span className="emoji">🥥</span>
            <h1>COCO</h1>
          </div>
          <p className="tagline">La plateforme communautaire de partage de recettes</p>
        </div>

        <div className="cards">
          <div className="card">
            <div className="card-icon">🔐</div>
            <h2>Se connecter</h2>
            <p>Accédez à votre compte existant pour partager et découvrir des recettes</p>
            <div className="card-buttons">
              <Link href="/login" className="button primary">
                Connexion classique
              </Link>
              <Link href="/signin" className="button secondary">
                Nouvelle interface
              </Link>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">✨</div>
            <h2>Créer un compte</h2>
            <p>Rejoignez notre communauté et commencez à partager vos recettes préférées</p>
            <div className="card-buttons">
              <Link href="/signup" className="button primary">
                Inscription classique
              </Link>
              <Link href="/register" className="button secondary">
                Nouvelle interface
              </Link>
            </div>
          </div>
        </div>

        <div className="links">
          <Link href="/forgot-password" className="text-link">
            Mot de passe oublié
          </Link>
          <span className="separator">•</span>
          <Link href="/auth/help" className="text-link">
            Aide
          </Link>
          <span className="separator">•</span>
          <Link href="/" className="text-link">
            Retour à l'accueil
          </Link>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        }

        .container {
          width: 100%;
          max-width: 900px;
          text-align: center;
        }

        .header {
          margin-bottom: 48px;
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .emoji {
          font-size: 3.5rem;
          margin-right: 16px;
        }

        .logo h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(90deg, #ff6b6b, #feca57, #ff9ff3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tagline {
          font-size: 1.2rem;
          color: #6b7280;
          margin: 0;
        }

        .cards {
          display: flex;
          gap: 32px;
          margin-bottom: 40px;
        }

        .card {
          flex: 1;
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
          transition: all 0.3s;
        }

        .card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.1);
        }

        .card-icon {
          font-size: 3rem;
          margin-bottom: 24px;
          background: #f3f4f6;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin-left: auto;
          margin-right: auto;
        }

        .card h2 {
          font-size: 1.8rem;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .card p {
          color: #6b7280;
          margin: 0 0 32px 0;
          line-height: 1.6;
        }

        .card-buttons {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .button {
          padding: 16px 24px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
        }

        .primary {
          background: #3b82f6;
          color: white;
        }

        .primary:hover {
          background: #2563eb;
        }

        .secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .secondary:hover {
          background: #e5e7eb;
        }

        .links {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 40px;
        }

        .text-link {
          color: #6b7280;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.3s;
        }

        .text-link:hover {
          color: #3b82f6;
        }

        .separator {
          color: #d1d5db;
        }

        @media (max-width: 768px) {
          .cards {
            flex-direction: column;
          }

          .links {
            flex-direction: column;
            gap: 24px;
          }

          .separator {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}