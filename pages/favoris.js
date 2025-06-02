import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Favoris() {
  const router = useRouter();

  const [favorites, setFavorites] = useState([
    { id: 1, name: 'Pâtes Carbonara', time: '20 min', rating: 4.8, emoji: '🍝', dateAdded: '2024-01-15' },
    { id: 3, name: 'Tiramisu', time: '45 min', rating: 4.9, emoji: '🍰', dateAdded: '2024-01-10' },
    { id: 5, name: 'Risotto aux champignons', time: '35 min', rating: 4.7, emoji: '🍚', dateAdded: '2024-01-08' }
  ]);

  const removeFavorite = (id) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div>
      <Head>
        <title>Mes Favoris - COCO</title>
        <meta name="description" content="Vos recettes favorites sur COCO" />
      </Head>

      {/* Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-xl) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: 'var(--spacing-md)'
        }}>❤️</div>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--text-dark)'
        }}>
          Mes Favoris
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          margin: 0
        }}>
          {favorites.length} recette{favorites.length > 1 ? 's' : ''} sauvegardée{favorites.length > 1 ? 's' : ''}
        </p>
      </section>

      {favorites.length === 0 ? (
        /* Empty State */
        <section style={{ 
          padding: 'var(--spacing-xl)', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>💔</div>
          <h2 style={{ 
            fontSize: '1.3rem', 
            marginBottom: 'var(--spacing-md)',
            color: 'var(--text-medium)'
          }}>
            Aucun favori pour le moment
          </h2>
          <p style={{ 
            color: 'var(--text-secondary)', 
            marginBottom: 'var(--spacing-lg)',
            lineHeight: '1.5'
          }}>
            Explorez nos recettes et ajoutez vos préférées à vos favoris en tapant sur le cœur !
          </p>
          <button 
            className="card"
            onClick={() => router.push('/explorer')}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary-coral) 0%, var(--primary-coral-dark) 100%)',
              color: 'white',
              padding: 'var(--spacing-md) var(--spacing-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              fontWeight: '600'
            }}
          >
            <span>🔍</span>
            Explorer les recettes
          </button>
        </section>
      ) : (
        /* Favorites List */
        <section style={{ padding: 'var(--spacing-lg) var(--spacing-md) var(--spacing-xl)' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 'var(--spacing-md)' 
          }}>
            {favorites.map(recipe => (
              <div key={recipe.id} className="card" style={{ 
                padding: 'var(--spacing-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(45deg, var(--primary-coral-light), var(--secondary-mint-light))',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  flexShrink: 0
                }}>
                  {recipe.emoji}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    marginBottom: 'var(--spacing-xs)',
                    margin: '0 0 var(--spacing-xs) 0'
                  }}>
                    {recipe.name}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-xs)',
                    fontSize: '0.8rem'
                  }}>
                    <span style={{ color: 'var(--text-medium)' }}>⏱️ {recipe.time}</span>
                    <span style={{ color: 'var(--text-light)' }}>⭐ {recipe.rating}</span>
                  </div>
                  <p style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-light)',
                    margin: 0
                  }}>
                    Ajouté le {formatDate(recipe.dateAdded)}
                  </p>
                </div>
                
                <button
                  onClick={() => removeFavorite(recipe.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    padding: 'var(--spacing-sm)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'var(--bg-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                  }}
                >
                  💔
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
