import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthContext'
import { useRouter } from 'next/router'

export default function Profil() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userStats, setUserStats] = useState({
    recipesCount: 0,
    followersCount: 0,
    followingCount: 0
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--background-light)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
          <p>Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: 'var(--background-light)' }}>
      <Head>
        <title>Mon Profil - COCO</title>
        <meta name="description" content="Gérez votre profil culinaire COCO" />
      </Head>

      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--spacing-lg)'
      }}>
        {/* Header du profil */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-large)',
          padding: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-light)'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-orange), var(--secondary-green))',
            margin: '0 auto var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            color: 'white'
          }}>
            {user.user_metadata?.display_name?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          
          <h1 style={{
            color: 'var(--primary-orange)',
            marginBottom: 'var(--spacing-sm)'
          }}>
            {user.user_metadata?.display_name || 'Chef COCO'}
          </h1>
          
          <p style={{
            color: 'var(--text-medium)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            {user.email}
          </p>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-md)',
            marginTop: 'var(--spacing-lg)'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-orange)' }}>
                {userStats.recipesCount}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                Recettes
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-orange)' }}>
                {userStats.followersCount}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                Followers
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-orange)' }}>
                {userStats.followingCount}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                Suivi(e)s
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--border-radius-large)',
          padding: 'var(--spacing-lg)',
          boxShadow: 'var(--shadow-light)'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-dark)'
          }}>
            Mon activité
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <button
              onClick={() => router.push('/mes-recettes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'transparent',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--border-radius-medium)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>📝</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>
                  Mes recettes
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                  Gérer mes créations culinaires
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/favoris')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'transparent',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--border-radius-medium)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>👥</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>
                  Mes amis
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                  Gérer mon réseau culinaire
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
