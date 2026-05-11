import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Input from '../components/Input'
import Select from '../components/Select'
import NewInvoiceModal from '../components/NewInvoiceModal'

export default function InvoicesPage() {
  const { user, invoices, setInvoices, addInvoice, addReminder, loadInvoices } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (user) {
      loadInvoices(user.id)
    }
  }, [user])

  const fmt = (n, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n)
  const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.customer_email?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || i.status === filter
    return matchesSearch && matchesFilter
  })

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

  const toggleSelect = (id) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const toggleAll = () => {
    if (selected.size === filteredInvoices.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredInvoices.map(i => i.id)))
    }
  }

  const bulkDelete = () => {
    if (confirm(`Delete ${selected.size} invoice(s)?`)) {
      setInvoices(invoices.filter(inv => !selected.has(inv.id)))
      setSelected(new Set())
      setToast({ message: 'Invoices deleted', type: 'success' })
    }
  }

  const downloadTemplate = () => {
    const csv = 'invoice_number,customer_name,customer_email,amount,due_date,description\nINV-001,Acme Corp,billing@acme.com,1500.00,2025-04-01,Web design services\nINV-002,Beta Ltd,finance@beta.io,3200.00,2025-04-15,Software license'
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'invoicechaser_template.csv'
    a.click()
    setToast({ message: 'CSV template downloaded', type: 'success' })
  }

  const importCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      let imported = 0

      lines.slice(1).forEach(line => {
        const vals = line.split(',').map(v => v.trim())
        const row = {}
        headers.forEach((h, i) => row[h] = vals[i] || '')

        if (row.customer_name && row.customer_email && row.amount && row.due_date) {
          addInvoice({
            id: 'i' + Date.now() + Math.random(),
            num: row.invoice_number || 'INV-' + Date.now(),
            cust: row.customer_name,
            email: row.customer_email,
            amt: parseFloat(row.amount) || 0,
            currency: 'USD',
            due: row.due_date,
            status: 'pending',
            desc: row.description || '',
            notes: '',
          })
          imported++
        }
      })

      setToast({ message: `${imported} invoice${imported !== 1 ? 's' : ''} imported`, type: 'success' })
    }
    reader.readAsText(file)
    e.target.value = ''
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

      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] text-slate-900">Invoices</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">{invoices.length} total invoices</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="default" onClick={downloadTemplate}>
            <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV Template
          </Button>
          <label className="inline-flex items-center gap-1.5 font-medium cursor-pointer border transition-all duration-150 font-sans active:scale-[0.98] bg-white border-slate-300 text-slate-900 hover:bg-slate-100 px-3.5 py-2 text-sm">
            <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
            </svg>
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Invoice
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2.5 mb-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <svg viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-slate-400 fill-none stroke-2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm outline-none font-sans transition-border duration-150 focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(34,197,94,0.12)]"
            placeholder="Search by name, number, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm outline-none font-sans cursor-pointer transition-border duration-150 focus:border-green-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg mb-3.5">
          <span className="text-[13px] text-green-600 font-medium">{selected.size} selected</span>
          <Button variant="danger" size="sm" onClick={bulkDelete} className="ml-auto">
            <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
            Delete selected
          </Button>
          <Button variant="default" size="sm" onClick={() => setSelected(new Set())}>Deselect all</Button>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-9 px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.size === filteredInvoices.length && filteredInvoices.length > 0}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Invoice</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Customer</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Amount</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Due Date</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Status</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <td className="px-4.5 py-3.25" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleSelect(inv.id)}
                    />
                  </td>
                  <td className="px-4.5 py-3.25 text-[13px] font-medium text-green-600">{inv.invoice_number}</td>
                  <td className="px-4.5 py-3.25 text-[13px]">
                    <div className="font-medium">{inv.customer_name}</div>
                    <div className="text-[12px] text-slate-500">{inv.customer_email}</div>
                  </td>
                  <td className="px-4.5 py-3.25 text-[13px] font-semibold">{fmt(inv.amount)}</td>
                  <td className="px-4.5 py-3.25 text-[13px] text-slate-500">{fmtDate(inv.due_date)}</td>
                  <td className="px-4.5 py-3.25"><Badge status={inv.status} /></td>
                  <td className="px-4.5 py-3.25 whitespace-nowrap">
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        className="px-2.75 py-1 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all bg-green-100 text-green-700 hover:bg-green-200 mr-1"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => deleteInvoice(inv.id)}
                      className="inline-flex items-center px-1.5 py-1 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all text-slate-400 hover:bg-red-100 hover:text-red-600"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  <div className="flex flex-col items-center justify-center py-13 text-center">
                    <div className="w-11 h-11 rounded-[11px] bg-slate-100 flex items-center justify-center mb-3">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 fill-none stroke-1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      </svg>
                    </div>
                    <p className="font-medium">No invoices found</p>
                    <p className="text-[12px] text-slate-400 mt-1">Try a different filter</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewInvoiceModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateInvoice} />
    </div>
  )
}
