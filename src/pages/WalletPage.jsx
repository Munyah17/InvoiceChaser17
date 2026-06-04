import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'

export default function WalletPage() {
  const { user } = useStore()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawNote, setWithdrawNote] = useState('')
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!user) return
    loadWallet()
  }, [user])

  const loadWallet = async () => {
    setLoading(true)

    // Get or create wallet
    let { data: w, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!w) {
      const { data: created, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id, balance: 0 })
        .select()
        .single()
      if (createError) console.error('Wallet creation error:', createError)
      w = created
    }
    setWallet(w)

    // Load transactions
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setTransactions(txns || [])
    setLoading(false)
  }

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) return showToast('Enter a valid amount', 'error')
    if (amount > (wallet?.balance || 0)) return showToast('Insufficient balance', 'error')

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
      .update({ balance: (wallet.balance - amount), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    showToast('Withdrawal request submitted — we\'ll process it within 1 business day')
    setWithdrawAmount('')
    setWithdrawNote('')
    loadWallet()
  }

  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`

  const txIcon = (type) => {
    if (type === 'credit') return <span className="text-green-500">+</span>
    if (type === 'debit' || type === 'withdrawal_request') return <span className="text-red-500">−</span>
    return null
  }

  const txColor = (type) => type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="animate-fade-in">
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-xs font-medium z-50 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Wallet</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Credits from debtor payments via InvoiceChaser payment links
        </p>
      </div>

      {loading ? (
        <div className="text-xs text-neutral-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {/* LEFT — balance + withdrawal */}
          <div className="space-y-4">
            {/* Balance card */}
            <div className="bg-neutral-900 dark:bg-white rounded-2xl p-6 text-white dark:text-neutral-950">
              <div className="text-xs font-medium opacity-60 uppercase tracking-wider mb-2">Available Balance</div>
              <div className="text-4xl font-bold mb-1">{fmt(wallet?.balance)}</div>
              <div className="text-xs opacity-50">Credited when debtors pay via your invoice payment links</div>
            </div>

            {/* How it works */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">How it works</div>
              <ol className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">1.</span> Reminder emails include Stripe / Paynow payment links</li>
                <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">2.</span> Debtor pays on the gateway's checkout</li>
                <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">3.</span> Gateway webhook confirms payment to InvoiceChaser</li>
                <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">4.</span> Invoice is marked paid, your wallet is credited</li>
                <li className="flex gap-2"><span className="font-bold text-neutral-900 dark:text-white">5.</span> Request a withdrawal — processed within 1 business day</li>
              </ol>
              <p className="text-[10px] text-neutral-400 mt-3">
                Note: A small platform fee may apply on withdrawals. InvoiceChaser acts as a debt collection facilitator, not a payment processor.
              </p>
            </div>

            {/* Withdrawal request */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <div className="font-semibold text-sm mb-3 text-neutral-900 dark:text-white">Request Withdrawal</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Amount (USD)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={wallet?.balance || 0}
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                    placeholder={`Max ${fmt(wallet?.balance)}`}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Note (optional)</label>
                  <input
                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                    placeholder="Payment reference, bank details, etc."
                    value={withdrawNote}
                    onChange={e => setWithdrawNote(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleWithdrawalRequest}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
                  className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Withdrawal Request
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — transaction history */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex justify-between items-center">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">Transaction History</span>
              <span className="text-[10px] text-neutral-500">{transactions.length} entries</span>
            </div>
            {transactions.length > 0 ? (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-neutral-900 dark:text-white">{tx.description || tx.type}</div>
                      <div className="text-[10px] text-neutral-400">{new Date(tx.created_at).toLocaleString()}</div>
                      {tx.reference && <div className="text-[10px] text-neutral-400 font-mono">{tx.reference}</div>}
                    </div>
                    <div className={`text-sm font-bold ${txColor(tx.type)}`}>
                      {txIcon(tx.type)}{fmt(Math.abs(tx.amount))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2">
                    <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">No transactions yet</p>
                <p className="text-xs text-neutral-500 mt-0.5">Credits appear when debtors pay via your invoice links</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
