import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'

function generateKey(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let key = prefix + '_'
  for (let i = 0; i < 32; i++) key += chars[bytes[i] % chars.length]
  return key
}

export default function APIKeysPage() {
  const { user } = useStore()
  const [keys, setKeys]               = useState([])
  const [wallet, setWallet]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [tablesMissing, setTablesMissing] = useState(false)
  const [newKeyName, setNewKeyName]   = useState('')
  const [generating, setGenerating]   = useState(false)
  const [revealedSecret, setRevealedSecret] = useState(null) // { id, secret }
  const [toast, setToast]             = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (user) loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Load wallet balance
      const { data: w, error: wErr } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .single()

      if (wErr?.code === '42P01' || wErr?.message?.includes('does not exist')) {
        setTablesMissing(true)
        setLoading(false)
        return
      }
      setWallet(w || { balance: 0 })

      // Load API keys
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id, name, publishable_key, secret_key_prefix, status, total_requests, total_charged, last_used_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setKeys(apiKeys || [])
    } catch (err) {
      console.error('API keys load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!newKeyName.trim()) return showToast('Enter a name for this key', 'error')
    if ((wallet?.balance || 0) < 1) return showToast('Minimum $1.00 wallet balance required to generate keys', 'error')

    setGenerating(true)
    try {
      const publishableKey = generateKey('ic_pk_live')
      const secretKey      = generateKey('ic_sk_live')
      const secretPrefix   = secretKey.slice(0, 20) + '…'

      // In production: hash the secret key server-side before storing
      // For now we store the prefix for display (secret shown once)
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: newKeyName.trim(),
          publishable_key: publishableKey,
          secret_key_hash: secretKey,
          secret_key_prefix: secretPrefix,
          status: 'active',
        })
        .select()
        .single()

      if (error) return showToast('Failed to generate key: ' + error.message, 'error')

      // Show secret key ONCE — user must copy it now
      setRevealedSecret({ id: data.id, secret: secretKey })
      setKeys(prev => [data, ...prev])
      setNewKeyName('')
      showToast('Key pair generated — copy your secret key now, it won\'t be shown again')
    } catch {
      showToast('Something went wrong', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleRevoke = async (keyId) => {
    try {
      await supabase
        .from('api_keys')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', user.id)

      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'revoked' } : k))
      setRevokeTarget(null)
      showToast('Key revoked — it can no longer authenticate requests')
    } catch {
      showToast('Failed to revoke', 'error')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard'))
  }

  const statusStyle = (status) => {
    if (status === 'active') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
    if (status === 'paused') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  }

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(4)}`

  if (!loading && tablesMissing) {
    return (
      <div className="animate-fade-in">
        <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-4">API Keys</h1>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 text-xs text-amber-700 dark:text-amber-400">
          Run <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">supabase/migrations/20260605_api_keys.sql</code> to enable API keys.
        </div>
      </div>
    )
  }

  const walletActive = (wallet?.balance || 0) >= 1

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-xs font-medium z-50 shadow-lg max-w-xs
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'}`}>
          {toast.message}
        </div>
      )}

      {/* Revoke confirm modal */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white mb-2">Revoke API Key?</h3>
            <p className="text-xs text-neutral-500 mb-4">This key will immediately stop working. Any integrations using it will break. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setRevokeTarget(null)} className="flex-1 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">Cancel</button>
              <button onClick={() => handleRevoke(revokeTarget)} className="flex-1 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Revoke Key</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">API Keys</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Integrate InvoiceChaser with your apps. Requests are billed from your wallet.</p>
        </div>
        <Link to="/app/wallet" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
          </svg>
          Wallet: ${parseFloat(wallet?.balance || 0).toFixed(2)}
        </Link>
      </div>

      {loading ? (
        <div className="text-xs text-neutral-500 py-8 text-center">Loading…</div>
      ) : (
        <div className="space-y-5">
          {/* Wallet gate warning */}
          {!walletActive && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-semibold">Wallet balance too low.</span> Add at least $1.00 to generate or activate API keys.{' '}
                <Link to="/app/wallet" className="underline font-medium">Top up now →</Link>
              </div>
            </div>
          )}

          {/* Revealed secret — shown once */}
          {revealedSecret && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700/50 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-600 dark:text-emerald-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Copy your secret key — shown only once</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/50 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-2">
                <code className="flex-1 text-xs font-mono text-neutral-900 dark:text-white break-all">{revealedSecret.secret}</code>
                <button onClick={() => copyToClipboard(revealedSecret.secret)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-70 flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Store this in a secure environment variable. Never expose it client-side or commit it to git.</p>
              <button onClick={() => setRevealedSecret(null)} className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 underline">I've saved it — dismiss</button>
            </div>
          )}

          {/* Generate new key */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Generate New Key Pair</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key name (e.g. My App Integration)"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                className="flex-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !walletActive || !newKeyName.trim()}
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">Generates a <strong>Publishable key</strong> (safe for client use) and a <strong>Secret key</strong> (server-side only, shown once).</p>
          </div>

          {/* Key list */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Your Keys</span>
              <span className="text-[10px] text-neutral-500">{keys.length} key pair{keys.length !== 1 ? 's' : ''}</span>
            </div>

            {keys.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 stroke-neutral-400">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">No keys yet</p>
                <p className="text-xs text-neutral-500 mt-0.5">Generate your first key pair above</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {keys.map(k => (
                  <div key={k.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900 dark:text-white">{k.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${statusStyle(k.status)}`}>{k.status}</span>
                          {k.status === 'paused' && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400">Low wallet balance</span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          Created {new Date(k.created_at).toLocaleDateString()} ·{' '}
                          {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'} ·{' '}
                          {k.total_requests || 0} requests · {fmt(k.total_charged)} charged
                        </div>
                      </div>
                      {k.status !== 'revoked' && (
                        <button
                          onClick={() => setRevokeTarget(k.id)}
                          className="text-[10px] text-red-500 hover:underline flex-shrink-0"
                        >
                          Revoke
                        </button>
                      )}
                    </div>

                    {/* Publishable key */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase w-16 flex-shrink-0">Publishable</span>
                        <code className="flex-1 text-[10px] font-mono text-neutral-700 dark:text-neutral-300 truncate">{k.publishable_key}</code>
                        <button onClick={() => copyToClipboard(k.publishable_key)} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex-shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase w-16 flex-shrink-0">Secret</span>
                        <code className="flex-1 text-[10px] font-mono text-neutral-400">{k.secret_key_prefix}</code>
                        <span className="text-[9px] text-neutral-400 flex-shrink-0">hidden</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Docs / integration guide */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Quick Integration</div>
            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
              <div>
                <div className="font-medium text-neutral-900 dark:text-white mb-1">Authentication</div>
                <div className="bg-neutral-950 rounded-lg px-4 py-3 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                  <div className="text-neutral-500">// All requests need your secret key in the header</div>
                  <div>Authorization: Bearer ic_sk_live_your_secret_key</div>
                </div>
              </div>
              <div>
                <div className="font-medium text-neutral-900 dark:text-white mb-1">Example — list invoices</div>
                <div className="bg-neutral-950 rounded-lg px-4 py-3 font-mono text-[11px] text-neutral-300 overflow-x-auto whitespace-pre">{`GET https://api.invoicechaser.app/v1/invoices
Authorization: Bearer ic_sk_live_...

// Response deducts $0.001 from wallet`}</div>
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-3">Full API documentation coming soon. Use your publishable key for client-side embed widgets; never expose the secret key.</p>
          </div>
        </div>
      )}
    </div>
  )
}
