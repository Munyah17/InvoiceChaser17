import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import Input from '../components/Input'

export default function CustomersPage() {
  const { user, invoices, customers, addCustomer, deleteCustomer, loadCustomers } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '' })

  useEffect(() => {
    if (user) {
      loadCustomers(user.id)
    }
  }, [user])

  // Merge customers with invoice data
  const mergedCustomers = {}
  invoices.forEach(inv => {
    if (!mergedCustomers[inv.customer_email]) {
      mergedCustomers[inv.customer_email] = { name: inv.customer_name, email: inv.customer_email, company: inv.customer_name, count: 0, total: 0 }
    }
    mergedCustomers[inv.customer_email].count++
    mergedCustomers[inv.customer_email].total += parseFloat(inv.amount || 0)
  })

  customers.forEach(c => {
    if (!mergedCustomers[c.email]) {
      mergedCustomers[c.email] = { name: c.name, email: c.email, company: c.company || c.name, count: 0, total: 0 }
    } else {
      mergedCustomers[c.email].company = c.company || mergedCustomers[c.email].company
    }
  })

  const customerList = Object.values(mergedCustomers).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  )

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const colors = [
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#ede9fe', text: '#5b21b6' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#fef3c7', text: '#92400e' },
  ]

  const handleAddCustomer = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      alert('Name and email are required')
      return
    }

    const { error } = await addCustomer({
      user_id: user.id,
      name: formData.name,
      email: formData.email,
      company: formData.company,
      phone: formData.phone,
    })

    if (error) {
      setToast({ message: 'Failed to add customer', type: 'error' })
      return
    }

    setFormData({ name: '', email: '', company: '', phone: '' })
    setShowModal(false)
    setToast({ message: 'Customer added', type: 'success' })
  }

  const handleDeleteCustomer = async (customerId) => {
    if (confirm('Remove customer record?')) {
      const { error } = await deleteCustomer(customerId)
      if (!error) {
        setToast({ message: 'Customer removed', type: 'success' })
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

      <div className="flex items-start justify-between mb-7 gap-4">
        <div>
          <h1 className="font-display font-bold text-[22px] text-slate-900">Customers</h1>
          <p className="text-[12.5px] text-slate-500 mt-0.5">{customerList.length} customers</p>
        </div>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[320px] mb-4">
        <svg viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-slate-400 fill-none stroke-2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm outline-none font-sans transition-border duration-150 focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(34,197,94,0.12)]"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-[10px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Name</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Email</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Company</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Invoices</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50">Total Billed</th>
              <th className="px-4.5 py-2.75 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] border-b border-slate-200 bg-slate-50"></th>
            </tr>
          </thead>
          <tbody>
            {customerList.length > 0 ? (
              customerList.map((customer, index) => {
                const color = colors[index % colors.length]
                return (
                  <tr key={customer.email} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4.5 py-3.25 text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: color.bg, color: color.text }}>
                          {customer.name[0].toUpperCase()}
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4.5 py-3.25 text-[13px] text-slate-500">{customer.email}</td>
                    <td className="px-4.5 py-3.25 text-[13px] text-slate-500">{customer.company}</td>
                    <td className="px-4.5 py-3.25">
                      <span className="inline-flex items-center px-2.5 py-[3px] rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {customer.count} invoice{customer.count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4.5 py-3.25 text-[13px] font-semibold">{fmt(customer.total)}</td>
                    <td className="px-4.5 py-3.25">
                      <button
                        onClick={() => handleDeleteCustomer(customer.id || customer.email)}
                        className="inline-flex items-center px-1.5 py-1 rounded-md text-[12px] font-medium cursor-pointer border-none transition-all text-slate-400 hover:bg-red-100 hover:text-red-600"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="6">
                  <div className="flex flex-col items-center justify-center py-13 text-center">
                    <div className="w-11 h-11 rounded-[11px] bg-slate-100 flex items-center justify-center mb-3">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 fill-none stroke-1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="font-medium">No customers yet</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Customer">
        <form onSubmit={handleAddCustomer}>
          <Input
            label="Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jane Smith"
            required
          />
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jane@company.com"
            required
          />
          <Input
            label="Company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Acme Corp"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+263 77 000 0000"
          />
          <div className="flex gap-2.5 justify-end mt-2.5">
            <Button type="button" variant="default" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
