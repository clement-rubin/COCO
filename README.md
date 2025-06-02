# COCO - Application Mobile de Partage de Recettes

Une application web moderne et mobile-first pour partager et découvrir des recettes délicieuses au sein d'une communauté passionnée de cuisine.

## 🍴 Fonctionnalités Principales

- **Partage rapide de photos** - Partagez rapidement une photo de votre plat avec nom et description
- **Partage de recettes complètes** - Partagez vos créations culinaires avec photos détaillées
- **Navigation des recettes** - Explorez les recettes partagées par d'autres utilisateurs
- **Recherche intelligente** - Trouvez des recettes par titre, description ou auteur
- **Design mobile-first** - Interface optimisée pour smartphone et tablette
- **Upload multiple d'images** - Ajoutez jusqu'à 3 photos de vos plats
- **Détails complets** - Ingrédients, instructions étape par étape, temps de préparation

## 🎨 Design Mobile-First

L'application adopte un design moderne inspiré des meilleures applications mobiles de cuisine :
- **Palette de couleurs chaleureuses** (orange, vert, crème)
- **Typographie élégante** (Poppins + Playfair Display)
- **Interactions tactiles optimisées**
- **Animations fluides** et transitions
- **Composants cards** avec ombres modernes
- **Navigation intuitive** avec menu hamburger

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
│   ├── index.js                    # Page d'accueil
│   ├── user-recipes.js            # Liste des recettes partagées
│   ├── share-photo.js             # Page de partage rapide de photo
│   ├── submit-recipe.js           # Page de partage de recette complète
│   ├── test-upload.js             # Page de test d'upload (debug)
│   └── recipes/
│       └── user/[id].js           # Détail d'une recette utilisateur
├── components/
│   ├── Navbar.tsx                 # Navigation responsive
│   ├── RecipeCard.js             # Carte de recette
│   ├── ShareButton.js            # Bouton de partage vers share-photo
│   └── PhotoUpload.js            # Composant d'upload de photos
├── styles/
│   ├── globals.css               # Design system global
│   ├── SharePhoto.module.css     # Styles du partage de photo
│   ├── SubmitRecipe.module.css   # Styles du formulaire de recette
│   └── RecipeDetail.module.css   # Styles des détails
└── api/
    └── recipes/                  # API de gestion des recettes
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
NEXT_PUBLIC_SUPABASE_URL=https://bokfmtmbngwifgliliqc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJva2ZtdG1ibmd3aWZnbGlsaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNzk0MTAsImV4cCI6MjA2Mzk1NTQxMH0.p-cRnf9OC4PoNyq397HUf3iZ4pZ1Q4GwKp8GCA17wAk
```

4. **Configuration Storage pour les images :**
   - Allez dans Storage > Buckets
   - Créez un bucket nommé `recipe-images`
   - Cochez "Public bucket"
   - Configurez les restrictions :
     - Types de fichiers : `image/jpeg`, `image/png`, `image/webp`
     - Taille max : 6MB
   - **URL Storage disponible :** `https://bokfmtmbngwifgliliqc.supabase.co/storage/v1/s3`

5. **Création de la table recipes :**
   - Utilisez la page `/test-upload` pour tester l'upload d'images
   - Utilisez la page `/test-recipes` pour obtenir le SQL de création
   - Ou exécutez le SQL fourni dans le dashboard Supabase

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
- Tester les opérations CRUD

## 📸 Gestion des Images

- **Upload automatique** vers Supabase Storage
- **Compression intelligente** (max 800px, qualité 80%)
- **URLs publiques** générées automatiquement
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

- [ ] Système de favoris
- [ ] Notation des recettes
- [ ] Catégories avancées
- [ ] Mode hors ligne (PWA)
- [ ] Notifications push
- [ ] Partage social direct des recettes
- [ ] Stories de cuisine éphémères
- [ ] Mode photo instantané avec géolocalisation

## 📄 Licence

**COCO** - *Où chaque recette raconte une histoire* 🍴✨