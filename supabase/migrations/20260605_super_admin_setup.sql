-- ============================================================
--  Super Admin Setup Migration
--  Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- 1. Build out the profiles table with all required columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  company_name  TEXT,
  email         TEXT,
  role          TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  is_protected  BOOLEAN DEFAULT FALSE,
  avatar_url    TEXT,
  organization_id UUID,
  plan          TEXT DEFAULT 'free',
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additive: add any columns that may be missing on an existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role           TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_protected   BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan           TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Role constraint (safe drop+recreate)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Add role column to users table if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 3. Deletion-protection trigger on profiles
CREATE OR REPLACE FUNCTION public.prevent_protected_profile_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_protected = TRUE THEN
    RAISE EXCEPTION 'Cannot delete a protected super admin account.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_profile ON public.profiles;
CREATE TRIGGER protect_super_admin_profile
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_profile_deletion();

-- 4. Deletion-protection trigger on users (already exists but re-create safely)
CREATE OR REPLACE FUNCTION public.prevent_protected_user_deletion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_protected = TRUE THEN
    RAISE EXCEPTION 'Cannot delete a protected super admin account.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_protected_user_deletion_trigger ON public.users;
CREATE TRIGGER prevent_protected_user_deletion_trigger
  BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_user_deletion();

-- 5. Auto-create profiles row on new user signup (if not already there)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 6. RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"  ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR
         (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE
  USING (is_protected = FALSE AND
         (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- 7. Set Super Admin flags on the specific account
--    (User ID created by the setup script)
INSERT INTO public.profiles (id, full_name, email, role, is_protected, plan, created_at, updated_at)
VALUES (
  '33959883-96ce-4372-8cc8-39958658cef8',
  'Super Admin',
  'munyamuzvidziwa19@gmail.com',
  'super_admin',
  TRUE,
  'lifetime',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role         = 'super_admin',
  is_protected = TRUE,
  full_name    = 'Super Admin',
  email        = 'munyamuzvidziwa19@gmail.com',
  plan         = 'lifetime',
  updated_at   = NOW();

UPDATE public.users SET
  role         = 'super_admin',
  is_admin     = TRUE,
  is_protected = TRUE,
  full_name    = 'Super Admin',
  company_name = 'InvoiceChaser'
WHERE id = '33959883-96ce-4372-8cc8-39958658cef8';

-- 8. Verify
SELECT
  u.id,
  u.email,
  u.is_admin,
  u.is_protected,
  u.role        AS users_role,
  p.role        AS profiles_role,
  p.is_protected AS profiles_protected,
  p.plan
FROM public.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '33959883-96ce-4372-8cc8-39958658cef8';
