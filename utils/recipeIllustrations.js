/**
 * Système d'illustration pour les recettes
 * Génère des images d'illustration basées sur la catégorie et les ingrédients
 */

// Palette de couleurs pour les illustrations
export const RECIPE_COLORS = {
  // Couleurs principales par catégorie
  'Entrée': ['#10b981', '#059669', '#047857'], // Vert frais
  'Plat principal': ['#f97316', '#ea580c', '#dc2626'], // Orange/Rouge
  'Dessert': ['#ec4899', '#db2777', '#be185d'], // Rose/Magenta
  'Apéritif': ['#8b5cf6', '#7c3aed', '#6d28d9'], // Violet
  'Boisson': ['#06b6d4', '#0891b2', '#0e7490'], // Cyan
  'Sauce': ['#f59e0b', '#d97706', '#b45309'], // Ambre
  'Accompagnement': ['#84cc16', '#65a30d', '#4d7c0f'], // Vert lime
  'Petit-déjeuner': ['#fbbf24', '#f59e0b', '#d97706'], // Jaune
  'Italien': ['#ef4444', '#dc2626', '#b91c1c'], // Rouge italien
  'Asiatique': ['#f97316', '#ea580c', '#c2410c'], // Orange épicé
  'Végétarien': ['#22c55e', '#16a34a', '#15803d'], // Vert végétal
  'Healthy': ['#10b981', '#059669', '#047857'], // Vert santé
  'BBQ': ['#dc2626', '#b91c1c', '#991b1b'], // Rouge feu
  'Photo partagée': ['#6366f1', '#4f46e5', '#4338ca'], // Indigo
  'default': ['#6b7280', '#4b5563', '#374151'] // Gris neutre
}

// Emojis et icônes par catégorie
export const RECIPE_EMOJIS = {
  'Entrée': ['🥗', '🍅', '🥒', '🥕', '🥬'],
  'Plat principal': ['🍽️', '🍖', '🍗', '🐟', '🍲'],
  'Dessert': ['🍰', '🎂', '🧁', '🍪', '🍫'],
  'Apéritif': ['🧀', '🥖', '🍤', '🥜', '🫒'],
  'Boisson': ['🥤', '🧃', '☕', '🍵', '🥛'],
  'Sauce': ['🥄', '🍯', '🧂', '🌶️', '🧄'],
  'Accompagnement': ['🍚', '🥔', '🍞', '🥐', '🌽'],
  'Petit-déjeuner': ['🥐', '🥞', '🍳', '🥣', '☕'],
  'Italien': ['🍝', '🍕', '🧄', '🍅', '🧀'],
  'Asiatique': ['🍜', '🍱', '🥢', '🍤', '🌶️'],
  'Végétarien': ['🥬', '🥕', '🥒', '🍅', '🌱'],
  'Healthy': ['🥗', '🥑', '🌱', '🍓', '🥝'],
  'BBQ': ['🔥', '🍖', '🌭', '🥩', '🍗'],
  'Photo partagée': ['📸', '🎨', '✨', '🌟', '💫'],
  'default': ['🍽️', '👨‍🍳', '🍴', '🥄', '🔪']
}

// Motifs de fond pour les illustrations
export const BACKGROUND_PATTERNS = [
  'linear-gradient(135deg, {color1} 0%, {color2} 50%, {color3} 100%)',
  'linear-gradient(45deg, {color1} 25%, transparent 25%, transparent 75%, {color2} 75%)',
  'radial-gradient(circle at center, {color1} 0%, {color2} 70%, {color3} 100%)',
  'linear-gradient(90deg, {color1} 0%, {color2} 100%)',
  'conic-gradient(from 0deg, {color1}, {color2}, {color3}, {color1})'
]

/**
 * Safe base64 encoding for SVG content
 * @param {string} content - Content to encode
 * @returns {string} Base64 encoded content
 */
