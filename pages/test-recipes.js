import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { logInfo, logError, logWarning, logDebug } from '../utils/logger'
import { createRecipesTableIfNotExists, initializeRecipesTable, createImageStorageBucket } from '../lib/supabase'

export default function TestRecipes() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState({})
  const logsEndRef = useRef(null)

  // Intercepter les logs de la console pour les afficher
  useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    const addLog = (type, message, data = null) => {
      const timestamp = new Date().toISOString()
      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        timestamp,
        type,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        data: data ? JSON.stringify(data, null, 2) : null
      }])
    }

    console.log = (...args) => {
      originalConsoleLog(...args)
      addLog('LOG', args.join(' '))
    }

    console.error = (...args) => {
      originalConsoleError(...args)
      addLog('ERROR', args.join(' '))
    }

    console.warn = (...args) => {
      originalConsoleWarn(...args)
      addLog('WARN', args.join(' '))
    }

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }, [])

  // Auto-scroll vers le bas des logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const clearLogs = () => {
    setLogs([])
    logInfo('Logs effacés depuis la page de test', { component: 'test-recipes' })
  }

  const testSupabaseConnection = async () => {
    setIsLoading(true)
    logInfo('🔍 Test de connexion Supabase...', { component: 'test-recipes' })
    
    try {
      // Test avec toutes les colonnes requises incluant difficulty
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, description, ingredients, instructions, difficulty, category, author, created_at')
        .limit(1)

      if (error) {
        logError('❌ Connexion Supabase échouée', error)
        
        // Si c'est une erreur de colonne manquante, donner des instructions spécifiques
        if (error.code === 'PGRST204' && error.message.includes('difficulty')) {
          logError('❌ Colonne difficulty manquante dans la table recipes', error)
          setTestResults(prev => ({ ...prev, supabase: 'COLONNE_MANQUANTE' }))
          
          console.log(`
=== COLONNE DIFFICULTY MANQUANTE ===

La colonne 'difficulty' n'existe pas dans votre table recipes.
Exécutez ce SQL dans votre dashboard Supabase :

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Facile';

Puis rafraîchissez cette page.
          `)
        } else {
          setTestResults(prev => ({ ...prev, supabase: 'ERREUR' }))
        }
      } else {
        logInfo('✅ Connexion Supabase réussie')
        setTestResults(prev => ({ ...prev, supabase: 'OK' }))
      }
    } catch (error) {
      logError('❌ Erreur critique Supabase', error)
      setTestResults(prev => ({ ...prev, supabase: 'CRITIQUE' }))
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecipes = async () => {
    setIsLoading(true)
    logInfo('📖 Chargement des recettes...', { component: 'test-recipes' })
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logError('❌ Erreur lors du chargement des recettes', error)
        setTestResults(prev => ({ ...prev, loadRecipes: 'ERREUR' }))
      } else {
        logInfo(`✅ ${data.length} recettes chargées`, {
          recipesCount: data.length,
          firstRecipe: data[0]?.title,
          lastRecipe: data[data.length - 1]?.title
        })
        setRecipes(data)
        setTestResults(prev => ({ ...prev, loadRecipes: 'OK' }))
      }
    } catch (error) {
      logError('❌ Erreur critique lors du chargement', error)
      setTestResults(prev => ({ ...prev, loadRecipes: 'CRITIQUE' }))
    } finally {
      setIsLoading(false)
    }
  }

  const createTestRecipe = async () => {
    setIsLoading(true)
    logInfo('🧪 Création d\'une recette de test...', { component: 'test-recipes' })
    
    const testRecipe = {
      title: `Test Recipe ${Date.now()}`,
      description: 'Recette créée automatiquement pour les tests',
      ingredients: ['Ingrédient test 1', 'Ingrédient test 2', 'Ingrédient test 3'],
      instructions: [
        { step: 1, instruction: 'Étape de test 1' },
        { step: 2, instruction: 'Étape de test 2' },
        { step: 3, instruction: 'Étape de test 3' }
      ],
      prepTime: '10 min',
      cookTime: '15 min',
      category: 'Test',
      author: 'Testeur Automatique',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3'
    }

    try {
      logDebug('Données de la recette de test', JSON.stringify(testRecipe, null, 2))
      
      const { data, error } = await supabase
        .from('recipes')
        .insert([testRecipe])
        .select()
        .single()

      if (error) {
        logError('❌ Erreur lors de la création de la recette de test', JSON.stringify({
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }, null, 2))
        setTestResults(prev => ({ ...prev, createRecipe: 'ERREUR' }))
      } else {
        logInfo('✅ Recette de test créée avec succès', JSON.stringify({
          id: data.id,
          title: data.title,
          created_at: data.created_at
        }, null, 2))
        setTestResults(prev => ({ ...prev, createRecipe: 'OK' }))
        // Recharger les recettes
        await loadRecipes()
      }
    } catch (error) {
      logError('❌ Erreur critique lors de la création', JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name
      }, null, 2))
      setTestResults(prev => ({ ...prev, createRecipe: 'CRITIQUE' }))
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTestRecipes = async () => {
    setIsLoading(true)
    logInfo('🗑️ Suppression des recettes de test...', { component: 'test-recipes' })
    
    try {
      const { data, error } = await supabase
        .from('recipes')
        .delete()
        .like('title', 'Test Recipe%')
        .select()

      if (error) {
        logError('❌ Erreur lors de la suppression', error)
        setTestResults(prev => ({ ...prev, deleteTest: 'ERREUR' }))
      } else {
        logInfo(`✅ ${data.length} recettes de test supprimées`)
        setTestResults(prev => ({ ...prev, deleteTest: 'OK' }))
        await loadRecipes()
      }
    } catch (error) {
      logError('❌ Erreur critique lors de la suppression', error)
      setTestResults(prev => ({ ...prev, deleteTest: 'CRITIQUE' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testTableCreation = async () => {
    setIsLoading(true)
    logInfo('🏗️ Test de création/vérification de la table...', { component: 'test-recipes' })
    
    try {
      const success = await createRecipesTableIfNotExists()
      
      if (success) {
        logInfo('✅ Table recipes créée/vérifiée avec succès')
        setTestResults(prev => ({ ...prev, tableCreation: 'OK' }))
      } else {
        logWarning('⚠️ Problème lors de la création de la table')
        setTestResults(prev => ({ ...prev, tableCreation: 'ATTENTION' }))
      }
    } catch (error) {
      logError('❌ Erreur lors de la création de la table', error)
      setTestResults(prev => ({ ...prev, tableCreation: 'ERREUR' }))
    } finally {
      setIsLoading(false)
    }
  }

  const initializeDatabase = async () => {
    setIsLoading(true)
    logInfo('🚀 Initialisation complète de la base de données...', { component: 'test-recipes' })
    
    try {
      await initializeRecipesTable()
      logInfo('✅ Base de données initialisée')
      setTestResults(prev => ({ ...prev, dbInit: 'OK' }))
      await loadRecipes()
    } catch (error) {
      logError('❌ Erreur lors de l\'initialisation', error)
      setTestResults(prev => ({ ...prev, dbInit: 'ERREUR' }))
    } finally {
      setIsLoading(false)
    }
  }

  const testImageStorage = async () => {
    setIsLoading(true)
    logInfo('🖼️ Test de création du bucket images...', { component: 'test-recipes' })
    
    try {
      const success = await createImageStorageBucket()
      
      if (success) {
        logInfo('✅ Bucket images créé/vérifié avec succès')
        setTestResults(prev => ({ ...prev, imageStorage: 'OK' }))
      } else {
        logWarning('⚠️ Problème lors de la création du bucket')
        setTestResults(prev => ({ ...prev, imageStorage: 'ATTENTION' }))
      }
    } catch (error) {
      logError('❌ Erreur lors de la création du bucket', error)
      setTestResults(prev => ({ ...prev, imageStorage: 'ERREUR' }))
    } finally {
      setIsLoading(false)
    }
  }

  const runAllTests = async () => {
    logInfo('🚀 Début des tests automatiques...', { component: 'test-recipes' })
    await testTableCreation()
    await testImageStorage()
    await testSupabaseConnection()
    await loadRecipes()
    await createTestRecipe()
    logInfo('✅ Tests automatiques terminés', { component: 'test-recipes' })
  }

  const displaySQLInstructions = () => {
    logInfo('📋 Affichage des instructions SQL pour la création de table')
    
    const sqlInstructions = `
=== SQL POUR CRÉER LA TABLE RECIPES ET LE SYSTÈME D'AMIS ===

1. Allez dans votre dashboard Supabase
2. Cliquez sur "SQL Editor" 
3. Exécutez ce code SQL :

-- Table des recettes
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  "prepTime" TEXT,
  "cookTime" TEXT,
  servings TEXT,
  category TEXT,
  difficulty TEXT DEFAULT 'Facile',
  author TEXT DEFAULT 'Anonyme',
  image TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la table existe déjà, ajouter les colonnes manquantes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Facile';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Table des profils utilisateurs (STRUCTURE CORRIGÉE)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des amitiés (STRUCTURE CORRIGÉE)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  friend_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipes
CREATE POLICY "Enable read access for all users" ON recipes FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON recipes FOR DELETE USING (true);

-- Politiques pour profiles
CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (true);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

=== FIN DU SQL ===
    `
    
    console.log(sqlInstructions)
    alert('Instructions SQL affichées dans la console. Consultez les logs pour voir le code complet.')
  }

  return (
    <>
      <Head>
        <title>Test des Recettes - COCO</title>
        <meta name="description" content="Page de test pour le système de recettes" />
      </Head>
      
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'monospace' }}>
        {/* Panel de contrôle */}
        <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', borderRight: '1px solid #ddd' }}>
          <h2>🧪 Tests Recettes</h2>
          
          <button onClick={() => router.back()} style={{ marginBottom: '20px', padding: '8px 16px' }}>
            ← Retour
          </button>

          <div style={{ marginBottom: '20px' }}>
            <h3>Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={runAllTests} disabled={isLoading}>
                🚀 Tests Auto
              </button>
              <button onClick={testSupabaseConnection} disabled={isLoading}>
                🔍 Test Connexion
              </button>
              <button onClick={testTableCreation} disabled={isLoading}>
                🏗️ Test Table
              </button>
              <button onClick={displaySQLInstructions}>
                📋 SQL Instructions
              </button>
              <button onClick={loadRecipes} disabled={isLoading}>
                📖 Charger Recettes
              </button>
              <button onClick={createTestRecipe} disabled={isLoading}>
                ➕ Créer Test
              </button>
              <button onClick={deleteTestRecipes} disabled={isLoading}>
                🗑️ Supprimer Tests
              </button>
              <button onClick={() => router.push('/share-photo')}>
                📝 Formulaire
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Résultats</h3>
            {Object.entries(testResults).map(([test, result]) => (
              <div key={test} style={{ 
                padding: '5px', 
                background: result === 'OK' ? '#d4edda' : result === 'ERREUR' ? '#f8d7da' : '#fff3cd',
                margin: '2px 0',
                borderRadius: '3px'
              }}>
                {test}: {result}
              </div>
            ))}
          </div>

          <div>
            <h3>Recettes ({recipes.length})</h3>
            <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '12px' }}>
              {recipes.map(recipe => (
                <div key={recipe.id} style={{ padding: '5px', borderBottom: '1px solid #eee' }}>
                  <strong>{recipe.title}</strong><br/>
                  <small>{recipe.author} - {recipe.category}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel des logs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #ddd', background: '#fff' }}>
            <h2>📋 Logs en temps réel</h2>
            <button onClick={clearLogs} style={{ padding: '5px 10px' }}>
              🗑️ Effacer logs
            </button>
            <span style={{ marginLeft: '20px', color: '#666' }}>
              {logs.length} entrées
            </span>
          </div>
          
          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '10px', 
            background: '#1e1e1e', 
            color: '#fff',
            fontSize: '12px',
            lineHeight: '1.4'
          }}>
            {logs.map(log => (
              <div key={log.id} style={{ 
                marginBottom: '10px', 
                padding: '8px',
                borderLeft: `4px solid ${
                  log.type === 'ERROR' ? '#ff4757' : 
                  log.type === 'WARN' ? '#ffa502' : 
                  '#2ed573'
                }`,
                background: 'rgba(255,255,255,0.05)'
              }}>
                <div style={{ color: '#888', fontSize: '10px' }}>
                  {log.timestamp} - {log.type}
                </div>
                <div style={{ marginTop: '4px' }}>{log.message}</div>
                {log.data && (
                  <pre style={{ 
                    marginTop: '8px', 
                    fontSize: '10px', 
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px',
                    borderRadius: '3px',
                    overflow: 'auto'
                  }}>
                    {log.data}
                  </pre>
                )}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </>
  )
}
