-- Security hardening migration
-- Fixes: GRANT ALL to anon, USING(true) RLS policies, missing REVOKE EXECUTE on functions

-- ─────────────────────────────────────────────
-- 1. Revoke overly-broad table permissions from anon
--    The original migration ran: GRANT ALL ON ALL TABLES TO anon
--    This gives unauthenticated users INSERT/UPDATE/DELETE at the table level.
--    Replace with minimal grants: anon only needs USAGE on the schema.
-- ─────────────────────────────────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Re-grant only what authenticated users need (RLS still filters rows)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- anon gets nothing beyond schema usage (no table access)
GRANT USAGE ON SCHEMA public TO anon;

-- ─────────────────────────────────────────────
-- 2. Fix the "Users can view all profiles" policy on the users table
--    USING (true) exposes ALL rows to anyone including unauthenticated callers.
--    Replace with: each user sees only their own row; admins see all.
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;

CREATE POLICY "Users can view own or admin view all" ON public.users
FOR SELECT
USING (
  auth.uid() = id
  OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
);

-- ─────────────────────────────────────────────
-- 3. Fix the profiles table SELECT policy (USING(true) from super_admin_setup migration)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- ─────────────────────────────────────────────
-- 4. Lock down Postgres functions — revoke PUBLIC execute,
--    grant only to service_role (backend) or authenticated where appropriate
-- ─────────────────────────────────────────────

-- retry_failed_emails — internal maintenance, backend only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'retry_failed_emails'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.retry_failed_emails() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.retry_failed_emails() FROM anon;
    GRANT EXECUTE ON FUNCTION public.retry_failed_emails() TO service_role;
  END IF;
END $$;

-- has_active_subscription — SECURITY DEFINER, must not be public
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_active_subscription'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM anon;
    GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;
  END IF;
END $$;

-- apply_chaser_fee — financial logic, backend only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'apply_chaser_fee'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.apply_chaser_fee(decimal) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.apply_chaser_fee(decimal) FROM anon;
    GRANT EXECUTE ON FUNCTION public.apply_chaser_fee(decimal) TO service_role;
  END IF;
END $$;

-- check_invoice_status — called via RPC, lock to authenticated + service_role
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_invoice_status'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.check_invoice_status() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.check_invoice_status() FROM anon;
    GRANT EXECUTE ON FUNCTION public.check_invoice_status() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.check_invoice_status() TO service_role;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. Ensure future functions created in public schema default to no PUBLIC execute
--    (PostgreSQL 15+ default, but set explicitly for safety)
-- ─────────────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
