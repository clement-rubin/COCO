import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'

export default function Profil() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/profil'))
    }
  }, [user, router])

  const [userProfile, setUserProfile] = useState({
    name: user?.user_metadata?.display_name || 'Chef Anonyme',
    email: user?.email || '',
    avatar: user?.user_metadata?.display_name ? 
      user.user_metadata.display_name.charAt(0).toUpperCase() : '👨‍🍳',
    joinDate: user?.created_at || '2023-06-15',
    bio: user?.user_metadata?.bio || 'Passionné de cuisine et membre de la communauté COCO !',
    stats: {
      recipesCreated: 0,
      recipesLiked: 0,
      followers: 0,
      following: 0
    }
  });

  const [activeTab, setActiveTab] = useState('stats');

  // Mock data - à remplacer par de vraies données
  const userRecipes = [
    { id: 1, name: 'Ma première recette COCO', likes: 12, emoji: '🍝' },
    { id: 2, name: 'Dessert du dimanche', likes: 8, emoji: '🥧' },
  ];

  const achievements = [
    { id: 1, title: 'Bienvenue !', description: 'Compte créé avec succès', emoji: '🎉', unlocked: true },
    { id: 2, title: 'Premier partage', description: 'Première recette publiée', emoji: '📝', unlocked: false },
    { id: 3, title: 'Chef populaire', description: '10 likes reçus', emoji: '⭐', unlocked: false },
    { id: 4, title: 'Gourmand', description: '5 recettes aimées', emoji: '❤️', unlocked: false },
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-gradient)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>🔄</div>
          <p style={{ color: 'var(--text-medium)' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Head>
        <title>Mon Profil - COCO</title>
        <meta name="description" content="Votre profil et statistiques sur COCO" />
      </Head>

      {/* Profile Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, var(--primary-orange) 0%, var(--primary-orange-dark) 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          color: 'white',
          fontWeight: 'bold',
          margin: '0 auto var(--spacing-md)',
          boxShadow: 'var(--shadow-medium)'
        }}>
          {userProfile.avatar}
        </div>
        
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--text-dark)'
        }}>
          {userProfile.name}
        </h1>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          marginBottom: 'var(--spacing-sm)'
        }}>
          {userProfile.email}
        </p>

        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.8rem',
          marginBottom: 'var(--spacing-sm)'
        }}>
          Membre depuis {formatDate(userProfile.joinDate)}
        </p>

        <p style={{ 
          color: 'var(--text-medium)', 
          fontSize: '0.9rem',
          lineHeight: '1.5',
          margin: '0 auto var(--spacing-lg)',
          maxWidth: '300px'
        }}>
          {userProfile.bio}
        </p>

        <button
          onClick={handleSignOut}
          style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: 'var(--border-radius-medium)',
            color: 'var(--text-dark)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          🚪 Se déconnecter
        </button>
      </section>

      {/* Stats Cards */}
      <section style={{ padding: 'var(--spacing-lg) var(--spacing-md)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--spacing-sm)'
        }}>
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>📝</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-orange)' }}>
              {userProfile.stats.recipesCreated}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Recettes</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>❤️</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary-mint)' }}>
              {userProfile.stats.recipesLiked}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Likes</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>👥</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-yellow)' }}>
              {userProfile.stats.followers}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Abonnés</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>👤</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
              {userProfile.stats.following}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Suivis</div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section style={{ padding: '0 var(--spacing-md)' }}>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          {[
            { id: 'stats', label: 'Mes recettes', icon: '📝' },
            { id: 'achievements', label: 'Succès', icon: '🏆' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: activeTab === tab.id 
                  ? 'var(--primary-coral)' 
                  : 'var(--bg-light)',
                color: activeTab === tab.id 
                  ? 'white' 
                  : 'var(--text-medium)',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-xs)'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tab Content */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {userRecipes.map(recipe => (
              <div key={recipe.id} className="card" style={{ 
                padding: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(45deg, var(--primary-coral-light), var(--secondary-mint-light))',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {recipe.emoji}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    marginBottom: 'var(--spacing-xs)',
                    margin: '0 0 var(--spacing-xs) 0'
                  }}>
                    {recipe.name}
                  </h3>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    margin: 0
                  }}>
                    ❤️ {recipe.likes} likes
                  </p>
                </div>
                
                <button style={{
                  background: 'var(--bg-light)',
                  border: 'none',
                  padding: 'var(--spacing-sm)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}>
                  ⋯
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {achievements.map(achievement => (
              <div 
                key={achievement.id} 
                className="card" 
                style={{ 
                  padding: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  opacity: achievement.unlocked ? 1 : 0.5
                }}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: achievement.unlocked 
                    ? 'linear-gradient(45deg, var(--accent-yellow), var(--accent-yellow-dark))' 
                    : 'var(--bg-light)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {achievement.emoji}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '1rem', 
                    marginBottom: 'var(--spacing-xs)',
                    margin: '0 0 var(--spacing-xs) 0'
                  }}>
                    {achievement.title}
                  </h3>
                  <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    margin: 0
                  }}>
                    {achievement.description}
                  </p>
                </div>
                
                {achievement.unlocked && (
                  <div style={{
                    color: 'var(--secondary-mint)',
                    fontSize: '1.2rem'
                  }}>
                    ✅
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
