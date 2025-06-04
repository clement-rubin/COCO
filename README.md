# COCO - Application Mobile de Partage de Recettes

Une application web moderne et mobile-first pour partager et découvrir des recettes délicieuses au sein d'une communauté passionnée de cuisine.

## 🍴 Fonctionnalités Principales

- **Feed addictif style TikTok** - Découvrez les recettes en défilement vertical immersif
- **Pages recettes ultra-détaillées** - Instructions pas-à-pas avec minuteurs intégrés
- **Système de gamification** - Points, badges et défis culinaires quotidiens
- **Stories culinaires éphémères** - Partagez vos créations du moment qui disparaissent après 24h
- **Mode "Chef Challenge"** - Défis hebdomadaires avec classements communautaires
- **Notifications push addictives** - Rappels de cuisson, nouveaux défis, amis qui cuisinent
- **Réactions en temps réel** - Like, love, wow, yum avec animations fluides
- **Chat culinaire en direct** - Discussions pendant la préparation des recettes
- **Recommandations IA** - Suggestions personnalisées basées sur vos goûts
- **Mode hors ligne** - Sauvegardez vos recettes favorites pour cuisiner sans internet

## 🎮 Fonctionnalités Addictives

### Gamification
- **Système de niveaux** : De "Apprenti Cuisinier" à "Master Chef"
- **Points d'expérience** : Gagnez des XP en partageant, cuisinant et interagissant
- **Badges de collection** : 50+ badges à débloquer (Premier soufflé, Roi des pâtes, etc.)
- **Défis quotidiens** : Nouveaux défis chaque jour pour maintenir l'engagement
- **Classements** : Leaderboards hebdomadaires et mensuels
- **Streaks** : Récompenses pour les séries de jours consécutifs d'activité

### Expérience Immersive
- **Feed vertical addictif** : Défilement infini style TikTok/Instagram Reels
- **Transitions fluides** : Animations micro-interactions pour chaque action
- **Haptic feedback** : Vibrations tactiles pour les interactions importantes
- **Sons culinaires** : Effets sonores subtils (sifflement, grésillements)
- **Mode sombre automatique** : Adaptation selon l'heure pour cuisiner le soir
- **Écran de déverrouillage culinaire** : Citations et astuces inspirantes

### Social & Communauté
- **Stories culinaires 24h** : Partagez vos expériences culinaires éphémères
- **Live cooking** : Diffusions en direct de vos sessions de cuisine
- **Duels culinaires** : Défis 1v1 avec vote de la communauté
- **Groupes thématiques** : Communautés spécialisées (Vegan, Italien, Desserts)
- **Mentorship** : Système de parrainage entre chefs expérimentés et débutants

## 🎨 Design Mobile-First

L'application adopte un design moderne inspiré des meilleures applications mobiles de cuisine :
- **Palette de couleurs chaleureuses** (orange, vert, crème)
- **Typographie élégante** (Poppins + Playfair Display)
- **Interactions tactiles optimisées**
- **Animations fluides** et transitions
- **Composants cards** avec ombres modernes
- **Navigation intuitive** avec menu hamburger
- **Feed horizontal addictif** similaire aux stories Instagram

## 🛠 Technologies

- **Frontend**: Next.js 13+ avec React
- **Styling**: CSS Modules avec variables CSS modernes
- **Backend**: API Routes Next.js (serverless)
- **Base de données**: Supabase (PostgreSQL)
- **Upload d'images**: Compression automatique côté client
- **Déploiement**: Vercel ou Netlify

## 📱 Structure de l'Application

