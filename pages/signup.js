import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { handleAuthError } from '../utils/errorHandler'
import { logError } from '../utils/logger'
import { createOrUpdateProfile, supabase } from '../lib/supabase'
import ErrorDisplay from '../components/ErrorDisplay'

export default function Signup() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const resetError = () => setError(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    // Validation côté client
    if (!email || !password || !displayName) {
      setError({
        message: 'Tous les champs sont requis',
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      setLoading(false)
      return
    }
    
    if (password.length < 6) {
      setError({
        message: 'Le mot de passe doit contenir au moins 6 caractères',
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      setLoading(false)
      return
    }
    
    if (displayName.length < 2 || displayName.length > 30) {
      setError({
        message: 'Le nom d\'utilisateur doit contenir entre 2 et 30 caractères',
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      setLoading(false)
      return
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError({
        message: 'Veuillez entrer une adresse email valide',
        type: 'validation_error',
        recoveryStrategy: 'retry'
      })
      setLoading(false)
      return
    }

    try {
      // Appel à Supabase Auth pour créer l'utilisateur
      const { data, error: signUpError } = await signUp(email, password, displayName)
      
      if (signUpError) {
        // Gérer les erreurs spécifiques
        let errorMessage = signUpError.message || 'Erreur lors de la création du compte'
        let errorType = 'server_error'
        
        if (signUpError.message?.includes('already registered')) {
          errorMessage = 'Cette adresse email est déjà utilisée'
          errorType = 'duplicate_email'
        } else if (signUpError.message?.includes('Invalid email')) {
          errorMessage = 'Adresse email invalide'
          errorType = 'validation_error'
        } else if (signUpError.message?.includes('Password')) {
          errorMessage = 'Le mot de passe ne respecte pas les critères requis'
          errorType = 'validation_error'
        }
        
        setError({
          message: errorMessage,
          type: errorType,
          recoveryStrategy: 'retry'
        })
        setLoading(false)
        return
      }

      // Succès - L'email de vérification a été envoyé automatiquement par Supabase
      setSuccess({
        title: 'Compte créé avec succès !',
        message: `Un email de vérification a été envoyé à ${email}. Veuillez vérifier votre boîte mail et cliquer sur le lien pour activer votre compte.`,
        email: email
      })
      setLoading(false)
      
      // Redirection vers la page de confirmation après 3 secondes
      setTimeout(() => {
        router.push('/auth/confirm')
      }, 3000)
      
    } catch (err) {
      setError({
        message: 'Une erreur inattendue est survenue',
        type: 'unknown_error',
        recoveryStrategy: 'retry'
      })
      setLoading(false)
    }
  }

  // Si l'inscription a réussi, afficher la page de succès
  if (success) {
    return (
      <div>
        <Head>
          <title>Inscription réussie - COCO</title>
          <meta name="description" content="Votre compte COCO a été créé avec succès" />
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
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ 
              fontSize: '4rem', 
              marginBottom: '24px',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))'
            }}>
              ✅
            </div>
            
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '16px',
              letterSpacing: '-0.5px'
            }}>
              {success.title}
            </h1>
            
            <p style={{ 
              color: '#6b7280',
              fontSize: '1.1rem',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              {success.message}
            </p>
            
            <div style={{ 
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '32px'
            }}>
              <p style={{ 
                color: '#ff6b6b',
                fontSize: '0.9rem',
                margin: 0,
                fontWeight: '500'
              }}>
                💡 N'oubliez pas de vérifier vos spams si vous ne trouvez pas l'email
              </p>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px'
            }}>
              <Link 
                href="/auth/confirm"
                style={{
                  display: 'inline-block',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '16px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: '0 8px 20px rgba(255, 107, 107, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 12px 25px rgba(255, 107, 107, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 8px 20px rgba(255, 107, 107, 0.3)'
                }}
              >
                Continuer
              </Link>
              
              <Link 
                href="/login"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Création de compte - COCO</title>
        <meta name="description" content="Inscrivez-vous et créez votre compte COCO" />
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
              Créez votre compte
            </h1>
            <p style={{ 
              color: '#6b7280',
              fontSize: '1rem',
              margin: 0
            }}>
              Rejoignez la communauté culinaire COCO
            </p>
          </div>

          {error && (
            <div style={{ marginBottom: '32px' }}>
              <ErrorDisplay error={error} resetError={resetError} email={email} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Display Name Field */}
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
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                placeholder="Votre nom d'utilisateur"
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
              disabled={loading || !email || !password || !displayName}
              style={{
                width: '100%',
                padding: '18px',
                background: loading || !email || !password || !displayName
                  ? '#d1d5db' 
                  : 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: loading || !email || !password || !displayName ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transform: loading ? 'scale(0.98)' : 'scale(1)',
                boxShadow: loading || !email || !password || !displayName
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

          {/* Links */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '32px',
            padding: '20px 0',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.95rem'
          }}>
            <span style={{ color: '#6b7280' }}>
              Vous avez déjà un compte ?{' '}
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
