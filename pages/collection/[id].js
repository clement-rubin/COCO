import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../components/AuthContext'
import RecipeCard from '../../components/RecipeCard'
import { logInfo, logError } from '../../utils/logger'
import styles from '../../styles/CollectionDetail.module.css'

export default function CollectionDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const [collection, setCollection] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('popularity')

  // Collections data (same as collections page)
  const collectionsData = {
    1: {
      id: 1,
      name: "Petits Déjeuners Vitaminés",
      description: "Commencez votre journée du bon pied avec des recettes énergisantes et gourmandes",
      illustration: "🌅",
      color: "#fef3c7",
      accent: "#f59e0b",
      recipes: [
        {
          id: 101,
          title: "Pancakes aux myrtilles",
          description: "Des pancakes moelleux garnis de myrtilles fraîches",
          image: "/placeholder-recipe.jpg",
          author: "Chef Sarah",
          prepTime: "15 min",
          difficulty: "Facile",
          category: "Petit déjeuner",
          ingredients: ["2 œufs", "250ml de lait", "200g de farine", "150g de myrtilles"],
          instructions: [
            { step: 1, instruction: "Mélanger les œufs et le lait" },
            { step: 2, instruction: "Incorporer la farine tamisée" },
            { step: 3, instruction: "Ajouter les myrtilles délicatement" },
            { step: 4, instruction: "Cuire dans une poêle chaude" }
          ]
        },
        {
          id: 102,
          title: "Granola maison croustillant",
          description: "Un mélange parfait d'avoine, noix et miel pour un petit-déjeuner sain",
          image: "/placeholder-recipe.jpg",
          author: "Chef Marie",
          prepTime: "10 min",
          cookTime: "25 min",
          difficulty: "Facile",
          category: "Petit déjeuner",
          ingredients: ["300g d'avoine", "100g de noix", "50ml de miel", "2 c.à.s d'huile"],
          instructions: [
            { step: 1, instruction: "Préchauffer le four à 160°C" },
            { step: 2, instruction: "Mélanger tous les ingrédients secs" },
            { step: 3, instruction: "Ajouter le miel et l'huile" },
            { step: 4, instruction: "Étaler et cuire 25 minutes" }
          ]
        },
        {
          id: 103,
          title: "Smoothie bowl exotique",
          description: "Un bol de fraîcheur tropical pour démarrer en beauté",
          image: "/placeholder-recipe.jpg",
          author: "Chef Julie",
          prepTime: "10 min",
          difficulty: "Facile",
          category: "Petit déjeuner",
          ingredients: ["1 banane", "100g de mangue", "200ml de lait de coco", "Toppings au choix"],
          instructions: [
            { step: 1, instruction: "Mixer les fruits congelés avec le lait de coco" },
            { step: 2, instruction: "Verser dans un bol" },
            { step: 3, instruction: "Disposer les toppings harmonieusement" }
          ]
        }
      ]
    },
    // Add more collections data as needed...
    2: {
      id: 2,
      name: "Plats Réconfortants",
      description: "Des recettes traditionnelles qui réchauffent le cœur",
      illustration: "🍲",
      color: "#fecaca",
      accent: "#ef4444",
      recipes: [
        {
          id: 201,
          title: "Pot-au-feu grand-mère",
          description: "La recette traditionnelle qui réunit toute la famille",
          image: "/placeholder-recipe.jpg",
          author: "Chef Pierre",
          prepTime: "30 min",
          cookTime: "2h30",
          difficulty: "Moyen",
          category: "Plat principal",
          ingredients: ["1kg de bœuf", "4 carottes", "2 navets", "1 chou", "Bouquet garni"],
          instructions: [
            { step: 1, instruction: "Faire revenir la viande dans une cocotte" },
            { step: 2, instruction: "Ajouter les légumes et couvrir d'eau" },
            { step: 3, instruction: "Laisser mijoter 2h30 à feu doux" },
            { step: 4, instruction: "Servir avec des cornichons et moutarde" }
          ]
        }
      ]
    }
  }

  useEffect(() => {
    if (id) {
      loadCollection()
    }
  }, [id])

  const loadCollection = async () => {
    try {
      setLoading(true)
      
      // Simulate API call
      setTimeout(() => {
        const collectionData = collectionsData[id]
        if (collectionData) {
          setCollection(collectionData)
          setRecipes(collectionData.recipes)
        } else {
          router.push('/collections')
        }
        setLoading(false)
      }, 500)

    } catch (error) {
      logError('Error loading collection', error)
      setLoading(false)
    }
  }

  const handleRecipeClick = (recipeId) => {
    router.push(`/recipe/${recipeId}`)
  }

  const sortedRecipes = [...recipes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title)
      case 'difficulty':
        const difficultyOrder = { 'Facile': 1, 'Moyen': 2, 'Difficile': 3 }
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
      case 'time':
        return parseInt(a.prepTime) - parseInt(b.prepTime)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement de la collection...</p>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Collection non trouvée</h2>
          <button onClick={() => router.push('/collections')}>
            Retour aux collections
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{collection.name} - COCO</title>
        <meta name="description" content={collection.description} />
      </Head>

      {/* Header */}
      <header className={styles.header} style={{ '--accent-color': collection.accent, '--bg-color': collection.color }}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          ← Retour
        </button>
        
        <div className={styles.headerContent}>
          <div className={styles.illustration}>{collection.illustration}</div>
          <div className={styles.headerText}>
            <h1 className={styles.title}>{collection.name}</h1>
            <p className={styles.description}>{collection.description}</p>
            <div className={styles.stats}>
              <span className={styles.stat}>{recipes.length} recettes</span>
              <span className={styles.stat}>Tous niveaux</span>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.viewControls}>
          <button
            onClick={() => setViewMode('grid')}
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
          >
            ⊞ Grille
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
          >
            ☰ Liste
          </button>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.sortSelect}
        >
          <option value="popularity">Par popularité</option>
          <option value="name">Par nom</option>
          <option value="difficulty">Par difficulté</option>
          <option value="time">Par temps</option>
        </select>
      </div>

      {/* Recipes Grid */}
      <main className={`${styles.recipesContainer} ${viewMode === 'list' ? styles.listView : ''}`}>
        {sortedRecipes.map(recipe => (
          <div key={recipe.id} onClick={() => handleRecipeClick(recipe.id)}>
            <RecipeCard 
              recipe={{
                ...recipe,
                created_at: new Date().toISOString()
              }}
              showActions={false}
            />
          </div>
        ))}
      </main>

      {recipes.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🍽️</div>
          <h3>Cette collection est vide</h3>
          <p>Les recettes arrivent bientôt !</p>
        </div>
      )}
    </div>
  )
}
