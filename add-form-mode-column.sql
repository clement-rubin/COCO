-- Script pour ajouter la colonne form_mode à la table recipes
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Ajouter la colonne form_mode à la table recipes
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS form_mode TEXT DEFAULT 'complete' 
CHECK (form_mode IN ('quick', 'complete'));

-- 2. Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN recipes.form_mode IS 'Mode de création de la recette: quick (partage rapide) ou complete (recette complète)';

-- 3. Mettre à jour les recettes existantes pour avoir le mode 'complete' par défaut
UPDATE recipes 
SET form_mode = 'complete' 
WHERE form_mode IS NULL;

-- 4. Créer un index pour améliorer les performances des requêtes par mode
CREATE INDEX IF NOT EXISTS idx_recipes_form_mode ON recipes(form_mode);

-- 5. Ajouter des statistiques sur les modes de création
CREATE OR REPLACE FUNCTION get_recipe_mode_stats()
RETURNS TABLE (
  form_mode text,
  count bigint,
  percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH mode_counts AS (
    SELECT 
      r.form_mode,
      COUNT(*) as count
    FROM recipes r
    GROUP BY r.form_mode
  ),
  total_count AS (
    SELECT SUM(count) as total FROM mode_counts
  )
  SELECT 
    mc.form_mode,
    mc.count,
    ROUND((mc.count * 100.0 / tc.total), 2) as percentage
  FROM mode_counts mc
  CROSS JOIN total_count tc
  ORDER BY mc.count DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne form_mode ajoutée avec succès !';
  RAISE NOTICE '📊 Nouvelle fonction get_recipe_mode_stats() disponible';
  RAISE NOTICE '🔍 Index créé pour optimiser les requêtes par mode';
  RAISE NOTICE '📝 Documentation ajoutée avec COMMENT';
END $$;
