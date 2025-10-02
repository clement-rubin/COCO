import { useEffect, useState } from 'react'
import { getUserTrophies } from '../utils/trophyUtils'
import { getUserStatsComplete } from '../utils/profileUtils'
import { getSupabaseClient, getUserCardCollection, saveUserCardCollection } from '../lib/supabaseClient'
import styles from '../styles/Trophy.module.css'
import React from 'react'

const LEVELS = [
  { level: 1, xp: 0, label: "Débutant", color: "#a7f3d0" },
  { level: 2, xp: 100, label: "Apprenti", color: "#6ee7b7" },
  { level: 3, xp: 300, label: "Cuisinier", color: "#34d399" },
  { level: 4, xp: 700, label: "Chef", color: "#10b981" },
  { level: 5, xp: 1500, label: "Maître Chef", color: "#059669" },
  { level: 6, xp: 3000, label: "Légende", color: "#2563eb" }
]

function getLevel(xp) {
  let current = LEVELS[0]
  let next = LEVELS[LEVELS.length - 1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) current = LEVELS[i]
    if (xp < LEVELS[i].xp) {
      next = LEVELS[i]
      break
    }
  }
  return { current, next }
}

// --- Système de boutique avancé ---
// Catégories: hat, glasses, apron, accessory, face, background, effect, badge, mascot
const SHOP_ITEMS = [
  // === CHAPEAUX ===
  { 
    id: 'hat_chef', 
    name: 'Toque de Chef', 
    icon: '👨‍🍳', 
    price: 100, 
    originalPrice: 100,
    type: 'hat', 
    rarity: 'common', 
    isNew: false,
    description: 'La toque classique du chef professionnel',
    tags: ['classique', 'professionnel'],
    unlockLevel: 1
  },
  { 
    id: 'hat_pirate', 
    name: 'Chapeau Pirate', 
    icon: '🏴‍☠️', 
    price: 150, 
    originalPrice: 150,
    type: 'hat', 
    rarity: 'rare', 
    isNew: false,
    description: 'Pour les chefs aventuriers des sept mers',
    tags: ['aventure', 'pirate'],
    unlockLevel: 3
  },
  { 
    id: 'hat_crown', 
    name: 'Couronne Royale', 
    icon: '👑', 
    price: 400, 
    originalPrice: 500,
    type: 'hat', 
    rarity: 'legendary', 
    isNew: true,
    description: 'Réservée aux maîtres de la cuisine royale',
    tags: ['royal', 'prestige'],
    unlockLevel: 10,
    onSale: true,
    saleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
  },
  { 
    id: 'hat_sombrero', 
    name: 'Sombrero', 
    icon: '🎩', 
    price: 180, 
    originalPrice: 180,
    type: 'hat', 
    rarity: 'uncommon', 
    isNew: false,
    description: 'Parfait pour la cuisine mexicaine authentique',
    tags: ['mexicain', 'festif'],
    unlockLevel: 5
  },
  { 
    id: 'hat_beret', 
    name: 'Béret Français', 
    icon: '🧑‍🎨', 
    price: 160, 
    originalPrice: 160,
    type: 'hat', 
    rarity: 'uncommon', 
    isNew: true,
    description: 'L\'élégance française en cuisine',
    tags: ['français', 'artistique'],
    unlockLevel: 4
  },
  
  // === LUNETTES ===
  { 
    id: 'glasses_cool', 
    name: 'Lunettes Cool', 
    icon: '🕶️', 
    price: 80, 
    originalPrice: 80,
    type: 'glasses', 
    rarity: 'common', 
    isNew: false,
    description: 'Style décontracté pour chef moderne',
    tags: ['cool', 'moderne'],
    unlockLevel: 1
  },
  { 
    id: 'glasses_star', 
    name: 'Lunettes Star', 
    icon: '🤩', 
    price: 180, 
    originalPrice: 220,
    type: 'glasses', 
    rarity: 'rare', 
    isNew: true,
    description: 'Brillez comme une star de la cuisine',
    tags: ['star', 'brillant'],
    unlockLevel: 6,
    onSale: true
  },
  { 
    id: 'glasses_smart', 
    name: 'Lunettes Intelligentes', 
    icon: '🤓', 
    price: 200, 
    originalPrice: 200,
    type: 'glasses', 
    rarity: 'epic', 
    isNew: true,
    description: 'Pour les chefs scientifiques',
    tags: ['intelligent', 'science'],
    unlockLevel: 8
  },
  
  // === TABLIERS ===
  { 
    id: 'apron_red', 
    name: 'Tablier Rouge', 
    icon: '🟥', 
    price: 120, 
    originalPrice: 120,
    type: 'apron', 
    rarity: 'common', 
    isNew: false,
    description: 'Classique tablier rouge passion',
    tags: ['classique', 'rouge'],
    unlockLevel: 2
  },
  { 
    id: 'apron_blue', 
    name: 'Tablier Bleu', 
    icon: '🟦', 
    price: 120, 
    originalPrice: 120,
    type: 'apron', 
    rarity: 'common', 
    isNew: false,
    description: 'Élégant tablier bleu océan',
    tags: ['classique', 'bleu'],
    unlockLevel: 2
  },
  { 
    id: 'apron_gold', 
    name: 'Tablier Or', 
    icon: '🟨', 
    price: 280, 
    originalPrice: 350,
    type: 'apron', 
    rarity: 'epic', 
    isNew: true,
    description: 'Luxueux tablier doré pour occasions spéciales',
    tags: ['luxe', 'or', 'spécial'],
    unlockLevel: 12,
    onSale: true
  },
  { 
    id: 'apron_rainbow', 
    name: 'Tablier Arc-en-ciel', 
    icon: '🌈', 
    price: 300, 
    originalPrice: 300,
    type: 'apron', 
    rarity: 'epic', 
    isNew: true,
    description: 'Exprimez votre créativité culinaire',
    tags: ['créatif', 'coloré'],
    unlockLevel: 15
  },
  
  // === ACCESSOIRES ===
  { 
    id: 'spoon_gold', 
    name: 'Cuillère Or', 
    icon: '🥄', 
    price: 200, 
    originalPrice: 200,
    type: 'accessory', 
    rarity: 'epic', 
    isNew: false,
    description: 'Cuillère en or pour goûter avec style',
    tags: ['or', 'dégustation'],
    unlockLevel: 10
  },
  { 
    id: 'fork_silver', 
    name: 'Fourchette Argent', 
    icon: '🍴', 
    price: 140, 
    originalPrice: 140,
    type: 'accessory', 
    rarity: 'uncommon', 
    isNew: false,
    description: 'Fourchette argentée pour la finition',
    tags: ['argent', 'finition'],
    unlockLevel: 5
  },
  { 
    id: 'pepper', 
    name: 'Poivrier Magique', 
    icon: '🌶️', 
    price: 90, 
    originalPrice: 90,
    type: 'accessory', 
    rarity: 'common', 
    isNew: false,
    description: 'Ajoute du piquant à vos créations',
    tags: ['épice', 'piquant'],
    unlockLevel: 3
  },
  { 
    id: 'knife_master', 
    name: 'Couteau de Maître', 
    icon: '🔪', 
    price: 250, 
    originalPrice: 250,
    type: 'accessory', 
    rarity: 'rare', 
    isNew: true,
    description: 'Précision absolue pour découpes parfaites',
    tags: ['précision', 'maître'],
    unlockLevel: 8
  },
  
  // === VISAGE ===
  { 
    id: 'mustache', 
    name: 'Moustache Vintage', 
    icon: '👨', 
    price: 90, 
    originalPrice: 90,
    type: 'face', 
    rarity: 'common', 
    isNew: false,
    description: 'Style rétro pour chef distingué',
    tags: ['vintage', 'rétro'],
    unlockLevel: 4
  },
  { 
    id: 'beard', 
    name: 'Barbe de Sage', 
    icon: '🧔', 
    price: 120, 
    originalPrice: 120,
    type: 'face', 
    rarity: 'uncommon', 
    isNew: false,
    description: 'Sagesse culinaire ancestrale',
    tags: ['sagesse', 'expérience'],
    unlockLevel: 7
  },
  
  // === FONDS ===
  { 
    id: 'bg_kitchen', 
    name: 'Cuisine Professionnelle', 
    icon: '🏠', 
    price: 250, 
    originalPrice: 250,
    type: 'background', 
    rarity: 'rare', 
    isNew: true,
    description: 'Ambiance cuisine de restaurant étoilé',
    tags: ['professionnel', 'restaurant'],
    unlockLevel: 10
  },
  { 
    id: 'bg_jungle', 
    name: 'Jungle Exotique', 
    icon: '🌴', 
    price: 200, 
    originalPrice: 200,
    type: 'background', 
    rarity: 'uncommon', 
    isNew: false,
    description: 'Cuisine fusion dans un cadre tropical',
    tags: ['exotique', 'nature'],
    unlockLevel: 6
  },
  { 
    id: 'bg_space', 
    name: 'Cuisine Spatiale', 
    icon: '🚀', 
    price: 400, 
    originalPrice: 400,
    type: 'background', 
    rarity: 'legendary', 
    isNew: true,
    description: 'Cuisinez dans l\'espace intersidéral',
    tags: ['espace', 'futuriste'],
    unlockLevel: 20
  },
  
  // === EFFETS SPÉCIAUX ===
  { 
    id: 'fx_fire', 
    name: 'Effet Flamme', 
    icon: '🔥', 
    price: 350, 
    originalPrice: 400,
    type: 'effect', 
    rarity: 'legendary', 
    isNew: true,
    description: 'Flammes spectaculaires autour de votre avatar',
    tags: ['feu', 'spectaculaire'],
    unlockLevel: 15,
    onSale: true
  },
  { 
    id: 'fx_sparkle', 
    name: 'Effet Étincelle', 
    icon: '✨', 
    price: 220, 
    originalPrice: 220,
    type: 'effect', 
    rarity: 'epic', 
    isNew: false,
    description: 'Brillez de mille feux',
    tags: ['brillant', 'magique'],
    unlockLevel: 12
  },
  { 
    id: 'fx_rainbow', 
    name: 'Effet Arc-en-ciel', 
    icon: '🌈', 
    price: 300, 
    originalPrice: 300,
    type: 'effect', 
    rarity: 'epic', 
    isNew: true,
    description: 'Aura colorée et joyeuse',
    tags: ['coloré', 'joyeux'],
    unlockLevel: 18
  },
  
  // === BADGES EXCLUSIFS ===
  { 
    id: 'badge_early', 
    name: 'Pionnier COCO', 
    icon: '🌟', 
    price: 0, 
    originalPrice: 0,
    type: 'badge', 
    rarity: 'legendary', 
    isNew: false, 
    exclusive: true,
    description: 'Badge exclusif des premiers utilisateurs',
    tags: ['exclusif', 'pionnier'],
    unlockLevel: 1
  },
  { 
    id: 'badge_master', 
    name: 'Maître Chef', 
    icon: '🏆', 
    price: 500, 
    originalPrice: 500,
    type: 'badge', 
    rarity: 'legendary', 
    isNew: true,
    description: 'Reconnaissance ultime de maîtrise culinaire',
    tags: ['maître', 'excellence'],
    unlockLevel: 25
  },
  
  // === MASCOTTES ===
  { 
    id: 'mascot_chick', 
    name: 'Poussin Cuisinier', 
    icon: '🐥', 
    price: 180, 
    originalPrice: 180,
    type: 'mascot', 
    rarity: 'uncommon', 
    isNew: false,
    description: 'Adorable compagnon de cuisine',
    tags: ['mignon', 'compagnon'],
    unlockLevel: 5
  },
  { 
    id: 'mascot_cat', 
    name: 'Chat Gourmet', 
    icon: '🐱', 
    price: 220, 
    originalPrice: 220,
    type: 'mascot', 
    rarity: 'rare', 
    isNew: true,
    description: 'Chat raffiné amateur de bonne cuisine',
    tags: ['raffiné', 'gourmet'],
    unlockLevel: 8
  },
  { 
    id: 'mascot_dragon', 
    name: 'Dragon Cuisinier', 
    icon: '🐲', 
    price: 400, 
    originalPrice: 400,
    type: 'mascot', 
    rarity: 'legendary', 
    isNew: true,
    description: 'Puissant dragon maître du feu culinaire',
    tags: ['dragon', 'puissant', 'feu'],
    unlockLevel: 20
  }
]

// === SYSTÈME DE CARTES À COLLECTIONNER ===
const CARD_COLLECTIONS = [
  {
    id: 'ingredients',
    name: 'Ingrédients du Monde',
    icon: '🌶️',
    description: 'Découvrez les ingrédients les plus exotiques',
    color: '#10b981'
  },
  {
    id: 'chefs',
    name: 'Grands Chefs',
    icon: '👨‍🍳',
    description: 'Les légendes de la gastronomie mondiale',
    color: '#f59e0b'
  },
  {
    id: 'dishes',
    name: 'Plats Mythiques',
    icon: '🍽️',
    description: 'Les créations culinaires les plus célèbres',
    color: '#8b5cf6'
  },
  {
    id: 'techniques',
    name: 'Techniques Secrètes',
    icon: '⚡',
    description: 'Les secrets des maîtres cuisiniers',
    color: '#ef4444'
  },
  {
    id: 'regions',
    name: 'Cuisines du Monde',
    icon: '🌍',
    description: 'Un voyage culinaire à travers les continents',
    color: '#06b6d4'
  }
];

const TRADING_CARDS = [
  // === COLLECTION INGRÉDIENTS ===
  {
    id: 'card_saffron',
    name: 'Safran de Cachemire',
    collection: 'ingredients',
    rarity: 'legendary',
    icon: '🌸',
    description: 'L\'épice la plus précieuse au monde, récoltée à la main dans les montagnes du Cachemire.',
    stats: { saveur: 95, rareté: 98, prix: 92 },
    lore: 'Il faut 150 fleurs pour obtenir 1 gramme de safran.',
    artist: 'Chef Amara',
    number: '001/100',
    releaseDate: '2024-01-15'
  },
  {
    id: 'card_truffle',
    name: 'Truffe Noire du Périgord',
    collection: 'ingredients',
    rarity: 'epic',
    icon: '🍄',
    description: 'Le diamant noir de la cuisine française, symbole de luxe et de raffinement.',
    stats: { saveur: 88, rareté: 85, prix: 89 },
    lore: 'Les cochons et chiens sont dressés spécialement pour les dénicher.',
    artist: 'Marie Dubois',
    number: '012/100',
    releaseDate: '2024-01-20'
  },
  {
    id: 'card_vanilla',
    name: 'Vanille de Madagascar',
    collection: 'ingredients',
    rarity: 'rare',
    icon: '🌿',
    description: 'L\'or noir de l\'océan Indien, aux arômes incomparables.',
    stats: { saveur: 82, rareté: 70, prix: 75 },
    lore: 'Chaque gousse nécessite 9 mois de maturation.',
    artist: 'Pierre Lemoine',
    number: '028/100',
    releaseDate: '2024-01-25'
  },
  {
    id: 'card_wasabi',
    name: 'Wasabi Sauvage',
    collection: 'ingredients',
    rarity: 'uncommon',
    icon: '🟢',
    description: 'Le véritable wasabi japonais, cultivé dans les rivières de montagne.',
    stats: { saveur: 75, rareté: 65, prix: 68 },
    lore: 'Seuls quelques maîtres savent le cultiver correctement.',
    artist: 'Hiroshi Tanaka',
    number: '045/100',
    releaseDate: '2024-02-01'
  },

  // === COLLECTION GRANDS CHEFS ===
  {
    id: 'card_escoffier',
    name: 'Auguste Escoffier',
    collection: 'chefs',
    rarity: 'legendary',
    icon: '👑',
    description: 'Le roi des cuisiniers et cuisinier des rois. Révolutionnaire de la cuisine moderne.',
    stats: { technique: 98, innovation: 95, influence: 100 },
    lore: 'Créateur de la brigade de cuisine et de milliers de recettes.',
    artist: 'Classical Arts',
    number: '001/080',
    releaseDate: '2024-01-10'
  },
  {
    id: 'card_robuchon',
    name: 'Joël Robuchon',
    collection: 'chefs',
    rarity: 'epic',
    icon: '⭐',
    description: 'Le chef aux 32 étoiles Michelin, maître de la perfection culinaire.',
    stats: { technique: 96, innovation: 88, influence: 94 },
    lore: 'Détenteur du record mondial d\'étoiles Michelin.',
    artist: 'Modern Masters',
    number: '008/080',
    releaseDate: '2024-01-12'
  },
  {
    id: 'card_bocuse',
    name: 'Paul Bocuse',
    collection: 'chefs',
    rarity: 'epic',
    icon: '🏆',
    description: 'L\'empereur de la cuisine lyonnaise, ambassadeur de la gastronomie française.',
    stats: { technique: 92, innovation: 85, influence: 96 },
    lore: 'Premier chef à faire de la cuisine un art médiatique.',
    artist: 'Lyon Heritage',
    number: '015/080',
    releaseDate: '2024-01-18'
  },

  // === COLLECTION PLATS MYTHIQUES ===
  {
    id: 'card_bouillabaisse',
    name: 'Bouillabaisse Marseillaise',
    collection: 'dishes',
    rarity: 'rare',
    icon: '🦐',
    description: 'La soupe de poissons emblématique de Marseille, gardienne de traditions séculaires.',
    stats: { complexité: 85, tradition: 95, goût: 88 },
    lore: 'Protégée par une charte stricte depuis 1980.',
    artist: 'Mediterranean Soul',
    number: '023/120',
    releaseDate: '2024-01-22'
  },
  {
    id: 'card_ramen',
    name: 'Ramen Authentique',
    collection: 'dishes',
    rarity: 'uncommon',
    icon: '🍜',
    description: 'Le plat réconfort du Japon, fruit d\'années de perfectionnement.',
    stats: { complexité: 78, tradition: 85, goût: 82 },
    lore: 'Chaque région du Japon a sa propre version.',
    artist: 'Tokyo Dreams',
    number: '067/120',
    releaseDate: '2024-02-05'
  },

  // === COLLECTION TECHNIQUES ===
  {
    id: 'card_flambage',
    name: 'Technique du Flambage',
    collection: 'techniques',
    rarity: 'epic',
    icon: '🔥',
    description: 'L\'art spectaculaire d\'enflammer l\'alcool pour sublimer les saveurs.',
    stats: { difficulté: 90, spectacle: 95, maîtrise: 88 },
    lore: 'Inventée au 19ème siècle par Henri Charpentier.',
    artist: 'Fire & Flavor',
    number: '005/060',
    releaseDate: '2024-01-30'
  },
  {
    id: 'card_sousvide',
    name: 'Cuisson Sous Vide',
    collection: 'techniques',
    rarity: 'rare',
    icon: '🌡️',
    description: 'La précision ultime en cuisson, pour des textures parfaites.',
    stats: { difficulté: 75, précision: 98, innovation: 85 },
    lore: 'Développée dans les années 70 pour la haute gastronomie.',
    artist: 'Modern Tech',
    number: '018/060',
    releaseDate: '2024-02-08'
  },

  // === COLLECTION CUISINES DU MONDE ===
  {
    id: 'card_french',
    name: 'Cuisine Française',
    collection: 'regions',
    rarity: 'epic',
    icon: '🇫🇷',
    description: 'L\'art culinaire à la française, référence mondiale de la gastronomie.',
    stats: { technique: 95, raffinement: 98, influence: 100 },
    lore: 'Inscrite au patrimoine immatériel de l\'UNESCO.',
    artist: 'Hexagon Pride',
    number: '001/050',
    releaseDate: '2024-01-05'
  },
  {
    id: 'card_italian',
    name: 'Cuisine Italienne',
    collection: 'regions',
    rarity: 'rare',
    icon: '🇮🇹',
    description: 'La simplicité sublimée, où chaque ingrédient révèle sa vraie nature.',
    stats: { simplicité: 92, authenticité: 95, popularité: 98 },
    lore: 'Basée sur la qualité des produits locaux depuis l\'Antiquité.',
    artist: 'Bella Italia',
    number: '007/050',
    releaseDate: '2024-01-14'
  }
];

