import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logInfo, logWarning } from '../utils/logger';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function TestFriends() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [friendshipStatus, setFriendshipStatus] = useState('checking');
  const [profilesStatus, setProfilesStatus] = useState('checking');
  const [testResults, setTestResults] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const addLog = (type, message, data = null) => {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    setLogs(prev => [newLog, ...prev]);
    
    // Also log to central logger
    if (type === 'error') {
      logError(message, new Error(message), data);
    } else if (type === 'warning') {
      logWarning(message, data);
    } else {
      logInfo(message, data);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs effacés');
  };

  useEffect(() => {
    checkUser();
    checkTablesStatus();
  }, []);

  const checkUser = async () => {
    try {
      addLog('info', 'Vérification de l\'utilisateur connecté...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addLog('error', 'Erreur lors de la vérification utilisateur', error);
        return;
      }

      if (user) {
        setUser(user);
        addLog('info', 'Utilisateur connecté', {
          id: user.id.substring(0, 8) + '...',
          email: user.email,
          display_name: user.user_metadata?.display_name
        });
      } else {
        addLog('warning', 'Aucun utilisateur connecté');
      }
    } catch (error) {
      addLog('error', 'Erreur inattendue lors de la vérification utilisateur', error);
    }
  };

  const checkTablesStatus = async () => {
    addLog('info', 'Vérification des tables de base de données...');

    // Check profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        addLog('error', 'Table profiles non accessible', error);
        setProfilesStatus('error');
      } else {
        addLog('info', 'Table profiles accessible');
        setProfilesStatus('available');
      }
    } catch (error) {
      addLog('error', 'Erreur lors de la vérification de la table profiles', error);
      setProfilesStatus('error');
    }

    // Check friendships table
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id')
        .limit(1);

      if (error) {
        addLog('error', 'Table friendships non accessible', error);
        setFriendshipStatus('error');
      } else {
        addLog('info', 'Table friendships accessible');
        setFriendshipStatus('available');
      }
    } catch (error) {
      addLog('error', 'Erreur lors de la vérification de la table friendships', error);
      setFriendshipStatus('error');
    }
  };

  const testCreateProfile = async () => {
    if (!user) {
      addLog('error', 'Aucun utilisateur connecté pour le test');
      return;
    }

    addLog('info', 'Test de création/vérification du profil...');
    setIsLoading(true);

    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        addLog('info', 'Profil existant trouvé', existingProfile);
        setTestResults(prev => ({ ...prev, createProfile: 'success' }));
      } else {
        // Create profile
        const newProfile = {
          user_id: user.id,
          display_name: user.user_metadata?.display_name || user.email.split('@')[0],
          bio: 'Profil de test créé automatiquement',
          is_private: false
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        addLog('info', 'Nouveau profil créé avec succès', createdProfile);
        setTestResults(prev => ({ ...prev, createProfile: 'created' }));
      }
    } catch (error) {
      addLog('error', 'Erreur lors du test de création de profil', error);
      setTestResults(prev => ({ ...prev, createProfile: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testSearchProfiles = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      addLog('warning', 'Terme de recherche trop court (minimum 2 caractères)');
      return;
    }

    addLog('info', `Test de recherche de profils avec le terme: "${searchTerm}"`);
    setIsLoading(true);

    try {
      // Utiliser la nouvelle fonction SQL simplifiée
      const { data: rpcResults, error: rpcError } = await supabase
        .rpc('search_users_simple', {
          search_term: searchTerm,
          current_user_id: user?.id
        });

      if (rpcError) {
        addLog('warning', 'Fonction RPC search_users_simple non disponible', rpcError);
        // Fallback to direct query
        const { data: directResults, error: directError } = await supabase
          .from('profiles')
          .select('user_id, display_name, bio, avatar_url')
          .neq('user_id', user?.id || '')
          .eq('is_private', false)
          .ilike('display_name', `%${searchTerm}%`)
          .limit(10);

        if (directError) {
          throw directError;
        }

        setSearchResults(directResults || []);
        setTestResults(prev => ({ ...prev, searchProfiles: 'direct_success' }));
      } else {
        addLog('info', 'Fonction RPC search_users_simple fonctionne', { 
          results: rpcResults?.length || 0,
          data: rpcResults 
        });
        setSearchResults(rpcResults || []);
        setTestResults(prev => ({ ...prev, searchProfiles: 'rpc_success' }));
      }

    } catch (error) {
      addLog('error', 'Erreur lors de la recherche de profils', error);
      setSearchResults([]);
      setTestResults(prev => ({ ...prev, searchProfiles: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testSendFriendRequest = async (friendId) => {
    if (!user) {
      addLog('error', 'Aucun utilisateur connecté pour envoyer une demande');
      return;
    }

    addLog('info', `Test d'envoi de demande d'amitié à ${friendId.substring(0, 8)}...`);
    setIsLoading(true);

    try {
      // Vérifier si une relation existe déjà avec la fonction SQL
      const { data: existing, error: checkError } = await supabase
        .rpc('check_friendship_status', {
          user1_id: user.id,
          user2_id: friendId
        });

      if (!checkError && existing && existing.length > 0) {
        addLog('warning', 'Relation d\'amitié existe déjà', existing[0]);
        setTestResults(prev => ({ ...prev, sendRequest: 'already_exists' }));
        return;
      }

      // Envoyer la demande d'amitié avec auth.users.id
      const { data: newRequest, error: insertError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,  // auth.users.id directement
          friend_id: friendId,  // auth.users.id directement
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23503') {
          addLog('error', 'Erreur contrainte clé étrangère - utilisateurs non valides', insertError);
          setTestResults(prev => ({ ...prev, sendRequest: 'foreign_key_error' }));
        } else {
          throw insertError;
        }
        return;
      }

      addLog('info', 'Demande d\'amitié envoyée avec succès', newRequest);
      setTestResults(prev => ({ ...prev, sendRequest: 'success' }));

    } catch (error) {
      addLog('error', 'Erreur lors de l\'envoi de la demande d\'amitié', error);
      setTestResults(prev => ({ ...prev, sendRequest: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadFriendRequests = async () => {
    if (!user) {
      addLog('error', 'Aucun utilisateur connecté');
      return;
    }

    addLog('info', 'Test de chargement des demandes d\'amitié...');
    setIsLoading(true);

    try {
      // Utiliser la nouvelle fonction SQL
      const { data, error } = await supabase
        .rpc('get_pending_friend_requests', { target_user_id: user.id });

      if (error) {
        throw error;
      }

      // Reformater les données pour correspondre à l'ancien format
      const formattedRequests = data?.map(request => ({
        id: request.friendship_id,
        user_id: request.requester_user_id,
        requester_profile: {
          user_id: request.requester_user_id,
          display_name: request.requester_display_name,
          avatar_url: request.requester_avatar_url,
          bio: request.requester_bio
        }
      })) || [];

      addLog('info', 'Demandes d\'amitié chargées', { 
        count: formattedRequests.length,
        data: formattedRequests 
      });
      setFriendRequests(formattedRequests);
      setTestResults(prev => ({ ...prev, loadRequests: 'success' }));

    } catch (error) {
      addLog('error', 'Erreur lors du chargement des demandes', error);
      setTestResults(prev => ({ ...prev, loadRequests: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testLoadFriends = async () => {
    if (!user) {
      addLog('error', 'Aucun utilisateur connecté');
      return;
    }

    addLog('info', 'Test de chargement de la liste d\'amis...');
    setIsLoading(true);

    try {
      // Utiliser la nouvelle fonction SQL
      const { data, error } = await supabase
        .rpc('get_user_friends_simple', { target_user_id: user.id });

      if (error) {
        throw error;
      }

      // Reformater les données pour correspondre à l'ancien format
      const formattedFriends = data?.map(friend => ({
        id: friend.friendship_id,
        friend_id: friend.friend_user_id,
        friend_profile: {
          user_id: friend.friend_user_id,
          display_name: friend.friend_display_name,
          avatar_url: friend.friend_avatar_url,
          bio: friend.friend_bio
        }
      })) || [];

      addLog('info', 'Liste d\'amis chargée', { 
        count: formattedFriends.length,
        data: formattedFriends 
      });
      setFriends(formattedFriends);
      setTestResults(prev => ({ ...prev, loadFriends: 'success' }));

    } catch (error) {
      addLog('error', 'Erreur lors du chargement des amis', error);
      setTestResults(prev => ({ ...prev, loadFriends: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testGetSuggestions = async () => {
    if (!user) {
      addLog('error', 'Aucun utilisateur connecté');
      return;
    }

    addLog('info', 'Test de chargement des suggestions d\'amis...');
    setIsLoading(true);

    try {
      // Test RPC function first
      try {
        const { data: rpcSuggestions, error: rpcError } = await supabase
          .rpc('get_friend_suggestions', {
            user_id_param: user.id,
            limit_param: 5
          });

        if (rpcError) {
          addLog('warning', 'Fonction RPC get_friend_suggestions non disponible', rpcError);
        } else {
          addLog('info', 'Suggestions via RPC chargées', { 
            count: rpcSuggestions?.length || 0,
            data: rpcSuggestions 
          });
          setSuggestions(rpcSuggestions || []);
          setTestResults(prev => ({ ...prev, getSuggestions: 'rpc_success' }));
          return;
        }
      } catch (rpcError) {
        addLog('warning', 'Erreur RPC, fallback vers requête directe', rpcError);
      }

      // Fallback to direct query
      const { data: directSuggestions, error: directError } = await supabase
        .from('profiles')
        .select('user_id, display_name, bio, avatar_url')
        .neq('user_id', user.id)
        .eq('is_private', false)
        .limit(5);

      if (directError) {
        throw directError;
      }

      addLog('info', 'Suggestions via requête directe chargées', { 
        count: directSuggestions?.length || 0,
        data: directSuggestions 
      });
      setSuggestions(directSuggestions || []);
      setTestResults(prev => ({ ...prev, getSuggestions: 'direct_success' }));

    } catch (error) {
      addLog('error', 'Erreur lors du chargement des suggestions', error);
      setTestResults(prev => ({ ...prev, getSuggestions: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    addLog('info', '=== DÉBUT DES TESTS AUTOMATIQUES ===');
    setTestResults({});
    
    await testCreateProfile();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testLoadFriendRequests();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testLoadFriends();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetSuggestions();
    
    addLog('info', '=== FIN DES TESTS AUTOMATIQUES ===');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 border-green-300 text-green-800';
      case 'error': return 'bg-red-100 border-red-300 text-red-800';
      case 'checking': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTestResultColor = (result) => {
    switch (result) {
      case 'success':
      case 'created':
      case 'rpc_success':
      case 'direct_success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'already_exists':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Head>
        <title>Test Système d'Amis - COCO</title>
        <meta name="description" content="Page de test et debug du système d'amis" />
      </Head>

      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👥 Test Système d'Amis
              </h1>
              <p className="mt-2 text-gray-600">
                Debug et test des fonctionnalités du système d'amis de COCO
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
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Nom:</strong> {user.user_metadata?.display_name || 'Non défini'}</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center">
                <span className="text-red-600 text-xl mr-3">❌</span>
                <span className="text-red-800 font-medium">Aucun utilisateur connecté</span>
              </div>
              <a href="/login" className="text-red-600 underline ml-8">Se connecter</a>
            </div>
          )}
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🗄️ État des Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded border ${getStatusColor(profilesStatus)}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Table Profiles</span>
                <span className="text-sm">{profilesStatus}</span>
              </div>
            </div>
            <div className={`p-4 rounded border ${getStatusColor(friendshipStatus)}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Table Friendships</span>
                <span className="text-sm">{friendshipStatus}</span>
              </div>
            </div>
          </div>
          <button
            onClick={checkTablesStatus}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Revérifier
          </button>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 Tests Manuels</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <button
              onClick={testCreateProfile}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              👤 Test Profil
            </button>
            <button
              onClick={testLoadFriendRequests}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              📬 Test Demandes
            </button>
            <button
              onClick={testLoadFriends}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              👥 Test Amis
            </button>
            <button
              onClick={testGetSuggestions}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              💡 Test Suggestions
            </button>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Terme de recherche..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={testSearchProfiles}
                disabled={isLoading || !user || searchTerm.length < 2}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                🔍
              </button>
            </div>
            <button
              onClick={runAllTests}
              disabled={isLoading || !user}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
            >
              🚀 Tous les Tests
            </button>
          </div>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Résultats des Tests:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(testResults).map(([test, result]) => (
                  <div key={test} className={`px-3 py-2 rounded border text-sm ${getTestResultColor(result)}`}>
                    <span className="font-medium">{test}:</span> {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Résultats de Recherche ({searchResults.length})</h2>
            <div className="space-y-2">
              {searchResults.map((profile, index) => (
                <div key={profile.user_id || index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{profile.display_name || 'Sans nom'}</span>
                    <span className="text-gray-600 ml-2">({profile.user_id?.substring(0, 8)}...)</span>
                    {profile.bio && <p className="text-sm text-gray-500">{profile.bio}</p>}
                  </div>
                  <button
                    onClick={() => testSendFriendRequest(profile.user_id)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                  >
                    ➕ Ajouter
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Data Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Friend Requests */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">📬 Demandes ({friendRequests.length})</h3>
            {friendRequests.length > 0 ? (
              <div className="space-y-2">
                {friendRequests.map((request) => (
                  <div key={request.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">
                      {request.requester_profile?.display_name || 'Inconnu'}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune demande</p>
            )}
          </div>

          {/* Friends */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">👥 Amis ({friends.length})</h3>
            {friends.length > 0 ? (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">
                      {friend.friend_profile?.display_name || 'Inconnu'}
                    </div>
                    {friend.friend_profile?.bio && (
                      <div className="text-gray-500 text-xs">{friend.friend_profile.bio}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucun ami</p>
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">💡 Suggestions ({suggestions.length})</h3>
            {suggestions.length > 0 ? (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div key={suggestion.user_id} className="p-2 border rounded text-sm">
                    <div className="font-medium">
                      {suggestion.display_name || 'Inconnu'}
                    </div>
                    {suggestion.bio && (
                      <div className="text-gray-500 text-xs">{suggestion.bio}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Aucune suggestion</p>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📋 Logs de Debug ({logs.length})</h2>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Effacer Logs
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
          </div>
          
          {logs.length === 0 && (
            <p className="text-gray-500 text-center py-8">Aucun log disponible</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">🔧 Actions Rapides</h3>
          <div className="flex flex-wrap gap-2">
            <a
              href="/amis"
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              👥 Page Amis
            </a>
            <a
              href="/error-logs"
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              🐛 Logs Système
            </a>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              🔗 Supabase Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
