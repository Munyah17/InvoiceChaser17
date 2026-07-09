import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { invoiceId, recipientEmail, subject, body } = req.body

    if (!invoiceId || !recipientEmail || !subject) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const resendApiKey = process.env.RESEND_API_KEY

    // If Resend not configured, log a mock record (for demo/dev)
    if (!resendApiKey || resendApiKey.includes('placeholder') || resendApiKey.includes('your-')) {
      console.warn('⚠️  RESEND_API_KEY not configured — logging as pending')

      // Log reminder as pending (so admin knows it failed)
      await supabase
        .from('invoice_reminders')
        .insert({
          invoice_id: invoiceId,
          recipient_email: recipientEmail,
          subject,
          status: 'pending',
          error_message: 'RESEND_API_KEY not configured',
          sent_at: null,
          created_at: new Date().toISOString(),
        })
        .catch(() => {}) // Silently fail if table doesn't exist

      return res.status(200).json({
        sent: false,
        reason: 'Email service not configured',
        advice: 'Set RESEND_API_KEY in environment variables',
        status: 'queued', // Frontend sees it as queued
      })
    }

    const resend = new Resend(resendApiKey)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'reminders@invoicechaser.com',
      to: recipientEmail,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    })

    if (error) {
      console.error('❌ Email send error:', error)

      // Log failure
      await supabase
        .from('invoice_reminders')
        .insert({
          invoice_id: invoiceId,
          recipient_email: recipientEmail,
          subject,
          status: 'failed',
          error_message: error.message,
          sent_at: null,
          created_at: new Date().toISOString(),
        })
        .catch(() => {})

      return res.status(500).json({
        sent: false,
        error: error.message,
      })
    }

    // Log success
    await supabase
      .from('invoice_reminders')
      .insert({
        invoice_id: invoiceId,
        recipient_email: recipientEmail,
        subject,
        status: 'sent',
        message_id: data?.id,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .catch(() => {})

    return res.status(200).json({
      sent: true,
      messageId: data?.id,
      status: 'delivered',
    })
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return res.status(500).json({
      error: err.message,
      status: 'failed',
    })
  }
}
