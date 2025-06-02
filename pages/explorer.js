import Head from 'next/head'
import { useState } from 'react'

export default function Explorer() {
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = ['Tous', 'Pâtes', 'Salades', 'Desserts', 'Soupes', 'Plats principaux', 'Entrées'];

  const recipes = [
    { id: 1, name: 'Pâtes Carbonara', category: 'Pâtes', time: '20 min', rating: 4.8, emoji: '🍝', difficulty: 'Facile' },
    { id: 2, name: 'Salade César', category: 'Salades', time: '15 min', rating: 4.6, emoji: '🥗', difficulty: 'Facile' },
    { id: 3, name: 'Tiramisu', category: 'Desserts', time: '45 min', rating: 4.9, emoji: '🍰', difficulty: 'Moyen' },
    { id: 4, name: 'Soupe à l\'oignon', category: 'Soupes', time: '30 min', rating: 4.4, emoji: '🍲', difficulty: 'Facile' },
    { id: 5, name: 'Risotto aux champignons', category: 'Plats principaux', time: '35 min', rating: 4.7, emoji: '🍚', difficulty: 'Moyen' },
    { id: 6, name: 'Bruschetta', category: 'Entrées', time: '10 min', rating: 4.3, emoji: '🥖', difficulty: 'Facile' },
    { id: 7, name: 'Pâtes Bolognaise', category: 'Pâtes', time: '40 min', rating: 4.8, emoji: '🍝', difficulty: 'Moyen' },
    { id: 8, name: 'Tarte aux pommes', category: 'Desserts', time: '60 min', rating: 4.5, emoji: '🥧', difficulty: 'Difficile' }
  ];

  // Safe filtering with null checks
  const filteredRecipes = recipes.filter(recipe => {
    if (!recipe) return false;
    
    const matchesFilter = activeFilter === 'Tous' || recipe.category === activeFilter;
    const matchesSearch = recipe.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false;
    return matchesFilter && matchesSearch;
  });

  // Ensure filteredRecipes is always an array
  const safeFilteredRecipes = Array.isArray(filteredRecipes) ? filteredRecipes : [];

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Facile': return 'var(--secondary-mint)';
      case 'Moyen': return 'var(--accent-yellow)';
      case 'Difficile': return 'var(--primary-coral)';
      default: return 'var(--text-light)';
    }
  };

  return (
    <div>
      <Head>
        <title>Explorer - COCO</title>
        <meta name="description" content="Explorez toutes les recettes de COCO" />
      </Head>

      {/* Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-lg) var(--spacing-md)',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: 'var(--spacing-md)',
          color: 'var(--text-dark)'
        }}>
          Explorer les recettes
        </h1>
        
        {/* Search Bar */}
        <div style={{ 
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          boxShadow: 'var(--shadow)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '1rem',
              background: 'transparent'
            }}
          />
        </div>
      </section>

      {/* Filters */}
      <section style={{ padding: 'var(--spacing-lg) var(--spacing-md) var(--spacing-md)' }}>
        <div style={{ 
          display: 'flex', 
          gap: 'var(--spacing-sm)', 
          overflowX: 'auto',
          paddingBottom: 'var(--spacing-sm)'
        }}>
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: activeFilter === filter 
                  ? 'var(--primary-coral)' 
                  : 'var(--bg-light)',
                color: activeFilter === filter 
                  ? 'white' 
                  : 'var(--text-medium)',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Results Count */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          margin: 0
        }}>
          {safeFilteredRecipes.length} recette{safeFilteredRecipes.length > 1 ? 's' : ''} trouvée{safeFilteredRecipes.length > 1 ? 's' : ''}
        </p>
      </section>

      {/* Recipes Grid */}
      <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 'var(--spacing-md)' 
        }}>
          {safeFilteredRecipes.map(recipe => (
            <div key={recipe.id} className="card" style={{ padding: 0, cursor: 'pointer' }}>
              <div style={{
                width: '100%',
                height: '150px',
                background: 'linear-gradient(45deg, var(--primary-coral-light), var(--secondary-mint-light))',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                position: 'relative'
              }}>
                {recipe.emoji || '🍽️'}
                <div style={{
                  position: 'absolute',
                  top: 'var(--spacing-sm)',
                  right: 'var(--spacing-sm)',
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                  ❤️
                </div>
              </div>
              <div style={{ padding: 'var(--spacing-md)' }}>
                <h3 style={{ 
                  fontSize: '1rem', 
                  marginBottom: 'var(--spacing-xs)',
                  margin: '0 0 var(--spacing-xs) 0'
                }}>
                  {recipe.name || 'Recette sans nom'}
                </h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-sm)',
                  fontSize: '0.8rem'
                }}>
                  <span style={{ 
                    background: 'var(--bg-light)', 
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-medium)'
                  }}>
                    ⏱️ {recipe.time || 'Non spécifié'}
                  </span>
                  <span style={{ color: 'var(--text-light)' }}>⭐ {recipe.rating || 'N/A'}</span>
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: getDifficultyColor(recipe.difficulty),
                  fontWeight: '500'
                }}>
                  {recipe.difficulty || 'Non spécifié'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
