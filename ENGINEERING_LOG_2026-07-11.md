# Engineering Log — Stabilization Pass (2026-07-11)

Lead-engineer audit + repair of InvoiceChaser. Goal: diagnose why updates weren't
reaching users, why admin/super-admin dashboards were misrouting to the client
portal, and stabilise the app to production quality. All DB changes were applied
to the live Supabase project (`rnfmlzpueghbbhzeosyr`) via the Management API and
verified; all code changes are on `main` and deployed to Vercel
(`invoicechaserapp`), verified live.

---

## 1. Admin/super-admin dashboards misrouting to the client portal — ROOT CAUSE

**Symptom:** admins logged in and landed on the client dashboard.

**Root cause (two compounding data bugs, not routing code):**
1. **26 of 44 `auth.users` had no `public.profiles` row.** These accounts predated
   the profile auto-create trigger. Role resolution (`getUserRole`) reads
   `profiles.role`; with no row it fell through to `users.is_admin` (mostly false)
   → everyone resolved to `user` → routed to `/app/dashboard`. The admin account
   `hello@munya.co.zw` (which had `users.is_admin = true` but no profile) was
   affected.
2. **`profiles.role` column default was `'policy_admin'`** — a leftover from an
   unrelated schema. Any new profile created without an explicit role got an
   unrecognized value that no route/RBAC check understood.

**Fix:**
- Backfilled all missing `profiles` rows, deriving role from legacy `users.is_admin`
  (`hello@munya.co.zw` → `admin`; super admin preserved).
- Reset `profiles.role` default to `'user'`; sanitized any non-standard roles.
- Hardened the frontend resolver (`src/lib/api.js`) to collapse any unrecognized
  role to `'user'` so a stray value can never grant or deny access unpredictably.

**Verified:** live DB now shows 0 users missing a profile; roles are exactly
`super_admin` (munyamuzvidziwa19@gmail.com) + `admin` (hello@munya.co.zw).

---

## 2. Security holes found and closed

- **Signup privilege escalation (critical):** `handle_new_user_profile()` set
  `role` from `NEW.raw_user_meta_data->>'role'` — user-editable signup metadata.
  Anyone could register with `{"role":"super_admin"}` and become super admin.
  Rewrote the trigger to hardcode `role='user'`. **Verified:** signup with
  injected `role:super_admin` now yields a `user` profile.
- **World-readable PII:** `profiles`/`users` SELECT policies were `USING (true)` —
  any anon visitor could read every user's email/name/plan. Scoped SELECT to
  own-row or admin. **Verified:** anon key now returns `[]` for both tables.
- **Client self-escalation via UPDATE:** the `profiles` UPDATE policy + broad
  column grants let a user PATCH their own `role`/`plan`/`is_protected`. Added
  column-level GRANTs so `authenticated` may only update display fields;
  role/plan/is_protected change exclusively via service_role in `/api/admin`.
  **Verified:** client PATCH `{role:super_admin,plan:lifetime}` → `403`; display-name
  update → `200`.
- **Open mail relay:** `/api/send-email` accepted an arbitrary `to` and sent from
  our domain. Locked to a fixed notify address (both real callers only notify the
  team anyway).
- **Admin actions moved server-side:** role/plan/details/suspend/delete were done
  as direct client Supabase writes — now blocked by the tightened RLS, and in any
  case never safe. Reworked `/api/admin` to own them (service_role, protection
  checks) and rewired `AdminPage.jsx` to call it.

---

## 3. "Updates never reached users" — payment & route breakage

**Root cause:** the API consolidation commit (`5e3d3e2`, done to fit Vercel Hobby's
12-function limit) deleted `get-invoice`, `pay-invoice`, `verify-session`,
`paynow-pay`, `paynow-poll` and merged others, **but the frontend was never
updated** — it kept calling the deleted paths (404). Public invoice payment
(the `/pay/:invoiceNumber` page reminder emails link to) was fully broken.

**Fix (staying within 12 functions):**
- New `api/invoices.js` = restored `get-invoice` (GET) + `pay-invoice` (POST).
- Folded `verify-session` into `create-checkout-session.js` (GET branch).
- Removed the now-redundant `api/trigger-recurring-invoices.js` — its job is now an
  in-DB `pg_cron` job (`generate_recurring_invoices()`), so deleting it freed the
  slot without losing capability.
- Repointed the frontend: `PayInvoicePage`, `PaymentSuccessPage`, `CheckoutPage`
  now call the live routes with the correct method/action/body.

**Function count:** 12/12. **Verified live:** `/api/invoices` returns 400/404 by
design (not a missing route); session-verify and `/api/admin` auth all correct.

### Server-authoritative plan activation
The frontend used to set `profiles.plan` client-side after payment — now blocked by
RLS (correctly). Introduced `api/_lib/activate-plan.js` (idempotent) and wired it
into all three payment confirmation paths so a plan is only ever written after the
gateway confirms payment server-side:
- Stripe webhook (`checkout.session.completed`).
- Stripe session verify (`GET /api/create-checkout-session?session_id=`).
- Paynow poll (activates the moment Paynow confirms `paid`) + result callback.

This also fixes a latent gap: Paynow plan purchases previously never set the plan
server-side at all.

---

## 4. QuickBooks accounting suite — completely non-functional

Three compounding bugs meant no customer could use Accounts/Vendors/Expenses/
Bills/Recurring:
1. **Schema never applied to prod.** The Phase 1 migration existed in the repo but
   the tables didn't exist in the live DB → every call 404'd. Applied via
   `20260710_stabilization_repair.sql` with per-user RLS.
