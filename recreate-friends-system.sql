-- Script pour recréer complètement le système d'amis avec une structure cohérente
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Supprimer complètement les tables existantes
DROP TABLE IF EXISTS friendships CASCADE;
DROP VIEW IF EXISTS friendship_view CASCADE;

-- 2. Vérifier que la table profiles existe et a la bonne structure
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  phone TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT display_name_length CHECK (length(display_name) >= 2 AND length(display_name) <= 30),
  CONSTRAINT display_name_format CHECK (display_name ~ '^[a-zA-ZÀ-ÿ0-9_\\-\\s]+$')
);

-- 3. Recréer la table friendships avec UNIQUEMENT des références à auth.users.id
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- 4. Index pour les performances
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_display_name ON profiles(display_name);

-- 5. Extension pour recherche floue
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- 6. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 7. Politiques pour profiles
DROP POLICY IF EXISTS "Permettre lecture publique profils" ON profiles;
DROP POLICY IF EXISTS "Permettre mise à jour profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre insertion profil utilisateur" ON profiles;
DROP POLICY IF EXISTS "Permettre suppression profil utilisateur" ON profiles;

CREATE POLICY "Permettre lecture publique profils" ON profiles 
FOR SELECT USING (NOT is_private OR auth.uid() = user_id);

CREATE POLICY "Permettre mise à jour profil utilisateur" ON profiles 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Permettre insertion profil utilisateur" ON profiles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permettre suppression profil utilisateur" ON profiles 
FOR DELETE USING (auth.uid() = user_id);

-- 8. Politiques pour friendships
DROP POLICY IF EXISTS "Voir ses amitiés" ON friendships;
DROP POLICY IF EXISTS "Créer demande amitié" ON friendships;
DROP POLICY IF EXISTS "Modifier ses amitiés" ON friendships;
DROP POLICY IF EXISTS "Supprimer ses amitiés" ON friendships;

CREATE POLICY "Voir ses amitiés" ON friendships 
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Créer demande amitié" ON friendships 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier ses amitiés" ON friendships 
FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Supprimer ses amitiés" ON friendships 
FOR DELETE USING (auth.uid() = friend_id OR auth.uid() = user_id);

-- 9. Fonction pour créer automatiquement un profil
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 11. Fonction de recherche simplifiée (utilise user_id directement)
CREATE OR REPLACE FUNCTION search_users_simple(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.created_at
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND p.display_name ILIKE '%' || search_term || '%'
  ORDER BY p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 12. Fonction pour obtenir les amis d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_friends_simple(target_user_id uuid)
RETURNS TABLE (
  friendship_id uuid,
  friend_user_id uuid,
  friend_display_name text,
  friend_avatar_url text,
  friend_bio text,
  friendship_status text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as friendship_id,
    p.user_id as friend_user_id,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    p.bio as friend_bio,
    f.status as friendship_status,
    f.created_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user_id = target_user_id THEN p.user_id = f.friend_id
      ELSE p.user_id = f.user_id
    END
  )
  WHERE 
    (f.user_id = target_user_id OR f.friend_id = target_user_id)
    AND f.status = 'accepted'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 13. Fonction pour obtenir les demandes d'amitié en attente
CREATE OR REPLACE FUNCTION get_pending_friend_requests(target_user_id uuid)
RETURNS TABLE (
  friendship_id uuid,
  requester_user_id uuid,
  requester_display_name text,
  requester_avatar_url text,
  requester_bio text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id as friendship_id,
    p.user_id as requester_user_id,
    p.display_name as requester_display_name,
    p.avatar_url as requester_avatar_url,
    p.bio as requester_bio,
    f.created_at
  FROM friendships f
  JOIN profiles p ON p.user_id = f.user_id
  WHERE 
    f.friend_id = target_user_id
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 14. Fonction pour vérifier le statut d'amitié entre deux utilisateurs
CREATE OR REPLACE FUNCTION check_friendship_status(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  status text,
  friendship_id uuid,
  is_requester boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.status,
    f.id as friendship_id,
    (f.user_id = user1_id) as is_requester
  FROM friendships f
  WHERE 
    (f.user_id = user1_id AND f.friend_id = user2_id) OR
    (f.user_id = user2_id AND f.friend_id = user1_id)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 15. Fonction pour obtenir des statistiques d'amitié
CREATE OR REPLACE FUNCTION get_friendship_stats(target_user_id uuid)
RETURNS TABLE (
  friends_count bigint,
  pending_sent bigint,
  pending_received bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_user_id OR friend_id = target_user_id) 
     AND status = 'accepted')::bigint as friends_count,
    (SELECT COUNT(*) FROM friendships 
     WHERE user_id = target_user_id AND status = 'pending')::bigint as pending_sent,
    (SELECT COUNT(*) FROM friendships 
     WHERE friend_id = target_user_id AND status = 'pending')::bigint as pending_received;
END;
$$ LANGUAGE plpgsql;

-- 16. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Système d''amis complètement recréé !';
  RAISE NOTICE 'Structure cohérente : friendships utilise auth.users.id uniquement';
  RAISE NOTICE 'Fonctions SQL créées pour éviter les ambiguïtés de jointure';
  RAISE NOTICE 'Politiques RLS configurées';
  RAISE NOTICE 'Index optimisés pour les performances';
  RAISE NOTICE 'Prêt à être utilisé !';
END $$;
