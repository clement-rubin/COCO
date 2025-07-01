-- Script pour corriger et unifier le système de compétitions
-- Exécutez ce script dans SQL Editor de Supabase

BEGIN;

-- 1. Supprimer les anciennes tables si elles existent
DROP TABLE IF EXISTS recipe_week_votes CASCADE;
DROP TABLE IF EXISTS recipe_week_candidates CASCADE;
DROP TABLE IF EXISTS competition_votes CASCADE;
DROP TABLE IF EXISTS recipe_of_week_participation CASCADE;
DROP TABLE IF EXISTS recipe_of_week CASCADE;

-- 2. Créer la table competitions (système principal)
CREATE TABLE IF NOT EXISTS competitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  type TEXT DEFAULT 'recipe_submission', -- 'recipe_submission', 'vote_battle', 'themed'
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER DEFAULT 100,
  min_participants INTEGER DEFAULT 2,
  prize_description TEXT,
  rules JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_participants CHECK (max_participants >= min_participants)
);

-- 3. Créer la table competition_entries (participations)
CREATE TABLE IF NOT EXISTS competition_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  entry_data JSONB DEFAULT '{}', -- Pour stocker des données spécifiques selon le type de compétition
  votes_count INTEGER DEFAULT 0,
  rank INTEGER,
  is_winner BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, user_id), -- Un utilisateur ne peut participer qu'une fois par compétition
  UNIQUE(competition_id, recipe_id) -- Une recette ne peut être soumise qu'une fois par compétition
);

-- 4. Créer la table competition_votes (votes pour les participations)
CREATE TABLE IF NOT EXISTS competition_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_value INTEGER DEFAULT 1, -- Permet des votes pondérés dans le futur
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competition_id, voter_id), -- Un vote par utilisateur par compétition
  CONSTRAINT positive_vote CHECK (vote_value > 0)
);

-- 5. Créer la table weekly_recipe_contest (système spécial pour la recette de la semaine)
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

-- 6. Créer la table weekly_recipe_candidates (candidats automatiques)
CREATE TABLE IF NOT EXISTS weekly_recipe_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_contest_id UUID NOT NULL REFERENCES weekly_recipe_contest(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  votes_received INTEGER DEFAULT 0,
  is_manual_entry BOOLEAN DEFAULT FALSE, -- TRUE si inscrit manuellement, FALSE si sélectionné automatiquement
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(weekly_contest_id, recipe_id)
);

