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
        <div className={styles.stepIconBadge}>✨</div>
        <h2>Informations générales</h2>
        <p className={styles.stepDescription}>Donnez vie à votre création culinaire</p>
        <div className={styles.progressInfo}>
          <span className={styles.currentStep}>Étape 1</span>
          <span className={styles.totalSteps}>sur 3</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label className={styles.requiredLabel}>
            <span className={styles.sectionIcon}>📝</span>
            Nom de votre recette <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Tarte aux pommes de grand-mère"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>
            <span className={styles.sectionIcon}>💭</span>
            Description
          </label>
          <textarea
            placeholder="Racontez l'histoire de cette recette, ses origines, ce qui la rend spéciale..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={styles.textarea}
            rows={4}
          />
        </div>

        <div className={styles.formGroup}>
          <label>
            <span className={styles.sectionIcon}>🍽️</span>
            Catégorie
          </label>
          <p className={styles.sectionHelp}>Choisissez la catégorie qui correspond le mieux à votre recette</p>
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

        <div className={styles.formGroup}>
          <label>
            <span className={styles.sectionIcon}>🔥</span>
            Niveau de difficulté
          </label>
          <p className={styles.sectionHelp}>Aidez les autres cuisiniers à savoir à quoi s'attendre</p>
          <div className={styles.difficultySelector}>
            {difficulties.map(diff => (
              <button
                key={diff.value}
                type="button"
                onClick={() => handleInputChange('difficulty', diff.value)}
                className={`${styles.difficultyBtn} ${formData.difficulty === diff.value ? styles.active : ''}`}
              >
                <span className={styles.emoji}>{diff.emoji}</span>
                <span>{diff.value}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formSection}>
          <h3><span className={styles.sectionIcon}>⏰</span> Temps de préparation</h3>
          <p className={styles.sectionHelp}>Donnez une estimation réaliste du temps nécessaire</p>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Préparation</label>
              <div className={styles.inputWithUnit}>
                <input
                  type="number"
                  placeholder="15"
                  value={formData.prepTime}
                  onChange={(e) => handleInputChange('prepTime', e.target.value)}
                  className={styles.input}
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Cuisson</label>
              <div className={styles.inputWithUnit}>
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
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>
            <span className={styles.sectionIcon}>👥</span>
            Nombre de portions
          </label>
          <p className={styles.sectionHelp}>Pour combien de personnes cette recette est-elle prévue ?</p>
          <div className={styles.portionSelector}>
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
        <div className={styles.stepIconBadge}>🥘</div>
        <h2>Ingrédients & Préparation</h2>
        <p className={styles.stepDescription}>Le cœur de votre recette</p>
        <div className={styles.progressInfo}>
          <span className={styles.currentStep}>Étape 2</span>
          <span className={styles.totalSteps}>sur 3</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.ingredientsSection}>
          <h3>
            <span className={styles.sectionIcon}>🛒</span> Liste des ingrédients 
            <span className={styles.required}>*</span>
          </h3>
          <p className={styles.sectionHelp}>
            Listez tous les ingrédients avec leurs quantités précises. Soyez aussi détaillé que possible !
          </p>
          <div className={styles.ingredientsList}>
            {formData.ingredients.map((ingredient, index) => (
              <div key={index} className={styles.arrayInput}>
                <div className={styles.itemNumberBadge}>{index + 1}</div>
                <input
                  type="text"
                  placeholder={`Ex: 250g de farine T65`}
                  value={ingredient}
                  onChange={(e) => handleArrayChange('ingredients', index, e.target.value)}
                  className={styles.input}
                />
                {formData.ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('ingredients', index)}
                    className={styles.removeBtn}
                    title="Supprimer cet ingrédient"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ajouter un ingrédient
          </button>
        </div>

        <div className={styles.instructionsSection}>
          <h3>
            <span className={styles.sectionIcon}>👨‍🍳</span> Étapes de préparation 
            <span className={styles.required}>*</span>
          </h3>
          <p className={styles.sectionHelp}>
            Décrivez chaque étape clairement et dans l'ordre. Pensez aux débutants qui suivront votre recette !
          </p>
          <div className={styles.instructionsList}>
            {formData.instructions.map((instruction, index) => (
              <div key={index} className={`${styles.arrayInput} ${styles.instructionItem}`}>
                <div className={styles.itemNumberPill}>Étape {index + 1}</div>
                <textarea
                  placeholder={`Ex: Préchauffer le four à 180°C. Dans un saladier, mélanger la farine et le sucre...`}
                  value={instruction}
                  onChange={(e) => handleArrayChange('instructions', index, e.target.value)}
                  className={styles.textarea}
                  rows={3}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('instructions', index)}
                    className={styles.removeBtn}
                    title="Supprimer cette étape"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ajouter une étape
          </button>
        </div>

        <div className={styles.tagsSection}>
          <h3><span className={styles.sectionIcon}>🏷️</span> Mots-clés</h3>
          <p className={styles.sectionHelp}>
            Ajoutez des mots-clés pour aider la communauté à découvrir votre recette
          </p>
          <input
            type="text"
            placeholder="Ex: automne pommes pâtisserie traditionnelle weekend"
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
        <div className={styles.stepIconBadge}>📷</div>
        <h2>Photos & Finalisation</h2>
        <p className={styles.stepDescription}>Rendez votre recette irrésistible</p>
        <div className={styles.progressInfo}>
          <span className={styles.currentStep}>Étape 3</span>
          <span className={styles.totalSteps}>sur 3</span>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.mediaSection}>
          <h3><span className={styles.sectionIcon}>📸</span> Photos de votre création</h3>
          <p className={styles.sectionHelp}>
            Une belle photo fait toute la différence ! Montrez le résultat final et pourquoi pas quelques étapes clés.
          </p>
          
          <div className={styles.mediaUpload}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className={styles.hiddenInput}
              style={{ display: 'none' }}
            />
            
            {formData.media.length === 0 ? (
              <div 
                className={styles.uploadZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.632 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.632 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h4 style={{ margin: '16px 0 8px 0', color: '#374151' }}>Ajoutez vos photos</h4>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>Photos du plat fini, des ingrédients, ou des étapes</p>
                <button type="button" className={styles.uploadBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Choisir des photos
                </button>
              </div>
            ) : (
              <>
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
                          alt={`Photo ${index + 1}`}
                          width={200}
                          height={200}
                          className={styles.mediaPreview}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className={styles.removeMediaBtn}
                        title="Supprimer cette photo"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div 
                    className={styles.addMediaBtn}
                    onClick={() => fileInputRef.current?.click()}
                    title="Ajouter plus de photos"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.recapSection}>
          <h3><span className={styles.sectionIcon}>📋</span> Aperçu de votre recette</h3>
          <div className={styles.recapCard}>
            <div className={styles.recapHeader}>
              <h4>{formData.title || 'Ma délicieuse recette'}</h4>
              {formData.category && (
                <span className={styles.recapCategory}>
                  {categories.find(c => c.id === formData.category)?.emoji} 
                  {categories.find(c => c.id === formData.category)?.label}
                </span>
              )}
            </div>
            <div className={styles.recapDetails}>
              <div className={styles.recapItem}>
                <span className={styles.recapIcon}>🔥</span>
                <span>{formData.difficulty}</span>
              </div>
              <div className={styles.recapItem}>
                <span className={styles.recapIcon}>👥</span>
                <span>{formData.portions} portion{formData.portions > 1 ? 's' : ''}</span>
              </div>
              {formData.prepTime && (
                <div className={styles.recapItem}>
                  <span className={styles.recapIcon}>⏱️</span>
                  <span>{formData.prepTime}min prep</span>
                </div>
              )}
              {formData.cookTime && (
                <div className={styles.recapItem}>
                  <span className={styles.recapIcon}>🍳</span>
                  <span>{formData.cookTime}min cuisson</span>
                </div>
              )}
            </div>
            <div className={styles.recapStats}>
              <div className={styles.recapStatItem}>
                <div className={styles.recapStatNumber}>
                  {formData.ingredients.filter(i => i.trim()).length}
                </div>
                <div className={styles.recapStatLabel}>
                  ingrédient{formData.ingredients.filter(i => i.trim()).length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.recapStatItem}>
                <div className={styles.recapStatNumber}>
                  {formData.instructions.filter(i => i.trim()).length}
                </div>
                <div className={styles.recapStatLabel}>
                  étape{formData.instructions.filter(i => i.trim()).length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.recapStatItem}>
                <div className={styles.recapStatNumber}>
                  {formData.media.length}
                </div>
                <div className={styles.recapStatLabel}>
                  photo{formData.media.length !== 1 ? 's' : ''}
                </div>
              </div>
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
        <title>Partager une recette - COCO</title>
        <meta name="description" content="Partagez votre recette avec la communauté COCO" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      </Head>

      {/* Header mobile fixe */}
      <div className={styles.mobileHeader}>
        <button
          onClick={() => router.push('/')}
          className={styles.mobileBackBtn}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className={styles.mobileTitle}>
          <h1>Nouvelle recette</h1>
          <div className={styles.mobileProgress}>
            Étape {step} sur 3
          </div>
        </div>

        <div className={styles.mobileStepDots}>
          {[1, 2, 3].map(num => (
            <div 
              key={num}
              className={`${styles.mobileDot} ${step >= num ? styles.active : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Contenu principal avec scroll */}
      <div className={styles.mobileContent}>
        <div className={styles.formWrapper}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>

      {/* Navigation mobile fixe en bas */}
      <div className={styles.mobileNavigation}>
        <div className={styles.mobileActions}>
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className={styles.mobileSecondaryBtn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 19L8 12L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Précédent
            </button>
          )}
          
          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className={`${styles.mobilePrimaryBtn} ${step === 1 && !formData.title ? styles.disabled : ''}`}
              disabled={step === 1 && !formData.title}
            >
              Suivant
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={`${styles.mobileSubmitBtn} ${isSubmitting || !formData.title || formData.ingredients.every(i => !i) ? styles.disabled : ''}`}
              disabled={isSubmitting || !formData.title || formData.ingredients.every(i => !i)}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Publication...
                </>
              ) : (
                <>
                  <span className={styles.submitIcon}>🚀</span>
                  Publier
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Indicateur de validation mobile */}
        <div className={styles.mobileValidation}>
          {step === 1 && !formData.title && (
            <small>📝 Titre requis pour continuer</small>
          )}
          {step === 2 && formData.ingredients.every(i => !i) && (
            <small>🥘 Ajoutez au moins un ingrédient</small>
          )}
          {step === 3 && (
            <small>📸 Photos optionnelles mais recommandées</small>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes confettiFall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        /* Transitions fluides pour les étapes */
        .${styles.stepContent} {
          animation: fadeInUp 0.5s ease forwards;
        }
        
        /* Interactions addictives */
        .${styles.input}:focus, 
        .${styles.textarea}:focus {
          transform: translateY(-2px);
        }
        
        /* Hover effects plus prononcés */
        .${styles.categoryBtn}:hover,
        .${styles.difficultyBtn}:hover,
        .${styles.portionBtn}:hover {
          transform: translateY(-3px);
        }
        
        /* Animation d'apparition progressive */
        .${styles.formGroup} {
          animation: formSlideIn 0.4s ease forwards;
          animation-delay: calc(var(--index, 0) * 0.1s);
        }
        
        @keyframes formSlideIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        /* Amélioration de l'accessibilité avec plus de visibilité */
        .${styles.input}:focus,
        .${styles.textarea}:focus,
        .${styles.categoryBtn}:focus,
        .${styles.difficultyBtn}:focus,
        .${styles.portionBtn}:focus,
        .${styles.primaryBtn}:focus,
        .${styles.secondaryBtn}:focus,
        .${styles.submitBtn}:focus {
          outline: 3px solid rgba(255, 107, 53, 0.6);
          outline-offset: 3px;
        }
        
        /* Réduction du mouvement pour ceux qui le préfèrent */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
