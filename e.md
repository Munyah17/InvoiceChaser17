# Efficiency & Issue Notes

## Fixed in this pass
- `useStore.js:320` — `logout()` called `localStorage.removeItem('zustand-store')` but the persist key is `'invoice-chaser-storage'`. Persisted `userRole` was never cleared on sign-out. Fixed.
- `AdminPage.jsx:6` — unused `canAccessAdmin` import after login-gate removal. Removed.

---

## Security

### `subscribeToReminders` has no per-user filter
`src/lib/api.js:336` — The reminders realtime channel has no `filter` clause. It broadcasts every reminder change from every user to every connected client. Add `filter: \`invoice_id=in.(${invoiceIds.join(',')})\`` or move filtering server-side.

### `select('*')` on sensitive tables
`api.js` — `getProfile`, `getInvoices`, `getCustomers` all use `select('*')`. Over-fetches columns (including any future sensitive fields). Prefer explicit column lists.

---

## Excessive / Duplicate Network Requests

### Double `getSession` on every page load
`src/components/ProtectedRoute.jsx:14` — `ProtectedRoute` calls `supabase.auth.getSession()` on every mount. `App.jsx:restoreSession` already does the same on startup. On initial load two auth round-trips fire. Use the session already in the Zustand store when it's available.

### `ensureUserRecord` upsert on every restore
`src/App.jsx:43` — `ensureUserRecord` runs a DB upsert on every `restoreSession` (every page load / hard refresh). After the first visit the record exists; writing it again is a wasted write per session restore. Gate with a `profiles` read first, or move it to the register flow only.

### `getUserRole` calls `supabase.auth.getUser()`
`src/lib/api.js:6` — `auth.getUser()` is a network call to Supabase Auth. The calling code (Zustand `loadRole`) is triggered on every session restore. The user object is already available in the store; pass it in instead of re-fetching it.

### `loadInvoices` + `loadReminders` on every Dashboard mount
`src/pages/Dashboard.jsx:27` — Every navigation to `/app/dashboard` fires two full fetches with no staleness check. Consider a simple `loadedAt` timestamp in the store and skip the fetch if data is < 30s old.

### `getReminders` makes two sequential queries
`src/lib/api.js:140` — First fetches all invoice IDs for the user, then queries reminders by those IDs. Two round-trips. Fix: add a `user_id` column directly to the `reminders` table (or use `user_id` via the join), then query `reminders` in a single call.

### AdminPage `fetchAll` fires 7+ parallel queries on every mount
`src/pages/AdminPage.jsx:fetchAll` — Queries `profiles`, `payments`, `subscriptions`, etc. simultaneously with no cache. Every tab switch or manual refresh reruns all of them. Cache results in component state with a `lastFetchedAt` guard and only refetch when stale or user clicks Refresh.

---

## Broken / Unsafe Patterns

### `getPayments` subquery passed as value
`src/lib/api.js:215` — `.in('invoice_id', supabase.from('invoices').select('id').eq('user_id', userId))` passes a query builder object into `.in()`. Supabase JS v2 does not support nested query builders here; this will stringify to `[object Object]` and return no results. Replace with a two-step fetch or an RPC.

### WalletPage wallet creation race condition
`src/pages/WalletPage.jsx:50` — On `PGRST116` (no row), it inserts a new wallet. If the component mounts twice in quick succession (Strict Mode, double navigation) two wallet rows could be created. Use an upsert with `onConflict: 'user_id'` instead.

### AdminPage queries tables that may not exist
`src/pages/AdminPage.jsx:fetchAll` — Queries `payments` and `subscriptions` tables. These tables are not in the applied migrations. Errors are silently swallowed by the `catch`. Add existence checks or guard the queries.

---

## Rendering Inefficiencies

### `mergedCustomers` rebuilt on every render
`src/pages/CustomersPage.jsx:22` — The invoice+customer merge loop runs on every render with no `useMemo`. Wrap in `useMemo([invoices, customers])`.

### Search filters run on every keystroke, no debounce
`CustomersPage`, `AdminPage`, `InvoicesPage` — Filter expressions (`customerList`, `filteredUsers`, filtered invoice list) execute on every character typed. For lists under ~200 items this is fine; for the admin user list (`.limit(200)`) add a 200ms `useDeferredValue` or debounce the search state.

### `getInvoiceStats` fetches all rows for client-side aggregation
`src/lib/api.js:297` — Fetches every invoice row (status + amount) to compute counts and sums in JS. Replace with a Postgres aggregate RPC or use the already-loaded `invoices` array from the store.

---

## Dead / Unused Code

- `src/lib/api.js` exports `subscribeToInvoices`, `subscribeToReminders`, `getRemindersByInvoice`, `getPayments`, `getInvoiceStats`, `checkOverdueInvoices`, `getEmailTemplates`, `upsertEmailTemplate` — none of these are imported anywhere in the app currently.
- `src/App.jsx:118` — duplicate `/admin` route (without `/app` prefix) wrapping `AdminPage` in `AdminRoute`. The app only uses `/app/admin`. The bare `/admin` route is unreachable from the SPA and can be removed.
- `src/components/ProtectedRoute.jsx` exports `SuperAdminRoute` — not imported in `App.jsx`.
