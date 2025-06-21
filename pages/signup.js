import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Signup() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to login page immediately
    router.replace('/login')
  }, [router])

  return (
    <div>
      <Head>
        <title>Redirection - COCO</title>
        <meta name="description" content="Redirection vers la page de connexion" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '48px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>⏳</div>
          <h1 style={{ 
            fontSize: '1.8rem',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            Redirection en cours...
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>
            Création de compte temporairement indisponible
          </p>
          <p style={{ color: '#6b7280' }}>
            Vous allez être redirigé vers la page de connexion
          </p>
        </div>
      </div>
    </div>
  )
}
