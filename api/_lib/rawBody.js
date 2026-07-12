// Reads the raw request body as a Buffer. Stripe signature verification needs
// the exact bytes as sent. On Vercel's Node runtime the body is normally
// delivered as an unparsed stream (bodyParser disabled via the function's
// `config` export), but if the platform has already parsed/consumed it we
// reconstruct from req.body rather than hanging on a stream that never emits.
export function readRawBody(req) {
  // Already parsed/consumed by the platform — reconstruct the bytes.
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body)
    if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body))
    return Promise.resolve(Buffer.from(JSON.stringify(req.body)))
  }

  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const finish = (fn, val) => { if (!settled) { settled = true; fn(val) } }

    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => finish(resolve, Buffer.concat(chunks)))
    req.on('error', (err) => finish(reject, err))
    // Safety net: never hang the function if the stream never emits 'end'.
    setTimeout(() => finish(resolve, Buffer.concat(chunks)), 5000)
  })
}
