import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { handleAuthError } from '../../utils/errorHandler'
import ErrorDisplay from '../../components/ErrorDisplay'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    // Check if we have a valid session for password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        // No valid session, redirect to forgot password
        router.push('/forgot-password')
      }
    }

    checkSession()
  }, [router])

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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })
      
      if (updateError) {
        const errorResult = handleAuthError(updateError)
        setError(errorResult.userError)
        return
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      const errorResult = handleAuthError(err)
      setError(errorResult.userError)
    } finally {
      setLoading(false)
    }
  }

  const resetError = () => setError(null)

  if (!validSession) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-light)',
          borderTop: '4px solid var(--primary-orange)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    )
  }

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
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>✅</div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: 'var(--spacing-md)',
            color: 'var(--primary-orange)'
          }}>
            Mot de passe modifié !
          </h1>
          <p style={{ 
            color: 'var(--text-medium)',
            lineHeight: '1.5',
            marginBottom: 'var(--spacing-lg)'
          }}>
            Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <p style={{ 
            color: 'var(--text-light)',
            fontSize: '0.9rem'
          }}>
            Redirection automatique vers la connexion...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Nouveau mot de passe - COCO</title>
        <meta name="description" content="Définissez votre nouveau mot de passe COCO" />
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
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🔐</div>
            <h1 style={{ 
              fontSize: '1.8rem', 
              marginBottom: 'var(--spacing-sm)',
              color: 'var(--primary-orange)'
            }}>
              Nouveau mot de passe
            </h1>
            <p style={{ color: 'var(--text-medium)' }}>
              Choisissez un nouveau mot de passe sécurisé
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
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading || !password || !confirmPassword}
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
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
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
