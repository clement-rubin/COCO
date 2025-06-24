# COCO - Application Mobile de Partage de Recettes

Une application web moderne et mobile-first pour partager et découvrir des recettes délicieuses au sein d'une communauté passionnée de cuisine.

## 🚀 Déploiement en Production

### Configuration Netlify/Vercel

Pour un déploiement réussi, assurez-vous de :

1. **Variables d'environnement** :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
NODE_ENV=production
```

2. **Configuration du build** :
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. **Optimisations pour la production** :
- Images automatiquement compressées en Data URLs
- Logs réduits en production via `NODE_ENV`
- Gestion d'erreurs robuste avec retry automatique
- Cache des requêtes API optimisé

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
│   ├── amis.js                    # Page de gestion des amis (NOUVEAU)
│   ├── mes-recettes.js            # Redirection vers recettes utilisateur
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

4. **Configuration de la table `profiles` (OBLIGATOIRE) :**
   
   **Étape 1 : Créer la table profiles**
   - Allez dans **SQL Editor** dans votre dashboard Supabase
   - Exécutez le SQL suivant :

```sql
-- Création de la table profiles pour les informations utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour la sécurité
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (NOT is_private OR auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre suppression profil utilisateur" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Contraintes pour les noms d'utilisateur
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\-\s]+$');

-- Index pour les recherches d'amis
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- Table des amitiés (STRUCTURE COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Empêche les doublons inversés (user_id/friend_id et friend_id/user_id)
  CONSTRAINT unique_friendship_pair UNIQUE (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
);

-- Index pour les amitiés
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Row Level Security pour friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour la recherche floue de profils
CREATE OR REPLACE FUNCTION search_profiles(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN pg_trgm.similarity(p.display_name, search_term) > 0 
      THEN pg_trgm.similarity(p.display_name, search_term)
      ELSE 0.1
    END as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR (pg_trgm.similarity(p.display_name, search_term) > 0.3)
    )
  ORDER BY similarity_score DESC, p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions d'amis
CREATE OR REPLACE FUNCTION get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  mutual_friends_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0 as mutual_friends_count
  FROM profiles p
  LEFT JOIN friendships existing ON (
    (existing.user_id = user_id_param AND existing.friend_id = p.user_id) OR
    (existing.friend_id = user_id_param AND existing.user_id = p.user_id)
  )
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
    AND existing.id IS NULL -- Pas déjà ami ou demande en cours
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table des commentaires (NOUVELLE)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les commentaires
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Row Level Security pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Politiques pour comments
CREATE POLICY "Permettre lecture publique commentaires" ON comments FOR SELECT USING (true);
CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Table pour les votes de la recette de la semaine
CREATE TABLE IF NOT EXISTS public.recipe_week_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, DATE_TRUNC('week', created_at)),
  CONSTRAINT one_vote_per_user_per_week UNIQUE (user_id, DATE_TRUNC('week', created_at))
);

-- Index pour les votes de la semaine
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_recipe_id ON recipe_week_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_user_id ON recipe_week_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_week ON recipe_week_votes(DATE_TRUNC('week', created_at));

