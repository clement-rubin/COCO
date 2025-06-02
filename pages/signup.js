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
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)'
      }}>
        <div className="card" style={{
          width: '100%',
          maxWidth: '400px',
          padding: 'var(--spacing-xl)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>📧</div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: 'var(--spacing-md)',
            color: 'var(--primary-orange)'
          }}>
            Vérifiez votre email
          </h1>
          <p style={{ 
            color: 'var(--text-medium)',
            lineHeight: '1.5',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. 
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Link 
            href="/login"
            style={{
              display: 'inline-block',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              background: 'var(--primary-orange)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: 'var(--border-radius-medium)',
              fontWeight: '600'
            }}
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
              Rejoignez COCO
            </h1>
            <p style={{ color: 'var(--text-medium)' }}>
              Créez votre compte pour partager vos recettes
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
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem'
                }}
              />
            </div>

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
                  fontSize: '1rem'
                }}
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
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 'var(--spacing-sm)',
                fontWeight: '500',
                color: 'var(--text-dark)'
              }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-md)',
                  border: '2px solid var(--border-light)',
                  borderRadius: 'var(--border-radius-medium)',
                  fontSize: '1rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
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
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div style={{ 
            textAlign: 'center', 
            marginTop: 'var(--spacing-lg)',
            fontSize: '0.9rem'
          }}>
            <span style={{ color: 'var(--text-medium)' }}>
              Déjà un compte ?{' '}
            </span>
            <Link 
              href="/login" 
              style={{ 
                color: 'var(--primary-orange)',
                textDecoration: 'none',
                fontWeight: '600'
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
