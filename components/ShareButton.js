import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import styles from '../styles/ShareButton.module.css'
import { getRecipeImageUrl } from '../lib/supabase'

export default function ShareButton({ recipe, recipeUrl, onShare, compact = false }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareCount, setShareCount] = useState(recipe.shareCount || 0)
  const [recentShares, setRecentShares] = useState([])

  const shareData = {
    title: recipe.title,
    text: `🍴 Découvre cette délicieuse recette: ${recipe.title} sur COCO!`,
    url: recipeUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    image: getRecipeImageUrl(recipe.image)
  }

  // Simuler des partages récents pour créer de l'engagement
  useEffect(() => {
    const mockRecentShares = [
      { user: 'Marie', time: '2 min', platform: 'WhatsApp' },
      { user: 'Pierre', time: '5 min', platform: 'Instagram' },
      { user: 'Sophie', time: '12 min', platform: 'Facebook' }
    ]
    setRecentShares(mockRecentShares)
  }, [])

  const handleShare = (platform) => {
    setShareCount(prev => prev + 1)
    onShare && onShare(platform)
    
    // Effet de succès
    const button = document.querySelector(`.${styles.shareButton}`)
    if (button) {
      button.style.transform = 'scale(1.1)'
      setTimeout(() => {
        button.style.transform = ''
      }, 200)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        handleShare('native')
      } catch (err) {
        if (err.name !== 'AbortError') {
          setIsOpen(true)
        }
      }
    } else {
      setIsOpen(true)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url)
      setCopied(true)
      handleShare('clipboard')
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`${shareData.text}\n\n${shareData.url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    handleShare('whatsapp')
    setIsOpen(false)
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(shareData.url)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
    handleShare('facebook')
    setIsOpen(false)
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(shareData.text)
    const url = encodeURIComponent(shareData.url)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
    handleShare('twitter')
    setIsOpen(false)
  }

  const shareToInstagram = () => {
    copyToClipboard()
    handleShare('instagram')
    setIsOpen(false)
    
    // Notification améliorée
    const notification = document.createElement('div')
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #E1306C, #F56040);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">📷</span>
        <div>
          <div style="font-weight: 600;">Lien copié !</div>
          <div style="font-size: 0.9rem; opacity: 0.9;">Collez-le dans votre story Instagram</div>
        </div>
      </div>
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 4000)
  }

  const shareToStory = () => {
    // Créer une story-like image avec canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 1080
    canvas.height = 1920
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#FF6B35')
    gradient.addColorStop(1, '#F7931E')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Add text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 60px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Nouvelle recette sur COCO!', canvas.width/2, 300)
    ctx.font = '40px Arial'
    ctx.fillText(recipe.title, canvas.width/2, 400)
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coco-story-${recipe.title.replace(/\s+/g, '-')}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
    
    handleShare('story')
    setIsOpen(false)
  }

  const handleShareClick = () => {
    // Rediriger vers la page de partage de photo
    router.push('/share-photo')
  }

  if (compact) {
    return (
      <button 
        className={styles.shareButton}
        onClick={handleShareClick}
        aria-label="Partager une photo"
      >
        <span className={styles.shareIcon}>📤</span>
      </button>
    )
  }

  return (
    <div className={styles.shareContainer}>
      <button 
        className={styles.shareButton}
        onClick={handleShareClick}
        aria-label="Partager une photo"
      >
        <span className={styles.shareIcon}>📤</span>
        <span>Partager une photo</span>
      </button>
    </div>
  )
}
