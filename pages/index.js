import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import FriendsFeed from '../components/FriendsFeed'
import AddictiveFeed from '../components/AddictiveFeed'
import { useAuth } from '../components/AuthContext'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const [feedType, setFeedType] = useState('featured')
  const [viewMode, setViewMode] = useState('stories')
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const heroRef = useRef(null)

  // Détection du scroll simplifiée
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleQuickShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    router.push('/submit-recipe')
  }

  const handlePhotoShare = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/share-photo'))
      return
    }
    router.push('/share-photo')
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'stories' ? 'vertical' : 'stories')
  }

  const categories = [
    { id: 'featured', icon: '⭐', label: 'En vedette' },
    { id: 'recent', icon: '🕒', label: 'Récent' },
    { id: 'trending', icon: '🔥', label: 'Tendance' }
  ]

  return (
    <div style={{
      background: 'var(--warm-white)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <Head>
        <title>COCO - Cuisine, Découverte, Partage</title>
        <meta name="description" content="Découvrez des recettes inspirantes et partagez vos créations culinaires" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Header simplifié */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: isScrolled ? 'white' : 'transparent',
        zIndex: 1000,
        padding: '1rem',
        transition: 'all 0.3s ease',
        borderBottom: isScrolled ? '1px solid #eee' : 'none',
        boxShadow: isScrolled ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--spacing-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'var(--primary-orange)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
            }}>
              🍳
            </div>
            {user && (
              <span style={{ 
                fontWeight: '600', 
                fontSize: '0.85rem',
                color: 'var(--text-primary)'
              }}>
                Bonjour, {user.user_metadata?.display_name?.split(' ')[0] || 'Chef'}
              </span>
            )}
          </div>

          <button
            onClick={toggleViewMode}
            style={{
              background: viewMode === 'vertical' ? 'var(--primary-orange)' : '#f2f2f2',
              color: viewMode === 'vertical' ? 'white' : 'var(--text-primary)',
              border: 'none',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {viewMode === 'stories' ? 'Mode Défilement' : 'Mode Stories'}
          </button>
        </div>
      </div>

      {/* Hero Section simplifiée */}
      <div ref={heroRef} style={{
        paddingTop: '80px',
        background: 'var(--primary-orange)',
        color: 'white',
        position: 'relative',
        paddingBottom: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: 'var(--spacing-lg) var(--spacing-lg)',
          textAlign: 'center',
          position: 'relative'
        }}>
          <h1 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            margin: '0 0 var(--spacing-sm) 0',
            lineHeight: '1.2'
          }}>
            Cuisine. Inspiration.<br/>Découverte.
          </h1>
          
          <p style={{
            fontSize: '0.95rem',
            margin: '0 0 var(--spacing-lg) 0',
            maxWidth: '280px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Des recettes qui correspondent à votre goût
          </p>

          {/* Filtres simplifiés */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setFeedType(category.id)}
                style={{
                  background: feedType === category.id
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease'
                }}
              >
                <span style={{ marginRight: '0.25rem' }}>{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu principal simplifié */}
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        padding: 'var(--spacing-md) var(--spacing-sm)',
        background: 'white',
        borderRadius: '16px -16px 0 0',
        marginTop: '-16px'
      }}>
        <div>
          {viewMode === 'stories' ? (
            <FriendsFeed feedType={feedType} />
          ) : (
            <AddictiveFeed />
          )}
        </div>
      </div>

      {/* Bouton de partage simplifié */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000,
      }}>
        <button
          onClick={handlePhotoShare}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'var(--secondary-mint, #36b37e)',
            color: 'white',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(54, 179, 126, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          title="Partager une photo rapide"
        >
          <span>📷</span>
        </button>
        
        <button
          onClick={handleQuickShare}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'var(--primary-orange)',
            color: 'white',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(255, 107, 53, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          title="Partager une recette"
        >
          <span>📝</span>
        </button>
      </div>

      <style jsx>{`
        html {
          scroll-behavior: smooth;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  )
}
