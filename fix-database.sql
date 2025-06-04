-- Configuration corrigée pour correspondre au schéma existant
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Vérifier et corriger les contraintes de la table friendships
-- La table utilise profiles.id comme référence, pas auth.users.id

-- Supprimer les contraintes incorrectes si elles existent
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_user_id_fkey;
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey;

-- Ajouter les bonnes contraintes
ALTER TABLE friendships 
ADD CONSTRAINT friendships_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT friendships_friend_id_fkey 
FOREIGN KEY (friend_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Ajouter une contrainte unique pour éviter les doublons
ALTER TABLE friendships 
ADD CONSTRAINT unique_friendship 
UNIQUE (user_id, friend_id);

-- 3. Ajouter une contrainte pour empêcher l'auto-amitié
ALTER TABLE friendships 
ADD CONSTRAINT no_self_friendship 
CHECK (user_id != friend_id);

-- 4. Fonction pour rechercher des profils (corrigée)
CREATE OR REPLACE FUNCTION search_profiles_corrected(search_term text, current_user_id uuid DEFAULT NULL)
RETURNS TABLE (
  profile_id uuid,
  user_id uuid,
  display_name text,
  bio text,
  avatar_url text,
  similarity_score real
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    p.user_id,
    p.display_name,
    p.bio,
    p.avatar_url,
    0.5 as similarity_score
  FROM profiles p
  WHERE 
    p.is_private = false 
    AND (current_user_id IS NULL OR p.user_id != current_user_id)
    AND p.display_name ILIKE '%' || search_term || '%'
  ORDER BY p.display_name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour obtenir les statistiques d'amitié
CREATE OR REPLACE FUNCTION get_friendship_stats(target_user_id uuid)
RETURNS TABLE (
  friends_count bigint,
  pending_sent bigint,
  pending_received bigint
) AS $$
DECLARE
  target_profile_id uuid;
BEGIN
  -- Obtenir l'ID du profil
  SELECT id INTO target_profile_id 
  FROM profiles 
  WHERE user_id = target_user_id;
  
  IF target_profile_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM friendships 
     WHERE (user_id = target_profile_id OR friend_id = target_profile_id) 
     AND status = 'accepted')::bigint as friends_count,
    (SELECT COUNT(*) FROM friendships 
     WHERE user_id = target_profile_id AND status = 'pending')::bigint as pending_sent,
    (SELECT COUNT(*) FROM friendships 
     WHERE friend_id = target_profile_id AND status = 'pending')::bigint as pending_received;
END;
$$ LANGUAGE plpgsql;

-- 6. Vue pour simplifier les requêtes d'amitié
CREATE OR REPLACE VIEW friendship_view AS
SELECT 
  f.id,
  f.status,
  f.created_at,
  f.updated_at,
  p1.user_id as requester_user_id,
  p1.display_name as requester_name,
  p1.avatar_url as requester_avatar,
  p2.user_id as target_user_id,
  p2.display_name as target_name,
  p2.avatar_url as target_avatar
FROM friendships f
JOIN profiles p1 ON f.user_id = p1.id
JOIN profiles p2 ON f.friend_id = p2.id;

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_status ON friendships(friend_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON profiles(user_id);

-- 8. Notification de fin
DO $$
BEGIN
  RAISE NOTICE 'Configuration corrigée terminée !';
  RAISE NOTICE 'Les contraintes friendships utilisent maintenant profiles.id';
  RAISE NOTICE 'Nouvelles fonctions et vues créées pour faciliter les requêtes';
  RAISE NOTICE 'Index optimisés pour les performances';
END $$;
