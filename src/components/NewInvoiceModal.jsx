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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Invoice">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3.5">
          <Input
            label="Invoice #"
            value={formData.num}
            onChange={(e) => setFormData({ ...formData, num: e.target.value })}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
        <Input
          label="Customer Name *"
          value={formData.cust}
          onChange={(e) => setFormData({ ...formData, cust: e.target.value })}
          placeholder="Acme Corp"
          required
        />
        <Input
          label="Customer Email *"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="billing@acme.com"
          required
        />
        <div className="grid grid-cols-2 gap-3.5">
          <Input
            label="Amount (USD) *"
            type="number"
            value={formData.amt}
            onChange={(e) => setFormData({ ...formData, amt: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
          <Input
            label="Due Date *"
            type="date"
            value={formData.due}
            onChange={(e) => setFormData({ ...formData, due: e.target.value })}
            required
          />
        </div>
        <Input
          label="Description"
          value={formData.desc}
          onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
          placeholder="What is this invoice for?"
        />
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em] mb-1.5">Notes</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm outline-none font-sans transition-border duration-150 focus:border-green-500 focus:shadow-[0_0_0_2px_rgba(34,197,94,0.12)] h-[70px] resize-none"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Payment terms, bank details…"
          />
        </div>
        <div className="flex gap-2.5 justify-end mt-2.5">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            <svg viewBox="0 0 24 24" className="w-3.25 h-3.25 stroke-current fill-none stroke-2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v14a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
            </svg>
            Create Invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}
