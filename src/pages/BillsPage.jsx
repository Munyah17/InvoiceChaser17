import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import { formatDate } from '../utils/dateFormat'

export default function BillsPage() {
  const { user } = useStore()
  const [bills, setBills] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_number: '',
    amount_due: '',
    due_date: '',
    description: '',
  })

  useEffect(() => {
    if (user) {
      loadBills()
      loadVendors()
    }
  }, [user?.id])

  const loadBills = async () => {
    try {
      const res = await fetch('/api/bills', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      const { bills: data } = await res.json()
      setBills(data || [])
    } catch (err) {
      console.error('Load bills error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVendors = async () => {
    try {
      const res = await fetch('/api/vendors', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      const { vendors: data } = await res.json()
      setVendors(data || [])
    } catch (err) {
      console.error('Load vendors error:', err)
    }
  }

  const handleAddBill = async (e) => {
    e.preventDefault()
    if (!formData.vendor_id || !formData.bill_number || !formData.amount_due) {
      alert('Vendor, bill number, and amount are required')
      return
    }

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const { error } = await res.json()
        alert(`Error: ${error}`)
        return
      }

      const { bill } = await res.json()
      setBills([bill, ...bills])
      setFormData({
        vendor_id: '',
        bill_number: '',
        amount_due: '',
        due_date: '',
        description: '',
      })
      setShowForm(false)
    } catch (err) {
      console.error('Add bill error:', err)
      alert('Failed to create bill')
    }
  }

  const statusColors = {
    draft: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Bills to Pay</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Bill'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Record Bill</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Vendor *</label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Bill Number *</label>
              <input
                type="text"
                value={formData.bill_number}
                onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                placeholder="e.g., BILL-2026-001"
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Amount Due *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount_due}
                onChange={(e) => setFormData({ ...formData, amount_due: e.target.value })}
                placeholder="0.00"
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>
          </div>

          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description or notes"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none resize-none"
          />

          <div className="flex gap-3">
            <Button onClick={handleAddBill} className="flex-1">
              Save Bill
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Loading bills...</div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Bill #</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Vendor</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Due Date</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">Amount Due</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">Paid</th>
                  <th className="px-4 py-2 text-center font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-2 font-mono text-neutral-900 dark:text-white">{bill.bill_number}</td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{bill.vendor?.name || '—'}</td>
                    <td className="px-4 py-2">{bill.due_date ? formatDate(bill.due_date) : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-neutral-900 dark:text-white">
                      ${parseFloat(bill.amount_due).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-neutral-600 dark:text-neutral-400">
                      ${parseFloat(bill.amount_paid || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[bill.status] || statusColors.open}`}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bills.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>No bills recorded yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
