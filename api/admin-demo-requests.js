import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return { error: 'Missing authorization token' }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { error: 'Invalid or expired session' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Forbidden' }
  }
  return { user }
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (!supabase) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  const { user, error: authError } = await requireAdmin(req)
  if (authError) {
    return res.status(authError === 'Forbidden' ? 403 : 401).json({ error: authError })
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('demo_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ requests: data })
  }

  if (req.method === 'POST') {
    const { id, action } = req.body
    if (!id || !['approve', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Missing id or invalid action' })
    }

    const status = action === 'approve' ? 'approved' : 'declined'
    const { data: reqRow, error } = await supabase
      .from('demo_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    if (action === 'approve') {
      const origin = req.headers.origin || process.env.VITE_APP_URL
      fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reqRow.email,
          subject: `Your InvoiceChaser demo request is approved`,
          html: `<p>Hi ${reqRow.full_name},</p>
                 <p>Good news — your demo request has been approved. Based on what you told us you need${reqRow.interests?.length ? ` (${reqRow.interests.join(', ')})` : ''}, we've got the right plan ready for you.</p>
                 <p><a href="${origin}/register">Create your account →</a></p>
                 <p>Reply to this email if you have any questions.</p>`,
        }),
      }).catch(err => console.error('Approval email failed:', err))
    }

    return res.status(200).json({ success: true, request: reqRow })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
