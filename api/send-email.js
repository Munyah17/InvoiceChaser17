import { Resend } from 'resend'
import { handlePreflight } from './_lib/cors.js'

// Team-notification email only. This endpoint is intentionally NOT a general
// mail relay: it always sends to the configured admin/notify address and
// ignores any client-supplied recipient, so it can't be abused to send mail to
// arbitrary people from our domain. (Customer-facing reminder emails go out
// through the reminder pipeline, not here.)
export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { subject, html, text } = req.body

    if (!subject) {
      return res.status(400).json({ error: 'Missing required field: subject' })
    }

    const notifyAddress =
      process.env.ADMIN_NOTIFY_EMAIL || process.env.VITE_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL

    if (!notifyAddress) {
      console.warn('No admin notify address configured — skipping email')
      return res.status(200).json({ sent: false, reason: 'No notify address configured' })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set — skipping email')
      return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY not configured' })
    }

    const resend = new Resend(resendApiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@invoicechaser.com',
      to: notifyAddress,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Email send error:', error)
      return res.status(500).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ sent: true, messageId: data?.id })
  } catch (err) {
    console.error('Send email error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
