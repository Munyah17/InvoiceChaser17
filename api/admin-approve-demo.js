import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from './_lib/verify-jwt.js'
import { createDemoAccount } from './_lib/demo-account.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await verifyAdmin(req, supabase, supabaseUrl, serviceRoleKey)
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error })
    }

    const { demoRequestId, action, reason } = req.body

    if (!demoRequestId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request' })
    }

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
      approved_by: auth.user.id,
    }

    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason
    }

    const { error: updateErr } = await supabase
      .from('demo_requests')
      .update(updateData)
      .eq('id', demoRequestId)

    if (updateErr) {
      console.error('Update error:', updateErr)
      return res.status(400).json({ error: 'Failed to update demo request' })
    }

    if (action === 'reject') {
      return res.status(200).json({
        success: true,
        action,
        message: 'Demo request rejected',
      })
    }

    // Approved — create the demo account and hand the credentials back to the admin
    const result = await createDemoAccount(supabase, demoRequestId)

    if (result.status !== 200) {
      console.error('Demo account creation failed:', result.body)
      return res.status(200).json({
        success: true,
        action,
        accountCreated: false,
        message: `Request approved, but account creation failed: ${result.body.error}. Retry via POST /api/create-demo-account.`,
      })
    }

    return res.status(200).json({
      success: true,
      action,
      accountCreated: true,
      credentials: {
        email: result.body.email,
        tempPassword: result.body.tempPassword,
        expiresAt: result.body.expiresAt,
      },
      message: 'Demo approved and account created',
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
