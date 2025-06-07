-- Script pour créer la table user_trophies manquante
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Créer la table user_trophies
CREATE TABLE IF NOT EXISTS user_trophies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trophy_id TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trophy_id)
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_trophies_user_id ON user_trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_trophy_id ON user_trophies(trophy_id);
CREATE INDEX IF NOT EXISTS idx_user_trophies_unlocked_at ON user_trophies(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_trophies_user_trophy ON user_trophies(user_id, trophy_id);

-- 3. Row Level Security
ALTER TABLE user_trophies ENABLE ROW LEVEL SECURITY;

-- 4. Politiques de sécurité
CREATE POLICY "Users can view their own trophies" ON user_trophies
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trophies" ON user_trophies
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trophies" ON user_trophies
FOR UPDATE USING (auth.uid() = user_id);

-- 5. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_trophies_updated_at
    BEFORE UPDATE ON user_trophies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Vue pour faciliter les requêtes de trophées avec infos utilisateur
CREATE OR REPLACE VIEW user_trophies_with_profile AS
SELECT 
  ut.id,
  ut.user_id,
  ut.trophy_id,
  ut.unlocked_at,
  ut.points_earned,
  ut.created_at,
  ut.updated_at,
  p.display_name,
  p.avatar_url
FROM user_trophies ut
JOIN profiles p ON p.user_id = ut.user_id;

-- 7. Fonction pour obtenir les statistiques globales des trophées
CREATE OR REPLACE FUNCTION get_trophy_system_stats()
RETURNS TABLE (
  total_trophies_unlocked bigint,
  total_points_earned bigint,
  unique_users_with_trophies bigint,
  most_popular_trophy text,
  avg_trophies_per_user numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH trophy_stats AS (
    SELECT 
      COUNT(*) as total_unlocked,
      SUM(points_earned) as total_points,
      COUNT(DISTINCT user_id) as unique_users
    FROM user_trophies
  ),
  popular_trophy AS (
    SELECT trophy_id
    FROM user_trophies
    GROUP BY trophy_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  avg_calc AS (
    SELECT AVG(trophy_count) as avg_trophies
    FROM (
      SELECT COUNT(*) as trophy_count
      FROM user_trophies
      GROUP BY user_id
    ) user_trophy_counts
  )
  SELECT 
    ts.total_unlocked,
    ts.total_points,
    ts.unique_users,
    pt.trophy_id,
    COALESCE(ac.avg_trophies, 0)
  FROM trophy_stats ts
  CROSS JOIN popular_trophy pt
  CROSS JOIN avg_calc ac;
END;
$$ LANGUAGE plpgsql;

-- 8. Fonction pour débloquer automatiquement le trophée de bienvenue
CREATE OR REPLACE FUNCTION auto_unlock_welcome_trophy()
RETURNS TRIGGER AS $$
BEGIN
  -- Débloquer le trophée de bienvenue pour chaque nouvel utilisateur
  INSERT INTO user_trophies (user_id, trophy_id, points_earned)
  VALUES (NEW.user_id, 'welcome_aboard', 10)
  ON CONFLICT (user_id, trophy_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger pour débloquer automatiquement le trophée de bienvenue
CREATE TRIGGER auto_welcome_trophy
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_unlock_welcome_trophy();

-- 10. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Table user_trophies créée avec succès !';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '📊 Fonctions de statistiques ajoutées';
  RAISE NOTICE '🎉 Trophée de bienvenue automatique activé';
  RAISE NOTICE '⚡ Index optimisés pour les performances';
END $$;
