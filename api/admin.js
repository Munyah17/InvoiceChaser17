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

    // HANDLE: GET /api/admin - demo requests + current pricing
    if (req.method === 'GET') {
      const [{ data: requests, error }, { data: pricing }] = await Promise.all([
        supabase.from('demo_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('app_pricing').select('*').order('display_order'),
      ])
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ requests, pricing: pricing || [] })
    }

    // HANDLE: POST /api/admin
    if (req.method === 'POST') {
      const { userId, action, demoRequestId, reason, retry, newRole, newPlan, details } = req.body

      const VALID_ROLES = ['user', 'admin', 'super_admin']
      const VALID_PLANS = ['free', 'starter', 'professional', 'business', 'lifetime', 'enterprise']

      // Load target once for any user-management action so we can enforce
      // protection rules server-side (never trust the client).
      const loadTarget = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, role, is_protected')
          .eq('id', userId)
          .single()
        return data
      }

      // USER: Change role — super_admin only
      if (action === 'update-role') {
        if (auth.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only a super admin can change roles' })
        }
        if (!userId || !VALID_ROLES.includes(newRole)) {
          return res.status(400).json({ error: 'Invalid userId or role' })
        }
        if (userId === auth.user.id) {
          return res.status(400).json({ error: 'You cannot change your own role' })
        }
        const target = await loadTarget()
        if (!target) return res.status(404).json({ error: 'User not found' })
        if (target.is_protected) {
          return res.status(403).json({ error: 'This account is protected' })
        }
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId)
        if (error) return res.status(400).json({ error: 'Failed to update role' })
        return res.status(200).json({ success: true, role: newRole })
      }

      // USER: Change plan — admin + super_admin
      if (action === 'update-plan') {
        if (!userId || !VALID_PLANS.includes(newPlan)) {
          return res.status(400).json({ error: 'Invalid userId or plan' })
        }
        const { error } = await supabase
          .from('profiles')
          .update({ plan: newPlan, updated_at: new Date().toISOString() })
          .eq('id', userId)
        if (error) return res.status(400).json({ error: 'Failed to update plan' })
        return res.status(200).json({ success: true, plan: newPlan })
      }

      // USER: Edit display details — admin + super_admin
      if (action === 'update-details') {
        if (!userId || !details) {
          return res.status(400).json({ error: 'Missing userId or details' })
        }
        const patch = { updated_at: new Date().toISOString() }
        if (typeof details.name === 'string') patch.name = details.name
        if (typeof details.full_name === 'string') patch.full_name = details.full_name
        const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
        if (error) return res.status(400).json({ error: 'Failed to update details' })
        return res.status(200).json({ success: true })
      }

      // PRICING: Update plan prices — super_admin only
      if (action === 'update-pricing') {
        if (auth.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only a super admin can change pricing' })
        }
        const { pricing } = req.body
        if (!Array.isArray(pricing) || pricing.length === 0) {
          return res.status(400).json({ error: 'Missing pricing array' })
        }
        const VALID_INTERVALS = ['month', 'year', 'once']
        for (const p of pricing) {
          const cents = Math.round(Number(p.amount_cents))
          if (!p.plan_key || !Number.isFinite(cents) || cents < 0) {
            return res.status(400).json({ error: `Invalid price for ${p.plan_key || 'unknown plan'}` })
          }
          if (p.interval && !VALID_INTERVALS.includes(p.interval)) {
            return res.status(400).json({ error: `Invalid interval for ${p.plan_key}` })
          }
          const patch = { amount_cents: cents, updated_at: new Date().toISOString() }
          if (p.interval) patch.interval = p.interval
          if (typeof p.name === 'string' && p.name.trim()) patch.name = p.name.trim()
          if (typeof p.active === 'boolean') patch.active = p.active
          const { error } = await supabase.from('app_pricing').update(patch).eq('plan_key', p.plan_key)
          if (error) return res.status(400).json({ error: `Failed to update ${p.plan_key}` })
        }
        const { data: updated } = await supabase.from('app_pricing').select('*').order('display_order')
        return res.status(200).json({ success: true, pricing: updated || [] })
      }

      // USER: Suspend (ban) — admin + super_admin
      if (action === 'suspend-user') {
        if (!userId) return res.status(400).json({ error: 'Missing userId' })
        if (userId === auth.user.id) {
          return res.status(400).json({ error: 'You cannot suspend your own account' })
        }
        const target = await loadTarget()
        if (!target) return res.status(404).json({ error: 'User not found' })
        if (target.is_protected || target.role === 'super_admin') {
          return res.status(403).json({ error: 'This account is protected' })
        }
        const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
        if (error) return res.status(400).json({ error: 'Failed to suspend user' })
        return res.status(200).json({ success: true, message: 'User suspended' })
      }

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
