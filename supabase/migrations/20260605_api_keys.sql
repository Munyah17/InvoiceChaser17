-- ──────────────────────────────────────────────────────────────────────────
-- API Keys & Usage tables
-- Run this in Supabase SQL Editor after 20260605_wallet_tables.sql
-- ──────────────────────────────────────────────────────────────────────────

-- Client-generated API key pairs
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name                TEXT NOT NULL,                              -- human label
  publishable_key     TEXT UNIQUE NOT NULL,                       -- ic_pk_live_xxx  (safe for client-side)
  secret_key_hash     TEXT NOT NULL,                              -- TODO: hash via pg_crypto in production
  secret_key_prefix   TEXT NOT NULL,                             -- first 20 chars shown in UI after creation
  status              TEXT DEFAULT 'active'
                        CHECK (status IN ('active','paused','revoked')),
  -- usage counters (updated by webhook/server)
  total_requests      BIGINT  DEFAULT 0,
  total_charged       DECIMAL(14,6) DEFAULT 0,
  last_used_at        TIMESTAMP WITH TIME ZONE,
  -- config
  rate_limit_per_min  INT DEFAULT 60,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-request usage log
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id  UUID REFERENCES public.api_keys(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE  NOT NULL,
  operation   TEXT NOT NULL,   -- 'read' | 'write' | 'webhook' | 'bulk' | 'payment_link'
  endpoint    TEXT,
  cost        DECIMAL(10,6) NOT NULL,  -- USD deducted from wallet per request
  status      TEXT DEFAULT 'success'
                CHECK (status IN ('success','failed','rate_limited')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id        ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_pub_key        ON public.api_keys(publishable_key);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id    ON public.api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_user_id   ON public.api_key_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created   ON public.api_key_usage(created_at DESC);

-- RLS
ALTER TABLE public.api_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage  ENABLE ROW LEVEL SECURITY;

-- Clients can only see / manage their own keys
DROP POLICY IF EXISTS "api_keys_select"  ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_insert"  ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_update"  ON public.api_keys;

CREATE POLICY "api_keys_select" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "api_keys_insert" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow update (revoke status) by owner; admin/super_admin bypass via service role
CREATE POLICY "api_keys_update" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Usage log: clients read their own, server inserts via service role
DROP POLICY IF EXISTS "api_key_usage_select" ON public.api_key_usage;
CREATE POLICY "api_key_usage_select" ON public.api_key_usage
  FOR SELECT USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- API request pricing reference (informational — enforced server-side)
-- ──────────────────────────────────────────────────────────────────────────
-- READ  operations  (GET /invoices, /customers, /reminders)  : $0.001 / req
-- WRITE operations  (create invoice, add reminder, etc.)     : $0.005 / req
-- WEBHOOK delivery  (outbound event per endpoint)            : $0.002 / req
-- BULK  operations  (export, bulk send)                      : $0.010 / req
-- PAYMENT_LINK      (Stripe/Paynow link generation)          : $0.010 / req
--
-- Minimum wallet balance to activate keys : $1.00
-- Keys auto-pause  when balance reaches   : $0.00
-- Keys auto-resume when balance exceeds   : $0.01  (after top-up)
-- ──────────────────────────────────────────────────────────────────────────