// === PACKS DE CARTES ===
const CARD_PACKS = [
  {
    id: 'pack_basic',
    name: 'Booster Découverte',
    price: 50,
    icon: '📦',
    cards: 3,
    description: '3 cartes aléatoires pour débuter votre collection',
    rarityDistribution: {
      common: 0.6,
      uncommon: 0.3,
      rare: 0.08,
      epic: 0.015,
      legendary: 0.005
    }
  },
  {
    id: 'pack_premium',
    name: 'Booster Premium',
    price: 120,
    icon: '🎁',
    cards: 5,
    description: '5 cartes avec au moins 1 rare garantie',
    rarityDistribution: {
      common: 0.4,
      uncommon: 0.35,
      rare: 0.2,
      epic: 0.04,
      legendary: 0.01
    },
    guaranteedRare: true
  },
  {
    id: 'pack_legendary',
    name: 'Booster Légendaire',
    price: 300,
    icon: '👑',
    cards: 7,
    description: '7 cartes avec garantie épique ou légendaire',
    rarityDistribution: {
      common: 0.2,
      uncommon: 0.3,
      rare: 0.35,
      epic: 0.12,
      legendary: 0.03
    },
    guaranteedEpic: true
  }
];

// === PACKS SPÉCIAUX OBJETS ===
const SHOP_PACKS = [
  {
    id: 'pack_starter',
    name: 'Pack Débutant',
    icon: '📦',
    price: 250,
    originalPrice: 300,
    items: ['hat_chef', 'apron_red', 'pepper'],
    rarity: 'common',
    description: 'Tout ce qu\'il faut pour bien commencer',
    discount: 17,
    isNew: false
  },
  {
    id: 'pack_professional',
    name: 'Pack Professionnel',
    icon: '🎁',
    price: 480,
    originalPrice: 600,
    items: ['hat_crown', 'apron_gold', 'spoon_gold', 'bg_kitchen'],
    rarity: 'epic',
    description: 'Équipement complet du chef professionnel',
    discount: 20,
    isNew: true
  },
  {
    id: 'pack_legend',
    name: 'Pack Légendaire',
    icon: '👑',
    price: 800,
    originalPrice: 1000,
    items: ['hat_crown', 'fx_fire', 'badge_master', 'mascot_dragon', 'bg_space'],
    rarity: 'legendary',
    description: 'Collection exclusive des objets les plus rares',
    discount: 20,
    isNew: true
  }
]

// === PROMOTIONS QUOTIDIENNES ===
const getDailyDeals = () => {
  const today = new Date().toDateString();
  const dealSeed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Sélection pseudo-aléatoire basée sur la date
  const availableItems = SHOP_ITEMS.filter(item => !item.exclusive && item.price > 100);
  const dealCount = 3;
  const deals = [];
  
  for (let i = 0; i < dealCount && i < availableItems.length; i++) {
    const index = (dealSeed + i * 7) % availableItems.length;
    const item = { ...availableItems[index] };
    item.originalPrice = item.price;
    item.price = Math.floor(item.price * 0.7); // 30% de réduction
    item.isDailyDeal = true;
    deals.push(item);
  }
  
  return deals;
}

const ITEM_TYPES = [
  { id: 'all', label: 'Tout', icon: '🛒' },
  { id: 'hat', label: 'Chapeaux', icon: '🎩' },
  { id: 'glasses', label: 'Lunettes', icon: '🕶️' },
  { id: 'apron', label: 'Tabliers', icon: '🦺' },
  { id: 'accessory', label: 'Accessoires', icon: '🍴' },
  { id: 'face', label: 'Visage', icon: '🧔' },
  { id: 'background', label: 'Fonds', icon: '🏞️' },
  { id: 'effect', label: 'Effets', icon: '✨' },
  { id: 'badge', label: 'Badges', icon: '🏅' },
  { id: 'mascot', label: 'Mascottes', icon: '🐾' }
]

const DEFAULT_CHEF = {
  hat: null,
  glasses: null,
  apron: null,
  accessory: null,
  face: null,
  background: null,
  effect: null,
  badge: null,
  mascot: null
}

// --- Quiz quotidien (remplace DAILY_CHALLENGES) ---
const DAILY_QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: "Quel ingrédient n'entre PAS dans une pâte à crêpes classique ?",
    options: ["Farine", "Lait", "Levure chimique", "Œufs"],
    answer: 2 // index de la bonne réponse (Levure chimique)
  },
  {
    id: 'q2',
    question: "Quel est le terme pour cuire un aliment dans de l'eau frémissante ?",
    options: ["Sauter", "Pocher", "Griller", "Rôtir"],
    answer: 1
  },
  {
    id: 'q3',
    question: "Quel fromage est traditionnellement utilisé dans la recette de la pizza Margherita ?",
    options: ["Comté", "Mozzarella", "Roquefort", "Chèvre"],
    answer: 1
  },
  {
    id: 'q4',
    question: "Quel est le principal ingrédient du guacamole ?",
    options: ["Avocat", "Tomate", "Poivron", "Courgette"],
    answer: 0
  },
  {
    id: 'q5',
    question: "Comment appelle-t-on une cuisson à la vapeur douce en Asie ?",
    options: ["Wok", "Dim sum", "Bain-marie", "Bambou"],
    answer: 3
  }
]

// --- Système de missions dynamiques ---
const MISSIONS = [
  // Missions recettes
  {
    id: 'first_recipe',
    title: 'Première recette',
    description: 'Publiez votre première recette',
    icon: '📝',
    type: 'recipe',
    target: 1,
    reward: { coins: 50, xp: 25 },
    difficulty: 'facile'
  },
  {
    id: 'recipe_master_5',
    title: 'Chef en herbe',
    description: 'Publiez 5 recettes',
    icon: '👨‍🍳',
    type: 'recipe',
    target: 5,
    reward: { coins: 150, xp: 75 },
    difficulty: 'moyen'
  },
  {
    id: 'recipe_master_10',
    title: 'Maître cuisinier',
    description: 'Publiez 10 recettes',
    icon: '🍳',
    type: 'recipe',
    target: 10,
    reward: { coins: 300, xp: 150, item: 'hat_crown' },
    difficulty: 'difficile'
  },
  
  // Missions sociales
  {
    id: 'first_like',
    title: 'Premier like',
    description: 'Recevez votre premier like',
    icon: '❤️',
    type: 'like',
    target: 1,
    reward: { coins: 20, xp: 10 },
    difficulty: 'facile'
  },
  {
    id: 'popular_chef',
    title: 'Chef populaire',
    description: 'Recevez 50 likes au total',
    icon: '🌟',
    type: 'like',
    target: 50,
    reward: { coins: 250, xp: 125 },
    difficulty: 'difficile'
  },
  {
    id: 'social_butterfly',
    title: 'Papillon social',
    description: 'Ajoutez 5 amis',
    icon: '🤝',
    type: 'friend',
    target: 5,
    reward: { coins: 100, xp: 50 },
    difficulty: 'moyen'
  },
  
  // Missions engagement
  {
    id: 'daily_quiz_streak',
    title: 'Expert quiz',
    description: 'Réussissez 3 quiz consécutifs',
    icon: '🧠',
    type: 'quiz_streak',
    target: 3,
    reward: { coins: 200, xp: 100, item: 'glasses_star' },
    difficulty: 'moyen'
  },
  {
    id: 'login_streak_7',
    title: 'Assidu',
    description: 'Connectez-vous 7 jours consécutifs',
    icon: '🔥',
    type: 'streak',
    target: 7,
    reward: { coins: 300, xp: 150 },
    difficulty: 'moyen'
  },
  
  // Missions spéciales
  {
    id: 'photo_perfectionist',
    title: 'Photographe culinaire',
    description: 'Partagez une photo de plat',
    icon: '📸',
    type: 'photo',
    target: 1,
    reward: { coins: 30, xp: 15 },
    difficulty: 'facile'
  },
  {
    id: 'complete_profile',
    title: 'Profil complet',
    description: 'Complétez votre profil',
    icon: '👤',
    type: 'profile',
    target: 1,
    reward: { coins: 80, xp: 40 },
    difficulty: 'facile'
  }
]

const DAILY_CHALLENGES = [
  { id: 'share_photo', label: "Partager une photo de plat", icon: "📸", reward: "+20 XP" },
  { id: 'comment', label: "Commenter une recette", icon: "💬", reward: "+10 XP" },
  { id: 'add_friend', label: "Ajouter un nouvel ami", icon: "🤝", reward: "+15 XP" }
]

const MOCK_LEADERBOARD = [
  { rank: 1, name: "Chef Paul", xp: 3200, you: false },
  { rank: 2, name: "Sophie", xp: 2900, you: false },
  { rank: 3, name: "Vous", xp: 2100, you: true },
  { rank: 4, name: "Emma", xp: 1800, you: false },
  { rank: 5, name: "Lucas", xp: 1700, you: false }
]

// --- Système de ligues ---
const LEAGUES = [
  { id: 'bronze', label: 'Bronze', minLevel: 1, color: '#cd7f32', icon: '🥉' },
  { id: 'argent', label: 'Argent', minLevel: 3, color: '#c0c0c0', icon: '🥈' },
  { id: 'or', label: 'Or', minLevel: 5, color: '#ffd700', icon: '🥇' },
  { id: 'platine', label: 'Platine', minLevel: 7, color: '#e5e4e2', icon: '💎' },
  { id: 'diamant', label: 'Diamant', minLevel: 9, color: '#b9f2ff', icon: '🔷' },
  { id: 'master', label: 'Master', minLevel: 12, color: '#6366f1', icon: '🏆' }
];

function getLeague(level) {
  let league = LEAGUES[0];
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (level >= LEAGUES[i].minLevel) {
      league = LEAGUES[i];
      break;
    }
  }
  return league;
}

// Helper: Glow effect for items by rarity
function getItemGlow(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId)
  if (!item) return 'none'
  switch (item.rarity) {
    case 'legendary':
      return 'drop-shadow(0 0 8px #f59e0b) drop-shadow(0 0 16px #fbbf24)';
    case 'epic':
      return 'drop-shadow(0 0 8px #8b5cf6) drop-shadow(0 0 12px #a78bfa)';
    case 'rare':
      return 'drop-shadow(0 0 6px #3b82f6)';
    default:
      return 'none';
  }
}

