import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
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
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    loadCollections()
  }, [])

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
        .order('created_at', { ascending: false })
        .limit(9)

      if (error) throw error

      setCollections(data || [])
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

  const handleCardDoubleClick = (collection) => {
    setSelectedCollection(collection)
    setShowDetailModal(true)
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
        <meta name="description" content="Découvrez les collections de recettes COCO" />
      </Head>

      {/* Header simple */}
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

      {/* Grille 3x3 des collections */}
      <main className={styles.collectionsGrid}>
        {collections.map(collection => {
          const isFlipped = flippedCards.has(collection.id)
          const recipeCount = collection.collection_recipes?.length || 0
          
          return (
            <div
              key={collection.id}
              className={`${styles.collectionCard} ${isFlipped ? styles.flipped : ''}`}
              onClick={() => handleCardClick(collection.id)}
              onDoubleClick={() => handleCardDoubleClick(collection)}
            >
              {/* Face avant (recto) */}
              <div className={styles.cardFront}>
                <div className={styles.cardImage}>
                  <Image
                    src={collection.image || '/placeholder-collection.jpg'}
                    alt={collection.name}
                    fill
                    className={styles.collectionImage}
                  />
                  <div className={styles.cardOverlay}>
                    <div className={styles.cardBadge}>
                      {recipeCount} recette{recipeCount > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.collectionName}>{collection.name}</h3>
                  <p className={styles.collectionDescription}>
                    {collection.description?.substring(0, 60)}
                    {collection.description?.length > 60 ? '...' : ''}
                  </p>
                  <div className={styles.cardHint}>
                    <span>👆 Cliquez pour retourner</span>
                  </div>
                </div>
              </div>

              {/* Face arrière (verso) */}
              <div className={styles.cardBack}>
                <div className={styles.backHeader}>
                  <h3 className={styles.backTitle}>{collection.name}</h3>
                  <span className={styles.backCount}>{recipeCount} recettes</span>
                </div>
                
                <div className={styles.recipesList}>
                  {collection.collection_recipes?.slice(0, 4).map((recipe, index) => (
                    <div key={index} className={styles.recipeItem}>
                      <span className={styles.recipeIcon}>🍽️</span>
                      <span className={styles.recipeName}>
                        {recipe.recipes?.title || 'Recette sans nom'}
                      </span>
                    </div>
                  ))}
                  {recipeCount > 4 && (
                    <div className={styles.recipeItem}>
                      <span className={styles.recipeIcon}>➕</span>
                      <span className={styles.recipeName}>
                        et {recipeCount - 4} autres recettes...
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={styles.cardActions}>
                  <button
                    className={styles.exploreButton}
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/collection/${collection.id}`)
                    }}
                  >
                    🔍 Explorer
                  </button>
                  <div className={styles.cardHint}>
                    <span>Double-clic pour plus d'infos</span>
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
              <p className={styles.modalSubtitle}>
                {selectedCollection.collection_recipes?.length || 0} recettes
              </p>
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
              
              <p className={styles.modalDescription}>
                {selectedCollection.description}
              </p>
              
              <div className={styles.modalRecipesList}>
                <h3>Recettes de cette collection</h3>
                {selectedCollection.collection_recipes?.map((recipe, index) => (
                  <div key={index} className={styles.modalRecipeItem}>
                    <span className={styles.modalRecipeName}>
                      {recipe.recipes?.title}
                    </span>
                    <span className={styles.modalRecipeCategory}>
                      {recipe.recipes?.category}
                    </span>
                  </div>
                ))}
              </div>
              
              <button
                className={styles.modalExploreButton}
                onClick={() => {
                  setShowDetailModal(false)
                  router.push(`/collection/${selectedCollection.id}`)
                }}
              >
                🍽️ Découvrir les recettes
              </button>
            </div>
          </div>
        </div>
      )}

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
