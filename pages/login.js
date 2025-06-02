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
        background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          opacity: 0.3
        }}></div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '48px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '16px',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
            }}>
              🥥
            </div>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
              letterSpacing: '-0.5px'
            }}>
              Bon retour !
            </h1>
            <p style={{ 
              color: '#6b7280',
              fontSize: '1rem',
              margin: 0
            }}>
              Reconnectez-vous pour découvrir de nouvelles saveurs
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: '32px' }}>
              <ErrorDisplay error={error} resetError={resetError} email={email} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Email Field */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="votre@email.com"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b6b'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Password Field */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '0.9rem',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '16px',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: loading ? '#f9fafb' : 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#ff6b6b'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%',
                padding: '18px',
                background: loading || !email || !password 
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transform: loading ? 'scale(0.98)' : 'scale(1)',
                boxShadow: loading || !email || !password 
                  ? 'none' 
                  : '0 8px 20px rgba(255, 107, 107, 0.3)'
              }}
            >
              {loading && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Links */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <Link 
              href="/forgot-password" 
              style={{ 
                color: '#ff6b6b',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.95rem',
                transition: 'opacity 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.7'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Mot de passe oublié ?
            </Link>
            
            <div style={{ 
              padding: '20px 0',
              borderTop: '1px solid #e5e7eb',
              fontSize: '0.95rem'
            }}>
              <span style={{ color: '#6b7280' }}>
                Pas encore de compte ?{' '}
              </span>
              <Link 
                href="/signup" 
                style={{ 
                  color: '#ff6b6b',
                  textDecoration: 'none',
                  fontWeight: '700'
                }}
              >
                Créer un compte
              </Link>
            </div>
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
