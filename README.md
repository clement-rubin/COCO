# COCO - Cuisine & Saveurs

Un site web culinaire moderne pour partager et découvrir des recettes délicieuses.

## Fonctionnalités

- Parcourir des recettes par catégorie
- Rechercher des recettes
- Afficher les détails des recettes avec ingrédients et étapes
- Design responsive pour mobile et desktop
- Permettre aux utilisateurs de soumettre leurs propres recettes avec images
- Consulter une page dédiée affichant toutes les recettes créées par les utilisateurs
- API backend utilisant Supabase pour stocker et récupérer les données des recettes

## Technologies

- Next.js
- API Routes de Next.js (backend serverless)
- Supabase (base de données PostgreSQL)
- CSS Modules
- Vercel ou Netlify (déploiement)

## Structure du projet

```
COCO/
├── components/     # Composants réutilisables
├── pages/          # Routes de l'application
├── public/         # Fichiers statiques
├── styles/         # Feuilles de style CSS modules
└── ...
```

## Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Déploiement sur Vercel

1. Créez un compte sur [Vercel](https://vercel.com)
2. Connectez votre dépôt GitHub
3. Importez ce projet
4. Vercel détectera automatiquement les configurations Next.js et déploiera votre site

## Déploiement sur Netlify

1. Créez un compte sur [Netlify](https://netlify.com)
2. Connectez votre dépôt GitHub
3. Importez ce projet
4. Netlify détectera automatiquement les configurations Next.js et déploiera votre site

## Configuration de Supabase

1. Créez un compte sur [Supabase](https://supabase.io)
2. Créez un nouveau projet
3. Copiez l'URL de votre projet et la clé API
4. Remplissez le fichier `.env.local` à la racine du projet avec vos informations Supabase :
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_api_supabase
    ```

## Licence

MIT License

Copyright (c) 2023 COCO - Cuisine & Saveurs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.