-- Row Level Security pour recipe_week_votes
ALTER TABLE recipe_week_votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipe_week_votes
CREATE POLICY "Voir tous les votes" ON recipe_week_votes FOR SELECT USING (true);
CREATE POLICY "Voter pour recette de la semaine" ON recipe_week_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer son vote" ON recipe_week_votes FOR DELETE USING (auth.uid() = user_id);
```

## 👥 Gestion des amitiés

Le système d'amis de COCO permet aux utilisateurs de rechercher, ajouter, accepter, refuser, bloquer et débloquer des amis, ainsi que de gérer des groupes d'amis et de recevoir des notifications.

### Fonctionnalités principales

- **Recherche d'utilisateurs** : via le nom d'affichage, avec recherche floue (`search_users_simple`)
- **Suggestions d'amis** : basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### Endpoints API

- `GET /api/friends?user_id=...` : Récupère la liste des amis et demandes en attente
- `GET /api/friends?query=...` : Recherche d'utilisateurs par nom
- `POST /api/friends` : Actions (`send_request`, `accept_request`, `reject_request`, `block_user`, `unblock_user`, `create_group`, etc.)

### Fonctions utilitaires principales

- `getUserFriends(userId)` : Récupère amis et demandes en attente
- `sendFriendRequestCorrected(fromUserId, toUserId)` : Envoie une demande d'amitié
- `blockUser(fromUserId, toUserId)` / `unblockUser(fromUserId, toUserId)` : Bloque/débloque un utilisateur
- `getIntelligentFriendSuggestions(userId, limit)` : Suggestions avancées d'amis
- `getUnreadNotifications(userId)` : Notifications non lues
- `updateLastSeen(userId)` / `isUserOnline(userId)` : Statut en ligne

### Tables et fonctions SQL

- Table `friendships` : stocke les relations d'amitié (voir scripts SQL)
- Table `profiles` : profils utilisateurs
- Fonctions : `get_user_friends_simple`, `get_pending_friend_requests`, `check_friendship_status`, `get_friend_suggestions`, etc.

### Exemples d'utilisation

```js
// Envoyer une demande d'amitié
await sendFriendRequestCorrected(currentUserId, targetUserId);

// Accepter une demande
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

// Bloquer un utilisateur
await blockUser(currentUserId, targetUserId);

// Suggestions d'amis
const suggestions = await getIntelligentFriendSuggestions(currentUserId, 5);
```

Pour plus de détails, consultez les fichiers :
- `/utils/profileUtils.js`
- `/pages/api/friends.js`
- `/pages/amis.js`
- `/pages/test-friends.js`

**COCO** - *Où chaque recette raconte une histoire* 🍴✨

## 🌟 Fonctionnalités Principales

### 👥 Système d'Amis Avancé ✅
- **Recherche d'utilisateurs** par nom avec recherche floue
- **Suggestions d'amis** basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### 🍽️ Partage de Recettes
- Création et modification de recettes avec photos
- Catégorisation et système de tags
- Recherche avancée par ingrédients, catégorie, auteur
- Attribution automatique des auteurs via les profils

### 🔐 Authentification et Sécurité
- Système d'authentification Supabase
- Politiques de sécurité Row Level Security (RLS)
- Validation des données côté client et serveur
- Gestion des erreurs avec stratégies de récupération

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Supabase
- Variables d'environnement configurées

### Configuration de la Base de Données
Exécutez le SQL suivant dans votre tableau de bord Supabase pour configurer les tables et fonctions :

```sql
-- Création de la table profiles pour les informations utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour la sécurité
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (NOT is_private OR auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre suppression profil utilisateur" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Contraintes pour les noms d'utilisateur
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\-\s]+$');

-- Index pour les recherches d'amis
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- Table des amitiés (STRUCTURE COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Empêche les doublons inversés (user_id/friend_id et friend_id/user_id)
  CONSTRAINT unique_friendship_pair UNIQUE (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
);

-- Index pour les amitiés
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Row Level Security pour friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour la recherche floue de profils
CREATE OR REPLACE FUNCTION search_profiles(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN pg_trgm.similarity(p.display_name, search_term) > 0 
      THEN pg_trgm.similarity(p.display_name, search_term)
      ELSE 0.1
    END as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR (pg_trgm.similarity(p.display_name, search_term) > 0.3)
    )
  ORDER BY similarity_score DESC, p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions d'amis
CREATE OR REPLACE FUNCTION get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  mutual_friends_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0 as mutual_friends_count
  FROM profiles p
  LEFT JOIN friendships existing ON (
    (existing.user_id = user_id_param AND existing.friend_id = p.user_id) OR
    (existing.friend_id = user_id_param AND existing.user_id = p.user_id)
  )
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
    AND existing.id IS NULL -- Pas déjà ami ou demande en cours
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table des commentaires (NOUVELLE)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les commentaires
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Row Level Security pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Politiques pour comments
CREATE POLICY "Permettre lecture publique commentaires" ON comments FOR SELECT USING (true);
CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Table pour les votes de la recette de la semaine
CREATE TABLE IF NOT EXISTS public.recipe_week_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, DATE_TRUNC('week', created_at)),
  CONSTRAINT one_vote_per_user_per_week UNIQUE (user_id, DATE_TRUNC('week', created_at))
);

