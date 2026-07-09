-- ============================================================================
-- PHASE 1: Mini-QuickBooks Core Tables
-- ============================================================================
-- Adds: Chart of Accounts, Transactions, Recurring Invoices, Expenses, Bills
-- Created: 2026-07-09

-- 1. ACCOUNTS (Chart of Accounts)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  subtype VARCHAR(100), -- 'cash', 'checking', 'savings', 'revenue', 'cogs', etc.
  balance DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_number)
);

-- 2. TRANSACTIONS (Unified Transaction Log)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice', 'payment', 'expense', 'bill', 'journal')),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- 'invoice', 'customer', 'vendor', etc.
  reference_id UUID, -- Links to invoice, customer, expense, etc.
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. VENDORS (Vendor Management)
CREATE TABLE IF NOT EXISTS vendors (
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
  payment_terms VARCHAR(100), -- 'Net 30', 'Due on Receipt', etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. EXPENSES (Quick Expense Entry)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
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

-- 5. BILLS (Vendor Invoices - Amount Owed)
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
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

-- 6. RECURRING INVOICES (Scheduled Invoice Templates)
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  template_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL,
  auto_charge BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50), -- 'stripe', 'paynow', 'bank_transfer'
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. RECURRING_BILLS (Vendor Bills - Scheduled)
CREATE TABLE IF NOT EXISTS recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  template_bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  frequency VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL,
  auto_pay BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. TAX_CATEGORIES (Tax Mapping for Year-End)
CREATE TABLE IF NOT EXISTS tax_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tax_form_line VARCHAR(100), -- e.g., '1040-Schedule C, Line 1'
  category_name VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_id)
);

-- 9. AUDIT_LOG (Track All Changes)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- EXTEND EXISTING TABLES
-- ============================================================================

-- Add fields to profiles for mode support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_mode VARCHAR(50) DEFAULT 'business' CHECK (user_mode IN ('business', 'accountant'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shown_features JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accountant_access BOOLEAN DEFAULT FALSE;

-- Add fields to invoices for recurring reference
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID REFERENCES recurring_invoices(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_recurring_generated BOOLEAN DEFAULT FALSE;

-- Add fields to customers for vendor management (reusing customers table)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50); -- 'customer', 'vendor', or NULL
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_posted_date ON transactions(posted_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user_id ON recurring_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_status ON recurring_invoices(status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run ON recurring_invoices(next_run_date);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users see only their own data
CREATE POLICY "Users see own accounts" ON accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own expenses" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own bills" ON bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own vendors" ON vendors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own recurring invoices" ON recurring_invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own recurring bills" ON recurring_bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own tax categories" ON tax_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own audit log" ON audit_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DEFAULT CHART OF ACCOUNTS (Template for new users)
-- ============================================================================
-- Insert standard COA when new user signs up (via trigger - to be created in profiles_on_auth_user_created)

-- ============================================================================
-- CRON JOB: Auto-generate Recurring Invoices
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_recurring_invoices()
RETURNS TABLE(generated_count INT) AS $$
DECLARE
  v_count INT := 0;
  v_recurring_rec RECORD;
  v_new_invoice_id UUID;
BEGIN
  -- Find all active recurring invoices where next_run_date <= today
  FOR v_recurring_rec IN
    SELECT id, user_id, customer_id, template_invoice_id, next_run_date, frequency
    FROM recurring_invoices
    WHERE status = 'active'
      AND next_run_date <= CURRENT_DATE
  LOOP
    -- Create new invoice from template
    INSERT INTO invoices (
      user_id, customer_id, invoice_number, description, amount, currency, status, due_date, is_recurring_generated, recurring_invoice_id
    )
    SELECT
      user_id, customer_id, 'REC-' || v_recurring_rec.id || '-' || CURRENT_DATE,
      description, amount, currency, 'pending', CURRENT_DATE + INTERVAL '30 days', TRUE, v_recurring_rec.id
    FROM invoices
    WHERE id = v_recurring_rec.template_invoice_id
    RETURNING invoices.id INTO v_new_invoice_id;

    -- Update next_run_date based on frequency
    UPDATE recurring_invoices
    SET next_run_date = CASE
      WHEN frequency = 'daily' THEN CURRENT_DATE + INTERVAL '1 day'
      WHEN frequency = 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
      WHEN frequency = 'biweekly' THEN CURRENT_DATE + INTERVAL '14 days'
      WHEN frequency = 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
      WHEN frequency = 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
      WHEN frequency = 'yearly' THEN CURRENT_DATE + INTERVAL '1 year'
    END
    WHERE id = v_recurring_rec.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cron job to run daily at midnight
SELECT cron.schedule('generate_recurring_invoices', '0 0 * * *', 'SELECT generate_recurring_invoices()');

-- ============================================================================
-- CRON JOB: Check for Overdue Bills
-- ============================================================================

CREATE OR REPLACE FUNCTION check_overdue_bills()
RETURNS TABLE(overdue_count INT) AS $$
BEGIN
  UPDATE bills
  SET status = 'overdue'
  WHERE status = 'open'
    AND due_date < CURRENT_DATE;

  RETURN QUERY SELECT COUNT(*)::INT FROM bills WHERE status = 'overdue' AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('check_overdue_bills', '0 1 * * *', 'SELECT check_overdue_bills()');
