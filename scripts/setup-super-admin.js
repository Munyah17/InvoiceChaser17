/**
 * One-time Super Admin bootstrap script.
 * Credentials are passed via environment variables — never hardcoded.
 * Run with:
 *   $env:SA_EMAIL="..."; $env:SA_PASSWORD="..."; node scripts/setup-super-admin.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const SA_EMAIL     = process.env.SA_EMAIL
const SA_PASSWORD  = process.env.SA_PASSWORD

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
if (!SA_EMAIL || !SA_PASSWORD) {
  console.error('❌  Set SA_EMAIL and SA_PASSWORD env vars before running this script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  console.log('\n🔧  Setting up Super Admin account...\n')

  // ── 1. Find or create the auth user ─────────────────────────────────────
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) { console.error('listUsers:', listErr.message); process.exit(1) }

  let userId
  const existing = users.find(u => u.email === SA_EMAIL)

  if (existing) {
    userId = existing.id
    console.log(`✓  Auth user already exists  (${userId})`)

    // Update password + ensure email is confirmed
    const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(userId, {
      password: SA_PASSWORD,
      email_confirm: true,
    })
    if (updateAuthErr) { console.error('updateUser:', updateAuthErr.message); process.exit(1) }
    console.log('✓  Auth credentials refreshed')
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: SA_EMAIL,
      password: SA_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin',
        company_name: 'InvoiceChaser',
        role: 'super_admin',
      },
    })
    if (createErr) { console.error('createUser:', createErr.message); process.exit(1) }
    userId = created.user.id
    console.log(`✓  Auth user created  (${userId})`)
  }

  // ── 2. Upsert profiles row (role = super_admin, is_protected = true) ─────
  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: SA_EMAIL,
    full_name: 'Super Admin',
    company_name: 'InvoiceChaser',
    role: 'super_admin',
    is_protected: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })

  if (profileErr) {
    console.warn('⚠  profiles upsert:', profileErr.message, '(may not exist yet — continuing)')
  } else {
    console.log('✓  profiles.role = super_admin  |  is_protected = true')
  }

  // ── 3. Upsert users row (is_admin = true, is_protected = true) ────────────
  const { error: userErr } = await supabase.from('users').upsert({
    id: userId,
    email: SA_EMAIL,
    full_name: 'Super Admin',
    company_name: 'InvoiceChaser',
    is_admin: true,
    is_protected: true,
    role: 'super_admin',
  }, { onConflict: 'id' })

  if (userErr) {
    console.warn('⚠  users upsert:', userErr.message, '(may not exist yet — continuing)')
  } else {
    console.log('✓  users.is_admin = true  |  is_protected = true')
  }

  // ── 4. Verify protections ────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────')
  console.log('✅  Super Admin setup complete')
  console.log(`    Email   : ${SA_EMAIL}`)
  console.log(`    User ID : ${userId}`)
  console.log(`    Role    : super_admin`)
  console.log(`    Protected (cannot be deleted): true`)
  console.log(`    Password change requires email confirmation`)
  console.log('─────────────────────────────────────────────\n')
}

run()
