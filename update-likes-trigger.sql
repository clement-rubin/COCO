-- Script pour créer un trigger qui met à jour automatiquement likes_count
-- dans la table recipes quand des likes sont ajoutés/supprimés
-- Exécutez ce script dans SQL Editor de Supabase

-- Fonction pour mettre à jour le compteur de likes
CREATE OR REPLACE FUNCTION update_recipe_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Augmenter le compteur lors de l'ajout d'un like
    UPDATE recipes 
    SET likes_count = COALESCE(likes_count, 0) + 1,
        updated_at = NOW()
    WHERE id = NEW.recipe_id;
    
    -- Log pour debug
    RAISE LOG 'Like added to recipe %, new count: %', NEW.recipe_id, (
      SELECT likes_count FROM recipes WHERE id = NEW.recipe_id
    );
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Diminuer le compteur lors de la suppression d'un like
    UPDATE recipes 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.recipe_id;
    
    -- Log pour debug
    RAISE LOG 'Like removed from recipe %, new count: %', OLD.recipe_id, (
      SELECT likes_count FROM recipes WHERE id = OLD.recipe_id
    );
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS recipe_likes_count_trigger ON recipe_likes;

-- Créer le trigger sur la table recipe_likes
CREATE TRIGGER recipe_likes_count_trigger
  AFTER INSERT OR DELETE ON recipe_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_likes_count();

-- Recalculer les compteurs existants pour s'assurer de la cohérence
UPDATE recipes 
SET likes_count = (
  SELECT COUNT(*) 
  FROM recipe_likes 
  WHERE recipe_likes.recipe_id = recipes.id
),
updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT recipe_id 
  FROM recipe_likes
);

-- S'assurer que les recettes sans likes ont likes_count = 0
UPDATE recipes 
SET likes_count = 0,
    updated_at = NOW()
WHERE likes_count IS NULL 
   OR id NOT IN (SELECT DISTINCT recipe_id FROM recipe_likes);

-- Fonction utilitaire pour vérifier la cohérence des compteurs
CREATE OR REPLACE FUNCTION check_likes_count_consistency()
RETURNS TABLE (
  recipe_id UUID,
  stored_count INTEGER,
  actual_count BIGINT,
  is_consistent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recipe_id,
    r.likes_count as stored_count,
    COALESCE(like_counts.actual_count, 0) as actual_count,
    (r.likes_count = COALESCE(like_counts.actual_count, 0)) as is_consistent
  FROM recipes r
  LEFT JOIN (
    SELECT 
      recipe_id,
      COUNT(*) as actual_count
    FROM recipe_likes
    GROUP BY recipe_id
  ) like_counts ON like_counts.recipe_id = r.id
  WHERE r.likes_count != COALESCE(like_counts.actual_count, 0)
  ORDER BY r.id;
END;
$$ LANGUAGE plpgsql;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de comptage automatique créé avec succès !';
  RAISE NOTICE '📊 Compteurs recalculés pour cohérence';
  RAISE NOTICE '🔍 Utilisez check_likes_count_consistency() pour vérifier';
END $$;
