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

      const { data: existing } = await supabase
        .from('payments')
        .select('id, metadata')
        .eq('transaction_ref', reference)
        .single()

      await supabase
        .from('payments')
        .update({
          status: newStatus,
          metadata: {
            ...(existing?.metadata || {}),
            paynow_status: status,
            paynow_reference: paynowreference,
            paynow_amount: amount,
          },
        })
        .eq('transaction_ref', reference)

      // ── Invoice payment (debtor paying via a reminder link) ──────────────
      if (newStatus === 'completed' && existing?.metadata?.type === 'invoice_payment') {
        const { invoice_id, base_amount } = existing.metadata
        await supabase.from('invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', invoice_id)

        const { data: invoice } = await supabase.from('invoices').select('invoice_number, user_id').eq('id', invoice_id).single()
        const creditorFee = Math.round(parseFloat(base_amount) * 0.10 * 100) / 100

        const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', invoice?.user_id).single()
        if (wallet) {
          await supabase.from('wallets').update({ balance: parseFloat(wallet.balance) - creditorFee, updated_at: new Date().toISOString() }).eq('user_id', invoice.user_id)
        }
        await supabase.from('wallet_transactions').insert({
          user_id: invoice?.user_id,
          invoice_id,
          amount: creditorFee,
          type: 'debit',
          description: `Collection fee (10%) — Invoice ${invoice?.invoice_number} paid via reminder link`,
          reference,
        })
      }
    }

    return res.status(200).json({ received: true, status, reference })
  } catch (error) {
    console.error('Paynow result error:', error)
    return res.status(500).json({ error: error.message })
  }
}
