import { useState, useRef, useEffect } from 'react';
import { uploadImageAsBytes, createRecipesTableIfNotExists } from '../lib/supabase';
import { logInfo, logError, logDebug } from '../utils/logger';

export default function TestUpload() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [bucketStatus, setBucketStatus] = useState('checking'); // checking, available, error
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Vérifier le bucket au chargement de la page
  useEffect(() => {
    checkBucketStatus();
  }, []);

  const checkBucketStatus = async () => {
    try {
      addLog('info', 'Vérification du bucket de stockage au chargement...');
      setBucketStatus('checking');
      
      const isAvailable = await createRecipesTableIfNotExists();
      
      if (isAvailable) {
        setBucketStatus('available');
        addLog('info', '✅ Bucket recipe-images disponible et configuré');
      } else {
        setBucketStatus('error');
        addLog('error', '❌ Bucket recipe-images non disponible - configuration requise');
      }
    } catch (error) {
      setBucketStatus('error');
      addLog('error', '❌ Erreur lors de la vérification du bucket', error);
    }
  };

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now(),
      timestamp,
      type,
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 50)); // Garder seulement les 50 derniers logs
    
    // Aussi logger dans la console
    if (type === 'error') {
      logError(`[TEST-UPLOAD] ${message}`, data);
    } else if (type === 'info') {
      logInfo(`[TEST-UPLOAD] ${message}`, data);
    } else {
      logDebug(`[TEST-UPLOAD] ${message}`, data);
    }
  };

  const validateFile = (file) => {
    addLog('debug', 'Validation du fichier', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier doit être une image');
    }

    if (file.size > 6 * 1024 * 1024) { // 6MB
      throw new Error(`Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 6MB)`);
    }

    addLog('info', 'Fichier validé avec succès');
  };

  const generateUniqueFileName = (originalName, source) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 20);
    return `${source}_${baseName}_${timestamp}_${random}.${extension}`;
  };

  const handleFileUpload = async (file, source) => {
    const testId = `test_${Date.now()}_${source}`;
    
    try {
      addLog('info', `Début du test d'upload (${source})`, {
        testId,
        fileName: file.name,
        source,
        bucketStatus,
        fileSize: file.size,
        fileType: file.type
      });

      // Vérifier que le bucket est disponible avant de commencer
      if (bucketStatus !== 'available') {
        addLog('warning', 'Revérification du bucket avant upload...');
        const bucketAvailable = await createRecipesTableIfNotExists();
        if (!bucketAvailable) {
          throw new Error('Le bucket de stockage n\'est pas disponible. Veuillez configurer Supabase Storage.');
        }
        setBucketStatus('available');
        addLog('info', 'Bucket vérifié et disponible');
      }

      setIsUploading(true);
      setUploadStatus(`Upload en cours... (${source})`);

      // Validation
      validateFile(file);

      // Générer un nom de fichier unique
      const uniqueFileName = generateUniqueFileName(file.name, source);
      addLog('debug', 'Nom de fichier généré', { 
        original: file.name, 
        unique: uniqueFileName 
      });

      // Test 1: Upload simple (conversion en bytes)
      addLog('info', 'Test 1: Conversion en bytes');
      let uploadResult;
      try {
        uploadResult = await uploadImageAsBytes(file);
        addLog('info', 'Conversion en bytes réussie', {
          bytesLength: uploadResult.bytes?.length,
          processedSize: uploadResult.processedSize,
          resultKeys: Object.keys(uploadResult)
        });
      } catch (error) {
        addLog('error', 'Conversion en bytes échouée', {
          error: error.message,
          errorName: error.constructor.name,
          stack: error.stack
        });
        
        // Test 2: Retry simple
        addLog('info', 'Test 2: Retry de conversion');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        try {
          uploadResult = await uploadImageAsBytes(file);
          addLog('info', 'Retry réussi', {
            bytesLength: uploadResult.bytes?.length,
            processedSize: uploadResult.processedSize
          });
        } catch (retryError) {
          addLog('error', 'Retry également échoué', {
            error: retryError.message,
            errorName: retryError.constructor.name
          });
          throw retryError;
        }
      }

      // Vérifier le résultat de conversion
      if (!uploadResult || !uploadResult.bytes || !Array.isArray(uploadResult.bytes)) {
        addLog('error', 'Résultat de conversion invalide', {
          hasResult: !!uploadResult,
          hasBytes: !!uploadResult?.bytes,
          bytesType: typeof uploadResult?.bytes,
          bytesIsArray: Array.isArray(uploadResult?.bytes)
        });
        throw new Error('La conversion en bytes a échoué: résultat invalide');
      }

      // Créer une URL de prévisualisation depuis le fichier original
      const previewUrl = URL.createObjectURL(file);
      addLog('info', 'URL de prévisualisation créée', { url: 'blob:// URL créée' });

      // Ajouter à la liste des images uploadées
      const imageInfo = {
        id: testId,
        path: `bytes_${uniqueFileName}`,
        url: previewUrl,
        fileName: uniqueFileName,
        source,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        fileType: file.type,
        bytesLength: uploadResult.bytes.length,
        processedSize: uploadResult.processedSize
      };

      setUploadedImages(prev => [imageInfo, ...prev]);
      setUploadStatus(`✅ Conversion réussie (${source})`);
      
      addLog('info', 'Test de conversion terminé avec succès', imageInfo);

    } catch (error) {
      const errorMsg = `❌ Erreur lors de la conversion: ${error.message}`;
      setUploadStatus(errorMsg);
      
      addLog('error', 'Échec du test de conversion', {
        testId,
        source,
        error: error.message,
        errorName: error.constructor.name,
        stack: error.stack,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      addLog('info', 'Fichier sélectionné depuis la galerie', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      handleFileUpload(file, 'gallery');
    }
    // Reset input
    event.target.value = '';
  };

  const handleCameraUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      addLog('info', 'Photo prise avec la caméra', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      handleFileUpload(file, 'camera');
    }
    // Reset input
    event.target.value = '';
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs effacés');
  };

  const clearImages = () => {
    setUploadedImages([]);
    addLog('info', 'Liste des images effacée');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Test Upload d'Images</h1>
        
        {/* Status du bucket */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">État du Bucket Supabase Storage</h2>
          
          <div className={`p-4 rounded-lg ${
            bucketStatus === 'available' ? 'bg-green-100 border border-green-300' :
            bucketStatus === 'error' ? 'bg-red-100 border border-red-300' :
            'bg-yellow-100 border border-yellow-300'
          }`}>
            {bucketStatus === 'checking' && (
              <div className="flex items-center">
                <div className="animate-spin w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full mr-3"></div>
                <span className="text-yellow-800">Vérification du bucket en cours...</span>
              </div>
            )}
            
            {bucketStatus === 'available' && (
              <div className="flex items-center">
                <span className="text-green-600 text-xl mr-3">✅</span>
                <div>
                  <p className="text-green-800 font-medium">Bucket recipe-images disponible</p>
                  <p className="text-green-600 text-sm">Configuration correcte - Upload d'images possible</p>
                </div>
              </div>
            )}
            
            {bucketStatus === 'error' && (
              <div>
                <div className="flex items-center mb-4">
                  <span className="text-red-600 text-xl mr-3">❌</span>
                  <div>
                    <p className="text-red-800 font-medium">Problème avec le bucket recipe-images</p>
                    <p className="text-red-600 text-sm">Configuration Supabase requise</p>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <h3 className="font-medium text-red-800 mb-2">🔧 Étapes de configuration :</h3>
                  <ol className="text-sm text-red-700 space-y-1 list-decimal list-inside">
                    <li>Allez dans votre <strong>dashboard Supabase</strong></li>
                    <li>Cliquez sur <strong>Storage &gt; Buckets</strong></li>
                    <li>Cliquez sur <strong>"New bucket"</strong></li>
                    <li>Nom : <code className="bg-red-100 px-1 rounded">recipe-images</code></li>
                    <li><strong>⚠️ IMPORTANT :</strong> Cochez <strong>"Public bucket"</strong></li>
                    <li>Cliquez sur <strong>"Create bucket"</strong></li>
                    <li>Exécutez les politiques SQL du README</li>
                  </ol>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                  <h3 className="font-medium text-blue-800 mb-2">🔍 Vérifications supplémentaires :</h3>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Vérifiez vos variables d'environnement dans <code>.env.local</code></li>
                    <li>Assurez-vous que votre projet Supabase est actif</li>
                    <li>Consultez les logs ci-dessous pour plus de détails</li>
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={checkBucketStatus}
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    🔄 Revérifier
                  </button>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    🔗 Ouvrir Supabase
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boutons de test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tests d'Upload</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test 1: Sélection depuis la galerie
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleGalleryUpload}
                disabled={isUploading || bucketStatus !== 'available'}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test 2: Prise de photo avec caméra
              </label>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraUpload}
                disabled={isUploading || bucketStatus !== 'available'}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
              />
            </div>
          </div>

          {uploadStatus && (
            <div className={`mt-4 p-3 rounded ${
              uploadStatus.includes('✅') ? 'bg-green-100 text-green-800' : 
              uploadStatus.includes('❌') ? 'bg-red-100 text-red-800' : 
              'bg-blue-100 text-blue-800'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Images uploadées */}
        {uploadedImages.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Images Uploadées ({uploadedImages.length})</h2>
              <button
                onClick={clearImages}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Effacer
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.id} className="border rounded-lg p-4">
                  <img
                    src={image.url}
                    alt={`Upload ${image.source}`}
                    className="w-full h-48 object-cover rounded mb-2"
                  />
                  <div className="text-sm text-gray-600">
                    <p><strong>Source:</strong> {image.source}</p>
                    <p><strong>Fichier:</strong> {image.fileName}</p>
                    <p><strong>Taille:</strong> {(image.fileSize / 1024).toFixed(1)} KB</p>
                    <p><strong>Uploadé:</strong> {new Date(image.uploadedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Logs de Debug ({logs.length})</h2>
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
                className={`p-3 rounded text-sm ${
                  log.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
                  log.type === 'info' ? 'bg-blue-50 border-l-4 border-blue-500' :
                  'bg-gray-50 border-l-4 border-gray-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs text-gray-500">{log.timestamp}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    log.type === 'error' ? 'bg-red-200 text-red-800' :
                    log.type === 'info' ? 'bg-blue-200 text-blue-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {log.type.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 font-medium">{log.message}</p>
                {log.data && (
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
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
      </div>
    </div>
  );
}

