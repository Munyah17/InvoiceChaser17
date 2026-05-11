import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Input from '../components/Input'
import Select from '../components/Select'
import NewInvoiceModal from '../components/NewInvoiceModal'

export default function Dashboard() {
  const { user, invoices, reminders, addInvoice, addReminder, loadInvoices, loadReminders, loading } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    const d = new Date()
    setCurrentDate(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))
    
    if (user) {
      loadInvoices(user.id)
      loadReminders(user.id)
    }
  }, [user])

  const fmt = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n)
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

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
      setToast({ message: 'Failed to create invoice', type: 'error' })
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

      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">{currentDate}</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)} className="shadow-glow">
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</div>
            <div className="w-8 h-8 bg-brand-light rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-3xl text-slate-900">{fmt(paidRev)}</div>
          <div className="text-sm text-slate-400 mt-1">{paid.length} paid invoices</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</div>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-amber-600 fill-none stroke-2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-3xl text-slate-900">{fmt(pendRev)}</div>
          <div className="text-sm text-slate-400 mt-1">{pending.length} pending</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</div>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-red-600 fill-none stroke-2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-3xl text-red-600">{fmt(ovRev)}</div>
          <div className="text-sm text-slate-400 mt-1">{overdue.length} overdue</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft hover:shadow-glow transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts</div>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-slate-600 fill-none stroke-2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              </svg>
            </div>
          </div>
          <div className="font-display font-bold text-3xl text-slate-900">{draft.length}</div>
          <div className="text-sm text-slate-400 mt-1">invoices</div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8 shadow-soft">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <span className="font-display font-semibold text-lg text-slate-900">Recent Invoices</span>
          <Link to="/app/invoices" className="text-sm text-brand font-medium hover:underline">View all</Link>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Invoice</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Customer</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Amount</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Due Date</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 5).map((inv) => (
              <tr key={inv.id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-brand">{inv.invoice_number}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium">{inv.customer_name}</div>
                  <div className="text-xs text-slate-500">{inv.customer_email}</div>
                </td>
                <td className="px-6 py-4 text-sm font-semibold">{fmt(inv.amount)}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{fmtDate(inv.due_date)}</td>
                <td className="px-6 py-4"><Badge status={inv.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); markPaid(inv.id) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none transition-all bg-brand-light text-brand hover:bg-brand/30"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan="6">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-slate-400 fill-none stroke-1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      </svg>
                    </div>
                    <p className="font-medium text-slate-900">No invoices yet</p>
                    <p className="text-sm text-slate-400 mt-1">Create your first invoice to get started</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Reminders */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-soft">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <span className="font-display font-semibold text-lg text-slate-900">Upcoming Reminders</span>
          <Link to="/app/reminders" className="text-sm text-brand font-medium hover:underline">View all</Link>
        </div>
        {reminders.length > 0 ? (
          reminders.slice(0, 5).map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{reminder.type}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {reminder.invoices?.invoice_number || 'N/A'} · {reminder.invoices?.customers?.name || 'N/A'}
                </div>
              </div>
              <span className="text-xs text-slate-500">{fmtDate(reminder.scheduled_at)}</span>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-slate-400 fill-none stroke-1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              </svg>
            </div>
            <p className="font-medium text-slate-900">No reminders yet</p>
            <p className="text-sm text-slate-400 mt-1">Reminders will appear here</p>
          </div>
        )}
      </div>

      <NewInvoiceModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateInvoice} />
    </div>
  )
}
