import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { invoice_id, amount, method, source } = await req.json()

    if (!invoice_id || !amount || !method) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL') || '',
      Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, customers(*)')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate fee - 5% if source is chaser_link
    let feeTaken = 0
    if (source === 'chaser_link') {
      feeTaken = amount * 0.05
    }

    const netAmount = amount - feeTaken

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        invoice_id,
        user_id: invoice.user_id,
        amount: netAmount,
        currency: invoice.currency || 'USD',
        method,
        status: 'completed',
        source: source || 'normal',
        fee_taken,
        metadata: {
          original_amount: amount,
        },
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Update invoice status to paid
    await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoice_id)

    // Mark all reminders as sent
    await supabase
      .from('reminders')
      .update({ status: 'sent' })
      .eq('invoice_id', invoice_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment,
        fee_taken: feeTaken,
        net_amount: netAmount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing payment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
