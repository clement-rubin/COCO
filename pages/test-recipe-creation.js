import { useState } from 'react'
import { processImageToUrl } from '../utils/imageUtils'

export default function TestRecipeCreation() {
  const [testResult, setTestResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testCreateRecipe = async () => {
    setIsLoading(true)
    setTestResult('Test en cours...')

    try {
      // Test 1: Créer une recette simple sans image
      const simpleRecipe = {
        title: 'Test Recette Simple',
        description: 'Test de création de recette',
        author: 'TestUser',
        category: 'Test',
        ingredients: ['Test ingrédient 1', 'Test ingrédient 2'],
        instructions: [{ step: 1, instruction: 'Test instruction' }],
        difficulty: 'Facile'
      }

      const response1 = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simpleRecipe)
      })

      if (!response1.ok) {
        throw new Error(`Test 1 échoué: ${response1.status} ${await response1.text()}`)
      }

      const result1 = await response1.json()
      setTestResult(prev => prev + `\n✅ Test 1 réussi: Recette créée avec ID ${result1.id}`)

      // Test 2: Créer une recette avec une Data URL simple
      const testDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

      const recipeWithImage = {
        ...simpleRecipe,
        title: 'Test Recette avec Image',
        image: testDataUrl
      }

      const response2 = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeWithImage)
      })

      if (!response2.ok) {
        throw new Error(`Test 2 échoué: ${response2.status} ${await response2.text()}`)
      }

      const result2 = await response2.json()
      setTestResult(prev => prev + `\n✅ Test 2 réussi: Recette avec image créée avec ID ${result2.id}`)

      // Test 3: Vérifier que les recettes sont bien créées
      const response3 = await fetch('/api/recipes')
      if (!response3.ok) {
        throw new Error(`Test 3 échoué: ${response3.status}`)
      }

      const recipes = await response3.json()
      const testRecipes = recipes.filter(r => r.title.includes('Test Recette'))
      
      setTestResult(prev => prev + `\n✅ Test 3 réussi: ${testRecipes.length} recettes de test trouvées`)
      setTestResult(prev => prev + `\n🎉 Tous les tests réussis ! L'API fonctionne correctement.`)

    } catch (error) {
      setTestResult(prev => prev + `\n❌ Erreur: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test de Création de Recettes</h1>
      
      <button 
        onClick={testCreateRecipe}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {isLoading ? 'Test en cours...' : 'Lancer le test'}
      </button>

      <pre style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '5px',
        whiteSpace: 'pre-wrap'
      }}>
        {testResult || 'Cliquez sur "Lancer le test" pour commencer'}
      </pre>
    </div>
  )
}
