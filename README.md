# InvoiceChaser

A production-ready SaaS web application for automated invoice management with payment reminders, built with Vite, React, Supabase, and TailwindCSS.

## Features

- **Automated Invoice Management**: Create, track, and manage invoices with automated payment reminders
- **Customer Management**: Organize customers and track their billing history
- **Smart Reminders**: Automated email reminders at 3 days before, on due date, 7 days overdue, and 14 days overdue
- **Payment Integration**: Stripe and Paynow (Zimbabwe) payment gateway support
- **Admin Panel**: Comprehensive admin dashboard for user and revenue management
- **Authentication**: Secure user authentication with Supabase Auth
- **SaaS Pricing**: Multiple tiers (Basic $2.99, Pro $9.99, Business $29.99, Lifetime $99)
- **Real-time Updates**: Zustand state management with persistence
- **Responsive Design**: Modern UI built with TailwindCSS

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payment**: Stripe, Paynow
- **Email**: Resend/SMTP

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Stripe account (for payments)
- Paynow account (for Zimbabwe payments)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd InvoiceChaser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   STRIPE_PUBLIC_KEY=your-stripe-public-key
   STRIPE_SECRET_KEY=your-stripe-secret-key
   PAYNOW_ID=your-paynow-id
   PAYNOW_KEY=your-paynow-key
   ```

4. **Set up Supabase database**
   
   - Go to your Supabase project's SQL Editor
   - Run the SQL script from `supabase/schema.sql`
   - This will create all necessary tables, indexes, RLS policies, and triggers

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Database Schema

The application uses the following tables:

- **profiles**: User profiles (extends auth.users)
- **invoices**: Invoice records
- **customers**: Customer information
- **reminders**: Automated reminder schedules
- **payments**: Payment transactions
- **subscriptions**: User subscriptions
- **email_templates**: Custom email templates

## Project Structure

```
InvoiceChaser/
├── src/
│   ├── components/       # Reusable React components
│   │   ├── AppLayout.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── NewInvoiceModal.jsx
│   │   └── ProtectedRoute.jsx
│   ├── lib/             # Utility libraries
│   │   └── supabase.js   # Supabase client configuration
│   ├── pages/           # Page components
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── InvoicesPage.jsx
│   │   ├── CustomersPage.jsx
│   │   ├── RemindersPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── AdminPage.jsx
│   ├── store/           # State management
│   │   └── useStore.js   # Zustand store
│   ├── App.jsx          # Main app component with routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── supabase/
│   └── schema.sql       # Database schema
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env                 # Environment variables
```

## Usage

### First Time Setup

1. **Register a new account**
   - Navigate to `/register`
   - Fill in your details (full name, company name, email, password)
   - Your profile will be created in Supabase

2. **Create your first invoice**
   - Go to Dashboard
   - Click "New Invoice"
   - Fill in customer details, amount, due date
   - 4 automated reminders will be scheduled

3. **Manage customers**
   - Go to Customers page
   - Add customers manually or they'll be auto-created from invoices

### Admin Access

To access the admin panel:
1. Create a user with `role: 'admin'` in Supabase
2. Navigate to `/admin`
3. Sign in with admin credentials

### Email Templates

Customize reminder emails:
1. Go to Reminders page
2. Click "Email Templates" tab
3. Select a template type (3 days before, on due date, etc.)
4. Edit subject and body using variables:
   - `{{invoice_number}}`
   - `{{customer_name}}`
   - `{{amount}}`
   - `{{currency}}`
   - `{{due_date}}`
   - `{{company_name}}`

## Payment Integration

### Stripe

The application supports Stripe for:
- Subscription payments
- Direct invoice payments

To enable:
1. Add your Stripe keys to `.env`
2. Implement Stripe checkout in the payment flow
3. Set up webhooks in your Stripe dashboard

### Paynow (Zimbabwe)

Paynow integration supports:
- Ecocash
- Card payments
- Local bank transfers

To enable:
1. Add your Paynow credentials to `.env`
2. Implement Paynow checkout
3. Handle payment callbacks

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

```bash
npm run build
# Upload the dist/ folder to your hosting provider
```

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Input Validation**: All user inputs are validated
- **Secure Endpoints**: Supabase Auth protects API calls

## Roadmap

- [ ] Supabase Edge Functions for automated tasks
- [ ] PDF invoice generation
- [ ] Quotation and Proforma Invoice generators
- [ ] BOQ/BOM Engine with price suggestions
- [ ] Email system with Resend/SMTP
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] API access for Business plan
- [ ] Mobile app (React Native)

## Troubleshooting

### Supabase Connection Issues

If you see connection errors:
1. Verify your `.env` variables are correct
2. Check Supabase project is active
3. Ensure RLS policies are properly set

### Build Errors

If you encounter build errors:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Tailwind Not Working

If Tailwind styles aren't applied:
1. Ensure `postcss.config.js` exists
2. Check `tailwind.config.js` content paths
3. Restart the dev server

## License

Proprietary - All rights reserved

## Support

For support and questions:
- Email: admin@gadgetsiq.co.zw
- Documentation: See inline code comments

---

Built with ❤️ by GadgetsIQ Technologies
