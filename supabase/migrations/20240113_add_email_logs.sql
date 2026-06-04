-- Add email_logs table for email tracking and retry logic

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retried')),
    message_id TEXT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_invoice_id ON email_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own email logs"
    ON email_logs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM invoices i
        JOIN auth.users u ON u.id = i.user_id
        WHERE i.id = email_logs.invoice_id
        AND u.id = auth.uid()
      )
    );

CREATE POLICY "Admins can view all email logs"
    ON email_logs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = TRUE
      )
    );

-- Function to retry failed emails
CREATE OR REPLACE FUNCTION retry_failed_emails()
RETURNS INTEGER AS $$
DECLARE
    retry_count INTEGER := 0;
BEGIN
    -- Update failed emails that haven't been retried more than 3 times
    UPDATE email_logs
    SET status = 'pending',
        retry_count = retry_count + 1
    WHERE status = 'failed'
    AND retry_count < 3
    AND created_at > NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS retry_count = ROW_COUNT;
    RETURN retry_count;
END;
$$ LANGUAGE plpgsql;
