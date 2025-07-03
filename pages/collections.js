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

  // Collections par défaut avec illustrations
  const defaultCollections = [
    {
      id: 1,
      name: "Petits Déjeuners",
      description: "Commencez la journée avec nos recettes matinales délicieuses",
      illustration: "🌅",
      color: "#fef3c7",
      accent: "#f59e0b",
      recipeCount: 25,
      difficulty: "Facile",
      recipes: ["Pancakes moelleux", "Granola maison", "Smoothie bowl", "Toast à l'avocat"]
    },
    {
      id: 2,
      name: "Plats Réconfortants",
      description: "Des recettes qui réchauffent le cœur et l'âme",
      illustration: "🍲",
      color: "#fecaca",
      accent: "#ef4444",
      recipeCount: 32,
      difficulty: "Moyen",
      recipes: ["Pot-au-feu", "Gratin dauphinois", "Coq au vin", "Blanquette de veau"]
    },
    {
      id: 3,
      name: "Desserts Gourmands",
      description: "Succombez à nos créations sucrées irrésistibles",
      illustration: "🧁",
      color: "#f3e8ff",
      accent: "#8b5cf6",
      recipeCount: 18,
      difficulty: "Difficile",
      recipes: ["Tarte au chocolat", "Macarons", "Tiramisu", "Crème brûlée"]
    },
    {
      id: 4,
      name: "Cuisine du Monde",
      description: "Voyagez à travers les saveurs internationales",
      illustration: "🌍",
      color: "#dcfce7",
      accent: "#10b981",
      recipeCount: 45,
      difficulty: "Moyen",
      recipes: ["Paella espagnole", "Pad thaï", "Sushi", "Curry indien"]
    },
    {
      id: 5,
      name: "Healthy & Bio",
      description: "Des recettes saines et respectueuses de l'environnement",
      illustration: "🥗",
      color: "#ecfdf5",
      accent: "#059669",
      recipeCount: 38,
      difficulty: "Facile",
      recipes: ["Buddha bowl", "Quinoa aux légumes", "Smoothie détox", "Salade de kale"]
    },
    {
      id: 6,
      name: "Apéros & Tapas",
      description: "Parfait pour vos soirées entre amis",
      illustration: "🍸",
      color: "#fef7ed",
      accent: "#f97316",
      recipeCount: 22,
      difficulty: "Facile",
      recipes: ["Houmous maison", "Bruschetta", "Olives marinées", "Charcuterie board"]
    },
    {
      id: 7,
      name: "Cuisine de Saison",
      description: "Des recettes qui suivent le rythme des saisons",
      illustration: "🍂",
      color: "#fdf2f8",
      accent: "#ec4899",
      recipeCount: 29,
      difficulty: "Moyen",
      recipes: ["Soupe de potiron", "Salade d'été", "Ratatouille", "Tarte aux pommes"]
    },
    {
      id: 8,
      name: "Express 15 min",
      description: "Quand le temps presse mais pas l'envie de bien manger",
      illustration: "⚡",
      color: "#eff6ff",
      accent: "#3b82f6",
      recipeCount: 31,
      difficulty: "Facile",
      recipes: ["Pâtes carbonara", "Salade Caesar", "Omelette aux herbes", "Wrap au thon"]
    },
    {
      id: 9,
      name: "Spécial Fêtes",
      description: "Des recettes exceptionnelles pour vos occasions spéciales",
      illustration: "🎉",
      color: "#fdfbfb",
      accent: "#facc15",
      recipeCount: 15,
      difficulty: "Expert",
      recipes: ["Foie gras mi-cuit", "Bûche de Noël", "Saumon en croûte", "Champagne cocktails"]
    }
  ]

  useEffect(() => {
    loadCollections()
  }, [])

  const loadCollections = async () => {
    try {
      setLoading(true)
      
      // Utiliser les collections par défaut pour l'instant
      setCollections(defaultCollections)
      
      // Code pour charger depuis Supabase si nécessaire
      // const { data, error } = await supabase
      //   .from('collections')
      //   .select('*')
      //   .eq('status', 'active')
      //   .order('created_at', { ascending: false })
      
    } catch (error) {
      logError('Error loading collections', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (collectionId) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
      } else {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  const handleExploreClick = (collection, e) => {
    e.stopPropagation()
    // Navigation vers la collection spécifique
    router.push(`/collection/${collection.id}`)
  }

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

      {/* Header moderne */}
      <header className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            📚 Collections
          </h1>
          <p className={styles.subtitle}>
            Explorez nos sélections thématiques de recettes
          </p>
        </div>
      </header>

      {/* Grille des collections */}
      <main className={styles.collectionsGrid}>
        {collections.map(collection => {
          const isFlipped = flippedCards.has(collection.id)
          
          return (
            <div
              key={collection.id}
              className={`${styles.collectionCard} ${isFlipped ? styles.flipped : ''}`}
              onClick={() => handleCardClick(collection.id)}
              style={{ '--card-color': collection.color, '--accent-color': collection.accent }}
            >
              {/* Face avant (illustration) */}
              <div className={styles.cardFront}>
                <div className={styles.cardIllustration}>
                  <div className={styles.illustrationBg}>
                    <span className={styles.illustrationEmoji}>{collection.illustration}</span>
                  </div>
                  <div className={styles.cardBadge}>
                    {collection.recipeCount} recettes
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.collectionName}>{collection.name}</h3>
                  <p className={styles.collectionDescription}>
                    {collection.description}
                  </p>
                  <div className={styles.cardMeta}>
                    <span className={styles.difficultyBadge}>
                      {collection.difficulty}
                    </span>
                    <span className={styles.cardHint}>
                      👆 Cliquez pour plus
                    </span>
                  </div>
                </div>
              </div>

              {/* Face arrière (détails) */}
              <div className={styles.cardBack}>
                <div className={styles.backHeader}>
                  <div className={styles.backIllustration}>
                    {collection.illustration}
                  </div>
                  <h3 className={styles.backTitle}>{collection.name}</h3>
                  <span className={styles.backCount}>{collection.recipeCount} recettes</span>
                </div>
                
                <div className={styles.recipesList}>
                  <h4>Recettes populaires :</h4>
                  {collection.recipes.map((recipe, index) => (
                    <div key={index} className={styles.recipeItem}>
                      <span className={styles.recipeIcon}>🍽️</span>
                      <span className={styles.recipeName}>{recipe}</span>
                    </div>
                  ))}
                </div>
                
                <div className={styles.cardActions}>
                  <button
                    className={styles.exploreButton}
                    onClick={(e) => handleExploreClick(collection, e)}
                  >
                    🔍 Explorer la collection
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {collections.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>Aucune collection disponible</h3>
          <p>Les collections de recettes apparaîtront ici bientôt !</p>
        </div>
      )}
    </div>
  )
}
