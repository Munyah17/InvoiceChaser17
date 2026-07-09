import crypto from 'crypto'

// Mock data seeded into every demo account
function generateMockData() {
  const mockCustomers = [
    { name: 'Acme Corp', email: 'john@acmecorp.com', phone: '+1234567890' },
    { name: 'TechStart Inc', email: 'info@techstart.com', phone: '+1987654321' },
    { name: 'Global Solutions Ltd', email: 'contact@globalsol.com', phone: '+44123456' },
  ]

  const mockInvoices = [
    {
      number: 'INV-001',
      customerName: mockCustomers[0].name,
      customerEmail: mockCustomers[0].email,
      amount: 5000,
      currency: 'USD',
      description: 'Web Development Services',
      status: 'paid',
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      number: 'INV-002',
      customerName: mockCustomers[1].name,
      customerEmail: mockCustomers[1].email,
      amount: 3200,
      currency: 'USD',
      description: 'Consulting & Strategy',
      status: 'pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      number: 'INV-003',
      customerName: mockCustomers[2].name,
      customerEmail: mockCustomers[2].email,
      amount: 7500,
      currency: 'USD',
      description: 'System Integration',
      status: 'overdue',
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  ]

  return { mockCustomers, mockInvoices }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Creates the auth user, profile, demo_accounts row, and mock data for an
// approved demo request. Returns { status, body } — callers translate to HTTP.
export async function createDemoAccount(supabase, demoRequestId) {
  const { data: demoRequest, error: fetchErr } = await supabase
    .from('demo_requests')
    .select('*')
    .eq('id', demoRequestId)
    .single()

  if (fetchErr || !demoRequest) {
    return { status: 404, body: { error: 'Demo request not found' } }
  }

  if (demoRequest.status !== 'approved') {
    return { status: 400, body: { error: 'Demo request not approved' } }
  }

  const { data: existing } = await supabase
    .from('demo_accounts')
    .select('id')
    .eq('demo_request_id', demoRequestId)
    .single()

  if (existing) {
    return { status: 400, body: { error: 'Demo account already created for this request' } }
  }

  // Temporary password — returned once to the approving admin
  const tempPassword = Math.random().toString(36).slice(2, 12) + 'Aa1!'

  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: demoRequest.email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authErr) {
    console.error('Auth error:', authErr)
    return { status: 400, body: { error: 'Failed to create auth user' } }
  }

  const userId = authUser.user.id

  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: demoRequest.email,
      name: demoRequest.full_name?.split(' ')[0] || 'Demo',
      full_name: demoRequest.full_name || 'Demo User',
      role: 'user',
      plan: 'lifetime', // unlimited access during the 48-hour trial
      is_protected: false,
    })

  if (profileErr) {
    console.error('Profile error:', profileErr)
    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    return { status: 400, body: { error: 'Failed to create profile' } }
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const { error: demoAcctErr } = await supabase
    .from('demo_accounts')
    .insert({
      user_id: userId,
      demo_request_id: demoRequestId,
      email: demoRequest.email,
      password_hash: hashPassword(tempPassword),
      expires_at: expiresAt.toISOString(),
      metadata: {
        full_name: demoRequest.full_name,
        company: demoRequest.company,
        source: demoRequest.source || 'application',
      },
    })

  if (demoAcctErr) {
    console.error('Demo account error:', demoAcctErr)
    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    return { status: 400, body: { error: 'Failed to create demo account' } }
  }

  const { mockCustomers, mockInvoices } = generateMockData()

  const { error: custErr } = await supabase
    .from('customers')
    .insert(
      mockCustomers.map(c => ({
        user_id: userId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        created_at: new Date().toISOString(),
      }))
    )

  if (custErr) {
    console.error('Customer insert error:', custErr)
    // Demo still works without mock customers
  }

  const { error: invErr } = await supabase
    .from('invoices')
    .insert(
      mockInvoices.map(inv => ({
        user_id: userId,
        invoice_number: inv.number,
        customer_name: inv.customerName,
        customer_email: inv.customerEmail,
        amount: inv.amount,
        currency: inv.currency,
        description: inv.description,
        status: inv.status,
        due_date: inv.dueDate.toISOString(),
        created_at: new Date().toISOString(),
      }))
    )

  if (invErr) {
    console.error('Invoice insert error:', invErr)
  }

  const { error: walletErr } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      balance: 100, // $100 demo balance
      currency: 'USD',
    })

  if (walletErr) {
    console.error('Wallet error:', walletErr)
  }

  return {
    status: 200,
    body: {
      success: true,
      userId,
      email: demoRequest.email,
      tempPassword,
      expiresAt: expiresAt.toISOString(),
      message: 'Demo account created. User can now log in.',
    },
  }
}
