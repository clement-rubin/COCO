# Système d'authentification COCO

Ce document explique le fonctionnement du système d'authentification et de gestion des utilisateurs pour l'application COCO.

## Architecture générale

Le système d'authentification utilise :

- **Supabase Auth** pour la gestion des utilisateurs
- **PostgreSQL** pour le stockage des profils utilisateurs
- **React Context** pour partager l'état d'authentification dans l'application
- **Row Level Security (RLS)** pour sécuriser les données

## Tables principales

1. **auth.users** (gérée par Supabase Auth)
   - Informations d'authentification de base (email, mot de passe hashé)
   - Métadonnées utilisateur

2. **public.profiles**
   - Extension des informations utilisateur
   - Reliée à auth.users via la colonne user_id

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  display_name text,
  bio text,
  avatar_url text,
  location text,
  website text,
  date_of_birth date,
  phone text,
  is_private boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
```

## Fonctionnalités principales

### 1. Inscription utilisateur

L'inscription utilise la fonction `signUp` dans `AuthContext.js` :

```javascript
const { signUp } = useAuth()

// Exemple d'utilisation
const { data, error } = await signUp(email, password, displayName)
```

Validations effectuées :
- Tous les champs sont requis
- Mot de passe d'au moins 6 caractères
- Nom d'utilisateur entre 2 et 30 caractères

### 2. Connexion utilisateur

```javascript
const { signIn } = useAuth()

// Exemple d'utilisation
const { data, error } = await signIn(email, password)
```

### 3. Déconnexion

```javascript
const { signOut } = useAuth() 

// Exemple d'utilisation
await signOut()
```

### 4. Réinitialisation de mot de passe

```javascript
const { resetPassword } = useAuth()

// Exemple d'utilisation
const { error } = await resetPassword(email)
```

### 5. Gestion de profil utilisateur

Utilisez le hook `useProfile` pour gérer les profils :

```javascript
import useProfile from '../hooks/useProfile'

// Dans un composant
const { profile, loading, error, updateProfile } = useProfile()

// Pour mettre à jour le profil
await updateProfile({
  display_name: "Nouveau nom",
  bio: "Ma nouvelle bio"
})
```

## Création automatique de profil

Lorsqu'un nouvel utilisateur s'inscrit, un profil est automatiquement créé grâce à un trigger PostgreSQL :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Sécurité

- **Row Level Security** est activée sur la table `profiles`
- Les utilisateurs peuvent voir tous les profils publics
- Les utilisateurs ne peuvent modifier que leur propre profil

## Pages d'authentification

1. `/signup` - Page d'inscription
2. `/login` - Page de connexion
3. `/forgot-password` - Page de récupération de mot de passe
4. `/auth/reset-password` - Page de changement de mot de passe
5. `/auth/confirm` - Page de confirmation d'email

## Flux d'inscription

1. L'utilisateur remplit le formulaire d'inscription
2. La fonction `signUp` de `AuthContext` est appelée
3. Supabase Auth enregistre l'utilisateur
4. Un email de confirmation est envoyé
5. Le trigger Postgres crée automatiquement un profil
6. L'utilisateur est redirigé vers la page de confirmation

## Bonnes pratiques

- Toujours utiliser `useAuth()` pour accéder à l'utilisateur courant
- Utiliser `useProfile()` pour gérer les informations de profil
- Gérer correctement les états de chargement et d'erreur
- Valider les entrées côté client ET côté serveur