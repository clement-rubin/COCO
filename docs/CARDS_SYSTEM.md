# 🃏 Système de Cartes à Collectionner COCO

## 📋 Guide d'utilisation

### 🚀 Installation

1. **Exécuter le script SQL** :
   ```sql
   -- Executer le fichier database/cards_system.sql dans Supabase
   ```

2. **Vérifier les variables d'environnement** :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Utiliser le nouveau client Supabase** :
   ```javascript
   import { getSupabaseClient } from '../lib/supabaseClient'
   ```

### 🎮 Fonctionnalités

#### 1. **Collections Thématiques**
- **Ingrédients du Monde** 🌶️ : Épices et ingrédients exotiques
- **Grands Chefs** 👨‍🍳 : Légendes de la gastronomie
- **Plats Mythiques** 🍽️ : Créations culinaires célèbres
- **Techniques Secrètes** ⚡ : Méthodes de cuisine avancées
- **Cuisines du Monde** 🌍 : Traditions culinaires

#### 2. **Système de Rareté**
```javascript
const RARITIES = {
  common: { rate: 60%, color: '#9ca3af' },
  uncommon: { rate: 30%, color: '#10b981' },
  rare: { rate: 8%, color: '#3b82f6' },
  epic: { rate: 1.5%, color: '#8b5cf6' },
  legendary: { rate: 0.5%, color: '#f59e0b' }
}
```

#### 3. **Packs Disponibles**
- **📦 Booster Découverte** : 50🪙 - 3 cartes
- **🎁 Booster Premium** : 120🪙 - 5 cartes + rare garantie
- **👑 Booster Légendaire** : 300🪙 - 7 cartes + épique garantie

### 🔧 API Reference

#### Fonctions Principales

```javascript
// Ouvrir un pack
await openCardPack('pack_basic')

// Sauvegarder collection
await saveUserCardCollection(userId, cards, stats)

// Récupérer collection
const collection = await getUserCardCollection(userId)

// Créer offre d'échange
await createTradeOffer(userId, offeringCard, wantingCard, message)
```

#### Gestion des Erreurs

```javascript
// Wrapper sécurisé pour Supabase
const safeSupabaseCall = async (operation, fallbackValue = null) => {
  try {
    const supabase = getSupabaseClient();
    return await operation(supabase);
  } catch (error) {
    console.error('Erreur Supabase:', error);
    return fallbackValue;
  }
};
```

### 🗄️ Structure des Données

#### Carte Standard
```javascript
{
  id: 'card_saffron',
  name: 'Safran de Cachemire',
  collection: 'ingredients',
  rarity: 'legendary',
  icon: '🌸',
  description: 'L\'épice la plus précieuse au monde...',
  stats: { saveur: 95, rareté: 98, prix: 92 },
  lore: 'Il faut 150 fleurs pour obtenir 1 gramme...',
  artist: 'Chef Amara',
  number: '001/100',
  releaseDate: '2024-01-15'
}
```

#### Carte Possédée
```javascript
{
  // ... propriétés de la carte standard
  uniqueId: 'card_saffron_1705123456789_abc123',
  originalId: 'card_saffron',
  obtainedAt: '2024-01-15T10:30:00.000Z'
}
```

### 📊 Tables Base de Données

#### `user_cards`
- Collection personnelle de chaque utilisateur
- Statistiques de progression par collection
- Nombre de packs ouverts

#### `trade_offers`
- Offres d'échange entre utilisateurs
- Statut : pending, accepted, declined, completed, cancelled
- Expiration automatique après 7 jours

#### `trade_history`
- Historique des échanges complétés
- Valeur estimée des cartes échangées
- Suivi des performances

#### `card_marketplace`
- Vente directe contre CocoCoins
- Expiration après 14 jours
- Statut : active, sold, cancelled, expired

### 🎨 Interface Utilisateur

#### Animations
- **Ouverture de pack** : rotation + révélation progressive
- **Cartes rares** : effets de brillance et glow
- **Transitions** : smooth entre les sections

#### Responsive Design
- **Mobile-first** : optimisé pour petits écrans
- **Grilles adaptatives** : 2 colonnes sur mobile
- **Navigation par onglets** : boutique, collection, échanges

### 🛡️ Sécurité

#### Row Level Security (RLS)
```sql
-- Exemple : utilisateurs ne voient que leurs cartes
CREATE POLICY "Users can view own cards" ON public.user_cards
  FOR SELECT USING (auth.uid() = user_id);
```

#### Validation Côté Client
```javascript
// Vérification des cartes invalides
const validCards = cards.filter(card => 
  card && card.id && card.name
);
```

### 🚨 Résolution des Erreurs Communes

#### 1. **"Cannot read properties of undefined"**
```javascript
// ✅ Bonne pratique
const card = generateRandomCard(distribution);
if (card && card.id) {
  // Traiter la carte
}
```

#### 2. **"Multiple GoTrueClient instances"**
```javascript
// ✅ Utiliser le singleton
import { getSupabaseClient } from '../lib/supabaseClient'
const supabase = getSupabaseClient();
```

#### 3. **"Status 406"**
```javascript
// ✅ Gestion d'erreur appropriée
const result = await safeSupabaseCall(
  (supabase) => supabase.from('profiles').select('*'),
  []
);
```

### 📈 Améliorations Futures

- **Trading en temps réel** avec WebSockets
- **Enchères** pour cartes rares
- **Cartes événementielles** saisonnières
- **Système de ligues** pour collectionneurs
- **API publique** pour applications tiers

### 🤝 Contribution

1. **Ajouter de nouvelles cartes** : Modifier `TRADING_CARDS`
2. **Nouvelles collections** : Ajouter dans `CARD_COLLECTIONS`
3. **Tests** : Vérifier toutes les fonctionnalités après ajout
4. **Documentation** : Mettre à jour ce guide

---

*Système développé avec ❤️ pour la communauté COCO*