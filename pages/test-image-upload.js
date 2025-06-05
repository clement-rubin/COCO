import { useState } from 'react'
import Head from 'next/head'
import { uploadImageToSupabaseAndGetUrl } from '../utils/imageUtils'
import { logInfo, logError } from '../utils/logger'

export default function TestImageUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setImageUrl('')
    setError('')
    setLogs([])
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError('')
    setImageUrl('')
    setLogs([])

    setLogs(logs => [...logs, 'Début de l\'upload...'])
    logInfo('Début de l\'upload du fichier', { name: selectedFile.name, size: selectedFile.size })

    try {
      const url = await uploadImageToSupabaseAndGetUrl(selectedFile, `test_${Date.now()}`)
      setLogs(logs => [...logs, `URL obtenue: ${url}`])
      logInfo('Upload réussi', { url })
      setImageUrl(url)
    } catch (err) {
      setLogs(logs => [...logs, `Erreur: ${err.message}`])
      logError('Erreur upload test', err)
      setError(err.message)
    } finally {
      setUploading(false)
      setLogs(logs => [...logs, 'Upload terminé'])
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <Head>
        <title>Test Upload Image</title>
      </Head>
      <h1>Test Upload Image vers Supabase</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
      <button onClick={handleUpload} disabled={!selectedFile || uploading} style={{ marginLeft: 12 }}>
        {uploading ? 'Upload en cours...' : 'Uploader'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 12 }}>Erreur: {error}</div>}
      {imageUrl && (
        <div style={{ marginTop: 16 }}>
          <div>URL Supabase:</div>
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">{imageUrl}</a>
          <div>
            <img src={imageUrl} alt="uploaded" style={{ maxWidth: 300, marginTop: 8 }} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <h3>Logs</h3>
        <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 4, fontSize: 13 }}>
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </pre>
      </div>
    </div>
  )
}
