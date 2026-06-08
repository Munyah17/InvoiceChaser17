-- ============================================================
--  Fix: Set super_admin role for munyamuzvidziwa19@gmail.com
--  Uses email-based lookup — safe regardless of UUID
--  Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'munyamuzvidziwa19@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User munyamuzvidziwa19@gmail.com not found in auth.users — nothing changed.';
    RETURN;
  END IF;

  -- Upsert profile row
  INSERT INTO public.profiles (id, name, full_name, email, role, is_protected, plan, created_at, updated_at)
  VALUES (
    v_user_id,
    'Super Admin',
    'Super Admin',
    'munyamuzvidziwa19@gmail.com',
    'super_admin',
    TRUE,
    'lifetime',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role         = 'super_admin',
    is_protected = TRUE,
    plan         = 'lifetime',
    updated_at   = NOW();

  -- Mirror on users table (legacy fallback)
  UPDATE public.users SET
    role         = 'super_admin',
    is_admin     = TRUE,
    is_protected = TRUE
  WHERE id = v_user_id;

  RAISE NOTICE 'Super admin role applied to user ID: %', v_user_id;
END;
$$;

-- Verify — should show role=super_admin, plan=lifetime
SELECT
  u.id,
  u.email,
  p.role,
  p.is_protected,
  p.plan
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'munyamuzvidziwa19@gmail.com';
