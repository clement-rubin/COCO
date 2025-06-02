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
        <meta name="description" content="Recherchez des recettes délicieuses" />
      </Head>

      {/* Search Interface */}
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Rechercher des recettes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
        </div>

        {/* Quick searches */}
        {!searchTerm && (
          <div>
            <h3>Recherches récentes</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {recentSearches.map(term => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--bg-light)',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer'
                  }}
                >
                  {term}
                </button>
              ))}
            </div>

            <h3>Recherches populaires</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {popularSearches.map(term => (
                <button
                  key={term}
                  onClick={() => handleQuickSearch(term)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary-coral-light)',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer'
                  }}
                >
                  🔥 {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {searchTerm && (
          <div style={{ marginBottom: '1rem' }}>
            <h3>Filtres</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">Toutes catégories</option>
                <option value="Entrées">Entrées</option>
                <option value="Plats principaux">Plats principaux</option>
                <option value="Desserts">Desserts</option>
                <option value="Salades">Salades</option>
              </select>

              <select
                value={filters.maxTime}
                onChange={(e) => setFilters(prev => ({ ...prev, maxTime: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">Temps max</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 heure</option>
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: '4px' }}
              >
                <option value="">Difficulté</option>
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Difficile">Difficile</option>
              </select>

              <button
                onClick={clearFilters}
                style={{
                  padding: '0.5rem',
                  background: 'var(--bg-light)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Effacer
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>🔍 Recherche en cours...</div>
          </div>
        )}

        {!isLoading && searchTerm && (
          <div>
            <h3>{results.length} résultat(s) pour "{searchTerm}"</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {results.map(recipe => (
                <div
                  key={recipe.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>{recipe.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{recipe.name}</h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                      {recipe.category} • {recipe.time} • ⭐ {recipe.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
