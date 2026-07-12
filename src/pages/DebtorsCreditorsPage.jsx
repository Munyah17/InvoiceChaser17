import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { calculateAgingReport } from '../utils/financialReports'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/dateFormat'

// Debtors (Accounts Receivable) & Creditors (Accounts Payable) ledger.
// Debtors  = unpaid invoices we've issued (money owed TO us), grouped by customer.
// Creditors = unpaid bills we've received (money WE owe), grouped by vendor.
// Reads invoices + bills directly (both RLS-scoped to the signed-in user), so no
// new serverless function is needed.

const BUCKET_LABELS = {
  current: 'Current',
  days30: '1–30 days',
  days60: '31–60 days',
  days90: '61–90 days',
  over90: '90+ days',
}

function agingBucketFor(dueDate) {
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000)
  if (days <= 0) return 'current'
  if (days <= 30) return 'days30'
  if (days <= 60) return 'days60'
  if (days <= 90) return 'days90'
  return 'over90'
}

function groupByParty(rows, nameKey) {
  const map = {}
  for (const r of rows) {
    const key = r[nameKey] || 'Unknown'
    if (!map[key]) map[key] = { name: key, total: 0, count: 0, oldestDays: 0 }
    map[key].total += r.amount
    map[key].count += 1
    const days = Math.floor((new Date() - new Date(r.due_date)) / 86400000)
    if (days > map[key].oldestDays) map[key].oldestDays = days
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
}

export default function DebtorsCreditorsPage() {
  const { user } = useStore()
  const [view, setView] = useState('debtors') // 'debtors' | 'creditors'
  const [invoices, setInvoices] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: inv, error: invErr }, { data: bl, error: blErr }] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, customer_name, amount, currency, due_date, status')
            .eq('user_id', user.id)
            .in('status', ['pending', 'overdue', 'sent', 'unpaid'])
            .order('due_date', { ascending: true }),
          supabase
            .from('bills')
            .select('id, bill_number, vendor_id, amount_due, amount_paid, currency, due_date, status, vendors(name)')
            .eq('user_id', user.id)
            .in('status', ['open', 'overdue', 'draft'])
            .order('due_date', { ascending: true }),
        ])
        if (invErr) throw invErr
        // bills table may be empty/new — don't fail the whole page if it errors
        setInvoices(inv || [])
        setBills(blErr ? [] : (bl || []))
      } catch (err) {
        console.error('Debtors/Creditors load error:', err)
        setError('Could not load ledger data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  // Normalize to a common { party, amount, due_date, ref, currency } shape.
  const debtorRows = useMemo(() => invoices.map(i => ({
    ref: i.invoice_number,
    party: i.customer_name,
    amount: parseFloat(i.amount || 0),
    due_date: i.due_date,
    currency: i.currency || 'USD',
    status: i.status,
  })), [invoices])

  const creditorRows = useMemo(() => bills.map(b => ({
    ref: b.bill_number,
    party: b.vendors?.name || 'Vendor',
    amount: parseFloat(b.amount_due || 0) - parseFloat(b.amount_paid || 0),
    due_date: b.due_date,
    currency: b.currency || 'USD',
    status: b.status,
  })), [bills])

  const rows = view === 'debtors' ? debtorRows : creditorRows
  const aging = useMemo(
    () => calculateAgingReport(rows, view === 'debtors' ? 'receivable' : 'payable'),
    [rows, view]
  )
  const byParty = useMemo(
    () => groupByParty(rows, 'party'),
    [rows]
  )
  const currency = rows[0]?.currency || 'USD'

  const isDebtors = view === 'debtors'

  return (
    <div className="animate-fade-in w-full max-w-6xl">
      <div className="mb-5">
        <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Debtors &amp; Creditors</h1>
        <p className="text-xs text-neutral-500">
          Accounts receivable (money owed to you) and accounts payable (money you owe), with aging.
        </p>
      </div>

      {/* Toggle */}
      <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5 mb-5">
        {[
          { id: 'debtors', label: 'Debtors (AR)' },
          { id: 'creditors', label: 'Creditors (AP)' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === t.id
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950'
                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
                {isDebtors ? 'Total Receivable' : 'Total Payable'}
              </div>
              <div className="text-xl font-semibold text-neutral-900 dark:text-white">
                {formatCurrency(aging.totalOutstanding, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Overdue</div>
              <div className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(aging.overdueAmount, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">90+ days</div>
              <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(aging.buckets.over90.amount, currency)}
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
                {isDebtors ? 'Debtors' : 'Creditors'}
              </div>
              <div className="text-xl font-semibold text-neutral-900 dark:text-white">{byParty.length}</div>
            </div>
          </div>

          {/* Aging buckets */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-sm text-neutral-900 dark:text-white">
              Aging summary
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100 dark:divide-neutral-800">
              {Object.entries(BUCKET_LABELS).map(([key, label]) => (
                <div key={key} className="p-4">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">{label}</div>
                  <div className="text-base font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(aging.buckets[key].amount, currency)}
                  </div>
                  <div className="text-[10px] text-neutral-400">{aging.buckets[key].count} item{aging.buckets[key].count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* By party */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 font-semibold text-sm text-neutral-900 dark:text-white">
              {isDebtors ? 'By customer' : 'By vendor'}
            </div>
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-xs min-w-[420px]">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-left">
                    <th className="px-4 py-2 font-semibold text-neutral-500 uppercase">{isDebtors ? 'Customer' : 'Vendor'}</th>
                    <th className="px-4 py-2 font-semibold text-neutral-500 uppercase text-right">Outstanding</th>
                    <th className="px-4 py-2 font-semibold text-neutral-500 uppercase text-right">Items</th>
                    <th className="px-4 py-2 font-semibold text-neutral-500 uppercase text-right">Oldest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {byParty.map((p) => (
                    <tr key={p.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-2 text-right text-neutral-900 dark:text-white">{formatCurrency(p.total, currency)}</td>
                      <td className="px-4 py-2 text-right text-neutral-500">{p.count}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={p.oldestDays > 60 ? 'text-red-500' : p.oldestDays > 0 ? 'text-amber-500' : 'text-neutral-400'}>
                          {p.oldestDays > 0 ? `${p.oldestDays}d overdue` : 'current'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {byParty.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-neutral-400">
                        {isDebtors
                          ? 'No outstanding customer invoices. 🎉'
                          : 'No outstanding vendor bills. Add bills under Bills to track what you owe.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 mt-3">
            Line-item detail: {rows.length} open {isDebtors ? 'invoice' : 'bill'}{rows.length !== 1 ? 's' : ''}
            {rows.length > 0 && `, oldest due ${formatDate(rows[0].due_date)}`}.
          </p>
        </>
      )}
    </div>
  )
}
