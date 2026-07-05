import { createClient } from '@supabase/supabase-js'
import { applyCors } from './_lib/cors.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  applyCors(res)

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  try {
    // Paynow posts application/x-www-form-urlencoded — Vercel parses it into req.body for us.
    const { status, reference, paynowreference, amount } = req.body || {}

    console.log('Paynow result callback:', { status, reference, paynowreference, amount })

    if (supabase && reference) {
      const newStatus = status === 'Paid' || status === 'paid' ? 'completed' : 'failed'
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          metadata: {
            paynow_status: status,
            paynow_reference: paynowreference,
            paynow_amount: amount,
          },
        })
        .eq('transaction_ref', reference)
    }

    return res.status(200).json({ received: true, status, reference })
  } catch (error) {
    console.error('Paynow result error:', error)
    return res.status(500).json({ error: error.message })
  }
}
