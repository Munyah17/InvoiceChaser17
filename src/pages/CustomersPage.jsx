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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Customers</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{customerList.length} total</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
          + Add Customer
        </button>
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-[300px] mb-4">
        <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-neutral-400 fill-none stroke-2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="w-full pl-9 pr-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500 placeholder:text-neutral-400"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Name</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Email</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Invoices</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Total</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {customerList.length > 0 ? (
              customerList.map((customer) => (
                <tr key={customer.email} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                        {customer.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-neutral-900 dark:text-white">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{customer.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {customer.count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neutral-900 dark:text-white">{fmt(customer.total)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeleteCustomer(customer.id || customer.email)} className="inline-flex items-center p-1 rounded text-neutral-400 hover:text-red-500 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <p className="text-xs text-neutral-500">No customers yet</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-sm text-neutral-900 dark:text-white">Add Customer</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-5 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Name *</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Smith" required />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Email *</label>
                <input type="email" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@company.com" required />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Company</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Phone</label>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+263 77 000 0000" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