-- Index pour les votes de la semaine
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_recipe_id ON recipe_week_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_user_id ON recipe_week_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_week ON recipe_week_votes(DATE_TRUNC('week', created_at));

-- Row Level Security pour recipe_week_votes
ALTER TABLE recipe_week_votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipe_week_votes
CREATE POLICY "Voir tous les votes" ON recipe_week_votes FOR SELECT USING (true);
CREATE POLICY "Voter pour recette de la semaine" ON recipe_week_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer son vote" ON recipe_week_votes FOR DELETE USING (auth.uid() = user_id);
```

## 👥 Gestion des amitiés

Le système d'amis de COCO permet aux utilisateurs de rechercher, ajouter, accepter, refuser, bloquer et débloquer des amis, ainsi que de gérer des groupes d'amis et de recevoir des notifications.

### Fonctionnalités principales

- **Recherche d'utilisateurs** : via le nom d'affichage, avec recherche floue (`search_users_simple`)
- **Suggestions d'amis** : basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### Endpoints API

- `GET /api/friends?user_id=...` : Récupère la liste des amis et demandes en attente
- `GET /api/friends?query=...` : Recherche d'utilisateurs par nom
- `POST /api/friends` : Actions (`send_request`, `accept_request`, `reject_request`, `block_user`, `unblock_user`, `create_group`, etc.)

### Fonctions utilitaires principales

- `getUserFriends(userId)` : Récupère amis et demandes en attente
- `sendFriendRequestCorrected(fromUserId, toUserId)` : Envoie une demande d'amitié
- `blockUser(fromUserId, toUserId)` / `unblockUser(fromUserId, toUserId)` : Bloque/débloque un utilisateur
- `getIntelligentFriendSuggestions(userId, limit)` : Suggestions avancées d'amis
- `getUnreadNotifications(userId)` : Notifications non lues
- `updateLastSeen(userId)` / `isUserOnline(userId)` : Statut en ligne

### Tables et fonctions SQL

- Table `friendships` : stocke les relations d'amitié (voir scripts SQL)
- Table `profiles` : profils utilisateurs
- Fonctions : `get_user_friends_simple`, `get_pending_friend_requests`, `check_friendship_status`, `get_friend_suggestions`, etc.

### Exemples d'utilisation

```js
// Envoyer une demande d'amitié
await sendFriendRequestCorrected(currentUserId, targetUserId);

// Accepter une demande
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

// Bloquer un utilisateur
await blockUser(currentUserId, targetUserId);

// Suggestions d'amis
const suggestions = await getIntelligentFriendSuggestions(currentUserId, 5);
```

Pour plus de détails, consultez les fichiers :
- `/utils/profileUtils.js`
- `/pages/api/friends.js`
- `/pages/amis.js`
- `/pages/test-friends.js`

**COCO** - *Où chaque recette raconte une histoire* 🍴✨

## 🌟 Fonctionnalités Principales

### 👥 Système d'Amis Avancé ✅
- **Recherche d'utilisateurs** par nom avec recherche floue
- **Suggestions d'amis** basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### 🍽️ Partage de Recettes
- Création et modification de recettes avec photos
- Catégorisation et système de tags
- Recherche avancée par ingrédients, catégorie, auteur
- Attribution automatique des auteurs via les profils

### 🔐 Authentification et Sécurité
- Système d'authentification Supabase
- Politiques de sécurité Row Level Security (RLS)
- Validation des données côté client et serveur
- Gestion des erreurs avec stratégies de récupération

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Supabase
- Variables d'environnement configurées

### Configuration de la Base de Données
Exécutez le SQL suivant dans votre tableau de bord Supabase pour configurer les tables et fonctions :

```sql
-- Création de la table profiles pour les informations utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour la sécurité
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (NOT is_private OR auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre suppression profil utilisateur" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Contraintes pour les noms d'utilisateur
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\-\s]+$');

