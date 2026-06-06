-- ============================================================
--  InvoiceChaser — Combined Pending Migrations
--  Paste this entire file into:
--    Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. Extra columns on existing tables (20260603)
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_name        TEXT,
  ADD COLUMN IF NOT EXISTS customer_email       TEXT,
  ADD COLUMN IF NOT EXISTS description          TEXT,
  ADD COLUMN IF NOT EXISTS payment_link         TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'reminder';

-- ──────────────────────────────────────────────────────────
-- 2. Wallets table (full schema)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency   TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any columns that may be missing if table was already partially created
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS currency   TEXT DEFAULT 'USD';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select"                  ON public.wallets;
DROP POLICY IF EXISTS "wallet_insert"                  ON public.wallets;
DROP POLICY IF EXISTS "wallet_update"                  ON public.wallets;
DROP POLICY IF EXISTS "Users can view own wallet"      ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet"    ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet"    ON public.wallets;

CREATE POLICY "wallet_select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallet_update" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 3. Wallet transactions table (full schema)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id)    ON DELETE CASCADE NOT NULL,
  wallet_id   UUID REFERENCES public.wallets(id)  ON DELETE CASCADE,
  invoice_id  UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount      DECIMAL(12,2) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('credit','debit','withdrawal_request','refund','adjustment')),
  description TEXT,
  reference   TEXT,
  status      TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id  UUID REFERENCES public.wallets(id)  ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS status     TEXT DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS idx_wallet_txns_user_id    ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_id  ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at ON public.wallet_transactions(created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_txn_select"                               ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_txn_insert"                               ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view own wallet transactions"          ON public.wallet_transactions;

CREATE POLICY "wallet_txn_select" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_txn_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 4. Appeals table
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appeals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  debtor_name  TEXT NOT NULL,
  debtor_email TEXT NOT NULL,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','under_review','declined','approved')),
  admin_notes  TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appeals_invoice_id    ON public.appeals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert appeal"                       ON public.appeals;
DROP POLICY IF EXISTS "Invoice owners can view appeals on their invoices" ON public.appeals;
DROP POLICY IF EXISTS "Invoice owners can update appeal status"        ON public.appeals;

CREATE POLICY "Anyone can insert appeal" ON public.appeals FOR INSERT WITH CHECK (true);
CREATE POLICY "Invoice owners can view appeals on their invoices" ON public.appeals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = appeals.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Invoice owners can update appeal status" ON public.appeals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = appeals.invoice_id AND invoices.user_id = auth.uid()));

-- ──────────────────────────────────────────────────────────
-- 5. API Keys table
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name                TEXT NOT NULL,
  publishable_key     TEXT UNIQUE NOT NULL,
  secret_key_hash     TEXT NOT NULL,
  secret_key_prefix   TEXT NOT NULL,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  total_requests      BIGINT  DEFAULT 0,
  total_charged       DECIMAL(14,6) DEFAULT 0,
  last_used_at        TIMESTAMP WITH TIME ZONE,
  rate_limit_per_min  INT DEFAULT 60,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id  ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_pub_key  ON public.api_keys(publishable_key);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_select" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update" ON public.api_keys;

CREATE POLICY "api_keys_select" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 6. API Key Usage log
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id  UUID REFERENCES public.api_keys(id)  ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id)      ON DELETE CASCADE NOT NULL,
  operation   TEXT NOT NULL,
  endpoint    TEXT,
  cost        DECIMAL(10,6) NOT NULL,
  status      TEXT DEFAULT 'success' CHECK (status IN ('success','failed','rate_limited')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id  ON public.api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user_id ON public.api_key_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON public.api_key_usage(created_at DESC);

ALTER TABLE public.api_key_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_key_usage_select" ON public.api_key_usage;
CREATE POLICY "api_key_usage_select" ON public.api_key_usage FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- 7. Notify PostgREST to reload schema cache
-- ──────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ──────────────────────────────────────────────────────────
-- 8. Verify — should show 6 table names
-- ──────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'wallets','wallet_transactions','appeals',
    'api_keys','api_key_usage'
  )
ORDER BY table_name;
