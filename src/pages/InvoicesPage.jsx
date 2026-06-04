import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Input from '../components/Input'
import Select from '../components/Select'
import NewInvoiceModal from '../components/NewInvoiceModal'
import { generateInvoicePDF, generateReminderEmail } from '../utils/invoiceGenerator'
import { formatDate } from '../utils/dateFormat'

export default function InvoicesPage() {
  const { user, invoices, setInvoices, addInvoice, addReminder, loadInvoices, canGenerateInvoice, incrementInvoiceGeneration, userPlan } = useStore()
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
  const fmtDate = (d) => formatDate(d)

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      i.customer_email?.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || i.status === filter
    return matchesSearch && matchesFilter
  })

  const handleCreateInvoice = async (invoiceData) => {
    if (!canGenerateInvoice()) {
      setToast({ message: 'Free plan: 1 invoice per week. Upgrade to create more.', type: 'error' })
      return
    }
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
      payment_link: `${window.location.origin}/pay/${invoiceData.num}?source=chaser_link`,
      payment_link_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }
    
    const { data: invoice, error } = await addInvoice(newInvoice)
    
    if (error) {
      console.error('Invoice creation error:', error)
      setToast({ message: error.message || 'Failed to create invoice', type: 'error' })
      return
    }

    incrementInvoiceGeneration()

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

  const handleDownloadPDF = (invoice) => {
    const customer = {
      name: invoice.customer_name,
      email: invoice.customer_email,
    }
    const company = {
      company_name: user?.user_metadata?.company_name || 'Your Company',
      email: user?.email,
    }
    generateInvoicePDF(invoice, customer, company)
    setToast({ message: 'PDF downloaded', type: 'success' })
  }

  const handleSendReminder = async (invoice) => {
    try {
      const customer = {
        name: invoice.customer_name,
        email: invoice.customer_email,
      }
      const company = {
        company_name: user?.user_metadata?.company_name || 'Your Company',
        email: user?.email,
      }
      
      // Generate or update payment link
      let paymentLink = invoice.payment_link
      if (!paymentLink) {
        paymentLink = `${window.location.origin}/pay/${invoice.invoice_number}?source=chaser_link`
        await supabase
          .from('invoices')
          .update({
            payment_link: paymentLink,
            payment_link_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          })
          .eq('id', invoice.id)
      }
      
      const emailTemplate = generateReminderEmail(invoice, customer, company, paymentLink)
      
      // Call Supabase Edge Function to send email
      const { data, error } = await supabase.functions.invoke('send_reminder_email', {
        body: {
          to: customer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          invoice_id: invoice.id,
          user_id: user.id,
          payment_link: paymentLink,
        }
      })

      if (error) throw error

      setToast({ message: 'Reminder sent successfully', type: 'success' })
    } catch (error) {
      console.error('Error sending reminder:', error)
      setToast({ message: 'Failed to send reminder', type: 'error' })
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

    if (!canGenerateInvoice()) {
      setToast({ message: 'Free plan: 1 invoice per week. Upgrade to import more.', type: 'error' })
      return
    }

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

      if (imported > 0) incrementInvoiceGeneration()
      setToast({ message: `${imported} invoice${imported !== 1 ? 's' : ''} imported`, type: 'success' })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Invoices</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{invoices.length} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            CSV Template
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
          </label>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
            + New Invoice
          </button>
        </div>
      </div>

      {/* Plan restriction notice */}
      {userPlan === 'free' && (
        <div className="mb-4 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span>Free plan: 1 invoice per week.</span>
            <a href="/app/plans" className="font-semibold underline text-neutral-900 dark:text-white">Upgrade</a>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-neutral-400 fill-none stroke-2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full pl-9 pr-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500 placeholder:text-neutral-400"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none cursor-pointer transition-all focus:border-neutral-400 dark:focus:border-neutral-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg mb-3">
          <span className="text-xs font-medium text-neutral-900 dark:text-white">{selected.size} selected</span>
          <button onClick={bulkDelete} className="ml-auto px-2 py-1 rounded text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">Delete</button>
          <button onClick={() => setSelected(new Set())} className="px-2 py-1 rounded text-[10px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">Deselect</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className="w-8 px-4 py-2.5 text-left border-b border-neutral-200 dark:border-neutral-800">
                <input type="checkbox" checked={selected.size === filteredInvoices.length && filteredInvoices.length > 0} onChange={toggleAll} />
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Invoice</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Customer</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Amount</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Due</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Status</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)} />
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neutral-900 dark:text-white">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium text-neutral-900 dark:text-white">{inv.customer_name}</div>
                    <div className="text-[10px] text-neutral-500">{inv.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neutral-900 dark:text-white">{fmt(inv.amount)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{fmtDate(inv.due_date)}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => handleDownloadPDF(inv)} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors mr-1">PDF</button>
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => handleSendReminder(inv)} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors mr-1">Remind</button>
                    )}
                    {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                      <button onClick={() => markPaid(inv.id)} className="inline-flex items-center px-2 py-1 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors mr-1">Paid</button>
                    )}
                    <button onClick={() => deleteInvoice(inv.id)} className="inline-flex items-center p-1 rounded text-neutral-400 hover:text-red-500 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-xs text-neutral-500">No invoices found</p>
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
