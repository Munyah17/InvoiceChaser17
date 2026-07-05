import { Resend } from 'resend'
import { handlePreflight } from './_lib/cors.js'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, subject, html, text } = req.body

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set — skipping email')
      return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY not configured' })
    }

    const resend = new Resend(resendApiKey)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@invoicechaser.com',
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Email send error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ sent: true, messageId: data?.id })
  } catch (err) {
    console.error('Send email error:', err)
    return res.status(500).json({ error: err.message })
  }
}
