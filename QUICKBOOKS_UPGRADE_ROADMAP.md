# InvoiceChaser → Mini-QuickBooks Upgrade Roadmap

**Goal:** Transform InvoiceChaser into a competitive mini-QuickBooks alternative with Accountant Mode + Business Mode

**Timeline:** Phase 1 (4 weeks) → Phase 2 (8 weeks) → Phase 3 (ongoing)

---

## 🎯 Vision

**Current State:** Invoice + Payment Reminder tool  
**Target State:** Full financial accounting system (mini-QB) with:
- ✅ Recurring invoices + autopay
- ✅ Automated expense categorization  
- ✅ P&L, Balance Sheet, Cash Flow reports
- ✅ Bank reconciliation (basic)
- ✅ Multi-user roles (Business/Accountant modes)
- ✅ KPI dashboard with real-time insights
- ✅ Mobile-first invoicing + receipt capture

---

## 📋 Feature Grouping Strategy

### Current Sidebar Problem
- 15+ menu items (Invoices, Customers, Reminders, BOQ, BOM, Quotation, Proforma, etc.)
- **Overwhelming for first-time users**
- No visual hierarchy

### Proposed Reorganization

```
┌─────────────────────────────────┐
│         MODE SELECTOR            │ ← Switch between Business/Accountant
├─────────────────────────────────┤
│  📊 DASHBOARD (unified)          │ ← Real-time KPIs, cash flow, alerts
├─────────────────────────────────┤
│  💰 MONEY IN                     │ (Expanded group)
│  ├─ Invoices                     │ (existing)
│  ├─ Recurring Invoices (NEW)     │
│  ├─ Customers                    │ (existing)
│  ├─ Payments Received            │ (NEW - aggregated)
│  └─ Request Payment              │ (existing pay link)
├─────────────────────────────────┤
│  💸 MONEY OUT                    │ (Expanded group)
│  ├─ Expenses                     │ (NEW - bill vs expense)
│  ├─ Vendors                      │ (NEW)
│  ├─ Bills to Pay                 │ (NEW)
│  └─ Recurring Payments           │ (NEW)
├─────────────────────────────────┤
│  📈 REPORTS                      │ (Collapsed group)
│  ├─ Profit & Loss                │ (NEW)
│  ├─ Balance Sheet                │ (NEW)
│  ├─ Cash Flow                    │ (NEW)
│  ├─ Aging (AR/AP)                │ (NEW)
│  ├─ Invoices                     │ (existing - moved from money in)
│  ├─ Quotations                   │ (existing)
│  ├─ BOQ / BOM / Debit / Credit   │ (existing - sub-menu)
│  └─ Custom Reports               │ (NEW)
├─────────────────────────────────┤
│  🛠️  TOOLS                       │ (New group)
│  ├─ Bank Reconciliation          │ (NEW)
│  ├─ Chart of Accounts            │ (NEW - accountant only)
│  ├─ Tax Categories               │ (NEW - accountant only)
│  ├─ Wallet & Payments            │ (existing)
│  ├─ API Keys                     │ (existing)
│  └─ Automations & Rules          │ (NEW)
├─────────────────────────────────┤
│  👥 TEAM (Accountant only)       │ (New group)
│  ├─ Users & Roles                │ (existing)
│  ├─ Audit Trail                  │ (NEW)
│  ├─ Integrations                 │ (NEW)
│  └─ Settings                     │ (existing)
└─────────────────────────────────┘
```

---

## 🔄 Phase 1: Foundation (Weeks 1-4)

### Week 1: Infrastructure
- [ ] Create `Chart of Accounts` system
  - Standard accounting structure (Assets, Liabilities, Equity, Income, Expenses)
  - Map existing invoices/expenses to COA
  - Allow custom accounts for accountants
  
- [ ] Add `accounts` table to database:
  ```sql
  CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    user_id UUID,
    account_number VARCHAR(20),
    name VARCHAR(255),
    type ENUM('asset', 'liability', 'equity', 'income', 'expense'),
    subtype VARCHAR(50),
    balance DECIMAL(12,2),
    is_enabled BOOLEAN,
    created_at TIMESTAMP
  );
  ```

