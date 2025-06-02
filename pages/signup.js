import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import ErrorDisplay from '../components/ErrorDisplay'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { signUp } = useAuth()
  const router = useRouter()

  const validateForm = () => {
    if (password !== confirmPassword) {
      setError({
        message: "Les mots de passe ne correspondent pas",
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      return false
    }
    
    if (password.length < 6) {
      setError({
        message: "Le mot de passe doit contenir au moins 6 caractères",
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await signUp(email, password, {
        display_name: displayName || null
      })
      
      if (signUpError) {
        const errorResult = handleAuthError(signUpError)
        setError(errorResult.userError)
        return
      }

      // Si pas de session, c'est que l'email doit être confirmé
      if (!data.session) {
        setSuccess(true)
      } else {
        router.push('/')
      }
    } catch (err) {
      const errorResult = handleAuthError(err)
      setError(errorResult.userError)
    } finally {
      setLoading(false)
    }
  }

  const resetError = () => setError(null)

  if (success) {
    return (
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
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '24px',
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
          }}>
            📧
          </div>
          <h1 style={{ 
            fontSize: '1.8rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px',
            letterSpacing: '-0.5px'
          }}>
            Vérifiez votre email
          </h1>
          <p style={{ 
            color: '#6b7280',
            lineHeight: '1.6',
            marginBottom: '32px',
            fontSize: '1rem'
          }}>
            Nous avons envoyé un lien de confirmation à <strong style={{ color: '#374151' }}>{email}</strong>. 
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Link 
            href="/login"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '16px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 8px 20px rgba(255, 107, 107, 0.3)',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Créer un compte - COCO</title>
        <meta name="description" content="Créez votre compte COCO et partagez vos recettes" />
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
          maxWidth: '460px',
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
              Rejoignez COCO
            </h1>
            <p style={{ 
              color: '#6b7280',
              fontSize: '1rem',
              margin: 0
            }}>
              Créez votre compte pour partager vos recettes
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: '32px' }}>
              <ErrorDisplay error={error} resetError={resetError} email={email} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Display Name */}
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
                Nom d'affichage (optionnel)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                placeholder="Comment souhaitez-vous être appelé ?"
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

            {/* Email */}
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

            {/* Password */}
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

            {/* Confirm Password */}
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
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              disabled={loading || !email || !password || !confirmPassword}
              style={{
                width: '100%',
                padding: '18px',
                background: loading || !email || !password || !confirmPassword
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: loading || !email || !password || !confirmPassword ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transform: loading ? 'scale(0.98)' : 'scale(1)',
                boxShadow: loading || !email || !password || !confirmPassword
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
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          {/* Link to Login */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '32px',
            padding: '20px 0',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.95rem'
          }}>
            <span style={{ color: '#6b7280' }}>
              Déjà un compte ?{' '}
            </span>
            <Link 
              href="/login" 
              style={{ 
                color: '#ff6b6b',
                textDecoration: 'none',
                fontWeight: '700'
              }}
            >
              Se connecter
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
