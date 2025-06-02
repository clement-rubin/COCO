import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import FriendsFeed from '../components/FriendsFeed'
import { useAuth } from '../components/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [feedType, setFeedType] = useState('friends')

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    router.push('/submit-recipe')
  }

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, var(--warm-cream) 0%, white 100%)', 
      minHeight: '100vh',
      paddingTop: '80px' // Pour la navbar
    }}>
      <Head>
        <title>COCO - Photos de tes Amis</title>
        <meta name="description" content="Découvre les dernières créations culinaires de tes amis" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header de la page d'accueil */}
      <div style={{
        textAlign: 'center',
        padding: 'var(--spacing-xl) var(--spacing-md) var(--spacing-lg)',
        background: 'white',
        marginBottom: 'var(--spacing-lg)',
        boxShadow: '0 2px 10px rgba(255, 107, 53, 0.1)'
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.2rem',
          color: 'var(--primary-orange)',
          margin: '0 0 var(--spacing-sm) 0'
        }}>
          🍽️ Tes Amis Cuisinent
        </h1>
        <p style={{
          color: 'var(--text-medium)',
          fontSize: '1.1rem',
          margin: '0 0 var(--spacing-md) 0'
        }}>
          Découvre les délicieuses créations de tes amis
        </p>
        
        {/* Filtres de feed */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setFeedType('friends')}
            style={{
              background: feedType === 'friends' 
                ? 'linear-gradient(135deg, var(--primary-orange), var(--primary-orange-dark))' 
                : 'var(--background-light)',
              color: feedType === 'friends' ? 'white' : 'var(--text-medium)',
              border: `1px solid ${feedType === 'friends' ? 'var(--primary-orange)' : 'rgba(255, 107, 53, 0.2)'}`,
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius-medium)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            👥 Amis proches
          </button>
          <button
            onClick={() => setFeedType('recent')}
            style={{
              background: feedType === 'recent' 
                ? 'linear-gradient(135deg, var(--secondary-green), var(--secondary-green-light))' 
                : 'var(--background-light)',
              color: feedType === 'recent' ? 'white' : 'var(--text-medium)',
              border: `1px solid ${feedType === 'recent' ? 'var(--secondary-green)' : 'rgba(255, 107, 53, 0.2)'}`,
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius-medium)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            🕒 Récentes
          </button>
          <button
            onClick={() => setFeedType('popular')}
            style={{
              background: feedType === 'popular' 
                ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                : 'var(--background-light)',
              color: feedType === 'popular' ? 'white' : 'var(--text-medium)',
              border: `1px solid ${feedType === 'popular' ? '#FFD700' : 'rgba(255, 107, 53, 0.2)'}`,
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius-medium)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            🔥 Populaires
          </button>
        </div>
      </div>

      {/* Bouton de partage rapide */}
      <button
        onClick={handleQuickShare}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(45deg, var(--primary-orange), var(--primary-orange-dark))',
          color: 'white',
          border: 'none',
          fontSize: '1.5rem',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 6px 20px rgba(255, 107, 53, 0.4)',
          transform: 'scale(1)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)'
          e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)'
        }}
        title="Partager une recette"
      >
        📸
      </button>

      {/* Feed des amis */}
      <FriendsFeed feedType={feedType} />
    </div>
  )
}
