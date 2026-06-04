const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

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

  try {
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body
    const params = new URLSearchParams(body)

    const status = params.get('status')
    const reference = params.get('reference')
    const paynowreference = params.get('paynowreference')
    const amount = params.get('amount')

    console.log('Paynow result callback:', { status, reference, paynowreference, amount })

    if (supabase && reference) {
      const newStatus = status === 'Paid' || status === 'paid' ? 'completed' : 'failed'
      await supabase
        .from('payments')
        .update({
          status: newStatus,
          metadata: {
            paynow_status: status,
            paynow_reference: paynowreference,
            paynow_amount: amount,
          },
        })
        .eq('transaction_ref', reference)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, status, reference }),
    }
  } catch (error) {
    console.error('Paynow result error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }
  }
}
