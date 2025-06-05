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

-- 16. Table pour les notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'friend_rejected', 'friend_blocked', 'system', 'recipe_shared')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Table pour l'historique des interactions
CREATE TABLE IF NOT EXISTS interaction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('profile_view', 'recipe_view', 'friend_request', 'message', 'block', 'unblock')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Table pour les groupes d'amis
CREATE TABLE IF NOT EXISTS friend_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 19. Table de liaison pour les membres des groupes
CREATE TABLE IF NOT EXISTS friend_group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, friend_user_id)
);

-- 20. Mise à jour de la table profiles pour inclure last_seen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_friends_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_recipes_count INTEGER DEFAULT 0;

-- 21. Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_history_user_id ON interaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_target_user ON interaction_history(target_user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_type ON interaction_history(interaction_type);
CREATE INDEX IF NOT EXISTS idx_friend_groups_user_id ON friend_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_group_id ON friend_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);

-- 22. Politiques RLS pour les nouvelles tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_group_members ENABLE ROW LEVEL SECURITY;

-- Politiques pour notifications
CREATE POLICY "Voir ses notifications" ON notifications 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Créer notification" ON notifications 
FOR INSERT WITH CHECK (true); -- Les notifications peuvent être créées par le système

CREATE POLICY "Modifier ses notifications" ON notifications 
FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour interaction_history
CREATE POLICY "Voir son historique" ON interaction_history 
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Créer interaction" ON interaction_history 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour friend_groups
CREATE POLICY "Voir ses groupes" ON friend_groups 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Créer ses groupes" ON friend_groups 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier ses groupes" ON friend_groups 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer ses groupes" ON friend_groups 
FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour friend_group_members
CREATE POLICY "Voir membres de ses groupes" ON friend_group_members 
FOR SELECT USING (EXISTS (
  SELECT 1 FROM friend_groups fg WHERE fg.id = group_id AND fg.user_id = auth.uid()
));

CREATE POLICY "Ajouter membres à ses groupes" ON friend_group_members 
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM friend_groups fg WHERE fg.id = group_id AND fg.user_id = auth.uid()
));

CREATE POLICY "Supprimer membres de ses groupes" ON friend_group_members 
FOR DELETE USING (EXISTS (
  SELECT 1 FROM friend_groups fg WHERE fg.id = group_id AND fg.user_id = auth.uid()
));

-- 23. Fonction pour obtenir les utilisateurs bloqués
CREATE OR REPLACE FUNCTION get_blocked_users(user_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  blocked_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    f.created_at as blocked_at
  FROM friendships f
  JOIN profiles p ON p.user_id = f.friend_id
  WHERE 
    f.user_id = user_id_param
    AND f.status = 'blocked'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 24. Fonction pour les suggestions d'amis intelligentes
CREATE OR REPLACE FUNCTION get_intelligent_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  location text,
  mutual_friends_count bigint,
  similarity_score numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH user_friends AS (
    SELECT DISTINCT
      CASE 
        WHEN f.user_id = user_id_param THEN f.friend_id
        ELSE f.user_id
      END as friend_id
    FROM friendships f
    WHERE 
      (f.user_id = user_id_param OR f.friend_id = user_id_param)
      AND f.status = 'accepted'
  ),
  mutual_friends AS (
    SELECT 
      p.user_id,
      COUNT(uf.friend_id) as mutual_count
    FROM profiles p
    LEFT JOIN friendships f2 ON (
      (f2.user_id = p.user_id OR f2.friend_id = p.user_id)
      AND f2.status = 'accepted'
    )
    LEFT JOIN user_friends uf ON (
      CASE 
        WHEN f2.user_id = p.user_id THEN f2.friend_id
        ELSE f2.user_id
      END = uf.friend_id
    )
    WHERE 
      p.user_id != user_id_param
      AND p.is_private = false
      AND NOT EXISTS (
        SELECT 1 FROM friendships f3 
        WHERE (f3.user_id = user_id_param AND f3.friend_id = p.user_id)
           OR (f3.user_id = p.user_id AND f3.friend_id = user_id_param)
      )
    GROUP BY p.user_id
  )
  SELECT 
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.location,
    COALESCE(mf.mutual_count, 0) as mutual_friends_count,
    (COALESCE(mf.mutual_count, 0) * 0.7 + 
     CASE WHEN p.location IS NOT NULL THEN 0.2 ELSE 0 END +
     CASE WHEN p.avatar_url IS NOT NULL THEN 0.1 ELSE 0 END) as similarity_score
  FROM profiles p
  LEFT JOIN mutual_friends mf ON mf.user_id = p.user_id
  WHERE 
    p.user_id != user_id_param
    AND p.is_private = false
  ORDER BY similarity_score DESC, p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- 25. Fonction pour créer un groupe d'amis par défaut
CREATE OR REPLACE FUNCTION create_default_friend_group(user_id_param uuid)
RETURNS uuid AS $$
DECLARE
  group_id uuid;
BEGIN
  INSERT INTO friend_groups (user_id, name, description, is_default)
  VALUES (user_id_param, 'Amis proches', 'Groupe par défaut pour vos amis les plus proches', true)
  RETURNING id INTO group_id;
  
  RETURN group_id;
END;
$$ LANGUAGE plpgsql;

-- 26. Fonction pour obtenir les statistiques avancées d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_advanced_stats(target_user_id uuid)
RETURNS TABLE (
  friends_count bigint,
  pending_sent bigint,
  pending_received bigint,
  blocked_count bigint,
  groups_count bigint,
  unread_notifications bigint,
  profile_views_last_week bigint,
  is_online boolean
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
     WHERE friend_id = target_user_id AND status = 'pending')::bigint as pending_received,
    (SELECT COUNT(*) FROM friendships 
     WHERE user_id = target_user_id AND status = 'blocked')::bigint as blocked_count,
    (SELECT COUNT(*) FROM friend_groups 
     WHERE user_id = target_user_id)::bigint as groups_count,
    (SELECT COUNT(*) FROM notifications 
     WHERE user_id = target_user_id AND is_read = false)::bigint as unread_notifications,
    (SELECT COUNT(*) FROM interaction_history 
     WHERE target_user_id = target_user_id 
     AND interaction_type = 'profile_view'
     AND created_at > NOW() - INTERVAL '7 days')::bigint as profile_views_last_week,
    (SELECT last_seen > NOW() - INTERVAL '5 minutes' FROM profiles 
     WHERE user_id = target_user_id)::boolean as is_online;
END;
$$ LANGUAGE plpgsql;

-- 27. Trigger pour mettre à jour automatiquement les compteurs
CREATE OR REPLACE FUNCTION update_profile_counters()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'friendships' THEN
    -- Mettre à jour le compteur d'amis
    UPDATE profiles SET total_friends_count = (
      SELECT COUNT(*) FROM friendships 
      WHERE (user_id = NEW.user_id OR friend_id = NEW.user_id) 
      AND status = 'accepted'
    ) WHERE user_id = NEW.user_id;
    
    UPDATE profiles SET total_friends_count = (
      SELECT COUNT(*) FROM friendships 
      WHERE (user_id = NEW.friend_id OR friend_id = NEW.friend_id) 
      AND status = 'accepted'
    ) WHERE user_id = NEW.friend_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER friendship_counter_trigger
  AFTER INSERT OR UPDATE OR DELETE ON friendships
  FOR EACH ROW EXECUTE PROCEDURE update_profile_counters();

-- 28. Notification de fin avec nouvelles fonctionnalités
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