- [ ] Add `transactions` table (unified):
  ```sql
  CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID,
    account_id UUID,
    type ENUM('invoice', 'payment', 'expense', 'bill', 'journal'),
    amount DECIMAL(12,2),
    currency VARCHAR(3),
    description TEXT,
    reference_id UUID (links to invoice, expense, etc),
    posted_at TIMESTAMP,
    created_at TIMESTAMP
  );
  ```

### Week 2: Recurring Invoices + Autopay
- [ ] Create `recurring_invoices` table:
  ```sql
  CREATE TABLE recurring_invoices (
    id UUID PRIMARY KEY,
    user_id UUID,
    customer_id UUID,
    template_invoice_id UUID,
    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'),
    start_date DATE,
    end_date DATE,
    next_run_date DATE,
    auto_charge BOOLEAN,
    payment_method_id UUID,
    status ENUM('active', 'paused', 'completed'),
    created_at TIMESTAMP
  );
  ```

- [ ] Build `/api/recurring-invoice-scheduler.js`:
  - Runs every night
  - Creates invoices from active recurring templates
  - Attempts autopay if enabled
  - Logs failures for manual retry

- [ ] Frontend: RecurringInvoicesPage
  - Create/edit/pause recurring templates
  - Set autopay rules per customer
  - View upcoming scheduled invoices
  - Retry failed autopayments

### Week 3: Expense Categorization + Bills
- [ ] Create `expenses` table:
  ```sql
  CREATE TABLE expenses (
    id UUID PRIMARY KEY,
    user_id UUID,
    vendor_id UUID,
    amount DECIMAL(12,2),
    currency VARCHAR(3),
    account_id UUID (auto-categorized),
    category VARCHAR(100),
    description TEXT,
    date DATE,
    receipt_url VARCHAR(500),
    status ENUM('draft', 'submitted', 'approved', 'paid'),
    created_at TIMESTAMP
  );
  ```

- [ ] Create `bills` table (vendor invoices):
  ```sql
  CREATE TABLE bills (
    id UUID PRIMARY KEY,
    user_id UUID,
    vendor_id UUID,
    bill_number VARCHAR(100),
    amount_due DECIMAL(12,2),
    amount_paid DECIMAL(12,2),
    due_date DATE,
    currency VARCHAR(3),
    status ENUM('draft', 'open', 'overdue', 'paid'),
    created_at TIMESTAMP
  );
  ```

- [ ] Build ExpensesPage & VendorsPage
  - Quick expense entry with receipt upload (OCR-ready)
  - Auto-categorization using simple rule engine
  - Mark as paid
  - Filter by category, vendor, date range

### Week 4: Basic Reports + Dashboard
- [ ] Create reports engine:
  - P&L statement (income - expenses = profit)
  - Balance sheet (assets - liabilities = equity)
  - Cash flow (inflows - outflows)
  - Aging reports (AR/AP)

- [ ] Build unified Dashboard:
  - Real-time cash balance
  - Recent transactions (invoices, payments, expenses)
  - Overdue invoices alert
  - Upcoming bills alert
  - Quick-add buttons (new invoice, new expense, new bill)

---

## 🎭 Phase 2: Accountant vs Business Mode (Weeks 5-8)

### Week 5: Mode Infrastructure
- [ ] Add `user_mode` to profiles table:
  ```sql
  ALTER TABLE profiles ADD COLUMN user_mode ENUM('business', 'accountant') DEFAULT 'business';
  ALTER TABLE profiles ADD COLUMN shown_features JSONB DEFAULT '{...}';
  ```

- [ ] Create `FeatureVisibility` context (React):
  - Wraps entire app
  - Checks user_mode and shows/hides UI elements
  - "Accountant only" badges on complex features
  - Simplified form fields in Business mode

