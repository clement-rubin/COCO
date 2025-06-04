import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logError, logInfo } from '../utils/logger'

export default function Profil() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userRecipes, setUserRecipes] = useState([])
  const [userStats, setUserStats] = useState({
    recipesCount: 0,
    likesReceived: 0,
    friendsCount: 0
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: ''
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      logUserInteraction('REDIRECT_TO_LOGIN', 'profil', {
        reason: 'user_not_authenticated',
        targetPage: '/profil'
      })
      router.push('/login?redirect=' + encodeURIComponent('/profil'))
      return
    }

    if (user) {
      loadUserProfile()
    }
  }, [user, authLoading, router])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load user profile
      const profileResponse = await fetch(`/api/profile?user_id=${user.id}`)
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData)
        setEditForm({
          display_name: profileData.display_name || '',
          bio: profileData.bio || ''
        })
      }

      // Load user recipes with proper error handling
      try {
        const recipesResponse = await fetch(`/api/recipes?user_id=${user.id}&limit=6`)
        if (recipesResponse.ok) {
          const recipesData = await recipesResponse.json()
          // Ensure recipesData is an array
          setUserRecipes(Array.isArray(recipesData) ? recipesData : [])
        } else {
          setUserRecipes([])
        }
      } catch (recipesError) {
        logError('Failed to load user recipes', recipesError)
        setUserRecipes([])
      }

      // Load user stats
      try {
        const statsResponse = await fetch(`/api/user-stats?user_id=${user.id}`)
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setUserStats({
            recipesCount: statsData.recipesCount || 0,
            likesReceived: statsData.likesReceived || 0,
            friendsCount: statsData.friendsCount || 0
          })
        }
      } catch (statsError) {
        logError('Failed to load user stats', statsError)
      }

      logInfo('User profile loaded successfully', {
        userId: user.id,
        hasProfile: !!profileData,
        recipesCount: Array.isArray(recipesData) ? recipesData.length : 0
      })

    } catch (error) {
      logError('Failed to load user profile', error)
      setError('Impossible de charger votre profil. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          display_name: editForm.display_name,
          bio: editForm.bio
        })
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        setIsEditing(false)
        logUserInteraction('UPDATE_PROFILE', 'profil-form', {
          userId: user.id
        })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      logError('Failed to save profile', error)
      setError('Impossible de sauvegarder le profil. Veuillez réessayer.')
    }
  }

  const handleViewAllRecipes = () => {
    router.push('/mes-recettes')
  }

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <p>Chargement de votre profil...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😓</div>
          <p>{error}</p>
          <button 
            onClick={loadUserProfile}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Head>
        <title>Mon Profil - COCO</title>
        <meta name="description" content="Gérez votre profil sur COCO" />
      </Head>

      {/* Header */}
      <section style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '2rem 1rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          color: 'white',
          fontSize: '3rem',
          fontWeight: 'bold'
        }}>
          {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '👤'}
        </div>
        
        <h1 style={{ 
          fontSize: '1.8rem', 
          margin: '0 0 0.5rem 0',
          color: 'white',
          fontWeight: '600'
        }}>
          {profile?.display_name || user?.email || 'Utilisateur'}
        </h1>
        
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '1rem',
          margin: '0 0 1rem 0'
        }}>
          {profile?.bio || 'Aucune biographie'}
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          marginTop: '1rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '0.5rem 1rem',
            borderRadius: '1rem'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem' }}>
              📝 {userStats.recipesCount} recette{userStats.recipesCount > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '0.5rem 1rem',
            borderRadius: '1rem'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem' }}>
              ❤️ {userStats.likesReceived} like{userStats.likesReceived > 1 ? 's' : ''}
            </span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '0.5rem 1rem',
            borderRadius: '1rem'
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem' }}>
              👥 {userStats.friendsCount} ami{userStats.friendsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section style={{
        background: 'white',
        minHeight: 'calc(100vh - 200px)',
        borderRadius: '1rem 1rem 0 0',
        padding: '2rem 1rem'
      }}>
        {/* Profile Edit */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>Informations personnelles</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: isEditing ? '#ef4444' : '#667eea',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isEditing ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          {isEditing ? (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Nom d'affichage
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Votre nom d'affichage"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Biographie
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  placeholder="Parlez-nous de vous..."
                />
              </div>

              <button
                onClick={handleSaveProfile}
                style={{
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                Sauvegarder
              </button>
            </div>
          ) : (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem'
            }}>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Nom:</strong> {profile?.display_name || 'Non défini'}</p>
              <p><strong>Biographie:</strong> {profile?.bio || 'Aucune biographie'}</p>
              <p><strong>Membre depuis:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
            </div>
          )}
        </div>

        {/* User Recipes */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>
              Mes recettes ({userRecipes.length})
            </h2>
            {userRecipes.length > 0 && (
              <button
                onClick={handleViewAllRecipes}
                style={{
                  background: 'transparent',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Voir toutes →
              </button>
            )}
          </div>

          {userRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
              <p>Vous n'avez pas encore créé de recettes</p>
              <button
                onClick={() => router.push('/share-photo')}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Créer ma première recette
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {userRecipes.map((recipe) => (
                <div 
                  key={recipe.id} 
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    cursor: 'pointer'
                  }}
                  onClick={() => router.push(`/recipe/${recipe.id}`)}
                >
                  <div style={{
                    height: '120px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}>
                    {recipe.category === 'Photo partagée' ? '📸' : '🍽️'}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                      {recipe.title}
                    </h3>
                    <p style={{ 
                      margin: 0, 
                      color: '#6b7280', 
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {recipe.description || recipe.category}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