2. **Routes gated behind `verifyAdmin`** → regular users got `403`. Added
   `verifyUser` (any authenticated user) and switched the five accounting routes
   to it.
3. **Frontend sent `Bearer undefined`** (`user.token` doesn't exist — the token is
   on the session). Added `src/lib/authFetch.js` which pulls the live access token
   from `supabase.auth.getSession()`; rewired all accounting pages.

**Verified live:** a fresh regular user hitting `/api/vendors` now gets
`200 {"vendors":[]}` (was `403`).

---

## 5. Email reminders not sending — ROOT CAUSE

The manual "Send" button and the automated chaser both call the Supabase Edge
Function `send_reminder_email`. **That function was never deployed to the live
project** (0 Edge Functions existed) — every invoke 404'd, so every reminder was
marked `failed`. Its `APP_URL` also still defaulted to the old Netlify domain.

**Fix:** deployed `send_reminder_email` to prod (via Supabase CLI + PAT), set
`APP_URL=https://invoicechaserapp.vercel.app`. **Verified:** the function now
responds `200`.

**REMAINING BLOCKER (needs you):** `RESEND_API_KEY` is not set on the project, so
the function returns `{"skipped":true,"reason":"RESEND_API_KEY not configured"}` and
no mail actually leaves. Provide a real Resend API key (and a verified
`RESEND_FROM_EMAIL` sender domain) and reminders will send. Command:
`SUPABASE_ACCESS_TOKEN=<pat> supabase secrets set RESEND_API_KEY=<key> RESEND_FROM_EMAIL=<addr> --project-ref rnfmlzpueghbbhzeosyr`

---

## 6. `auth.users` delete FK — admin "Delete user" was broken

`public.users → auth.users` was `ON DELETE NO ACTION` and `public.profiles` had no
FK to `auth.users` at all. Deleting an auth user (what `/api/admin` delete-user
does) failed with a FK violation → the leftover `users` row blocked it. Set both to
`ON DELETE CASCADE`; the `prevent_protected_*` BEFORE-DELETE triggers still block
removing a protected super admin. **Verified:** a test auth user now cascades
cleanly.

---

## 7. BOQ auto-generate producing identical/unrealistic output

Not random — the engine is deterministic. Two real bugs:
1. **Naive substring keyword matching:** `"warehouse".includes("house")` is true, so
   warehouse/mall/clinic/etc all matched the cottage "house" keyword and collapsed
   to a 1-room cottage → "same BOQ every time." Fixed with word-boundary regex
   matching + best-score selection.
2. **Size defaulted to 1 room** for any description without an explicit number →
   most projects yielded an identical 18-item single-room cottage. Added type-aware
   default sizing (warehouse→300m², office→6 rooms, etc.) and more size patterns.
3. **Shop assignment:** fixed a scoring bug (compared penalized score against raw
   price) and stopped assigning materials to shops that don't stock them — items no
   listed supplier carries are now labeled `"Market avg (no listed supplier)"` and
   excluded from the per-shop totals.

**Verified:** warehouse/office/school/factory now produce distinct, realistic BOQs
($36k / $16k / $29k / $12k) instead of an identical $10k cottage.

---

## Files changed
- **Migration:** `supabase/migrations/20260710_stabilization_repair.sql` (applied live).
- **API:** `admin.js`, `create-checkout-session.js`, `paynow.js`, `webhook.js`,
  `send-email.js`, `bills.js`, `chart-of-accounts.js`, `expenses.js`,
  `recurring-invoices.js`, `vendors.js`, `_lib/verify-jwt.js`; new
  `invoices.js`, `_lib/activate-plan.js`; deleted `trigger-recurring-invoices.js`.
- **Frontend:** `lib/api.js`, new `lib/authFetch.js`, `pages/AdminPage.jsx`,
  `PaymentSuccessPage.jsx`, `PayInvoicePage.jsx`, `CheckoutPage.jsx`,
  `RecurringInvoicesPage.jsx`, `AccountsPage.jsx`, `BillsPage.jsx`,
  `ExpensesPage.jsx`, `VendorsPage.jsx`, `utils/smartBOQEngine.js`.
- **Edge Function:** `send_reminder_email` deployed to prod.

## Tests performed
- Build (`npm run build`) — passes.
- Live RLS: anon read of profiles/users/vendors → `[]`; signup role-injection → `user`;
  client self-escalation PATCH → `403`, display update → `200`.
- Live endpoints: homepage 200; `/api/invoices` 400/404 by design; session-verify 400;
  `/api/admin` 401 unauth; `/api/vendors` as regular user → `200`.
- Edge Function invoke → 200 (key-gated).
- FK cascade delete of a test user → success.

## Remaining risks / follow-ups
1. **`RESEND_API_KEY`** — reminders + team notifications are silent until set (above).
2. **`STRIPE_WEBHOOK_SECRET`** — if unset, the webhook parses unsigned events; plan
   activation still works via the session-verify path, but register the webhook and
   set the secret for defense-in-depth. Register endpoint:
   `https://invoicechaserapp.vercel.app/api/webhook`.
3. **Paynow result URL** — set the Paynow dashboard result callback to
   `https://invoicechaserapp.vercel.app/api/paynow`.
4. **Git-history secret leak (still open from prior sessions)** — `.env.example` with
   real Stripe/Supabase/Paynow secrets is in git history. Rotate those keys and scrub
   history when ready.
5. **Automated reminder batch** — the Edge Function supports a batch mode but nothing
   schedules it yet; wire a daily `pg_cron` → `net.http_post` (or a Vercel cron) once
   `RESEND_API_KEY` is set.
6. **BOQ templates** — mall/clinic/hospital still fall back to the cottage template;
   add dedicated templates as a future enhancement.