function safeBase64Encode(content) {
  try {
    // Try native btoa first
    return btoa(content)
  } catch (error) {
    // Fallback: encode as UTF-8 first, then base64
    const utf8Bytes = new TextEncoder().encode(content)
    return manualBase64Encode(utf8Bytes)
  }
}

/**
 * Manual base64 encoding for UTF-8 content
 * @param {Uint8Array} data - UTF-8 encoded data
 * @returns {string} Base64 string
 */
function manualBase64Encode(data) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  
  while (i < data.length) {
    const a = data[i++]
    const b = i < data.length ? data[i++] : 0
    const c = i < data.length ? data[i++] : 0
    
    const bitmap = (a << 16) | (b << 8) | c
    
    result += chars.charAt((bitmap >> 18) & 63)
    result += chars.charAt((bitmap >> 12) & 63)
    result += i - 2 < data.length ? chars.charAt((bitmap >> 6) & 63) : '='
    result += i - 1 < data.length ? chars.charAt(bitmap & 63) : '='
  }
  
  return result
}

/**
 * Génère une illustration SVG pour une recette
 */
export function generateRecipeIllustration(recipe, options = {}) {
  const {
    width = 400,
    height = 300,
    style = 'modern' // modern, vintage, minimal
  } = options

  const category = recipe.category || 'default'
  const colors = RECIPE_COLORS[category] || RECIPE_COLORS.default
  const emojis = RECIPE_EMOJIS[category] || RECIPE_EMOJIS.default
  
  // Sélectionner un motif aléatoire mais déterministe basé sur l'ID
  const patternIndex = recipe.id ? 
    parseInt(recipe.id.toString().slice(-1), 10) % BACKGROUND_PATTERNS.length :
    Math.floor(Math.random() * BACKGROUND_PATTERNS.length)
  
  const pattern = BACKGROUND_PATTERNS[patternIndex]
    .replace('{color1}', colors[0])
    .replace('{color2}', colors[1])
    .replace('{color3}', colors[2] || colors[1])

  // Sélectionner un emoji principal
  const mainEmoji = emojis[recipe.id ? 
    parseInt(recipe.id.toString().slice(-2), 10) % emojis.length :
    Math.floor(Math.random() * emojis.length)
  ]

  // Escape special characters in title for SVG
  const safeTitle = recipe.title ? recipe.title.replace(/[<>&"']/g, (char) => {
    const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }
    return entities[char]
  }) : ''

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-${recipe.id || 'default'}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${colors[1]};stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:${colors[2] || colors[1]};stop-opacity:0.8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Fond avec motif -->
      <rect width="100%" height="100%" fill="url(#bg-${recipe.id || 'default'})"/>
      
      <!-- Formes décoratives -->
      <circle cx="320" cy="80" r="60" fill="rgba(255,255,255,0.1)" opacity="0.7"/>
      <circle cx="80" cy="220" r="40" fill="rgba(255,255,255,0.15)" opacity="0.5"/>
      <rect x="200" y="180" width="120" height="80" rx="15" fill="rgba(255,255,255,0.1)" opacity="0.6" transform="rotate(15 260 220)"/>
      
      <!-- Emoji principal -->
      <text x="${width/2}" y="${height/2 + 20}" font-size="80" text-anchor="middle" filter="url(#glow)">${mainEmoji}</text>
      
      <!-- Titre de la recette (si court) -->
      ${safeTitle && safeTitle.length < 20 ? `
        <text x="${width/2}" y="${height - 40}" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
              text-anchor="middle" fill="rgba(255,255,255,0.9)" filter="url(#glow)">
          ${safeTitle}
        </text>
      ` : ''}
      
      <!-- Éléments décoratifs en coins -->
      <text x="30" y="40" font-size="24" opacity="0.6">${emojis[1] || '✨'}</text>
      <text x="${width - 50}" y="40" font-size="24" opacity="0.6">${emojis[2] || '⭐'}</text>
      <text x="30" y="${height - 20}" font-size="24" opacity="0.6">${emojis[3] || '🌟'}</text>
      <text x="${width - 50}" y="${height - 20}" font-size="24" opacity="0.6">${emojis[4] || '💫'}</text>
    </svg>
  `

  return `data:image/svg+xml;base64,${safeBase64Encode(svg)}`
}

/**
 * Génère une illustration plus simple pour les miniatures
 */
export function generateRecipeThumbnail(recipe, size = 200) {
  const category = recipe.category || 'default'
  const colors = RECIPE_COLORS[category] || RECIPE_COLORS.default
  const emojis = RECIPE_EMOJIS[category] || RECIPE_EMOJIS.default
  
  const mainEmoji = emojis[0]
  const bgColor = colors[0]
  const accentColor = colors[1]

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="thumb-bg-${recipe.id || 'default'}">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.8" />
        </radialGradient>
      </defs>
      
      <rect width="100%" height="100%" rx="20" fill="url(#thumb-bg-${recipe.id || 'default'})"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="rgba(255,255,255,0.2)"/>
      <text x="${size/2}" y="${size/2 + 15}" font-size="${size/4}" text-anchor="middle">${mainEmoji}</text>
    </svg>
  `

  return `data:image/svg+xml;base64,${safeBase64Encode(svg)}`
}

