-- Script pour créer et configurer correctement le système de concours hebdomadaire
-- Exécutez ce script dans SQL Editor de Supabase

BEGIN;

-- 1. Nettoyer les données problématiques d'abord
UPDATE recipes 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'anonymous@coco.app' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Si pas d'utilisateur anonyme, en créer un virtuel ou supprimer les recettes orphelines
DELETE FROM recipes WHERE user_id IS NULL;

-- 2. Supprimer les anciennes tables si elles existent
DROP TABLE IF EXISTS weekly_recipe_votes CASCADE;
DROP TABLE IF EXISTS weekly_recipe_candidates CASCADE;
DROP TABLE IF EXISTS weekly_recipe_contest CASCADE;

-- 3. Créer la table weekly_recipe_contest
CREATE TABLE IF NOT EXISTS weekly_recipe_contest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'voting', 'completed')),
  winner_recipe_id UUID REFERENCES recipes(id),
  winner_user_id UUID REFERENCES auth.users(id),
  total_votes INTEGER DEFAULT 0,
  total_candidates INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_start, week_end)
);

-- 4. Créer la table weekly_recipe_candidates avec contraintes correctes
CREATE TABLE IF NOT EXISTS weekly_recipe_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_contest_id UUID NOT NULL REFERENCES weekly_recipe_contest(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  votes_received INTEGER DEFAULT 0 CHECK (votes_received >= 0),
  is_manual_entry BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(weekly_contest_id, recipe_id),
  -- S'assurer que user_id n'est jamais NULL
  CONSTRAINT user_id_not_null CHECK (user_id IS NOT NULL)
);

