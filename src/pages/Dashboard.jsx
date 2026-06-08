import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Input from '../components/Input'
import Select from '../components/Select'
import NewInvoiceModal from '../components/NewInvoiceModal'
import { formatDate } from '../utils/dateFormat'

export default function Dashboard() {
  const { user, userRole, invoices, reminders, addInvoice, addReminder, loadInvoices, loadReminders, loading } = useStore()

  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentDate, setCurrentDate] = useState('')

  // ALL hooks before any conditional return
  useEffect(() => {
    setCurrentDate(formatDate(new Date()))
    if (user?.id) {
      loadInvoices(user.id)
      loadReminders(user.id)
    }
  }, [user?.id])

  // Staff accounts go to their portal — conditional return after all hooks
  if (userRole === 'super_admin' || userRole === 'admin') return <Navigate to="/app/admin" replace />

  const fmt = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n)
  const fmtDate = (d) => formatDate(d)

  const paid = invoices.filter(i => i.status === 'paid')
  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i => i.status === 'overdue')
  const draft = invoices.filter(i => i.status === 'draft')

  const paidRev = paid.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const pendRev = pending.reduce((s, i) => s + parseFloat(i.amount || 0), 0)
  const ovRev = overdue.reduce((s, i) => s + parseFloat(i.amount || 0), 0)

  const handleCreateInvoice = async (invoiceData) => {
    const newInvoice = {
      user_id: user.id,
      invoice_number: invoiceData.num,
      customer_name: invoiceData.cust,
      customer_email: invoiceData.email,
      amount: invoiceData.amt,
      currency: 'USD',
      due_date: invoiceData.due,
      status: invoiceData.status,
      description: invoiceData.desc,
      notes: invoiceData.notes,
    }
    
    const { data: invoice, error } = await addInvoice(newInvoice)
    
    if (error) {
      console.error('Invoice creation error:', error)
      setToast({ message: 'Failed to create invoice. Please try again.', type: 'error' })
      return
    }

    const reminderTypes = [
      { type: 'before_due', days: -3 },
      { type: 'due', days: 0 },
      { type: 'overdue_7', days: 7 },
      { type: 'overdue_14', days: 14 },
    ]

    for (const { type, days } of reminderTypes) {
      const date = new Date(new Date(invoiceData.due).getTime() + days * 86400000)
      await addReminder({
        user_id: user.id,
        invoice_id: invoice.id,
        type,
        scheduled_at: date.toISOString(),
        status: 'pending',
      })
    }

    setShowModal(false)
    setToast({ message: 'Invoice created — 4 reminders scheduled', type: 'success' })
  }

  const markPaid = async (id) => {
    const { updateInvoice } = useStore.getState()
    const { error } = await updateInvoice(id, { status: 'paid' })
    if (!error) {
      setToast({ message: 'Invoice marked as paid', type: 'success' })
    }
  }

  const deleteInvoice = async (id) => {
    if (confirm('Delete this invoice? This cannot be undone.')) {
      const { deleteInvoice: delInv } = useStore.getState()
      const { error } = await delInv(id)
      if (!error) {
        setToast({ message: 'Invoice deleted', type: 'success' })
      }
    }
  }

  return (
    <div className="animate-fade-in">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Overview</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Invoice
        </button>
      </div>

      {/* Stats - large clean numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Total Revenue</div>
          <div className="font-semibold text-2xl text-neutral-900 dark:text-white">{fmt(paidRev)}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{paid.length} paid invoices</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Pending</div>
          <div className="font-semibold text-2xl text-neutral-900 dark:text-white">{fmt(pendRev)}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{pending.length} pending</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Overdue</div>
          <div className="font-semibold text-2xl text-neutral-900 dark:text-white">{fmt(ovRev)}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">{overdue.length} overdue</div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
          <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Drafts</div>
          <div className="font-semibold text-2xl text-neutral-900 dark:text-white">{draft.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">unsent</div>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 mb-6">
        <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Revenue Trend</div>
        <div className="h-32 flex items-end gap-1">
          {[35, 42, 30, 65, 48, 55, 72, 45, 60, 85, 50, 38].map((h, i) => (
            <div key={i} className="flex-1 bg-neutral-200 dark:bg-neutral-800 rounded-t-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-neutral-400">
          <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
          <span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span>
          <span>Nov</span><span>Dec</span>
        </div>
      </div>

      {/* Two columns: Invoices + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-semibold text-xs text-neutral-900 dark:text-white">Recent Invoices</span>
            <Link to="/app/invoices" className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">View all</Link>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-5 py-2.5 text-[11px] font-medium text-neutral-900 dark:text-white">{inv.invoice_number}</td>
                  <td className="px-5 py-2.5 text-[11px]">
                    <span className="text-neutral-700 dark:text-neutral-300">{inv.customer_name}</span>
                  </td>
                  <td className="px-5 py-2.5 text-[11px] font-medium text-neutral-900 dark:text-white">{fmt(inv.amount)}</td>
                  <td className="px-5 py-2.5"><Badge status={inv.status} /></td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markPaid(inv.id) }}
                        className="px-2 py-0.5 rounded text-[9px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      >
                        Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-[11px] text-neutral-500">No invoices yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Reminders */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800">
            <span className="font-semibold text-xs text-neutral-900 dark:text-white">Reminders</span>
            <Link to="/app/reminders" className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">View all</Link>
          </div>
          {reminders.length > 0 ? (
            reminders.slice(0, 5).map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-neutral-400 dark:bg-neutral-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-neutral-900 dark:text-white">{reminder.type}</div>
                  <div className="text-[9px] text-neutral-500 dark:text-neutral-500">
                    {reminder.invoices?.invoice_number || 'N/A'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-[11px] text-neutral-500">No reminders</p>
            </div>
          )}
        </div>
      </div>

      <NewInvoiceModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateInvoice} />
    </div>
  )
}