-- Index pour les recherches d'amis
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- Table des amitiés (STRUCTURE COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Empêche les doublons inversés (user_id/friend_id et friend_id/user_id)
  CONSTRAINT unique_friendship_pair UNIQUE (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
);

-- Index pour les amitiés
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Row Level Security pour friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour la recherche floue de profils
CREATE OR REPLACE FUNCTION search_profiles(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN pg_trgm.similarity(p.display_name, search_term) > 0 
      THEN pg_trgm.similarity(p.display_name, search_term)
      ELSE 0.1
    END as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR (pg_trgm.similarity(p.display_name, search_term) > 0.3)
    )
  ORDER BY similarity_score DESC, p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions d'amis
CREATE OR REPLACE FUNCTION get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  mutual_friends_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0 as mutual_friends_count
  FROM profiles p
  LEFT JOIN friendships existing ON (
    (existing.user_id = user_id_param AND existing.friend_id = p.user_id) OR
    (existing.friend_id = user_id_param AND existing.user_id = p.user_id)
  )
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
    AND existing.id IS NULL -- Pas déjà ami ou demande en cours
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table des commentaires (NOUVELLE)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les commentaires
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Row Level Security pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Politiques pour comments
CREATE POLICY "Permettre lecture publique commentaires" ON comments FOR SELECT USING (true);
CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Table pour les votes de la recette de la semaine
CREATE TABLE IF NOT EXISTS public.recipe_week_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, DATE_TRUNC('week', created_at)),
  CONSTRAINT one_vote_per_user_per_week UNIQUE (user_id, DATE_TRUNC('week', created_at))
);

-- Index pour les votes de la semaine
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_recipe_id ON recipe_week_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_user_id ON recipe_week_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_week ON recipe_week_votes(DATE_TRUNC('week', created_at));

-- Row Level Security pour recipe_week_votes
ALTER TABLE recipe_week_votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipe_week_votes
CREATE POLICY "Voir tous les votes" ON recipe_week_votes FOR SELECT USING (true);
CREATE POLICY "Voter pour recette de la semaine" ON recipe_week_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer son vote" ON recipe_week_votes FOR DELETE USING (auth.uid() = user_id);
```

## 👥 Gestion des amitiés

Le système d'amis de COCO permet aux utilisateurs de rechercher, ajouter, accepter, refuser, bloquer et débloquer des amis, ainsi que de gérer des groupes d'amis et de recevoir des notifications.

### Fonctionnalités principales

- **Recherche d'utilisateurs** : via le nom d'affichage, avec recherche floue (`search_users_simple`)
- **Suggestions d'amis** : basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### Endpoints API

- `GET /api/friends?user_id=...` : Récupère la liste des amis et demandes en attente
- `GET /api/friends?query=...` : Recherche d'utilisateurs par nom
- `POST /api/friends` : Actions (`send_request`, `accept_request`, `reject_request`, `block_user`, `unblock_user`, `create_group`, etc.)

### Fonctions utilitaires principales

- `getUserFriends(userId)` : Récupère amis et demandes en attente
- `sendFriendRequestCorrected(fromUserId, toUserId)` : Envoie une demande d'amitié
- `blockUser(fromUserId, toUserId)` / `unblockUser(fromUserId, toUserId)` : Bloque/débloque un utilisateur
- `getIntelligentFriendSuggestions(userId, limit)` : Suggestions avancées d'amis
- `getUnreadNotifications(userId)` : Notifications non lues
- `updateLastSeen(userId)` / `isUserOnline(userId)` : Statut en ligne

### Tables et fonctions SQL

- Table `friendships` : stocke les relations d'amitié (voir scripts SQL)
- Table `profiles` : profils utilisateurs
- Fonctions : `get_user_friends_simple`, `get_pending_friend_requests`, `check_friendship_status`, `get_friend_suggestions`, etc.

### Exemples d'utilisation

```js
// Envoyer une demande d'amitié
await sendFriendRequestCorrected(currentUserId, targetUserId);

// Accepter une demande
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

