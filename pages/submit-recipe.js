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
    if (step < 3) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulation d'envoi
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Redirection vers le feed avec animation de succès
    const successToast = document.createElement('div')
    successToast.innerHTML = '🎉 Recette publiée avec succès !'
    successToast.className = styles.successToast
    document.body.appendChild(successToast)
    
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  const renderStep1 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>📝 Informations de base</h2>
        <p>Donnez vie à votre recette</p>
      </div>

      <div className={styles.formGroup}>
        <label>Titre de la recette *</label>
        <input
          type="text"
          placeholder="Ex: Pasta Carbonara Authentique"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Description</label>
        <textarea
          placeholder="Décrivez votre recette en quelques mots..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>Temps de préparation</label>
          <input
            type="number"
            placeholder="15"
            value={formData.prepTime}
            onChange={(e) => handleInputChange('prepTime', e.target.value)}
            className={styles.input}
          />
          <span className={styles.unit}>min</span>
        </div>
        <div className={styles.formGroup}>
          <label>Temps de cuisson</label>
          <input
            type="number"
            placeholder="30"
            value={formData.cookTime}
            onChange={(e) => handleInputChange('cookTime', e.target.value)}
            className={styles.input}
          />
          <span className={styles.unit}>min</span>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label>Portions</label>
          <div className={styles.potionSelector}>
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

      <div className={styles.formGroup}>
        <label>Difficulté</label>
        <div className={styles.difficultySelector}>
          {difficulties.map(diff => (
            <button
              key={diff.value}
              type="button"
              onClick={() => handleInputChange('difficulty', diff.value)}
              className={`${styles.difficultyBtn} ${formData.difficulty === diff.value ? styles.active : ''}`}
              style={{ '--accent-color': diff.color }}
            >
              <span className={styles.emoji}>{diff.emoji}</span>
              <span>{diff.value}</span>
            </button>
          ))}
        </div>
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
              <span className={styles.emoji}>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>🥘 Ingrédients & Instructions</h2>
        <p>Le cœur de votre recette</p>
      </div>

      <div className={styles.formGroup}>
        <label>Ingrédients *</label>
        {formData.ingredients.map((ingredient, index) => (
          <div key={index} className={styles.arrayInput}>
            <input
              type="text"
              placeholder={`Ingrédient ${index + 1}...`}
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
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('ingredients')}
          className={styles.addBtn}
        >
          ➕ Ajouter un ingrédient
        </button>
      </div>

      <div className={styles.formGroup}>
        <label>Instructions *</label>
        {formData.instructions.map((instruction, index) => (
          <div key={index} className={styles.arrayInput}>
            <textarea
              placeholder={`Étape ${index + 1}...`}
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
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('instructions')}
          className={styles.addBtn}
        >
          ➕ Ajouter une étape
        </button>
      </div>

      <div className={styles.formGroup}>
        <label>Tags</label>
        <input
          type="text"
          placeholder="#italien #pasta #authentique"
          value={formData.tags}
          onChange={(e) => handleInputChange('tags', e.target.value)}
          className={styles.input}
        />
        <small>Séparez les tags par des espaces</small>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h2>📸 Photos & Vidéos</h2>
        <p>Rendez votre recette irrésistible</p>
      </div>

      <div className={styles.mediaUpload}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleMediaUpload}
          className={styles.hiddenInput}
        />
        
        {formData.media.length === 0 ? (
          <div 
            className={styles.uploadZone}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadIcon}>📸</div>
            <h3>Ajoutez vos médias</h3>
            <p>Photos ou vidéos de votre recette</p>
            <button type="button" className={styles.uploadBtn}>
              Choisir des fichiers
            </button>
          </div>
        ) : (
          <div className={styles.mediaGrid}>
            {formData.media.map((media, index) => (
              <div key={index} className={styles.mediaItem}>
                {media.type === 'video' ? (
                  <video
                    src={media.url}
                    className={styles.mediaPreview}
                    controls
                  />
                ) : (
                  <Image
                    src={media.url}
                    alt={`Media ${index + 1}`}
                    width={200}
                    height={200}
                    className={styles.mediaPreview}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className={styles.removeMediaBtn}
                >
                  ✕
                </button>
              </div>
            ))}
            <div 
              className={styles.addMediaBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              ➕
            </div>
          </div>
        )}
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: '#666'
        }}>
          Chargement...
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Partager une recette - COCO</title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
      </Head>

      <div className={styles.header}>
        <button
          onClick={() => router.push('/')}
          className={styles.backBtn}
        >
          ← Retour
        </button>
        <h1>Créer une recette</h1>
        <div className={styles.stepIndicator}>
          <span className={step >= 1 ? styles.active : ''}></span>
          <span className={step >= 2 ? styles.active : ''}></span>
          <span className={step >= 3 ? styles.active : ''}></span>
        </div>
      </div>

      <div className={styles.formContainer}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className={styles.actions}>
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className={styles.secondaryBtn}
            >
              ← Précédent
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className={styles.primaryBtn}
              disabled={step === 1 && !formData.title}
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitBtn}
              disabled={isSubmitting || !formData.title || formData.ingredients.every(i => !i)}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Publication...
                </>
              ) : (
                <>🚀 Publier la recette</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
