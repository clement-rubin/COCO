-- Script pour corriger définitivement les contraintes de la table friendships
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Supprimer TOUTES les contraintes existantes
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Supprimer toutes les contraintes foreign key sur friendships
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'friendships' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE friendships DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Contrainte supprimée: %', constraint_name;
    END LOOP;
    
    -- Supprimer les autres contraintes
    EXECUTE 'ALTER TABLE friendships DROP CONSTRAINT IF EXISTS unique_friendship';
    EXECUTE 'ALTER TABLE friendships DROP CONSTRAINT IF EXISTS no_self_friendship';
    
    RAISE NOTICE 'Toutes les contraintes supprimées';
END $$;

-- 2. Nettoyer les données incohérentes
DELETE FROM friendships WHERE user_id = friend_id;
DELETE FROM friendships WHERE user_id IS NULL OR friend_id IS NULL;

-- 3. Ajouter les bonnes contraintes pour auth.users.id
ALTER TABLE friendships 
ADD CONSTRAINT friendships_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT friendships_friend_id_fkey 
FOREIGN KEY (friend_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Contraintes de logique métier
ALTER TABLE friendships 
ADD CONSTRAINT unique_friendship 
UNIQUE (user_id, friend_id);

ALTER TABLE friendships 
ADD CONSTRAINT no_self_friendship 
CHECK (user_id != friend_id);

-- 5. Fonction get_friendship_stats corrigée pour auth.users.id
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

-- 6. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Contraintes friendships corrigées !';
  RAISE NOTICE 'Table friendships utilise maintenant auth.users.id';
  RAISE NOTICE 'Fonction get_friendship_stats mise à jour';
  RAISE NOTICE 'Vous pouvez maintenant envoyer des demandes d''amitié';
END $$;
