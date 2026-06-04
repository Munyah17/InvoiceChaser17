# Admin Account Setup Instructions

## Protected Admin Account

**Email:** hello@munya.co.zw  
**Password:** griezmann17

## Setup Steps

### 1. Run SQL Migration in Supabase

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/20240112_create_admin_user.sql`
5. Run the query

This will:
- Add `is_admin` and `is_protected` columns to the `users` table
- Create a trigger function to prevent deletion of protected users
- Update RLS policies to prevent deletion of protected users

### 2. Run Admin Creation Script

After the SQL migration is complete, run:

```bash
node scripts/create-admin.js
```

This will:
- Create the admin user via Supabase Auth (or sign in if already exists)
- Update the user profile to set `is_admin = true` and `is_protected = true`
- The account will be protected from deletion

## Verification

To verify the admin account is set up correctly:

1. Sign in with hello@munya.co.zw / griezmann17
2. Navigate to `/admin` 
3. You should see the Admin Dashboard

## Important Notes

- The admin account cannot be deleted due to the database trigger
- Only users with `is_admin = true` can access the admin panel
- The `is_protected` flag prevents account deletion even by admins
