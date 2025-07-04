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
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Diminuer le compteur lors de la suppression d'un like
    UPDATE recipes 
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table recipe_likes
DROP TRIGGER IF EXISTS recipe_likes_count_trigger ON recipe_likes;
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
)
WHERE id IN (
  SELECT DISTINCT recipe_id 
  FROM recipe_likes
);

-- S'assurer que les recettes sans likes ont likes_count = 0
UPDATE recipes 
SET likes_count = 0 
WHERE likes_count IS NULL 
   OR id NOT IN (SELECT DISTINCT recipe_id FROM recipe_likes);
