import Head from 'next/head'
import { useState, useEffect } from 'react'

export default function Recherche() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    maxTime: '',
    difficulty: '',
    rating: ''
  });

  const allRecipes = [
    { id: 1, name: 'Pâtes Carbonara', category: 'Pâtes', time: 20, rating: 4.8, emoji: '🍝', difficulty: 'Facile' },
    { id: 2, name: 'Salade César', category: 'Salades', time: 15, rating: 4.6, emoji: '🥗', difficulty: 'Facile' },
    { id: 3, name: 'Tiramisu', category: 'Desserts', time: 45, rating: 4.9, emoji: '🍰', difficulty: 'Moyen' },
    { id: 4, name: 'Soupe à l\'oignon', category: 'Soupes', time: 30, rating: 4.4, emoji: '🍲', difficulty: 'Facile' },
    { id: 5, name: 'Risotto aux champignons', category: 'Plats principaux', time: 35, rating: 4.7, emoji: '🍚', difficulty: 'Moyen' },
    { id: 6, name: 'Coq au vin', category: 'Plats principaux', time: 90, rating: 4.8, emoji: '🍗', difficulty: 'Difficile' },
    { id: 7, name: 'Tarte tatin', category: 'Desserts', time: 60, rating: 4.5, emoji: '🥧', difficulty: 'Difficile' },
    { id: 8, name: 'Gazpacho', category: 'Soupes', time: 10, rating: 4.3, emoji: '🍅', difficulty: 'Facile' }
  ];

  const recentSearches = ['Pasta', 'Dessert', 'Rapide', 'Végétarien'];
  const popularSearches = ['Tiramisu', 'Carbonara', 'Salade César', 'Soupe'];

  useEffect(() => {
    if (searchTerm.trim()) {
      setIsLoading(true);
      // Simulate API delay
      const timer = setTimeout(() => {
        const filtered = allRecipes.filter(recipe => {
          const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               recipe.category.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesCategory = !filters.category || recipe.category === filters.category;
          const matchesTime = !filters.maxTime || recipe.time <= parseInt(filters.maxTime);
          const matchesDifficulty = !filters.difficulty || recipe.difficulty === filters.difficulty;
          const matchesRating = !filters.rating || recipe.rating >= parseFloat(filters.rating);
          
          return matchesSearch && matchesCategory && matchesTime && matchesDifficulty && matchesRating;
        });
        
        setResults(filtered);
        setIsLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [searchTerm, filters]);

  const handleQuickSearch = (term) => {
    setSearchTerm(term);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      maxTime: '',
      difficulty: '',
      rating: ''
    });
  };

  return (
    <div>
      <Head>
        <title>Recherche - COCO</title>
        <meta name="description" content="Recherchez vos recettes préférées sur COCO" />
      </Head>

      {/* Search Header */}
      <section style={{
        background: 'var(--bg-gradient)',
        padding: 'var(--spacing-lg) var(--spacing-md)',
        paddingBottom: 'var(--spacing-xl)'
      }}>
        <h1 style={{ 
          fontSize: '1.8rem', 
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center',
          color: 'var(--text-dark)'
        }}>
          Rechercher une recette
        </h1>
        
        {/* Main Search Bar */}
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
            placeholder="Tapez le nom d'une recette, un ingrédient..."
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
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: 'var(--text-light)'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Filters */}
      <section style={{ padding: 'var(--spacing-md)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 'var(--spacing-md)'
        }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Filtres</h3>
          <button
            onClick={clearFilters}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-coral)',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Effacer tout
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-light)',
              background: 'white',
              fontSize: '0.9rem'
            }}
          >
            <option value="">Toutes catégories</option>
            <option value="Pâtes">Pâtes</option>
            <option value="Salades">Salades</option>
            <option value="Desserts">Desserts</option>
            <option value="Soupes">Soupes</option>
            <option value="Plats principaux">Plats principaux</option>
          </select>

          <select
            value={filters.maxTime}
            onChange={(e) => setFilters(prev => ({ ...prev, maxTime: e.target.value }))}
            style={{
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-light)',
              background: 'white',
              fontSize: '0.9rem'
            }}
          >
            <option value="">Temps max</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 heure</option>
            <option value="120">2 heures</option>
          </select>

          <select
            value={filters.difficulty}
            onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
            style={{
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-light)',
              background: 'white',
              fontSize: '0.9rem'
            }}
          >
            <option value="">Difficulté</option>
            <option value="Facile">Facile</option>
            <option value="Moyen">Moyen</option>
            <option value="Difficile">Difficile</option>
          </select>

          <select
            value={filters.rating}
            onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
            style={{
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-light)',
              background: 'white',
              fontSize: '0.9rem'
            }}
          >
            <option value="">Note min</option>
            <option value="4.5">4.5+ ⭐</option>
            <option value="4.0">4.0+ ⭐</option>
            <option value="3.5">3.5+ ⭐</option>
          </select>
        </div>
      </section>

      {!searchTerm ? (
        /* Suggestions when no search */
        <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Recherches récentes</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              {recentSearches.map(search => (
                <button
                  key={search}
                  onClick={() => handleQuickSearch(search)}
                  style={{
                    background: 'var(--bg-light)',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--text-medium)'
                  }}
                >
                  🕒 {search}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Recherches populaires</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              {popularSearches.map(search => (
                <button
                  key={search}
                  onClick={() => handleQuickSearch(search)}
                  style={{
                    background: 'var(--primary-coral-light)',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--primary-coral)'
                  }}
                >
                  🔥 {search}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Search Results */
        <section style={{ padding: '0 var(--spacing-md) var(--spacing-xl)' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>🔍</div>
              <p>Recherche en cours...</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>😔</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--spacing-sm)' }}>
                Aucun résultat trouvé
              </h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                Essayez avec d'autres mots-clés ou modifiez vos filtres
              </p>
              <button
                onClick={clearFilters}
                style={{
                  background: 'var(--primary-coral)',
                  color: 'white',
                  border: 'none',
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <>
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.9rem',
                marginBottom: 'var(--spacing-lg)'
              }}>
                {results.length} résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''} pour "{searchTerm}"
              </p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: 'var(--spacing-md)' 
              }}>
                {results.map(recipe => (
                  <div key={recipe.id} className="card" style={{ padding: 0, cursor: 'pointer' }}>
                    <div style={{
                      width: '100%',
                      height: '150px',
                      background: 'linear-gradient(45deg, var(--primary-coral-light), var(--secondary-mint-light))',
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '3rem'
                    }}>
                      {recipe.emoji}
                    </div>
                    <div style={{ padding: 'var(--spacing-md)' }}>
                      <h3 style={{ 
                        fontSize: '1rem', 
                        marginBottom: 'var(--spacing-xs)',
                        margin: '0 0 var(--spacing-xs) 0'
                      }}>
                        {recipe.name}
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
                          ⏱️ {recipe.time} min
                        </span>
                        <span style={{ color: 'var(--text-light)' }}>⭐ {recipe.rating}</span>
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}>
                        {recipe.category} • {recipe.difficulty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
