-- Script pour créer le système de likes des recettes
-- Version simple et fonctionnelle

-- Table pour stocker les likes
CREATE TABLE IF NOT EXISTS recipe_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(recipe_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_user_id ON recipe_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_created_at ON recipe_likes(created_at DESC);

-- Politiques RLS (Row Level Security)
ALTER TABLE recipe_likes ENABLE ROW LEVEL SECURITY;

-- Politique pour lire les likes (public)
CREATE POLICY "Allow public read access to recipe likes" ON recipe_likes
  FOR SELECT USING (true);

-- Politique pour créer un like (utilisateurs authentifiés seulement)
CREATE POLICY "Allow users to create their own likes" ON recipe_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique pour supprimer un like (propriétaire seulement)
CREATE POLICY "Allow users to delete their own likes" ON recipe_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Vue pour obtenir le nombre de likes par recette
CREATE OR REPLACE VIEW recipe_likes_count AS
SELECT 
  recipe_id,
  COUNT(*) as likes_count
FROM recipe_likes
GROUP BY recipe_id;

-- Fonction pour obtenir les statistiques de likes d'une recette
CREATE OR REPLACE FUNCTION get_recipe_likes_stats(recipe_uuid UUID)
RETURNS JSON AS $$
DECLARE
  likes_count INTEGER := 0;
  user_has_liked BOOLEAN := false;
BEGIN
  -- Compter le nombre total de likes
  SELECT COUNT(*) INTO likes_count
  FROM recipe_likes
  WHERE recipe_id = recipe_uuid;
  
  -- Vérifier si l'utilisateur actuel a liké
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM recipe_likes
      WHERE recipe_id = recipe_uuid AND user_id = auth.uid()
    ) INTO user_has_liked;
  END IF;
  
  RETURN json_build_object(
    'likes_count', likes_count,
    'user_has_liked', user_has_liked
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les likes de plusieurs recettes
CREATE OR REPLACE FUNCTION get_multiple_recipes_likes(recipe_ids UUID[])
RETURNS TABLE(recipe_id UUID, likes_count INTEGER, user_has_liked BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recipe_id,
    COALESCE(like_counts.count, 0)::INTEGER as likes_count,
    CASE 
      WHEN auth.uid() IS NOT NULL 
      THEN EXISTS(
        SELECT 1 FROM recipe_likes rl 
        WHERE rl.recipe_id = r.id AND rl.user_id = auth.uid()
      )
      ELSE false 
    END as user_has_liked
  FROM unnest(recipe_ids) r(id)
  LEFT JOIN (
    SELECT recipe_id, COUNT(*) as count
    FROM recipe_likes
    WHERE recipe_id = ANY(recipe_ids)
    GROUP BY recipe_id
  ) like_counts ON like_counts.recipe_id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour nettoyer automatiquement les likes d'une recette supprimée
CREATE OR REPLACE FUNCTION cleanup_recipe_likes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM recipe_likes WHERE recipe_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_recipe_likes
  BEFORE DELETE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_recipe_likes();

COMMENT ON TABLE recipe_likes IS 'Table pour stocker les likes des recettes par les utilisateurs';
COMMENT ON FUNCTION get_recipe_likes_stats IS 'Fonction pour obtenir les statistiques de likes d''une recette';
COMMENT ON FUNCTION get_multiple_recipes_likes IS 'Fonction pour obtenir les likes de plusieurs recettes en une seule requête';
