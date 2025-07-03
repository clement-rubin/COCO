import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabase'
import { logInfo, logError } from '../utils/logger'
import styles from '../styles/Pokedex.module.css'

export default function Collections() {
  const { user } = useAuth()
  const router = useRouter()
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [flippedCards, setFlippedCards] = useState(new Set())
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [userProgress, setUserProgress] = useState({
    discovered: new Set(),
    completed: new Set(),
    favorites: new Set()
  })

  // Catégories spéciales du Pokédex culinaire
  const categories = [
    { 
      id: 'all', 
      name: 'Toutes', 
      icon: '📚', 
      color: '#6366f1',
      description: 'Toutes les collections disponibles'
    },
    { 
      id: 'legendaire', 
      name: 'Légendaires', 
      icon: '👑', 
      color: '#fbbf24',
      description: 'Collections rares et exceptionnelles'
    },
    { 
      id: 'saisonnier', 
      name: 'Saisonnières', 
      icon: '🍂', 
      color: '#f97316',
      description: 'Collections qui changent selon les saisons'
    },
    { 
      id: 'regional', 
      name: 'Régionales', 
      icon: '🗺️', 
      color: '#10b981',
      description: 'Spécialités culinaires du monde entier'
    },
    { 
      id: 'mystique', 
      name: 'Mystiques', 
      icon: '✨', 
      color: '#8b5cf6',
      description: 'Collections aux recettes secrètes'
    },
    { 
      id: 'defi', 
      name: 'Défis', 
      icon: '⚔️', 
      color: '#ef4444',
      description: 'Collections de défis culinaires'
    }
  ]

  useEffect(() => {
    loadCollections()
    loadUserProgress()
  }, [user])

  const loadCollections = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          collection_recipes (
            id,
            recipes (
              id,
              title,
              image,
              category,
              difficulty
            )
          )
        `)
        .eq('status', 'active')
        .order('rarity_level', { ascending: false })

      if (error) throw error

      // Enrichir les collections avec des données Pokédex
      const enrichedCollections = data.map(collection => ({
        ...collection,
        pokedex_number: collection.id.toString().padStart(3, '0'),
        rarity: getRarityFromLevel(collection.rarity_level || 1),
        element_type: getElementType(collection.type),
        stats: {
          recipes: collection.collection_recipes?.length || 0,
          difficulty: calculateAverageDifficulty(collection.collection_recipes),
          completion: calculateUserCompletion(collection.id)
        }
      }))

      setCollections(enrichedCollections)
    } catch (error) {
      logError('Error loading collections', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserProgress = async () => {
    if (!user) return

    try {
      // Charger les données de progression utilisateur
      const { data: progressData } = await supabase
        .from('user_collection_progress')
        .select('*')
        .eq('user_id', user.id)

      if (progressData) {
        setUserProgress({
          discovered: new Set(progressData.filter(p => p.discovered).map(p => p.collection_id)),
          completed: new Set(progressData.filter(p => p.completed).map(p => p.collection_id)),
          favorites: new Set(progressData.filter(p => p.favorited).map(p => p.collection_id))
        })
      }
    } catch (error) {
      logError('Error loading user progress', error)
    }
  }

  const getRarityFromLevel = (level) => {
    const rarities = {
      1: { name: 'Commun', color: '#9ca3af', icon: '⚪' },
      2: { name: 'Rare', color: '#3b82f6', icon: '🔵' },
      3: { name: 'Épique', color: '#8b5cf6', icon: '🟣' },
      4: { name: 'Légendaire', color: '#f59e0b', icon: '🟡' },
      5: { name: 'Mythique', color: '#ef4444', icon: '🔴' }
    }
    return rarities[level] || rarities[1]
  }

  const getElementType = (type) => {
    const elements = {
      'weekly': { name: 'Feu', color: '#ef4444', icon: '🔥' },
      'monthly': { name: 'Eau', color: '#3b82f6', icon: '💧' },
      'seasonal': { name: 'Terre', color: '#84cc16', icon: '🌿' },
      'special': { name: 'Air', color: '#06b6d4', icon: '💨' },
      'challenge': { name: 'Électrique', color: '#eab308', icon: '⚡' }
    }
    return elements[type] || elements['weekly']
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

    // Marquer comme découvert
    if (user && !userProgress.discovered.has(collectionId)) {
      markAsDiscovered(collectionId)
    }
  }

  const handleCardDoubleClick = (collection) => {
    setSelectedCollection(collection)
    setShowDetailModal(true)
  }

  const markAsDiscovered = async (collectionId) => {
    try {
      await supabase
        .from('user_collection_progress')
        .upsert({
          user_id: user.id,
          collection_id: collectionId,
          discovered: true,
          discovered_at: new Date().toISOString()
        })

      setUserProgress(prev => ({
        ...prev,
        discovered: new Set([...prev.discovered, collectionId])
      }))
    } catch (error) {
      logError('Error marking collection as discovered', error)
    }
  }

  const filteredCollections = collections.filter(collection => {
    if (activeCategory === 'all') return true
    
    const categoryMap = {
      'legendaire': collection.rarity_level >= 4,
      'saisonnier': collection.type === 'seasonal',
      'regional': collection.category === 'regional',
      'mystique': collection.rarity_level === 5,
      'defi': collection.type === 'challenge'
    }
    
    return categoryMap[activeCategory] || false
  })

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pokeball}>
          <div className={styles.pokeballInner}></div>
        </div>
        <p>Chargement du Pokédex culinaire...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Pokédex Culinaire - COCO</title>
        <meta name="description" content="Découvrez toutes les collections de recettes dans notre Pokédex culinaire" />
      </Head>

      {/* Header Pokédex */}
      <header className={styles.pokedexHeader}>
        <button 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ←
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📱</span>
            Pokédex Culinaire
          </h1>
          <div className={styles.stats}>
            <span className={styles.stat}>
              <span className={styles.statNumber}>{userProgress.discovered.size}</span>
              <span className={styles.statLabel}>Découvertes</span>
            </span>
            <span className={styles.stat}>
              <span className={styles.statNumber}>{collections.length}</span>
              <span className={styles.statLabel}>Total</span>
            </span>
          </div>
        </div>
        <div className={styles.headerLights}>
          <div className={styles.light}></div>
          <div className={styles.light}></div>
          <div className={styles.light}></div>
        </div>
      </header>

      {/* Sélecteur de catégories */}
      <div className={styles.categorySelector}>
        <div className={styles.categoryTabs}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`${styles.categoryTab} ${activeCategory === category.id ? styles.active : ''}`}
              style={{ '--category-color': category.color }}
            >
              <span className={styles.categoryIcon}>{category.icon}</span>
              <span className={styles.categoryName}>{category.name}</span>
              <span className={styles.categoryCount}>
                ({activeCategory === category.id ? filteredCollections.length : 
                  collections.filter(c => {
                    if (category.id === 'all') return true
                    const categoryMap = {
                      'legendaire': c.rarity_level >= 4,
                      'saisonnier': c.type === 'seasonal',
                      'regional': c.category === 'regional',
                      'mystique': c.rarity_level === 5,
                      'defi': c.type === 'challenge'
                    }
                    return categoryMap[category.id] || false
                  }).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grille des cartes Pokédex */}
      <main className={styles.pokedexGrid}>
        {filteredCollections.map(collection => {
          const isFlipped = flippedCards.has(collection.id)
          const isDiscovered = userProgress.discovered.has(collection.id)
          
          return (
            <div
              key={collection.id}
              className={`${styles.pokemonCard} ${isFlipped ? styles.flipped : ''} ${!isDiscovered ? styles.mystery : ''}`}
              onClick={() => handleCardClick(collection.id)}
              onDoubleClick={() => handleCardDoubleClick(collection)}
            >
              {/* Face avant (recto) */}
              <div className={styles.cardFront}>
                <div className={styles.cardHeader}>
                  <span className={styles.pokedexNumber}>#{collection.pokedex_number}</span>
                  <span 
                    className={styles.rarityBadge}
                    style={{ backgroundColor: collection.rarity.color }}
                  >
                    {collection.rarity.icon}
                  </span>
                </div>
                
                <div className={styles.cardImage}>
                  {isDiscovered ? (
                    <Image
                      src={collection.image || '/placeholder-collection.jpg'}
                      alt={collection.name}
                      fill
                      className={styles.collectionImage}
                    />
                  ) : (
                    <div className={styles.mysteryImage}>
                      <span className={styles.mysteryIcon}>❓</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.collectionName}>
                    {isDiscovered ? collection.name : '???'}
                  </h3>
                  <div className={styles.elementType}>
                    <span 
                      className={styles.typeChip}
                      style={{ backgroundColor: collection.element_type.color }}
                    >
                      {collection.element_type.icon} {collection.element_type.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Face arrière (verso) */}
              <div className={styles.cardBack}>
                <div className={styles.backHeader}>
                  <h3 className={styles.backTitle}>{collection.name}</h3>
                  <span className={styles.backNumber}>#{collection.pokedex_number}</span>
                </div>
                
                <div className={styles.stats}>
                  <div className={styles.statBar}>
                    <span className={styles.statName}>Recettes</span>
                    <div className={styles.statValue}>
                      <div 
                        className={styles.statFill}
                        style={{ width: `${Math.min(collection.stats.recipes / 20 * 100, 100)}%` }}
                      ></div>
                      <span className={styles.statText}>{collection.stats.recipes}</span>
                    </div>
                  </div>
                  
                  <div className={styles.statBar}>
                    <span className={styles.statName}>Difficulté</span>
                    <div className={styles.statValue}>
                      <div 
                        className={styles.statFill}
                        style={{ width: `${collection.stats.difficulty * 20}%` }}
                      ></div>
                      <span className={styles.statText}>{collection.stats.difficulty}/5</span>
                    </div>
                  </div>
                  
                  <div className={styles.statBar}>
                    <span className={styles.statName}>Progression</span>
                    <div className={styles.statValue}>
                      <div 
                        className={styles.statFill}
                        style={{ width: `${collection.stats.completion}%` }}
                      ></div>
                      <span className={styles.statText}>{collection.stats.completion}%</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.description}>
                  <p>{collection.description}</p>
                </div>
                
                <div className={styles.abilities}>
                  <h4>Spécialités</h4>
                  <div className={styles.abilityList}>
                    {collection.collection_recipes?.slice(0, 3).map((recipe, index) => (
                      <span key={index} className={styles.ability}>
                        {recipe.recipes?.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </main>

      {/* Modal de détail */}
      {showDetailModal && selectedCollection && (
        <div className={styles.modal} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => setShowDetailModal(false)}
            >
              ✕
            </button>
            
            <div className={styles.modalHeader}>
              <h2>{selectedCollection.name}</h2>
              <span className={styles.modalNumber}>#{selectedCollection.pokedex_number}</span>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.modalImage}>
                <Image
                  src={selectedCollection.image || '/placeholder-collection.jpg'}
                  alt={selectedCollection.name}
                  fill
                  className={styles.collectionImageLarge}
                />
              </div>
              
              <div className={styles.modalInfo}>
                <p className={styles.modalDescription}>{selectedCollection.description}</p>
                
                <div className={styles.recipesList}>
                  <h3>Recettes de cette collection</h3>
                  {selectedCollection.collection_recipes?.map((recipe, index) => (
                    <div key={index} className={styles.recipeItem}>
                      <span className={styles.recipeName}>{recipe.recipes?.title}</span>
                      <span className={styles.recipeCategory}>{recipe.recipes?.category}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  className={styles.exploreButton}
                  onClick={() => router.push(`/collection/${selectedCollection.id}`)}
                >
                  🔍 Explorer cette collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredCollections.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>Aucune collection dans cette catégorie</h3>
          <p>Explorez d'autres catégories pour découvrir plus de collections !</p>
        </div>
      )}
    </div>
  )
}

// Fonctions utilitaires
function calculateAverageDifficulty(recipes) {
  if (!recipes || recipes.length === 0) return 1
  const difficulties = { 'Facile': 1, 'Moyen': 2, 'Difficile': 3, 'Expert': 4, 'Master': 5 }
  const sum = recipes.reduce((acc, recipe) => acc + (difficulties[recipe.recipes?.difficulty] || 1), 0)
  return Math.round(sum / recipes.length)
}

function calculateUserCompletion(collectionId) {
  // Logique pour calculer le pourcentage de completion de l'utilisateur
  return Math.floor(Math.random() * 100) // Placeholder
}
