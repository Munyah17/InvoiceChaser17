-- Add missing columns that the frontend expects but were not in the initial schema

-- Invoices: customer_name, customer_email, description, payment_link columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMP WITH TIME ZONE;

-- Reminders: type column (before_due, due, overdue_7, overdue_14, escalation_*)
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'reminder';

-- Wallet table — simple balance ledger per user
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet transactions — every credit/debit entry
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal_request')),
  description TEXT,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appeals table — debtors disputing an invoice chase
CREATE TABLE IF NOT EXISTS public.appeals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  debtor_name TEXT NOT NULL,
  debtor_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'declined', 'approved')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- RLS for wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- RLS for appeals
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert appeal" ON public.appeals FOR INSERT WITH CHECK (true);
CREATE POLICY "Invoice owners can view appeals on their invoices" ON public.appeals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = appeals.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Invoice owners can update appeal status" ON public.appeals FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.invoices WHERE invoices.id = appeals.invoice_id AND invoices.user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_invoice_id ON public.wallet_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_appeals_invoice_id ON public.appeals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON public.invoices(customer_email);
