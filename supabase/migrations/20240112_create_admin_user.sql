-- Add is_admin and is_protected columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT FALSE;

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
DROP TRIGGER IF EXISTS prevent_protected_user_deletion_trigger ON users;
CREATE TRIGGER prevent_protected_user_deletion_trigger
BEFORE DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_protected_user_deletion();

-- Insert the protected admin user
-- Note: This will need to be run with the actual user UUID after registration
-- The password 'griezmann17' should be hashed before insertion
-- For now, we'll update an existing user or create a placeholder

-- Option 1: Update existing user by email to be admin and protected
UPDATE users 
SET 
    is_admin = TRUE,
    is_protected = TRUE
WHERE email = 'hello@munya.co.zw';

-- If the user doesn't exist yet, they'll need to register first
-- Then run this update after registration

-- Create RLS policy to prevent deletion of protected users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create new policies with admin protection
CREATE POLICY "Users can insert own profile" ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON users
FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile" ON users
FOR UPDATE
USING (auth.uid() = id OR 
       (SELECT is_admin FROM users WHERE id = auth.uid()) = TRUE);

CREATE POLICY "Users can delete own profile" ON users
FOR DELETE
USING (auth.uid() = id AND 
       (SELECT is_protected FROM users WHERE id = auth.uid()) = FALSE);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