```
COCO/
├── pages/
│   ├── index.js                    # Feed addictif principal
│   ├── recipe/[id].js             # Page détaillée de recette
│   ├── stories/                   # Stories culinaires éphémères
│   │   ├── index.js               # Vue des stories
│   │   └── create.js              # Création de story
│   ├── challenges/                # Défis et gamification
│   │   ├── index.js               # Liste des défis
│   │   ├── daily.js               # Défi quotidien
│   │   └── leaderboard.js         # Classements
│   ├── live/                      # Fonctionnalités en direct
│   │   ├── index.js               # Lives en cours
│   │   └── stream/[id].js         # Page de live spécifique
│   ├── community/                 # Fonctionnalités communautaires
│   │   ├── groups.js              # Groupes thématiques
│   │   ├── chat.js                # Chat global
│   │   └── mentors.js             # Système de mentorship
│   ├── achievements.js            # Page des accomplissements
│   ├── cooking-mode/[id].js       # Mode cuisson avec minuteurs
│   ├── mes-recettes.js            # Redirection vers recettes utilisateur (NOUVEAU)
│   ├── user-recipes.js            # Liste des recettes partagées
│   ├── share-photo.js             # Page de partage rapide de photo
│   ├── submit-recipe.js           # Page de partage de recette complète
│   ├── social.js                  # Feed social complet
│   ├── test-upload.js             # Page de test d'upload (debug)
│   ├── test-recipes.js            # Page de test de la base de données
│   ├── favoris.js                 # Page de gestion des favoris culinaires
│   ├── explorer.js                # Page d'exploration des recettes
│   ├── profil.js                  # Page de profil utilisateur
│   ├── login.js                   # Page de connexion
│   ├── signup.js                  # Page d'inscription
│   ├── forgot-password.js         # Page de mot de passe oublié
│   ├── _app.js                    # Application wrapper avec navigation
│   ├── api/
│   │   └── recipes.js             # API de gestion des recettes (avec filtrage par auteur)
│   ├── auth/
│   │   ├── confirm.js             # Confirmation d'email
│   │   └── reset-password.js      # Réinitialisation de mot de passe
│   └── recipes/
│       └── user/[id].js           # Détail d'une recette utilisateur
├── components/
│   ├── AddictiveFeed.js           # Feed vertical style TikTok
│   ├── Navigation.js              # Navigation de l'ancien système
│   ├── RecipeCard.js             # Carte de recette
│   ├── RecipeDetailPage.js        # Page complète de recette
│   ├── ShareButton.js            # Bouton de partage vers share-photo
│   ├── PhotoUpload.js            # Composant d'upload de photos
│   ├── FriendsFeed.js            # Feed horizontal addictif des amis
│   ├── SocialFeed.js             # Feed social vertical complet
│   ├── UserShare.js              # Partage entre utilisateurs
│   ├── ErrorBoundary.js          # Gestion d'erreurs React
│   ├── ErrorDisplay.js           # Affichage des erreurs
│   ├── CookingMode.js             # Interface de cuisson guidée
│   ├── StoryViewer.js             # Visualiseur de stories
│   ├── ChallengeCard.js           # Cartes de défis
│   ├── GamificationOverlay.js     # Overlay des points/badges
│   ├── LiveCooking.js             # Interface de live cooking
│   ├── NotificationCenter.js      # Centre de notifications
│   ├── HapticFeedback.js          # Gestionnaire de vibrations
│   └── Footer.js                 # Pied de page
├── utils/
│   ├── logger.js                 # Système de logging centralisé
│   └── errorHandler.js           # Gestionnaire d'erreurs avancé
├── styles/
│   ├── globals.css               # Design system global
│   ├── SharePhoto.module.css     # Styles du partage de photo
│   ├── SubmitRecipe.module.css   # Styles du formulaire de recette
│   ├── SocialFeed.module.css     # Styles du feed social vertical
│   ├── FriendsFeed.module.css    # Styles du feed horizontal addictif
│   ├── RecipeDetail.module.css   # Styles des détails
│   └── CookingMode.module.css    # Styles du mode cuisson
├── lib/
│   └── supabase.js              # Configuration Supabase
└── .netlify/
    └── functions-internal/
        └── recipes.js           # Fonction serverless optimisée
```

## 🚀 Installation et Démarrage

```bash
# Cloner le projet
git clone [votre-repo]
cd COCO

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env.local

# Lancer en développement
npm run dev
```

## ⚙️ Configuration Supabase

