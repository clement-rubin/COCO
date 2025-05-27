import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styles from '../styles/SubmitRecipe.module.css'

// Fonction pour compresser les images
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Redimensionner si l'image est trop grande
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en JPEG avec compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Créer un fichier à partir du blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve({
                file: compressedFile, 
                dataUrl: canvas.toDataURL('image/jpeg', quality)
              });
            } else {
              reject(new Error("Compression d'image échouée"));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function SubmitRecipe() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Plat principal',
    prepTime: '',
    cookTime: '',
    servings: '',
    difficulty: 'Facile',
    ingredients: [''],
    instructions: [''],
    image: null,
    imagePreview: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier que c'est une image
      if (!file.type.match('image.*')) {
        setError('Le fichier doit être une image (jpeg, png, etc.)');
        return;
      }
      
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 5 MB');
        return;
      }
      
      setError('');
      
      try {
        // Compresser l'image
        const compressResult = await compressImage(file);
        
        setFormData(prevState => ({
          ...prevState,
          image: compressResult.file,
          imagePreview: compressResult.dataUrl
        }));
      } catch (err) {
        console.error("Erreur lors de la compression de l'image:", err);
        setError("Impossible de traiter l'image. Veuillez réessayer.");
      }
    }
  };

  const addIngredient = () => {
    setFormData(prevState => ({
      ...prevState,
      ingredients: [...prevState.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    if (formData.ingredients.length > 1) {
      const newIngredients = formData.ingredients.filter((_, i) => i !== index);
      setFormData(prevState => ({
        ...prevState,
        ingredients: newIngredients
      }));
    }
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData(prevState => ({
      ...prevState,
      ingredients: newIngredients
    }));
  };

  const addInstruction = () => {
    setFormData(prevState => ({
      ...prevState,
      instructions: [...prevState.instructions, '']
    }));
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      const newInstructions = formData.instructions.filter((_, i) => i !== index);
      setFormData(prevState => ({
        ...prevState,
        instructions: newInstructions
      }));
    }
  };

  const handleInstructionChange = (index, value) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData(prevState => ({
      ...prevState,
      instructions: newInstructions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation basique
    if (!formData.title || !formData.description || !formData.image) {
      setError('Veuillez remplir tous les champs obligatoires et ajouter une image');
      return;
    }

    setIsLoading(true);
    setError('');
    setErrorDetails(null);

    try {
      // Préparation des données pour l'API
      const recipeData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        prepTime: formData.prepTime,
        cookTime: formData.cookTime,
        servings: formData.servings,
        difficulty: formData.difficulty,
        ingredients: formData.ingredients.filter(ing => ing.trim() !== ''),
        instructions: formData.instructions.filter(ins => ins.trim() !== ''),
        // Utiliser directement l'URL de données compressée
        image: formData.imagePreview || "https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-4.0.3",
        author: "Utilisateur" // Dans une vraie app, ce serait le nom de l'utilisateur connecté
      };
      
      console.log('Envoi de la recette au serveur...');
      
      // Envoi des données à notre API
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData)
      });

      const result = await response.json();
      
      // Vérifier si la réponse est un succès ou une erreur
      if (!response.ok) {
        console.error('Erreur API:', response.status, result);
        throw new Error(`Erreur ${response.status}: ${result.message || 'Erreur inconnue'}`);
      }

      // Traitement de la réponse
      console.log('Recette soumise avec succès:', result);
      
      setIsSubmitted(true);
      setIsLoading(false);
      
      // Redirection vers user-recipes après quelques secondes
      setTimeout(() => {
        router.push('/user-recipes');
      }, 3000);
      
    } catch (err) {
      console.error('Erreur détaillée:', err);
      
      // Extraire les détails de l'erreur si disponibles
      let errorMessage = 'Une erreur est survenue lors de l\'envoi.';
      let details = null;
      
      try {
        // Essayer d'extraire plus de détails si l'erreur contient des infos JSON
        if (err.message.includes('{') && err.message.includes('}')) {
          const jsonStart = err.message.indexOf('{');
          const jsonPart = err.message.substring(jsonStart);
          const errorData = JSON.parse(jsonPart);
          
          if (errorData.message) {
            errorMessage += ` ${errorData.message}`;
          }
          
          details = errorData;
        }
      } catch (parseErr) {
        // Si on ne peut pas parser le JSON, utiliser le message d'erreur brut
        details = { raw: err.message };
      }
      
      // Afficher l'erreur avec plus de détails
      setError(`${errorMessage} Veuillez réessayer.`);
      setErrorDetails(details || { message: err.message });
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Soumettre une recette | COCO - Cuisine & Saveurs</title>
        <meta name="description" content="Partagez votre recette sur COCO - Cuisine & Saveurs" />
      </Head>

      <h1>Partagez votre recette</h1>
      
      {isSubmitted ? (
        <div className={styles.successMessage}>
          <h2>Merci pour votre contribution!</h2>
          <p>Votre recette a été soumise avec succès et sera examinée par notre équipe.</p>
          <p>Vous allez être redirigé vers la page des recettes...</p>
        </div>
      ) : (
        <>
          <p className={styles.intro}>
            Vous avez une recette délicieuse à partager avec notre communauté ? 
            Remplissez le formulaire ci-dessous et partagez votre création culinaire !
          </p>
          
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
              {errorDetails && (
                <details className={styles.errorDetails}>
                  <summary>Détails techniques de l'erreur (pour le support)</summary>
                  <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
                  
                  {/* Afficher des conseils spécifiques basés sur le type d'erreur */}
                  {errorDetails.error === 'DuplicateKey' && (
                    <p className={styles.errorHint}>
                      Il semble que cette recette existe déjà dans notre système.
                    </p>
                  )}
                  
                  {errorDetails.reference && (
                    <p className={styles.errorReference}>
                      ID de référence: {errorDetails.reference}
                    </p>
                  )}
                </details>
              )}
            </div>
          )}
          
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Titre de la recette *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="3"
              ></textarea>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="category">Catégorie</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Entrée">Entrée</option>
                  <option value="Plat principal">Plat principal</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Boisson">Boisson</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="difficulty">Difficulté</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                >
                  <option value="Facile">Facile</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Difficile">Difficile</option>
                </select>
              </div>
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="prepTime">Temps de préparation</label>
                <input
                  type="text"
                  id="prepTime"
                  name="prepTime"
                  placeholder="ex: 20 min"
                  value={formData.prepTime}
                  onChange={handleChange}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="cookTime">Temps de cuisson</label>
                <input
                  type="text"
                  id="cookTime"
                  name="cookTime"
                  placeholder="ex: 30 min"
                  value={formData.cookTime}
                  onChange={handleChange}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="servings">Nombre de portions</label>
                <input
                  type="number"
                  id="servings"
                  name="servings"
                  min="1"
                  value={formData.servings}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label>Ingrédients</label>
              {formData.ingredients.map((ingredient, index) => (
                <div key={index} className={styles.listItemInput}>
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => handleIngredientChange(index, e.target.value)}
                    placeholder="ex: 200g de farine"
                  />
                  <button 
                    type="button" 
                    className={styles.removeButton}
                    onClick={() => removeIngredient(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                className={styles.addButton}
                onClick={addIngredient}
              >
                + Ajouter un ingrédient
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label>Instructions</label>
              {formData.instructions.map((instruction, index) => (
                <div key={index} className={styles.listItemInput}>
                  <textarea
                    value={instruction}
                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                    placeholder={`Étape ${index + 1}`}
                    rows="2"
                  ></textarea>
                  <button 
                    type="button" 
                    className={styles.removeButton}
                    onClick={() => removeInstruction(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                className={styles.addButton}
                onClick={addInstruction}
              >
                + Ajouter une instruction
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="image">Image de la recette *</label>
              <div className={styles.imageUpload}>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.inputFile}
                />
                <label htmlFor="image" className={styles.fileLabel}>
                  Choisir une image
                </label>
                <span className={styles.fileName}>
                  {formData.image ? formData.image.name : 'Aucun fichier choisi'}
                </span>
              </div>
              {formData.imagePreview && (
                <div className={styles.imagePreview}>
                  <img src={formData.imagePreview} alt="Aperçu de la recette" />
                </div>
              )}
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? 'Envoi en cours...' : 'Soumettre la recette'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
