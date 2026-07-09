import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from './_lib/verify-jwt.js'
import { createDemoAccount } from './_lib/demo-account.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const auth = await verifyAdmin(req, supabase, supabaseUrl, serviceRoleKey)
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error })
    }

    // HANDLE: GET /api/admin - List all demo requests
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ requests: data })
    }

    // HANDLE: POST /api/admin
    if (req.method === 'POST') {
      const { userId, action, demoRequestId, reason, retry } = req.body

      // DEMO: Retry account creation
      if (retry && demoRequestId) {
        const result = await createDemoAccount(supabase, demoRequestId)
        return res.status(result.status).json(result.body)
      }

      // DEMO: Approve or reject request
      if (action === 'approve-demo' || action === 'reject-demo') {
        if (!demoRequestId) {
          return res.status(400).json({ error: 'Missing demoRequestId' })
        }

        const updateData = {
          status: action === 'approve-demo' ? 'approved' : 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: auth.user.id,
        }

        if (action === 'reject-demo' && reason) {
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

        if (action === 'reject-demo') {
          return res.status(200).json({
            success: true,
            action,
            message: 'Demo request rejected',
          })
        }

        // Approved — create the demo account
        const result = await createDemoAccount(supabase, demoRequestId)

        if (result.status !== 200) {
          console.error('Demo account creation failed:', result.body)
          return res.status(200).json({
            success: true,
            action,
            accountCreated: false,
            message: `Request approved, but account creation failed: ${result.body.error}. Retry with retry=true.`,
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
      }

      // USER: Delete user
      if (action === 'delete-user' && userId) {
        if (userId === auth.user.id) {
          return res.status(400).json({ error: 'You cannot delete your own account' })
        }

        const { data: target, error: targetErr } = await supabase
          .from('profiles')
          .select('id, role, is_protected')
          .eq('id', userId)
          .single()

        if (targetErr || !target) {
          return res.status(404).json({ error: 'User not found' })
        }

        if (target.is_protected || target.role === 'super_admin') {
          return res.status(403).json({ error: 'This account is protected and cannot be deleted' })
        }

        const { error: profileErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)

        if (profileErr) {
          console.error('Profile delete error:', profileErr)
          return res.status(400).json({ error: 'Failed to delete user profile' })
        }

        const { error: authErr } = await supabase.auth.admin.deleteUser(userId)

        if (authErr) {
          console.error('Auth delete error:', authErr)
          return res.status(400).json({ error: 'Profile removed but auth account deletion failed' })
        }

        return res.status(200).json({ success: true, message: 'User deleted' })
      }

      return res.status(400).json({ error: 'Invalid action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
