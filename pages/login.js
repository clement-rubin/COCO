import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import ErrorDisplay from '../components/ErrorDisplay'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await signIn(email, password)
      
      if (signInError) {
        const errorResult = handleAuthError(signInError)
        setError(errorResult.userError)
        return
      }

      // Redirection vers la page d'origine ou l'accueil
      const redirectTo = router.query.redirect || '/'
      router.push(redirectTo)
    } catch (err) {
      const errorResult = handleAuthError(err)
      setError(errorResult.userError)
    } finally {
      setLoading(false)
    }
  }

  const resetError = () => setError(null)

  return (
    <div>
      <Head>
        <title>Connexion - COCO</title>
        <meta name="description" content="Connectez-vous à votre compte COCO" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)'
      }}>
        <div className="card" style={{
          width: '100%',
          maxWidth: '400px',
          padding: 'var(--spacing-xl)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🥥</div>
            <h1 style={{ 
              fontSize: '1.8rem', 
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--primary-orange)'
            }}>
              Bon retour !
            </h1>
            <p style={{ color: 'var(--text-medium)' }}>
              Connectez-vous à votre compte
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <ErrorDisplay error={error} resetError={resetError} />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--spacing-sm)',
                fontWeight: '500',
                color: 'var(--text-dark)'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-orange)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--spacing-sm)',
                fontWeight: '500',
                color: 'var(--text-dark)'
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-orange)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%',
                padding: 'var(--spacing-md)',
                background: loading ? 'var(--text-light)' : 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius-medium)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-sm)'
              }}
            >
              {loading && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div style={{ 
            textAlign: 'center', 
            marginTop: 'var(--spacing-lg)',
            fontSize: '0.9rem'
          }}>
            <Link 
              href="/forgot-password" 
              style={{ 
                color: 'var(--primary-orange)',
                textDecoration: 'none',
                display: 'block',
                marginBottom: 'var(--spacing-md)'
              }}
            >
              Mot de passe oublié ?
            </Link>
            <span style={{ color: 'var(--text-medium)' }}>
              Pas encore de compte ?{' '}
            </span>
            <Link 
              href="/signup" 
              style={{ 
                color: 'var(--primary-orange)',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
