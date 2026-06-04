// Netlify Function: Send email via Resend
const { Resend } = require('resend')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body)

    if (!to || !subject) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: to, subject' }) }
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set — skipping email')
      return { statusCode: 200, headers, body: JSON.stringify({ sent: false, reason: 'RESEND_API_KEY not configured' }) }
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
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ sent: true, messageId: data?.id }) }
  } catch (err) {
    console.error('Send email error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
