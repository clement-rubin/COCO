import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { useAuth } from '../components/AuthContext'
import styles from '../styles/SubmitRecipe.module.css'

export default function SubmitRecipe() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const fileInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'Facile',
    prepTime: '',
    cookTime: '',
    portions: 2,
    ingredients: [''],
    instructions: [''],
    tags: '',
    media: []
  })

  const categories = [
    { id: 'italien', label: 'Italien', emoji: '🍝' },
    { id: 'dessert', label: 'Dessert', emoji: '🍰' },
    { id: 'healthy', label: 'Healthy', emoji: '🥗' },
    { id: 'asiatique', label: 'Asiatique', emoji: '🍜' },
    { id: 'bbq', label: 'BBQ', emoji: '🔥' },
    { id: 'vegetarien', label: 'Végétarien', emoji: '🌱' },
    { id: 'francais', label: 'Français', emoji: '🇫🇷' },
    { id: 'autre', label: 'Autre', emoji: '🍽️' }
  ]

  const difficulties = [
    { value: 'Facile', emoji: '😊', color: '#4CAF50' },
    { value: 'Moyen', emoji: '🤔', color: '#FF9800' },
    { value: 'Difficile', emoji: '😤', color: '#F44336' }
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }))
  }

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  const removeArrayItem = (field, index) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }))
    }
  }

  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files)
    const newMedia = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }))
    
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }))
  }

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }))
  }

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulation d'envoi
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Toast de succès simple
    const successToast = document.createElement('div')
    successToast.innerHTML = '✅ Recette publiée avec succès !'
    successToast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    `
    document.body.appendChild(successToast)
    
    setTimeout(() => {
      if (successToast.parentNode) {
        successToast.style.animation = 'slideOut 0.3s ease forwards'
        setTimeout(() => successToast.remove(), 300)
      }
      router.push('/')
    }, 1500)
  }

  const createConfetti = () => {
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div')
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${['#FF6B35', '#F7931E', '#4CAF50', '#2196F3'][Math.floor(Math.random() * 4)]};
        left: ${Math.random() * 100}vw;
        top: -10px;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        animation: confettiFall ${2 + Math.random() * 3}s linear forwards;
      `
      document.body.appendChild(confetti)
      
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti)
        }
      }, 5000)
    }
  }

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Informations de base</h2>
        <p>Étape 1 sur 3</p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label>Nom de la recette *</label>
          <input
            type="text"
            placeholder="Ex: Tarte aux pommes"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea
            placeholder="Décrivez votre recette..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Catégorie</label>
          <div className={styles.categoryGrid}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleInputChange('category', cat.id)}
                className={`${styles.categoryBtn} ${formData.category === cat.id ? styles.active : ''}`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Difficulté</label>
          <div className={styles.difficultyGrid}>
            {difficulties.map(diff => (
              <button
                key={diff.value}
                type="button"
                onClick={() => handleInputChange('difficulty', diff.value)}
                className={`${styles.difficultyBtn} ${formData.difficulty === diff.value ? styles.active : ''}`}
              >
                {diff.emoji} {diff.value}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.timeRow}>
          <div className={styles.formGroup}>
            <label>Préparation (min)</label>
            <input
              type="number"
              placeholder="15"
              value={formData.prepTime}
              onChange={(e) => handleInputChange('prepTime', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Cuisson (min)</label>
            <input
              type="number"
              placeholder="30"
              value={formData.cookTime}
              onChange={(e) => handleInputChange('cookTime', e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Portions</label>
          <div className={styles.portionGrid}>
            {[1,2,3,4,5,6,8,10].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleInputChange('portions', num)}
                className={`${styles.portionBtn} ${formData.portions === num ? styles.active : ''}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Ingrédients & Étapes</h2>
        <p>Étape 2 sur 3</p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label>Ingrédients *</label>
          <div className={styles.ingredientsList}>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className={styles.arrayInput}>
                <span className={styles.itemNumber}>{index + 1}</span>
                <input
                  type="text"
                  placeholder="Ex: 250g de farine"
                  value={ingredient}
                  onChange={(e) => handleArrayChange('ingredients', index, e.target.value)}
                  className={styles.input}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('ingredients', index)}
                    className={styles.removeBtn}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addArrayItem('ingredients')}
            className={styles.addBtn}
          >
            + Ajouter un ingrédient
          </button>
        </div>

        <div className={styles.formGroup}>
          <label>Étapes de préparation *</label>
          <div className={styles.instructionsList}>
            {formData.instructions.map((instruction, index) => (
              <div key={index} className={styles.arrayInput}>
                <span className={styles.itemNumber}>{index + 1}</span>
                <textarea
                  placeholder="Décrivez cette étape..."
                  value={instruction}
                  onChange={(e) => handleArrayChange('instructions', index, e.target.value)}
                  className={styles.textarea}
                  rows={2}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('instructions', index)}
                    className={styles.removeBtn}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addArrayItem('instructions')}
            className={styles.addBtn}
          >
            + Ajouter une étape
          </button>
        </div>

        <div className={styles.formGroup}>
          <label>Mots-clés</label>
          <input
            type="text"
            placeholder="Ex: automne, pommes, dessert"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            className={styles.input}
          />
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>Photos & Publication</h2>
        <p>Étape 3 sur 3</p>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label>Photos (optionnel)</label>
          
          <div className={styles.mediaUpload}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleMediaUpload}
              style={{ display: 'none' }}
            />
            
            {formData.media.length === 0 ? (
              <div 
                className={styles.uploadZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}>📷</div>
                <p>Ajoutez des photos de votre recette</p>
                <button type="button" className={styles.uploadBtn}>
                  Choisir des photos
                </button>
              </div>
            ) : (
              <div className={styles.mediaGrid}>
                {formData.media.map((media, index) => (
                  <div key={index} className={styles.mediaItem}>
                    <Image
                      src={media.url}
                      alt={`Photo ${index + 1}`}
                      width={100}
                      height={100}
                      className={styles.mediaPreview}
                    />
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className={styles.removeMediaBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button 
                  className={styles.addMediaBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Aperçu</label>
          <div className={styles.preview}>
            <h3>{formData.title || 'Ma recette'}</h3>
            <div className={styles.previewMeta}>
              {formData.category && (
                <span>{categories.find(c => c.id === formData.category)?.emoji} {categories.find(c => c.id === formData.category)?.label}</span>
              )}
              <span>{formData.difficulty}</span>
              <span>{formData.portions} portions</span>
              {formData.prepTime && <span>{formData.prepTime}min</span>}
            </div>
            <div className={styles.previewStats}>
              <span>{formData.ingredients.filter(i => i.trim()).length} ingrédients</span>
              <span>{formData.instructions.filter(i => i.trim()).length} étapes</span>
              <span>{formData.media.length} photos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/submit-recipe'))
      return
    }
    setIsLoading(false)
  }, [user, router])

  // Debug: Add console log to check if component renders
  useEffect(() => {
    console.log('SubmitRecipe component mounted, step:', step, 'user:', user, 'isLoading:', isLoading)
  }, [step, user, isLoading])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingScreen}>
          <p>Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Nouvelle recette - COCO</title>
        <meta name="description" content="Partagez votre recette" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className={styles.header}>
        <button onClick={() => router.push('/')} className={styles.backBtn}>
          ← Retour
        </button>
        <h1>Nouvelle recette</h1>
        <div className={styles.stepDots}>
          {[1, 2, 3].map(num => (
            <div 
              key={num}
              className={`${styles.dot} ${step >= num ? styles.active : ''}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className={styles.navigation}>
        {step > 1 && (
          <button onClick={prevStep} className={styles.secondaryBtn}>
            Précédent
          </button>
        )}
        
        {step < 3 ? (
          <button
            onClick={nextStep}
            className={`${styles.primaryBtn} ${step === 1 && !formData.title ? styles.disabled : ''}`}
            disabled={step === 1 && !formData.title}
          >
            Suivant
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className={`${styles.submitBtn} ${isSubmitting || !formData.title ? styles.disabled : ''}`}
            disabled={isSubmitting || !formData.title}
          >
            {isSubmitting ? 'Publication...' : 'Publier'}
          </button>
        )}
      </div>
    </div>
  )
}
