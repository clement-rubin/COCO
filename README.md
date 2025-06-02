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
│   ├── test-recipes.js            # Page de test de la base de données
│   ├── favoris.js                 # Page des favoris
│   ├── explorer.js                # Page d'exploration des recettes
│   ├── profil.js                  # Page de profil utilisateur
│   ├── _app.js                    # Application wrapper avec navigation
│   ├── api/
│   │   └── recipes.js             # API de gestion des recettes
│   └── recipes/
│       └── user/[id].js           # Détail d'une recette utilisateur
├── components/
│   ├── Navigation.js              # Navigation de l'ancien système
│   ├── RecipeCard.js             # Carte de recette
│   ├── ShareButton.js            # Bouton de partage vers share-photo
│   ├── PhotoUpload.js            # Composant d'upload de photos
│   ├── ErrorBoundary.js          # Gestion d'erreurs React
│   ├── ErrorDisplay.js           # Affichage des erreurs
│   └── Footer.js                 # Pied de page
├── utils/
│   ├── logger.js                 # Système de logging centralisé
│   └── errorHandler.js           # Gestionnaire d'erreurs avancé
├── styles/
│   ├── globals.css               # Design system global
│   ├── SharePhoto.module.css     # Styles du partage de photo
│   ├── SubmitRecipe.module.css   # Styles du formulaire de recette
│   └── RecipeDetail.module.css   # Styles des détails
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

4. **Configuration Storage pour les images :**
   
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