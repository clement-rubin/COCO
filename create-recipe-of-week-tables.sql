-- Script pour créer les tables du concours de la semaine
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Créer la table recipe_of_week
CREATE TABLE IF NOT EXISTS recipe_of_week (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  max_participants INTEGER DEFAULT 100,
  prize_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- 2. Créer la table recipe_of_week_participation
CREATE TABLE IF NOT EXISTS recipe_of_week_participation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  recipe_of_week_id UUID NOT NULL REFERENCES recipe_of_week(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes_received INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_of_week_id)
);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_recipe_of_week_active ON recipe_of_week(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_participation_user_id ON recipe_of_week_participation(user_id);
CREATE INDEX IF NOT EXISTS idx_participation_recipe_of_week_id ON recipe_of_week_participation(recipe_of_week_id);
CREATE INDEX IF NOT EXISTS idx_participation_votes ON recipe_of_week_participation(votes_received DESC);

-- 4. Row Level Security
ALTER TABLE recipe_of_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_of_week_participation ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS pour recipe_of_week
CREATE POLICY "Allow public read access to recipe_of_week" ON recipe_of_week
FOR SELECT USING (true);

CREATE POLICY "Allow admin insert on recipe_of_week" ON recipe_of_week
FOR INSERT WITH CHECK (false); -- Only admins can create contests

CREATE POLICY "Allow admin update on recipe_of_week" ON recipe_of_week
FOR UPDATE USING (false); -- Only admins can update contests

-- 6. Politiques RLS pour recipe_of_week_participation
CREATE POLICY "Allow users to read their own participation" ON recipe_of_week_participation
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow public read for statistics" ON recipe_of_week_participation
FOR SELECT USING (true);

CREATE POLICY "Allow users to insert their own participation" ON recipe_of_week_participation
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own participation" ON recipe_of_week_participation
FOR UPDATE USING (auth.uid() = user_id);

-- 7. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipe_of_week_updated_at
    BEFORE UPDATE ON recipe_of_week
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Fonction pour obtenir le concours actif
CREATE OR REPLACE FUNCTION get_active_recipe_of_week()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  theme text,
  start_date timestamptz,
  end_date timestamptz,
  max_participants integer,
  prize_description text,
  current_participants bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    row.id,
    row.title,
    row.description,
    row.theme,
    row.start_date,
    row.end_date,
    row.max_participants,
    row.prize_description,
    COALESCE(participation_count.count, 0) as current_participants
  FROM recipe_of_week row
  LEFT JOIN (
    SELECT 
      recipe_of_week_id,
      COUNT(*) as count
    FROM recipe_of_week_participation
    GROUP BY recipe_of_week_id
  ) participation_count ON row.id = participation_count.recipe_of_week_id
  WHERE row.is_active = true
  AND NOW() BETWEEN row.start_date AND row.end_date
  ORDER BY row.start_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9. Insérer un concours d'exemple
INSERT INTO recipe_of_week (
  title,
  description,
  theme,
  start_date,
  end_date,
  is_active,
  max_participants,
  prize_description
) VALUES (
  'Concours de la Semaine #1',
  'Partagez votre meilleure recette de comfort food !',
  'Comfort Food',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '6 days',
  true,
  50,
  'Le gagnant recevra un livre de cuisine signé par un chef renommé !'
) ON CONFLICT DO NOTHING;

-- 10. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Tables recipe_of_week créées avec succès !';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '📊 Fonction get_active_recipe_of_week() créée';
  RAISE NOTICE '🎯 Concours d''exemple ajouté';
  RAISE NOTICE '⚡ Index optimisés pour les performances';
END $$;
