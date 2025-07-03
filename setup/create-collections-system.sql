-- Script pour créer le système de collections thématiques
-- Remplace le système de compétitions

BEGIN;

-- 1. Supprimer les anciennes tables de compétitions
DROP TABLE IF EXISTS competition_votes CASCADE;
DROP TABLE IF EXISTS competition_entries CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS weekly_recipe_votes CASCADE;
DROP TABLE IF EXISTS weekly_recipe_candidates CASCADE;
DROP TABLE IF EXISTS weekly_recipe_contest CASCADE;

-- 2. Créer la table collections
CREATE TABLE IF NOT EXISTS collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📚',
  color TEXT DEFAULT '#3b82f6',
  category TEXT DEFAULT 'general',
  type TEXT DEFAULT 'weekly' CHECK (type IN ('weekly', 'monthly', 'seasonal', 'special')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  featured BOOLEAN DEFAULT FALSE,
  auto_curated BOOLEAN DEFAULT TRUE,
  curator_id UUID REFERENCES auth.users(id),
  recipe_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Créer la table collection_recipes (recettes dans les collections)
CREATE TABLE IF NOT EXISTS collection_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by_curator BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  position INTEGER,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, recipe_id)
);

-- 4. Créer la table collection_likes (j'aime sur les collections)
CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, user_id)
);