// Bloquer un utilisateur
await blockUser(currentUserId, targetUserId);

// Suggestions d'amis
const suggestions = await getIntelligentFriendSuggestions(currentUserId, 5);
```

Pour plus de détails, consultez les fichiers :
- `/utils/profileUtils.js`
- `/pages/api/friends.js`
- `/pages/amis.js`
- `/pages/test-friends.js`

**COCO** - *Où chaque recette raconte une histoire* 🍴✨

## 🌟 Fonctionnalités Principales

### 👥 Système d'Amis Avancé ✅
- **Recherche d'utilisateurs** par nom avec recherche floue
- **Suggestions d'amis** basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### 🍽️ Partage de Recettes
- Création et modification de recettes avec photos
- Catégorisation et système de tags
- Recherche avancée par ingrédients, catégorie, auteur
- Attribution automatique des auteurs via les profils

### 🔐 Authentification et Sécurité
- Système d'authentification Supabase
- Politiques de sécurité Row Level Security (RLS)
- Validation des données côté client et serveur
- Gestion des erreurs avec stratégies de récupération

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Supabase
- Variables d'environnement configurées

### Configuration de la Base de Données
Exécutez le SQL suivant dans votre tableau de bord Supabase pour configurer les tables et fonctions :

```sql
-- Création de la table profiles pour les informations utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour la sécurité
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (NOT is_private OR auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre suppression profil utilisateur" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Contraintes pour les noms d'utilisateur
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\-\s]+$');

-- Index pour les recherches d'amis
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- Table des amitiés (STRUCTURE COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Empêche les doublons inversés (user_id/friend_id et friend_id/user_id)
  CONSTRAINT unique_friendship_pair UNIQUE (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
);

-- Index pour les amitiés
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Row Level Security pour friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour la recherche floue de profils
CREATE OR REPLACE FUNCTION search_profiles(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN pg_trgm.similarity(p.display_name, search_term) > 0 
      THEN pg_trgm.similarity(p.display_name, search_term)
      ELSE 0.1
    END as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR (pg_trgm.similarity(p.display_name, search_term) > 0.3)
    )
  ORDER BY similarity_score DESC, p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions d'amis
CREATE OR REPLACE FUNCTION get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  mutual_friends_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0 as mutual_friends_count
  FROM profiles p
  LEFT JOIN friendships existing ON (
    (existing.user_id = user_id_param AND existing.friend_id = p.user_id) OR
    (existing.friend_id = user_id_param AND existing.user_id = p.user_id)
  )
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
    AND existing.id IS NULL -- Pas déjà ami ou demande en cours
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table des commentaires (NOUVELLE)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les commentaires
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Row Level Security pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Politiques pour comments
CREATE POLICY "Permettre lecture publique commentaires" ON comments FOR SELECT USING (true);
CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Table pour les votes de la recette de la semaine
CREATE TABLE IF NOT EXISTS public.recipe_week_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, DATE_TRUNC('week', created_at)),
  CONSTRAINT one_vote_per_user_per_week UNIQUE (user_id, DATE_TRUNC('week', created_at))
);

-- Index pour les votes de la semaine
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_recipe_id ON recipe_week_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_user_id ON recipe_week_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_week ON recipe_week_votes(DATE_TRUNC('week', created_at));

