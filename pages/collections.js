import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'
import { logInfo, logError } from '../utils/logger'
import styles from '../styles/Collections.module.css'

export default function Collections() {
  const { user } = useAuth()
  const router = useRouter()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [flippedCards, setFlippedCards] = useState(new Set())
  const [favorites, setFavorites] = useState(new Set())
  const [activeFilter, setActiveFilter] = useState('all')

  // Collections enrichies avec plus de contenu
  const defaultCollections = [
    {
      id: 1,
      name: "Petits Déjeuners Vitaminés",
      description: "Commencez votre journée du bon pied avec des recettes énergisantes et gourmandes",
      illustration: "🌅",
      color: "#fef3c7",
      accent: "#f59e0b",
      recipeCount: 28,
      difficulty: "Facile",
      category: "morning",
      trending: true,
      estimatedTime: "10-20 min",
      recipes: [
        { name: "Pancakes aux myrtilles", time: "15 min", difficulty: "Facile" },
        { name: "Granola maison croustillant", time: "25 min", difficulty: "Facile" },
        { name: "Smoothie bowl exotique", time: "10 min", difficulty: "Facile" },
        { name: "Avocado toast gourmand", time: "8 min", difficulty: "Facile" }
      ],
      tags: ["Healthy", "Rapide", "Énergisant"]
    },
    {
      id: 2,
      name: "Plats Réconfortants",
      description: "Des recettes traditionnelles qui réchauffent le cœur et créent des souvenirs",
      illustration: "🍲",
      color: "#fecaca",
      accent: "#ef4444",
      recipeCount: 35,
      difficulty: "Moyen",
      category: "comfort",
      estimatedTime: "45-90 min",
      recipes: [
        { name: "Pot-au-feu grand-mère", time: "2h30", difficulty: "Moyen" },
        { name: "Gratin dauphinois crémeux", time: "1h15", difficulty: "Moyen" },
        { name: "Coq au vin traditionnel", time: "1h45", difficulty: "Difficile" },
        { name: "Blanquette de veau", time: "2h", difficulty: "Moyen" }
      ],
      tags: ["Traditionnel", "Familial", "Mijotés"]
    },
    {
      id: 3,
      name: "Desserts d'Exception",
      description: "Créations sucrées raffinées pour impressionner et se faire plaisir",
      illustration: "🧁",
      color: "#f3e8ff",
      accent: "#8b5cf6",
      recipeCount: 22,
      difficulty: "Difficile",
      category: "dessert",
      featured: true,
      estimatedTime: "30-120 min",
      recipes: [
        { name: "Tarte au chocolat noir 70%", time: "45 min", difficulty: "Moyen" },
        { name: "Macarons colorés", time: "2h", difficulty: "Difficile" },
        { name: "Tiramisu authentique", time: "30 min", difficulty: "Facile" },
        { name: "Crème brûlée vanille", time: "40 min", difficulty: "Moyen" }
      ],
      tags: ["Raffiné", "Gourmand", "Technique"]
    },
    {
      id: 4,
      name: "Tour du Monde Culinaire",
      description: "Explorez les saveurs authentiques des quatre coins de la planète",
      illustration: "🌍",
      color: "#dcfce7",
      accent: "#10b981",
      recipeCount: 48,
      difficulty: "Moyen",
      category: "world",
      trending: true,
      estimatedTime: "30-60 min",
      recipes: [
        { name: "Paella valencienne", time: "45 min", difficulty: "Moyen" },
        { name: "Pad thaï aux crevettes", time: "25 min", difficulty: "Facile" },
        { name: "Sushi & maki maison", time: "1h", difficulty: "Difficile" },
        { name: "Curry indien épicé", time: "40 min", difficulty: "Moyen" }
      ],
      tags: ["Exotique", "Épicé", "Authentique"]
    },
    {
      id: 5,
      name: "Healthy & Éco-responsable",
      description: "Alimentation saine et durable pour votre bien-être et celui de la planète",
      illustration: "🥗",
      color: "#ecfdf5",
      accent: "#059669",
      recipeCount: 41,
      difficulty: "Facile",
      category: "healthy",
      featured: true,
      estimatedTime: "15-30 min",
      recipes: [
        { name: "Buddha bowl coloré", time: "20 min", difficulty: "Facile" },
        { name: "Quinoa aux légumes grillés", time: "25 min", difficulty: "Facile" },
        { name: "Green smoothie détox", time: "5 min", difficulty: "Facile" },
        { name: "Salade de kale massée", time: "15 min", difficulty: "Facile" }
      ],
      tags: ["Bio", "Vegan", "Détox"]
    },
    {
      id: 6,
      name: "Apéros & Convivialité",
      description: "Créez des moments inoubliables avec vos proches autour de délicieux amuse-bouches",
      illustration: "🍸",
      color: "#fef7ed",
      accent: "#f97316",
      recipeCount: 26,
      difficulty: "Facile",
      category: "appetizer",
      estimatedTime: "10-30 min",
      recipes: [
        { name: "Houmous maison onctueux", time: "10 min", difficulty: "Facile" },
        { name: "Bruschetta tomates basilic", time: "15 min", difficulty: "Facile" },
        { name: "Olives marinées aux herbes", time: "5 min", difficulty: "Facile" },
        { name: "Plateau de charcuterie", time: "20 min", difficulty: "Facile" }
      ],
      tags: ["Convivial", "Partage", "Festif"]
    },
    {
      id: 7,
      name: "Cuisine de Saison",
      description: "Savourez les produits frais au rythme des saisons",
      illustration: "🍂",
      color: "#fdf2f8",
      accent: "#ec4899",
      recipeCount: 33,
      difficulty: "Moyen",
      category: "seasonal",
      // Simplification : suppression des détails techniques
      recipes: [
        { name: "Velouté de potiron", difficulty: "Facile" },
        { name: "Salade d'été fraîcheur", difficulty: "Facile" },
        { name: "Ratatouille provençale", difficulty: "Moyen" },
        { name: "Tarte aux pommes", difficulty: "Moyen" }
      ],
      tags: ["Saisonnier", "Local", "Frais"]
    },
    {
      id: 8,
      name: "Express & Savoureux",
      description: "Solutions rapides pour cuisiner délicieux",
      illustration: "⚡",
      color: "#eff6ff",
      accent: "#3b82f6",
      recipeCount: 34,
      difficulty: "Facile",
      category: "quick",
      trending: true,
      recipes: [
        { name: "Pâtes carbonara express", difficulty: "Facile" },
        { name: "Salade Caesar", difficulty: "Facile" },
        { name: "Omelette aux herbes", difficulty: "Facile" },
        { name: "Wrap méditerranéen", difficulty: "Facile" }
      ],
      tags: ["Rapide", "Pratique", "Efficace"]
    },
    {
      id: 9,
      name: "Gastronomie de Fête",
      description: "Recettes d'exception pour marquer les grandes occasions avec élégance",
      illustration: "🎉",
      color: "#fffbeb",
      accent: "#f59e0b",
      recipeCount: 18,
      difficulty: "Expert",
      category: "gourmet",
      featured: true,
      estimatedTime: "60-180 min",
      recipes: [
        { name: "Foie gras mi-cuit maison", time: "2h", difficulty: "Expert" },
        { name: "Bûche de Noël chocolat", time: "3h", difficulty: "Difficile" },
        { name: "Saumon en croûte feuilletée", time: "1h30", difficulty: "Difficile" },
        { name: "Cocktails champagne", time: "15 min", difficulty: "Moyen" }
      ],
      tags: ["Gastronomie", "Fêtes", "Prestige"]
    }
  ]

  const filters = [
    { id: 'all', name: 'Toutes', icon: '📚' },
    { id: 'trending', name: 'Tendances', icon: '🔥' },
    { id: 'featured', name: 'Sélection', icon: '⭐' },
    { id: 'quick', name: 'Rapides', icon: '⚡' },
    { id: 'healthy', name: 'Healthy', icon: '🥗' }
  ]

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      setLoading(true)
      setCollections(defaultCollections)
    } catch (error) {
      logError('Error loading collections', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (collectionId) => {
    router.push(`/collection/${collectionId}`)
  }

  const handleFavoriteClick = (collectionId, e) => {
    e.stopPropagation()
    setFavorites(prev => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
      } else {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  const filteredCollections = collections.filter(collection => {
    switch (activeFilter) {
      case 'trending': return collection.trending
      case 'featured': return collection.featured
      case 'quick': return collection.category === 'quick'
      case 'healthy': return collection.category === 'healthy'
      default: return true
    }
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement des collections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Collections - COCO</title>
        <meta name="description" content="Découvrez nos collections thématiques de recettes" />
      </Head>

      {/* Header amélioré */}
      <header className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            📚 Collections Culinaires
          </h1>
          <p className={styles.subtitle}>
            Explorez nos sélections thématiques soigneusement préparées
          </p>
          <div className={styles.headerStats}>
            <span className={styles.stat}>
              <span className={styles.statNumber}>{collections.length}</span>
              <span className={styles.statLabel}>Collections</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statNumber}>
                {collections.reduce((sum, c) => sum + c.recipeCount, 0)}
              </span>
              <span className={styles.statLabel}>Recettes</span>
            </span>
          </div>
        </div>
      </header>

      {/* Filtres */}
      <section className={styles.filtersSection}>
        <div className={styles.filters}>
          {filters.map(filter => (
            <button
              key={filter.id}
              className={`${styles.filterButton} ${activeFilter === filter.id ? styles.active : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <span className={styles.filterIcon}>{filter.icon}</span>
              <span className={styles.filterName}>{filter.name}</span>
              <span className={styles.filterCount}>
                ({filter.id === 'all' ? collections.length : 
                  collections.filter(c => {
                    switch (filter.id) {
                      case 'trending': return c.trending
                      case 'featured': return c.featured
                      case 'quick': return c.category === 'quick'
                      case 'healthy': return c.category === 'healthy'
                      default: return true
                    }
                  }).length})
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Grille des collections */}
      <main className={styles.collectionsGrid}>
        {filteredCollections.map((collection, index) => {
          const isFavorite = favorites.has(collection.id)
          
          return (
            <div
              key={collection.id}
              className={`${styles.collectionCard} ${collection.featured ? styles.featured : ''} ${collection.trending ? styles.trending : ''}`}
              onClick={() => handleCardClick(collection.id)}
              style={{ 
                '--card-color': collection.color, 
                '--accent-color': collection.accent,
                '--animation-delay': `${index * 0.1}s`
              }}
            >
              {/* Illustration */}
              <div className={styles.cardIllustration}>
                <span className={styles.illustrationEmoji}>{collection.illustration}</span>
              </div>
              
              {/* Contenu */}
              <div className={styles.cardContent}>
                <h3 className={styles.collectionName}>{collection.name}</h3>
                <p className={styles.collectionDescription}>
                  {collection.description}
                </p>
                
                <div className={styles.cardMeta}>
                  <span className={styles.recipeCount}>
                    {collection.recipeCount} recettes
                  </span>
                  <span className={`${styles.difficultyBadge} ${styles[collection.difficulty.toLowerCase()]}`}>
                    {collection.difficulty}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {filteredCollections.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>Aucune collection trouvée</h3>
          <p>Essayez un autre filtre pour découvrir nos collections !</p>
          <button 
            className={styles.resetButton}
            onClick={() => setActiveFilter('all')}
          >
            Voir toutes les collections
          </button>
        </div>
      )}
    </div>
  )
}