-- 5. Créer la table collection_recipe_likes (j'aime sur les recettes dans les collections)
CREATE TABLE IF NOT EXISTS collection_recipe_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_recipe_id UUID NOT NULL REFERENCES collection_recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_recipe_id, user_id)
);

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_collections_type_status ON collections(type, status);
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(featured, status);
CREATE INDEX IF NOT EXISTS idx_collections_dates ON collections(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_collection ON collection_recipes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe ON collection_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_user ON collection_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_likes ON collection_recipes(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_collection_likes_collection ON collection_likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user ON collection_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_recipe_likes_recipe ON collection_recipe_likes(collection_recipe_id);

-- 7. Row Level Security
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipe_likes ENABLE ROW LEVEL SECURITY;

-- 8. Politiques RLS
CREATE POLICY "Allow public read access to collections" ON collections
FOR SELECT USING (true);

CREATE POLICY "Allow curators to manage collections" ON collections
FOR ALL WITH CHECK (auth.uid() = curator_id OR auth.uid() IN (
  SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Allow public read access to collection recipes" ON collection_recipes
FOR SELECT USING (true);

CREATE POLICY "Allow users to add their own recipes" ON collection_recipes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own recipes" ON collection_recipes
FOR DELETE USING (auth.uid() = user_id OR auth.uid() IN (
  SELECT curator_id FROM collections WHERE id = collection_id
));

CREATE POLICY "Allow public read access to collection likes" ON collection_likes
FOR SELECT USING (true);

CREATE POLICY "Allow users to like collections" ON collection_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to unlike collections" ON collection_likes
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow public read access to collection recipe likes" ON collection_recipe_likes
FOR SELECT USING (true);

CREATE POLICY "Allow users to like collection recipes" ON collection_recipe_likes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to unlike collection recipes" ON collection_recipe_likes
FOR DELETE USING (auth.uid() = user_id);

-- 9. Triggers pour mettre à jour les compteurs
CREATE OR REPLACE FUNCTION update_collection_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Mettre à jour le nombre de recettes
        UPDATE collections 
        SET recipe_count = recipe_count + 1,
            updated_at = NOW()
        WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Décrémenter le nombre de recettes
        UPDATE collections 
        SET recipe_count = GREATEST(0, recipe_count - 1),
            updated_at = NOW()
        WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_recipe_count_trigger
    AFTER INSERT OR DELETE ON collection_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_counts();

-- 10. Trigger pour les likes de collections
CREATE OR REPLACE FUNCTION update_collection_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections 
        SET likes_count = likes_count + 1
        WHERE id = NEW.collection_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections 
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.collection_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_likes_count_trigger
    AFTER INSERT OR DELETE ON collection_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_likes_count();

-- 11. Trigger pour les likes de recettes dans les collections
CREATE OR REPLACE FUNCTION update_collection_recipe_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collection_recipes 
        SET likes_count = likes_count + 1
        WHERE id = NEW.collection_recipe_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collection_recipes 
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.collection_recipe_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_recipe_likes_count_trigger
    AFTER INSERT OR DELETE ON collection_recipe_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_recipe_likes_count();

-- 12. Fonction pour créer automatiquement les collections hebdomadaires
CREATE OR REPLACE FUNCTION create_weekly_collections()
RETURNS VOID AS $$
DECLARE
  current_week_start DATE;
  current_week_end DATE;
  collection_themes TEXT[];
  theme TEXT;
  existing_collection_id UUID;
BEGIN
  -- Calculer les dates de la semaine courante
  current_week_start := DATE_TRUNC('week', CURRENT_DATE);
  current_week_end := current_week_start + INTERVAL '6 days';
  
  -- Thèmes de collections rotatives
  collection_themes := ARRAY[
    'Plats réconfortants d''automne 🍂',
    'Cuisine végétarienne créative 🌱',
    'Desserts de grand-mère 👵',
    'Plats express (moins de 30min) ⚡',
    'Cuisine du monde 🌍',
    'Recettes healthy et colorées 🌈',
    'Comfort food d''hiver ❄️',
    'Cuisine anti-gaspi ♻️'
  ];
  
  -- Sélectionner un thème basé sur la semaine de l'année
  theme := collection_themes[(EXTRACT(week FROM CURRENT_DATE)::INTEGER % array_length(collection_themes, 1)) + 1];
  
  -- Vérifier s'il existe déjà une collection pour cette semaine
  SELECT id INTO existing_collection_id
  FROM collections 
  WHERE type = 'weekly' 
    AND start_date::DATE = current_week_start
    AND end_date::DATE = current_week_end;
  
  -- Créer la collection si elle n'existe pas
  IF existing_collection_id IS NULL THEN
    INSERT INTO collections (
      title,
      description,
      emoji,
      type,
      status,
      start_date,
      end_date,
      featured,
      auto_curated
    ) VALUES (
      theme,
      'Collection hebdomadaire automatique de recettes sur le thème : ' || theme,
      '📅',
      'weekly',
      'active',
      current_week_start,
      current_week_end,
      true,
      true
    ) RETURNING id INTO existing_collection_id;
    
    -- Auto-ajouter quelques recettes récentes à la collection
    INSERT INTO collection_recipes (collection_id, recipe_id, user_id, added_by_curator)
    SELECT 
      existing_collection_id,
      r.id,
      r.user_id,
      true
    FROM recipes r
    WHERE r.created_at >= current_week_start - INTERVAL '7 days'
      AND r.is_public = true
    ORDER BY r.created_at DESC
    LIMIT 5
    ON CONFLICT (collection_id, recipe_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 13. Créer quelques collections d'exemple
INSERT INTO collections (
  title,
  description,
  emoji,
  color,
  category,
  type,
  status,
  featured,
  auto_curated
) VALUES 
(
  'Recettes de saison - Automne',
  'Découvrez les meilleures recettes automnales avec des produits de saison',
  '🍂',
  '#f59e0b',
  'seasonal',
  'seasonal',
  'active',
  true,
  false
),
(
  'Desserts gourmands',
  'Une sélection des desserts les plus appréciés de la communauté',
  '🍰',
  '#ec4899',
  'dessert',
  'special',
  'active',
  true,
  false
),
(
  'Cuisine végétarienne',
  'Recettes végétariennes savoureuses et créatives',
  '🌱',
  '#10b981',
  'vegetarian',
  'special',
  'active',
  false,
  false
),
(
  'Plats express',
  'Recettes rapides pour les jours pressés (moins de 30 minutes)',
  '⚡',
  '#3b82f6',
  'quick',
  'special',
  'active',
  false,
  false
);

-- 14. Créer la collection de la semaine courante
SELECT create_weekly_collections();

-- 15. Fonction utilitaire pour obtenir les collections populaires
CREATE OR REPLACE FUNCTION get_popular_collections(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  emoji TEXT,
  color TEXT,
  recipe_count INTEGER,
  likes_count INTEGER,
  type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.emoji,
    c.color,
    c.recipe_count,
    c.likes_count,
    c.type
  FROM collections c
  WHERE c.status = 'active'
  ORDER BY c.featured DESC, c.likes_count DESC, c.recipe_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Système de collections créé avec succès !';
  RAISE NOTICE '📚 Tables créées : collections, collection_recipes, collection_likes';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '⚡ Triggers automatiques pour les compteurs';
  RAISE NOTICE '📅 Collection hebdomadaire automatique créée';
  RAISE NOTICE '🎨 Collections d''exemple ajoutées';
END $$;