-- 5. Créer la table weekly_recipe_votes
CREATE TABLE IF NOT EXISTS weekly_recipe_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_contest_id UUID NOT NULL REFERENCES weekly_recipe_contest(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES weekly_recipe_candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(weekly_contest_id, voter_id) -- Un vote par utilisateur par semaine
);

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_weekly_contest_dates ON weekly_recipe_contest(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_weekly_contest_status ON weekly_recipe_contest(status);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_contest ON weekly_recipe_candidates(weekly_contest_id);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_recipe ON weekly_recipe_candidates(recipe_id);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_user ON weekly_recipe_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_votes ON weekly_recipe_candidates(votes_received DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_contest ON weekly_recipe_votes(weekly_contest_id);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_candidate ON weekly_recipe_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_voter ON weekly_recipe_votes(voter_id);

-- 7. Row Level Security
ALTER TABLE weekly_recipe_contest ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipe_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipe_votes ENABLE ROW LEVEL SECURITY;

-- 8. Politiques RLS
CREATE POLICY "Allow public read access to weekly contests" ON weekly_recipe_contest
FOR SELECT USING (true);

CREATE POLICY "Allow public read access to weekly candidates" ON weekly_recipe_candidates
FOR SELECT USING (true);

CREATE POLICY "Allow users to add their own recipes" ON weekly_recipe_candidates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own recipes" ON weekly_recipe_candidates
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow public read access to weekly votes" ON weekly_recipe_votes
FOR SELECT USING (true);

CREATE POLICY "Allow users to vote weekly" ON weekly_recipe_votes
FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Allow users to delete their weekly vote" ON weekly_recipe_votes
FOR DELETE USING (auth.uid() = voter_id);

-- 9. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_contest_updated_at
    BEFORE UPDATE ON weekly_recipe_contest
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Fonction pour obtenir le concours hebdomadaire actuel (CORRIGÉE)
CREATE OR REPLACE FUNCTION get_current_weekly_contest()
RETURNS TABLE (
  id uuid,
  week_start date,
  week_end date,
  status text,
  total_votes integer,
  total_candidates integer
) AS $$
DECLARE
    current_week_start date;
    current_week_end date;
    v_contest_id uuid;
BEGIN
    -- Calculer le début et la fin de la semaine actuelle (lundi à dimanche)
    current_week_start := date_trunc('week', CURRENT_DATE)::date;
    current_week_end := current_week_start + INTERVAL '6 days';
    
    -- Chercher le concours existant pour cette semaine
    SELECT wrc.id INTO v_contest_id
    FROM weekly_recipe_contest wrc
    WHERE wrc.week_start = current_week_start 
    AND wrc.week_end = current_week_end
    LIMIT 1;
    
    -- Si aucun concours n'existe, en créer un
    IF v_contest_id IS NULL THEN
        INSERT INTO weekly_recipe_contest (week_start, week_end, status)
        VALUES (current_week_start, current_week_end, 'active')
        RETURNING weekly_recipe_contest.id INTO v_contest_id;
        
        -- Sélectionner automatiquement les candidats (AVEC VÉRIFICATION user_id)
        INSERT INTO weekly_recipe_candidates (
            weekly_contest_id,
            recipe_id,
            user_id,
            is_manual_entry
        )
        SELECT 
            v_contest_id,
            r.id,
            r.user_id,
            false
        FROM recipes r
        WHERE r.created_at >= current_week_start - INTERVAL '7 days'
        AND r.user_id IS NOT NULL  -- IMPORTANT: Exclure les recettes sans user_id
        ORDER BY r.created_at DESC
        LIMIT 10
        ON CONFLICT (weekly_contest_id, recipe_id) DO NOTHING;
        
        -- Mettre à jour le compteur de candidats
        UPDATE weekly_recipe_contest 
        SET total_candidates = (
            SELECT COUNT(*) 
            FROM weekly_recipe_candidates 
            WHERE weekly_contest_id = v_contest_id
        )
        WHERE weekly_recipe_contest.id = v_contest_id;
    END IF;
    
    -- Retourner les informations du concours
    RETURN QUERY
    SELECT 
        wrc.id,
        wrc.week_start,
        wrc.week_end,
        wrc.status,
        wrc.total_votes,
        wrc.total_candidates
    FROM weekly_recipe_contest wrc
    WHERE wrc.id = v_contest_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger pour mettre à jour les votes hebdomadaires (CORRIGÉ)
CREATE OR REPLACE FUNCTION update_weekly_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrémenter le compteur de votes
        UPDATE weekly_recipe_candidates 
        SET votes_received = votes_received + 1
        WHERE id = NEW.candidate_id;
        
        -- Mettre à jour le total dans le concours hebdomadaire
        UPDATE weekly_recipe_contest
        SET total_votes = total_votes + 1
        WHERE id = NEW.weekly_contest_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Décrémenter le compteur de votes
        UPDATE weekly_recipe_candidates 
        SET votes_received = GREATEST(0, votes_received - 1)
        WHERE id = OLD.candidate_id;
        
        -- Mettre à jour le total dans le concours hebdomadaire
        UPDATE weekly_recipe_contest
        SET total_votes = GREATEST(0, total_votes - 1)
        WHERE id = OLD.weekly_contest_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weekly_vote_count_trigger
    AFTER INSERT OR DELETE ON weekly_recipe_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_vote_count();

-- 12. Créer le concours de la semaine courante
DO $$
DECLARE
  v_contest_record RECORD;
BEGIN
  SELECT * INTO v_contest_record FROM get_current_weekly_contest() LIMIT 1;
  
  IF v_contest_record.id IS NOT NULL THEN
    RAISE NOTICE 'Concours hebdomadaire créé/trouvé: %', v_contest_record.id;
    RAISE NOTICE 'Semaine: % à %', v_contest_record.week_start, v_contest_record.week_end;
    RAISE NOTICE 'Candidats: %', v_contest_record.total_candidates;
  END IF;
END $$;

COMMIT;

-- 13. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Système de concours hebdomadaire créé avec succès !';
  RAISE NOTICE '🔧 Données nettoyées (recettes sans user_id supprimées)';
  RAISE NOTICE '🏗️ Tables créées avec contraintes NOT NULL correctes';
  RAISE NOTICE '🔒 Politiques RLS configurées';
  RAISE NOTICE '⚡ Triggers automatiques pour les compteurs';
  RAISE NOTICE '📊 Fonction get_current_weekly_contest() corrigée';
  RAISE NOTICE '🎯 Concours de la semaine courante initialisé';
END $$;
