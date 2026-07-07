-- Fix: frontend selects/inserts a `company` field on customers (src/lib/api.js,
-- CustomersPage.jsx) but the column was never added to the schema, breaking the
-- Customers page (400 "column customers.company does not exist") for every user.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company TEXT;
