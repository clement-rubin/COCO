import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../components/AuthContext'

export default function Confirm() {
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    const handleEmailConfirmation = () => {
      // Check if there's an error or success parameter in the URL
      const urlParams = new URLSearchParams(window.location.search)
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      if (error) {
        setStatus('error')
        setMessage(errorDescription || 'Une erreur est survenue lors de la confirmation de votre email.')
      } else if (user) {
        // User is authenticated, confirmation was successful
        setStatus('success')
        setMessage('Votre email a été confirmé avec succès !')
        
        // Redirect to validated page with name if available
        const displayName = user.user_metadata?.display_name || ''
        const redirectUrl = `/auth/validated?email=${encodeURIComponent(user.email)}${displayName ? `&name=${encodeURIComponent(displayName)}` : ''}`
        
        // Redirect to validated page after 1 second
        setTimeout(() => {
          router.push(redirectUrl)
        }, 1000)
      } else {
        // Still waiting for authentication state
        setStatus('success')
        setMessage('Votre email a été confirmé ! Vous pouvez maintenant vous connecter.')
        
        // Redirect to validated page after 2 seconds
        setTimeout(() => {
          router.push('/auth/validated')
        }, 2000)
      }
    }

    // Wait a bit for the auth state to update
    const timer = setTimeout(handleEmailConfirmation, 1000)
    return () => clearTimeout(timer)
  }, [user, router])

  return (
    <div>
      <Head>
        <title>Confirmation email - COCO</title>
        <meta name="description" content="Confirmation de votre compte COCO" />
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
          padding: 'var(--spacing-xl)',
          textAlign: 'center'
        }}>
          {status === 'loading' && (
            <>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--border-light)',
                borderTop: '4px solid var(--primary-orange)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto var(--spacing-lg)'
              }} />
              <h1 style={{ 
                fontSize: '1.5rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--primary-orange)'
              }}>
                Confirmation en cours...
              </h1>
              <p style={{ color: 'var(--text-medium)' }}>
                Veuillez patienter pendant que nous confirmons votre email.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>✅</div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--primary-orange)'
              }}>
                Email confirmé !
              </h1>
              <p style={{ 
                color: 'var(--text-medium)',
                lineHeight: '1.5',
                marginBottom: 'var(--spacing-lg)'
              }}>
                {message}
              </p>
              <p style={{ 
                color: 'var(--text-light)',
                fontSize: '0.9rem',
                marginBottom: 'var(--spacing-lg)'
              }}>
                Redirection automatique vers la page d'accueil...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>❌</div>
              <h1 style={{ 
                fontSize: '1.5rem', 
                marginBottom: 'var(--spacing-md)',
                color: 'var(--primary-orange)'
              }}>
                Erreur de confirmation
              </h1>
              <p style={{ 
                color: 'var(--text-medium)',
                lineHeight: '1.5',
                marginBottom: 'var(--spacing-lg)'
              }}>
                {message}
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
                <Link 
                  href="/signup"
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
                  Créer un compte
                </Link>
                <Link 
                  href="/login"
                  style={{
                    display: 'inline-block',
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    background: 'transparent',
                    color: 'var(--primary-orange)',
                    textDecoration: 'none',
                    borderRadius: 'var(--border-radius-medium)',
                    fontWeight: '600',
                    border: '2px solid var(--primary-orange)'
                  }}
                >
                  Se connecter
                </Link>
              </div>
            </>
          )}
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
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
