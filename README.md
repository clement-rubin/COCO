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
    similarity(p.display_name, search_term) as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND (
      p.display_name ILIKE '%' || search_term || '%'
      OR similarity(p.display_name, search_term) > 0.3
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
  mutual_friends_count integer,
  common_interests_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT friend_id 
    FROM friendships 
    WHERE user_id = user_id_param AND status = 'accepted'
  ),
  mutual_friends AS (
    SELECT 
      p.user_id,
      p.display_name,
      p.bio,
      p.avatar_url,
      COUNT(DISTINCT f2.user_id) as mutual_count
    FROM profiles p
    JOIN friendships f1 ON f1.friend_id = p.user_id
    JOIN user_friends uf ON uf.friend_id = f1.user_id
    LEFT JOIN friendships f2 ON f2.user_id = user_id_param AND f2.friend_id = p.user_id
    WHERE 
      p.user_id != user_id_param
      AND p.is_private = false
      AND f2.user_id IS NULL -- Pas déjà ami
      AND p.user_id NOT IN (SELECT friend_id FROM user_friends)
    GROUP BY p.user_id, p.display_name, p.bio, p.avatar_url
  )
  SELECT 
    mf.user_id,
    mf.display_name,
    mf.bio,
    mf.avatar_url,
    mf.mutual_count::integer as mutual_friends_count,
    0 as common_interests_count -- À implémenter avec les catégories de recettes préférées
  FROM mutual_friends mf
  ORDER BY mf.mutual_count DESC, mf.display_name ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Extension pour la recherche floue (optionnel)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

**COCO** - *Où chaque recette raconte une histoire* 🍴✨

## 🌟 Fonctionnalités Principales

### 👥 Système d'Amis Avancé
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