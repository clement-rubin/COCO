import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import { createOrUpdateProfile } from '../lib/supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { signIn, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = router.query.redirect || '/'
      router.push(redirectTo)
    }
  }, [user, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data, error: signInError } = await signIn(email, password)
      
      if (signInError) {
        const errorMessage = handleAuthError(signInError).userError || 'Une erreur est survenue lors de la connexion'
        setError(errorMessage)
        return
      }

      // Create or update profile if needed
      if (data?.user?.id) {
        await createOrUpdateProfile(data.user.id, {
          email: data.user.email,
          displayName: data.user.email.split('@')[0]
        })
      }

      setSuccess(true)
      
      // Redirect after successful login
      setTimeout(() => {
        const redirectTo = router.query.redirect || '/'
        router.push(redirectTo)
      }, 1000)
    } catch (err) {
      const errorMessage = handleAuthError(err).userError || 'Une erreur est survenue lors de la connexion'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-page">
      <Head>
        <title>Connexion Alternative - COCO</title>
        <meta name="description" content="Connectez-vous à votre compte COCO" />
      </Head>

      <div className="signin-container">
        <div className="left-panel">
          <div className="logo">
            <span className="emoji">🥥</span>
            <h1>COCO</h1>
          </div>
          <div className="tagline">
            <h2>Partagez vos recettes préférées</h2>
            <p>Rejoignez notre communauté et découvrez des milliers de recettes</p>
          </div>
          <div className="features">
            <div className="feature">
              <span className="feature-icon">🍽️</span>
              <div>
                <h3>Recettes Illimitées</h3>
                <p>Accédez à des milliers de recettes</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <div>
                <h3>Communauté</h3>
                <p>Partagez avec vos amis</p>
              </div>
            </div>
            <div className="feature">
              <span className="feature-icon">📱</span>
              <div>
                <h3>Interface Simple</h3>
                <p>Facile à utiliser partout</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          <div className="form-container">
            <div className="form-header">
              <h2>Connexion</h2>
              <p>Entrez vos identifiants pour accéder à votre compte</p>
            </div>

            {error && (
              <div className="error-alert">
                <span className="alert-icon">⚠️</span>
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="success-alert">
                <span className="alert-icon">✅</span>
                <span>Connexion réussie ! Redirection...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="signin-form">
              <div className="form-group">
                <label htmlFor="email">Adresse email</label>
                <div className="input-wrapper">
                  <span className="input-icon">📧</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="password-options">
                <Link href="/forgot-password" className="forgot-link">
                  Mot de passe oublié?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || !email || !password}
                className={`submit-button ${loading || !email || !password ? 'disabled' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>Pas encore de compte?</p>
              <Link href="/signup" className="signup-link">
                Créer un compte
              </Link>
            </div>

            <div className="alt-login">
              <p>Ou connectez-vous avec</p>
              <div className="alt-login-methods">
                <Link href="/login" className="alt-method">
                  Page de connexion classique
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f9fafb;
          padding: 20px;
        }

        .signin-container {
          display: flex;
          width: 100%;
          max-width: 1200px;
          min-height: 600px;
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .left-panel {
          flex: 1;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 60px 40px;
          display: flex;
          flex-direction: column;
        }

        .logo {
          display: flex;
          align-items: center;
          margin-bottom: 40px;
        }

        .emoji {
          font-size: 3rem;
          margin-right: 12px;
        }

        .logo h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0;
        }

        .tagline {
          margin-bottom: 60px;
        }

        .tagline h2 {
          font-size: 2rem;
          font-weight: 700;
          margin: 0 0 16px 0;
        }

        .tagline p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
          line-height: 1.5;
        }

        .features {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .feature-icon {
          font-size: 1.8rem;
          background: rgba(255, 255, 255, 0.2);
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .feature h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
        }

        .feature p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .right-panel {
          flex: 1;
          padding: 60px 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .form-header h2 {
          margin: 0 0 8px 0;
          font-size: 2rem;
          color: #111827;
        }

        .form-header p {
          margin: 0;
          color: #6b7280;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
        }

        .signin-form input {
          width: 100%;
          padding: 16px 16px 16px 50px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .signin-form input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .password-options {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 8px;
        }

        .forgot-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.3s;
        }

        .forgot-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .submit-button {
          padding: 16px;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
        }

        .submit-button:hover:not(.disabled) {
          background: #4f46e5;
        }

        .submit-button.disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .form-footer {
          margin-top: 32px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .form-footer p {
          margin: 0;
          color: #6b7280;
        }

        .signup-link {
          color: #6366f1;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s;
        }

        .signup-link:hover {
          color: #4f46e5;
          text-decoration: underline;
        }

        .alt-login {
          margin-top: 32px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          padding-top: 24px;
        }

        .alt-login p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .alt-login-methods {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .alt-method {
          padding: 12px 20px;
          background: #f3f4f6;
          border-radius: 8px;
          color: #374151;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .alt-method:hover {
          background: #e5e7eb;
        }

        .error-alert, .success-alert {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          gap: 12px;
        }

        .error-alert {
          background-color: #fee2e2;
          color: #b91c1c;
        }

        .success-alert {
          background-color: #d1fae5;
          color: #065f46;
        }

        .alert-icon {
          font-size: 1.2rem;
        }

        .close-button {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          color: currentColor;
        }

        /* Responsive adjustments */
        @media (max-width: 900px) {
          .signin-container {
            flex-direction: column;
          }

          .left-panel {
            padding: 40px 20px;
          }

          .features {
            margin-top: 40px;
          }
        }
      `}</style>
    </div>
  )
}