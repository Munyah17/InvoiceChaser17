# InvoiceChaser Launch Readiness Checklist

## Pre-Launch Testing Checklist

### 1. Core Functionality Tests

#### Authentication & User Management
- [ ] User registration works (email/password)
- [ ] Email verification sent and works
- [ ] User login works
- [ ] Password reset works
- [ ] Sign out button works on all dashboard pages
- [ ] Session persistence works after refresh

#### Invoice Management
- [ ] Create new invoice
- [ ] Edit existing invoice
- [ ] Delete invoice
- [ ] Add/remove line items
- [ ] Calculate totals correctly (subtotal, tax, total)
- [ ] Mark invoice as paid/unpaid
- [ ] Archive invoice
- [ ] Invoice chasing toggle works
- [ ] Invoice filters work (paid/unpaid/archived/all)

#### Customer Management
- [ ] Add new customer
- [ ] Edit customer details
- [ ] Delete customer
- [ ] Customer appears in invoice dropdown
- [ ] Customer history shows correctly

#### PDF Generation (Proforma & Quotation)
- [ ] Logo upload works with preview
- [ ] Logo renders in PDF export
- [ ] Notes field renders in PDF
- [ ] Terms & conditions render in PDF
- [ ] Payment method renders in Quotation PDF
- [ ] PDF layout is professional
- [ ] Company info renders correctly
- [ ] Line items with calculations render correctly

#### Payment Integration
- [ ] Stripe Checkout session creation works
- [ ] Payment success redirect works
- [ ] Payment failure/cancel redirect works
- [ ] Payment webhook updates invoice status
- [ ] 5% fee calculation is correct
- [ ] Payment confirmation email sent

### 2. UI/UX Verification

#### Landing Page
- [ ] All text on black cards is WHITE (not grey)
- [ ] Theme toggle is visible in header (after Get Started)
- [ ] "Trusted by 500+" bubble spacing is correct
- [ ] CTA "Get Started Free" has black outline
- [ ] Login button has black outline
- [ ] All pricing cards display correctly
- [ ] Mobile responsive

#### Dashboard
- [ ] Sidebar navigation works
- [ ] Sign out button visible and functional
- [ ] Dark mode is default (black background)
- [ ] Light/dark mode toggle works
- [ ] All pages render correctly in both modes

#### Forms
- [ ] All form validation works
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Loading states visible during submissions

### 3. API & Security Tests

#### Supabase Integration
- [ ] RLS policies protect user data
- [ ] Users can only see their own data
- [ ] API keys stored securely (Settings page)
- [ ] Stripe secret key NEVER exposed in frontend

#### Edge Functions
- [ ] `create-checkout-session` function deployed
- [ ] CORS headers configured correctly
- [ ] Error handling works
- [ ] Function only accessible with valid auth

### 4. Payment Flow Testing

#### Stripe Checkout
```
Test Card Numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- 3D Secure: 4000 0025 0000 3155
```

Test Scenarios:
- [ ] Successful payment flow
- [ ] Failed payment handling
- [ ] Cancelled payment handling
- [ ] Webhook receives and processes events
- [ ] Invoice status updates after payment
- [ ] Payment record created in database

### 5. Email System Tests

- [ ] Welcome email sent after registration
- [ ] Invoice reminder emails send correctly
- [ ] Payment receipt email sent
- [ ] Password reset email sent
- [ ] Email templates render correctly

### 6. Performance & Optimization

- [ ] Page load times < 3 seconds
- [ ] Images optimized
- [ ] No console errors
- [ ] Build completes without errors
- [ ] Bundle size optimized

### 7. Mobile Responsiveness

- [ ] Landing page mobile-friendly
- [ ] Dashboard usable on mobile
- [ ] Invoice forms work on mobile
- [ ] PDFs readable on mobile
- [ ] Navigation works on small screens

### 8. Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome/Safari

### 9. Data Integrity

- [ ] Invoice calculations accurate
- [ ] Tax calculations correct
- [ ] Currency formatting correct
- [ ] Date formatting consistent
- [ ] No data loss on refresh

### 10. Production Deployment Checklist

#### Supabase
- [ ] Database migrated to production
- [ ] RLS policies enabled
- [ ] Edge Functions deployed
- [ ] Storage buckets configured
- [ ] SMTP/email configured

#### Stripe
- [ ] Stripe account in Live mode
- [ ] Webhook endpoint configured
- [ ] Webhook secrets set
- [ ] Payment methods configured

#### Environment Variables
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY= (Edge Function env)
STRIPE_WEBHOOK_SECRET= (Edge Function env)
SITE_URL=
```

#### DNS & Hosting
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] CDN configured (if using)
- [ ] Analytics installed (optional)

### 11. Legal & Compliance

- [ ] Terms & Conditions page complete
- [ ] Privacy Policy page exists
- [ ] GDPR compliance (data export/deletion)
- [ ] Cookie consent (if applicable)
- [ ] Refund policy defined

### 12. Support & Documentation

- [ ] Help/FAQ section complete
- [ ] Contact form works
- [ ] Admin email receives inquiries
- [ ] User guide/documentation (optional)

## Critical Issues to Fix Before Launch

### HIGH PRIORITY
1. **Payment Security**: Verify Stripe secret key is ONLY in Edge Functions, never frontend
2. **Data Isolation**: Confirm users can only access their own data (RLS)
3. **Email Delivery**: Verify transactional emails are sending reliably
4. **Invoice Calculations**: Double-check all math (subtotal, tax, total)

### MEDIUM PRIORITY
1. **Mobile Experience**: Test all core flows on mobile devices
2. **Error Handling**: Ensure graceful error messages throughout
3. **Loading States**: Add loading indicators for async operations
4. **Form Validation**: Complete validation on all forms

### LOW PRIORITY
1. **Analytics**: Add usage tracking
2. **SEO**: Optimize landing page meta tags
3. **Social Sharing**: Add Open Graph tags

## Post-Launch Monitoring

- [ ] Stripe dashboard monitored daily
- [ ] Error logs reviewed weekly
- [ ] User feedback collected
- [ ] Performance metrics tracked
- [ ] Uptime monitoring active

## Emergency Contacts

- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com
- Hosting Provider: [Your hosting provider]

---

## Testing Commands

```bash
# Run build verification
npm run build

# Preview production build
npm run preview

# Check for TypeScript errors
npx tsc --noEmit
```

## Sign-off

- [ ] All tests passed
- [ ] No critical bugs remaining
- [ ] Payment flow verified in Live mode
- [ ] Security audit completed
- [ ] Ready for public launch

**Launch Date: ___________**
**Approved By: ___________**
