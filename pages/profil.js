import Head from 'next/head'
import { useState } from 'react'

export default function Profil() {
  const [user, setUser] = useState({
    name: 'Chef Dupont',
    email: 'chef.dupont@example.com',
    avatar: '👨‍🍳',
    joinDate: '2023-06-15',
    bio: 'Passionné de cuisine depuis 15 ans. J\'adore partager mes recettes familiales et découvrir de nouvelles saveurs !',
    stats: {
      recipesCreated: 12,
      recipesLiked: 89,
      followers: 234,
      following: 67
    }
  });

  const [activeTab, setActiveTab] = useState('stats');

  const userRecipes = [
    { id: 1, name: 'Ma Bolognaise secrète', likes: 156, emoji: '🍝' },
    { id: 2, name: 'Tarte tatin de grand-mère', likes: 89, emoji: '🥧' },
    { id: 3, name: 'Soupe de légumes réconfortante', likes: 67, emoji: '🍲' }
  ];

  const achievements = [
    { id: 1, title: 'Premier pas', description: 'Première recette publiée', emoji: '🏆', unlocked: true },
    { id: 2, title: 'Chef populaire', description: '100 likes reçus', emoji: '⭐', unlocked: true },
    { id: 3, title: 'Gourmand', description: '50 recettes aimées', emoji: '❤️', unlocked: true },
    { id: 4, title: 'Maître cuisinier', description: '10 recettes publiées', emoji: '👑', unlocked: true },
    { id: 5, title: 'Influenceur', description: '500 likes reçus', emoji: '🌟', unlocked: false }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

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
          background: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          margin: '0 auto var(--spacing-md)',
          boxShadow: 'var(--shadow)'
        }}>
          {user.avatar}
        </div>
        
        <h1 style={{ 
          fontSize: '1.5rem', 
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--text-dark)'
        }}>
          {user.name}
        </h1>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          marginBottom: 'var(--spacing-sm)'
        }}>
          Membre depuis {formatDate(user.joinDate)}
        </p>

        <p style={{ 
          color: 'var(--text-medium)', 
          fontSize: '0.9rem',
          lineHeight: '1.5',
          margin: '0 auto',
          maxWidth: '300px'
        }}>
          {user.bio}
        </p>
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
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-coral)' }}>
              {user.stats.recipesCreated}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Recettes</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>❤️</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--secondary-mint)' }}>
              {user.stats.recipesLiked}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Likes</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>👥</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-yellow)' }}>
              {user.stats.followers}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>Abonnés</div>
          </div>
          
          <div className="card" style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>👤</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
              {user.stats.following}
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