export default function Progression({ user }) {
  const [xp, setXP] = useState(0)
  const [levelInfo, setLevelInfo] = useState(getLevel(0))
  const [trophies, setTrophies] = useState({ unlocked: [], locked: [], totalPoints: 0, unlockedCount: 0, totalCount: 0 })
  const [stats, setStats] = useState({
    recipesCount: 0,
    friendsCount: 0,
    likesReceived: 0,
    daysActive: 0,
    streak: 0
  })
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [dailyChallenges, setDailyChallenges] = useState(DAILY_CHALLENGES)
  const [coins, setCoins] = useState(250)
  const [ownedItems, setOwnedItems] = useState(['hat_chef'])
  const [equipped, setEquipped] = useState({ ...DEFAULT_CHEF, hat: 'hat_chef' })
  const [shopOpen, setShopOpen] = useState(false)
  const [shopFeedback, setShopFeedback] = useState(null)
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [previewEquip, setPreviewEquip] = useState(null)
  const [coinAnim, setCoinAnim] = useState(false)
  const [activeTab, setActiveTab] = useState('progression') // 'progression' | 'boutique' | 'classement'
  const [favoriteItems, setFavoriteItems] = useState([])
  const [shopFilter, setShopFilter] = useState('all')
  const [shopTab, setShopTab] = useState('items') // 'items', 'packs', 'deals', 'cards'
  const [dressingOpen, setDressingOpen] = useState(false)
  const [dressingTab, setDressingTab] = useState('hat') // caté active dans le dressing
  const [itemPreviewOpen, setItemPreviewOpen] = useState(null)
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coco_wishlist') || '[]');
    } catch {
      return [];
    }
  })
  
  // === ÉTATS SYSTÈME DE CARTES ===
  const [ownedCards, setOwnedCards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coco_owned_cards') || '[]');
    } catch {
      return [];
    }
  })
  const [cardCollection, setCardCollection] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coco_card_collection') || '{}');
    } catch {
      return {};
    }
  })
  const [cardPreviewOpen, setCardPreviewOpen] = useState(null)
  const [packOpeningAnimation, setPackOpeningAnimation] = useState(null)
  const [tradingModalOpen, setTradingModalOpen] = useState(false)
  const [cardFilter, setCardFilter] = useState('all') // 'all', 'ingredients', 'chefs', etc.
  const [cardSortBy, setCardSortBy] = useState('rarity') // 'rarity', 'name', 'collection'
  const [marketplaceOpen, setMarketplaceOpen] = useState(false)
  const [tradeOffers, setTradeOffers] = useState([])
  const [myTradeOffers, setMyTradeOffers] = useState([])
  const [completedChallenges, setCompletedChallenges] = useState(() => {
    // Stockage local pour empêcher la validation infinie des quêtes
    try {
      const data = JSON.parse(localStorage.getItem('coco_daily_challenges') || '{}');
      return data;
    } catch {
      return {};
    }
  });

  // --- Modal d'aperçu d'objet ---
  const renderItemPreview = (item) => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}
      onClick={() => setItemPreviewOpen(null)}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          maxWidth: 380,
          width: '100%',
          padding: 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
          animation: 'itemPreviewPop 0.4s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setItemPreviewOpen(null)}
          style={{
            position: 'absolute',
            top: 12, right: 16,
            background: 'none',
            border: 'none',
            fontSize: 20,
            color: '#6b7280',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >✕</button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 64,
            marginBottom: 12,
            filter: getItemGlow(item.id)
          }}>
            {item.icon}
          </div>
          
          <div style={{
            fontWeight: 800,
            fontSize: '1.4rem',
            color: '#1f2937',
            marginBottom: 6
          }}>
            {item.name}
          </div>
          
          <div style={{
            fontSize: '0.9rem',
            color: '#6b7280',
            marginBottom: 12,
            lineHeight: 1.4
          }}>
            {item.description}
          </div>

          {/* Tags */}
          <div style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 16
          }}>
            {item.tags?.map(tag => (
              <span key={tag} style={{
                background: '#f3f4f6',
                color: '#6b7280',
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: '0.7rem',
                fontWeight: 600
              }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Rareté et niveau */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 20
          }}>
            <div style={{
              background: item.rarity === 'legendary' ? '#fef3c7' : 
                         item.rarity === 'epic' ? '#f3e8ff' : 
                         item.rarity === 'rare' ? '#dbeafe' : '#f3f4f6',
              color: item.rarity === 'legendary' ? '#f59e0b' : 
                     item.rarity === 'epic' ? '#8b5cf6' : 
                     item.rarity === 'rare' ? '#3b82f6' : '#6b7280',
              padding: '6px 12px',
              borderRadius: 12,
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {item.rarity === 'legendary' ? '★★★ Légendaire' :
               item.rarity === 'epic' ? '★★ Épique' :
               item.rarity === 'rare' ? '★ Rare' :
               item.rarity === 'uncommon' ? 'Peu commun' : 'Commun'}
            </div>
            
            {item.unlockLevel > 1 && (
              <div style={{
                background: levelInfo.current.level >= item.unlockLevel ? '#dcfce7' : '#fee2e2',
                color: levelInfo.current.level >= item.unlockLevel ? '#16a34a' : '#dc2626',
                padding: '6px 12px',
                borderRadius: 12,
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                Niveau {item.unlockLevel}
              </div>
            )}
          </div>

          {/* Prix */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20
          }}>
            {item.onSale ? (
              <>
                <span style={{
                  textDecoration: 'line-through',
                  color: '#9ca3af',
                  fontSize: '1rem'
                }}>
                  {item.originalPrice}🪙
                </span>
                <span style={{
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '1.3rem'
                }}>
                  {item.price}🪙
                </span>
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  PROMO
                </span>
              </>
            ) : (
              <span style={{
                color: '#f59e0b',
                fontWeight: 700,
                fontSize: '1.3rem'
              }}>
                {item.price}🪙
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center'
          }}>
            <button
              onClick={() => toggleWishlist(item.id)}
              style={{
                background: wishlist.includes(item.id) ? '#fef2f2' : '#f9fafb',
                color: wishlist.includes(item.id) ? '#dc2626' : '#6b7280',
                border: wishlist.includes(item.id) ? '1px solid #fecaca' : '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {wishlist.includes(item.id) ? '❤️' : '🤍'}
              {wishlist.includes(item.id) ? 'Dans ma wishlist' : 'Ajouter à la wishlist'}
            </button>

            {ownedItems.includes(item.id) ? (
              <button
                onClick={() => equipItem(item)}
                style={{
                  background: equipped[item.type] === item.id ? '#dcfce7' : 'linear-gradient(135deg, #10b981, #34d399)',
                  color: equipped[item.type] === item.id ? '#16a34a' : 'white',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: equipped[item.type] === item.id ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {equipped[item.type] === item.id ? '✅ Équipé' : 'Équiper'}
              </button>
            ) : (
              <button
                onClick={() => {
                  buyItem(item);
                  setItemPreviewOpen(null);
                }}
                disabled={coins < item.price || levelInfo.current.level < (item.unlockLevel || 1)}
                style={{
                  background: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) 
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' 
                    : '#e5e7eb',
                  color: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'pointer' : 'not-allowed',
                  boxShadow: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) 
                    ? '0 4px 12px rgba(245, 158, 11, 0.3)' 
                    : 'none'
                }}
              >
                {levelInfo.current.level < (item.unlockLevel || 1) ? '🔒 Verrouillé' : 'Acheter'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
  // --- Wrapper sécurisé pour les appels Supabase ---
  const safeSupabaseCall = async (operation, fallbackValue = null) => {
    try {
      const supabase = getSupabaseClient();
      const result = await operation(supabase);
      return result;
    } catch (error) {
      console.error('Erreur Supabase:', error);
      return fallbackValue;
    }
  };

  // --- Système de missions ---
  const [missions, setMissions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('coco_missions') || '[]');
      return saved.length > 0 ? saved : MISSIONS.slice(0, 4); // 4 missions actives par défaut
    } catch {
      return MISSIONS.slice(0, 4);
    }
  });
  const [completedMissions, setCompletedMissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
    } catch {
      return [];
    }
  });

  // --- États pour le tracking des missions ---
  const [missionProgresses, setMissionProgresses] = useState({});
  const [missionsLoading, setMissionsLoading] = useState(false);

  // --- Fonctions helper pour missions avec vraies données ---
  const getCurrentProgress = async (mission) => {
    if (!stats || !user) return 0;
    
    try {
      switch (mission.type) {
        // === MISSIONS RECETTES ===
        case 'recipe_count':
          return stats.recipesCount || 0;
          
        case 'recipe_categories':
          const supabase = getSupabaseClient();
          const { data: recipes } = await supabase
            .from('recipes')
            .select('category')
            .eq('user_id', user.id);
          const uniqueCategories = [...new Set(recipes?.map(r => r.category) || [])];
          return uniqueCategories.length;
          
        case 'weekend_recipes':
          const { data: weekendRecipes } = await supabase
            .from('recipes')
            .select('created_at')
            .eq('user_id', user.id);
          const weekendCount = weekendRecipes?.filter(r => {
            const day = new Date(r.created_at).getDay();
            return day === 0 || day === 6;
          }).length || 0;
          return weekendCount;
          
        case 'night_recipe':
          const { data: nightRecipes } = await supabase
            .from('recipes')
            .select('created_at')
            .eq('user_id', user.id);
          const nightCount = nightRecipes?.filter(r => {
            const hour = new Date(r.created_at).getHours();
            return hour >= 22 || hour <= 6;
          }).length || 0;
          return nightCount > 0 ? 1 : 0;
          
        case 'daily_recipes':
          const today = new Date().toISOString().split('T')[0];
          const { data: todayRecipes } = await supabase
            .from('recipes')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', today + 'T00:00:00')
            .lt('created_at', today + 'T23:59:59');
          return todayRecipes?.length || 0;
        
        // === MISSIONS SOCIALES ===
        case 'likes_received':
          return stats.likesReceived || 0;
          
        case 'friends_count':
          return stats.friendsCount || 0;
          
        // === MISSIONS QUIZ ===
        case 'quiz_success_count':
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
            return quizHistory.filter(q => q.success).length;
          } catch {
            return 0;
          }
          
        case 'quiz_streak':
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]');
            let currentStreak = 0;
            for (let i = quizHistory.length - 1; i >= 0; i--) {
              if (quizHistory[i].success) {
                currentStreak++;
              } else {
                break;
              }
            }
            return currentStreak;
          } catch {
            return 0;
          }
        
        // === MISSIONS ASSIDUITÉ ===
        case 'login_streak':
          return stats.streak || 0;
          
        // === MISSIONS INTERACTION ===
        case 'comments_given':
          const { data: comments } = await supabase
            .from('comments')
            .select('id')
            .eq('user_id', user.id);
          return comments?.length || 0;
          
        // === MISSIONS PROFIL & CUSTOMISATION ===
        case 'profile_complete':
          const hasDisplayName = user?.user_metadata?.display_name;
          const hasAvatar = user?.user_metadata?.avatar_url;
          return (hasDisplayName && hasAvatar) ? 1 : 0;
          
        case 'equipped_items':
          const equippedCount = Object.values(equipped).filter(item => item !== null).length;
          return equippedCount;
          
        case 'owned_items':
          return ownedItems.length;
          
        case 'purchased_items':
          return purchaseHistory.length;
          
        // === MISSIONS SPÉCIALES ===
        case 'special_early':
          const joinDate = new Date(user?.created_at || Date.now());
          const cutoffDate = new Date('2025-01-01');
          return joinDate < cutoffDate ? 1 : 0;
          
        default:
          return 0;
      }
    } catch (error) {
      console.error(`Erreur calcul progrès mission ${mission.id}:`, error);
      return 0;
    }
  };

  // --- Fonction pour synchroniser toutes les missions ---
  const syncAllMissions = async () => {
    if (!user || missionsLoading) return;
    
    setMissionsLoading(true);
    
    try {
      const progressMap = {};
      
      // Calculer le progrès pour chaque mission active
      for (const mission of missions) {
        const progress = await getCurrentProgress(mission);
        progressMap[mission.id] = {
          current: progress,
          target: mission.target,
          percent: Math.min(100, (progress / mission.target) * 100),
          isCompleted: progress >= mission.target && !completedMissions.includes(mission.id)
        };
      }
      
      setMissionProgresses(progressMap);
      
      // Vérifier les missions complétées
      const newlyCompleted = [];
      for (const mission of missions) {
        if (progressMap[mission.id]?.isCompleted) {
          newlyCompleted.push(mission);
        }
      }
      
      // Traiter les missions complétées
      if (newlyCompleted.length > 0) {
        await processMissionCompletions(newlyCompleted);
      }
      
    } catch (error) {
      console.error('Erreur lors de la synchronisation des missions:', error);
    }
    
    setMissionsLoading(false);
  };
  
  // --- Fonction pour traiter les missions complétées ---
  const processMissionCompletions = async (newlyCompleted) => {
    const newCompletedIds = newlyCompleted.map(m => m.id);
    const allCompleted = [...completedMissions, ...newCompletedIds];
    
    // Calculer les récompenses totales
    let totalCoins = 0;
    let totalXP = 0;
    const newItems = [];
    
    for (const mission of newlyCompleted) {
      totalCoins += mission.reward.coins || 0;
      totalXP += mission.reward.xp || 0;
      
      if (mission.reward.item && !ownedItems.includes(mission.reward.item)) {
        newItems.push(mission.reward.item);
      }
    }
    
    // Mettre à jour les états
    setCompletedMissions(allCompleted);
    localStorage.setItem('coco_completed_missions', JSON.stringify(allCompleted));
    
    if (totalCoins > 0) {
      setCoins(prev => prev + totalCoins);
      // Mettre à jour en base
      const supabase = getSupabaseClient();
      await supabase
        .from('user_pass')
        .update({ coins: coins + totalCoins })
        .eq('user_id', user.id);
    }
    
    if (totalXP > 0) {
      setXP(prev => prev + totalXP);
    }
    
    if (newItems.length > 0) {
      const updatedItems = [...ownedItems, ...newItems];
      setOwnedItems(updatedItems);
      // Mettre à jour en base
      await supabase
        .from('user_pass')
        .update({ owned_items: updatedItems })
        .eq('user_id', user.id);
    }
    
    // Feedback visuel
    if (newlyCompleted.length === 1) {
      const mission = newlyCompleted[0];
      setShopFeedback({ 
        type: 'success', 
        msg: `🎉 Mission "${mission.title}" terminée ! +${mission.reward.coins || 0} CocoCoins` 
      });
    } else {
      setShopFeedback({ 
        type: 'success', 
        msg: `🎉 ${newlyCompleted.length} missions terminées ! +${totalCoins} CocoCoins` 
      });
    }
    
    setTimeout(() => setShopFeedback(null), 4000);
    
    // Animation coins
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 900);
    
    // Remplacer les missions complétées par de nouvelles
    setTimeout(async () => {
      await assignNewMissions(newCompletedIds);
    }, 2000);
  };
  
  // --- Fonction pour assigner de nouvelles missions ---
  const assignNewMissions = async (completedIds) => {
    const allCompleted = getCompletedMissions();
    const currentMissionIds = missions.map(m => m.id);
    
    // Missions disponibles (non complétées et non actives)
    const availableMissions = MISSIONS.filter(m => 
      !allCompleted.includes(m.id) && 
      !currentMissionIds.includes(m.id)
    );
    
    // Remplacer les missions complétées
    let updatedMissions = missions.filter(m => !completedIds.includes(m.id));
    
    // Ajouter de nouvelles missions jusqu'à avoir 6 missions actives
    while (updatedMissions.length < 6 && availableMissions.length > 0) {
      // Prioriser selon la difficulté et catégorie
      const easyMissions = availableMissions.filter(m => m.difficulty === 'facile');
      const mediumMissions = availableMissions.filter(m => m.difficulty === 'moyen');
      
      let selectedMission;
      if (easyMissions.length > 0 && Math.random() > 0.3) {
        selectedMission = easyMissions[Math.floor(Math.random() * easyMissions.length)];
      } else if (mediumMissions.length > 0 && Math.random() > 0.5) {
        selectedMission = mediumMissions[Math.floor(Math.random() * mediumMissions.length)];
      } else {
        selectedMission = availableMissions[Math.floor(Math.random() * availableMissions.length)];
      }
      
      updatedMissions.push(selectedMission);
      availableMissions.splice(availableMissions.indexOf(selectedMission), 1);
    }
    
    setMissions(updatedMissions);
    localStorage.setItem('coco_missions', JSON.stringify(updatedMissions));
    
    // Recalculer les progrès pour les nouvelles missions
    await syncAllMissions();
  };
  
  // --- Helper pour obtenir les missions complétées ---
  const getCompletedMissions = () => {
    try {
      return JSON.parse(localStorage.getItem('coco_completed_missions') || '[]');
    } catch {
      return [];
    }
  };
  
  // --- Quiz quotidien ---
  const [quizState, setQuizState] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('coco_daily_quiz') || '{}');
      return data;
    } catch {
      return {};
    }
  });
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [quizQuestion, setQuizQuestion] = useState(null)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)
  const [quizLoading, setQuizLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      setLoading(true)
      let userStats = { recipesCount: 0, friendsCount: 0, likesReceived: 0, daysActive: 0, streak: 0 }
      let trophyData = { unlocked: [], locked: [], totalPoints: 0, unlockedCount: 0, totalCount: 0 }
      let xpCalc = 0

      if (user?.id) {
        try {
          userStats = await getUserStatsComplete(user.id)
          trophyData = await getUserTrophies(user.id)
          // XP = 10 * recettes + 40 * quiz réussi
          let quizSuccessCount = 0
          try {
            const quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]')
            quizSuccessCount = quizHistory.filter(q => q.success).length
          } catch {
            quizSuccessCount = quizState?.success ? 1 : 0
          }
          xpCalc = 10 * (userStats.recipesCount || 0) + 40 * quizSuccessCount
        } catch (e) {}
      }
      if (isMounted) {
        setStats(userStats)
        setTrophies(trophyData)
        setXP(xpCalc)
        setLevelInfo(getLevel(xpCalc))
        setLoading(false)
        
        // Synchroniser les missions après le chargement des stats
        if (user?.id) {
          await syncAllMissions();
        }
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [user, quizState])

  // Effet pour synchroniser les missions quand les stats changent
  useEffect(() => {
    if (!loading && user?.id && missions.length > 0) {
      syncAllMissions();
    }
  }, [stats, ownedItems, equipped, purchaseHistory])

  // Effet pour synchroniser périodiquement (toutes les 30 secondes)
  useEffect(() => {
    if (!user?.id) return;
    
    const interval = setInterval(async () => {
      if (!missionsLoading) {
        await syncAllMissions();
      }
    }, 30000); // 30 secondes
    
    return () => clearInterval(interval);
  }, [user, missionsLoading])

  useEffect(() => {
    setLevelInfo(getLevel(xp))
  }, [xp])

  // --- Au chargement ---
  useEffect(() => {
    async function loadUserPass() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('user_pass')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setCoins(data.coins);
          setOwnedItems(data.owned_items);
          setEquipped(data.equipped);
        } else {
          // Si pas de ligne, on la crée
          await supabase.from('user_pass').insert({
            user_id: user.id,
            coins: 200,
            owned_items: ['hat_chef'],
            equipped: { ...DEFAULT_CHEF, hat: 'hat_chef' }
          });
          setCoins(200);
          setOwnedItems(['hat_chef']);
          setEquipped({ ...DEFAULT_CHEF, hat: 'hat_chef' });
        }

        // Charger également les cartes
        const cardData = await getUserCardCollection(user.id);
        setOwnedCards(cardData.owned_cards);
        setCardCollection(cardData.collection_stats);
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      }
    }
    if (user?.id) loadUserPass();
  }, [user]);

  // --- Gestion achat objet avec feedback et historique ---
  const buyItem = async (item) => {
    if (ownedItems.includes(item.id) || coins < item.price) return;
    
    // Vérifier le niveau requis
    const userLevel = levelInfo.current.level;
    if (item.unlockLevel && userLevel < item.unlockLevel) {
      setShopFeedback({ 
        type: 'error', 
        msg: `🔒 Niveau ${item.unlockLevel} requis !` 
      });
      setTimeout(() => setShopFeedback(null), 3000);
      return;
    }
    
    const newCoins = coins - item.price;
    const newOwned = [...ownedItems, item.id];
    setCoins(newCoins);
    setOwnedItems(newOwned);
    
    // Sauvegarder l'historique d'achats
    const newPurchaseHistory = [
      { date: new Date(), item, price: item.price },
      ...purchaseHistory
    ];
    setPurchaseHistory(newPurchaseHistory);
    
    // Retirer de la wishlist si présent
    if (wishlist.includes(item.id)) {
      const newWishlist = wishlist.filter(id => id !== item.id);
      setWishlist(newWishlist);
      localStorage.setItem('coco_wishlist', JSON.stringify(newWishlist));
    }
    
    // Sauvegarder dans localStorage pour les missions
    try {
      localStorage.setItem('coco_purchase_history', JSON.stringify(newPurchaseHistory));
    } catch (error) {
      console.error('Erreur sauvegarde historique achats:', error);
    }
    
    // Feedback enrichi selon la rareté
    const rarityEmojis = {
      'common': '✅',
      'uncommon': '🎉',
      'rare': '🌟',
      'epic': '💫',
      'legendary': '👑'
    };
    
    setShopFeedback({ 
      type: 'success', 
      msg: `${rarityEmojis[item.rarity] || '✅'} ${item.name} acheté ! ${item.rarity === 'legendary' ? '🎊' : ''}` 
    });
    setTimeout(() => setShopFeedback(null), 3000);
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 900);
    
    // --- À chaque achat ou modification ---
    async function updateUserPass(newFields) {
      const supabase = getSupabaseClient();
      await supabase
        .from('user_pass')
        .update(newFields)
        .eq('user_id', user.id);
    }
    await updateUserPass({ 
      coins: newCoins, 
      owned_items: newOwned,
      purchase_history: newPurchaseHistory 
    });
    
    // Synchroniser les missions après achat
    setTimeout(async () => {
      await syncAllMissions();
    }, 500);
  };

  // --- Gestion achat de pack ---
  const buyPack = async (pack) => {
    if (coins < pack.price) return;
    
    // Vérifier quels objets ne sont pas encore possédés
    const itemsToBuy = pack.items.filter(itemId => !ownedItems.includes(itemId));
    if (itemsToBuy.length === 0) {
      setShopFeedback({ 
        type: 'info', 
        msg: '📦 Vous possédez déjà tous ces objets !' 
      });
      setTimeout(() => setShopFeedback(null), 2500);
      return;
    }
    
    const newCoins = coins - pack.price;
    const newOwned = [...ownedItems, ...itemsToBuy];
    setCoins(newCoins);
    setOwnedItems(newOwned);
    
    const newPurchaseHistory = [
      { date: new Date(), item: pack, price: pack.price, isPack: true },
      ...purchaseHistory
    ];
    setPurchaseHistory(newPurchaseHistory);
    
    setShopFeedback({ 
      type: 'success', 
      msg: `🎁 Pack "${pack.name}" acheté ! ${itemsToBuy.length} nouveaux objets !` 
    });
    setTimeout(() => setShopFeedback(null), 4000);
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 900);
    
    // Mettre à jour la base
    const supabase = getSupabaseClient();
    await supabase
      .from('user_pass')
      .update({ 
        coins: newCoins, 
        owned_items: newOwned,
        purchase_history: newPurchaseHistory 
      })
      .eq('user_id', user.id);
  };

  // --- Gestion wishlist ---
  const toggleWishlist = (itemId) => {
    const newWishlist = wishlist.includes(itemId)
      ? wishlist.filter(id => id !== itemId)
      : [...wishlist, itemId];
    
    setWishlist(newWishlist);
    localStorage.setItem('coco_wishlist', JSON.stringify(newWishlist));
    
    const isAdding = !wishlist.includes(itemId);
    setShopFeedback({ 
      type: 'info', 
      msg: isAdding ? '❤️ Ajouté à la wishlist' : '💔 Retiré de la wishlist' 
    });
    setTimeout(() => setShopFeedback(null), 1500);
  };

  // --- Gestion équipement objet avec feedback ---
  const equipItem = (item) => {
    setEquipped(prev => {
      // Déséquipe si déjà équipé
      if (prev[item.type] === item.id) {
        setShopFeedback({ type: 'info', msg: `❎ ${item.name} retiré.` })
        setTimeout(() => setShopFeedback(null), 1500)
        return { ...prev, [item.type]: null }
      }
      setShopFeedback({ type: 'success', msg: `🎉 ${item.name} équipé !` })
      setTimeout(() => setShopFeedback(null), 1500)
      return { ...prev, [item.type]: item.id }
    })
  }

  // --- Validation unique des quêtes journalières ---
  const canValidateChallenge = (challengeId) => {
    const today = new Date().toISOString().slice(0, 10)
    return !completedChallenges[challengeId] || completedChallenges[challengeId] !== today
  }
  const validateChallenge = (challenge) => {
    if (!canValidateChallenge(challenge.id)) return
    gainCoins(20)
    const today = new Date().toISOString().slice(0, 10)
    const updated = { ...completedChallenges, [challenge.id]: today }
    setCompletedChallenges(updated)
    localStorage.setItem('coco_daily_challenges', JSON.stringify(updated))
    setShopFeedback({ type: 'success', msg: `Défi validé ! +20 CocoCoins` })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Animation gain de coins (ex: défi validé) ---
  const gainCoins = (amount = 20) => {
    setCoins(prev => prev + amount)
    setCoinAnim(true)
    setTimeout(() => setCoinAnim(false), 900)
    setShopFeedback({ type: 'success', msg: `+${amount} CocoCoins !` })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Favoris ---
  const toggleFavorite = (itemId) => {
    setFavoriteItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  // --- Tout déséquiper ---
  const unequipAll = () => {
    setEquipped({ ...DEFAULT_CHEF })
    setShopFeedback({ type: 'info', msg: 'Tout déséquipé !' })
    setTimeout(() => setShopFeedback(null), 1200)
  }

  // --- Dressing modal : aperçu avatar + équipement complet ---
  const renderDressing = () => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.55)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
      onClick={() => setDressingOpen(false)}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 24,
          maxWidth: 420,
          width: '95%',
          padding: 28,
          boxShadow: '0 12px 40px #0002',
          position: 'relative',
          animation: 'dressingPop 0.3s'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => setDressingOpen(false)}
          style={{
            position: 'absolute',
            top: 14, right: 18,
            background: 'none',
            border: 'none',
            fontSize: 22,
            color: '#f59e0b',
            cursor: 'pointer',
            fontWeight: 700
          }}
          aria-label="Fermer"
        >✕</button>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            fontWeight: 800,
            fontSize: '1.3rem',
            color: '#f59e0b',
            marginBottom: 6
          }}>Mon avatar chef</div>
          <div style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: 10
          }}>Personnalisez votre chef avec vos objets débloqués !</div>
        </div>
        {/* Avatar en grand */}
        <div style={{
          width: 180, height: 180, margin: '0 auto 18px auto',
          position: 'relative', background: '#fef3c7', borderRadius: '50%',
          boxShadow: '0 2px 18px #f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {renderChefAvatar({ size: 180 })}
        </div>
        {/* Tabs catégories */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap'
        }}>
          {ITEM_TYPES.filter(t => t.id !== 'all').map(cat => (
            <button
              key={cat.id}
              onClick={() => setDressingTab(cat.id)}
              style={{
                background: dressingTab === cat.id ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
                color: dressingTab === cat.id ? 'white' : '#f59e0b',
                border: dressingTab === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '1.2rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
        {/* Objets équipables */}
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10
        }}>
          {SHOP_ITEMS.filter(i => i.type === dressingTab && ownedItems.includes(i.id)).length === 0 && (
            <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.95rem' }}>
              Aucun objet débloqué pour cette catégorie
            </span>
          )}
          {SHOP_ITEMS.filter(i => i.type === dressingTab && ownedItems.includes(i.id)).map(item => (
            <div key={item.id} style={{
              background: equipped[dressingTab] === item.id ? '#f59e0b' : '#f3f4f6',
              color: equipped[dressingTab] === item.id ? 'white' : '#92400e',
              borderRadius: 10,
              padding: '10px 12px',
              fontWeight: 700,
              fontSize: 22,
              cursor: 'pointer',
              boxShadow: equipped[dressingTab] === item.id ? '0 2px 8px #f59e0b33' : 'none',
              border: equipped[dressingTab] === item.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              transition: 'all 0.2s'
            }}
              title={item.name}
              onClick={() => equipItem(item)}
            >
              {item.icon}
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 2,
                color: equipped[dressingTab] === item.id ? 'white' : '#92400e'
              }}>{item.name}</div>
            </div>
          ))}
          {/* Déséquiper */}
          {equipped[dressingTab] && (
            <button
              onClick={() => equipItem({ ...SHOP_ITEMS.find(i => i.id === equipped[dressingTab]), id: equipped[dressingTab] })}
              style={{
                background: '#fff',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                borderRadius: 10,
                padding: '10px 12px',
                fontWeight: 700,
                fontSize: 16,
                marginLeft: 8,
                cursor: 'pointer'
              }}
            >
              Retirer
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.95rem', marginTop: 8 }}>
          Cliquez sur un objet pour l'équiper ou le retirer.
        </div>
        <style jsx>{`
          @keyframes dressingPop {
            0% { opacity: 0; transform: scale(0.9);}
            100% { opacity: 1; transform: scale(1);}
          }
        `}</style>
      </div>
    </div>
  )

  // --- Rendu avatar chef modifié pour supporter la taille et un placement plus précis ---
  const renderChefAvatar = (opts = {}) => {
    const size = opts.size || 110
    const equippedToShow = previewEquip
      ? { ...equipped, [previewEquip.type]: previewEquip.id }
      : equipped

    // Helper pour effet brillance sur le contour
    const avatarBorderStyle = {
      boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
      border: '3px solid #fff',
      background: 'linear-gradient(135deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: '50%',
      position: 'absolute',
      left: 0,
      top: 0,
      width: size,
      height: size,
      zIndex: 0,
      pointerEvents: 'none'
    }

    // Placement précis pour chaque type d'objet
    return (
      <div style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        filter: previewEquip ? 'brightness(1.1) drop-shadow(0 0 8px #f59e0b88)' : 'none',
        transition: 'filter 0.3s',
        background: 'linear-gradient(135deg, #fffbe6 60%, #fef3c7 100%)',
        borderRadius: '50%',
        boxShadow: '0 0 0 6px #f59e0b22, 0 4px 24px #f59e0b33',
        overflow: 'visible'
      }}>
        {/* Contour et effet brillance */}
        <div style={avatarBorderStyle}></div>
        {/* Fond */}
        {equippedToShow.background && (
          <div style={{
            fontSize: size * 0.38,
            position: 'absolute',
            left: size * 0.08,
            top: size * 0.08,
            zIndex: 1,
            opacity: 0.18,
            filter: 'blur(1px) brightness(1.1)'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.background)?.icon}
          </div>
        )}
        {/* Base chef */}
        <div style={{
          fontSize: size * 0.39,
          position: 'absolute',
          left: size * 0.18,
          top: size * 0.18,
          zIndex: 2,
          transition: 'opacity 0.2s',
          textShadow: '0 2px 8px #f59e0b22'
        }}>🧑</div>
        {/* Chapeau */}
        {equippedToShow.hat && (
          <div style={{
            fontSize: size * 0.28,
            position: 'absolute',
            left: size * 0.32,
            top: size * -0.07,
            zIndex: 5,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.hat ? 'scale(1.18) rotate(-10deg)' : 'rotate(-5deg)',
            filter: getItemGlow(equippedToShow.hat),
            textShadow: '0 2px 8px #f59e0b44'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.hat)?.icon}
          </div>
        )}
        {/* Lunettes */}
        {equippedToShow.glasses && (
          <div style={{
            fontSize: size * 0.19,
            position: 'absolute',
            left: size * 0.44,
            top: size * 0.41,
            zIndex: 6,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.glasses ? 'scale(1.15) rotate(8deg)' : 'rotate(2deg)',
            filter: getItemGlow(equippedToShow.glasses),
            textShadow: '0 1px 4px #37415122'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.glasses)?.icon}
          </div>
        )}
        {/* Tablier */}
        {equippedToShow.apron && (
          <div style={{
            fontSize: size * 0.22,
            position: 'absolute',
            left: size * 0.41,
            top: size * 0.74,
            zIndex: 3,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.apron ? 'scale(1.12)' : 'none',
            filter: getItemGlow(equippedToShow.apron),
            textShadow: '0 1px 4px #05966922'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.apron)?.icon}
          </div>
        )}
        {/* Accessoire */}
        {equippedToShow.accessory && (
          <div style={{
            fontSize: size * 0.16,
            position: 'absolute',
            left: size * 0.74,
            top: size * 0.74,
            zIndex: 7,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.accessory ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.accessory),
            textShadow: '0 1px 4px #10b98122'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.accessory)?.icon}
          </div>
        )}
        {/* Visage (moustache/barbe) */}
        {equippedToShow.face && (
          <div style={{
            fontSize: size * 0.15,
            position: 'absolute',
            left: size * 0.56,
            top: size * 0.68,
            zIndex: 8,
            transition: 'transform 0.2s',
            transform: previewEquip?.id === equippedToShow.face ? 'scale(1.15)' : 'none',
            filter: getItemGlow(equippedToShow.face),
            textShadow: '0 1px 4px #92400e22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.face)?.icon}
          </div>
        )}
        {/* Effet spécial */}
        {equippedToShow.effect && (
          <div style={{
            fontSize: size * 0.21,
            position: 'absolute',
            left: size * 0.73,
            top: size * 0.09,
            zIndex: 9,
            animation: 'effectAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.effect),
            textShadow: '0 1px 4px #f59e0b22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.effect)?.icon}
          </div>
        )}
        {/* Badge */}
        {equippedToShow.badge && (
          <div style={{
            fontSize: size * 0.13,
            position: 'absolute',
            left: size * 0.09,
            top: size * 0.82,
            zIndex: 10,
            filter: getItemGlow(equippedToShow.badge),
            textShadow: '0 1px 4px #f59e0b22'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.badge)?.icon}
          </div>
        )}
        {/* Mascotte */}
        {equippedToShow.mascot && (
          <div style={{
            fontSize: size * 0.18,
            position: 'absolute',
            left: size * 0.82,
            top: size * 0.82,
            zIndex: 11,
            animation: 'mascotAnim 1.2s infinite alternate',
            filter: getItemGlow(equippedToShow.mascot),
            textShadow: '0 1px 4px #8b5cf622'
          }}>
            {SHOP_ITEMS.find(i => i.id === equippedToShow.mascot)?.icon}
          </div>
        )}
        {/* Effet de brillance sur le contour */}
        <div style={{
          position: 'absolute',
          left: size * 0.05,
          top: size * 0.05,
          width: size * 0.9,
          height: size * 0.9,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)',
          zIndex: 12,
          pointerEvents: 'none',
          animation: 'avatarShine 2.5s infinite alternate'
        }} />
        <style jsx>{`
          @keyframes effectAnim {
            0% { filter: brightness(1) scale(1);}
            100% { filter: brightness(1.2) scale(1.08);}
          }
          @keyframes mascotAnim {
            0% { transform: scale(1) rotate(-5deg);}
            100% { transform: scale(1.12) rotate(8deg);}
          }
          @keyframes avatarShine {
            0% { opacity: 0.6;}
            100% { opacity: 1;}
          }
        `}</style>
      </div>
    )
  }

  const percent = Math.min(
    100,
    Math.round(
      ((xp - levelInfo.current.xp) /
        (levelInfo.next.xp - levelInfo.current.xp)) *
        100
    )
  )

  // --- Onglets navigation ---
  const renderTabs = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 24,
      marginTop: 8
    }}>
      <button
        onClick={() => setActiveTab('progression')}
        style={{
          background: activeTab === 'progression' ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
          color: activeTab === 'progression' ? 'white' : '#f59e0b',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'progression' ? '0 2px 8px #f59e0b33' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Progression
      </button>
      <button
        onClick={() => setActiveTab('boutique')}
        style={{
          background: activeTab === 'boutique' ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
          color: activeTab === 'boutique' ? 'white' : '#10b981',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'boutique' ? '0 2px 8px #10b98133' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Boutique
      </button>
      <button
        onClick={() => setActiveTab('classement')}
        style={{
          background: activeTab === 'classement' ? 'linear-gradient(135deg, #6366f1, #a5b4fc)' : '#fff',
          color: activeTab === 'classement' ? 'white' : '#6366f1',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: activeTab === 'classement' ? '0 2px 8px #6366f133' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Classement
      </button>
      <button
        onClick={() => setDressingOpen(true)}
        style={{
          background: dressingOpen ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : '#fff',
          color: dressingOpen ? 'white' : '#f59e0b',
          border: 'none',
          borderRadius: 14,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: dressingOpen ? '0 2px 8px #f59e0b33' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        Dressing
      </button>
    </div>
  )

  // --- Classement mensuel XP ---
  const renderLeaderboardTab = () => (
    <div>
      <div style={{
        fontWeight: 700,
        fontSize: '1.1rem',
        marginBottom: 18,
        color: '#6366f1',
        textAlign: 'center'
      }}>
        Classement mensuel des utilisateurs (recettes publiées depuis le début du mois)
      </div>
      {leaderboardLoading ? (
        <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
          Chargement du classement...
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg,#e0e7ff 0%,#f3f4f6 100%)',
          borderRadius: 18,
          boxShadow: '0 4px 24px #6366f122',
          padding: '18px 10px 10px 10px',
          marginBottom: 24,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '1rem'
          }}>
            <thead>
              <tr style={{ color: '#6366f1', fontWeight: 700 }}>
                <th style={{ padding: 8, textAlign: 'center' }}>#</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Recettes (30j)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 20).map((u, idx) => {
                // Décoration rang
                let rankBg = 'transparent', rankColor = '#374151', rankIcon = '';
                if (idx === 0) { rankBg = '#fef3c7'; rankColor = '#f59e0b'; rankIcon = '🥇'; }
                else if (idx === 1) { rankBg = '#e0e7ff'; rankColor = '#6366f1'; rankIcon = '🥈'; }
                else if (idx === 2) { rankBg = '#f3f4f6'; rankColor = '#a3a3a3'; rankIcon = '🥉'; }
                return (
                  <tr key={u.user_id} style={{
                    background: u.isYou ? '#f3f4f6' : rankBg,
                    fontWeight: u.isYou ? 700 : (idx < 3 ? 700 : 500),
                    color: u.isYou ? '#f59e0b' : rankColor,
                    boxShadow: u.isYou ? '0 2px 8px #f59e0b22' : (idx < 3 ? '0 2px 8px #6366f122' : 'none'),
                    borderRadius: 12,
                    transition: 'background 0.2s'
                  }}>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: idx < 3 ? 22 : 16,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : idx === 2 ? '#a3a3a3' : '#374151'
                    }}>
                      {rankIcon ? <span style={{ marginRight: 4 }}>{rankIcon}</span> : null}
                      {idx + 1}
                    </td>
                    <td style={{
                      padding: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: u.isYou ? '1.05rem' : '1rem'
                    }}>
                      {u.avatar_url && (
                        <img src={u.avatar_url} alt="" style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: idx < 3 ? `2px solid ${idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3'}` : '1px solid #e5e7eb',
                          boxShadow: idx < 3 ? '0 2px 8px #6366f122' : 'none'
                        }} />
                      )}
                      <span>{u.display_name}</span>
                      {u.isYou && <span style={{
                        color: '#f59e0b',
                        fontWeight: 700,
                        marginLeft: 4,
                        fontSize: '0.98rem',
                        background: '#fffbe6',
                        borderRadius: 6,
                        padding: '2px 6px'
                      }}>(Vous)</span>}
                    </td>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx < 3 ? '#10b981' : '#374151',
                      fontSize: idx < 3 ? '1.1rem' : '1rem'
                    }}>
                      {u.recipesCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Podium visuel */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 18,
            marginBottom: 6
          }}>
            {leaderboard[1] && (
              <div style={{
                background: '#e0e7ff',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥈</div>
                <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{leaderboard[1].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[1].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[0] && (
              <div style={{
                background: 'linear-gradient(135deg,#fef3c7 60%,#fffbe6 100%)',
                borderRadius: 14,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 80,
                boxShadow: '0 4px 16px #f59e0b22',
                transform: 'scale(1.12)'
              }}>
                <div style={{ fontSize: 28, color: '#f59e0b', animation: 'podiumCrown 1.2s infinite alternate' }}>🥇</div>
                <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1.1rem' }}>{leaderboard[0].display_name}</div>
                <div style={{ color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>{leaderboard[0].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[2] && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥉</div>
                <div style={{ fontWeight: 700, color: '#a3a3a3', fontSize: '1rem' }}>{leaderboard[2].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[2].recipesCount} recettes</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ color: '#6366f1', fontSize: '0.95rem', textAlign: 'center', marginTop: 8 }}>
        Ce classement est basé sur le nombre de recettes publiées par chaque utilisateur au cours des 30 derniers jours.
      </div>
      <style jsx>{`
        @keyframes podiumCrown {
          0% { transform: scale(1) rotate(-8deg);}
          100% { transform: scale(1.15) rotate(8deg);}
        }
      `}</style>
    </div>
  )

  // --- Solde CocoCoins bien intégré ---
  const renderCoinBalance = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 12,
      marginTop: 8,
      background: 'linear-gradient(90deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: 18,
      padding: '10px 24px',
      boxShadow: '0 2px 6px #f59e0b11',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#f59e0b',
      position: 'relative'
    }}>
      <span style={{ fontSize: 28, marginRight: 6, animation: coinAnim ? 'coinSpin 0.8s' : 'none' }}>🪙</span>
      <span style={{
        fontWeight: 900,
        fontSize: '1.3rem',
        color: '#f59e0b',
        letterSpacing: '-1px'
      }}>{coins}</span>
      <span style={{
        marginLeft: 4,
        fontWeight: 600,
        color: '#92400e',
        fontSize: '1.05rem'
      }}>CocoCoins</span>
      <span style={{
        marginLeft: 10,
        color: '#6b7280',
        fontSize: '0.95rem',
        fontWeight: 400
      }}>(solde actuel)</span>
    </div>
  )

  // --- Boutique avec onglets avancés ---
  const renderShopTab = () => {
    const dailyDeals = getDailyDeals();
    
    return (
      <div>
        {/* Onglets boutique */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'items', label: 'Objets', icon: '🛍️' },
            { id: 'packs', label: 'Packs', icon: '📦' },
            { id: 'deals', label: 'Promos', icon: '💥' },
            { id: 'cards', label: 'Cartes', icon: '🃏' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setShopTab(tab.id)}
              style={{
                background: shopTab === tab.id ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
                color: shopTab === tab.id ? 'white' : '#10b981',
                border: shopTab === tab.id ? 'none' : '1px solid #10b981',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: shopTab === tab.id ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              <span style={{ marginRight: 4 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {shopTab === 'items' && renderItemsShop()}
        {shopTab === 'packs' && renderPacksShop()}
        {shopTab === 'deals' && renderDealsShop(dailyDeals)}
        {shopTab === 'cards' && renderCardsShop()}
      </div>
    );
  };

  // --- Onglet objets individuels ---
  const renderItemsShop = () => {
    const filtered = shopFilter === 'all'
      ? SHOP_ITEMS.filter(item => !item.exclusive)
      : SHOP_ITEMS.filter(i => i.type === shopFilter && !i.exclusive);
    
    const ownedByType = type =>
      SHOP_ITEMS.filter(i => i.type === type && ownedItems.includes(i.id)).length;
    const totalByType = type =>
      SHOP_ITEMS.filter(i => i.type === type).length;

    return (
      <div>
        {/* Filtres par catégorie */}
        <div style={{
          display: 'flex', 
          gap: 6,
          justifyContent: 'flex-start', 
          marginBottom: 16,
          flexWrap: 'wrap',
          overflowX: 'auto',
          paddingBottom: 4
        }}>
          {ITEM_TYPES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopFilter(cat.id)}
              style={{
                background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                color: '#374151',
                border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '6px 10px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '1rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
              {cat.id !== 'all' && (
                <span style={{
                  marginLeft: 6,
                  fontSize: '0.8rem',
                  color: '#f59e0b',
                  fontWeight: 600
                }}>
                  {ownedByType(cat.id)}/{totalByType(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Wishlist */}
        {wishlist.length > 0 && (
          <div style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #fff5f5, #fef2f2)',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px'
          }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', marginBottom: 8 }}>
              ❤️ Ma Wishlist ({wishlist.length} objets)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHOP_ITEMS.filter(item => wishlist.includes(item.id)).slice(0, 5).map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fff',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <span>{item.icon}</span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                </div>
              ))}
              {wishlist.length > 5 && (
                <span style={{ color: '#6b7280', fontSize: '0.8rem', alignSelf: 'center' }}>
                  +{wishlist.length - 5} autres...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grille d'objets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 16
        }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff',
              border: ownedItems.includes(item.id)
                ? `2px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#10b981'}`
                : '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: item.onSale ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
            }}
              onClick={() => setItemPreviewOpen(item)}
              onMouseEnter={() => !ownedItems.includes(item.id) && setPreviewEquip(item)}
              onMouseLeave={() => setPreviewEquip(null)}
            >
              {/* Badges promotion */}
              {item.onSale && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  transform: 'rotate(-15deg)',
                  animation: 'saleGlow 2s ease-in-out infinite alternate'
                }}>
                  PROMO
                </div>
              )}

              {/* Badge niveau requis */}
              {item.unlockLevel && item.unlockLevel > 1 && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: levelInfo.current.level >= item.unlockLevel ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.6rem',
                  fontWeight: 700
                }}>
                  Niv.{item.unlockLevel}
                </div>
              )}

              {/* Badge rareté */}
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                fontSize: 12,
                color: item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#3b82f6'
              }}>
                {item.rarity === 'legendary' ? '★★★' : item.rarity === 'epic' ? '★★' : item.rarity === 'rare' ? '★' : ''}
              </div>

              {/* Icône principale */}
              <div style={{
                fontSize: 32,
                marginBottom: 8,
                filter: getItemGlow(item.id),
                opacity: levelInfo.current.level >= (item.unlockLevel || 1) ? 1 : 0.5
              }}>
                {levelInfo.current.level >= (item.unlockLevel || 1) ? item.icon : '🔒'}
              </div>

              {/* Nom et prix */}
              <div style={{ 
                fontWeight: 700, 
                fontSize: 13, 
                marginBottom: 4, 
                color: '#1f2937',
                lineHeight: 1.2
              }}>
                {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
              </div>

              {/* Prix avec promotion */}
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {item.onSale ? (
                  <div>
                    <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 4 }}>
                      {item.originalPrice}🪙
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      {item.price}🪙
                    </span>
                  </div>
                ) : (
                  <span style={{ color: '#6b7280' }}>{item.price}🪙</span>
                )}
              </div>

              {/* Bouton wishlist */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(item.id);
                }}
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  color: wishlist.includes(item.id) ? '#ef4444' : '#d1d5db',
                  cursor: 'pointer'
                }}
              >
                {wishlist.includes(item.id) ? '❤️' : '🤍'}
              </button>

              {/* Actions */}
              {ownedItems.includes(item.id) ? (
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  borderRadius: 6,
                  padding: '4px 0',
                  fontWeight: 700,
                  fontSize: 11
                }}>
                  ✅ Possédé
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    buyItem(item);
                  }}
                  disabled={coins < item.price || levelInfo.current.level < (item.unlockLevel || 1)}
                  style={{
                    background: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? '#f59e0b' : '#e5e7eb',
                    color: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {levelInfo.current.level < (item.unlockLevel || 1) ? '🔒 Verrouillé' : 'Acheter'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Onglet packs ---
  const renderPacksShop = () => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        color: '#0369a1',
        fontSize: '0.9rem'
      }}>
        🎁 Économisez en achetant des packs complets !
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 16
      }}>
        {SHOP_PACKS.map(pack => {
          const itemsOwned = pack.items.filter(itemId => ownedItems.includes(itemId)).length;
          const allOwned = itemsOwned === pack.items.length;
          
          return (
            <div key={pack.id} style={{
              background: '#fff',
              border: pack.rarity === 'legendary' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 16,
              position: 'relative',
              boxShadow: pack.rarity === 'legendary' ? '0 4px 20px rgba(245, 158, 11, 0.2)' : 'none'
            }}>
              {/* Badge réduction */}
              <div style={{
                position: 'absolute',
                top: -8,
                right: 12,
                background: '#ef4444',
                color: 'white',
                borderRadius: 12,
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                -{pack.discount}%
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>{pack.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>
                    {pack.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {pack.description}
                  </div>
                </div>
              </div>

              {/* Objets inclus */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Objets inclus ({itemsOwned}/{pack.items.length} possédés):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {pack.items.map(itemId => {
                    const item = SHOP_ITEMS.find(i => i.id === itemId);
                    if (!item) return null;
                    
                    return (
                      <div key={itemId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: ownedItems.includes(itemId) ? '#dcfce7' : '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: '0.7rem'
                      }}>
                        <span>{item.icon}</span>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prix et achat */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      textDecoration: 'line-through', 
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      {pack.originalPrice}🪙
                    </span>
                    <span style={{ 
                      color: '#ef4444', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {pack.price}🪙
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                    Économie: {pack.originalPrice - pack.price}🪙
                  </div>
                </div>

                <button
                  onClick={() => buyPack(pack)}
                  disabled={coins < pack.price || allOwned}
                  style={{
                    background: allOwned ? '#e5e7eb' : 
                               coins >= pack.price ? 'linear-gradient(135deg, #10b981, #34d399)' : '#f3f4f6',
                    color: allOwned ? '#9ca3af' : 
                           coins >= pack.price ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: allOwned || coins < pack.price ? 'not-allowed' : 'pointer'
                  }}
                >
                  {allOwned ? '✅ Complet' : 'Acheter le pack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- Collection de cartes ---
  const renderCardCollection = () => {
    const groupedCards = {};
    
    // Grouper les cartes par collection
    CARD_COLLECTIONS.forEach(collection => {
      groupedCards[collection.id] = {
        info: collection,
        cards: TRADING_CARDS.filter(c => c.collection === collection.id),
        owned: ownedCards.filter(c => c.collection === collection.id)
      };
    });

    return (
      <div>
        {/* Statistiques globales */}
        <div style={{
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {ownedCards.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes totales</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {[...new Set(ownedCards.map(c => c?.originalId || c?.id?.split('_')[0] || c?.id))].filter(id => id).length}/{TRADING_CARDS.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes uniques</div>
            </div>
          </div>
        </div>

        {/* Collections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {Object.entries(groupedCards).map(([collectionId, data]) => {
            const stats = cardCollection[collectionId] || { owned: 0, total: 0, percentage: 0 };
            
            return (
              <div key={collectionId} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
                cursor: 'pointer'
              }}
                onClick={() => setCardPreviewOpen(collectionId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ 
                    fontSize: 24,
                    background: data.info.color + '20',
                    borderRadius: 8,
                    padding: 6
                  }}>
                    {data.info.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1f2937' }}>
                      {data.info.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {data.info.description}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: data.info.color }}>
                      {stats.owned}/{stats.total}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      {stats.percentage}%
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  height: 6,
                  marginBottom: 8,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${stats.percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${data.info.color}, ${data.info.color}cc)`,
                    borderRadius: 8,
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {/* Aperçu des cartes récentes */}
                <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                  {data.owned.slice(-3).map((card, idx) => (
                    <div key={idx} style={{
                      fontSize: 16,
                      background: '#f8fafc',
                      borderRadius: 4,
                      padding: 4,
                      border: '1px solid #e5e7eb'
                    }}>
                      {card.icon}
                    </div>
                  ))}
                  {data.owned.length > 3 && (
                    <div style={{
                      fontSize: '0.7rem',
                      background: '#f3f4f6',
                      borderRadius: 4,
                      padding: '4px 6px',
                      color: '#6b7280',
                      alignSelf: 'center'
                    }}>
                      +{data.owned.length - 3} autres...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Marketplace d'échanges ---
  const renderCardMarketplace = () => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
        borderRadius: 12,
        padding: 12
      }}>
        <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>
          🤝 Marketplace d'Échanges
        </div>
        <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
          Échangez vos cartes avec d'autres joueurs !
        </div>
      </div>

      {/* Onglets marketplace */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        justifyContent: 'center'
      }}>
        {[
          { id: 'offers', label: 'Offres', icon: '📋' },
          { id: 'my_trades', label: 'Mes échanges', icon: '👤' },
          { id: 'create', label: 'Créer offre', icon: '➕' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMarketplaceOpen(tab.id)}
            style={{
              background: marketplaceOpen === tab.id 
                ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' 
                : '#fff',
              color: marketplaceOpen === tab.id ? 'white' : '#f59e0b',
              border: marketplaceOpen === tab.id ? 'none' : '1px solid #f59e0b',
              borderRadius: 8,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ marginRight: 4 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu selon l'onglet sélectionné */}
      {marketplaceOpen === 'offers' && renderTradeOffers()}
      {marketplaceOpen === 'my_trades' && renderMyTrades()}
      {marketplaceOpen === 'create' && renderCreateTrade()}
    </div>
  );

  // --- Offres d'échanges disponibles ---
  const renderTradeOffers = () => (
    <div>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
        Offres d'échanges disponibles
      </div>
      
      {tradeOffers.length === 0 ? (
        <div style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Aucune offre d'échange disponible pour le moment
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tradeOffers.map(offer => (
            <div key={offer.id} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {offer.traderName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Propose: {offer.offering.name} • Cherche: {offer.wanting.name}
                  </div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Échanger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Mes échanges ---
  const renderMyTrades = () => (
    <div>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
        Vos offres d'échanges actives
      </div>
      
      {myTradeOffers.length === 0 ? (
        <div style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Vous n'avez aucune offre d'échange active
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {myTradeOffers.map(offer => (
            <div key={offer.id} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Vous proposez: {offer.offering.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Vous cherchez: {offer.wanting.name}
                  </div>
                </div>
                <button style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Annuler
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Créer une offre d'échange ---
  const renderCreateTrade = () => (
    <div>
      <div style={{
        background: '#f0f9ff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 600, color: '#0284c7', marginBottom: 4 }}>
          Créer une offre d'échange
        </div>
        <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>
          Proposez une carte en échange d'une autre
        </div>
      </div>

      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center' }}>
        Fonctionnalité en cours de développement...
      </div>
    </div>
  );

  // --- Modal d'aperçu de carte ---
  const renderCardPreview = (cardId) => {
    const collection = CARD_COLLECTIONS.find(c => c.id === cardId);
    if (!collection) return null;

    const collectionCards = TRADING_CARDS.filter(c => c.collection === cardId);
    const ownedInCollection = ownedCards.filter(c => c.collection === cardId);

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
        onClick={() => setCardPreviewOpen(null)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 18, // Réduction
            width: '100%',
            maxWidth: 340, // Réduction
            padding: '20px', // Réduction
            boxShadow: '0 8px 30px #0002',
            position: 'relative',
            animation: 'dressingPop 0.3s',
            maxHeight: '80vh', // Limite la hauteur
            overflowY: 'auto' // Scroll si nécessaire
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setCardPreviewOpen(null)}
            style={{
              position: 'absolute',
              top: 10, right: 12,
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: '#f59e0b',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >✕</button>
          
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              fontSize: 48,
              marginBottom: 8,
              background: collection.color + '20',
              borderRadius: 16,
              padding: 16,
              display: 'inline-block'
            }}>
              {collection.icon}
            </div>
            
            <div style={{
              fontWeight: 700,
              fontSize: '1.3rem',
              color: '#1f2937',
              marginBottom: 4
            }}>
              {collection.name}
            </div>
            
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              marginBottom: 12
            }}>
              {collection.description}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              background: '#f8fafc',
              borderRadius: 8,
              padding: 8
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {ownedInCollection.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Possédées
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {[...new Set(ownedInCollection.map(c => c.id.split('_')[0]))].filter(id => id).length}/{collectionCards.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Uniques
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {Math.round(([...new Set(ownedInCollection.map(c => c.id.split('_')[0]))].length / collectionCards.length) * 100)}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Complété
                </div>
              </div>
            </div>
          </div>

          {/* Grille des cartes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8
          }}>
            {collectionCards.map(card => {
              if (!card || !card.id) return null;
              
              const isOwned = ownedInCollection.some(c => 
                c && (c.originalId === card.id || c.id?.startsWith(card.id) || c.uniqueId?.startsWith(card.id))
              );
              
              return (
                <div key={card.id} style={{
                  background: isOwned ? '#f0fdf4' : '#f9fafb',
                  border: isOwned ? '2px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 8,
                  textAlign: 'center',
                  opacity: isOwned ? 1 : 0.6
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>
                    {isOwned ? (card.icon || '🎴') : '❓'}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: isOwned ? '#16a34a' : '#6b7280'
                  }}>
                    {isOwned ? (card.name || 'Carte inconnue') : '???'}
                  </div>
                  <div style={{
                    fontSize: '0.6rem',
                    color: isOwned ? 
                      card.rarity === 'legendary' ? '#f59e0b' : 
                      card.rarity === 'epic' ? '#8b5cf6' : 
                      card.rarity === 'rare' ? '#3b82f6' : '#6b7280' 
                      : '#9ca3af'
                  }}>
                    {isOwned ? (card.rarity || 'commune') : 'Inconnue'}
                  </div>
                </div>
              );
            }).filter(item => item !== null)}
          </div>
        </div>
      </div>
    );
  };

  // --- Animation d'ouverture de pack ---
  const renderPackOpening = () => {
    if (!packOpeningAnimation) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: 30,
          textAlign: 'center',
          maxWidth: 350,
          width: '90%'
        }}>
          {!packOpeningAnimation.revealedCards ? (
            // Phase d'ouverture
            <div>
              <div style={{
                fontSize: 64,
                marginBottom: 16,
                animation: 'packSpin 1s linear infinite'
              }}>
                {packOpeningAnimation.icon}
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#1f2937',
                marginBottom: 8
              }}>
                Ouverture du {packOpeningAnimation.name}...
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: '#6b7280'
              }}>
                Génération des cartes aléatoires...
              </div>
            </div>
          ) : (
            // Phase de révélation
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#10b981',
                marginBottom: 16
              }}>
                🎉 Cartes obtenues !
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                marginBottom: 16
              }}>
                {packOpeningAnimation.revealedCards
                  .filter(card => card && card.name) // Filtrer les cartes invalides
                  .map((card, idx) => (
                  <div key={idx} style={{
                    background: card.rarity === 'legendary' ? '#fef3c7' :
                               card.rarity === 'epic' ? '#f3e8ff' :
                               card.rarity === 'rare' ? '#dbeafe' : '#f3f4f6',
                    border: `2px solid ${
                      card.rarity === 'legendary' ? '#f59e0b' :
                      card.rarity === 'epic' ? '#8b5cf6' :
                      card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }`,
                    borderRadius: 8,
                    padding: 8,
                    textAlign: 'center',
                    animation: `cardReveal 0.5s ease-out ${idx * 0.2}s both`
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>
                      {card.icon || '🎴'}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#1f2937'
                    }}>
                      {card.name || 'Carte mystérieuse'}
                    </div>
                    <div style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: card.rarity === 'legendary' ? '#f59e0b' :
                             card.rarity === 'epic' ? '#8b5cf6' :
                             card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }}>
                      {card.rarity || 'commune'}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setPackOpeningAnimation(null)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continuer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Initialiser les statistiques de collection au chargement
  useEffect(() => {
    if (ownedCards.length > 0) {
      updateCardCollectionStats(ownedCards);
    }
  }, [ownedCards]);

  // Vérification de sécurité des données de cartes
  useEffect(() => {
    // Vérifier que les données des cartes sont valides
    const invalidCards = TRADING_CARDS.filter(card => !card || !card.id || !card.name);
    if (invalidCards.length > 0) {
      console.warn('Cartes invalides détectées:', invalidCards);
    }
    
    // Nettoyer les cartes possédées invalides
    const validOwnedCards = ownedCards.filter(card => 
      card && (card.id || card.uniqueId) && card.name
    );
    
    if (validOwnedCards.length !== ownedCards.length) {
      console.log('Nettoyage des cartes invalides:', ownedCards.length - validOwnedCards.length, 'cartes supprimées');
      setOwnedCards(validOwnedCards);
      localStorage.setItem('coco_owned_cards', JSON.stringify(validOwnedCards));
    }
  }, []);

  // --- Onglet promotions quotidiennes ---
  const renderDealsShop = (dailyDeals) => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
        borderRadius: 12,
        padding: 12
      }}>
        <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>
          💥 Promotions du jour !
        </div>
        <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
          Offres limitées - Renouvellement quotidien
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 12
      }}>
        {dailyDeals.map(item => (
          <div key={item.id} style={{
            background: 'linear-gradient(135deg, #fff5f5, #fef2f2)',
            border: '2px solid #ef4444',
            borderRadius: 12,
            padding: 12,
            position: 'relative',
            animation: 'dealPulse 2s ease-in-out infinite alternate'
          }}>
            {/* Flash promo */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: 12,
              background: '#ef4444',
              color: 'white',
              borderRadius: 8,
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              ⚡ FLASH
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32, filter: getItemGlow(item.id) }}>
                {item.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 6 }}>
                  {item.description}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    textDecoration: 'line-through', 
                    color: '#9ca3af',
                    fontSize: '0.9rem'
                  }}>
                    {item.originalPrice}🪙
                  </span>
                  <span style={{ 
                    color: '#ef4444', 
                    fontWeight: 700,
                    fontSize: '1.2rem'
                  }}>
                    {item.price}🪙
                  </span>
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: 6,
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    -30%
                  </span>
                </div>
              </div>

              <button
                onClick={() => buyItem(item)}
                disabled={coins < item.price || ownedItems.includes(item.id)}
                style={{
                  background: ownedItems.includes(item.id) ? '#10b981' :
                             coins >= item.price ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
                  color: ownedItems.includes(item.id) ? 'white' :
                         coins >= item.price ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: ownedItems.includes(item.id) || coins < item.price ? 'not-allowed' : 'pointer',
                  boxShadow: coins >= item.price && !ownedItems.includes(item.id) ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                {ownedItems.includes(item.id) ? '✅ Possédé' : 'Acheter'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Quiz du jour: helpers ---
  const todayStr = new Date().toISOString().slice(0, 10)
  const quizDoneToday = quizState?.date === todayStr
  const quizReward = 40

  // Ouvre le quiz modal avec une question aléatoire
  const openQuizModal = () => {
    if (quizDoneToday) return
    const idx = Math.floor(Math.random() * DAILY_QUIZ_QUESTIONS.length)
    setQuizQuestion(DAILY_QUIZ_QUESTIONS[idx])
    setQuizAnswer(null)
    setQuizFeedback(null)
    setQuizModalOpen(true)
  }

  // Gère la soumission du quiz
  const handleQuizSubmit = async () => {
    if (quizAnswer === null || !quizQuestion) return
    setQuizLoading(true)
    const isCorrect = quizAnswer === quizQuestion.answer
    setQuizFeedback({
      type: isCorrect ? 'success' : 'error',
      msg: isCorrect ? 'Bonne réponse ! +'+quizReward+' CocoCoins' : 'Mauvaise réponse !'
    })
    // Stocke le résultat du jour dans le localStorage
    const newQuizState = {
      date: todayStr,
      success: isCorrect
    }
    setQuizState(newQuizState)
    localStorage.setItem('coco_daily_quiz', JSON.stringify(newQuizState))
    // Ajoute à l'historique quiz pour XP
    let quizHistory = []
    try {
      quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]')
    } catch {}
    quizHistory.push({ date: todayStr, success: isCorrect })
    localStorage.setItem('coco_quiz_history', JSON.stringify(quizHistory))
    if (isCorrect) {
      setCoins(prev => prev + quizReward)
      setShopFeedback({ type: 'success', msg: `+${quizReward} CocoCoins (quiz)` })
      setTimeout(() => setShopFeedback(null), 1200)
    }
    setTimeout(() => {
      setQuizModalOpen(false)
      setQuizFeedback(null)
      setQuizAnswer(null)
    }, 1800)
    setQuizLoading(false)
  }

  // --- Charger le vrai classement mensuel XP ---
  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  // Fonction pour charger le classement (extracted for reuse)
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true)
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        setLeaderboardLoading(false)
        return
      }

      // 2. Récupérer toutes les recettes depuis le DÉBUT DU MOIS ACTUEL
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', startOfMonth.toISOString())
      if (recipesError) {
        console.error("[Classement] Erreur recipes:", recipesError)
      }

      // 3. Compter les recettes par utilisateur depuis le début du mois
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })

      // 4. Mapper les profils avec le nombre de recettes publiées
      const leaderboardData = (profilesData || []).map(profile => {
        const count = recipesCountMap[profile.user_id] || 0
        return {
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: count,
          isYou: user?.id === profile.user_id
        }
      })

      leaderboardData.sort((a, b) => b.recipesCount - a.recipesCount)
      setLeaderboard(leaderboardData.slice(0, 10))
    } catch (e) {
      console.error("[Classement] Exception générale:", e)
      setLeaderboard([])
    }
    setLeaderboardLoading(false)
  }

  const renderLeaderboardTab = () => (
    <div>
      <div style={{
        fontWeight: 700,
        fontSize: '1.1rem',
        marginBottom: 18,
        color: '#6366f1',
        textAlign: 'center'
      }}>
        Classement mensuel des utilisateurs (recettes publiées depuis le début du mois)
      </div>
      {leaderboardLoading ? (
        <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
          Chargement du classement...
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg,#e0e7ff 0%,#f3f4f6 100%)',
          borderRadius: 18,
          boxShadow: '0 4px 24px #6366f122',
          padding: '18px 10px 10px 10px',
          marginBottom: 24,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '1rem'
          }}>
            <thead>
              <tr style={{ color: '#6366f1', fontWeight: 700 }}>
                <th style={{ padding: 8, textAlign: 'center' }}>#</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Recettes (30j)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 20).map((u, idx) => {
                // Décoration rang
                let rankBg = 'transparent', rankColor = '#374151', rankIcon = '';
                if (idx === 0) { rankBg = '#fef3c7'; rankColor = '#f59e0b'; rankIcon = '🥇'; }
                else if (idx === 1) { rankBg = '#e0e7ff'; rankColor = '#6366f1'; rankIcon = '🥈'; }
                else if (idx === 2) { rankBg = '#f3f4f6'; rankColor = '#a3a3a3'; rankIcon = '🥉'; }
                return (
                  <tr key={u.user_id} style={{
                    background: u.isYou ? '#f3f4f6' : rankBg,
                    fontWeight: u.isYou ? 700 : (idx < 3 ? 700 : 500),
                    color: u.isYou ? '#f59e0b' : rankColor,
                    boxShadow: u.isYou ? '0 2px 8px #f59e0b22' : (idx < 3 ? '0 2px 8px #6366f122' : 'none'),
                    borderRadius: 12,
                    transition: 'background 0.2s'
                  }}>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: idx < 3 ? 22 : 16,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : idx === 2 ? '#a3a3a3' : '#374151'
                    }}>
                      {rankIcon ? <span style={{ marginRight: 4 }}>{rankIcon}</span> : null}
                      {idx + 1}
                    </td>
                    <td style={{
                      padding: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: u.isYou ? '1.05rem' : '1rem'
                    }}>
                      {u.avatar_url && (
                        <img src={u.avatar_url} alt="" style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: idx < 3 ? `2px solid ${idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3'}` : '1px solid #e5e7eb',
                          boxShadow: idx < 3 ? '0 2px 8px #6366f122' : 'none'
                        }} />
                      )}
                      <span>{u.display_name}</span>
                      {u.isYou && <span style={{
                        color: '#f59e0b',
                        fontWeight: 700,
                        marginLeft: 4,
                        fontSize: '0.98rem',
                        background: '#fffbe6',
                        borderRadius: 6,
                        padding: '2px 6px'
                      }}>(Vous)</span>}
                    </td>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx < 3 ? '#10b981' : '#374151',
                      fontSize: idx < 3 ? '1.1rem' : '1rem'
                    }}>
                      {u.recipesCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Podium visuel */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 18,
            marginBottom: 6
          }}>
            {leaderboard[1] && (
              <div style={{
                background: '#e0e7ff',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥈</div>
                <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{leaderboard[1].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[1].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[0] && (
              <div style={{
                background: 'linear-gradient(135deg,#fef3c7 60%,#fffbe6 100%)',
                borderRadius: 14,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 80,
                boxShadow: '0 4px 16px #f59e0b22',
                transform: 'scale(1.12)'
              }}>
                <div style={{ fontSize: 28, color: '#f59e0b', animation: 'podiumCrown 1.2s infinite alternate' }}>🥇</div>
                <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1.1rem' }}>{leaderboard[0].display_name}</div>
                <div style={{ color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>{leaderboard[0].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[2] && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥉</div>
                <div style={{ fontWeight: 700, color: '#a3a3a3', fontSize: '1rem' }}>{leaderboard[2].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[2].recipesCount} recettes</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ color: '#6366f1', fontSize: '0.95rem', textAlign: 'center', marginTop: 8 }}>
        Ce classement est basé sur le nombre de recettes publiées par chaque utilisateur au cours des 30 derniers jours.
      </div>
      <style jsx>{`
        @keyframes podiumCrown {
          0% { transform: scale(1) rotate(-8deg);}
          100% { transform: scale(1.15) rotate(8deg);}
        }
      `}</style>
    </div>
  )

  // --- Solde CocoCoins bien intégré ---
  const renderCoinBalance = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 12,
      marginTop: 8,
      background: 'linear-gradient(90deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: 18,
      padding: '10px 24px',
      boxShadow: '0 2px 6px #f59e0b11',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#f59e0b',
      position: 'relative'
    }}>
      <span style={{ fontSize: 28, marginRight: 6, animation: coinAnim ? 'coinSpin 0.8s' : 'none' }}>🪙</span>
      <span style={{
        fontWeight: 900,
        fontSize: '1.3rem',
        color: '#f59e0b',
        letterSpacing: '-1px'
      }}>{coins}</span>
      <span style={{
        marginLeft: 4,
        fontWeight: 600,
        color: '#92400e',
        fontSize: '1.05rem'
      }}>CocoCoins</span>
      <span style={{
        marginLeft: 10,
        color: '#6b7280',
        fontSize: '0.95rem',
        fontWeight: 400
      }}>(solde actuel)</span>
    </div>
  )

  // --- Boutique avec onglets avancés ---
  const renderShopTab = () => {
    const dailyDeals = getDailyDeals();
    
    return (
      <div>
        {/* Onglets boutique */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'items', label: 'Objets', icon: '🛍️' },
            { id: 'packs', label: 'Packs', icon: '📦' },
            { id: 'deals', label: 'Promos', icon: '💥' },
            { id: 'cards', label: 'Cartes', icon: '🃏' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setShopTab(tab.id)}
              style={{
                background: shopTab === tab.id ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
                color: shopTab === tab.id ? 'white' : '#10b981',
                border: shopTab === tab.id ? 'none' : '1px solid #10b981',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: shopTab === tab.id ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              <span style={{ marginRight: 4 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Ajout d'un onglet pour les défis quotidiens */}
          <button
            onClick={() => setShopTab('deals')}
            style={{
              background: shopTab === 'deals' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#fff',
              color: shopTab === 'deals' ? 'white' : '#ef4444',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ marginRight: 4 }}>💥</span>
            Promos
            {shopTab === 'deals' && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '120%',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                filter: 'blur(12px)',
                zIndex: 0
              }} />
            )}
          </button>
        </div>

        {shopTab === 'items' && renderItemsShop()}
        {shopTab === 'packs' && renderPacksShop()}
        {shopTab === 'deals' && renderDealsShop(dailyDeals)}
        {shopTab === 'cards' && renderCardsShop()}
      </div>
    );
  };

  // --- Onglet objets individuels ---
  const renderItemsShop = () => {
    const filtered = shopFilter === 'all'
      ? SHOP_ITEMS.filter(item => !item.exclusive)
      : SHOP_ITEMS.filter(i => i.type === shopFilter && !i.exclusive);
    
    const ownedByType = type =>
      SHOP_ITEMS.filter(i => i.type === type && ownedItems.includes(i.id)).length;
    const totalByType = type =>
      SHOP_ITEMS.filter(i => i.type === type).length;

    return (
      <div>
        {/* Filtres par catégorie */}
        <div style={{
          display: 'flex', 
          gap: 6,
          justifyContent: 'flex-start', 
          marginBottom: 16,
          flexWrap: 'wrap',
          overflowX: 'auto',
          paddingBottom: 4
        }}>
          {ITEM_TYPES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopFilter(cat.id)}
              style={{
                background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                color: '#374151',
                border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '6px 10px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '1rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
              {cat.id !== 'all' && (
                <span style={{
                  marginLeft: 6,
                  fontSize: '0.8rem',
                  color: '#f59e0b',
                  fontWeight: 600
                }}>
                  {ownedByType(cat.id)}/{totalByType(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Wishlist */}
        {wishlist.length > 0 && (
          <div style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #fff5f5, #fef2f2)',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px'
          }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', marginBottom: 8 }}>
              ❤️ Ma Wishlist ({wishlist.length} objets)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHOP_ITEMS.filter(item => wishlist.includes(item.id)).slice(0, 5).map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fff',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <span>{item.icon}</span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                </div>
              ))}
              {wishlist.length > 5 && (
                <span style={{ color: '#6b7280', fontSize: '0.8rem', alignSelf: 'center' }}>
                  +{wishlist.length - 5} autres...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grille d'objets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 16
        }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff',
              border: ownedItems.includes(item.id)
                ? `2px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#10b981'}`
                : '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: item.onSale ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
            }}
              onClick={() => setItemPreviewOpen(item)}
              onMouseEnter={() => !ownedItems.includes(item.id) && setPreviewEquip(item)}
              onMouseLeave={() => setPreviewEquip(null)}
            >
              {/* Badges promotion */}
              {item.onSale && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  transform: 'rotate(-15deg)',
                  animation: 'saleGlow 2s ease-in-out infinite alternate'
                }}>
                  PROMO
                </div>
              )}

              {/* Badge niveau requis */}
              {item.unlockLevel && item.unlockLevel > 1 && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: levelInfo.current.level >= item.unlockLevel ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.6rem',
                  fontWeight: 700
                }}>
                  Niv.{item.unlockLevel}
                </div>
              )}

              {/* Badge rareté */}
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                fontSize: 12,
                color: item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#3b82f6'
              }}>
                {item.rarity === 'legendary' ? '★★★' : item.rarity === 'epic' ? '★★' : item.rarity === 'rare' ? '★' : ''}
              </div>

              {/* Icône principale */}
              <div style={{
                fontSize: 32,
                marginBottom: 8,
                filter: getItemGlow(item.id),
                opacity: levelInfo.current.level >= (item.unlockLevel || 1) ? 1 : 0.5
              }}>
                {levelInfo.current.level >= (item.unlockLevel || 1) ? item.icon : '🔒'}
              </div>

              {/* Nom et prix */}
              <div style={{ 
                fontWeight: 700, 
                fontSize: 13, 
                marginBottom: 4, 
                color: '#1f2937',
                lineHeight: 1.2
              }}>
                {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
              </div>

              {/* Prix avec promotion */}
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {item.onSale ? (
                  <div>
                    <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 4 }}>
                      {item.originalPrice}🪙
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      {item.price}🪙
                    </span>
                  </div>
                ) : (
                  <span style={{ color: '#6b7280' }}>{item.price}🪙</span>
                )}
              </div>

              {/* Bouton wishlist */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(item.id);
                }}
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  color: wishlist.includes(item.id) ? '#ef4444' : '#d1d5db',
                  cursor: 'pointer'
                }}
              >
                {wishlist.includes(item.id) ? '❤️' : '🤍'}
              </button>

              {/* Actions */}
              {ownedItems.includes(item.id) ? (
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  borderRadius: 6,
                  padding: '4px 0',
                  fontWeight: 700,
                  fontSize: 11
                }}>
                  ✅ Possédé
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    buyItem(item);
                  }}
                  disabled={coins < item.price || levelInfo.current.level < (item.unlockLevel || 1)}
                  style={{
                    background: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? '#f59e0b' : '#e5e7eb',
                    color: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {levelInfo.current.level < (item.unlockLevel || 1) ? '🔒 Verrouillé' : 'Acheter'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Onglet packs ---
  const renderPacksShop = () => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        color: '#0369a1',
        fontSize: '0.9rem'
      }}>
        🎁 Économisez en achetant des packs complets !
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 16
      }}>
        {SHOP_PACKS.map(pack => {
          const itemsOwned = pack.items.filter(itemId => ownedItems.includes(itemId)).length;
          const allOwned = itemsOwned === pack.items.length;
          
          return (
            <div key={pack.id} style={{
              background: '#fff',
              border: pack.rarity === 'legendary' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 16,
              position: 'relative',
              boxShadow: pack.rarity === 'legendary' ? '0 4px 20px rgba(245, 158, 11, 0.2)' : 'none'
            }}>
              {/* Badge réduction */}
              <div style={{
                position: 'absolute',
                top: -8,
                right: 12,
                background: '#ef4444',
                color: 'white',
                borderRadius: 12,
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                -{pack.discount}%
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>{pack.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>
                    {pack.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {pack.description}
                  </div>
                </div>
              </div>

              {/* Objets inclus */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Objets inclus ({itemsOwned}/{pack.items.length} possédés):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {pack.items.map(itemId => {
                    const item = SHOP_ITEMS.find(i => i.id === itemId);
                    if (!item) return null;
                    
                    return (
                      <div key={itemId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: ownedItems.includes(itemId) ? '#dcfce7' : '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: '0.7rem'
                      }}>
                        <span>{item.icon}</span>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prix et achat */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      textDecoration: 'line-through', 
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      {pack.originalPrice}🪙
                    </span>
                    <span style={{ 
                      color: '#ef4444', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {pack.price}🪙
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                    Économie: {pack.originalPrice - pack.price}🪙
                  </div>
                </div>

                <button
                  onClick={() => buyPack(pack)}
                  disabled={coins < pack.price || allOwned}
                  style={{
                    background: allOwned ? '#e5e7eb' : 
                               coins >= pack.price ? 'linear-gradient(135deg, #10b981, #34d399)' : '#f3f4f6',
                    color: allOwned ? '#9ca3af' : 
                           coins >= pack.price ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: allOwned || coins < pack.price ? 'not-allowed' : 'pointer'
                  }}
                >
                  {allOwned ? '✅ Complet' : 'Acheter le pack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- Collection de cartes ---
  const renderCardCollection = () => {
    const groupedCards = {};
    
    // Grouper les cartes par collection
    CARD_COLLECTIONS.forEach(collection => {
      groupedCards[collection.id] = {
        info: collection,
        cards: TRADING_CARDS.filter(c => c.collection === collection.id),
        owned: ownedCards.filter(c => c.collection === collection.id)
      };
    });

    return (
      <div>
        {/* Statistiques globales */}
        <div style={{
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {ownedCards.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes totales</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {[...new Set(ownedCards.map(c => c?.originalId || c?.id?.split('_')[0] || c?.id))].filter(id => id).length}/{TRADING_CARDS.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes uniques</div>
            </div>
          </div>
        </div>

        {/* Collections */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {Object.entries(groupedCards).map(([collectionId, data]) => {
            const stats = cardCollection[collectionId] || { owned: 0, total: 0, percentage: 0 };
            
            return (
              <div key={collectionId} style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
                cursor: 'pointer'
              }}
                onClick={() => setCardPreviewOpen(collectionId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ 
                    fontSize: 24,
                    background: data.info.color + '20',
                    borderRadius: 8,
                    padding: 6
                  }}>
                    {data.info.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#1f2937' }}>
                      {data.info.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {data.info.description}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: data.info.color }}>
                      {stats.owned}/{stats.total}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      {stats.percentage}%
                    </div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  height: 6,
                  marginBottom: 8,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${stats.percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${data.info.color}, ${data.info.color}cc)`,
                    borderRadius: 8,
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {/* Aperçu des cartes récentes */}
                <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                  {data.owned.slice(-3).map((card, idx) => (
                    <div key={idx} style={{
                      fontSize: 16,
                      background: '#f8fafc',
                      borderRadius: 4,
                      padding: 4,
                      border: '1px solid #e5e7eb'
                    }}>
                      {card.icon}
                    </div>
                  ))}
                  {data.owned.length > 3 && (
                    <div style={{
                      fontSize: '0.7rem',
                      background: '#f3f4f6',
                      borderRadius: 4,
                      padding: '4px 6px',
                      color: '#6b7280',
                      alignSelf: 'center'
                    }}>
                      +{data.owned.length - 3} autres...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Marketplace d'échanges ---
  const renderCardMarketplace = () => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
        borderRadius: 12,
        padding: 12
      }}>
        <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>
          🤝 Marketplace d'Échanges
        </div>
        <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
          Échangez vos cartes avec d'autres joueurs !
        </div>
      </div>

      {/* Onglets marketplace */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 16,
        justifyContent: 'center'
      }}>
        {[
          { id: 'offers', label: 'Offres', icon: '📋' },
          { id: 'my_trades', label: 'Mes échanges', icon: '👤' },
          { id: 'create', label: 'Créer offre', icon: '➕' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMarketplaceOpen(tab.id)}
            style={{
              background: marketplaceOpen === tab.id 
                ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' 
                : '#fff',
              color: marketplaceOpen === tab.id ? 'white' : '#f59e0b',
              border: marketplaceOpen === tab.id ? 'none' : '1px solid #f59e0b',
              borderRadius: 8,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ marginRight: 4 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu selon l'onglet sélectionné */}
      {marketplaceOpen === 'offers' && renderTradeOffers()}
      {marketplaceOpen === 'my_trades' && renderMyTrades()}
      {marketplaceOpen === 'create' && renderCreateTrade()}
    </div>
  );

  // --- Offres d'échanges disponibles ---
  const renderTradeOffers = () => (
    <div>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
        Offres d'échanges disponibles
      </div>
      
      {tradeOffers.length === 0 ? (
        <div style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Aucune offre d'échange disponible pour le moment
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tradeOffers.map(offer => (
            <div key={offer.id} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {offer.traderName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Propose: {offer.offering.name} • Cherche: {offer.wanting.name}
                  </div>
                </div>
                <button style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Échanger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Mes échanges ---
  const renderMyTrades = () => (
    <div>
      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', marginBottom: 12 }}>
        Vos offres d'échanges actives
      </div>
      
      {myTradeOffers.length === 0 ? (
        <div style={{
          background: '#f9fafb',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Vous n'avez aucune offre d'échange active
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {myTradeOffers.map(offer => (
            <div key={offer.id} style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Vous proposez: {offer.offering.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Vous cherchez: {offer.wanting.name}
                  </div>
                </div>
                <button style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Annuler
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Créer une offre d'échange ---
  const renderCreateTrade = () => (
    <div>
      <div style={{
        background: '#f0f9ff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        textAlign: 'center'
      }}>
        <div style={{ fontWeight: 600, color: '#0284c7', marginBottom: 4 }}>
          Créer une offre d'échange
        </div>
        <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>
          Proposez une carte en échange d'une autre
        </div>
      </div>

      <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center' }}>
        Fonctionnalité en cours de développement...
      </div>
    </div>
  );

  // --- Modal d'aperçu de carte ---
  const renderCardPreview = (cardId) => {
    const collection = CARD_COLLECTIONS.find(c => c.id === cardId);
    if (!collection) return null;

    const collectionCards = TRADING_CARDS.filter(c => c.collection === cardId);
    const ownedInCollection = ownedCards.filter(c => c.collection === cardId);

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
        onClick={() => setCardPreviewOpen(null)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 18, // Réduction
            width: '100%',
            maxWidth: 340, // Réduction
            padding: '20px', // Réduction
            boxShadow: '0 8px 30px #0002',
            position: 'relative',
            animation: 'dressingPop 0.3s',
            maxHeight: '80vh', // Limite la hauteur
            overflowY: 'auto' // Scroll si nécessaire
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setCardPreviewOpen(null)}
            style={{
              position: 'absolute',
              top: 10, right: 12,
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: '#f59e0b',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >✕</button>
          
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              fontSize: 48,
              marginBottom: 8,
              background: collection.color + '20',
              borderRadius: 16,
              padding: 16,
              display: 'inline-block'
            }}>
              {collection.icon}
            </div>
            
            <div style={{
              fontWeight: 700,
              fontSize: '1.3rem',
              color: '#1f2937',
              marginBottom: 4
            }}>
              {collection.name}
            </div>
            
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              marginBottom: 12
            }}>
              {collection.description}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              background: '#f8fafc',
              borderRadius: 8,
              padding: 8
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {ownedInCollection.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Possédées
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {[...new Set(ownedInCollection.map(c => c.id.split('_')[0]))].filter(id => id).length}/{collectionCards.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Uniques
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: collection.color }}>
                  {Math.round(([...new Set(ownedInCollection.map(c => c.id.split('_')[0]))].length / collectionCards.length) * 100)}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                  Complété
                </div>
              </div>
            </div>
          </div>

          {/* Grille des cartes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8
          }}>
            {collectionCards.map(card => {
              if (!card || !card.id) return null;
              
              const isOwned = ownedInCollection.some(c => 
                c && (c.originalId === card.id || c.id?.startsWith(card.id) || c.uniqueId?.startsWith(card.id))
              );
              
              return (
                <div key={card.id} style={{
                  background: isOwned ? '#f0fdf4' : '#f9fafb',
                  border: isOwned ? '2px solid #10b981' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 8,
                  textAlign: 'center',
                  opacity: isOwned ? 1 : 0.6
                }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>
                    {isOwned ? (card.icon || '🎴') : '❓'}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: isOwned ? '#16a34a' : '#6b7280'
                  }}>
                    {isOwned ? (card.name || 'Carte inconnue') : '???'}
                  </div>
                  <div style={{
                    fontSize: '0.6rem',
                    color: isOwned ? 
                      card.rarity === 'legendary' ? '#f59e0b' : 
                      card.rarity === 'epic' ? '#8b5cf6' : 
                      card.rarity === 'rare' ? '#3b82f6' : '#6b7280' 
                      : '#9ca3af'
                  }}>
                    {isOwned ? (card.rarity || 'commune') : 'Inconnue'}
                  </div>
                </div>
              );
            }).filter(item => item !== null)}
          </div>
        </div>
      </div>
    );
  };

  // --- Animation d'ouverture de pack ---
  const renderPackOpening = () => {
    if (!packOpeningAnimation) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: 30,
          textAlign: 'center',
          maxWidth: 350,
          width: '90%'
        }}>
          {!packOpeningAnimation.revealedCards ? (
            // Phase d'ouverture
            <div>
              <div style={{
                fontSize: 64,
                marginBottom: 16,
                animation: 'packSpin 1s linear infinite'
              }}>
                {packOpeningAnimation.icon}
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#1f2937',
                marginBottom: 8
              }}>
                Ouverture du {packOpeningAnimation.name}...
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: '#6b7280'
              }}>
                Génération des cartes aléatoires...
              </div>
            </div>
          ) : (
            // Phase de révélation
            <div>
              <div style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                color: '#10b981',
                marginBottom: 16
              }}>
                🎉 Cartes obtenues !
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
                marginBottom: 16
              }}>
                {packOpeningAnimation.revealedCards
                  .filter(card => card && card.name) // Filtrer les cartes invalides
                  .map((card, idx) => (
                  <div key={idx} style={{
                    background: card.rarity === 'legendary' ? '#fef3c7' :
                               card.rarity === 'epic' ? '#f3e8ff' :
                               card.rarity === 'rare' ? '#dbeafe' : '#f3f4f6',
                    border: `2px solid ${
                      card.rarity === 'legendary' ? '#f59e0b' :
                      card.rarity === 'epic' ? '#8b5cf6' :
                      card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }`,
                    borderRadius: 8,
                    padding: 8,
                    textAlign: 'center',
                    animation: `cardReveal 0.5s ease-out ${idx * 0.2}s both`
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>
                      {card.icon || '🎴'}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#1f2937'
                    }}>
                      {card.name || 'Carte mystérieuse'}
                    </div>
                    <div style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      color: card.rarity === 'legendary' ? '#f59e0b' :
                             card.rarity === 'epic' ? '#8b5cf6' :
                             card.rarity === 'rare' ? '#3b82f6' : '#9ca3af'
                    }}>
                      {card.rarity || 'commune'}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setPackOpeningAnimation(null)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Continuer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Initialiser les statistiques de collection au chargement
  useEffect(() => {
    if (ownedCards.length > 0) {
      updateCardCollectionStats(ownedCards);
    }
  }, [ownedCards]);

  // Vérification de sécurité des données de cartes
  useEffect(() => {
    // Vérifier que les données des cartes sont valides
    const invalidCards = TRADING_CARDS.filter(card => !card || !card.id || !card.name);
    if (invalidCards.length > 0) {
      console.warn('Cartes invalides détectées:', invalidCards);
    }
    
    // Nettoyer les cartes possédées invalides
    const validOwnedCards = ownedCards.filter(card => 
      card && (card.id || card.uniqueId) && card.name
    );
    
    if (validOwnedCards.length !== ownedCards.length) {
      console.log('Nettoyage des cartes invalides:', ownedCards.length - validOwnedCards.length, 'cartes supprimées');
      setOwnedCards(validOwnedCards);
      localStorage.setItem('coco_owned_cards', JSON.stringify(validOwnedCards));
    }
  }, []);

  // --- Onglet promotions quotidiennes ---
  const renderDealsShop = (dailyDeals) => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        background: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
        borderRadius: 12,
        padding: 12
      }}>
        <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>
          💥 Promotions du jour !
        </div>
        <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
          Offres limitées - Renouvellement quotidien
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 12
      }}>
        {dailyDeals.map(item => (
          <div key={item.id} style={{
            background: 'linear-gradient(135deg, #fff5f5, #fef2f2)',
            border: '2px solid #ef4444',
            borderRadius: 12,
            padding: 12,
            position: 'relative',
            animation: 'dealPulse 2s ease-in-out infinite alternate'
          }}>
            {/* Flash promo */}
            <div style={{
              position: 'absolute',
              top: -6,
              left: 12,
              background: '#ef4444',
              color: 'white',
              borderRadius: 8,
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700
            }}>
              ⚡ FLASH
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32, filter: getItemGlow(item.id) }}>
                {item.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 6 }}>
                  {item.description}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ 
                    textDecoration: 'line-through', 
                    color: '#9ca3af',
                    fontSize: '0.9rem'
                  }}>
                    {item.originalPrice}🪙
                  </span>
                  <span style={{ 
                    color: '#ef4444', 
                    fontWeight: 700,
                    fontSize: '1.2rem'
                  }}>
                    {item.price}🪙
                  </span>
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: 6,
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}>
                    -30%
                  </span>
                </div>
              </div>

              <button
                onClick={() => buyItem(item)}
                disabled={coins < item.price || ownedItems.includes(item.id)}
                style={{
                  background: ownedItems.includes(item.id) ? '#10b981' :
                             coins >= item.price ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
                  color: ownedItems.includes(item.id) ? 'white' :
                         coins >= item.price ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: ownedItems.includes(item.id) || coins < item.price ? 'not-allowed' : 'pointer',
                  boxShadow: coins >= item.price && !ownedItems.includes(item.id) ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                {ownedItems.includes(item.id) ? '✅ Possédé' : 'Acheter'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Quiz du jour: helpers ---
  const todayStr = new Date().toISOString().slice(0, 10)
  const quizDoneToday = quizState?.date === todayStr
  const quizReward = 40

  // Ouvre le quiz modal avec une question aléatoire
  const openQuizModal = () => {
    if (quizDoneToday) return
    const idx = Math.floor(Math.random() * DAILY_QUIZ_QUESTIONS.length)
    setQuizQuestion(DAILY_QUIZ_QUESTIONS[idx])
    setQuizAnswer(null)
    setQuizFeedback(null)
    setQuizModalOpen(true)
  }

  // Gère la soumission du quiz
  const handleQuizSubmit = async () => {
    if (quizAnswer === null || !quizQuestion) return
    setQuizLoading(true)
    const isCorrect = quizAnswer === quizQuestion.answer
    setQuizFeedback({
      type: isCorrect ? 'success' : 'error',
      msg: isCorrect ? 'Bonne réponse ! +'+quizReward+' CocoCoins' : 'Mauvaise réponse !'
    })
    // Stocke le résultat du jour dans le localStorage
    const newQuizState = {
      date: todayStr,
      success: isCorrect
    }
    setQuizState(newQuizState)
    localStorage.setItem('coco_daily_quiz', JSON.stringify(newQuizState))
    // Ajoute à l'historique quiz pour XP
    let quizHistory = []
    try {
      quizHistory = JSON.parse(localStorage.getItem('coco_quiz_history') || '[]')
    } catch {}
    quizHistory.push({ date: todayStr, success: isCorrect })
    localStorage.setItem('coco_quiz_history', JSON.stringify(quizHistory))
    if (isCorrect) {
      setCoins(prev => prev + quizReward)
      setShopFeedback({ type: 'success', msg: `+${quizReward} CocoCoins (quiz)` })
      setTimeout(() => setShopFeedback(null), 1200)
    }
    setTimeout(() => {
      setQuizModalOpen(false)
      setQuizFeedback(null)
      setQuizAnswer(null)
    }, 1800)
    setQuizLoading(false)
  }

  // --- Charger le vrai classement mensuel XP ---
  useEffect(() => {
    fetchLeaderboard()
  }, [user])

  // Fonction pour charger le classement (extracted for reuse)
  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true)
    try {
      // 1. Récupérer tous les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id,display_name,avatar_url')
      if (profilesError) {
        console.error("[Classement] Erreur profiles:", profilesError)
        setLeaderboard([])
        setLeaderboardLoading(false)
        return
      }

      // 2. Récupérer toutes les recettes depuis le DÉBUT DU MOIS ACTUEL
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('user_id,created_at')
        .gte('created_at', startOfMonth.toISOString())
      if (recipesError) {
        console.error("[Classement] Erreur recipes:", recipesError)
      }

      // 3. Compter les recettes par utilisateur depuis le début du mois
      const recipesCountMap = {}
      ;(recipesData || []).forEach(r => {
        recipesCountMap[r.user_id] = (recipesCountMap[r.user_id] || 0) + 1
      })

      // 4. Mapper les profils avec le nombre de recettes publiées
      const leaderboardData = (profilesData || []).map(profile => {
        const count = recipesCountMap[profile.user_id] || 0
        return {
          user_id: profile.user_id,
          display_name: profile.display_name || 'Utilisateur',
          avatar_url: profile.avatar_url || null,
          recipesCount: count,
          isYou: user?.id === profile.user_id
        }
      })

      leaderboardData.sort((a, b) => b.recipesCount - a.recipesCount)
      setLeaderboard(leaderboardData.slice(0, 10))
    } catch (e) {
      console.error("[Classement] Exception générale:", e)
      setLeaderboard([])
    }
    setLeaderboardLoading(false)
  }

  const renderLeaderboardTab = () => (
    <div>
      <div style={{
        fontWeight: 700,
        fontSize: '1.1rem',
        marginBottom: 18,
        color: '#6366f1',
        textAlign: 'center'
      }}>
        Classement mensuel des utilisateurs (recettes publiées depuis le début du mois)
      </div>
      {leaderboardLoading ? (
        <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 600 }}>
          Chargement du classement...
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg,#e0e7ff 0%,#f3f4f6 100%)',
          borderRadius: 18,
          boxShadow: '0 4px 24px #6366f122',
          padding: '18px 10px 10px 10px',
          marginBottom: 24,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: '1rem'
          }}>
            <thead>
              <tr style={{ color: '#6366f1', fontWeight: 700 }}>
                <th style={{ padding: 8, textAlign: 'center' }}>#</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Utilisateur</th>
                <th style={{ padding: 8, textAlign: 'center' }}>Recettes (30j)</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.slice(0, 20).map((u, idx) => {
                // Décoration rang
                let rankBg = 'transparent', rankColor = '#374151', rankIcon = '';
                if (idx === 0) { rankBg = '#fef3c7'; rankColor = '#f59e0b'; rankIcon = '🥇'; }
                else if (idx === 1) { rankBg = '#e0e7ff'; rankColor = '#6366f1'; rankIcon = '🥈'; }
                else if (idx === 2) { rankBg = '#f3f4f6'; rankColor = '#a3a3a3'; rankIcon = '🥉'; }
                return (
                  <tr key={u.user_id} style={{
                    background: u.isYou ? '#f3f4f6' : rankBg,
                    fontWeight: u.isYou ? 700 : (idx < 3 ? 700 : 500),
                    color: u.isYou ? '#f59e0b' : rankColor,
                    boxShadow: u.isYou ? '0 2px 8px #f59e0b22' : (idx < 3 ? '0 2px 8px #6366f122' : 'none'),
                    borderRadius: 12,
                    transition: 'background 0.2s'
                  }}>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontSize: idx < 3 ? 22 : 16,
                      fontWeight: 900,
                      color: idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : idx === 2 ? '#a3a3a3' : '#374151'
                    }}>
                      {rankIcon ? <span style={{ marginRight: 4 }}>{rankIcon}</span> : null}
                      {idx + 1}
                    </td>
                    <td style={{
                      padding: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: u.isYou ? '1.05rem' : '1rem'
                    }}>
                      {u.avatar_url && (
                        <img src={u.avatar_url} alt="" style={{
                          width: 28, height: 28, borderRadius: '50%',
                          border: idx < 3 ? `2px solid ${idx === 0 ? '#f59e0b' : idx === 1 ? '#6366f1' : '#a3a3a3'}` : '1px solid #e5e7eb',
                          boxShadow: idx < 3 ? '0 2px 8px #6366f122' : 'none'
                        }} />
                      )}
                      <span>{u.display_name}</span>
                      {u.isYou && <span style={{
                        color: '#f59e0b',
                        fontWeight: 700,
                        marginLeft: 4,
                        fontSize: '0.98rem',
                        background: '#fffbe6',
                        borderRadius: 6,
                        padding: '2px 6px'
                      }}>(Vous)</span>}
                    </td>
                    <td style={{
                      padding: 8,
                      textAlign: 'center',
                      fontWeight: 700,
                      color: idx < 3 ? '#10b981' : '#374151',
                      fontSize: idx < 3 ? '1.1rem' : '1rem'
                    }}>
                      {u.recipesCount}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Podium visuel */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 18,
            marginTop: 18,
            marginBottom: 6
          }}>
            {leaderboard[1] && (
              <div style={{
                background: '#e0e7ff',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥈</div>
                <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{leaderboard[1].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[1].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[0] && (
              <div style={{
                background: 'linear-gradient(135deg,#fef3c7 60%,#fffbe6 100%)',
                borderRadius: 14,
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: 80,
                boxShadow: '0 4px 16px #f59e0b22',
                transform: 'scale(1.12)'
              }}>
                <div style={{ fontSize: 28, color: '#f59e0b', animation: 'podiumCrown 1.2s infinite alternate' }}>🥇</div>
                <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1.1rem' }}>{leaderboard[0].display_name}</div>
                <div style={{ color: '#92400e', fontSize: '1rem', fontWeight: 700 }}>{leaderboard[0].recipesCount} recettes</div>
              </div>
            )}
            {leaderboard[2] && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: 12,
                padding: '8px 12px',
                textAlign: 'center',
                minWidth: 70,
                boxShadow: '0 2px 8px #6366f122'
              }}>
                <div style={{ fontSize: 22 }}>🥉</div>
                <div style={{ fontWeight: 700, color: '#a3a3a3', fontSize: '1rem' }}>{leaderboard[2].display_name}</div>
                <div style={{ color: '#374151', fontSize: '0.95rem' }}>{leaderboard[2].recipesCount} recettes</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ color: '#6366f1', fontSize: '0.95rem', textAlign: 'center', marginTop: 8 }}>
        Ce classement est basé sur le nombre de recettes publiées par chaque utilisateur au cours des 30 derniers jours.
      </div>
      <style jsx>{`
        @keyframes podiumCrown {
          0% { transform: scale(1) rotate(-8deg);}
          100% { transform: scale(1.15) rotate(8deg);}
        }
      `}</style>
    </div>
  )

  // --- Solde CocoCoins bien intégré ---
  const renderCoinBalance = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 12,
      marginTop: 8,
      background: 'linear-gradient(90deg, #fffbe6 60%, #fef3c7 100%)',
      borderRadius: 18,
      padding: '10px 24px',
      boxShadow: '0 2px 6px #f59e0b11',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#f59e0b',
      position: 'relative'
    }}>
      <span style={{ fontSize: 28, marginRight: 6, animation: coinAnim ? 'coinSpin 0.8s' : 'none' }}>🪙</span>
      <span style={{
        fontWeight: 900,
        fontSize: '1.3rem',
        color: '#f59e0b',
        letterSpacing: '-1px'
      }}>{coins}</span>
      <span style={{
        marginLeft: 4,
        fontWeight: 600,
        color: '#92400e',
        fontSize: '1.05rem'
      }}>CocoCoins</span>
      <span style={{
        marginLeft: 10,
        color: '#6b7280',
        fontSize: '0.95rem',
        fontWeight: 400
      }}>(solde actuel)</span>
    </div>
  )

  // --- Boutique avec onglets avancés ---
  const renderShopTab = () => {
    const dailyDeals = getDailyDeals();
    
    return (
      <div>
        {/* Onglets boutique */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'items', label: 'Objets', icon: '🛍️' },
            { id: 'packs', label: 'Packs', icon: '📦' },
            { id: 'deals', label: 'Promos', icon: '💥' },
            { id: 'cards', label: 'Cartes', icon: '🃏' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setShopTab(tab.id)}
              style={{
                background: shopTab === tab.id ? 'linear-gradient(135deg, #10b981, #34d399)' : '#fff',
                color: shopTab === tab.id ? 'white' : '#10b981',
                border: shopTab === tab.id ? 'none' : '1px solid #10b981',
                borderRadius: 10,
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: shopTab === tab.id ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              <span style={{ marginRight: 4 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Ajout d'un onglet pour les défis quotidiens */}
          <button
            onClick={() => setShopTab('deals')}
            style={{
              background: shopTab === 'deals' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#fff',
              color: shopTab === 'deals' ? 'white' : '#ef4444',
              border: 'none',
              borderRadius: 10,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ marginRight: 4 }}>💥</span>
            Promos
            {shopTab === 'deals' && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120%',
                height: '120%',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                filter: 'blur(12px)',
                zIndex: 0
              }} />
            )}
          </button>
        </div>

        {shopTab === 'items' && renderItemsShop()}
        {shopTab === 'packs' && renderPacksShop()}
        {shopTab === 'deals' && renderDealsShop(dailyDeals)}
        {shopTab === 'cards' && renderCardsShop()}
      </div>
    );
  };

  // --- Onglet objets individuels ---
  const renderItemsShop = () => {
    const filtered = shopFilter === 'all'
      ? SHOP_ITEMS.filter(item => !item.exclusive)
      : SHOP_ITEMS.filter(i => i.type === shopFilter && !i.exclusive);
    
    const ownedByType = type =>
      SHOP_ITEMS.filter(i => i.type === type && ownedItems.includes(i.id)).length;
    const totalByType = type =>
      SHOP_ITEMS.filter(i => i.type === type).length;

    return (
      <div>
        {/* Filtres par catégorie */}
        <div style={{
          display: 'flex', 
          gap: 6,
          justifyContent: 'flex-start', 
          marginBottom: 16,
          flexWrap: 'wrap',
          overflowX: 'auto',
          paddingBottom: 4
        }}>
          {ITEM_TYPES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setShopFilter(cat.id)}
              style={{
                background: shopFilter === cat.id ? '#f3f4f6' : 'transparent',
                color: '#374151',
                border: shopFilter === cat.id ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '6px 10px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '1rem', marginRight: 2 }}>{cat.icon}</span>
              {cat.label}
              {cat.id !== 'all' && (
                <span style={{
                  marginLeft: 6,
                  fontSize: '0.8rem',
                  color: '#f59e0b',
                  fontWeight: 600
                }}>
                  {ownedByType(cat.id)}/{totalByType(cat.id)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Wishlist */}
        {wishlist.length > 0 && (
          <div style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #fff5f5, #fef2f2)',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '12px 16px'
          }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', marginBottom: 8 }}>
              ❤️ Ma Wishlist ({wishlist.length} objets)
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHOP_ITEMS.filter(item => wishlist.includes(item.id)).slice(0, 5).map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: '#fff',
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <span>{item.icon}</span>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                </div>
              ))}
              {wishlist.length > 5 && (
                <span style={{ color: '#6b7280', fontSize: '0.8rem', alignSelf: 'center' }}>
                  +{wishlist.length - 5} autres...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Grille d'objets */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 16
        }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff',
              border: ownedItems.includes(item.id)
                ? `2px solid ${item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#10b981'}`
                : '1px solid #e5e7eb',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: item.onSale ? '0 0 0 2px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
            }}
              onClick={() => setItemPreviewOpen(item)}
              onMouseEnter={() => !ownedItems.includes(item.id) && setPreviewEquip(item)}
              onMouseLeave={() => setPreviewEquip(null)}
            >
              {/* Badges promotion */}
              {item.onSale && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  transform: 'rotate(-15deg)',
                  animation: 'saleGlow 2s ease-in-out infinite alternate'
                }}>
                  PROMO
                </div>
              )}

              {/* Badge niveau requis */}
              {item.unlockLevel && item.unlockLevel > 1 && (
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: levelInfo.current.level >= item.unlockLevel ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: '0.6rem',
                  fontWeight: 700
                }}>
                  Niv.{item.unlockLevel}
                </div>
              )}

              {/* Badge rareté */}
              <div style={{
                position: 'absolute',
                top: 6,
                right: 6,
                fontSize: 12,
                color: item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#8b5cf6' : '#3b82f6'
              }}>
                {item.rarity === 'legendary' ? '★★★' : item.rarity === 'epic' ? '★★' : item.rarity === 'rare' ? '★' : ''}
              </div>

              {/* Icône principale */}
              <div style={{
                fontSize: 32,
                marginBottom: 8,
                filter: getItemGlow(item.id),
                opacity: levelInfo.current.level >= (item.unlockLevel || 1) ? 1 : 0.5
              }}>
                {levelInfo.current.level >= (item.unlockLevel || 1) ? item.icon : '🔒'}
              </div>

              {/* Nom et prix */}
              <div style={{ 
                fontWeight: 700, 
                fontSize: 13, 
                marginBottom: 4, 
                color: '#1f2937',
                lineHeight: 1.2
              }}>
                {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
              </div>

              {/* Prix avec promotion */}
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                {item.onSale ? (
                  <div>
                    <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 4 }}>
                      {item.originalPrice}🪙
                    </span>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>
                      {item.price}🪙
                    </span>
                  </div>
                ) : (
                  <span style={{ color: '#6b7280' }}>{item.price}🪙</span>
                )}
              </div>

              {/* Bouton wishlist */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(item.id);
                }}
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  color: wishlist.includes(item.id) ? '#ef4444' : '#d1d5db',
                  cursor: 'pointer'
                }}
              >
                {wishlist.includes(item.id) ? '❤️' : '🤍'}
              </button>

              {/* Actions */}
              {ownedItems.includes(item.id) ? (
                <div style={{
                  background: '#10b981',
                  color: 'white',
                  borderRadius: 6,
                  padding: '4px 0',
                  fontWeight: 700,
                  fontSize: 11
                }}>
                  ✅ Possédé
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    buyItem(item);
                  }}
                  disabled={coins < item.price || levelInfo.current.level < (item.unlockLevel || 1)}
                  style={{
                    background: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? '#f59e0b' : '#e5e7eb',
                    color: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'white' : '#9ca3af',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: coins >= item.price && levelInfo.current.level >= (item.unlockLevel || 1) ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  {levelInfo.current.level < (item.unlockLevel || 1) ? '🔒 Verrouillé' : 'Acheter'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Onglet packs ---
  const renderPacksShop = () => (
    <div>
      <div style={{
        textAlign: 'center',
        marginBottom: 16,
        color: '#0369a1',
        fontSize: '0.9rem'
      }}>
        🎁 Économisez en achetant des packs complets !
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(1, 1fr)',
        gap: 16
      }}>
        {SHOP_PACKS.map(pack => {
          const itemsOwned = pack.items.filter(itemId => ownedItems.includes(itemId)).length;
          const allOwned = itemsOwned === pack.items.length;
          
          return (
            <div key={pack.id} style={{
              background: '#fff',
              border: pack.rarity === 'legendary' ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: 16,
              padding: 16,
              position: 'relative',
              boxShadow: pack.rarity === 'legendary' ? '0 4px 20px rgba(245, 158, 11, 0.2)' : 'none'
            }}>
              {/* Badge réduction */}
              <div style={{
                position: 'absolute',
                top: -8,
                right: 12,
                background: '#ef4444',
                color: 'white',
                borderRadius: 12,
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}>
                -{pack.discount}%
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 32 }}>{pack.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>
                    {pack.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {pack.description}
                  </div>
                </div>
              </div>

              {/* Objets inclus */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 8,
                marginBottom: 12
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Objets inclus ({itemsOwned}/{pack.items.length} possédés):
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {pack.items.map(itemId => {
                    const item = SHOP_ITEMS.find(i => i.id === itemId);
                    if (!item) return null;
                    
                    return (
                      <div key={itemId} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: ownedItems.includes(itemId) ? '#dcfce7' : '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: '0.7rem'
                      }}>
                        <span>{item.icon}</span>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: '#f59e0b' }}>{item.price}🪙</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prix et achat */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      textDecoration: 'line-through', 
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      {pack.originalPrice}🪙
                    </span>
                    <span style={{ 
                      color: '#ef4444', 
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }}>
                      {pack.price}🪙
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#10b981' }}>
                    Économie: {pack.originalPrice - pack.price}🪙
                  </div>
                </div>

                <button
                  onClick={() => buyPack(pack)}
                  disabled={coins < pack.price || allOwned}
                  style={{
                    background: allOwned ? '#e5e7eb' : 
                               coins >= pack.price ? 'linear-gradient(135deg, #10b981, #34d399)' : '#f3f4f6',
                    color: allOwned ? '#9ca3af' : 
                           coins >= pack.price ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: allOwned || coins < pack.price ? 'not-allowed' : 'pointer'
                  }}
                >
                  {allOwned ? '✅ Complet' : 'Acheter le pack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // --- Collection de cartes ---
  const renderCardCollection = () => {
    const groupedCards = {};
    
    // Grouper les cartes par collection
    CARD_COLLECTIONS.forEach(collection => {
      groupedCards[collection.id] = {
        info: collection,
        cards: TRADING_CARDS.filter(c => c.collection === collection.id),
        owned: ownedCards.filter(c => c.collection === collection.id)
      };
    });

    return (
      <div>
        {/* Statistiques globales */}
        <div style={{
          background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {ownedCards.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes totales</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#374151' }}>
                {[...new Set(ownedCards.map(c => c?.originalId || c?.id?.split('_')[0] || c?.id))].filter(id => id).length}/{TRADING_CARDS.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Cartes uniques</div>
            </div>
          </div>
        </div>