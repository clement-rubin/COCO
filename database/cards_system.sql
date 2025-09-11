-- Système de cartes à collectionner pour COCO
-- Tables pour gérer les collections de cartes et les échanges entre utilisateurs

-- Table pour stocker les cartes possédées par chaque utilisateur
CREATE TABLE IF NOT EXISTS public.user_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  owned_cards JSONB DEFAULT '[]'::jsonb NOT NULL,
  collection_stats JSONB DEFAULT '{}'::jsonb NOT NULL,
  total_packs_opened INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table pour les offres d'échange entre utilisateurs
CREATE TABLE IF NOT EXISTS public.trade_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  acceptor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  offering_card_id TEXT NOT NULL, -- ID de la carte proposée
  wanting_card_id TEXT NOT NULL,  -- ID de la carte demandée
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- Table pour l'historique des échanges complétés
CREATE TABLE IF NOT EXISTS public.trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_offer_id UUID REFERENCES public.trade_offers(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_traded TEXT NOT NULL,
  trade_value INTEGER DEFAULT 0, -- Valeur estimée de la carte
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table pour le marketplace des cartes (vente directe)
CREATE TABLE IF NOT EXISTS public.card_marketplace (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  price INTEGER NOT NULL, -- Prix en CocoCoins
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + INTERVAL '14 days')
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON public.user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_creator_id ON public.trade_offers(creator_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON public.trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_trade_offers_expires_at ON public.trade_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_trade_history_from_user ON public.trade_history(from_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_to_user ON public.trade_history(to_user_id);
CREATE INDEX IF NOT EXISTS idx_card_marketplace_seller ON public.card_marketplace(seller_id);
CREATE INDEX IF NOT EXISTS idx_card_marketplace_status ON public.card_marketplace(status);

-- RLS (Row Level Security) policies
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_marketplace ENABLE ROW LEVEL SECURITY;

-- Politique pour user_cards : utilisateurs peuvent voir et modifier leurs propres cartes
CREATE POLICY "Users can view own cards" ON public.user_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON public.user_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON public.user_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politique pour trade_offers : utilisateurs peuvent voir les offres publiques et leurs propres offres
CREATE POLICY "Users can view trade offers" ON public.trade_offers
  FOR SELECT USING (
    status = 'pending' OR 
    auth.uid() = creator_id OR 
    auth.uid() = acceptor_id
  );

CREATE POLICY "Users can create trade offers" ON public.trade_offers
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own trade offers" ON public.trade_offers
  FOR UPDATE USING (
    auth.uid() = creator_id OR 
    (auth.uid() = acceptor_id AND status = 'pending')
  );

-- Politique pour trade_history : utilisateurs peuvent voir leurs propres échanges
CREATE POLICY "Users can view own trade history" ON public.trade_history
  FOR SELECT USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id
  );

-- Politique pour card_marketplace : tous peuvent voir les annonces actives, seuls les propriétaires peuvent modifier
CREATE POLICY "Users can view active marketplace listings" ON public.card_marketplace
  FOR SELECT USING (status = 'active' OR auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Users can create marketplace listings" ON public.card_marketplace
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update own marketplace listings" ON public.card_marketplace
  FOR UPDATE USING (auth.uid() = seller_id);

-- Fonction pour nettoyer automatiquement les offres expirées
CREATE OR REPLACE FUNCTION cleanup_expired_trades()
RETURNS void AS $$
BEGIN
  -- Annuler les offres d'échange expirées
  UPDATE public.trade_offers 
  SET status = 'cancelled'
  WHERE status = 'pending' 
    AND expires_at < timezone('utc'::text, now());
    
  -- Annuler les annonces marketplace expirées
  UPDATE public.card_marketplace 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;

-- Créer une tâche cron pour nettoyer les offres expirées (si pg_cron est disponible)
-- SELECT cron.schedule('cleanup-expired-trades', '0 2 * * *', 'SELECT cleanup_expired_trades();');

-- Fonction pour obtenir les statistiques de collection d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_collection_stats(target_user_id UUID)
RETURNS TABLE (
  total_cards INTEGER,
  unique_cards INTEGER,
  legendary_cards INTEGER,
  epic_cards INTEGER,
  rare_cards INTEGER,
  collection_value INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(jsonb_array_length(owned_cards), 0)::INTEGER as total_cards,
    COALESCE(jsonb_array_length(owned_cards), 0)::INTEGER as unique_cards, -- Simplified for now
    0::INTEGER as legendary_cards, -- Would need card data parsing
    0::INTEGER as epic_cards,
    0::INTEGER as rare_cards,
    0::INTEGER as collection_value
  FROM public.user_cards 
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Vues utiles pour les statistiques
CREATE OR REPLACE VIEW public.trade_stats AS
SELECT 
  DATE_TRUNC('day', completed_at) as trade_date,
  COUNT(*) as trades_count,
  COUNT(DISTINCT from_user_id) as unique_traders
FROM public.trade_history
WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', completed_at)
ORDER BY trade_date DESC;

-- Vue pour le leaderboard des collectionneurs
CREATE OR REPLACE VIEW public.collection_leaderboard AS
SELECT 
  p.user_id,
  p.display_name,
  p.avatar_url,
  COALESCE(jsonb_array_length(uc.owned_cards), 0) as total_cards,
  uc.total_packs_opened,
  ROW_NUMBER() OVER (ORDER BY COALESCE(jsonb_array_length(uc.owned_cards), 0) DESC) as rank
FROM public.profiles p
LEFT JOIN public.user_cards uc ON p.user_id = uc.user_id
ORDER BY total_cards DESC
LIMIT 100;

COMMENT ON TABLE public.user_cards IS 'Stockage des collections de cartes pour chaque utilisateur';
COMMENT ON TABLE public.trade_offers IS 'Offres d''échange de cartes entre utilisateurs';
COMMENT ON TABLE public.trade_history IS 'Historique des échanges complétés';
COMMENT ON TABLE public.card_marketplace IS 'Marketplace pour vendre des cartes contre des CocoCoins';