-- Row Level Security pour recipe_week_votes
ALTER TABLE recipe_week_votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipe_week_votes
CREATE POLICY "Voir tous les votes" ON recipe_week_votes FOR SELECT USING (true);
CREATE POLICY "Voter pour recette de la semaine" ON recipe_week_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer son vote" ON recipe_week_votes FOR DELETE USING (auth.uid() = user_id);
```

## 👥 Gestion des amitiés

Le système d'amis de COCO permet aux utilisateurs de rechercher, ajouter, accepter, refuser, bloquer et débloquer des amis, ainsi que de gérer des groupes d'amis et de recevoir des notifications.

### Fonctionnalités principales

- **Recherche d'utilisateurs** : via le nom d'affichage, avec recherche floue (`search_users_simple`)
- **Suggestions d'amis** : basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### Endpoints API

- `GET /api/friends?user_id=...` : Récupère la liste des amis et demandes en attente
- `GET /api/friends?query=...` : Recherche d'utilisateurs par nom
- `POST /api/friends` : Actions (`send_request`, `accept_request`, `reject_request`, `block_user`, `unblock_user`, `create_group`, etc.)

### Fonctions utilitaires principales

- `getUserFriends(userId)` : Récupère amis et demandes en attente
- `sendFriendRequestCorrected(fromUserId, toUserId)` : Envoie une demande d'amitié
- `blockUser(fromUserId, toUserId)` / `unblockUser(fromUserId, toUserId)` : Bloque/débloque un utilisateur
- `getIntelligentFriendSuggestions(userId, limit)` : Suggestions avancées d'amis
- `getUnreadNotifications(userId)` : Notifications non lues
- `updateLastSeen(userId)` / `isUserOnline(userId)` : Statut en ligne

### Tables et fonctions SQL

- Table `friendships` : stocke les relations d'amitié (voir scripts SQL)
- Table `profiles` : profils utilisateurs
- Fonctions : `get_user_friends_simple`, `get_pending_friend_requests`, `check_friendship_status`, `get_friend_suggestions`, etc.

### Exemples d'utilisation

```js
// Envoyer une demande d'amitié
await sendFriendRequestCorrected(currentUserId, targetUserId);

// Accepter une demande
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

// Bloquer un utilisateur
await blockUser(currentUserId, targetUserId);

// Suggestions d'amis
const suggestions = await getIntelligentFriendSuggestions(currentUserId, 5);
```

Pour plus de détails, consultez les fichiers :
- `/utils/profileUtils.js`
- `/pages/api/friends.js`
- `/pages/amis.js`
- `/pages/test-friends.js`

**COCO** - *Où chaque recette raconte une histoire* 🍴✨

## 🌟 Fonctionnalités Principales

### 👥 Système d'Amis Avancé ✅
- **Recherche d'utilisateurs** par nom avec recherche floue
- **Suggestions d'amis** basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### 🍽️ Partage de Recettes
- Création et modification de recettes avec photos
- Catégorisation et système de tags
- Recherche avancée par ingrédients, catégorie, auteur
- Attribution automatique des auteurs via les profils

### 🔐 Authentification et Sécurité
- Système d'authentification Supabase
- Politiques de sécurité Row Level Security (RLS)
- Validation des données côté client et serveur
- Gestion des erreurs avec stratégies de récupération

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+ et npm/yarn
- Compte Supabase
- Variables d'environnement configurées

### Configuration de la Base de Données
Exécutez le SQL suivant dans votre tableau de bord Supabase pour configurer les tables et fonctions :

```sql
-- Création de la table profiles pour les informations utilisateur
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- Activer Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politiques pour la sécurité
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles FOR SELECT USING (NOT is_private OR auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre insertion profil utilisateur" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre suppression profil utilisateur" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Contraintes pour les noms d'utilisateur
ALTER TABLE profiles ADD CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\-\s]+$');

-- Index pour les recherches d'amis
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- Table des amitiés (STRUCTURE COMPLÈTE)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  -- Empêche les doublons inversés (user_id/friend_id et friend_id/user_id)
  CONSTRAINT unique_friendship_pair UNIQUE (LEAST(user_id, friend_id), GREATEST(user_id, friend_id))
);

-- Index pour les amitiés
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Row Level Security pour friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Politiques pour friendships
CREATE POLICY "Voir ses amitiés" ON friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Créer demande amitié" ON friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Modifier ses amitiés" ON friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Supprimer ses amitiés" ON friendships FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- Fonction pour la recherche floue de profils
CREATE OR REPLACE FUNCTION search_profiles(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE 
      WHEN pg_trgm.similarity(p.display_name, search_term) > 0 
      THEN pg_trgm.similarity(p.display_name, search_term)
      ELSE 0.1
    END as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR (pg_trgm.similarity(p.display_name, search_term) > 0.3)
    )
  ORDER BY similarity_score DESC, p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les suggestions d'amis
