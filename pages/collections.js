import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthContext'
import { logInfo as baseLogInfo, logError as baseLogError } from '../utils/logger'
import styles from '../styles/Collections.module.css'
import { createSafeImageUrl } from '../utils/imageUtils'

export default function Collections() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [collections, setCollections] = useState([])
  const [activeTab, setActiveTab] = useState('featured')
  const [loading, setLoading] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [userRecipes, setUserRecipes] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [userLikes, setUserLikes] = useState(new Set())
  const [pageLogs, setPageLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)

  // Helpers pour logger
  const logInfo = (message, data = {}) => {
    setPageLogs(logs => [
      {
        id: Date.now() + Math.random(),
        type: 'info',
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString()
      },
      ...logs.slice(0, 99)
    ])
    baseLogInfo(message, data)
  }
  
  const logError = (message, data = {}) => {
    setPageLogs(logs => [
      {
        id: Date.now() + Math.random(),
        type: 'error',
        message,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString()
      },
      ...logs.slice(0, 99)
    ])
    baseLogError(message, data)
  }

  useEffect(() => {
    logInfo('Collections page mounted', { user: user?.id })
    loadCollections()
    if (user) {
      loadUserRecipes()
      loadUserLikes()
    }
    
    // Animation progressive des cartes
    const cards = document.querySelectorAll(`.${styles.collectionCard}`)
    cards.forEach((card, index) => {
      card.style.opacity = '0'
      card.style.transform = 'translateY(20px)'
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        card.style.opacity = '1'
        card.style.transform = 'translateY(0)'
      }, index * 100)
    })
  }, [user, activeTab])

  const loadCollections = async () => {
    try {
      setLoading(true)
      logInfo('Loading collections from supabase')
      
      let query = supabase
        .from('collections')
        .select(`
          *,
          collection_recipes (
            id,
            recipe_id,
            user_id,
            likes_count,
            featured,
            recipes (
              id,
              title,
              image,
              author,
              category
            )
          )
        `)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

      // Filtrer selon l'onglet actif
      if (activeTab !== 'all') {
        if (activeTab === 'featured') {
          query = query.eq('featured', true)
        } else if (activeTab === 'weekly') {
          query = query.eq('type', 'weekly')
        } else if (activeTab === 'seasonal') {
          query = query.eq('type', 'seasonal')
        } else if (activeTab === 'special') {
          query = query.eq('type', 'special')
        }
      }

      const { data, error } = await query

      if (error) throw error

      setCollections(data || [])
      logInfo('Collections loaded', { count: data?.length || 0 })
    } catch (error) {
      logError('Error loading collections', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserRecipes = async () => {
    if (!user) return
    
    try {
      logInfo('Loading user recipes', { userId: user.id })
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image, created_at, category')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setUserRecipes(data || [])
      logInfo('User recipes loaded', { count: data?.length || 0 })
    } catch (error) {
      logError('Error loading user recipes', error)
    }
  }

  const loadUserLikes = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('collection_likes')
        .select('collection_id')
        .eq('user_id', user.id)

      if (error) throw error

      setUserLikes(new Set(data?.map(like => like.collection_id) || []))
    } catch (error) {
      logError('Error loading user likes', error)
    }
  }

  const toggleCollectionLike = async (collectionId) => {
    if (!user) {
      alert('Connectez-vous pour aimer les collections')
      return
    }

    const isLiked = userLikes.has(collectionId)
    
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('collection_likes')
          .delete()
          .eq('collection_id', collectionId)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        setUserLikes(prev => {
          const newSet = new Set(prev)
          newSet.delete(collectionId)
          return newSet
        })
      } else {
        const { error } = await supabase
          .from('collection_likes')
          .insert({
            collection_id: collectionId,
            user_id: user.id
          })
        
        if (error) throw error
        
        setUserLikes(prev => new Set([...prev, collectionId]))
      }

      // Mettre à jour le compteur local
      setCollections(prev => prev.map(collection => {
        if (collection.id === collectionId) {
          return {
            ...collection,
            likes_count: collection.likes_count + (isLiked ? -1 : 1)
          }
        }
        return collection
      }))

      logInfo('Collection like toggled', { collectionId, isLiked: !isLiked })
    } catch (error) {
      logError('Error toggling collection like', error)
      alert('Erreur lors de l\'action. Veuillez réessayer.')
    }
  }

  const addRecipeToCollection = async (collectionId, recipeId) => {
    if (!user) return

    setSubmitting(true)
    try {
      logInfo('Adding recipe to collection', { collectionId, recipeId })
      
      const { error } = await supabase
        .from('collection_recipes')
        .insert({
          collection_id: collectionId,
          recipe_id: recipeId,
          user_id: user.id
        })

      if (error) throw error

      setShowAddModal(false)
      await loadCollections()
      logInfo('Recipe added to collection successfully')
      alert('Recette ajoutée à la collection avec succès !')
      
    } catch (error) {
      logError('Error adding recipe to collection', error)
      if (error.code === '23505') {
        alert('Cette recette est déjà dans la collection')
      } else {
        alert('Erreur lors de l\'ajout: ' + error.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getCollectionTypeLabel = (type) => {
    const types = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuelle',
      seasonal: 'Saisonnière',
      special: 'Spéciale'
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement des collections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Collections - COCO</title>
        <meta name="description" content="Découvrez les collections thématiques de recettes" />
      </Head>

      {/* Onglet Logs */}
      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 20 }}>
        <button
          onClick={() => setShowLogs(true)}
          style={{
            background: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(30,41,59,0.15)',
            cursor: 'pointer'
          }}
        >
          🪵 Logs ({pageLogs.length})
        </button>
      </div>

      {/* Modal logs */}
      {showLogs && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '420px',
            maxWidth: '100vw',
            height: '100vh',
            background: 'white',
            boxShadow: '-4px 0 24px rgba(30,41,59,0.15)',
            padding: 0,
            overflowY: 'auto',
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>🪵 Logs Collections</span>
              <button onClick={() => setShowLogs(false)} style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#1e293b'
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {pageLogs.length === 0 ? (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Aucun log.</div>
              ) : (
                pageLogs.map(log => (
                  <div key={log.id} style={{
                    background: log.type === 'error' ? '#fee2e2' : '#f3f4f6',
                    border: `1px solid ${log.type === 'error' ? '#f87171' : '#e5e7eb'}`,
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 12,
                    fontSize: '0.97rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: log.type === 'error' ? '#dc2626' : '#0369a1' }}>
                        {log.type === 'error' ? 'Erreur' : 'Info'}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ fontWeight: 500 }}>{log.message}</div>
                    {log.data && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.92rem' }}>Détails</summary>
                        <pre style={{
                          background: '#f9fafb',
                          borderRadius: 8,
                          padding: 8,
                          fontSize: '0.92rem',
                          color: '#374151',
                          whiteSpace: 'pre-wrap'
                        }}>{log.data}</pre>
                      </details>
                    )}
                  </div>
                ))
              }
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
              <button
                onClick={() => setPageLogs([])}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Vider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <button 
          onClick={() => router.back()} 
          className={styles.backButton}
        >
          ← Retour
        </button>
        <div className={styles.headerContent}>
          <h1>📚 Collections</h1>
          <p>Découvrez les collections thématiques de recettes</p>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {[
            { id: 'featured', label: 'À la une', icon: '⭐' },
            { id: 'weekly', label: 'Hebdomadaires', icon: '📅' },
            { id: 'seasonal', label: 'Saisonnières', icon: '🍂' },
            { id: 'special', label: 'Spéciales', icon: '✨' },
            { id: 'all', label: 'Toutes', icon: '📚' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collections Grid */}
      <div className={styles.collectionsGrid}>
        {collections.map((collection, index) => (
          <div 
            key={collection.id} 
            className={`${styles.collectionCard} ${collection.type === 'weekly' ? styles.weeklyCollection : ''}`}
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            {collection.featured && (
              <div className={styles.featuredBadge}>
                ⭐ À la une
              </div>
            )}
            
            <div className={styles.collectionHeader}>
              <span className={styles.collectionEmoji}>{collection.emoji}</span>
              <h3 className={styles.collectionTitle}>{collection.title}</h3>
              <p className={styles.collectionDescription}>{collection.description}</p>
              
              <div className={styles.collectionMeta}>
                <span className={`${styles.collectionType} ${styles[collection.type]}`}>
                  {getCollectionTypeLabel(collection.type)}
                </span>
              </div>
            </div>

            <div className={styles.collectionStats}>
              <div className={styles.stat}>
                <span className={styles.statNumber}>{collection.recipe_count}</span>
                <span className={styles.statLabel}>Recettes</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>{collection.likes_count}</span>
                <span className={styles.statLabel}>J'aime</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statNumber}>{collection.views_count || 0}</span>
                <span className={styles.statLabel}>Vues</span>
              </div>
            </div>

            {/* Aperçu des recettes */}
            {collection.collection_recipes?.length > 0 && (
              <div className={styles.recipesPreview}>
                <h4 className={styles.recipesPreviewTitle}>Aperçu des recettes</h4>
                <div className={styles.recipesGrid}>
                  {collection.collection_recipes.slice(0, 4).map(collectionRecipe => {
                    const recipe = collectionRecipe.recipes
                    const recipeImage = createSafeImageUrl(recipe.image, '/placeholder-recipe.jpg')
                    
                    return (
                      <div 
                        key={collectionRecipe.id} 
                        className={styles.recipePreviewCard}
                        onClick={() => router.push(`/recipe/${recipe.id}`)}
                      >
                        <div className={styles.recipePreviewImage}>
                          <Image
                            src={recipeImage}
                            alt={recipe.title}
                            fill
                            className="object-cover"
                            unoptimized={recipe.image?.startsWith('data:')}
                          />
                        </div>
                        <div className={styles.recipePreviewContent}>
                          <h5 className={styles.recipePreviewTitle}>{recipe.title}</h5>
                          <div className={styles.recipePreviewLikes}>
                            <span>❤️ {collectionRecipe.likes_count}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.collectionActions}>
              <button
                onClick={() => toggleCollectionLike(collection.id)}
                className={`${styles.likeButton} ${userLikes.has(collection.id) ? styles.liked : ''}`}
                disabled={!user}
              >
                {userLikes.has(collection.id) ? '❤️' : '🤍'} J'aime
              </button>
              
              <button
                onClick={() => router.push(`/collection/${collection.id}`)}
                className={styles.viewButton}
              >
                Voir →
              </button>
              
              {user && (
                <button
                  onClick={() => {
                    setSelectedCollection(collection)
                    setShowAddModal(true)
                  }}
                  className={styles.addRecipeButton}
                  disabled={submitting}
                >
                  ➕ Ajouter
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {collections.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📚</span>
          <h3>Aucune collection trouvée</h3>
          <p>Les collections apparaîtront ici bientôt. Revenez plus tard pour découvrir de nouveaux thèmes !</p>
        </div>
      )}

      {/* Modal d'ajout de recette */}
      {showAddModal && selectedCollection && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Ajouter à "{selectedCollection.title}"</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <p>Choisissez une recette à ajouter à cette collection :</p>
              <div className={styles.recipesGrid}>
                {userRecipes.map(recipe => {
                  const recipeImage = createSafeImageUrl(recipe.image, '/placeholder-recipe.jpg')
                  return (
                    <div key={recipe.id} className={styles.recipePreviewCard}>
                      <div className={styles.recipePreviewImage}>
                        <Image
                          src={recipeImage}
                          alt={recipe.title}
                          fill
                          className="object-cover"
                          unoptimized={recipe.image?.startsWith('data:')}
                        />
                      </div>
                      <div className={styles.recipePreviewContent}>
                        <h5 className={styles.recipePreviewTitle}>{recipe.title}</h5>
                        <button
                          onClick={() => addRecipeToCollection(selectedCollection.id, recipe.id)}
                          disabled={submitting}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            width: '100%',
                            marginTop: '4px'
                          }}
                        >
                          {submitting ? 'Ajout...' : 'Ajouter'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {userRecipes.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <p>Vous n'avez pas encore de recettes.</p>
                  <button 
                    onClick={() => router.push('/submit-recipe')}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginTop: '12px'
                    }}
                  >
                    Créer une recette
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
