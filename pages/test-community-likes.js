import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import Comments from '../components/Comments'
import SocialFeed from '../components/SocialFeed'
import { supabase } from '../lib/supabase'
import { logInfo, logError, logWarning } from '../utils/logger'
import { 
  toggleRecipeLike, 
  getMultipleRecipesLikesStats, 
  addRecipeLike, 
  removeRecipeLike,
  useRecipeLikes 
} from '../utils/likesUtils'
import { 
  showRecipeLikedNotification, 
  showRecipeCommentNotification 
} from '../utils/notificationUtils'

export default function TestCommunityLikes() {
  const router = useRouter()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [likesData, setLikesData] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState({})
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    userLikes: 0,
    activePosts: 0
  })
  const [simulationMode, setSimulationMode] = useState(false)
  const [autoLikeInterval, setAutoLikeInterval] = useState(null)
  const logsEndRef = useRef(null)

  useEffect(() => {
    loadCommunityPosts()
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (type, message, data = null) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    }
    setLogs(prev => [newLog, ...prev])
    
    // Also log to central logger
    if (type === 'error') {
      logError(message, new Error(message), data)
    } else if (type === 'warning') {
      logWarning(message, data)
    } else {
      logInfo(message, data)
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog('info', 'Logs effacés')
  }

  const loadCommunityPosts = async () => {
    setIsLoading(true)
    addLog('info', '📖 Chargement des posts de la communauté...')
    
    try {
      // Charger les recettes publiques récentes
      const response = await fetch('/api/recipes?limit=20&sort=recent')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      
      const recipes = await response.json()
      
      // Formater pour le test des likes
      const formattedPosts = recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description || 'Délicieuse recette à découvrir !',
        author: recipe.author || 'Chef Anonyme',
        user_id: recipe.user_id,
        category: recipe.category || 'Autre',
        image: recipe.image,
        created_at: recipe.created_at,
        likes_count: 0, // Will be updated from real API
        user_has_liked: false // Will be updated from real API
      }))

      setPosts(formattedPosts)

      // Charger les vraies statistiques de likes
      const recipeIds = formattedPosts.map(post => post.id)
      if (recipeIds.length > 0) {
        const likesResult = await getMultipleRecipesLikesStats(recipeIds)
        
        if (likesResult.success) {
          setLikesData(likesResult.data)
          
          // Calculer les stats
          const totalLikes = Object.values(likesResult.data).reduce((sum, data) => sum + (data.likes_count || 0), 0)
          const userLikes = Object.values(likesResult.data).filter(data => data.user_has_liked).length
          
          setStats({
            totalPosts: formattedPosts.length,
            totalLikes,
            userLikes,
            activePosts: Object.keys(likesResult.data).length
          })
          
          addLog('info', '✅ Posts et likes chargés avec succès', {
            postsCount: formattedPosts.length,
            totalLikes,
            userLikes,
            hasLikesData: true
          })
        } else {
          addLog('warning', '⚠️ Erreur lors du chargement des likes', likesResult.error)
        }
      }

      setTestResults(prev => ({ ...prev, loadPosts: 'success' }))

    } catch (error) {
      addLog('error', '❌ Erreur lors du chargement des posts', error)
      setTestResults(prev => ({ ...prev, loadPosts: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testLikePost = async (postId) => {
    if (!user) {
      addLog('warning', '⚠️ Utilisateur non connecté pour le test de like')
      return
    }

    setIsLoading(true)
    addLog('info', `💖 Test de like sur le post ${postId.substring(0, 8)}...`)

    try {
      const post = posts.find(p => p.id === postId)
      if (!post) {
        throw new Error('Post non trouvé')
      }

      const currentLikesData = likesData[postId] || { likes_count: 0, user_has_liked: false }
      const isCurrentlyLiked = currentLikesData.user_has_liked

      // Optimistic update - UNE SEULE FOIS
      setLikesData(prev => ({
        ...prev,
        [postId]: {
          likes_count: currentLikesData.likes_count + (isCurrentlyLiked ? -1 : 1),
          user_has_liked: !isCurrentlyLiked
        }
      }))

      // UTILISER toggleRecipeLike pour cohérence
      const { toggleRecipeLike } = await import('../utils/likesUtils')
      const result = await toggleRecipeLike(
        postId,
        user.id,
        isCurrentlyLiked,
        {
          id: post.id,
          title: post.title,
          image: post.image,
          user_id: post.user_id
        },
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'Testeur'
        }
      )

      if (result.success) {
        // Mettre à jour avec les vraies données du serveur
        setLikesData(prev => ({
          ...prev,
          [postId]: {
            likes_count: result.stats?.likes_count || currentLikesData.likes_count,
            user_has_liked: result.stats?.user_has_liked !== undefined ? result.stats.user_has_liked : !isCurrentlyLiked
          }
        }))

        addLog('info', `✅ ${isCurrentlyLiked ? 'Unlike' : 'Like'} effectué avec succès`, {
          postId: postId.substring(0, 8),
          action: result.stats?.user_has_liked ? 'like' : 'unlike',
          newLikesCount: result.stats?.likes_count
        })
        setTestResults(prev => ({ ...prev, [`like_${postId}`]: 'success' }))

        // Notification et animation si c'est un nouveau like
        if (result.stats?.user_has_liked && !isCurrentlyLiked) {
          showRecipeLikedNotification(post, {
            display_name: user.user_metadata?.display_name || 'Testeur'
          })
          createLikeAnimation(postId)
        }

      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }

    } catch (error) {
      addLog('error', '❌ Erreur lors du test de like', error)
      setTestResults(prev => ({ ...prev, [`like_${postId}`]: 'error' }))
      
      // Revert optimistic update
      setLikesData(prev => ({
        ...prev,
        [postId]: currentLikesData
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const createLikeAnimation = (postId) => {
    const heart = document.createElement('div')
    heart.innerHTML = '❤️'
    heart.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      font-size: 2rem;
      pointer-events: none;
      z-index: 10000;
      animation: heartFloat 1.2s ease-out forwards;
      transform: translate(-50%, -50%);
    `
    document.body.appendChild(heart)
    setTimeout(() => heart.remove(), 1200)
  }

  const testBulkLikes = async () => {
    if (!user) {
      addLog('warning', '⚠️ Utilisateur non connecté pour le test en masse')
      return
    }

    setIsLoading(true)
    addLog('info', '🚀 Test de likes en masse...')

    try {
      const postsToLike = posts.slice(0, 5) // Limiter à 5 posts
      let successCount = 0
      let errorCount = 0

      for (const post of postsToLike) {
        try {
          const currentLikesData = likesData[post.id] || { likes_count: 0, user_has_liked: false }
          
          if (!currentLikesData.user_has_liked) {
            const result = await addRecipeLike(post.id, user.id, post, {
              user_id: user.id,
              display_name: user.user_metadata?.display_name || 'Testeur'
            })
            
            if (result.success) {
              successCount++
              setLikesData(prev => ({
                ...prev,
                [post.id]: {
                  likes_count: result.stats?.likes_count || currentLikesData.likes_count + 1,
                  user_has_liked: true
                }
              }))
            } else {
              errorCount++
            }
          }
          
          // Délai entre les likes pour éviter le spam
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          errorCount++
          addLog('error', `Erreur sur le post ${post.id.substring(0, 8)}`, error)
        }
      }

      addLog('info', `✅ Test en masse terminé: ${successCount} succès, ${errorCount} erreurs`)
      setTestResults(prev => ({ ...prev, bulkLikes: successCount > errorCount ? 'success' : 'partial' }))

    } catch (error) {
      addLog('error', '❌ Erreur lors du test en masse', error)
      setTestResults(prev => ({ ...prev, bulkLikes: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testCommentsIntegration = () => {
    if (!selectedPost) {
      addLog('warning', '⚠️ Aucun post sélectionné pour tester les commentaires')
      return
    }

    addLog('info', '💬 Test d\'intégration avec les commentaires...')

    try {
      // Déclencher une notification de commentaire test
      showRecipeCommentNotification(
        selectedPost,
        {
          user_id: user?.id || 'test-user',
          display_name: user?.user_metadata?.display_name || 'Testeur de commentaires'
        },
        {
          id: Date.now(),
          text: 'Ceci est un commentaire de test pour vérifier l\'intégration likes/commentaires!'
        }
      )

      addLog('info', '✅ Test d\'intégration commentaires réussi')
      setTestResults(prev => ({ ...prev, commentsIntegration: 'success' }))

    } catch (error) {
      addLog('error', '❌ Erreur lors du test d\'intégration', error)
      setTestResults(prev => ({ ...prev, commentsIntegration: 'error' }))
    }
  }

  const startAutoLikeSimulation = () => {
    if (autoLikeInterval) {
      clearInterval(autoLikeInterval)
      setAutoLikeInterval(null)
      addLog('info', '⏹️ Simulation automatique arrêtée')
      return
    }

    addLog('info', '🤖 Démarrage de la simulation automatique de likes...')
    setSimulationMode(true)

    const interval = setInterval(() => {
      const availablePosts = posts.filter(post => {
        const postLikesData = likesData[post.id] || { user_has_liked: false }
        return !postLikesData.user_has_liked
      })

      if (availablePosts.length > 0) {
        const randomPost = availablePosts[Math.floor(Math.random() * availablePosts.length)]
        testLikePost(randomPost.id)
      } else {
        clearInterval(interval)
        setAutoLikeInterval(null)
        setSimulationMode(false)
        addLog('info', '🎯 Simulation terminée - tous les posts ont été likés')
      }
    }, 2000) // Un like toutes les 2 secondes

    setAutoLikeInterval(interval)
  }

  const runAllTests = async () => {
    addLog('info', '🚀 === DÉBUT DES TESTS AUTOMATIQUES ===')
    setTestResults({})
    
    // Test 1: Recharger les posts
    await loadCommunityPosts()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test 2: Test de like sur le premier post
    if (posts.length > 0 && user) {
      await testLikePost(posts[0].id)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Test 3: Test d'intégration commentaires
    if (posts.length > 0) {
      setSelectedPost(posts[0])
      setTimeout(() => {
        testCommentsIntegration()
      }, 1000)
    }
    
    addLog('info', '✅ === FIN DES TESTS AUTOMATIQUES ===')
  }

  const getTestResultColor = (result) => {
    switch (result) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <>
      <Head>
        <title>Test Likes Communauté - COCO</title>
        <meta name="description" content="Page de test pour le système de likes des posts de la communauté" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  💖 Test Likes Communauté
                </h1>
                <p className="mt-2 text-gray-600">
                  Test du système de likes sur les posts de la communauté COCO
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ← Retour
              </button>
            </div>
          </div>

          {/* User Status */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">👤 État de l'utilisateur</h2>
            {user ? (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="flex items-center mb-2">
                  <span className="text-green-600 text-xl mr-3">✅</span>
                  <span className="text-green-800 font-medium">Utilisateur connecté</span>
                </div>
                <div className="text-sm text-green-700 ml-8">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Nom:</strong> {user.user_metadata?.display_name || 'Non défini'}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <div className="flex items-center">
                  <span className="text-red-600 text-xl mr-3">❌</span>
                  <span className="text-red-800 font-medium">Non connecté</span>
                </div>
                <a href="/login" className="text-red-600 underline ml-8">Se connecter pour tester</a>
              </div>
            )}
          </div>

          {/* Stats Dashboard */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 Statistiques en Temps Réel</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
                <div className="text-sm text-blue-800">Posts Totaux</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.totalLikes}</div>
                <div className="text-sm text-red-800">Likes Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.userLikes}</div>
                <div className="text-sm text-green-800">Mes Likes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.activePosts}</div>
                <div className="text-sm text-purple-800">Posts Actifs</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Panel de contrôle */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">🧪 Tests de Likes</h2>
              
              <div className="space-y-4">
                <button
                  onClick={loadCommunityPosts}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  📖 Recharger les Posts
                </button>
                
                <button
                  onClick={testBulkLikes}
                  disabled={isLoading || posts.length === 0 || !user}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  🚀 Test Likes en Masse (5 posts)
                </button>
                
                <button
                  onClick={startAutoLikeSimulation}
                  disabled={isLoading || posts.length === 0 || !user}
                  className={`w-full px-4 py-2 text-white rounded disabled:opacity-50 ${
                    autoLikeInterval ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {autoLikeInterval ? '⏹️ Arrêter Simulation' : '🤖 Simulation Auto'}
                </button>
                
                <button
                  onClick={testCommentsIntegration}
                  disabled={!selectedPost}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  💬 Test Intégration Commentaires
                </button>
                
                <button
                  onClick={runAllTests}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  🎯 Tous les Tests
                </button>
              </div>

              {/* Simulation Status */}
              {simulationMode && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded">
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full mr-2"></div>
                    <span className="text-purple-800 font-medium">Simulation en cours...</span>
                  </div>
                  <p className="text-purple-600 text-sm mt-1">
                    Likes automatiques toutes les 2 secondes
                  </p>
                </div>
              )}

              {/* Test Results */}
              {Object.keys(testResults).length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Résultats des Tests:</h3>
                  <div className="space-y-2">
                    {Object.entries(testResults).map(([test, result]) => (
                      <div key={test} className={`px-3 py-2 rounded border text-sm ${getTestResultColor(result)}`}>
                        <span className="font-medium">{test}:</span> {result}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">📋 Logs de Test ({logs.length})</h2>
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Effacer
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded text-sm border-l-4 ${
                      log.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                      log.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                      'bg-blue-50 border-blue-500 text-blue-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs text-gray-500">{log.timestamp}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.type === 'error' ? 'bg-red-200 text-red-800' :
                        log.type === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{log.message}</p>
                    {log.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {log.data}
                      </pre>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
              
              {logs.length === 0 && (
                <p className="text-gray-500 text-center py-8">Aucun log disponible</p>
              )}
            </div>
          </div>

          {/* Posts de la communauté */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              🍽️ Posts de la Communauté ({posts.length})
            </h2>
            
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.slice(0, 12).map((post) => {
                  const postLikesData = likesData[post.id] || { likes_count: 0, user_has_liked: false }
                  
                  return (
                    <div
                      key={post.id}
                      className={`border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer ${
                        selectedPost?.id === post.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedPost(post)}
                    >
                      <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {post.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-500">
                          👤 {post.author}
                        </div>
                        <div className="text-sm text-gray-500">
                          📂 {post.category}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${postLikesData.user_has_liked ? 'text-red-600' : 'text-gray-500'}`}>
                            {postLikesData.user_has_liked ? '❤️' : '🤍'} {postLikesData.likes_count}
                          </span>
                        </div>
                        
                        {user && (
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                testLikePost(post.id)
                              }}
                              disabled={isLoading}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                postLikesData.user_has_liked 
                                  ? 'bg-red-500 text-white hover:bg-red-600' 
                                  : 'bg-gray-500 text-white hover:bg-gray-600'
                              } disabled:opacity-50`}
                            >
                              {postLikesData.user_has_liked ? '💔 Unlike' : '💖 Like'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Aucun post trouvé
                </h3>
                <p className="text-gray-500">
                  Chargez les posts pour commencer les tests
                </p>
              </div>
            )}
          </div>

          {/* Integration avec Comments */}
          {selectedPost && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                💬 Test Système Commentaires - {selectedPost.title}
              </h2>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  <strong>Post sélectionné:</strong> {selectedPost.title}
                </p>
                <p className="text-blue-600 text-sm">
                  Auteur: {selectedPost.author} • Likes: {likesData[selectedPost.id]?.likes_count || 0}
                </p>
              </div>
              
              <Comments 
                targetId={selectedPost.id}
                targetType="recipe"
                theme="social"
              />
            </div>
          )}

          {/* SocialFeed Integration Test */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              🌍 Test d'Intégration SocialFeed
            </h2>
            <p className="text-gray-600 mb-4">
              Testez le système de likes directement dans le composant SocialFeed réel
            </p>
            
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b">
                <span className="text-sm font-medium text-gray-700">SocialFeed Component</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <SocialFeed />
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-3">ℹ️ Informations de Test</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• <strong>Likes:</strong> Testez l'ajout/suppression de likes sur les vrais posts de la communauté</p>
              <p>• <strong>Simulation:</strong> Mode automatique pour tester la performance et les notifications</p>
              <p>• <strong>Intégration:</strong> Test complet avec Comments et SocialFeed</p>
              <p>• <strong>Temps réel:</strong> Les statistiques se mettent à jour automatiquement</p>
              <p>• <strong>API:</strong> Utilise les vraies APIs de likes et la base de données Supabase</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -70%) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
