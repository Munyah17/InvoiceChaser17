import { createClient } from '@supabase/supabase-js'
import { handlePreflight } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  try {
    const { full_name, email, phone, company_name, business_type, company_size, interests, message } = req.body

    if (!full_name || !email) {
      return res.status(400).json({ error: 'Missing required fields: full_name, email' })
    }

    const { data, error } = await supabase.from('demo_requests').insert({
      full_name,
      email,
      phone: phone || null,
      company_name: company_name || null,
      business_type: business_type || null,
      company_size: company_size || null,
      interests: Array.isArray(interests) ? interests : [],
      message: message || null,
    }).select().single()

    if (error) throw error

    // Notify the team — reuses the existing Resend-backed send-email function
    const adminEmail = process.env.VITE_ADMIN_EMAIL || 'admin@invoicechaser.com'
    const origin = req.headers.origin || process.env.VITE_APP_URL
    fetch(`${origin}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: adminEmail,
        subject: `New demo request from ${full_name}`,
        html: `<p><strong>Name:</strong> ${full_name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
               <p><strong>Company:</strong> ${company_name || 'N/A'} (${business_type || 'N/A'}, ${company_size || 'N/A'})</p>
               <p><strong>Interested in:</strong> ${(interests || []).join(', ') || 'N/A'}</p>
               <p><strong>Message:</strong> ${message || 'N/A'}</p>
               <p>Review in Admin Portal → Demo Requests.</p>`,
      }),
    }).catch(err => console.error('Admin notification failed:', err))

    return res.status(200).json({ success: true, id: data.id })
  } catch (error) {
    console.error('Request demo error:', error)
    return res.status(500).json({ error: error.message })
  }
}
