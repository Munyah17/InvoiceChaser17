-- Safe SaaS migration: RBAC + multi-tenant scaffolding
-- All changes are additive and backward-compatible

-- 1. Extend profiles.role to support super_admin (if profiles table exists)
DO $$
BEGIN
  -- Drop existing check constraint and recreate with super_admin
  ALTER TABLE IF EXISTS public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;

  ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'super_admin'));
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'profiles table not found, skipping role extension';
END $$;

-- 2. Ensure users table has role column as fallback (safe additive)
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'role column already exists on users';
END $$;

-- 3. Add organization_id scaffolding to main tables (nullable, safe)
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.invoices
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.customers
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.reminders
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.email_templates
    ADD COLUMN IF NOT EXISTS organization_id UUID DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 4. Add safe indexes for new columns
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(organization_id);
