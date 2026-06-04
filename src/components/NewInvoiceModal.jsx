import { useState, useEffect } from 'react'
import Modal from './Modal'
import Input from './Input'
import Select from './Select'
import Button from './Button'

export default function NewInvoiceModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    num: '',
    cust: '',
    email: '',
    amt: '',
    due: '',
    status: 'pending',
    desc: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear()
      const randomNum = Math.floor(1000 + Math.random() * 9000)
      setFormData({
        num: `INV-${year}-${randomNum}`,
        cust: '',
        email: '',
        amt: '',
        due: '',
        status: 'pending',
        desc: '',
        notes: '',
      })
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.cust || !formData.email || !formData.amt || !formData.due) {
      alert('Please fill in all required fields')
      return
    }

    onSubmit({
      ...formData,
      amt: parseFloat(formData.amt),
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="font-semibold text-sm text-neutral-900 dark:text-white">New Invoice</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Invoice #</label>
              <input
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                value={formData.num}
                onChange={(e) => setFormData({ ...formData, num: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Customer Name *</label>
            <input
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors placeholder:text-neutral-400"
              value={formData.cust}
              onChange={(e) => setFormData({ ...formData, cust: e.target.value })}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Customer Email *</label>
            <input
              type="email"
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors placeholder:text-neutral-400"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="billing@acme.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Amount (USD) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors placeholder:text-neutral-400"
                value={formData.amt}
                onChange={(e) => setFormData({ ...formData, amt: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Due Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
                value={formData.due}
                onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Description</label>
            <input
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors placeholder:text-neutral-400"
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              placeholder="What is this invoice for?"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors h-20 resize-none placeholder:text-neutral-400"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment terms, bank details..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity">
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
