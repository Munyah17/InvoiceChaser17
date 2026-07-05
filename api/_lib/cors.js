// Shared CORS helper for Vercel serverless functions under /api.
export function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

// Returns true if the request was an OPTIONS preflight and has been handled.
export function handlePreflight(req, res) {
  applyCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
