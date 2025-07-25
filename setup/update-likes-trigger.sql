-- Script pour créer un trigger qui met à jour automatiquement likes_count
-- dans la table recipes quand des likes sont ajoutés/supprimés

-- Fonction pour mettre à jour le compteur de likes
CREATE OR REPLACE FUNCTION update_recipe_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas d'insertion d'un like
  IF TG_OP = 'INSERT' THEN
    UPDATE recipes 
    SET likes_count = likes_count + 1,
        updated_at = now()
    WHERE id = NEW.recipe_id;
    
    RAISE LOG 'Recipe % likes count incremented after like insertion', NEW.recipe_id;
    RETURN NEW;
  END IF;
  
  -- Cas de suppression d'un like
  IF TG_OP = 'DELETE' THEN
    UPDATE recipes 
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = now()
    WHERE id = OLD.recipe_id;
    
    RAISE LOG 'Recipe % likes count decremented after like deletion', OLD.recipe_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_update_recipe_likes_count ON recipe_likes;

-- Créer le trigger pour les insertions et suppressions
CREATE TRIGGER trigger_update_recipe_likes_count
  AFTER INSERT OR DELETE ON recipe_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_likes_count();

-- Recalculer tous les compteurs existants pour assurer la cohérence
UPDATE recipes 
SET likes_count = (
  SELECT COUNT(*) 
  FROM recipe_likes 
  WHERE recipe_likes.recipe_id = recipes.id
),
updated_at = now();

-- Fonction utilitaire pour vérifier la cohérence des compteurs
CREATE OR REPLACE FUNCTION check_likes_count_consistency()
RETURNS TABLE(recipe_id UUID, stored_count INTEGER, actual_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recipe_id,
    r.likes_count as stored_count,
    COALESCE(like_counts.actual_count, 0) as actual_count
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
