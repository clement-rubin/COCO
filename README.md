# COCO - Application Mobile de Partage de Recettes

Une application web moderne et mobile-first pour partager et découvrir des recettes délicieuses au sein d'une communauté passionnée de cuisine.

## 🍴 Fonctionnalités Principales

- **Partage de recettes** - Partagez vos créations culinaires avec la communauté
- **Navigation des recettes** - Explorez les recettes partagées par d'autres utilisateurs
- **Recherche intelligente** - Trouvez des recettes par titre, description ou auteur
- **Design mobile-first** - Interface optimisée pour smartphone et tablette
- **Upload d'images** - Ajoutez des photos alléchantes à vos recettes
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
│   ├── submit-recipe.js           # Formulaire d'ajout de recette
│   └── recipes/
│       └── user/[id].js           # Détail d'une recette utilisateur
├── components/
│   ├── Navbar.tsx                 # Navigation responsive
│   └── RecipeCard.js             # Carte de recette
├── styles/
│   ├── globals.css               # Design system global
│   ├── SubmitRecipe.module.css   # Styles du formulaire
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
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_api_supabase
```

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
- [ ] Partage social

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**COCO** - *Où chaque recette raconte une histoire* 🍴✨