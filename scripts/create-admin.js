/**
 * Script to create a protected admin account using service role key
 * Run with: node scripts/create-admin.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZm1senB1ZWdoYmJoemVvc3lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMDAxMywiZXhwIjoyMDk0MDk2MDEzfQ.n_yBPW8eqOMg9Qnkub8i65fMWkC1wuTAZ1-aTLlbDSQ'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

// Use service role client to bypass email confirmation
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const ADMIN_EMAIL = 'hello@munya.co.zw'
const ADMIN_PASSWORD = 'griezmann17'

async function createAdminAccount() {
  try {
    console.log('Setting up admin account...')
    
    // Step 1: Check if user exists
    console.log('Checking if user exists...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError.message)
      process.exit(1)
    }

    let userId
    const existingUser = users.find(u => u.email === ADMIN_EMAIL)
    
    if (existingUser) {
      userId = existingUser.id
      console.log('✓ Found existing user')
    } else {
      // Step 1: Create user with service role (bypasses email confirmation)
      console.log('Creating new admin user...')
      const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: {
          full_name: 'Admin User',
          company_name: 'InvoiceChaser',
          is_admin: true
        }
      })

      if (signUpError) {
        console.error('Error creating user:', signUpError.message)
        process.exit(1)
      }

      userId = signUpData.user.id
      console.log('✓ Admin account created successfully')
    }

    // Step 2: Update user profile to be admin and protected
    console.log('Updating user profile...')
    const { error: updateError } = await supabase
      .from('users')
      .upsert({ 
        id: userId,
        email: ADMIN_EMAIL,
        is_admin: true, 
        is_protected: true,
        full_name: 'Admin User',
        company_name: 'InvoiceChaser'
      }, { onConflict: 'id' })

    if (updateError) {
      console.error('Error updating user profile:', updateError.message)
      process.exit(1)
    }

    console.log(`  Email: ${ADMIN_EMAIL}`)
    console.log(`  User ID: ${userId}`)
    console.log(`  Role: Admin (protected)`)

    console.log('\n✓ Admin account setup complete!')
    console.log('This account cannot be deleted and has full admin privileges.')

  } catch (error) {
    console.error('Error creating admin account:', error.message)
    process.exit(1)
  }
}

// Run the script
createAdminAccount()
