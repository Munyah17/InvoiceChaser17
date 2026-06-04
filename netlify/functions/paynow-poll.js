const { Paynow } = require('paynow')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { pollUrl } = JSON.parse(event.body)

    if (!pollUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing pollUrl' }) }
    }

    const integrationId = process.env.PAYNOW_INTEGRATION_ID || process.env.PAYNOW_ID
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY || process.env.PAYNOW_KEY

    if (!integrationKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'PAYNOW_INTEGRATION_KEY not configured' }) }
    }

    const paynow = new Paynow(integrationId, integrationKey)
    const status = await paynow.pollTransaction(pollUrl)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        paid: status.paid(),
        status: status.status,
        amount: status.amount,
        reference: status.reference,
        paynowReference: status.paynowreference,
      }),
    }
  } catch (error) {
    console.error('Paynow poll error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
