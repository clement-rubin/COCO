import Head from 'next/head'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import { logUserInteraction } from '../utils/logger'
import { syncTrophiesAfterAction } from '../utils/trophyUtils'
import SwipeNavigation from '../components/SwipeNavigation'
import styles from '../styles/Explorer.module.css'

export default function Explorer() {
  const router = useRouter()
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [likedRecipes, setLikedRecipes] = useState(new Set())
  const [followedChefs, setFollowedChefs] = useState(new Set())
  const [sortBy, setSortBy] = useState('trending') // trending, newest, rating, time
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [difficultyFilter, setDifficultyFilter] = useState('Tous')
  const [timeFilter, setTimeFilter] = useState('Tous')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // grid, list
  const [recipesData, setRecipesData] = useState([])
  const [trendingRecipes, setTrendingRecipes] = useState([])
  const [userInteractions, setUserInteractions] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const filters = ['Tous', 'Pâtes', 'Salades', 'Desserts', 'Soupes', 'Plats principaux', 'Entrées', 'Végétarien', 'Sans gluten', 'Rapide']
  const difficultyFilters = ['Tous', 'Facile', 'Moyen', 'Difficile']
  const timeFilters = ['Tous', '< 15 min', '15-30 min', '30-60 min', '> 1h']

  // Extended recipes data with more variety
  const recipes = [
    { id: 1, name: 'Pâtes Carbonara', category: 'Pâtes', time: '20 min', rating: 4.8, emoji: '🍝', difficulty: 'Facile', chef: 'Marco', likes_count: 234, views: 1250, isNew: false, isTrending: true, tags: ['crémeux', 'italien', 'rapide'], cookTime: 20, description: 'Un grand classique de la cuisine italienne' },
    { id: 2, name: 'Salade César', category: 'Salades', time: '15 min', rating: 4.6, emoji: '🥗', difficulty: 'Facile', chef: 'Emma', likes_count: 189, views: 890, isNew: false, isTrending: false, tags: ['frais', 'léger', 'salade'], cookTime: 15, description: 'Salade fraîche et croquante' },
    { id: 3, name: 'Tiramisu', category: 'Desserts', time: '45 min', rating: 4.9, emoji: '🍰', difficulty: 'Moyen', chef: 'Sofia', likes_count: 456, views: 2100, isNew: true, isTrending: true, tags: ['dessert', 'italien', 'café'], cookTime: 45, description: 'Le dessert italien par excellence' },
    { id: 4, name: 'Soupe à l\'oignon', category: 'Soupes', time: '30 min', rating: 4.4, emoji: '🍲', difficulty: 'Facile', chef: 'Pierre', likes_count: 127, views: 650, isNew: false, isTrending: false, tags: ['réconfortant', 'fromage', 'hiver'], cookTime: 30, description: 'Soupe traditionnelle française' },
    { id: 5, name: 'Risotto aux champignons', category: 'Plats principaux', time: '35 min', rating: 4.7, emoji: '🍚', difficulty: 'Moyen', chef: 'Anna', likes_count: 312, views: 1680, isNew: false, isTrending: true, tags: ['crémeux', 'champignons', 'italien'], cookTime: 35, description: 'Risotto onctueux aux champignons frais' },
    { id: 6, name: 'Bruschetta', category: 'Entrées', time: '10 min', rating: 4.3, emoji: '🥖', difficulty: 'Facile', chef: 'Luigi', likes_count: 98, views: 420, isNew: false, isTrending: false, tags: ['apéritif', 'tomate', 'basilic'], cookTime: 10, description: 'Entrée italienne simple et savoureuse' },
    { id: 7, name: 'Pâtes Bolognaise', category: 'Pâtes', time: '40 min', rating: 4.8, emoji: '🍝', difficulty: 'Moyen', chef: 'Nonna', likes_count: 367, views: 1950, isNew: false, isTrending: true, tags: ['viande', 'tomate', 'familial'], cookTime: 40, description: 'Sauce bolognaise traditionnelle' },
    { id: 8, name: 'Tarte aux pommes', category: 'Desserts', time: '60 min', rating: 4.5, emoji: '🥧', difficulty: 'Difficile', chef: 'Marie', likes_count: 201, views: 1120, isNew: true, isTrending: false, tags: ['pommes', 'pâtisserie', 'automne'], cookTime: 60, description: 'Tarte aux pommes maison' },
    { id: 9, name: 'Buddha Bowl', category: 'Végétarien', time: '25 min', rating: 4.6, emoji: '🥙', difficulty: 'Facile', chef: 'Zen', likes_count: 445, views: 1890, isNew: true, isTrending: true, tags: ['healthy', 'coloré', 'équilibré'], cookTime: 25, description: 'Bowl végétarien nutritif et coloré' },
    { id: 10, name: 'Pancakes sans gluten', category: 'Sans gluten', time: '20 min', rating: 4.4, emoji: '🥞', difficulty: 'Facile', chef: 'Alex', likes_count: 178, views: 780, isNew: true, isTrending: false, tags: ['petit-déjeuner', 'moelleux', 'sans gluten'], cookTime: 20, description: 'Pancakes moelleux sans gluten' }
  ]

  // Initialize data
  useEffect(() => {
    const initializeData = () => {
      setRecipesData(recipes)
      setTrendingRecipes(recipes.filter(r => r.isTrending).slice(0, 3))
      setTimeout(() => setLoading(false), 600)
    }
    
    initializeData()
  }, [])

  // Search suggestions logic
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const suggestions = recipes
        .filter(recipe => 
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.chef.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 5)
        .map(recipe => ({
          type: 'recipe',
          value: recipe.name,
          subtitle: `par ${recipe.chef}`,
          id: recipe.id
        }))
      
      setSearchSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm])

  // Filter and sort recipes
  const filteredRecipes = recipesData.filter(recipe => {
    if (!recipe) return false
    
    const matchesFilter = activeFilter === 'Tous' || recipe.category === activeFilter
    const matchesSearch = !searchTerm || 
      recipe.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      recipe.chef?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDifficulty = difficultyFilter === 'Tous' || recipe.difficulty === difficultyFilter
    
    let matchesTime = true
    if (timeFilter !== 'Tous') {
      const cookTime = recipe.cookTime || 0
      switch(timeFilter) {
        case '< 15 min': matchesTime = cookTime < 15; break
        case '15-30 min': matchesTime = cookTime >= 15 && cookTime <= 30; break
        case '30-60 min': matchesTime = cookTime > 30 && cookTime <= 60; break
        case '> 1h': matchesTime = cookTime > 60; break
      }
    }
    
    return matchesFilter && matchesSearch && matchesDifficulty && matchesTime
  }).sort((a, b) => {
    switch(sortBy) {
      case 'newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      case 'rating': return b.rating - a.rating
      case 'time': return a.cookTime - b.cookTime
      case 'trending': 
      default:
        return (b.isTrending ? 1000 : 0) + b.likes - ((a.isTrending ? 1000 : 0) + a.likes)
    }
  })

  const handleLike = useCallback(async (recipeId, e) => {
    e.stopPropagation()
    
    const recipe = recipes.find(r => r.id === recipeId)
    const wasLiked = likedRecipes.has(recipeId)
    
    setLikedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })

    // Log interaction
    logUserInteraction(wasLiked ? 'UNLIKE_RECIPE' : 'LIKE_RECIPE', 'explorer-card', {
      recipeId,
      recipeName: recipe?.name,
      userId: user?.id
    })

    // Check for trophies after engagement
    if (user?.id && !wasLiked) {
      try {
        await syncTrophiesAfterAction(user.id, 'recipe_liked', { recipeId })
      } catch (error) {
        console.error('Error checking trophies after like:', error)
      }
    }
  }, [likedRecipes, user?.id])

  const handleFollowChef = useCallback(async (chefName, e) => {
    e.stopPropagation()
    
    const wasFollowing = followedChefs.has(chefName)
    
    setFollowedChefs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chefName)) {
        newSet.delete(chefName)
      } else {
        newSet.add(chefName)
      }
      return newSet
    })

    logUserInteraction(wasFollowing ? 'UNFOLLOW_CHEF' : 'FOLLOW_CHEF', 'explorer-card', {
      chefName,
      userId: user?.id
    })
  }, [followedChefs, user?.id])

  const handleRecipeClick = useCallback((recipeId) => {
    const recipe = recipes.find(r => r.id === recipeId)
    
    // Update view count
    setUserInteractions(prev => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], viewed: true, viewedAt: new Date() }
    }))

    logUserInteraction('OPEN_RECIPE_FROM_EXPLORER', 'explorer-grid', {
      recipeId,
      recipeName: recipe?.name,
      userId: user?.id
    })
    
    router.push(`/recipe/${recipeId}`)
  }, [router, user?.id])

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'recipe') {
      setSearchTerm(suggestion.value)
      setShowSuggestions(false)
      handleRecipeClick(suggestion.id)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setShowSuggestions(false)
    logUserInteraction('SEARCH_RECIPES', 'explorer-search', {
      searchTerm,
      resultsCount: filteredRecipes.length,
      userId: user?.id
    })
  }

  const resetFilters = () => {
    setSearchTerm('')
    setActiveFilter('Tous')
    setDifficultyFilter('Tous')
    setTimeFilter('Tous')
    setSortBy('trending')
    setShowAdvancedFilters(false)
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Facile': return '#10b981'
      case 'Moyen': return '#f59e0b'
      case 'Difficile': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Routes principales pour la navigation par swipe
  const mainRoutes = [
    { path: '/', label: 'Accueil' },
    { path: '/progression', label: 'Progression' },
    { path: '/share-photo', label: 'Partager' },
    { path: '/amis', label: 'Amis' }
  ];

  useEffect(() => {
    // Redirection automatique vers la nouvelle page Progression
    router.replace('/progression')
  }, [router])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Découverte des meilleures recettes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Explorer - COCO</title>
        <meta name="description" content="Explorez et découvrez les meilleures recettes de COCO" />
      </Head>

      {/* Navigation par swipe pour mobile */}
      <SwipeNavigation routes={mainRoutes} currentPath="/explorer" />

      {/* Header mobile moderne avec nouveau design */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.mobileBackBtn}
          onClick={() => router.back()}
        >
          <span>←</span>
        </button>
        
        <div className={styles.mobileTitle}>
          <h1>🔍 Explorer</h1>
          <p className={styles.subtitle}>Découvrez de nouvelles saveurs</p>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🎛️
          </button>
          <button 
            className={`${styles.viewToggle} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
        </div>
      </header>

      {/* Contenu principal avec nouveau layout */}
      <main className={styles.mobileContent}>
        {/* Hero Section avec statistiques */}
        <section className={styles.heroSection}>
          <div className={styles.statsBar}>
            <div className={styles.stat}>
              <span className={styles.statIcon}>🍽️</span>
              <span className={styles.statNumber}>{recipesData.length}</span>
              <span className={styles.statLabel}>Recettes</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>👨‍🍳</span>
              <span className={styles.statNumber}>50+</span>
              <span className={styles.statLabel}>Chefs</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>🔥</span>
              <span className={styles.statNumber}>{trendingRecipes.length}</span>
              <span className={styles.statLabel}>Tendances</span>
            </div>
          </div>
        </section>

        {/* Section de recherche repensée */}
        <section className={styles.searchSection}>
          <div className={styles.searchContainer} ref={searchInputRef}>
            <div className={styles.searchInputWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher des recettes délicieuses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
              />
              {searchTerm && (
                <button 
                  type="button"
                  className={styles.clearSearch}
                  onClick={() => setSearchTerm('')}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Actions rapides de recherche */}
            <div className={styles.quickSearchActions}>
              <button 
                className={styles.quickSearchBtn}
                onClick={() => setSearchTerm('pasta')}
              >
                🍝 Pâtes
              </button>
              <button 
                className={styles.quickSearchBtn}
                onClick={() => setSearchTerm('dessert')}
              >
                🍰 Desserts
              </button>
              <button 
                className={styles.quickSearchBtn}
                onClick={() => setSearchTerm('rapide')}
              >
                ⚡ Rapide
              </button>
            </div>

            {/* Search Suggestions redesignées */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className={styles.searchSuggestions} ref={suggestionsRef}>
                {searchSuggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    className={styles.suggestionItem}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className={styles.suggestionIcon}>🔍</span>
                    <div className={styles.suggestionContent}>
                      <span className={styles.suggestionText}>{suggestion.value}</span>
                      <span className={styles.suggestionSubtitle}>{suggestion.subtitle}</span>
                    </div>
                    <span className={styles.suggestionArrow}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Filtres avec nouveau design */}
        <section className={`${styles.filtersSection} ${showFilters ? styles.expanded : ''}`}>
          <div className={styles.filtersHeader}>
            <h3>🎯 Filtres & Tri</h3>
            <button 
              className={styles.resetFiltersBtn}
              onClick={resetFilters}
              style={{ display: activeFilter !== 'Tous' || searchTerm ? 'block' : 'none' }}
            >
              🔄 Reset
            </button>
          </div>
          
          {/* Filtres principaux horizontaux */}
          <div className={styles.mainFilters}>
            {filters.slice(0, 6).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`${styles.filterBtn} ${activeFilter === filter ? styles.active : ''}`}
              >
                {filter}
              </button>
            ))}
            <button 
              className={styles.moreFiltersBtn}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              {showAdvancedFilters ? '▼ Moins' : '▶ Plus'}
            </button>
          </div>

          {/* Filtres avancés */}
          {showAdvancedFilters && (
            <div className={styles.advancedFiltersGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <span className={styles.labelIcon}>⚡</span>
                  Difficulté
                </label>
                <div className={styles.filterOptions}>
                  {difficultyFilters.map(difficulty => (
                    <button
                      key={difficulty}
                      onClick={() => setDifficultyFilter(difficulty)}
                      className={`${styles.filterOption} ${difficultyFilter === difficulty ? styles.active : ''}`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <span className={styles.labelIcon}>⏱️</span>
                  Temps
                </label>
                <div className={styles.filterOptions}>
                  {timeFilters.map(time => (
                    <button
                      key={time}
                      onClick={() => setTimeFilter(time)}
                      className={`${styles.filterOption} ${timeFilter === time ? styles.active : ''}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  <span className={styles.labelIcon}>📊</span>
                  Trier par
                </label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.sortSelect}
                >
                  <option value="trending">🔥 Tendances</option>
                  <option value="newest">🆕 Plus récent</option>
                  <option value="rating">⭐ Mieux notés</option>
                  <option value="time">⏱️ Temps de cuisson</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Section Trending avec nouveau design */}
        {trendingRecipes.length > 0 && !searchTerm && activeFilter === 'Tous' && (
          <section className={styles.trendingSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.trendingIcon}>🔥</span>
                Tendances du moment
              </h2>
              <span className={styles.trendingBadge}>HOT</span>
            </div>
            
            <div className={styles.trendingContainer}>
              {trendingRecipes.map(recipe => (
                <div 
                  key={`trending-${recipe.id}`}
                  className={styles.trendingCard}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  <div className={styles.trendingCardHeader}>
                    <div className={styles.trendingEmoji}>{recipe.emoji}</div>
                    <div className={styles.trendingBadgeSmall}>🔥</div>
                  </div>
                  
                  <div className={styles.trendingInfo}>
                    <h4>{recipe.name}</h4>
                    <span className={styles.trendingChef}>par {recipe.chef}</span>
                  </div>
                  
                  <div className={styles.trendingStats}>
                    <div className={styles.trendingStat}>
                      <span>⭐ {recipe.rating}</span>
                    </div>
                    <div className={styles.trendingStat}>
                      <span>❤️ {recipe.likes}</span>
                    </div>
                  </div>
                  
                  <div className={styles.trendingFooter}>
                    <span className={styles.trendingTime}>{recipe.time}</span>
                    <span className={styles.trendingDifficulty}>{recipe.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Résultats avec design amélioré */}
        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsInfo}>
              <div className={styles.resultsCount}>
                <span className={styles.countNumber}>{filteredRecipes.length}</span>
                <span className={styles.countLabel}>
                  recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
                </span>
              </div>
              
              {(activeFilter !== 'Tous' || difficultyFilter !== 'Tous' || timeFilter !== 'Tous' || searchTerm) && (
                <div className={styles.activeFiltersDisplay}>
                  {activeFilter !== 'Tous' && (
                    <span className={styles.activeFilterChip}>
                      📂 {activeFilter}
                      <button onClick={() => setActiveFilter('Tous')}>✕</button>
                    </span>
                  )}
                  {difficultyFilter !== 'Tous' && (
                    <span className={styles.activeFilterChip}>
                      ⚡ {difficultyFilter}
                      <button onClick={() => setDifficultyFilter('Tous')}>✕</button>
                    </span>
                  )}
                  {timeFilter !== 'Tous' && (
                    <span className={styles.activeFilterChip}>
                      ⏱️ {timeFilter}
                      <button onClick={() => setTimeFilter('Tous')}>✕</button>
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className={styles.viewModeToggle}>
              <button
                onClick={() => setViewMode('grid')}
                className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.active : ''}`}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Grille des recettes avec nouveau design */}
          {filteredRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3 className={styles.emptyTitle}>Aucune recette trouvée</h3>
              <p className={styles.emptyDescription}>
                Essayez de modifier vos critères de recherche ou explorez nos recettes tendances
              </p>
              <button className={styles.resetBtn} onClick={resetFilters}>
                🔄 Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className={`${styles.recipesGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
              {filteredRecipes.map(recipe => (
                <div 
                  key={recipe.id} 
                  className={`${styles.recipeCard} ${recipe.isNew ? styles.newRecipe : ''} ${recipe.isTrending ? styles.trendingRecipe : ''}`}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  {/* Badges modernisés */}
                  <div className={styles.recipeBadges}>
                    {recipe.isNew && <span className={styles.newBadge}>✨ Nouveau</span>}
                    {recipe.isTrending && <span className={styles.trendingCardBadge}>🔥 Tendance</span>}
                  </div>
                  
                  {/* Image container avec nouveau design */}
                  <div className={styles.recipeImageContainer}>
                    <div className={styles.recipeEmoji}>{recipe.emoji}</div>
                    
                    {/* Actions rapides */}
                    <div className={styles.recipeQuickActions}>
                      <button 
                        className={`${styles.quickActionBtn} ${likedRecipes.has(recipe.id) ? styles.liked : ''}`}
                        onClick={(e) => handleLike(recipe.id, e)}
                      >
                        {likedRecipes.has(recipe.id) ? '❤️' : '🤍'}
                      </button>
                      <button 
                        className={`${styles.quickActionBtn} ${followedChefs.has(recipe.chef) ? styles.following : ''}`}
                        onClick={(e) => handleFollowChef(recipe.chef, e)}
                      >
                        {followedChefs.has(recipe.chef) ? '✓' : '+'}
                      </button>
                    </div>
                    
                    {/* Overlay d'interaction */}
                    <div className={styles.recipeOverlay}>
                      <span className={styles.viewPrompt}>👆 Tap to view</span>
                    </div>
                  </div>
                  
                  {/* Contenu de la carte redesigné */}
                  <div className={styles.recipeContent}>
                    <div className={styles.recipeHeader}>
                      <h3 className={styles.recipeName}>{recipe.name}</h3>
                      <p className={styles.recipeDescription}>{recipe.description}</p>
                    </div>
                    
                    {/* Chef info avec design amélioré */}
                    <div className={styles.recipeChef}>
                      <span className={styles.chefAvatar}>👨‍🍳</span>
                      <span className={styles.chefName}>{recipe.chef}</span>
                      {followedChefs.has(recipe.chef) && (
                        <span className={styles.followingIndicator}>✓ Suivi</span>
                      )}
                    </div>
                    
                    {/* Stats redesignées */}
                    <div className={styles.recipeStats}>
                      <div className={styles.statGroup}>
                        <span className={styles.statItem}>
                          <span className={styles.statIcon}>⏱️</span>
                          <span>{recipe.time}</span>
                        </span>
                        <span className={styles.statItem}>
                          <span className={styles.statIcon}>⭐</span>
                          <span>{recipe.rating}</span>
                        </span>
                      </div>
                      <div className={styles.statGroup}>
                        <span className={styles.statItem}>
                          <span className={styles.statIcon}>❤️</span>
                          <span>{recipe.likes}</span>
                        </span>
                        <span className={styles.statItem}>
                          <span className={styles.statIcon}>👀</span>
                          <span>{recipe.views}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Tags avec meilleur design */}
                    {recipe.tags && (
                      <div className={styles.recipeTags}>
                        {recipe.tags.slice(0, 2).map(tag => (
                          <span key={tag} className={styles.recipeTag}>#{tag}</span>
                        ))}
                        {recipe.tags.length > 2 && (
                          <span className={styles.recipeTag}>+{recipe.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Footer avec badges */}
                    <div className={styles.recipeFooter}>
                      <span 
                        className={styles.difficultyBadge}
                        style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}
                      >
                        {recipe.difficulty}
                      </span>
                      <span className={styles.categoryBadge}>
                        {recipe.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Call to action si peu de résultats */}
        {filteredRecipes.length > 0 && filteredRecipes.length < 3 && (
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <div className={styles.ctaIcon}>💡</div>
              <h3 className={styles.ctaTitle}>Pas assez de choix ?</h3>
              <p className={styles.ctaDescription}>
                Ajustez vos filtres ou découvrez toutes nos recettes
              </p>
              <button 
                className={styles.ctaButton}
                onClick={() => {
                  resetFilters()
                  setActiveFilter('Tous')
                }}
              >
                🔍 Voir toutes les recettes
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
