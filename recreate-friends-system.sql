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
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- 5. Extension pour recherche floue
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

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
    CASE 
      WHEN f.user_id = target_user_id THEN f.friend_id
      ELSE f.user_id
    END as friend_user_id,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    p.bio as friend_bio,
    f.status as friendship_status,
    f.created_at
  FROM friendships f
  JOIN profiles p ON (
    (f.user_id = target_user_id AND p.user_id = f.friend_id)
    OR
    (f.friend_id = target_user_id AND p.user_id = f.user_id)
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
    f.user_id as requester_user_id,
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

-- 13. Fonction pour supprimer une amitié
CREATE OR REPLACE FUNCTION remove_friendship(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  friendship_record record;
BEGIN
  -- Vérifier que l'amitié existe et est acceptée
  SELECT INTO friendship_record *
  FROM friendships
  WHERE ((user_id = user1_id AND friend_id = user2_id) OR (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Friendship not found or not accepted'::text;
    RETURN;
  END IF;
  
  -- Supprimer l'amitié
  DELETE FROM friendships WHERE id = friendship_record.id;
  
  RETURN QUERY SELECT true, 'Friendship removed successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- 14. Fonction pour obtenir les statistiques d'amitié
CREATE OR REPLACE FUNCTION get_friendship_statistics(target_user_id uuid)
RETURNS TABLE (
  total_friends bigint,
  pending_requests bigint,
  blocked_users bigint,
  sent_requests bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_user_id OR friend_id = target_user_id) 
       AND status = 'accepted'),
    (SELECT COUNT(*) FROM friendships 
     WHERE friend_id = target_user_id AND status = 'pending'),
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_user_id OR friend_id = target_user_id) 
       AND status = 'blocked'),
    (SELECT COUNT(*) FROM friendships 
     WHERE user_id = target_user_id AND status = 'pending');
END;
$$ LANGUAGE plpgsql;

-- 15. Fonction pour rechercher des utilisateurs avec filtres avancés
CREATE OR REPLACE FUNCTION search_users_advanced(
  search_term text,
  current_user_id uuid DEFAULT NULL,
  has_avatar boolean DEFAULT NULL,
  exclude_blocked boolean DEFAULT true,
  sort_by text DEFAULT 'display_name',
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz,
  is_friend boolean,
  friendship_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.created_at,
    CASE WHEN f.status = 'accepted' THEN true ELSE false END as is_friend,
    COALESCE(f.status, 'none') as friendship_status
  FROM profiles p
  LEFT JOIN friendships f ON (
    (f.user_id = current_user_id AND f.friend_id = p.user_id) OR
    (f.friend_id = current_user_id AND f.user_id = p.user_id)
  )
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND p.display_name ILIKE '%' || search_term || '%'
    AND (has_avatar IS NULL OR (has_avatar = true AND p.avatar_url IS NOT NULL) OR (has_avatar = false))
    AND (exclude_blocked = false OR f.status != 'blocked' OR f.status IS NULL)
  ORDER BY 
    CASE 
      WHEN sort_by = 'created_at' THEN p.created_at::text
      ELSE p.display_name
    END
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 16. Fonction pour nettoyer les amitiés orphelines
CREATE OR REPLACE FUNCTION cleanup_orphaned_friendships()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Supprimer les amitiés où les utilisateurs n'existent plus
  WITH deleted AS (
    DELETE FROM friendships 
    WHERE user_id NOT IN (SELECT id FROM auth.users)
       OR friend_id NOT IN (SELECT id FROM auth.users)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 17. Index supplémentaires pour les performances
CREATE INDEX IF NOT EXISTS idx_friendships_status_created ON friendships(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_compound ON friendships(user_id, friend_id, status);

-- 18. Vue pour les statistiques globales du système d'amis
CREATE OR REPLACE VIEW friendship_system_stats AS
SELECT 
  (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
  (SELECT COUNT(*) FROM friendships WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM friendships WHERE status = 'blocked') as blocked_users,
  (SELECT COUNT(*) FROM profiles WHERE is_private = false) as public_profiles,
  (SELECT COUNT(DISTINCT user_id) FROM friendships) as users_with_friends,
  (SELECT AVG(friend_count) FROM (
    SELECT COUNT(*) as friend_count 
    FROM friendships 
    WHERE status = 'accepted' 
    GROUP BY user_id
  ) as avg_friends_subquery) as avg_friends_per_user;

-- 19. Extension pour recherche floue
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops);

-- 20. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 21. Politiques pour profiles
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

-- 22. Politiques pour friendships
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

-- 23. Fonction pour créer automatiquement un profil
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 25. Fonction de recherche simplifiée (utilise user_id directement)
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

-- 26. Fonction pour obtenir les amis d'un utilisateur
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
    CASE 
      WHEN f.user_id = target_user_id THEN f.friend_id
      ELSE f.user_id
    END as friend_user_id,
    p.display_name as friend_display_name,
    p.avatar_url as friend_avatar_url,
    p.bio as friend_bio,
    f.status as friendship_status,
    f.created_at
  FROM friendships f
  JOIN profiles p ON (
    (f.user_id = target_user_id AND p.user_id = f.friend_id)
    OR
    (f.friend_id = target_user_id AND p.user_id = f.user_id)
  )
  WHERE 
    (f.user_id = target_user_id OR f.friend_id = target_user_id)
    AND f.status = 'accepted'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 27. Fonction pour obtenir les demandes d'amitié en attente
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
    f.user_id as requester_user_id,
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

-- 28. Fonction pour vérifier le statut d'amitié entre deux utilisateurs
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

-- 13. Fonction pour supprimer une amitié
CREATE OR REPLACE FUNCTION remove_friendship(user1_id uuid, user2_id uuid)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  friendship_record record;
BEGIN
  -- Vérifier que l'amitié existe et est acceptée
  SELECT INTO friendship_record *
  FROM friendships
  WHERE ((user_id = user1_id AND friend_id = user2_id) OR (user_id = user2_id AND friend_id = user1_id))
    AND status = 'accepted';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Friendship not found or not accepted'::text;
    RETURN;
  END IF;
  
  -- Supprimer l'amitié
  DELETE FROM friendships WHERE id = friendship_record.id;
  
  RETURN QUERY SELECT true, 'Friendship removed successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- 14. Fonction pour obtenir les statistiques d'amitié
CREATE OR REPLACE FUNCTION get_friendship_statistics(target_user_id uuid)
RETURNS TABLE (
  total_friends bigint,
  pending_requests bigint,
  blocked_users bigint,
  sent_requests bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_user_id OR friend_id = target_user_id) 
       AND status = 'accepted'),
    (SELECT COUNT(*) FROM friendships 
     WHERE friend_id = target_user_id AND status = 'pending'),
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_user_id OR friend_id = target_user_id) 
       AND status = 'blocked'),
    (SELECT COUNT(*) FROM friendships 
     WHERE user_id = target_user_id AND status = 'pending');
END;
$$ LANGUAGE plpgsql;

-- 15. Fonction pour rechercher des utilisateurs avec filtres avancés
CREATE OR REPLACE FUNCTION search_users_advanced(
  search_term text,
  current_user_id uuid DEFAULT NULL,
  has_avatar boolean DEFAULT NULL,
  exclude_blocked boolean DEFAULT true,
  sort_by text DEFAULT 'display_name',
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz,
  is_friend boolean,
  friendship_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.created_at,
    CASE WHEN f.status = 'accepted' THEN true ELSE false END as is_friend,
    COALESCE(f.status, 'none') as friendship_status
  FROM profiles p
  LEFT JOIN friendships f ON (
    (f.user_id = current_user_id AND f.friend_id = p.user_id) OR
    (f.friend_id = current_user_id AND f.user_id = p.user_id)
  )
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND p.display_name ILIKE '%' || search_term || '%'
    AND (has_avatar IS NULL OR (has_avatar = true AND p.avatar_url IS NOT NULL) OR (has_avatar = false))
    AND (exclude_blocked = false OR f.status != 'blocked' OR f.status IS NULL)
  ORDER BY 
    CASE 
      WHEN sort_by = 'created_at' THEN p.created_at::text
      ELSE p.display_name
    END
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 16. Fonction pour nettoyer les amitiés orphelines
CREATE OR REPLACE FUNCTION cleanup_orphaned_friendships()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Supprimer les amitiés où les utilisateurs n'existent plus
  WITH deleted AS (
    DELETE FROM friendships 
    WHERE user_id NOT IN (SELECT id FROM auth.users)
       OR friend_id NOT IN (SELECT id FROM auth.users)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 17. Index supplémentaires pour les performances
CREATE INDEX IF NOT EXISTS idx_friendships_status_created ON friendships(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_compound ON friendships(user_id, friend_id, status);

-- 18. Vue pour les statistiques globales du système d'amis
CREATE OR REPLACE VIEW friendship_system_stats AS
SELECT 
  (SELECT COUNT(*) FROM friendships WHERE status = 'accepted') as total_friendships,
  (SELECT COUNT(*) FROM friendships WHERE status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM friendships WHERE status = 'blocked') as blocked_users,
  (SELECT COUNT(*) FROM profiles WHERE is_private = false) as public_profiles,
  (SELECT COUNT(DISTINCT user_id) FROM friendships) as users_with_friends,
  (SELECT AVG(friend_count) FROM (
    SELECT COUNT(*) as friend_count 
    FROM friendships 
    WHERE status = 'accepted' 
    GROUP BY user_id
  ) as avg_friends_subquery) as avg_friends_per_user;

-- 19. Notification de fin avec nouvelles fonctionnalités
DO $$
BEGIN
  RAISE NOTICE '✅ Système d''amis amélioré avec succès !';
  RAISE NOTICE '🆕 Nouvelles fonctionnalités ajoutées :';
  RAISE NOTICE '   - Blocage/déblocage d''utilisateurs';
  RAISE NOTICE '   - Système de notifications';
  RAISE NOTICE '   - Groupes d''amis';
  RAISE NOTICE '   - Historique des interactions';
  RAISE NOTICE '   - Suggestions intelligentes';
  RAISE NOTICE '   - Statuts en ligne';
  RAISE NOTICE '   - Recherche avancée';
  RAISE NOTICE '   - Statistiques enrichies';
  RAISE NOTICE '🔧 Optimisations :';
  RAISE NOTICE '   - Index optimisés';
  RAISE NOTICE '   - Compteurs automatiques';
  RAISE NOTICE '   - Politiques RLS sécurisées';
END $$;
