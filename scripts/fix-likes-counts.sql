-- Script pour corriger les compteurs de likes existants

-- 1. Vérifier les incohérences actuelles
SELECT 
  r.id,
  r.title,
  r.likes_count as stored_count,
  COUNT(rl.id) as actual_count,
  (r.likes_count - COUNT(rl.id)) as difference
FROM recipes r
LEFT JOIN recipe_likes rl ON r.id = rl.recipe_id
GROUP BY r.id, r.title, r.likes_count
HAVING r.likes_count != COUNT(rl.id)
ORDER BY ABS(r.likes_count - COUNT(rl.id)) DESC;

-- 2. Corriger tous les compteurs de likes
UPDATE recipes 
SET likes_count = (
  SELECT COUNT(*) 
  FROM recipe_likes 
  WHERE recipe_likes.recipe_id = recipes.id
),
updated_at = now();

-- 3. Vérifier que la correction a fonctionné
SELECT 
  COUNT(*) as recipes_with_inconsistent_counts
FROM recipes r
LEFT JOIN (
  SELECT recipe_id, COUNT(*) as actual_count
  FROM recipe_likes
  GROUP BY recipe_id
) rl ON r.id = rl.recipe_id
WHERE r.likes_count != COALESCE(rl.actual_count, 0);

-- 4. Afficher les statistiques finales
SELECT 
  COUNT(*) as total_recipes,
  SUM(likes_count) as total_likes,
  AVG(likes_count) as avg_likes_per_recipe,
  MAX(likes_count) as max_likes
FROM recipes;

-- Message de confirmation
DO $$
DECLARE
  total_recipes INTEGER;
  total_likes INTEGER;
BEGIN
  SELECT COUNT(*), SUM(likes_count) INTO total_recipes, total_likes FROM recipes;
  RAISE NOTICE '✅ Correction terminée:';
  RAISE NOTICE '📊 % recettes mises à jour', total_recipes;
  RAISE NOTICE '❤️ % likes au total', total_likes;
END $$;
