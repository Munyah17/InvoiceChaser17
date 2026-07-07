-- Lets a user pick their account's default invoicing currency (USD, ZWG, ZAR).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'USD';
