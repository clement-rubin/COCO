import { useState, useCallback } from 'react'
import { useRetryOperation } from '../utils/retryOperation'

export default function RecipeForm({ initialData = {}, onSubmit, onCancel, isEditing = false }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    prepTime: initialData.prepTime || '',
    cookTime: initialData.cookTime || '',
    category: initialData.category || '',
    difficulty: initialData.difficulty || 'Facile',
    ingredients: initialData.ingredients || [{ name: '', quantity: '', unit: '' }],
    instructions: initialData.instructions || [{ step: 1, description: '' }],
    image: null,
    // Nouvelles options
    includeIngredients: initialData.includeIngredients !== false, // Par défaut true
    includeInstructions: initialData.includeInstructions !== false // Par défaut true
  })

  const [imagePreview, setImagePreview] = useState(initialData.imageUrl || null)
  const [errors, setErrors] = useState({})
  const { loading, executeWithRetry, progress } = useRetryOperation()

  const difficulties = ['Facile', 'Moyen', 'Difficile']
  const categories = [
    'Entrée', 'Plat principal', 'Dessert', 'Apéritif', 
    'Boisson', 'Sauce', 'Accompagnement', 'Petit-déjeuner'
  ]

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }, [errors])

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, image: 'L\'image ne doit pas dépasser 5MB' }))
        return
      }
      
      setFormData(prev => ({ ...prev, image: file }))
      
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
      
      if (errors.image) {
        setErrors(prev => ({ ...prev, image: null }))
      }
    }
  }, [errors.image])

  const addIngredient = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: '', unit: '' }]
    }))
  }, [])

  const removeIngredient = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }))
  }, [])

  const updateIngredient = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }))
  }, [])

  const addInstruction = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { 
        step: prev.instructions.length + 1, 
        description: '' 
      }]
    }))
  }, [])

  const removeInstruction = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
        .map((inst, i) => ({ ...inst, step: i + 1 }))
    }))
  }, [])

  const updateInstruction = useCallback((index, value) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) => 
        i === index ? { ...inst, description: value } : inst
      )
    }))
  }, [])

  const validateForm = () => {
    const newErrors = {}
    
    // VALIDATION SIMPLIFIÉE - Seulement titre et description obligatoires
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise'
    }
    
    // Tout le reste est optionnel
    // Image recommandée mais pas obligatoire
    if (!formData.image && !imagePreview) {
      console.info('Aucune image fournie - sera optionnelle')
    }
    
    // Validation conditionnelle UNIQUEMENT si l'utilisateur a choisi d'inclure ces sections
    if (formData.includeIngredients && formData.ingredients.length > 0) {
      const emptyIngredients = formData.ingredients.filter(ing => !ing.name.trim())
      if (emptyIngredients.length > 0) {
        newErrors.ingredients = 'Si vous ajoutez des ingrédients, ils doivent avoir un nom'
      }
    }
    
    if (formData.includeInstructions && formData.instructions.length > 0) {
      const emptyInstructions = formData.instructions.filter(inst => !inst.description.trim())
      if (emptyInstructions.length > 0) {
        newErrors.instructions = 'Si vous ajoutez des instructions, elles doivent être remplies'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const submitData = {
      ...formData,
      // N'inclure les ingrédients et instructions que si l'utilisateur l'a choisi
      ingredients: formData.includeIngredients 
        ? formData.ingredients.filter(ing => ing.name.trim())
        : [],
      instructions: formData.includeInstructions 
        ? formData.instructions.filter(inst => inst.description.trim())
        : []
    }
    
    try {
      await executeWithRetry(() => onSubmit(submitData), {
        maxRetries: 2,
        baseDelay: 1000
      })
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    }
  }

  return (
    <div className="recipe-form-container">
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-header">
          <h2>{isEditing ? 'Modifier la recette' : 'Nouvelle recette'}</h2>
        </div>

        {/* Titre et description */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="title">Titre de la recette *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'error' : ''}
              placeholder="Ex: Tarte aux pommes traditionnelle"
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Une délicieuse description de votre recette..."
              rows={3}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>
        </div>

        {/* Métadonnées */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Catégorie</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulté</label>
              <select
                id="difficulty"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
              >
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prepTime">Temps de préparation</label>
              <input
                id="prepTime"
                type="text"
                value={formData.prepTime}
                onChange={(e) => handleInputChange('prepTime', e.target.value)}
                placeholder="Ex: 30 min"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cookTime">Temps de cuisson</label>
              <input
                id="cookTime"
                type="text"
                value={formData.cookTime}
                onChange={(e) => handleInputChange('cookTime', e.target.value)}
                placeholder="Ex: 45 min"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="image">Image de la recette</label>
            <div className="image-upload">
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
              />
              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Aperçu" />
                  <button 
                    type="button" 
                    onClick={() => {
                      setImagePreview(null)
                      setFormData(prev => ({ ...prev, image: null }))
                    }}
                    className="remove-image"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {errors.image && <span className="error-message">{errors.image}</span>}
          </div>
        </div>

        {/* Options de contenu */}
        <div className="form-section">
          <h3>Contenu de la recette</h3>
          <p className="section-description">
            Choisissez les éléments que vous souhaitez inclure dans votre recette
          </p>
          
          <div className="content-options">
            <div className="option-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.includeIngredients}
                  onChange={(e) => handleInputChange('includeIngredients', e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <div className="option-content">
                  <span className="option-title">📝 Inclure la liste d'ingrédients</span>
                  <span className="option-description">
                    Ajoutez les ingrédients nécessaires pour préparer votre recette
                  </span>
                </div>
              </label>
            </div>

            <div className="option-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.includeInstructions}
                  onChange={(e) => handleInputChange('includeInstructions', e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <div className="option-content">
                  <span className="option-title">📋 Inclure les instructions de préparation</span>
                  <span className="option-description">
                    Détaillez étape par étape comment préparer votre recette
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Ingrédients - Conditionnel */}
        {formData.includeIngredients && (
          <div className="form-section">
            <div className="section-header">
              <h3>Ingrédients *</h3>
              <button type="button" onClick={addIngredient} className="add-button">
                + Ajouter un ingrédient
              </button>
            </div>
            
            <div className="ingredients-list">
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className="ingredient-row">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Nom de l'ingrédient"
                    className="ingredient-name"
                  />
                  <input
                    type="text"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                    placeholder="Quantité"
                    className="ingredient-quantity"
                  />
                  <input
                    type="text"
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    placeholder="Unité"
                    className="ingredient-unit"
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="remove-button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.ingredients && <span className="error-message">{errors.ingredients}</span>}
          </div>
        )}

        {/* Instructions - Conditionnel */}
        {formData.includeInstructions && (
          <div className="form-section">
            <div className="section-header">
              <h3>Instructions *</h3>
              <button type="button" onClick={addInstruction} className="add-button">
                + Ajouter une étape
              </button>
            </div>
            
            <div className="instructions-list">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="instruction-row">
                  <span className="step-number">{instruction.step}</span>
                  <textarea
                    value={instruction.description}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder="Décrivez cette étape..."
                    rows={2}
                    className="instruction-text"
                  />
                  {formData.instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="remove-button"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.instructions && <span className="error-message">{errors.instructions}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          {onCancel && (
            <button type="button" onClick={onCancel} className="cancel-button">
              Annuler
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Créer la recette')}
          </button>
        </div>

        {progress && (
          <div className="progress-feedback">
            {progress.retrying ? (
              <span>Tentative {progress.attempt}/{progress.maxRetries + 1}...</span>
            ) : (
              <span>Enregistrement en cours...</span>
            )}
          </div>
        )}
      </form>

      <style jsx>{`
        .recipe-form-container {
          max-width: 400px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .recipe-form {
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .form-header h2 {
          margin: 0 0 var(--spacing-xl) 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
        }

        .form-section {
          margin-bottom: var(--spacing-xl);
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid #f0f0f0;
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }

        .section-header h3 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: var(--spacing-lg);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--spacing-md);
        }

        label {
          display: block;
          margin-bottom: var(--spacing-xs);
          color: #555;
          font-weight: 500;
          font-size: 0.9rem;
        }

        input, select, textarea {
          width: 100%;
          padding: var(--spacing-md);
          border: 2px solid #e1e5e9;
          border-radius: var(--radius-md);
          font-size: 0.95rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        input.error, textarea.error {
          border-color: #ef4444;
        }

        .error-message {
          display: block;
          color: #ef4444;
          font-size: 0.875rem;
          margin-top: var(--spacing-xs);
        }

        .image-upload {
          position: relative;
        }

        .image-input {
          padding: 40px 20px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          text-align: center;
          cursor: pointer;
          background: #f9fafb;
        }

        .image-preview {
          position: relative;
          margin-top: 12px;
          display: inline-block;
        }

        .image-preview img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
          object-fit: cover;
        }

        .remove-image {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .add-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .add-button:hover {
          background: #2563eb;
        }

        .ingredients-list, .instructions-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .ingredient-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: var(--spacing-sm);
          align-items: center;
        }

        .instruction-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: var(--spacing-sm);
          align-items: start;
        }

        .step-number {
          background: #3b82f6;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          margin-top: 12px;
        }

        .remove-button {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          justify-content: flex-end;
          padding-top: 24px;
          border-top: 1px solid #f0f0f0;
          margin-top: 32px;
        }

        .cancel-button {
          background: #6b7280;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .cancel-button:hover {
          background: #4b5563;
        }

        .submit-button {
          background: #10b981;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          min-width: 140px;
        }

        .submit-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .progress-feedback {
          text-align: center;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
          margin-top: 16px;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .section-description {
          color: #6b7280;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .content-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .option-item {
          background: rgba(248, 250, 252, 0.8);
          border: 2px solid #e5e7eb;
          border-radius: 1rem;
          padding: 1.5rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .option-item:hover {
          background: rgba(255, 255, 255, 1);
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.15);
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          cursor: pointer;
          width: 100%;
        }

        .checkbox-input {
          display: none;
        }

        .checkbox-custom {
          width: 24px;
          height: 24px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          background: white;
          flex-shrink: 0;
          position: relative;
          transition: all 0.3s ease;
          margin-top: 2px;
        }

        .checkbox-input:checked + .checkbox-custom {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border-color: #3b82f6;
          transform: scale(1.1);
        }

        .checkbox-input:checked + .checkbox-custom::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        .option-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .option-title {
          font-weight: 600;
          color: #374151;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .option-description {
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .checkbox-input:checked ~ .option-content .option-title {
          color: #3b82f6;
        }

        .checkbox-input:checked ~ .option-content .option-description {
          color: #1e40af;
        }

        /* Animation pour les sections conditionnelles */
        .form-section {
          animation: slideIn 0.4s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Amélioration responsive pour les nouvelles options */
        @media (max-width: 768px) {
          .option-item {
            padding: 1.25rem;
          }

          .checkbox-label {
            gap: 0.75rem;
          }

          .option-title {
            font-size: 1rem;
          }

          .option-description {
            font-size: 0.85rem;
          }
        }

        /* Style pour indiquer que les sections sont facultatives */
        .form-section h3 {
          position: relative;
        }

        .form-section h3::after {
          content: ' (Optionnel)';
          font-weight: 400;
          color: #6b7280;
          font-size: 0.8em;
        }

        /* Ne pas afficher "Optionnel" pour titre et description */
        .form-section:first-of-type h3::after,
        .content-options + .form-section h3::after {
          display: none;
        }

        /* ...existing styles... */
      `}</style>
    </div>
  )
}
