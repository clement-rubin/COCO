import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '../components/AuthContext'
import Comments from '../components/Comments'
import { supabase } from '../lib/supabase'
import { logInfo, logError, logWarning } from '../utils/logger'
import { 
  toggleRecipeLike, 
  getMultipleRecipesLikesStats, 
  useRecipeLikes 
} from '../utils/likesUtils'
import { 
  showRecipeLikedNotification, 
  showRecipeCommentNotification 
} from '../utils/notificationUtils'

export default function TestLikesComments() {
  const router = useRouter()
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [recipes, setRecipes] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState({})
  const [stats, setStats] = useState({
    totalRecipes: 0,
    totalLikes: 0,
    totalComments: 0,
    userLikes: 0
  })
  const logsEndRef = useRef(null)

  // Hook pour les likes de la recette sélectionnée
  const { likesStats, loading: likesLoading, toggleLike } = useRecipeLikes(
    selectedRecipe?.id,
    selectedRecipe ? { 
      likes_count: selectedRecipe.likes_count || 0, 
      user_has_liked: false 
    } : null
  )

  useEffect(() => {
    loadCommunityRecipes()
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
    
    // Aussi logger dans le système central
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

  const loadCommunityRecipes = async () => {
    setIsLoading(true)
    addLog('info', '📖 Chargement des recettes de la communauté...')
    
    try {
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        throw error
      }

      // Charger les stats de likes pour toutes les recettes
      if (recipesData && recipesData.length > 0) {
        const recipeIds = recipesData.map(r => r.id)
        const likesResult = await getMultipleRecipesLikesStats(recipeIds)
        
        if (likesResult.success) {
          // Enrichir les recettes avec les données de likes
          const enrichedRecipes = recipesData.map(recipe => ({
            ...recipe,
            likes_count: likesResult.data[recipe.id]?.likes_count || 0,
            user_has_liked: likesResult.data[recipe.id]?.user_has_liked || false
          }))
          setRecipes(enrichedRecipes)
        } else {
          setRecipes(recipesData)
        }
      } else {
        setRecipes([])
      }

      // Calculer les statistiques
      const totalLikes = recipesData?.reduce((sum, recipe) => sum + (recipe.likes_count || 0), 0) || 0
      setStats({
        totalRecipes: recipesData?.length || 0,
        totalLikes,
        totalComments: 0, // À implémenter quand l'API commentaires sera prête
        userLikes: recipesData?.filter(recipe => recipe.user_has_liked).length || 0
      })

      addLog('info', `✅ ${recipesData?.length || 0} recettes chargées`, {
        recipesCount: recipesData?.length,
        totalLikes,
        hasLikesData: likesResult?.success
      })
      setTestResults(prev => ({ ...prev, loadRecipes: 'success' }))

    } catch (error) {
      addLog('error', '❌ Erreur lors du chargement des recettes', error)
      setTestResults(prev => ({ ...prev, loadRecipes: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testLikeRecipe = async (recipeId) => {
    if (!user) {
      addLog('warning', '⚠️ Utilisateur non connecté pour le test de like')
      return
    }

    setIsLoading(true)
    addLog('info', `💖 Test de like sur la recette ${recipeId.substring(0, 8)}...`)

    try {
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) {
        throw new Error('Recette non trouvée')
      }

      // UTILISER toggleRecipeLike au lieu d'addRecipeLike pour éviter la confusion
      const { toggleRecipeLike } = await import('../utils/likesUtils')
      const result = await toggleRecipeLike(
        recipeId,
        user.id,
        recipe.user_has_liked || false, // État actuel du like
        recipe,
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Testeur'
        }
      )

      if (result.success) {
        // Mettre à jour la recette localement avec les vraies données
        setRecipes(prev => prev.map(r => 
          r.id === recipeId 
            ? { 
                ...r, 
                likes_count: result.stats?.likes_count || 0, 
                user_has_liked: result.stats?.user_has_liked || false 
              }
            : r
        ))

        addLog('info', '✅ Like toggleé avec succès', {
          recipeId: recipeId.substring(0, 8),
          action: result.stats?.user_has_liked ? 'liked' : 'unliked',
          newLikesCount: result.stats?.likes_count
        })
        setTestResults(prev => ({ ...prev, [`like_${recipeId}`]: 'success' }))

        // Test de notification uniquement si c'est un nouveau like
        if (result.stats?.user_has_liked) {
          showRecipeLikedNotification(recipe, {
            display_name: user.user_metadata?.display_name || 'Testeur'
          })
        }

      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }

    } catch (error) {
      addLog('error', '❌ Erreur lors du test de like', error)
      setTestResults(prev => ({ ...prev, [`like_${recipeId}`]: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testUnlikeRecipe = async (recipeId) => {
    if (!user) {
      addLog('warning', '⚠️ Utilisateur non connecté pour le test d\'unlike')
      return
    }

    setIsLoading(true)
    addLog('info', `💔 Test d'unlike sur la recette ${recipeId.substring(0, 8)}...`)

    try {
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) {
        throw new Error('Recette non trouvée')
      }

      // UTILISER toggleRecipeLike avec état "liked" pour simuler un unlike
      const { toggleRecipeLike } = await import('../utils/likesUtils')
      const result = await toggleRecipeLike(
        recipeId,
        user.id,
        true, // Force unlike (état actuel = liked)
        recipe,
        {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Testeur'
        }
      )

      if (result.success) {
        // Mettre à jour la recette localement
        setRecipes(prev => prev.map(r => 
          r.id === recipeId 
            ? { 
                ...r, 
                likes_count: result.stats?.likes_count || 0, 
                user_has_liked: result.stats?.user_has_liked || false 
              }
            : r
        ))

        addLog('info', '✅ Unlike effectué avec succès', {
          recipeId: recipeId.substring(0, 8),
          newLikesCount: result.stats?.likes_count
        })
        setTestResults(prev => ({ ...prev, [`unlike_${recipeId}`]: 'success' }))

      } else {
        throw new Error(result.error || 'Erreur inconnue')
      }

    } catch (error) {
      addLog('error', '❌ Erreur lors du test d\'unlike', error)
      setTestResults(prev => ({ ...prev, [`unlike_${recipeId}`]: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testBulkLikesLoading = async () => {
    setIsLoading(true)
    addLog('info', '📊 Test de chargement en masse des likes...')

    try {
      const recipeIds = recipes.slice(0, 10).map(r => r.id)
      const result = await getMultipleRecipesLikesStats(recipeIds)

      if (result.success) {
        addLog('info', '✅ Chargement en masse réussi', {
          recipesCount: recipeIds.length,
          likesData: Object.keys(result.data).length
        })
        setTestResults(prev => ({ ...prev, bulkLikes: 'success' }))
      } else {
        throw new Error(result.error || 'Erreur de chargement en masse')
      }

    } catch (error) {
      addLog('error', '❌ Erreur lors du chargement en masse', error)
      setTestResults(prev => ({ ...prev, bulkLikes: 'error' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testCommentNotification = () => {
    if (!selectedRecipe) {
      addLog('warning', '⚠️ Aucune recette sélectionnée pour le test de notification')
      return
    }

    addLog('info', '💬 Test de notification de commentaire...')

    try {
      showRecipeCommentNotification(
        selectedRecipe,
        {
          user_id: user?.id || 'test-user',
          display_name: user?.user_metadata?.display_name || 'Testeur de commentaire'
        },
        {
          id: Date.now(),
          text: 'Ceci est un commentaire de test pour vérifier les notifications!'
        }
      )

      addLog('info', '✅ Notification de commentaire envoyée')
      setTestResults(prev => ({ ...prev, commentNotification: 'success' }))

    } catch (error) {
      addLog('error', '❌ Erreur lors du test de notification', error)
      setTestResults(prev => ({ ...prev, commentNotification: 'error' }))
    }
  }

  const runAllTests = async () => {
    addLog('info', '🚀 === DÉBUT DES TESTS AUTOMATIQUES ===')
    setTestResults({})
    
    // Test 1: Recharger les recettes
    await loadCommunityRecipes()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test 2: Chargement en masse des likes
    await testBulkLikesLoading()
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test 3: Test de like/unlike sur la première recette
    if (recipes.length > 0 && user) {
      const firstRecipe = recipes[0]
      await testLikeRecipe(firstRecipe.id)
      await new Promise(resolve => setTimeout(resolve, 2000))
      await testUnlikeRecipe(firstRecipe.id)
    }
    
    // Test 4: Notification de commentaire
    if (recipes.length > 0) {
      setSelectedRecipe(recipes[0])
      setTimeout(() => {
        testCommentNotification()
      }, 1000)
    }
    
    addLog('info', '✅ === FIN DES TESTS AUTOMATIQUES ===')
  }

  const getTestResultColor = (result) => {
    switch (result) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <>
      <Head>
        <title>Test Likes & Commentaires - COCO</title>
        <meta name="description" content="Page de test pour le système de likes et commentaires des recettes" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  💖💬 Test Likes & Commentaires
                </h1>
                <p className="mt-2 text-gray-600">
                  Test du système d'interactions sociales sur les recettes de la communauté
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
            <h2 className="text-xl font-semibold mb-4">📊 Statistiques de la Communauté</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRecipes}</div>
                <div className="text-sm text-blue-800">Recettes</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.totalLikes}</div>
                <div className="text-sm text-red-800">Likes Total</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.totalComments}</div>
                <div className="text-sm text-green-800">Commentaires</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.userLikes}</div>
                <div className="text-sm text-purple-800">Mes Likes</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Panel de contrôle */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-6">🧪 Tests de Likes</h2>
              
              <div className="space-y-4">
                <button
                  onClick={loadCommunityRecipes}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  📖 Recharger les Recettes
                </button>
                
                <button
                  onClick={testBulkLikesLoading}
                  disabled={isLoading || recipes.length === 0}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  📊 Test Chargement Masse
                </button>
                
                <button
                  onClick={testCommentNotification}
                  disabled={!selectedRecipe}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  💬 Test Notification Comment
                </button>
                
                <button
                  onClick={runAllTests}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  🚀 Tous les Tests
                </button>
              </div>

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

          {/* Recettes de la communauté */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              🍽️ Recettes de la Communauté ({recipes.length})
            </h2>
            
            {recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.slice(0, 12).map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer ${
                      selectedRecipe?.id === recipe.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    <h3 className="font-semibold text-lg mb-2">{recipe.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {recipe.description || 'Délicieuse recette à découvrir!'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          👤 {recipe.author || 'Chef Anonyme'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          ❤️ {recipe.likes_count || 0}
                        </span>
                        {user && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                testLikeRecipe(recipe.id)
                              }}
                              disabled={isLoading}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                            >
                              👍 Like
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                testUnlikeRecipe(recipe.id)
                              }}
                              disabled={isLoading}
                              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 disabled:opacity-50"
                            >
                              👎 Unlike
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Aucune recette trouvée
                </h3>
                <p className="text-gray-500">
                  Chargez les recettes pour commencer les tests
                </p>
              </div>
            )}
          </div>

          {/* Système de commentaires */}
          {selectedRecipe && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                💬 Test Commentaires - {selectedRecipe.title}
              </h2>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800">
                  <strong>Recette sélectionnée:</strong> {selectedRecipe.title}
                </p>
                <p className="text-blue-600 text-sm">
                  Auteur: {selectedRecipe.author} • Likes: {likesStats.likes_count}
                </p>
              </div>
              
              <Comments 
                targetId={selectedRecipe.id}
                targetType="recipe"
                theme="recipe"
              />
            </div>
          )}

          {/* Info panel */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-3">ℹ️ Informations de Test</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• <strong>Likes:</strong> Testez l'ajout/suppression de likes sur les vraies recettes</p>
              <p>• <strong>Commentaires:</strong> Sélectionnez une recette pour tester le système de commentaires</p>
              <p>• <strong>Notifications:</strong> Les notifications apparaissent en temps réel lors des interactions</p>
              <p>• <strong>Stats:</strong> Les statistiques se mettent à jour automatiquement</p>
              <p>• <strong>Données:</strong> Les tests utilisent les vraies données de la base Supabase</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
