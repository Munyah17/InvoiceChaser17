// Reads the raw request body as a Buffer. Used where signature verification
// requires the exact bytes as sent (e.g. Stripe webhooks), so bodyParser must
// be disabled for that function via `export const config = { api: { bodyParser: false } }`.
export function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
