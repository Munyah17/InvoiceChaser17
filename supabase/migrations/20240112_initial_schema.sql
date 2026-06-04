-- InvoiceChaser Database Schema
-- This script creates all necessary tables, RLS policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_protected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    customer_id UUID,
    invoice_number TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transaction_id TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_invoice_id ON public.reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_at ON public.reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create function to prevent deletion of protected users
CREATE OR REPLACE FUNCTION prevent_protected_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_protected = TRUE THEN
        RAISE EXCEPTION 'Cannot delete protected user';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of protected users
DROP TRIGGER IF EXISTS prevent_protected_user_deletion_trigger ON public.users;
CREATE TRIGGER prevent_protected_user_deletion_trigger
BEFORE DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION prevent_protected_user_deletion();

-- RLS Policies for users
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.users
FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
USING (auth.uid() = id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can delete own profile" ON public.users
FOR DELETE
USING (auth.uid() = id AND 
       (SELECT is_protected FROM public.users WHERE id = auth.uid()) = FALSE);

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" ON public.invoices
FOR SELECT
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can insert own invoices" ON public.invoices
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON public.invoices
FOR UPDATE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can delete own invoices" ON public.invoices
FOR DELETE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

-- RLS Policies for customers
CREATE POLICY "Users can view own customers" ON public.customers
FOR SELECT
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can insert own customers" ON public.customers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON public.customers
FOR UPDATE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can delete own customers" ON public.customers
FOR DELETE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

-- RLS Policies for reminders
CREATE POLICY "Users can view own reminders" ON public.reminders
FOR SELECT
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can insert own reminders" ON public.reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders" ON public.reminders
FOR UPDATE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can delete own reminders" ON public.reminders
FOR DELETE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON public.payments
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = payments.invoice_id 
    AND invoices.user_id = auth.uid()
) OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can insert own payments" ON public.payments
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.invoices 
    WHERE invoices.id = payments.invoice_id 
    AND invoices.user_id = auth.uid()
));

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id OR 
       (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, company_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'company_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
