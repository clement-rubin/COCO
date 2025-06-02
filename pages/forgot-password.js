import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import ErrorDisplay from '../components/ErrorDisplay'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: resetError } = await resetPassword(email)
      
      if (resetError) {
        const errorResult = handleAuthError(resetError)
        setError(errorResult.userError)
        return
      }

      setSuccess(true)
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
            Email envoyé !
          </h1>
          <p style={{ 
            color: 'var(--text-medium)',
            lineHeight: '1.5',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>. 
            Vérifiez votre boîte mail et suivez les instructions.
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
        <title>Mot de passe oublié - COCO</title>
        <meta name="description" content="Réinitialisez votre mot de passe COCO" />
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
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🔑</div>
            <h1 style={{ 
              fontSize: '1.8rem', 
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--primary-orange)'
            }}>
              Mot de passe oublié ?
            </h1>
            <p style={{ color: 'var(--text-medium)' }}>
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <ErrorDisplay error={error} resetError={resetError} email={email} />
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
                className="form-input"
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
              disabled={loading || !email}
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
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>

          <div style={{ 
            textAlign: 'center', 
            marginTop: 'var(--spacing-lg)',
            fontSize: '0.9rem'
          }}>
            <Link 
              href="/login" 
              style={{ 
                color: 'var(--primary-orange)',
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-input:focus {
          border-color: var(--primary-orange);
          outline: none;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