/**
 * Génère une illustration avec des ingrédients
 */
export function generateIngredientsIllustration(ingredients, options = {}) {
  const { width = 400, height = 300 } = options
  
  // Mapper les ingrédients courants à des emojis
  const ingredientEmojis = {
    'tomate': '🍅', 'oignon': '🧅', 'ail': '🧄', 'carotte': '🥕',
    'pomme': '🍎', 'banana': '🍌', 'citron': '🍋', 'orange': '🍊',
    'poulet': '🍗', 'boeuf': '🥩', 'porc': '🥓', 'poisson': '🐟',
    'oeuf': '🥚', 'lait': '🥛', 'fromage': '🧀', 'beurre': '🧈',
    'farine': '🌾', 'sucre': '🍯', 'sel': '🧂', 'poivre': '🌶️',
    'huile': '🫒', 'vinaigre': '🍾', 'vin': '🍷', 'bière': '🍺'
  }
  
  const availableEmojis = []
  
  if (Array.isArray(ingredients)) {
    ingredients.forEach(ingredient => {
      const name = typeof ingredient === 'string' ? 
        ingredient.toLowerCase() : 
        ingredient.name?.toLowerCase() || ''
      
      Object.keys(ingredientEmojis).forEach(key => {
        if (name.includes(key)) {
          availableEmojis.push(ingredientEmojis[key])
        }
      })
    })
  }
  
  // Si pas d'emojis trouvés, utiliser des génériques
  if (availableEmojis.length === 0) {
    availableEmojis.push('🥄', '🍴', '🍽️', '👨‍🍳')
  }
  
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"/>
      ${availableEmojis.slice(0, 6).map((emoji, i) => {
        const x = 60 + (i % 3) * 120
        const y = 80 + Math.floor(i / 3) * 120
        return `<text x="${x}" y="${y}" font-size="60" text-anchor="middle">${emoji}</text>`
      }).join('')}
    </svg>
  `
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Fonction utilitaire pour obtenir une illustration de recette
 */
export function getRecipeIllustration(recipe) {
  // Si la recette a déjà une image, la retourner
  if (recipe.image && recipe.image !== '/placeholder-recipe.jpg') {
    return recipe.image
  }
  
  // Sinon, générer une illustration
  return generateRecipeIllustration(recipe)
}

export default {
  generateRecipeIllustration,
  generateRecipeThumbnail,
  generateIngredientsIllustration,
  getRecipeIllustration,
  RECIPE_COLORS,
  RECIPE_EMOJIS
}
