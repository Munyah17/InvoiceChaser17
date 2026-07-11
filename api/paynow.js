import { Paynow } from 'paynow'
import { createClient } from '@supabase/supabase-js'
import { handlePreflight, applyCors } from './_lib/cors.js'
import { activatePlan } from './_lib/activate-plan.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  applyCors(res)

  try {
    const { action } = req.body || {}

    // HANDLE: POST /api/paynow?action=pay
    if (req.method === 'POST' && action === 'pay') {
      const { amount, description, reference, email, user_id, plan_id } = req.body

      if (!amount || !description || !reference) {
        return res.status(400).json({ error: 'Missing required fields: amount, description, reference' })
      }

      const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
      const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

      if (!integrationId || !integrationKey) {
        return res.status(500).json({ error: 'Paynow credentials not configured' })
      }

      const paynow = new Paynow(integrationId, integrationKey)
      const siteUrl = process.env.VITE_APP_URL || `https://${req.headers.host}`

      paynow.resultUrl = `${siteUrl}/api/paynow?action=result`
      paynow.returnUrl = `${siteUrl}/payment-success?method=paynow&plan=${plan_id || 'professional'}&ref=${reference}`

      const payment = paynow.createPayment(reference, email || 'customer@invoicechaser.com')
      payment.add(`InvoiceChaser — ${description}`, parseFloat(amount))

      const response = await paynow.send(payment)

      if (!response.success) {
        return res.status(402).json({ error: response.error || 'Paynow transaction initiation failed' })
      }

      if (supabase) {
        await supabase.from('payments').insert({
          user_id: user_id || null,
          amount: parseFloat(amount),
          currency: 'USD',
          method: 'paynow',
          status: 'pending',
          transaction_ref: reference,
          metadata: {
            paynow_poll_url: response.pollUrl,
            paynow_reference: reference,
            plan_id: plan_id || null,
          },
        })
      }

      return res.status(200).json({
        success: true,
        url: response.redirectUrl,
        pollUrl: response.pollUrl,
        reference,
      })
    }

    // HANDLE: POST /api/paynow?action=poll
    if (req.method === 'POST' && action === 'poll') {
      const { pollUrl } = req.body

      if (!pollUrl) {
        return res.status(400).json({ error: 'Missing pollUrl' })
      }

      const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
      const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

      if (!integrationKey) {
        return res.status(500).json({ error: 'PAYNOW_INTEGRATION_KEY not configured' })
      }

      const paynow = new Paynow(integrationId, integrationKey)
      const status = await paynow.pollTransaction(pollUrl)
      const isPaid = status.paid()

      // Activate the plan here the moment payment is confirmed. The client can
      // no longer set its own plan (RLS), and Paynow's async result callback
      // can be delayed, so this poll — driven by the success page — is the
      // reliable activation point. Idempotent via activatePlan().
      if (isPaid && supabase) {
        const { data: pmt } = await supabase
          .from('payments')
          .select('id, user_id, status, metadata')
          .filter('metadata->>paynow_poll_url', 'eq', pollUrl)
          .maybeSingle()

        if (pmt && pmt.status !== 'completed') {
          await supabase.from('payments').update({ status: 'completed' }).eq('id', pmt.id)

          if (pmt.metadata?.type === 'invoice_payment' && pmt.metadata?.invoice_id) {
            await supabase.from('invoices')
              .update({ status: 'paid', updated_at: new Date().toISOString() })
              .eq('id', pmt.metadata.invoice_id)
          } else if (pmt.metadata?.plan_id && pmt.user_id) {
            await activatePlan(supabase, {
              userId: pmt.user_id,
              planId: pmt.metadata.plan_id,
              method: 'paynow',
              transactionRef: `${pmt.id}-activated`,
              amount: parseFloat(status.amount) || 0,
              currency: 'USD',
            })
          }
        }
      }

      return res.status(200).json({
        paid: isPaid,
        status: status.status,
        amount: status.amount,
        reference: status.reference,
        paynowReference: status.paynowreference,
      })
    }

    // HANDLE: POST /api/paynow?action=result (webhook callback)
    if ((req.method === 'POST' && action === 'result') || req.method === 'POST') {
      const { status, reference, paynowreference, amount } = req.body || {}

      console.log('Paynow result callback:', { status, reference, paynowreference, amount })

      if (supabase && reference) {
        const newStatus = status === 'Paid' || status === 'paid' ? 'completed' : 'failed'

        const { data: existing } = await supabase
          .from('payments')
          .select('id, user_id, metadata')
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
        } else if (newStatus === 'completed' && existing?.metadata?.plan_id && existing?.user_id) {
          // Subscription/plan purchase via Paynow — activate server-side.
          // (Previously the plan was only ever set client-side, which is no
          //  longer permitted by RLS, so this is now the authoritative path.)
          await activatePlan(supabase, {
            userId: existing.user_id,
            planId: existing.metadata.plan_id,
            method: 'paynow',
            transactionRef: `${reference}-activated`,
            amount: parseFloat(amount) || 0,
            currency: 'USD',
          })
        }
      }

      return res.status(200).json({ received: true, status, reference })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Paynow error:', error)
    return res.status(500).json({ error: error.message })
  }
}