CREATE OR REPLACE FUNCTION get_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  mutual_friends_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0 as mutual_friends_count
  FROM profiles p
  LEFT JOIN friendships existing ON (
    (existing.user_id = user_id_param AND existing.friend_id = p.user_id) OR
    (existing.friend_id = user_id_param AND existing.user_id = p.user_id)
  )
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
    AND existing.id IS NULL -- Pas déjà ami ou demande en cours
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer automatiquement un profil (CORRIGÉE)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table des commentaires (NOUVELLE)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les commentaires
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Row Level Security pour comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Politiques pour comments
CREATE POLICY "Permettre lecture publique commentaires" ON comments FOR SELECT USING (true);
CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Table pour les votes de la recette de la semaine
CREATE TABLE IF NOT EXISTS public.recipe_week_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, DATE_TRUNC('week', created_at)),
  CONSTRAINT one_vote_per_user_per_week UNIQUE (user_id, DATE_TRUNC('week', created_at))
);

-- Index pour les votes de la semaine
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_recipe_id ON recipe_week_votes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_user_id ON recipe_week_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_week_votes_week ON recipe_week_votes(DATE_TRUNC('week', created_at));

-- Row Level Security pour recipe_week_votes
ALTER TABLE recipe_week_votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour recipe_week_votes
CREATE POLICY "Voir tous les votes" ON recipe_week_votes FOR SELECT USING (true);
CREATE POLICY "Voter pour recette de la semaine" ON recipe_week_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Supprimer son vote" ON recipe_week_votes FOR DELETE USING (auth.uid() = user_id);
```

## 👥 Gestion des amitiés

Le système d'amis de COCO permet aux utilisateurs de rechercher, ajouter, accepter, refuser, bloquer et débloquer des amis, ainsi que de gérer des groupes d'amis et de recevoir des notifications.

### Fonctionnalités principales

- **Recherche d'utilisateurs** : via le nom d'affichage, avec recherche floue (`search_users_simple`)
- **Suggestions d'amis** : basées sur les amis mutuels
- **Profils utilisateur** complets avec statistiques
- **Gestion des demandes d'amitié** (envoi, acceptation, refus)
- **Paramètres de confidentialité** pour les profils
- **Noms d'utilisateur personnalisés** avec validation

### Endpoints API

- `GET /api/friends?user_id=...` : Récupère la liste des amis et demandes en attente
- `GET /api/friends?query=...` : Recherche d'utilisateurs par nom
- `POST /api/friends` : Actions (`send_request`, `accept_request`, `reject_request`, `block_user`, `unblock_user`, `create_group`, etc.)

### Fonctions utilitaires principales

- `getUserFriends(userId)` : Récupère amis et demandes en attente
- `sendFriendRequestCorrected(fromUserId, toUserId)` : Envoie une demande d'amitié
- `blockUser(fromUserId, toUserId)` / `unblockUser(fromUserId, toUserId)` : Bloque/débloque un utilisateur
- `getIntelligentFriendSuggestions(userId, limit)` : Suggestions avancées d'amis
- `getUnreadNotifications(userId)` : Notifications non lues
- `updateLastSeen(userId)` / `isUserOnline(userId)` : Statut en ligne

### Tables et fonctions SQL

- Table `friendships` : stocke les relations d'amitié (voir scripts SQL)
- Table `profiles` : profils utilisateurs
- Fonctions : `get_user_friends_simple`, `get_pending_friend_requests`, `check_friendship_status`, `get_friend_suggestions`, etc.

### Exemples d'utilisation

```js
// Envoyer une demande d'amitié
await sendFriendRequestCorrected(currentUserId, targetUserId);

// Accepter une demande
await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

// Bloquer un utilisateur
await blockUser(currentUserId, targetUserId);

// Suggestions d'amis
const suggestions = await getIntelligentFriendSuggestions(currentUserId, 5);
```

Pour plus de détails, consultez les fichiers :
- `/utils/profileUtils.js`
- `/pages/api/friends.js`
- `/pages/amis.js`
- `/pages/test-friends.js