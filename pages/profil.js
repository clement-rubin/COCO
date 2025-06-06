import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction, logError, logInfo } from '../utils/logger'
import { getUserStatsCorrected } from '../utils/profileUtils'

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
    bio: '',
    location: '',
    website: '',
    date_of_birth: '',
    phone: '',
    is_private: false
  })
  const [activeTab, setActiveTab] = useState('info')

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
      let profileData = null
      if (profileResponse.ok) {
        profileData = await profileResponse.json()
        setProfile(profileData)
        setEditForm({
          display_name: profileData.display_name || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || '',
          date_of_birth: profileData.date_of_birth || '',
          phone: profileData.phone || '',
          is_private: profileData.is_private || false
        })
      }

      // Load user recipes using user_id instead of author
      let recipesData = []
      try {
        const recipesResponse = await fetch(`/api/recipes?user_id=${user.id}&limit=6`)
        if (recipesResponse.ok) {
          recipesData = await recipesResponse.json()
          // Ensure recipesData is an array
          setUserRecipes(Array.isArray(recipesData) ? recipesData : [])
          
          logInfo('User recipes loaded', {
            userId: user.id,
            recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
            recipesData: recipesData?.slice(0, 2)?.map(r => ({
              id: r.id,
              title: r.title,
              author: r.author,
              user_id: r.user_id,
              category: r.category
            }))
          })
        } else {
          logError('Failed to load user recipes', new Error(`HTTP ${recipesResponse.status}`), {
            userId: user.id,
            status: recipesResponse.status
          })
          setUserRecipes([])
        }
      } catch (recipesError) {
        logError('Failed to load user recipes', recipesError, {
          userId: user.id,
          error: recipesError.message
        })
        setUserRecipes([])
      }

      // Load user stats using the corrected utility function
      try {
        const statsData = await getUserStatsCorrected(user.id)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: statsData.likesReceived || 0,
          friendsCount: statsData.friendsCount || 0
        })
      } catch (statsError) {
        logError('Failed to load user stats', statsError)
        setUserStats({
          recipesCount: Array.isArray(recipesData) ? recipesData.length : 0,
          likesReceived: 0,
          friendsCount: 0
        })
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
          ...editForm
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
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid rgba(59, 130, 246, 0.2)',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px'
          }} />
          <p style={{ 
            color: '#1e40af', 
            fontSize: '1.1rem', 
            fontWeight: '600',
            margin: 0
          }}>
            Chargement de votre profil...
          </p>
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
        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)'
      }}>
        <div style={{ 
          textAlign: 'center',
          background: 'white',
          padding: '3rem 2rem',
          borderRadius: '20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          margin: '0 20px'
        }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '1.5rem',
            filter: 'grayscale(0.3)'
          }}>😓</div>
          <h2 style={{
            color: '#dc2626',
            fontSize: '1.3rem',
            fontWeight: '700',
            margin: '0 0 1rem 0'
          }}>
            Oups ! Une erreur s'est produite
          </h2>
          <p style={{
            color: '#7f1d1d',
            margin: '0 0 2rem 0',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button 
            onClick={loadUserProfile}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)'
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
      position: 'relative'
    }}>
      <Head>
        <title>Mon Profil - COCO</title>
        <meta name="description" content="Gérez votre profil sur COCO" />
      </Head>

      {/* Decorative Background Elements */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        right: '-5%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Enhanced Header */}
      <section style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        padding: '3rem 1rem 2rem',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Avatar with enhanced styling */}
        <div style={{
          position: 'relative',
          display: 'inline-block',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            color: 'white',
            fontSize: '4rem',
            fontWeight: 'bold',
            boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
            border: '6px solid white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '👤'}
            
            {/* Animated border */}
            <div style={{
              position: 'absolute',
              inset: '-6px',
              background: 'linear-gradient(45deg, #667eea, #764ba2, #667eea)',
              borderRadius: '50%',
              zIndex: -1,
              animation: 'rotate 3s linear infinite'
            }} />
          </div>
          
          {/* Online status indicator */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            width: '24px',
            height: '24px',
            background: '#10b981',
            borderRadius: '50%',
            border: '4px solid white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }} />
        </div>
        
        <h1 style={{ 
          fontSize: '2.2rem', 
          margin: '0 0 0.5rem 0',
          background: 'linear-gradient(135deg, #1f2937, #4b5563)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '800'
        }}>
          {profile?.display_name || user?.email || 'Utilisateur'}
        </h1>
        
        <p style={{ 
          color: '#6b7280', 
          fontSize: '1.1rem',
          margin: '0 0 2rem 0',
          fontStyle: 'italic',
          maxWidth: '300px',
          margin: '0 auto 2rem'
        }}>
          {profile?.bio || 'Passionné de cuisine et de partage 🍳'}
        </p>

        {/* Enhanced Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          {[{
            icon: '📝',
            value: userStats.recipesCount,
            label: 'Recette',
            color: '#3b82f6'
          },
          {
            icon: '❤️',
            value: userStats.likesReceived,
            label: 'Like',
            color: '#ef4444'
          },
          {
            icon: '👥',
            value: userStats.friendsCount,
            label: 'Ami',
            color: '#10b981'
          }].map((stat, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '1.5rem 1rem',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: `2px solid ${stat.color}20`,
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px)'
              e.target.style.boxShadow = `0 8px 30px ${stat.color}30`
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}
            >
              <div style={{ 
                fontSize: '2rem', 
                marginBottom: '0.5rem',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}>
                {stat.icon}
              </div>
              <div style={{ 
                fontSize: '1.8rem', 
                fontWeight: '800',
                color: stat.color,
                marginBottom: '0.25rem'
              }}>
                {stat.value}
              </div>
              <div style={{ 
                fontSize: '0.9rem',
                color: '#6b7280',
                fontWeight: '600'
              }}>
                {stat.label}{stat.value > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Content */}
      <section style={{
        background: 'white',
        minHeight: 'calc(100vh - 300px)',
        borderRadius: '30px 30px 0 0',
        marginTop: '-20px',
        padding: '2rem 1rem',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem',
          background: '#f8fafc',
          borderRadius: '16px',
          padding: '6px',
          maxWidth: '300px',
          margin: '0 auto 2rem'
        }}>
          {[{
            id: 'info',
            label: '👤 Profil',
            icon: '👤'
          },
          {
            id: 'recipes',
            label: '📝 Recettes',
            icon: '📝'
          },
          {
            id: 'settings',
            label: '⚙️ Paramètres',
            icon: '⚙️'
          }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                background: activeTab === tab.id 
                  ? 'white' 
                  : 'transparent',
                color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.id 
                  ? '0 2px 8px rgba(0, 0, 0, 0.1)' 
                  : 'none'
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label.split(' ')[1]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'info' && (
          <div style={{ 
            maxWidth: '500px', 
            margin: '0 auto',
            opacity: 1,
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#1f2937',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                Informations personnelles
              </h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: isEditing 
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: isEditing 
                    ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                    : '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                {isEditing ? '❌ Annuler' : '✏️ Modifier'}
              </button>
            </div>

            {isEditing ? (
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                border: '2px solid #e2e8f0',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
              }}>
                {/* Form fields with enhanced styling */}
                {[{
                  key: 'display_name',
                  label: 'Nom d\'affichage',
                  type: 'text',
                  icon: '👤'
                },
                {
                  key: 'bio',
                  label: 'Biographie',
                  type: 'textarea',
                  icon: '📝'
                },
                {
                  key: 'location',
                  label: 'Localisation',
                  type: 'text',
                  icon: '📍'
                },
                {
                  key: 'website',
                  label: 'Site web',
                  type: 'url',
                  icon: '🌐'
                },
                {
                  key: 'date_of_birth',
                  label: 'Date de naissance',
                  type: 'date',
                  icon: '🎂'
                },
                {
                  key: 'phone',
                  label: 'Téléphone',
                  type: 'tel',
                  icon: '📞'
                }].map((field) => (
                  <div key={field.key} style={{ marginBottom: '1.5rem' }}>
                    <label style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      <span>{field.icon}</span>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={editForm[field.key]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          minHeight: '100px',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.3s ease',
                          background: 'white'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        placeholder={`Votre ${field.label.toLowerCase()}...`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={editForm[field.key]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          transition: 'border-color 0.3s ease',
                          background: 'white'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                        placeholder={`Votre ${field.label.toLowerCase()}...`}
                      />
                    )}
                  </div>
                ))}

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    fontWeight: '600',
                    color: '#374151',
                    cursor: 'pointer',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.borderColor = '#3b82f6'}
                  onMouseLeave={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.is_private}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_private: e.target.checked }))}
                      style={{ 
                        transform: 'scale(1.3)',
                        accentColor: '#3b82f6'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '600' }}>🔒 Profil privé</div>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#6b7280',
                        marginTop: '4px'
                      }}>
                        Seuls vos amis pourront voir votre profil complet
                      </div>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSaveProfile}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    width: '100%',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  💾 Sauvegarder les modifications
                </button>
              </div>
            ) : (
              <div style={{
                background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                border: '2px solid #e2e8f0',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
              }}>
                {[{
                  label: 'Email',
                  value: user?.email,
                  icon: '✉️'
                },
                {
                  label: 'Nom',
                  value: profile?.display_name || 'Non défini',
                  icon: '👤'
                },
                {
                  label: 'Biographie',
                  value: profile?.bio || 'Aucune biographie',
                  icon: '📝'
                },
                {
                  label: 'Localisation',
                  value: profile?.location || 'Non définie',
                  icon: '📍'
                },
                {
                  label: 'Site web',
                  value: profile?.website,
                  icon: '🌐',
                  isLink: true
                },
                {
                  label: 'Date de naissance',
                  value: profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('fr-FR') : 'Non définie',
                  icon: '🎂'
                },
                {
                  label: 'Téléphone',
                  value: profile?.phone || 'Non défini',
                  icon: '📞'
                },
                {
                  label: 'Profil',
                  value: profile?.is_private ? 'Privé 🔒' : 'Public 🌍',
                  icon: '⚙️'
                },
                {
                  label: 'Membre depuis',
                  value: user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A',
                  icon: '📅'
                }].map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'white',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateX(0)'}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        {item.label}
                      </div>
                      <div style={{ 
                        color: '#6b7280',
                        fontSize: '0.95rem'
                      }}>
                        {item.isLink && item.value ? (
                          <a 
                            href={item.value} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: '#3b82f6',
                              textDecoration: 'none',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {item.value} 🔗
                          </a>
                        ) : (
                          item.value
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'recipes' && (
          <div style={{ 
            maxWidth: '600px', 
            margin: '0 auto',
            opacity: 1,
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{ 
                margin: 0, 
                color: '#1f2937',
                fontSize: '1.5rem',
                fontWeight: '700'
              }}>
                🍳 Mes créations ({userRecipes.length})
              </h2>
              {userRecipes.length > 0 && (
                <button
                  onClick={handleViewAllRecipes}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  📋 Voir toutes →
                </button>
              )}
            </div>

            {userRecipes.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '4rem 2rem',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                borderRadius: '24px',
                border: '3px dashed #f59e0b'
              }}>
                <div style={{ 
                  fontSize: '5rem', 
                  marginBottom: '1.5rem',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                }}>
                  👨‍🍳
                </div>
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#92400e',
                  margin: '0 0 1rem 0'
                }}>
                  Votre aventure culinaire commence ici !
                </h3>
                <p style={{
                  color: '#b45309',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  margin: '0 0 2rem 0',
                  maxWidth: '300px',
                  margin: '0 auto 2rem'
                }}>
                  Partagez vos créations, inspirez la communauté et devenez une star de la cuisine !
                </p>
                <button
                  onClick={() => router.push('/share-photo')}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-4px) scale(1.05)'
                    e.target.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)'
                    e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)'
                  }}
                >
                  📸 Créer ma première recette
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {userRecipes.map((recipe) => (
                  <div 
                    key={recipe.id} 
                    style={{
                      background: 'white',
                      border: '2px solid #f1f5f9',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      position: 'relative'
                    }}
                    onClick={() => router.push(`/recipe/${recipe.id}`)}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-8px) scale(1.02)'
                      e.target.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)'
                      e.target.style.borderColor = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0) scale(1)'
                      e.target.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)'
                      e.target.style.borderColor = '#f1f5f9'
                    }}
                  >
                    {/* Recipe Image/Icon */}
                    <div style={{
                      height: '160px',
                      background: recipe.category === 'Photo partagée' 
                        ? 'linear-gradient(135deg, #ec4899, #be185d)'
                        : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {recipe.category === 'Photo partagée' ? '📸' : '🍽️'}
                      
                      {/* Animated background pattern */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.1,
                        background: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                        animation: 'float 6s ease-in-out infinite'
                      }} />
                    </div>
                    
                    {/* Recipe Info */}
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ 
                        margin: '0 0 0.75rem 0', 
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: '#1f2937',
                        lineHeight: '1.3'
                      }}>
                        {recipe.title}
                      </h3>
                      <p style={{ 
                        margin: 0, 
                        color: '#6b7280', 
                        fontSize: '0.95rem',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {recipe.description || recipe.category}
                      </p>
                      
                      {/* Category badge */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {recipe.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ 
            maxWidth: '500px', 
            margin: '0 auto',
            opacity: 1,
            animation: 'fadeIn 0.5s ease'
          }}>
            <h2 style={{ 
              margin: '0 0 2rem 0', 
              color: '#1f2937',
              fontSize: '1.5rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              ⚙️ Paramètres du compte
            </h2>
            
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
              border: '2px solid #fca5a5',
              borderRadius: '20px',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
              <h3 style={{ 
                color: '#dc2626', 
                margin: '0 0 1rem 0',
                fontSize: '1.2rem',
                fontWeight: '700'
              }}>
                Section en construction
              </h3>
              <p style={{ 
                color: '#991b1b', 
                margin: 0,
                lineHeight: '1.5'
              }}>
                Les paramètres avancés arrivent bientôt ! En attendant, vous pouvez modifier vos informations dans l'onglet Profil.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Enhanced Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .profile-header {
            padding: 2rem 1rem 1.5rem !important;
          }
          
          .profile-avatar {
            width: 120px !important;
            height: 120px !important;
            fontSize: 3rem !important;
          }
          
          .profile-title {
            fontSize: 1.8rem !important;
          }
          
          .stats-grid {
            gap: 1rem !important;
          }
          
          .recipe-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
            gap: 1rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
            max-width: 200px !important;
          }
          
          .tab-navigation {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .recipe-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
