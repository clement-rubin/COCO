-- Table user_pass avec toutes les colonnes nécessaires pour la progression et la boutique

CREATE TABLE IF NOT EXISTS user_pass (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_claimed DATE,
  trophies JSONB DEFAULT '{}'::jsonb,
  recipes_count INTEGER NOT NULL DEFAULT 0,
  friends_count INTEGER NOT NULL DEFAULT 0,
  likes_received INTEGER NOT NULL DEFAULT 0,
  owned_items TEXT[] DEFAULT ARRAY[]::TEXT[],
  equipped JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_pass_user_id ON user_pass(user_id);

-- RLS
ALTER TABLE user_pass ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own pass" ON user_pass
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Leaderboard public select" ON user_pass
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own pass" ON user_pass
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pass" ON user_pass
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_user_pass_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_pass_updated_at
  BEFORE UPDATE ON user_pass
  FOR EACH ROW
  EXECUTE FUNCTION update_user_pass_updated_at();

-- Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Table user_pass créée ou mise à jour avec succès !';
END $$;

-- Classement mensuel : récupérer uniquement l'XP de chaque utilisateur
SELECT user_id, xp FROM monthly_leaderboard;

-- (Optionnel) Créer une vue pour faciliter l'accès
CREATE OR REPLACE VIEW monthly_leaderboard_xp AS
SELECT user_id, xp FROM monthly_leaderboard;
