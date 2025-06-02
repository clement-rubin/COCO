import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    router.push('/submit-recipe')
  }

  return (
    <div style={{ background: '#000', minHeight: '100vh', overflow: 'hidden' }}>
      <Head>
        <title>COCO - Cuisine Addictive</title>
        <meta name="description" content="Découvrez et partagez les meilleures recettes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Bouton de partage rapide flottant - plus discret */}
      <button
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
          color: 'white',
          border: 'none',
          fontSize: '1.4rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)',
          transform: 'scale(1)',
          transition: 'all 0.2s ease',
          opacity: 0.9
        }}
        onMouseDown={(e) => {
          e.target.style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          e.target.style.transform = 'scale(1)'
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1'
          e.target.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.9'
          e.target.style.transform = 'scale(1)'
        }}
      >
        ➕
      </button>

      {/* Feed Principal Addictif - Plein écran */}
      <AddictiveFeed />
    </div>
  )
}
