-- ============================================================================
-- STABILIZATION REPAIR — 2026-07-10
-- ============================================================================
-- Root-cause fixes discovered during full production audit:
--   1) QuickBooks Phase 1 schema was never applied to production
--      (accounts, transactions, vendors, expenses, bills, recurring_invoices,
--       recurring_bills, tax_categories, audit_log) — all Phase 1 features 404'd.
--   2) email_logs / email_templates / enterprise_requests tables missing.
--   3) CRITICAL: handle_new_user_profile() took `role` from user-editable
--      signup metadata → anyone could self-register as super_admin.
--   4) profiles.role column default was 'policy_admin' (leftover from an
--      unrelated project schema) → unrecognized role, misrouted users.
--   5) 26 of 44 auth accounts had no profiles row (created before the
--      auto-create trigger existed) → role resolved to 'user' → admins were
--      routed to the client dashboard. This was the misrouting root cause.
--   6) profiles/users SELECT policies were `USING (true)` → every visitor
--      (including anon) could read all user emails/names/plans.
--   7) CRITICAL: profiles UPDATE policy let any user update their own row
--      with no column restrictions → self-escalation to super_admin/plan.
-- All statements are idempotent (safe to re-run).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION A: Role helper functions (SECURITY DEFINER, bypass RLS — used by
-- policies below; only reveal the CALLER's own privilege level)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
REVOKE ALL ON FUNCTION public.is_super_admin_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin_user() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION B: Fix signup trigger (privilege escalation) + role default
-- ────────────────────────────────────────────────────────────────────────────

-- Role must NEVER come from user-editable signup metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, email, role, plan, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'user',
    'free',
    NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION C: Backfill missing profiles rows (pre-trigger accounts).
-- Role derives from the legacy users.is_admin flag only.
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.profiles (id, name, full_name, email, role, plan, created_at, updated_at)
SELECT
  au.id,
  COALESCE(u.full_name, split_part(au.email, '@', 1)),
  u.full_name,
  au.email,
  CASE WHEN COALESCE(u.is_admin, false) THEN 'admin' ELSE 'user' END,
  'free',
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Sanitize any lingering unrecognized roles (e.g. 'policy_admin' leftovers)
UPDATE public.profiles
SET role = 'user'
WHERE role NOT IN ('user', 'admin', 'super_admin');

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION D: Harden RLS on profiles / users
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_super_admin_user())
  WITH CHECK (auth.uid() = id OR public.is_super_admin_user());

DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_delete ON public.profiles FOR DELETE TO authenticated
  USING (is_protected = false AND public.is_super_admin_user());

DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Column-level privileges: clients may edit their own display fields but can
-- NEVER touch role / plan / is_protected — those change only via service_role
-- in /api/admin. (RLS is row-level only; this closes the column hole.)
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, name, full_name, company_name, email, phone, avatar_url, default_currency)
  ON public.profiles TO authenticated;
GRANT UPDATE (name, full_name, company_name, email, phone, avatar_url, default_currency, updated_at, last_login)
  ON public.profiles TO authenticated;

REVOKE INSERT, UPDATE ON public.users FROM anon, authenticated;
GRANT INSERT (id, email, full_name, company_name)
  ON public.users TO authenticated;
GRANT UPDATE (email, full_name, company_name, updated_at)
  ON public.users TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION E: QuickBooks Phase 1 schema (was never applied to production)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  subtype VARCHAR(100),
  balance DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_number)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'payment', 'expense', 'bill', 'journal')),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  payment_terms VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(100),
  description TEXT,
  receipt_url VARCHAR(500),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  bill_number VARCHAR(100) NOT NULL,
  amount_due DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'overdue', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, bill_number)
);

CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  template_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL,
  auto_charge BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  template_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  frequency VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL,
  auto_pay BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tax_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tax_form_line VARCHAR(100),
  category_name VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_mode VARCHAR(50) DEFAULT 'business';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shown_features JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accountant_access BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES public.recurring_invoices(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_recurring_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON public.accounts(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_posted_date ON public.transactions(posted_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user_id ON public.recurring_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON public.recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run ON public.recurring_invoices(next_run_date);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own accounts" ON public.accounts;
CREATE POLICY "Users see own accounts" ON public.accounts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own transactions" ON public.transactions;
CREATE POLICY "Users see own transactions" ON public.transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own expenses" ON public.expenses;
CREATE POLICY "Users see own expenses" ON public.expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own bills" ON public.bills;
CREATE POLICY "Users see own bills" ON public.bills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own vendors" ON public.vendors;
CREATE POLICY "Users see own vendors" ON public.vendors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own recurring invoices" ON public.recurring_invoices;
CREATE POLICY "Users see own recurring invoices" ON public.recurring_invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own recurring bills" ON public.recurring_bills;
CREATE POLICY "Users see own recurring bills" ON public.recurring_bills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own tax categories" ON public.tax_categories;
CREATE POLICY "Users see own tax categories" ON public.tax_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users see own audit log" ON public.audit_log;
CREATE POLICY "Users see own audit log" ON public.audit_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION F: email_logs / email_templates / enterprise_requests
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retried')),
  message_id TEXT,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_invoice_id ON public.email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
CREATE POLICY "Users can view their own email logs" ON public.email_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = email_logs.invoice_id AND i.user_id = auth.uid())
    OR public.is_admin_user()
  );

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, template_key)
);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own email templates" ON public.email_templates;
CREATE POLICY "Users manage own email templates" ON public.email_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.enterprise_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.enterprise_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users create own enterprise requests" ON public.enterprise_requests;
CREATE POLICY "Users create own enterprise requests" ON public.enterprise_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view enterprise requests" ON public.enterprise_requests;
CREATE POLICY "Admins view enterprise requests" ON public.enterprise_requests FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION G: Recurring invoice generation + overdue bills (pg_cron)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_recurring_invoices()
RETURNS TABLE(generated_count INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_recurring_rec RECORD;
  v_next_run DATE;
  v_new_status TEXT;
BEGIN
  FOR v_recurring_rec IN
    SELECT id, user_id, customer_id, template_invoice_id, next_run_date, frequency, end_date
    FROM recurring_invoices
    WHERE status = 'active'
      AND next_run_date <= CURRENT_DATE
      AND template_invoice_id IS NOT NULL
  LOOP
    INSERT INTO invoices (
      user_id, customer_id, invoice_number, description, amount, currency,
      status, due_date, is_recurring_generated, recurring_invoice_id,
      customer_name, customer_email
    )
    SELECT
      user_id, v_recurring_rec.customer_id,
      'REC-' || left(v_recurring_rec.id::text, 8) || '-' || to_char(CURRENT_DATE, 'YYYYMMDD'),
      COALESCE(description, 'Recurring: ' || invoice_number),
      amount, currency, 'pending', CURRENT_DATE + INTERVAL '30 days', TRUE, v_recurring_rec.id,
      customer_name, customer_email
    FROM invoices
    WHERE id = v_recurring_rec.template_invoice_id
    ON CONFLICT DO NOTHING;

    v_next_run := CASE
      WHEN v_recurring_rec.frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
      WHEN v_recurring_rec.frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
      WHEN v_recurring_rec.frequency = 'biweekly' THEN CURRENT_DATE + INTERVAL '14 days'
      WHEN v_recurring_rec.frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      WHEN v_recurring_rec.frequency = 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
      WHEN v_recurring_rec.frequency = 'yearly' THEN CURRENT_DATE + INTERVAL '1 year'
      ELSE CURRENT_DATE + INTERVAL '1 month'
    END;

    v_new_status := CASE
      WHEN v_recurring_rec.end_date IS NOT NULL AND v_next_run > v_recurring_rec.end_date THEN 'completed'
      ELSE 'active'
    END;

    UPDATE recurring_invoices
    SET next_run_date = v_next_run, status = v_new_status, updated_at = now()
    WHERE id = v_recurring_rec.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_overdue_bills()
RETURNS TABLE(overdue_count INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bills SET status = 'overdue', updated_at = now()
  WHERE status = 'open' AND due_date < CURRENT_DATE;

  RETURN QUERY SELECT COUNT(*)::INT FROM bills WHERE status = 'overdue';
END;
$$;

-- RPC lockdown: cron runs as the function owner; clients must not call these.
REVOKE ALL ON FUNCTION public.generate_recurring_invoices() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_overdue_bills() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('generate_recurring_invoices');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('generate_recurring_invoices', '0 0 * * *', 'SELECT public.generate_recurring_invoices()');

DO $$
BEGIN
  PERFORM cron.unschedule('check_overdue_bills');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule('check_overdue_bills', '0 1 * * *', 'SELECT public.check_overdue_bills()');

-- ────────────────────────────────────────────────────────────────────────────
-- SECTION H: Fix FK delete rules so admin "Delete user" works.
-- public.users → auth.users was ON DELETE NO ACTION, and public.profiles had
-- no FK at all → deleting an auth user failed with a FK violation, so the admin
-- delete-user flow (which deletes the profile then calls auth.admin.deleteUser)
-- always errored. CASCADE both; the prevent_protected_* BEFORE-DELETE triggers
-- still block removal of protected super-admin rows.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
