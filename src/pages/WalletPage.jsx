import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'

const TOPUP_AMOUNTS = [5, 10, 25, 50, 100]

export default function WalletPage() {
  const { user } = useStore()
  const [wallet, setWallet]           = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tablesMissing, setTablesMissing] = useState(false)

  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNote, setWithdrawNote]     = useState('')
  const [topupAmount, setTopupAmount]       = useState('')
  const [topupTab, setTopupTab]             = useState('stripe') // 'stripe' | 'paynow'
  const [toast, setToast]                   = useState(null)
  const [activeSection, setActiveSection]   = useState('balance') // 'balance' | 'topup' | 'withdraw'

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (user) loadWallet()
  }, [user?.id])

  const loadWallet = async () => {
    if (!user) return
    setLoading(true)
    setTablesMissing(false)
    try {
      let { data: w, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Table doesn't exist yet
      if (fetchError?.code === '42P01' || fetchError?.message?.includes('does not exist')) {
        setTablesMissing(true)
        setLoading(false)
        return
      }

      // No wallet row yet — upsert prevents race-condition duplicates
      if (!w && fetchError?.code === 'PGRST116') {
        const { data: created } = await supabase
          .from('wallets')
          .upsert({ user_id: user.id, balance: 0, currency: 'USD' }, { onConflict: 'user_id', ignoreDuplicates: true })
          .select()
          .single()
        w = created
      }

      setWallet(w || { balance: 0, currency: 'USD' })

      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('id, amount, type, description, reference, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setTransactions(txns || [])
    } catch (err) {
      console.error('Wallet load error:', err)
      setWallet({ balance: 0, currency: 'USD' })
    } finally {
      setLoading(false)
    }
  }

  const handleTopUp = async (gateway) => {
    const amount = parseFloat(topupAmount)
    if (!amount || amount < 1) return showToast('Minimum top-up is $1.00', 'error')
    if (amount > 500) return showToast('Maximum single top-up is $500', 'error')
    showToast(`Redirecting to ${gateway === 'stripe' ? 'Stripe' : 'Paynow'} checkout…`)
    // Gateway integration point — actual redirect handled by payment backend
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error')
    if (amount > (wallet?.balance || 0)) return showToast('Insufficient balance', 'error')
    if (amount < 5) return showToast('Minimum withdrawal is $5.00', 'error')

    try {
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'withdrawal_request',
        description: withdrawNote || 'Withdrawal request',
        reference: `WDR-${Date.now()}`,
      })
      if (error) return showToast('Failed to submit request', 'error')

      await supabase
        .from('wallets')
        .update({ balance: wallet.balance - amount, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)

      showToast('Withdrawal request submitted — processed within 1 business day')
      setWithdrawAmount('')
      setWithdrawNote('')
      loadWallet()
    } catch {
      showToast('Something went wrong', 'error')
    }
  }

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`

  const txTypeStyle = (type) => {
    if (type === 'credit') return { color: 'text-emerald-600 dark:text-emerald-400', sign: '+' }
    if (type === 'api_usage') return { color: 'text-amber-600 dark:text-amber-400', sign: '−' }
    return { color: 'text-red-600 dark:text-red-400', sign: '−' }
  }

  // ── Tables not set up ──────────────────────────────────────────────────
  if (!loading && tablesMissing) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Wallet</h1>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <div className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Wallet tables not set up</div>
              <div className="text-xs text-amber-700 dark:text-amber-400">Run the migration <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">supabase/migrations/20260605_wallet_tables.sql</code> in your Supabase SQL editor to enable the wallet.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-xs font-medium z-50 shadow-lg max-w-xs
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Wallet</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Pre-paid credits for API keys and platform services</p>
        </div>
        <Link
          to="/app/api-keys"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          API Keys
        </Link>
      </div>

      {loading ? (
        <div className="text-xs text-neutral-500 py-8 text-center">Loading wallet…</div>
      ) : (
        <div className="space-y-4">
          {/* Balance hero card */}
          <div className="bg-neutral-900 dark:bg-white rounded-2xl p-6 text-white dark:text-neutral-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium opacity-60 uppercase tracking-wider mb-2">Available Balance</div>
                <div className="text-4xl font-bold mb-1">{fmt(wallet?.balance)}</div>
                <div className="text-xs opacity-50">USD · Used for API key requests and top-up withdrawals</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {(wallet?.balance || 0) < 1 && (
                  <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Low Balance</span>
                )}
                {(wallet?.balance || 0) >= 1 && (
                  <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
            {[
              { id: 'balance', label: 'Overview' },
              { id: 'topup',   label: 'Top Up' },
              { id: 'withdraw', label: 'Withdraw' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors
                  ${activeSection === tab.id
                    ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ──────────────────────────────────────────────── */}
          {activeSection === 'balance' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* How it works */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">How the wallet works</div>
                <ol className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">1.</span>Top up your wallet via Stripe or Paynow</li>
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">2.</span>Generate API keys on the API Keys page</li>
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">3.</span>Each API request deducts a small credit from your balance</li>
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">4.</span>When balance hits $0, API keys pause automatically</li>
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">5.</span>Top up again — keys resume instantly</li>
                  <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">6.</span>Surplus balance can be withdrawn (min $5, processed in 1 business day)</li>
                </ol>
              </div>

              {/* API pricing */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">API Credit Pricing</div>
                <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  {[
                    { op: 'Read operations',         eg: 'GET /invoices, /customers',     price: '$0.001' },
                    { op: 'Write operations',        eg: 'Create invoice, add reminder',   price: '$0.005' },
                    { op: 'Webhook delivery',        eg: 'Outbound event per endpoint',    price: '$0.002' },
                    { op: 'Bulk operations',         eg: 'Export, bulk send reminders',    price: '$0.010' },
                    { op: 'Payment link generation', eg: 'Stripe / Paynow link',           price: '$0.010' },
                  ].map(r => (
                    <div key={r.op} className="flex items-start justify-between py-2 gap-2">
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">{r.op}</div>
                        <div className="text-neutral-400 text-[10px]">{r.eg}</div>
                      </div>
                      <div className="font-mono font-semibold text-neutral-900 dark:text-white flex-shrink-0">{r.price}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  Minimum balance to activate API keys: <strong className="text-neutral-900 dark:text-white">$1.00</strong>
                </p>
              </div>

              {/* Transaction history */}
              <div className="xl:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-between items-center">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-white">Transaction History</span>
                  <span className="text-[10px] text-neutral-500">{transactions.length} entries</span>
                </div>
                {transactions.length > 0 ? (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {transactions.map(tx => {
                      const { color, sign } = txTypeStyle(tx.type)
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-neutral-900 dark:text-white">{tx.description || tx.type}</div>
                            <div className="text-[10px] text-neutral-400">{new Date(tx.created_at).toLocaleString()}</div>
                            {tx.reference && <div className="text-[10px] text-neutral-400 font-mono">{tx.reference}</div>}
                          </div>
                          <div className={`text-sm font-bold ${color}`}>
                            {sign}{fmt(Math.abs(tx.amount))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2">
                        <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">No transactions yet</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Top up your wallet to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TOP UP ────────────────────────────────────────────────── */}
          {activeSection === 'topup' && (
            <div className="max-w-lg space-y-4">
              {/* Quick amounts */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Select amount</div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {TOPUP_AMOUNTS.map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTopupAmount(String(amt))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors
                        ${topupAmount === String(amt)
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Custom amount (USD)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="0.01"
                    placeholder="Enter amount"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Gateway tabs */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Payment method</div>
                <div className="flex gap-2 mb-4">
                  {[
                    { id: 'stripe', label: 'Stripe', sub: 'Card / Bank (International)' },
                    { id: 'paynow', label: 'Paynow', sub: 'EcoCash / ZWL (Zimbabwe)' },
                  ].map(gw => (
                    <button
                      key={gw.id}
                      onClick={() => setTopupTab(gw.id)}
                      className={`flex-1 text-left px-3 py-2.5 rounded-lg border text-xs transition-colors
                        ${topupTab === gw.id
                          ? 'bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-950'
                          : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400'}`}
                    >
                      <div className="font-semibold">{gw.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{gw.sub}</div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleTopUp(topupTab)}
                  disabled={!topupAmount || parseFloat(topupAmount) < 1}
                  className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Top Up {topupAmount ? fmt(topupAmount) : ''} via {topupTab === 'stripe' ? 'Stripe' : 'Paynow'}
                </button>
                <p className="text-[10px] text-neutral-400 mt-2 text-center">Funds are credited instantly after payment confirmation</p>
              </div>
            </div>
          )}

          {/* ── WITHDRAW ──────────────────────────────────────────────── */}
          {activeSection === 'withdraw' && (
            <div className="max-w-lg">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
                <div>
                  <div className="font-semibold text-sm mb-0.5 text-neutral-900 dark:text-white">Request Withdrawal</div>
                  <div className="text-xs text-neutral-500">Minimum $5 · Processed within 1 business day</div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    min="5"
                    step="0.01"
                    max={wallet?.balance || 0}
                    placeholder={`Max ${fmt(wallet?.balance)}`}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Bank / payment details</label>
                  <input
                    placeholder="Account number, bank name, or EcoCash number"
                    value={withdrawNote}
                    onChange={e => setWithdrawNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                  />
                </div>

                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) < 5 || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
                  className="w-full py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Withdrawal Request
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
