-- Create demo_accounts table to track temporary demo accounts and expiration
CREATE TABLE IF NOT EXISTS demo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_request_id UUID REFERENCES demo_requests(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}' -- stores { "full_name", "company", "source": "invite|application" }
);

CREATE INDEX IF NOT EXISTS idx_demo_accounts_expires_at ON demo_accounts(expires_at);
CREATE INDEX IF NOT EXISTS idx_demo_accounts_deleted_at ON demo_accounts(deleted_at);

-- Enable RLS (zero-policy: admin only via backend)
ALTER TABLE demo_accounts ENABLE ROW LEVEL SECURITY;

-- Create pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to delete expired demo accounts every 5 minutes
-- This function deletes demo accounts that have expired
CREATE OR REPLACE FUNCTION delete_expired_demo_accounts()
RETURNS TABLE(deleted_count INT) AS $$
DECLARE
  count INT;
BEGIN
  -- Mark as deleted (soft delete first, then hard delete after verification)
  UPDATE demo_accounts
  SET deleted_at = now()
  WHERE deleted_at IS NULL
    AND expires_at <= now();

  -- Get count of records marked for deletion
  SELECT COUNT(*) INTO count
  FROM demo_accounts
  WHERE deleted_at IS NOT NULL
    AND expires_at <= now();

  -- Hard delete from auth.users (Supabase managed)
  DELETE FROM auth.users
  WHERE id IN (
    SELECT user_id FROM demo_accounts
    WHERE deleted_at IS NOT NULL AND expires_at <= now()
  );

  -- Hard delete from profiles
  DELETE FROM profiles
  WHERE id IN (
    SELECT user_id FROM demo_accounts
    WHERE deleted_at IS NOT NULL AND expires_at <= now()
  );

  -- Finally hard delete from demo_accounts
  DELETE FROM demo_accounts
  WHERE deleted_at IS NOT NULL AND expires_at <= now();

  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cron job to run every 5 minutes
SELECT cron.schedule('delete_expired_demo_accounts', '*/5 * * * *', 'SELECT delete_expired_demo_accounts()');

-- Update demo_requests table to add approval status if not exists
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