**Business Mode (Non-accountants)**
- Simple, focused interface
- Dashboard with key KPIs only
- Invoices (create, send, collect)
- Expenses (quick entry)
- Payments (track incoming/outgoing)
- Basic Reports (P&L simplified, Cash flow)
- NO: Chart of Accounts, tax categories, reclassification, GL details

**Accountant Mode (CPAs/Bookkeepers)**
- Full accounting features
- Chart of Accounts management
- General Ledger view (drill-down by account)
- Tax category mapping
- Reclassification of transactions
- Reconciliation interface
- Advanced Reports (with GL drill-down)
- Audit trail (who changed what, when)
- Multi-user management

### Week 6: Accountant Features
- [ ] Build General Ledger viewer:
  - List transactions by account
  - Drill-down to source (invoice, expense, bill, journal)
  - Search/filter by date, amount, description
  - Export to Excel/CSV

- [ ] Build Chart of Accounts editor:
  - View standard chart
  - Add custom accounts
  - Mark accounts as inactive
  - Bulk import template

- [ ] Build Tax Categories:
  - Map accounts to tax line items
  - Store tax-relevant metadata
  - Export summary for tax prep

### Week 7: Role-Based Access + Audit Trail
- [ ] Extend roles system:
  - Keep: user, admin, super_admin
  - Add: accountant (invited collaborator)
  - accountant = admin access to accounting only, not billing/users

- [ ] Build Audit Trail:
  - Log all changes: who, what, when, previous value
  - Searchable by user, date, transaction type
  - Download audit report (accountant requirement)

- [ ] Build User Permissions matrix:
  - admin/super_admin can invite accountants
  - accountants can't delete invoices (immutability)
  - accountants can't modify payment settings

### Week 8: Integration Prep
- [ ] API for Zapier/n8n:
  - Webhook on new invoice/payment/expense
  - Trigger: send to Wave, Xero, QuickBooks (if API available)

- [ ] CSV import/export:
  - Bulk import invoices, expenses, customers
  - Export GL, P&L, balance sheet

---

## 🚀 Phase 3: Polish & Optimization (Weeks 9+)

### AI/Automation
- [ ] Expense categorization ML model:
  - Train on user's historical expenses
  - Auto-suggest category on new expense entry
  - Allow user to correct → improves model

- [ ] Cash flow forecasting:
  - Predict next 3 months based on recurring invoices + payment patterns
  - Flag potential cash shortfalls

- [ ] Smart alerts:
  - "Invoice overdue in 2 days"
  - "Bill due tomorrow"
  - "Unusual expense for this vendor"

### Mobile
- [ ] Native mobile app (React Native):
  - Create invoice on the go
  - Capture receipt with camera
  - Sign quote/proforma
  - Approve expenses

### Bank Reconciliation (Future)
- [ ] Connect to bank via Plaid/similar
- [ ] Auto-match transactions
- [ ] Categorization assist
- [ ] Reconciliation status dashboard

---

## 📊 Database Schema Summary

```sql
-- New Tables to Add
accounts                    -- Chart of Accounts
transactions               -- Unified transaction log
recurring_invoices         -- Scheduled invoices
expenses                   -- Vendor expenses
bills                      -- Vendor invoices
vendors                    -- Vendor details
tax_categories             -- Tax mapping
audit_log                  -- Change tracking
integrations               -- Third-party connections
bank_connections           -- Bank reconciliation (future)

-- Existing Tables (Extend)
profiles                   → Add: user_mode, shown_features
invoices                   → Add: recurring_invoice_id
customers                  → Add: vendor_type, tax_id

-- Existing Tables (Keep)
wallets, api_keys, subscriptions, payments, etc.
```

---

## 🎨 UI/UX Changes