1. Créez un compte sur [Supabase](https://supabase.io)
2. Créez un nouveau projet
3. Configurez vos variables d'environnement dans `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

**⚠️ Important** : Remplacez les valeurs ci-dessus par celles de votre projet Supabase.

4. **Configuration de la table `recipes` :**
   
   **Étape 1 : Créer/Mettre à jour la table**
   - Allez dans **SQL Editor** dans votre dashboard Supabase
   - Exécutez le SQL suivant :

```sql
-- Création ou mise à jour de la table recipes avec la structure correcte
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image BYTEA,
  prepTime TEXT,
  cookTime TEXT,
  servings TEXT,
  category TEXT,
  author TEXT,
  ingredients JSON,
  instructions JSON,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  difficulty TEXT DEFAULT 'Facile',
  user_id UUID REFERENCES auth.users(id)
);

-- Si la table existe déjà sans la colonne servings, l'ajouter
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS servings TEXT;

-- Créer les index pour de meilleures performances
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);

-- Activer Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Créer les politiques pour l'accès public
DROP POLICY IF EXISTS "Permettre lecture publique" ON recipes;
DROP POLICY IF EXISTS "Permettre insertion publique" ON recipes;
DROP POLICY IF EXISTS "Permettre mise à jour publique" ON recipes;
DROP POLICY IF EXISTS "Permettre suppression publique" ON recipes;

CREATE POLICY "Permettre lecture publique" ON recipes FOR SELECT USING (true);
CREATE POLICY "Permettre insertion publique" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permettre mise à jour publique" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Permettre suppression publique" ON recipes FOR DELETE USING (true);
```

5. **Configuration des tables pour le système d'amis :**

```sql
-- Créer la table profiles pour les profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer la table friendships pour les relations d'amitié
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  friend_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour profiles
CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (true);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

6. **Configuration Storage pour les images :**
   
   **Étape 1 : Créer le bucket**
   - Allez dans **Storage > Buckets** dans votre dashboard Supabase
   - Cliquez sur **"New bucket"**
   - Nom : `recipe-images`
   - **⚠️ OBLIGATOIRE : Cochez "Public bucket"**
   - Cliquez sur "Create bucket"

   **Étape 2 : Configurer les politiques de sécurité**
   - Allez dans **SQL Editor** dans votre dashboard Supabase
   - Exécutez le SQL suivant :

```sql
-- Politiques pour permettre l'upload et la lecture publique
CREATE POLICY IF NOT EXISTS "Permettre upload public" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY IF NOT EXISTS "Permettre lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipe-images');

CREATE POLICY IF NOT EXISTS "Permettre suppression publique" ON storage.objects
  FOR DELETE USING (bucket_id = 'recipe-images');
```

   **Étape 3 : Vérifier la configuration**
   - Utilisez la page `/test-upload` pour vérifier que tout fonctionne
   - Le statut du bucket doit afficher "✅ Bucket recipe-images disponible"
   - Utilisez la page `/test-recipes` pour vérifier la structure de la table

## 🔧 Tests et Debug

### Test d'Upload d'Images
Accédez à `/test-upload` pour :
- Tester l'upload depuis la galerie
- Tester la prise de photo avec caméra
- Voir les logs détaillés en temps réel
- Identifier les problèmes de configuration

### Test de la Base de Données
Accédez à `/test-recipes` pour :
- Vérifier la configuration de la table
- Obtenir le SQL de création automatique
- Tester les opérations CRUD sur les recettes
- Afficher les logs en temps réel

### Test de l'API
Accédez à `/api/recipes` pour :
- Tester les endpoints GET, POST, PUT, DELETE
- Vérifier la communication avec Supabase
- Valider le format des données

### Test HTML Standalone
Ouvrez `/test-api.html` dans votre navigateur pour :
- Tester l'API sans Next.js
- Interface de test simple et rapide
- Debug des problèmes de CORS

## 📸 Gestion des Images

- **Conversion automatique** en données binaires
- **Compression intelligente** (max 800px, qualité 80%)
- **Stockage optimisé** dans la base de données
- **Support multi-images** (jusqu'à 3 photos par recette)
- **Validation** avant soumission du formulaire
- **Partage rapide** de photos avec description simple
- **Logs détaillés** pour troubleshooting

## 🌐 Déploiement

### Vercel (Recommandé)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
1. Connectez votre repository GitHub à Netlify
2. Configurez les variables d'environnement
3. Déployez automatiquement

## 🎯 Fonctionnalités à Venir

- [x] Feed social addictif des amis
- [x] Défilement vertical immersif
- [x] Animations de like Instagram-style
- [ ] Système de favoris
- [ ] Notation des recettes
- [ ] Catégories avancées
- [ ] Mode hors ligne (PWA)
- [ ] Notifications push
- [ ] Partage social direct des recettes
- [ ] Mode photo instantané avec géolocalisation

## 🎯 Roadmap Addictif

### Phase 1 : Foundation Addictive ✅
- [x] Feed vertical immersif
- [x] Pages recettes détaillées
- [x] Système de points basique
- [x] Animations fluides
- [x] Mode cuisson guidé

### Phase 2 : Social & Gamification 🚧
- [ ] Stories culinaires 24h
- [ ] Défis quotidiens/hebdomadaires
- [ ] Système de badges complet
- [ ] Chat en temps réel
- [ ] Notifications push intelligentes

### Phase 3 : IA & Personnalisation 🔮
- [ ] Recommandations IA avancées
- [ ] Assistant culinaire vocal
- [ ] Reconnaissance d'ingrédients par photo
- [ ] Suggestions selon le frigo
- [ ] Adaptation automatique des portions

### Phase 4 : Réalité Augmentée 🥽
- [ ] Visualisation AR des plats
- [ ] Instructions AR superposées
- [ ] Partage de recettes en AR
- [ ] Filtres culinaires pour photos
- [ ] Mesure d'ingrédients en AR

## 📄 Licence

**COCO** - *Où chaque recette raconte une histoire* 🍴✨