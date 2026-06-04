import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0?target=deno&dts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@invoicechaser.com'
const APP_URL = Deno.env.get('APP_URL') || 'https://invoicechaser.netlify.app'

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: `InvoiceChaser <${FROM_EMAIL}>`, to, subject, html }),
  })
  if (!res.ok) console.error('Resend error:', await res.text())
  return res.ok
}

// Escalation: number of emails per day based on days overdue.
// The goal is to bore/annoy the debtor into paying — intensity increases over time.
function emailsPerDay(daysOverdue: number): number {
  if (daysOverdue < 0) return 1    // pre-due: 1 friendly heads-up
  if (daysOverdue === 0) return 1  // due today: 1 firm notice
  if (daysOverdue <= 3) return 2   // days 1-3: morning + evening
  if (daysOverdue <= 7) return 3   // days 4-7: morning + noon + evening
  if (daysOverdue <= 14) return 4  // days 8-14: every ~6 hours
  if (daysOverdue <= 30) return 5  // days 15-30: every ~5 hours
  return 6                          // 30+ days: every ~4 hours — maximum pressure
}

function buildEmailHtml(invoice: any, creditorName: string, daysOverdue: number): string {
  const amount = parseFloat(invoice.amount).toFixed(2)
  const urgencyColor = daysOverdue <= 0 ? '#1a1a1a' : daysOverdue <= 7 ? '#d97706' : '#dc2626'

  const stripePayUrl = `${APP_URL}/pay/${invoice.invoice_number}?gateway=stripe`
  const paynowPayUrl = `${APP_URL}/pay/${invoice.invoice_number}?gateway=paynow`
  const appealUrl   = `${APP_URL}/appeal/${invoice.id}`

  const overdueBlock = daysOverdue > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0">
      <p style="color:#991b1b;font-weight:600;margin:0 0 6px">⚠️ Your payment is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.</p>
      <p style="color:#7f1d1d;font-size:13px;margin:0">
        Continued non-payment may result in further collection action.
        If you believe this is incorrect, please use the appeal link below.
      </p>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb">
<div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb">

  <div style="font-weight:bold;font-size:20px;color:#1a1a1a;margin-bottom:4px">⚡ InvoiceChaser</div>
  <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Payment reminder from <strong>${creditorName}</strong></p>

  ${overdueBlock}

  <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:16px 0">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="color:#6b7280;font-size:13px;padding:5px 0">Invoice #</td>
          <td style="text-align:right;font-weight:600;color:#1a1a1a">${invoice.invoice_number}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:5px 0">Amount Due</td>
          <td style="text-align:right;font-weight:700;font-size:20px;color:${urgencyColor}">USD ${amount}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:5px 0">Due Date</td>
          <td style="text-align:right;color:#1a1a1a">${invoice.due_date}</td></tr>
      ${invoice.description ? `<tr><td style="color:#6b7280;font-size:13px;padding:5px 0">For</td><td style="text-align:right;color:#1a1a1a">${invoice.description}</td></tr>` : ''}
    </table>
  </div>

  <p style="color:#374151;margin:20px 0 12px;font-weight:600">Pay now — choose your preferred method:</p>
  <div style="margin-bottom:24px">
    <a href="${stripePayUrl}"
       style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;background:#635bff;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
      Pay via Stripe (Visa / Mastercard)
    </a>
    <a href="${paynowPayUrl}"
       style="display:inline-block;margin:0 8px 8px 0;padding:12px 22px;background:#00a651;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
      Pay via Paynow (EcoCash / Bank)
    </a>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin:0 0 24px">
    You will be redirected to the payment gateway's secure checkout. InvoiceChaser never sees your card or PIN.
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

  <div style="background:#f9fafb;border-radius:8px;padding:16px;text-align:center">
    <p style="color:#374151;font-size:13px;margin:0 0 10px">
      <strong>Convinced You Don't Owe This Creditor?</strong><br>
      You have the right to dispute this invoice.
    </p>
    <a href="${appealUrl}"
       style="display:inline-block;padding:10px 20px;background:white;color:#374151;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;border:1px solid #d1d5db">
      Submit an Appeal Now →
    </a>
    <p style="color:#9ca3af;font-size:11px;margin:10px 0 0">
      Appeals are reviewed independently. Verified debts are declined; incorrect ones suspend the chaser.
    </p>
  </div>

  <p style="color:#9ca3af;font-size:11px;margin:20px 0 0;text-align:center">
    © 2026 InvoiceChaser. All rights reserved. Powered By Global Space Web
  </p>
</div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  )

  try {
    const body = await req.json().catch(() => ({}))

    // ── Mode 1: Manual single send from the frontend ──────────────────────
    if (body.to && body.subject && body.html) {
      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const sent = await sendViaResend(body.to, body.subject, body.html)
      if (sent && body.invoice_id) {
        await supabase.from('reminders').insert({
          user_id: body.user_id,
          invoice_id: body.invoice_id,
          type: 'manual',
          scheduled_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: 'sent',
        })
      }
      await supabase.from('email_logs').insert({ to_email: body.to, subject: body.subject, status: sent ? 'sent' : 'failed', invoice_id: body.invoice_id || null })
      return new Response(JSON.stringify({ success: sent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── Mode 2: Automated batch run (called by cron / daily_scheduler) ────
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ skipped: true, reason: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Load unpaid invoices with creditor profile
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, customer_email, amount, due_date, description, user_id, users(full_name, company_name)')
      .in('status', ['pending', 'overdue'])
      .not('customer_email', 'is', null)

    if (!invoices?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, reason: 'No pending invoices' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Bulk-mark overdue
    const overdueIds = invoices
      .filter(inv => new Date(inv.due_date) < now)
      .map(inv => inv.id)
    if (overdueIds.length) {
      await supabase.from('invoices').update({ status: 'overdue' }).in('id', overdueIds)
    }

    let totalSent = 0

    for (const invoice of invoices) {
      const daysOverdue = Math.floor((now.getTime() - new Date(invoice.due_date).getTime()) / 86400000)
      const quota = emailsPerDay(daysOverdue)

      // Count emails already sent today for this invoice
      const { count: sentToday } = await supabase
        .from('reminders')
        .select('id', { count: 'exact', head: true })
        .eq('invoice_id', invoice.id)
        .eq('status', 'sent')
        .gte('sent_at', `${todayStr}T00:00:00Z`)

      if ((sentToday || 0) >= quota) continue

      const creditor = (invoice.users as any)?.company_name
        || (invoice.users as any)?.full_name
        || 'Your Creditor'

      const emailType = daysOverdue < 0 ? 'before_due' : daysOverdue === 0 ? 'due' : `overdue_${daysOverdue}d`
      const subject = daysOverdue < 0
        ? `Reminder: Invoice ${invoice.invoice_number} due in ${Math.abs(daysOverdue)} days`
        : daysOverdue === 0
        ? `Invoice ${invoice.invoice_number} is Due Today`
        : `OVERDUE (${daysOverdue}d): Invoice ${invoice.invoice_number} — Payment Required`

      const html = buildEmailHtml(invoice, creditor, daysOverdue)
      const sent = await sendViaResend(invoice.customer_email, subject, html)

      await supabase.from('reminders').insert({
        user_id: invoice.user_id,
        invoice_id: invoice.id,
        type: emailType,
        scheduled_at: now.toISOString(),
        sent_at: sent ? now.toISOString() : null,
        status: sent ? 'sent' : 'failed',
      })

      await supabase.from('email_logs').insert({
        to_email: invoice.customer_email,
        subject,
        status: sent ? 'sent' : 'failed',
        invoice_id: invoice.id,
      })

      if (sent) totalSent++
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, processed: invoices.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send_reminder_email error:', err)
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
