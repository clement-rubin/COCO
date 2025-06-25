import { useState, useRef } from 'react'
import { processImageForDirectStorage, validateImageFile } from '../utils/imageUtils'
import { logInfo, logError, logDebug, logWarning } from '../utils/logger'

export default function TestImageUpload() {
  const [logs, setLogs] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  // Fonction pour ajouter un log à l'interface
  const addLog = (level, message, details = null) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      details: details ? JSON.stringify(details, null, 2) : null
    }
    
    setLogs(prev => [logEntry, ...prev].slice(0, 100)) // Garder seulement les 100 derniers logs
    
    // Aussi logger dans la console
    const consoleMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`
    if (details) {
      console.log(consoleMsg, details)
    } else {
      console.log(consoleMsg)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    
    addLog('info', '📁 Fichier sélectionné', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      lastModified: file?.lastModified,
      lastModifiedDate: file?.lastModified ? new Date(file.lastModified).toISOString() : null
    })

    if (file) {
      setSelectedFile(file)
      
      // Validation immédiate
      const validation = validateImageFile(file)
      if (validation.valid) {
        addLog('success', '✅ Validation du fichier réussie')
        
        // Créer un aperçu
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewUrl(e.target.result)
          addLog('info', '🖼️ Aperçu généré', {
            previewLength: e.target.result.length,
            previewType: e.target.result.substring(0, 30) + '...'
          })
        }
        reader.onerror = (e) => {
          addLog('error', '❌ Erreur génération aperçu', { error: e.target.error })
        }
        reader.readAsDataURL(file)
      } else {
        addLog('error', '❌ Validation du fichier échouée', {
          errors: validation.errors
        })
        setSelectedFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      addLog('warning', '⚠️ Aucun fichier sélectionné')
      return
    }

    setIsUploading(true)
    setResult(null)
    
    try {
      addLog('info', '🚀 Début du traitement d\'image', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        processingStartTime: new Date().toISOString()
      })

      const startTime = performance.now()
      
      // Traitement de l'image
      const dataUrl = await processImageForDirectStorage(selectedFile, `test_${Date.now()}`)
      
      const endTime = performance.now()
      const processingTime = Math.round(endTime - startTime)

      addLog('success', '✅ Traitement d\'image terminé', {
        processingTimeMs: processingTime,
        originalSize: selectedFile.size,
        processedDataUrlLength: dataUrl.length,
        estimatedCompressedSize: Math.round(dataUrl.length * 0.75), // Approximation
        compressionRatio: Math.round((1 - (dataUrl.length * 0.75) / selectedFile.size) * 100) + '%',
        dataUrlPrefix: dataUrl.substring(0, 50) + '...',
        isValidDataUrl: dataUrl.startsWith('data:image/'),
        processingEndTime: new Date().toISOString()
      })

      // Test de stockage en base (simulation)
      addLog('info', '💾 Simulation stockage en base de données', {
        tableName: 'recipes',
        columnName: 'image',
        dataType: 'text',
        dataLength: dataUrl.length,
        estimatedStorageSize: Math.round(dataUrl.length / 1024) + ' KB'
      })

      // Test d'insertion simulée
      const insertData = {
        title: 'Test Recipe with Image',
        description: 'Recipe créée pour tester l\'upload d\'image',
        image: dataUrl,
        category: 'Test',
        author: 'Test User',
        ingredients: ['Test ingredient'],
        instructions: [{ step: 1, instruction: 'Test instruction' }]
      }

      addLog('info', '📝 Données préparées pour insertion', {
        title: insertData.title,
        hasImage: !!insertData.image,
        imageDataLength: insertData.image.length,
        ingredientsCount: insertData.ingredients.length,
        instructionsCount: insertData.instructions.length,
        estimatedTotalSize: JSON.stringify(insertData).length + ' caractères'
      })

      // Simuler l'appel API
      addLog('info', '🌐 Test appel API /api/recipes', {
        method: 'POST',
        endpoint: '/api/recipes',
        payloadSize: JSON.stringify(insertData).length,
        simulationMode: true
      })

      // Ici, on pourrait faire un vrai appel API si nécessaire
      // const response = await fetch('/api/recipes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(insertData)
      // })

      addLog('success', '🎉 Test complet réussi !', {
        totalProcessingTime: processingTime + 'ms',
        finalImageSize: Math.round(dataUrl.length / 1024) + ' KB',
        compressionEffective: true,
        readyForDatabase: true
      })

      setResult({
        success: true,
        dataUrl,
        originalSize: selectedFile.size,
        compressedSize: Math.round(dataUrl.length * 0.75),
        processingTime
      })

    } catch (error) {
      addLog('error', '❌ Erreur lors du traitement', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500),
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        timestamp: new Date().toISOString()
      })

      logError('Erreur upload test', error, {
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size
      })

      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setIsUploading(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog('info', '🧹 Logs effacés')
  }

  const clearAll = () => {
    setLogs([])
    setResult(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    addLog('info', '🆕 Interface réinitialisée')
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Test Upload Image (Stockage Direct)</h1>
      <p>Test du système de traitement d'images avec stockage direct des data URLs dans la base de données.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        {/* Panneau de contrôle */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2>📋 Contrôles</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="imageInput" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Sélectionner une image :
            </label>
            <input
              ref={fileInputRef}
              id="imageInput"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          {selectedFile && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
              <h4>📄 Fichier sélectionné :</h4>
              <p><strong>Nom :</strong> {selectedFile.name}</p>
              <p><strong>Taille :</strong> {Math.round(selectedFile.size / 1024)} KB</p>
              <p><strong>Type :</strong> {selectedFile.type}</p>
            </div>
          )}

          {previewUrl && (
            <div style={{ marginBottom: '15px' }}>
              <h4>🖼️ Aperçu :</h4>
              <img 
                src={previewUrl} 
                alt="Aperçu" 
                style={{ maxWidth: '100%', maxHeight: '200px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedFile && !isUploading ? '#007bff' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedFile && !isUploading ? 'pointer' : 'not-allowed'
              }}
            >
              {isUploading ? '⏳ Traitement...' : '🚀 Traiter l\'image'}
            </button>
            
            <button
              onClick={clearLogs}
              style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🧹 Effacer logs
            </button>
            
            <button
              onClick={clearAll}
              style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              🆕 Tout effacer
            </button>
          </div>

          {result && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: result.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px'
            }}>
              <h4>{result.success ? '✅ Succès !' : '❌ Erreur'}</h4>
              {result.success ? (
                <div>
                  <p><strong>Taille originale :</strong> {Math.round(result.originalSize / 1024)} KB</p>
                  <p><strong>Taille compressée :</strong> {Math.round(result.compressedSize / 1024)} KB</p>
                  <p><strong>Temps de traitement :</strong> {result.processingTime} ms</p>
                  <p><strong>Data URL générée :</strong> ✅ Prête pour stockage en DB</p>
                </div>
              ) : (
                <p><strong>Erreur :</strong> {result.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Panneau de logs */}
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px' }}>
          <h2>📋 Logs détaillés ({logs.length})</h2>
          
          <div style={{ 
            height: '500px', 
            overflow: 'auto', 
            backgroundColor: '#1e1e1e', 
            color: '#fff', 
            padding: '10px', 
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {logs.length === 0 ? (
              <p style={{ color: '#888' }}>Aucun log pour le moment...</p>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
                  <div style={{ 
                    color: log.level === 'error' ? '#ff6b6b' : 
                          log.level === 'warning' ? '#ffd93d' : 
                          log.level === 'success' ? '#51cf66' : '#74c0fc'
                  }}>
                    [{log.timestamp.split('T')[1].split('.')[0]}] {log.message}
                  </div>
                  {log.details && (
                    <pre style={{ 
                      margin: '5px 0 0 20px', 
                      fontSize: '11px', 
                      color: '#ccc',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {log.details}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
        <h3>ℹ️ Informations sur le stockage</h3>
        <ul>
          <li><strong>Méthode :</strong> Stockage direct des data URLs dans la colonne 'image' de la table 'recipes'</li>
          <li><strong>Format :</strong> Images compressées en JPEG avec qualité optimisée</li>
          <li><strong>Taille max :</strong> 500 KB par image après compression</li>
          <li><strong>Avantages :</strong> Pas de gestion de buckets, données auto-contenues, simplicité</li>
          <li><strong>Inconvénients :</strong> Taille de base de données plus importante</li>
        </ul>
      </div>
    </div>
  )
}
