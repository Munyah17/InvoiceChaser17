import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from './_lib/verify-jwt.js'

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

    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

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
  } catch (err) {
    console.error('Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
