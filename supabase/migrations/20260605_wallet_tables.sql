-- Wallet & wallet transactions tables
CREATE TABLE IF NOT EXISTS public.wallets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance    DECIMAL(12,2) DEFAULT 0 NOT NULL,
  currency   TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  wallet_id   UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount      DECIMAL(12,2) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('credit','debit','withdrawal_request','refund','adjustment')),
  description TEXT,
  reference   TEXT,
  status      TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id           ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_user_id       ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_id     ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at    ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select"   ON public.wallets;
DROP POLICY IF EXISTS "wallet_insert"   ON public.wallets;
DROP POLICY IF EXISTS "wallet_update"   ON public.wallets;

CREATE POLICY "wallet_select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallet_update" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_txn_select" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_txn_insert" ON public.wallet_transactions;

CREATE POLICY "wallet_txn_select" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_txn_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
