import { Paynow } from 'paynow'
import { handlePreflight } from './_lib/cors.js'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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

    return res.status(200).json({
      paid: status.paid(),
      status: status.status,
      amount: status.amount,
      reference: status.reference,
      paynowReference: status.paynowreference,
    })
  } catch (error) {
    console.error('Paynow poll error:', error)
    return res.status(500).json({ error: error.message })
  }
}
