-- Script pour corriger les problèmes de contraintes de clé étrangère
-- Les erreurs 409 et 406 indiquent que la table friendships utilise auth.users.id
-- au lieu de profiles.id comme prévu

-- 1. Vérifier la structure actuelle
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- Vérifier si les contraintes utilisent auth.users.id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'friendships' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name IN ('user_id', 'friend_id')
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Contraintes existantes trouvées - correction en cours...';
    ELSE
        RAISE NOTICE 'Aucune contrainte trouvée - création en cours...';
    END IF;
END $$;

-- 2. Supprimer toutes les contraintes existantes
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_user_id_fkey;
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_friend_id_fkey;
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS unique_friendship;
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS no_self_friendship;

-- 3. Nettoyer les données incohérentes si nécessaire
DELETE FROM friendships 
WHERE user_id = friend_id;

-- 4. Ajouter les contraintes correctes pour auth.users.id
ALTER TABLE friendships 
ADD CONSTRAINT friendships_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT friendships_friend_id_fkey 
FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Contraintes de logique métier
ALTER TABLE friendships 
ADD CONSTRAINT unique_friendship 
UNIQUE (user_id, friend_id);

ALTER TABLE friendships 
ADD CONSTRAINT no_self_friendship 
CHECK (user_id != friend_id);

-- 6. Fonction corrigée pour rechercher des utilisateurs
CREATE OR REPLACE FUNCTION search_users_by_name(search_term text, current_user_id uuid DEFAULT NULL)
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

-- 7. Fonction pour vérifier le statut d'amitié
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

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);

-- 9. Politique de sécurité RLS (optionnel)
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships" ON friendships
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create their own friend requests" ON friendships
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're involved in" ON friendships
FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 10. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Configuration corrigée terminée !';
  RAISE NOTICE 'Les contraintes utilisent maintenant auth.users.id';
  RAISE NOTICE 'Nouvelles fonctions créées pour éviter les erreurs de syntaxe';
  RAISE NOTICE 'Politiques de sécurité RLS activées';
  RAISE NOTICE 'Index optimisés pour les performances';
END $$;
