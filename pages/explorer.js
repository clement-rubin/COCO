import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/Explorer.module.css'

export default function Explorer() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState('Tous')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [likedRecipes, setLikedRecipes] = useState(new Set())

  const filters = ['Tous', 'Pâtes', 'Salades', 'Desserts', 'Soupes', 'Plats principaux', 'Entrées']

  const recipes = [
    { id: 1, name: 'Pâtes Carbonara', category: 'Pâtes', time: '20 min', rating: 4.8, emoji: '🍝', difficulty: 'Facile', chef: 'Marco', likes: 234 },
    { id: 2, name: 'Salade César', category: 'Salades', time: '15 min', rating: 4.6, emoji: '🥗', difficulty: 'Facile', chef: 'Emma', likes: 189 },
    { id: 3, name: 'Tiramisu', category: 'Desserts', time: '45 min', rating: 4.9, emoji: '🍰', difficulty: 'Moyen', chef: 'Sofia', likes: 456 },
    { id: 4, name: 'Soupe à l\'oignon', category: 'Soupes', time: '30 min', rating: 4.4, emoji: '🍲', difficulty: 'Facile', chef: 'Pierre', likes: 127 },
    { id: 5, name: 'Risotto aux champignons', category: 'Plats principaux', time: '35 min', rating: 4.7, emoji: '🍚', difficulty: 'Moyen', chef: 'Anna', likes: 312 },
    { id: 6, name: 'Bruschetta', category: 'Entrées', time: '10 min', rating: 4.3, emoji: '🥖', difficulty: 'Facile', chef: 'Luigi', likes: 98 },
    { id: 7, name: 'Pâtes Bolognaise', category: 'Pâtes', time: '40 min', rating: 4.8, emoji: '🍝', difficulty: 'Moyen', chef: 'Nonna', likes: 367 },
    { id: 8, name: 'Tarte aux pommes', category: 'Desserts', time: '60 min', rating: 4.5, emoji: '🥧', difficulty: 'Difficile', chef: 'Marie', likes: 201 }
  ]

  useEffect(() => {
    setTimeout(() => setLoading(false), 600)
  }, [])

  const filteredRecipes = recipes.filter(recipe => {
    if (!recipe) return false
    const matchesFilter = activeFilter === 'Tous' || recipe.category === activeFilter
    const matchesSearch = recipe.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false
    return matchesFilter && matchesSearch
  })

  const handleLike = (recipeId, e) => {
    e.stopPropagation()
    setLikedRecipes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const handleRecipeClick = (recipeId) => {
    logUserInteraction('OPEN_RECIPE_FROM_EXPLORER', 'explorer-grid', {
      recipeId,
      userId: user?.id
    })
    router.push(`/recipe/${recipeId}`)
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Facile': return '#10b981'
      case 'Moyen': return '#f59e0b'
      case 'Difficile': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Recherche des meilleures recettes...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Explorer - COCO</title>
        <meta name="description" content="Explorez toutes les recettes de COCO" />
      </Head>

      {/* Header mobile moderne */}
      <header className={styles.mobileHeader}>
        <button 
          className={styles.mobileBackBtn}
          onClick={() => router.back()}
        >
          ←
        </button>
        <div className={styles.mobileTitle}>
          <h1>Explorer</h1>
          <p className={styles.subtitle}>Découvrez de nouvelles saveurs</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.filterToggle}>
            🔧
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className={styles.mobileContent}>
        {/* Section de recherche */}
        <section className={styles.searchSection}>
          <div className={styles.searchContainer}>
            <div className={styles.searchIcon}>🔍</div>
            <input
              type="text"
              placeholder="Rechercher une recette..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button 
                className={styles.clearSearch}
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Filtres horizontaux */}
        <section className={styles.filtersSection}>
          <div className={styles.filtersContainer}>
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`${styles.filterBtn} ${activeFilter === filter ? styles.active : ''}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* Statistiques des résultats */}
        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsCount}>
              <span className={styles.countNumber}>{filteredRecipes.length}</span>
              <span className={styles.countLabel}>
                recette{filteredRecipes.length > 1 ? 's' : ''} trouvée{filteredRecipes.length > 1 ? 's' : ''}
              </span>
            </div>
            {activeFilter !== 'Tous' && (
              <div className={styles.activeFilterBadge}>
                <span>{activeFilter}</span>
                <button onClick={() => setActiveFilter('Tous')}>✕</button>
              </div>
            )}
          </div>
        </section>

        {/* Grille des recettes */}
        <section className={styles.recipesSection}>
          {filteredRecipes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <h3>Aucune recette trouvée</h3>
              <p>Essayez de modifier vos critères de recherche</p>
              <button 
                className={styles.resetBtn}
                onClick={() => {
                  setSearchTerm('')
                  setActiveFilter('Tous')
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className={styles.recipesGrid}>
              {filteredRecipes.map(recipe => (
                <div 
                  key={recipe.id} 
                  className={styles.recipeCard}
                  onClick={() => handleRecipeClick(recipe.id)}
                >
                  <div className={styles.recipeImageContainer}>
                    <div className={styles.recipeEmoji}>{recipe.emoji}</div>
                    <button 
                      className={`${styles.likeBtn} ${likedRecipes.has(recipe.id) ? styles.liked : ''}`}
                      onClick={(e) => handleLike(recipe.id, e)}
                    >
                      {likedRecipes.has(recipe.id) ? '❤️' : '🤍'}
                    </button>
                    <div className={styles.recipeOverlay}>
                      <span className={styles.viewText}>Voir la recette</span>
                    </div>
                  </div>
                  
                  <div className={styles.recipeContent}>
                    <div className={styles.recipeHeader}>
                      <h3 className={styles.recipeName}>{recipe.name}</h3>
                      <div className={styles.recipeChef}>
                        <span className={styles.chefIcon}>👨‍🍳</span>
                        <span>{recipe.chef}</span>
                      </div>
                    </div>
                    
                    <div className={styles.recipeStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statIcon}>⏱️</span>
                        <span>{recipe.time}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statIcon}>⭐</span>
                        <span>{recipe.rating}</span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statIcon}>❤️</span>
                        <span>{recipe.likes}</span>
                      </div>
                    </div>
                    
                    <div className={styles.recipeFooter}>
                      <span 
                        className={styles.difficultyBadge}
                        style={{ backgroundColor: getDifficultyColor(recipe.difficulty) }}
                      >
                        {recipe.difficulty}
                      </span>
                      <span className={styles.categoryTag}>
                        {recipe.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
