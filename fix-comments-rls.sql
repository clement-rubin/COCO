-- Script pour corriger les politiques RLS de la table comments
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Permettre lecture publique commentaires" ON comments;
DROP POLICY IF EXISTS "Permettre insertion commentaire utilisateur" ON comments;
DROP POLICY IF EXISTS "Permettre mise à jour commentaire utilisateur" ON comments;
DROP POLICY IF EXISTS "Permettre suppression commentaire utilisateur" ON comments;

-- 2. Désactiver temporairement RLS pour diagnostiquer
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- 3. Recréer la table comments avec une structure simplifiée si nécessaire
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 500),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Réactiver RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 5. Créer des politiques plus permissives
CREATE POLICY "Lecture publique des commentaires" ON comments 
FOR SELECT USING (true);

CREATE POLICY "Insertion libre des commentaires" ON comments 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Mise à jour par propriétaire" ON comments 
FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Suppression par propriétaire" ON comments 
FOR DELETE USING (auth.uid()::text = user_id);

-- 6. Ajouter des index pour les performances
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 7. Notification de fin
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS des commentaires corrigées !';
  RAISE NOTICE '🔓 Insertion libre autorisée pour tous les utilisateurs';
  RAISE NOTICE '🔒 Modification/suppression limitée au propriétaire';
  RAISE NOTICE '👁️ Lecture publique activée';
END $$;