### Navigation
```
BEFORE (Flat sidebar, 15+ items)
├─ Dashboard
├─ Invoices
├─ Customers
├─ Reminders
├─ BOQ
├─ BOM
├─ Quotation
├─ Proforma
├─ Debit Note
├─ Credit Note
├─ Wallet
├─ API Keys
├─ Settings

AFTER (Grouped, collapsible)
├─ Dashboard (enhanced)
├─ MONEY IN
│  ├─ Invoices
│  ├─ Recurring Invoices (NEW)
│  ├─ Customers
│  └─ Payments
├─ MONEY OUT
│  ├─ Expenses (NEW)
│  ├─ Vendors (NEW)
│  ├─ Bills (NEW)
│  └─ Recurring Payments (NEW)
├─ REPORTS
│  ├─ Profit & Loss (NEW)
│  ├─ Balance Sheet (NEW)
│  ├─ Cash Flow (NEW)
│  ├─ Aging Reports (NEW)
│  ├─ Invoices
│  ├─ Quotations
│  ├─ BOQ/BOM/Debit/Credit
│  └─ Custom Reports (NEW)
├─ TOOLS
│  ├─ Chart of Accounts (ACCOUNTANT)
│  ├─ General Ledger (ACCOUNTANT)
│  ├─ Reconciliation (ACCOUNTANT)
│  ├─ Tax Setup (ACCOUNTANT)
│  ├─ Bank Connections (NEW)
│  └─ Automations (NEW)
├─ TEAM (ADMIN/ACCOUNTANT)
│  ├─ Users
│  ├─ Audit Trail (NEW)
│  ├─ Integrations (NEW)
│  └─ Settings
```

### Mode Switcher
```
Top-right corner:
┌─────────────────────┐
│ 👤 John Doe         │
├─────────────────────┤
│ Mode: Business ▼    │ ← Click to toggle
│  ○ Business Mode    │
│  ◉ Accountant Mode  │
├─────────────────────┤
│ Settings            │
│ Logout              │
└─────────────────────┘
```

---

## 🔧 Implementation Priority

**High (Do First)**
1. Recurring invoices + autopay (revenue focus)
2. Expenses + vendor bills (cost tracking)
3. P&L + Balance Sheet reports (decision-making)
4. Mode selector (UX simplification)

**Medium (Do Next)**
5. Chart of Accounts (accountant features)
6. Audit trail (compliance)
7. Bank reconciliation (automation)

**Low (Nice-to-Have)**
8. AI expense categorization
9. Cash flow forecasting
10. Mobile app
11. Inventory tracking

---

## 💾 Database Migration Script

Run this before deploying Phase 1:

```sql
-- Phase 1 Tables
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_number VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'income', 'expense'
  balance DECIMAL(12, 2) DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID REFERENCES accounts(id),
  type VARCHAR(50) NOT NULL, -- 'invoice', 'payment', 'expense', 'bill', 'journal'
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  description TEXT,
  reference_id UUID, -- Links to invoice, expense, etc.
  posted_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  template_invoice_id UUID REFERENCES invoices(id),
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', etc.
  next_run_date DATE,
  auto_charge BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vendor_id UUID REFERENCES customers(id), -- Reuse customers table for vendors
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  category VARCHAR(100),
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT now()
);

-- Extend profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_mode VARCHAR(50) DEFAULT 'business';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shown_features JSONB DEFAULT '{}';

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (user sees only their own data)
CREATE POLICY "Users see own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own recurring invoices" ON recurring_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
```

---

## 📈 Success Metrics

- Week 4: Recurring invoices working (>50% of signups use it)
- Week 8: Accountant mode live (first CPA invited)
- Month 3: P&L reports trusted (finance teams use daily)
- Month 6: Feature parity with Wave (mid-market SMBs consider us)

---

## 🎯 Positioning

**From:** "Invoice tool for freelancers"  
**To:** "Mini-QuickBooks for SMBs with multi-currency needs"

**Tagline:** *"The accounting tool that actually fits your business—not the other way around."*

---

## 📝 Next Steps

1. **Immediate (Today)**: Fix email reminders, add PDF borders
2. **This Week**: Design Chart of Accounts import flow
3. **Next Week**: Start Phase 1 Week 1 work
4. **Communicate**: Create marketing narrative around QB transition

