import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { formatDate } from '../utils/dateFormat'

const CLIENT_TOOLS = [
  {
    path: '/app/invoices',
    label: 'Invoice Chaser',
    description: 'Chase overdue invoices with automated follow-ups',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    path: '/app/invoice-maker',
    label: 'Invoice Maker',
    description: 'Create and send professional invoices instantly',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
        <path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
      </svg>
    ),
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    path: '/app/customers',
    label: 'Customers',
    description: 'Manage your client database and contacts',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    path: '/app/quotation',
    label: 'Quotation',
    description: 'Build and send professional price quotations',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
      </svg>
    ),
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    path: '/app/proforma',
    label: 'Proforma Invoice',
    description: 'Generate proforma invoices for advance payments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      </svg>
    ),
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    path: '/app/reminders',
    label: 'Reminders',
    description: 'Automated payment reminder sequences',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    path: '/app/debit-note',
    label: 'Debit Note',
    description: 'Issue debit notes for outstanding balances',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    path: '/app/credit-note',
    label: 'Credit Note',
    description: 'Issue credit notes for refunds or adjustments',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    path: '/app/boq',
    label: 'BOQ',
    description: 'Bill of Quantities for construction & projects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="12" y2="14"/>
      </svg>
    ),
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    path: '/app/bom',
    label: 'BOM',
    description: 'Bill of Materials for manufacturing & production',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    path: '/app/wallet',
    label: 'Wallet',
    description: 'Manage balance, top-up and withdrawals',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/>
        <path d="M12 22V7"/>
      </svg>
    ),
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
  },
  {
    path: '/app/api-keys',
    label: 'API Keys',
    description: 'Generate and manage integration API keys',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
      </svg>
    ),
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
  },
]

export default function ClientAccessPage() {
  const navigate = useNavigate()
  const { user, userRole } = useStore()
  const [stats, setStats] = useState({ invoices: 0, customers: 0, reminders: 0, walletBalance: 0 })
  const [recentDocs, setRecentDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return
      try {
        const [
          { count: invoiceCount },
          { count: customerCount },
          { count: reminderCount },
          { data: walletData },
          { data: recentInvoices },
        ] = await Promise.all([
          supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('reminders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('wallets').select('balance').eq('user_id', user.id).single(),
          supabase.from('invoices').select('id, invoice_number, customer_name, amount, status, created_at')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ])
        setStats({
          invoices: invoiceCount || 0,
          customers: customerCount || 0,
          reminders: reminderCount || 0,
          walletBalance: walletData?.balance || 0,
        })
        setRecentDocs(recentInvoices || [])
      } catch {
        // Silently fail — stats are informational only
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [user?.id])

  const roleLabel = userRole === 'super_admin' ? 'Super Admin' : 'Admin'

  return (
    <div className="animate-fade-in w-full max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Back button */}
            <button
              onClick={() => navigate('/app/admin')}
              className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors text-xs mr-1"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Admin
            </button>
            <span className="text-neutral-700 dark:text-neutral-600">/</span>

            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 11l-4 4-2-2"/>
              </svg>
            </div>
            <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Client Access</h1>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              {roleLabel} Mode
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Full client toolset with unlimited access — invoicing, documents, reminders, wallet and more
          </p>
        </div>

        {/* Mode badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg self-start flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">Unlimited Access</span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'My Invoices',   value: loading ? '…' : stats.invoices,   icon: '📄', color: 'text-blue-500' },
          { label: 'My Customers',  value: loading ? '…' : stats.customers,  icon: '👥', color: 'text-emerald-500' },
          { label: 'My Reminders',  value: loading ? '…' : stats.reminders,  icon: '🔔', color: 'text-orange-500' },
          {
            label: 'Wallet Balance',
            value: loading ? '…' : `$${Number(stats.walletBalance).toFixed(2)}`,
            icon: '💳',
            color: 'text-teal-500',
          },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className={`font-bold text-xl ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Client tools grid */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">All Client Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CLIENT_TOOLS.map(tool => (
            <Link
              key={tool.path}
              to={tool.path}
              className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm transition-all duration-150"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${tool.bg} flex items-center justify-center flex-shrink-0 ${tool.color}`}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-neutral-900 dark:text-white group-hover:text-neutral-950 dark:group-hover:text-white">
                      {tool.label}
                    </span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 flex-shrink-0 -translate-x-1 group-hover:translate-x-0 transition-transform duration-150">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{tool.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent invoices */}
      {(recentDocs.length > 0 || !loading) && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-semibold text-sm text-neutral-900 dark:text-white">Recent Invoices</span>
            <Link to="/app/invoices" className="text-xs text-neutral-500 hover:underline">View all →</Link>
          </div>
          {recentDocs.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-neutral-400">
              No invoices yet — <Link to="/app/invoice-maker" className="text-blue-500 hover:underline">create your first</Link>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {recentDocs.map(inv => (
                    <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-4 py-2 font-mono text-neutral-500">{inv.invoice_number || '—'}</td>
                      <td className="px-4 py-2 text-neutral-900 dark:text-white">{inv.customer_name || '—'}</td>
                      <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">
                        ${Number(inv.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          inv.status === 'paid'     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          inv.status === 'overdue'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          inv.status === 'pending'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}>{inv.status || 'draft'}</span>
                      </td>
                      <td className="px-4 py-2 text-neutral-500">{formatDate(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