-- 7. Créer la table weekly_recipe_votes (votes pour la recette de la semaine)
CREATE TABLE IF NOT EXISTS weekly_recipe_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_contest_id UUID NOT NULL REFERENCES weekly_recipe_contest(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES weekly_recipe_candidates(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(weekly_contest_id, voter_id) -- Un vote par utilisateur par semaine
);

-- 8. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_competitions_status_dates ON competitions(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
CREATE INDEX IF NOT EXISTS idx_competition_entries_competition ON competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_user ON competition_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_recipe ON competition_entries(recipe_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_votes ON competition_entries(votes_count DESC);
CREATE INDEX IF NOT EXISTS idx_competition_votes_competition ON competition_votes(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_votes_entry ON competition_votes(entry_id);
CREATE INDEX IF NOT EXISTS idx_competition_votes_voter ON competition_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_weekly_contest_dates ON weekly_recipe_contest(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_contest ON weekly_recipe_candidates(weekly_contest_id);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_recipe ON weekly_recipe_candidates(recipe_id);
CREATE INDEX IF NOT EXISTS idx_weekly_candidates_votes ON weekly_recipe_candidates(votes_received DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_contest ON weekly_recipe_votes(weekly_contest_id);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_candidate ON weekly_recipe_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_weekly_votes_voter ON weekly_recipe_votes(voter_id);

-- 9. Row Level Security
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipe_contest ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipe_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_recipe_votes ENABLE ROW LEVEL SECURITY;

-- 10. Politiques RLS pour competitions
CREATE POLICY "Allow public read access to competitions" ON competitions
FOR SELECT USING (true);

CREATE POLICY "Allow admin insert on competitions" ON competitions
FOR INSERT WITH CHECK (false); -- Seuls les admins peuvent créer des compétitions

CREATE POLICY "Allow admin update on competitions" ON competitions
FOR UPDATE USING (false); -- Seuls les admins peuvent modifier des compétitions

-- 11. Politiques RLS pour competition_entries
CREATE POLICY "Allow public read access to entries" ON competition_entries
FOR SELECT USING (true);

CREATE POLICY "Allow users to submit their own entries" ON competition_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update leur propres participations" ON competition_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own entries" ON competition_entries
FOR DELETE USING (auth.uid() = user_id);

-- 12. Politiques RLS pour competition_votes
CREATE POLICY "Allow public read access to votes" ON competition_votes
FOR SELECT USING (true);

CREATE POLICY "Allow users to vote" ON competition_votes
FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Allow users to delete their own votes" ON competition_votes
FOR DELETE USING (auth.uid() = voter_id);

-- 13. Politiques RLS pour weekly_recipe_contest
CREATE POLICY "Allow public read access to weekly contests" ON weekly_recipe_contest
FOR SELECT USING (true);

-- 14. Politiques RLS pour weekly_recipe_candidates
CREATE POLICY "Allow public read access to weekly candidates" ON weekly_recipe_candidates
FOR SELECT USING (true);

CREATE POLICY "Allow users to add their own recipes" ON weekly_recipe_candidates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to remove their own recipes" ON weekly_recipe_candidates
FOR DELETE USING (auth.uid() = user_id);

-- 15. Politiques RLS pour weekly_recipe_votes
CREATE POLICY "Allow public read access to weekly votes" ON weekly_recipe_votes
FOR SELECT USING (true);

CREATE POLICY "Allow users to vote weekly" ON weekly_recipe_votes
FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Allow users to delete leur vote hebdomadaire" ON weekly_recipe_votes
FOR DELETE USING (auth.uid() = voter_id);

-- 16. Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitions_updated_at
    BEFORE UPDATE ON competitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_entries_updated_at
    BEFORE UPDATE ON competition_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_contest_updated_at
    BEFORE UPDATE ON weekly_recipe_contest
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 17. Trigger pour mettre à jour automatiquement les compteurs de votes
CREATE OR REPLACE FUNCTION update_competition_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrémenter le compteur de votes
        UPDATE competition_entries 
        SET votes_count = votes_count + NEW.vote_value
        WHERE id = NEW.entry_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Décrémenter le compteur de votes
        UPDATE competition_entries 
        SET votes_count = GREATEST(0, votes_count - OLD.vote_value)
        WHERE id = OLD.entry_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER competition_vote_count_trigger
    AFTER INSERT OR DELETE ON competition_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_competition_vote_count();

-- 18. Trigger pour mettre à jour les votes hebdomadaires
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

-- 19. Fonction pour obtenir le concours hebdomadaire actuel
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
BEGIN
    -- Calculer le début et la fin de la semaine actuelle (lundi à dimanche)
    current_week_start := date_trunc('week', CURRENT_DATE)::date + 1; -- Lundi
    current_week_end := current_week_start + INTERVAL '6 days'; -- Dimanche
    
    -- Chercher le concours existant pour cette semaine
    RETURN QUERY
    SELECT 
        wrc.id,
        wrc.week_start,
        wrc.week_end,
        wrc.status,
        wrc.total_votes,
        wrc.total_candidates
    FROM weekly_recipe_contest wrc
    WHERE wrc.week_start = current_week_start 
    AND wrc.week_end = current_week_end
    LIMIT 1;
    
    -- Si aucun concours n'existe, en créer un
    IF NOT FOUND THEN
        INSERT INTO weekly_recipe_contest (week_start, week_end, status)
        VALUES (current_week_start, current_week_end, 'active')
        RETURNING weekly_recipe_contest.id, weekly_recipe_contest.week_start, 
                 weekly_recipe_contest.week_end, weekly_recipe_contest.status,
                 weekly_recipe_contest.total_votes, weekly_recipe_contest.total_candidates
        INTO id, week_start, week_end, status, total_votes, total_candidates;
        
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 20. Fonction pour sélectionner automatiquement les candidats de la semaine
CREATE OR REPLACE FUNCTION auto_select_weekly_candidates()
RETURNS void AS $$
DECLARE
    contest_record RECORD;
    recipe_record RECORD;
    candidate_count INTEGER;
BEGIN
    -- Obtenir le concours actuel
    SELECT * INTO contest_record FROM get_current_weekly_contest() LIMIT 1;
    
    IF contest_record.id IS NULL THEN
        RETURN;
    END IF;
    
    -- Compter les candidats existants
    SELECT COUNT(*) INTO candidate_count
    FROM weekly_recipe_candidates
    WHERE weekly_contest_id = contest_record.id;
    
    -- Si nous avons déjà des candidats, ne rien faire
    IF candidate_count > 0 THEN
        RETURN;
    END IF;
    
    -- Sélectionner les 10 recettes les plus récentes de la semaine
    FOR recipe_record IN
        SELECT r.id, r.user_id
        FROM recipes r
        WHERE r.created_at >= contest_record.week_start
        AND r.created_at <= contest_record.week_end + INTERVAL '1 day'
        AND r.is_public = true
        ORDER BY r.created_at DESC, r.id
        LIMIT 10
    LOOP
        -- Ajouter la recette comme candidate
        INSERT INTO weekly_recipe_candidates (
            weekly_contest_id, 
            recipe_id, 
            user_id, 
            is_manual_entry
        ) VALUES (
            contest_record.id,
            recipe_record.id,
            recipe_record.user_id,
            false
        ) ON CONFLICT (weekly_contest_id, recipe_id) DO NOTHING;
    END LOOP;
    
    -- Mettre à jour le nombre total de candidats
    UPDATE weekly_recipe_contest
    SET total_candidates = (
        SELECT COUNT(*) 
        FROM weekly_recipe_candidates 
        WHERE weekly_contest_id = contest_record.id
    )
    WHERE id = contest_record.id;
END;
$$ LANGUAGE plpgsql;

-- 21. Fonction pour clôturer automatiquement les concours expirés
CREATE OR REPLACE FUNCTION close_expired_competitions()
RETURNS void AS $$
BEGIN
    -- Clôturer les compétitions générales expirées
    UPDATE competitions
    SET status = 'completed'
    WHERE status = 'active'
    AND end_date < NOW();
    
    -- Clôturer les concours hebdomadaires expirés et déterminer les gagnants
    UPDATE weekly_recipe_contest
    SET status = 'completed',
        winner_recipe_id = (
            SELECT wrc.recipe_id
            FROM weekly_recipe_candidates wrc
            WHERE wrc.weekly_contest_id = weekly_recipe_contest.id
            ORDER BY wrc.votes_received DESC, wrc.added_at ASC
            LIMIT 1
        ),
        winner_user_id = (
            SELECT wrc.user_id
            FROM weekly_recipe_candidates wrc
            WHERE wrc.weekly_contest_id = weekly_recipe_contest.id
            ORDER BY wrc.votes_received DESC, wrc.added_at ASC
            LIMIT 1
        )
    WHERE status = 'active'
    AND week_end < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 22. Insérer quelques compétitions d'exemple
INSERT INTO competitions (
    title,
    description,
    category,
    type,
    status,
    start_date,
    end_date,
    max_participants,
    prize_description
) VALUES
(
    'Concours Comfort Food',
    'Partagez votre meilleure recette réconfortante !',
    'Comfort Food',
    'recipe_submission',
    'active',
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '5 days',
    50,
    'Le gagnant recevra un livre de cuisine signé !'
),
(
    'Défi Desserts de Noël',
    'Créez le dessert de Noël le plus original !',
    'Desserts',
    'recipe_submission',
    'upcoming',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '8 days',
    30,
    'Coffret de ustensiles de pâtisserie professionnel'
),
(
    'Battle Recettes Végétariennes',
    'Le grand défi des recettes végétariennes créatives !',
    'Végétarien',
    'vote_battle',
    'upcoming',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '10 days',
    40,
    'Panier de produits bio et livre de cuisine végétarienne'
) ON CONFLICT DO NOTHING;

-- 23. Créer le concours hebdomadaire actuel et sélectionner les candidats
SELECT auto_select_weekly_candidates();

-- 19. Fonction pour incrémenter les votes de compétition
CREATE OR REPLACE FUNCTION increment_competition_vote(p_entry_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE competition_entries 
  SET votes_count = votes_count + 1,
      updated_at = NOW()
  WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

-- 20. Fonction pour fermer automatiquement les compétitions expirées
CREATE OR REPLACE FUNCTION close_expired_competitions()
RETURNS VOID AS $$
BEGIN
  UPDATE competitions 
  SET status = 'completed',
      updated_at = NOW()
  WHERE status = 'active' 
    AND end_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- 21. Fonction pour activer les compétitions qui commencent
CREATE OR REPLACE FUNCTION activate_starting_competitions()
RETURNS VOID AS $$
BEGIN
  UPDATE competitions 
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'upcoming' 
    AND start_date <= NOW()
    AND end_date > NOW();
END;
$$ LANGUAGE plpgsql;

-- 22. Fonction pour calculer automatiquement les classements
CREATE OR REPLACE FUNCTION calculate_competition_rankings(p_competition_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked_entries AS (
    SELECT id, 
           ROW_NUMBER() OVER (ORDER BY votes_count DESC, submitted_at ASC) as new_rank
    FROM competition_entries 
    WHERE competition_id = p_competition_id
  )
  UPDATE competition_entries 
  SET rank = ranked_entries.new_rank,
      is_winner = (ranked_entries.new_rank = 1),
      updated_at = NOW()
  FROM ranked_entries 
  WHERE competition_entries.id = ranked_entries.id;
END;
$$ LANGUAGE plpgsql;

-- 23. Fonction pour créer automatiquement le concours de la semaine
CREATE OR REPLACE FUNCTION create_weekly_contest()
RETURNS UUID AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_contest_id UUID;
BEGIN
  -- Calculer les dates de la semaine courante
  v_start_date := DATE_TRUNC('week', CURRENT_DATE);
  v_end_date := v_start_date + INTERVAL '6 days';
  
  -- Créer le concours s'il n'existe pas
  INSERT INTO weekly_recipe_contest (week_start, week_end, status)
  VALUES (v_start_date, v_end_date, 'active')
  ON CONFLICT (week_start, week_end) DO NOTHING
  RETURNING id INTO v_contest_id;
  
  -- Si le concours existait déjà, récupérer son ID
  IF v_contest_id IS NULL THEN
    SELECT id INTO v_contest_id 
    FROM weekly_recipe_contest 
    WHERE week_start = v_start_date AND week_end = v_end_date;
  END IF;
  
  RETURN v_contest_id;
END;
$$ LANGUAGE plpgsql;

-- 24. Triggers pour automatiser les mises à jour
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger à toutes les tables
CREATE TRIGGER update_competitions_updated_at 
  BEFORE UPDATE ON competitions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_entries_updated_at 
  BEFORE UPDATE ON competition_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_contest_updated_at 
  BEFORE UPDATE ON weekly_recipe_contest 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 25. Trigger pour recalculer les classements après un vote
CREATE OR REPLACE FUNCTION recalculate_rankings_after_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer les classements pour la compétition
  PERFORM calculate_competition_rankings(NEW.competition_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_rankings_on_vote
  AFTER INSERT ON competition_votes
  FOR EACH ROW EXECUTE FUNCTION recalculate_rankings_after_vote();

-- 26. Créer quelques compétitions de test
INSERT INTO competitions (
  title,
  description,
  type,
  status,
  start_date,
  end_date,
  max_participants,
  category,
  prize_description
) VALUES 
(
  'Concours de Pâtisserie de Printemps',
  'Créez votre plus belle pâtisserie printanière ! Laissez libre cours à votre créativité avec des saveurs fraîches et colorées.',
  'recipe_submission',
  'active',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '6 days',
  50,
  'dessert',
  'Trophée virtuel et mise en avant sur la page d''accueil'
),
(
  'Plats Végétariens Créatifs',
  'Montrez-nous vos plus belles créations végétariennes ! Originalité et goût sont les maîtres mots.',
  'recipe_submission',
  'upcoming',
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '9 days',
  30,
  'vegetarian',
  'Badge spécial "Chef Végétarien" et article dans notre newsletter'
),
(
  'Cuisine du Monde',
  'Faites-nous voyager avec vos recettes traditionnelles ou revisitées d''ailleurs !',
  'recipe_submission',
  'upcoming',
  NOW() + INTERVAL '1 week',
  NOW() + INTERVAL '2 weeks',
  100,
  'international',
  'Trophée "Explorateur Culinaire" et sélection pour notre livre de recettes'
);

-- 27. Créer le concours de la semaine courante
DO $$
DECLARE
  v_contest_id UUID;
BEGIN
  v_contest_id := create_weekly_contest();
  
  -- Ajouter quelques candidats de test si le concours vient d'être créé
  IF v_contest_id IS NOT NULL THEN
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
    WHERE r.created_at >= DATE_TRUNC('week', CURRENT_DATE)
      AND r.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week'
    ORDER BY r.likes_count DESC
    LIMIT 10
    ON CONFLICT (weekly_contest_id, recipe_id) DO NOTHING;
    
    -- Mettre à jour le compteur de candidats
    UPDATE weekly_recipe_contest 
    SET total_candidates = (
      SELECT COUNT(*) 
      FROM weekly_recipe_candidates 
      WHERE weekly_contest_id = v_contest_id
    )
    WHERE id = v_contest_id;
  END IF;
END $$;

COMMIT;

-- 24. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Système de compétitions corrigé avec succès !';
  RAISE NOTICE '🏆 Tables créées : competitions, competition_entries, competition_votes';
  RAISE NOTICE '📅 Système hebdomadaire : weekly_recipe_contest, weekly_recipe_candidates, weekly_recipe_votes';
  RAISE NOTICE '🔒 Politiques RLS configurées pour la sécurité';
  RAISE NOTICE '⚡ Triggers automatiques pour les compteurs de votes';
  RAISE NOTICE '🎯 Fonctions utilitaires pour la gestion automatique';
  RAISE NOTICE '📊 Index optimisés pour les performances';
  RAISE NOTICE '🆕 Compétitions d''exemple ajoutées';
  RAISE NOTICE '⏰ Sélection automatique des candidats hebdomadaires';
END $$;

-- Make sure public read is allowed
CREATE POLICY IF NOT EXISTS "Allow public read access to weekly contests" ON weekly_recipe_contest
FOR SELECT USING (true);

-- Make sure the function is SECURITY DEFINER and owned by postgres
ALTER FUNCTION get_current_weekly_contest() OWNER TO postgres;
ALTER FUNCTION get_current_weekly_contest() SECURITY DEFINER;

-- Exemple de modifications SQL à appliquer sur les tables existantes :

-- 1. Ajouter une colonne pour rendre une recette publique si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='recipes' AND column_name='is_public'
  ) THEN
    ALTER TABLE recipes ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 2. Ajouter un index sur recipes.created_at et recipes.is_public pour accélérer la sélection des candidats hebdomadaires
CREATE INDEX IF NOT EXISTS idx_recipes_created_at_public ON recipes(created_at, is_public);

-- 3. S'assurer que la colonne likes_count existe sur recipes (pour le tri des candidats)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='recipes' AND column_name='likes_count'
  ) THEN
    ALTER TABLE recipes ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 4. S'assurer que la colonne user_id sur recipes n'est pas NULL (pour la cohérence des participations)
ALTER TABLE recipes ALTER COLUMN user_id SET NOT NULL;

-- 5. Ajouter une contrainte d'unicité sur weekly_recipe_candidates (weekly_contest_id, recipe_id) si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='weekly_recipe_candidates' 
      AND constraint_type='UNIQUE'
      AND constraint_name='weekly_recipe_candidates_weekly_contest_id_recipe_id_key'
  ) THEN
    ALTER TABLE weekly_recipe_candidates
      ADD CONSTRAINT weekly_recipe_candidates_weekly_contest_id_recipe_id_key
      UNIQUE (weekly_contest_id, recipe_id);
  END IF;
END $$;

-- 6. S'assurer que la colonne is_manual_entry existe sur weekly_recipe_candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='weekly_recipe_candidates' AND column_name='is_manual_entry'
  ) THEN
    ALTER TABLE weekly_recipe_candidates ADD COLUMN is_manual_entry BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
