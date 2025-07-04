-- Script pour s'assurer que la table comments existe avec la bonne structure
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Créer la table comments si elle n'existe pas
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 3. Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 4. Politiques de sécurité (supprimer les anciennes d'abord)
DROP POLICY IF EXISTS "Permettre lecture publique commentaires" ON comments;
DROP POLICY IF EXISTS "Permettre insertion commentaire utilisateur" ON comments;
DROP POLICY IF EXISTS "Permettre mise à jour commentaire utilisateur" ON comments;
DROP POLICY IF EXISTS "Permettre suppression commentaire utilisateur" ON comments;

-- 5. Nouvelles politiques
CREATE POLICY "Permettre lecture publique commentaires" ON comments 
FOR SELECT USING (true);

CREATE POLICY "Permettre insertion commentaire utilisateur" ON comments 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permettre mise à jour commentaire utilisateur" ON comments 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Permettre suppression commentaire utilisateur" ON comments 
FOR DELETE USING (auth.uid() = user_id);

-- 6. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Fonction pour obtenir les statistiques des commentaires
CREATE OR REPLACE FUNCTION get_comments_stats()
RETURNS TABLE (
  total_comments bigint,
  comments_today bigint,
  avg_comments_per_recipe numeric,
  most_commented_recipe_id uuid
) AS $$
BEGIN
  RETURN QUERY
  WITH comment_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as today,
      recipe_id
    FROM comments
    GROUP BY recipe_id
  ),
  most_commented AS (
    SELECT recipe_id
    FROM comment_stats
    ORDER BY total DESC
    LIMIT 1
  )
  SELECT 
    COALESCE(SUM(cs.total), 0) as total_comments,
    COALESCE(SUM(cs.today), 0) as comments_today,
    COALESCE(AVG(cs.total), 0) as avg_comments_per_recipe,
    mc.recipe_id as most_commented_recipe_id
  FROM comment_stats cs
  CROSS JOIN most_commented mc;
END;
$$ LANGUAGE plpgsql;

-- 8. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Table comments créée/vérifiée avec succès !';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '📊 Fonction de statistiques ajoutée';
  RAISE NOTICE '⚡ Index optimisés pour les performances';
  RAISE NOTICE '🔄 Trigger updated_at configuré';
END $$;
