# Demo Account System - Complete Guide

## Overview

The demo account system allows users to:
- **Apply for a demo** via the Request Demo form
- **Admins approve/reject** applications from the admin panel
- **Auto-create demo accounts** with mock data upon approval
- **Auto-delete demo accounts** after exactly 48 hours

---

## System Architecture

### Database Schema

**New Table: `demo_accounts`**
```sql
id (UUID)                  -- Unique demo account ID
user_id (UUID)             -- Links to auth.users
demo_request_id (UUID)     -- Links back to demo_requests
email (TEXT)               -- Demo user email
password_hash (TEXT)       -- Hashed temporary password
created_at (TIMESTAMP)     -- When account was created
expires_at (TIMESTAMP)     -- When account auto-deletes (created_at + 48 hours)
deleted_at (TIMESTAMP)     -- Soft delete marker (NULL until deleted)
metadata (JSONB)           -- Stores full_name, company, source
```

**Updated Table: `demo_requests`**
```sql
-- New columns:
status (TEXT)              -- 'pending' | 'approved' | 'rejected'
approved_at (TIMESTAMP)    -- When admin approved/rejected
approved_by (UUID)         -- Which admin approved
rejection_reason (TEXT)    -- Why demo was rejected (nullable)
```

### Auto-Deletion Cron Job

**Function:** `delete_expired_demo_accounts()`
- Runs every 5 minutes via `pg_cron`
- Finds all demo accounts where `expires_at <= now()`
- Soft deletes (marks `deleted_at`)
- Hard deletes from `auth.users`, `profiles`, `demo_accounts`
- Completely wipes demo user data

---

## User Journey

### Step 1: User Applies for Demo
1. User clicks "Request Demo" button on landing page
2. Fills form: email, full_name, company, business_type, etc.
3. Submission stored in `demo_requests` table with `status='pending'`

### Step 2: Admin Approves Request
1. Super Admin logs in → Admin Panel → Demo Requests tab
2. Sees list of pending applications
3. Reviews company info, interests, message
4. Clicks **"Approve"** button

### Step 3: Auto-Account Creation
When approved, the system automatically:
1. Creates Supabase auth user (email + temporary password)
2. Creates user profile with:
   - `role='user'`
   - `plan='lifetime'` (unlimited access)
   - Name from application
3. Creates 3 sample customers
4. Creates 3 sample invoices (paid, pending, overdue)
5. Creates demo wallet with $100 balance
6. Stores everything in `demo_accounts` with 48-hour expiration

### Step 4: Demo User Can Log In
- Email: (from application)
- Password: (shown once in approval notification)
- Can access full InvoiceChaser platform with mock data
- All features enabled (lifetime plan)

### Step 5: Auto-Deletion (48 hours later)
- Cron job detects `expires_at <= now()`
- Account and all related data automatically deleted
- Clean cleanup: auth user, profile, invoices, customers, wallet, everything

---

## Admin Panel - Demo Requests Tab

### UI Components

**Header:**
- "Demo Requests" title
- Shows count of pending requests (badge)

**Request Card (Per Application):**
- User name (large, bold)
- Email (gray, smaller)
- Status badge (amber=pending, green=approved, gray=rejected)
- Company info: Company Name · Business Type · Company Size
- Interest tags (e.g., "Invoicing", "API Access", "Automation")
- User message (if provided)
- Timestamp of application

**Action Buttons (For Pending Requests Only):**
- **Approve** (green) → Creates account immediately
- **Reject** (red) → Opens modal to add rejection reason

**Reject Modal:**
- Textarea for optional rejection reason
- "Cancel" button
- "Reject" button → Marks request as rejected

**Approved/Rejected Requests:**
- Show status only (no action buttons)
- Optional: rejection reason visible

---

## API Routes

### `POST /api/admin-approve-demo`

**Authentication:** Requires admin/super_admin JWT token

**Request Body:**
```json
{
  "demoRequestId": "uuid-here",
  "action": "approve" | "reject",
  "reason": "optional reason if rejecting"
}
```

**Response (Success):**
```json
{
  "success": true,
  "action": "approve",
  "accountCreated": true,
  "credentials": {
    "email": "user@example.com",
    "tempPassword": "ABC123Xyz!",
    "expiresAt": "2026-07-10T14:30:00Z"
  },
  "message": "Demo approved and account created"
}
```

The admin UI shows these credentials once, immediately after approval — share them with the requester. If account creation fails, the request stays approved and `accountCreated: false` is returned; retry via `POST /api/create-demo-account`.

**Response (Error):**
```json
{
  "error": "Demo request not found"
}
```

### `POST /api/create-demo-account`

**Authentication:** Requires admin/super_admin JWT token

**Use:** Manual retry — creates the account for an already-approved request if creation failed during approval. (Approval itself creates the account directly; this route is not called automatically.)

**Request Body:**
```json
{
  "demoRequestId": "uuid-here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "userId": "uuid-of-new-user",
  "email": "user@example.com",
  "tempPassword": "ABC123Xyz!",
  "expiresAt": "2026-07-10T14:30:00Z"
}
```

---

## Testing the System

### Prerequisites
- Logged in as super_admin
- At least one pending demo request in the database

### Test Scenario 1: Approve Demo Request

1. Navigate to: `http://localhost:4181/app/admin?tab=demo_requests`
2. Find a pending request
3. Click **Approve** button
4. UI shows "Processing..." temporarily
5. Refresh page (or wait) → Request status changes to "approved"
6. New user account should be created in profiles table

### Test Scenario 2: Reject Demo Request with Reason

1. Navigate to: `http://localhost:4181/app/admin?tab=demo_requests`
2. Find a different pending request
3. Click **Reject** button
4. Modal appears asking for reason
5. Type reason: "Business model doesn't fit our market"
6. Click **Reject** button
7. Refresh → Request shows "rejected" status

### Test Scenario 3: Login as Demo User

1. After approving a request, get the temp password from the API response
2. Go to: `http://localhost:4181/login`
3. Email: (the demo user's email)
4. Password: (the temp password from approval)
5. Should log in successfully
6. Dashboard shows mock invoices and customers
7. Wallet shows $100 balance
8. All features available (Invoices, Customers, Reminders, etc.)

### Test Scenario 4: Auto-Deletion After 48 Hours

1. Manually update demo account expiration:
   ```sql
   UPDATE demo_accounts
   SET expires_at = now()
   WHERE user_id = 'demo-user-id';
   ```

2. Wait 5 minutes (cron job runs every 5 minutes)
3. Check that:
   - `demo_accounts` record is deleted
   - `profiles` record is deleted
   - `auth.users` record is deleted
   - Demo user can no longer log in

---

## Mock Data Provided

### Sample Customers
1. **Acme Corp** - john@acmecorp.com
2. **TechStart Inc** - info@techstart.com
3. **Global Solutions Ltd** - contact@globalsol.com

### Sample Invoices
1. **INV-001** - Acme Corp - $5,000 (PAID, 15 days ago)
2. **INV-002** - TechStart Inc - $3,200 (PENDING, due in 5 days)
3. **INV-003** - Global Solutions Ltd - $7,500 (OVERDUE, 5 days past due)

### Demo Wallet
- Balance: $100 USD
- Currency: USD
- Can top-up, withdraw, see transactions

---

## Implementation Files

### Backend (API Routes)
- `api/admin-approve-demo.js` — Approval/rejection handler
- `api/create-demo-account.js` — Account creation with mock data
- `api/_lib/verify-jwt.js` — JWT token verification

### Frontend (React)
- `src/pages/AdminPage.jsx` — Updated with:
  - Demo Requests tab UI
  - Approve button + loading state
  - Reject button + modal
  - Status badge logic

### Database
- `supabase/migrations/20260708_demo_accounts_system.sql` — Schema + cron job

### Scripts
- `scripts/apply-migration.js` — Apply SQL migration via Management API
- `scripts/verify-demo-tables.js` — Verify tables were created

---

## Monitoring & Troubleshooting

### Check Demo Accounts Status
```sql
SELECT id, email, created_at, expires_at, deleted_at
FROM demo_accounts
ORDER BY created_at DESC
LIMIT 10;
```

### Check Demo Requests Status
```sql
SELECT id, email, status, approved_at, approved_by, rejection_reason
FROM demo_requests
WHERE status != 'pending'
ORDER BY approved_at DESC
LIMIT 10;
```

### View Next Cron Job Run
```sql
SELECT * FROM cron.job WHERE jobname = 'delete_expired_demo_accounts';
```

### Manually Trigger Deletion (for testing)
```sql
SELECT delete_expired_demo_accounts();
```

---

## Security Notes

1. **Temporary Passwords:** Shown once on approval, then never displayed again (like Stripe)
2. **Demo Account Isolation:** Demo users have `plan='lifetime'` but data is completely separate from real users
3. **Auto-Cleanup:** No manual intervention needed; cron job handles deletion
4. **Rate Limiting:** Consider adding rate limit to `/api/admin-approve-demo` to prevent abuse
5. **JWT Verification:** All admin routes verify user has admin/super_admin role

---

## Future Enhancements

1. **Email Notification:** Send demo user login credentials via Resend
2. **Expiration Warning:** Email demo user 24 hours before deletion
3. **Custom Mock Data:** Allow admins to choose which mock data template to use
4. **Extension Option:** Allow admins to extend 48-hour period if needed
5. **Usage Analytics:** Track which features demo users try most
6. **Invite System:** Generate one-time invite links for direct demo signup

---

## Support

For issues or questions:
1. Check cron job output: `SELECT * FROM cron.job_run_details`
2. Review API response logs in browser DevTools
3. Verify Supabase token is valid (admin/super_admin role)
4. Ensure migration was applied: `SELECT * FROM demo_accounts LIMIT 1`
