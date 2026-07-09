import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import { formatDate } from '../utils/dateFormat'

export default function RecurringInvoicesPage() {
  const { user } = useStore()
  const [recurring, setRecurring] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customer_id: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    auto_charge: false,
  })

  useEffect(() => {
    if (user) {
      loadRecurring()
      loadCustomers()
    }
  }, [user?.id])

  const loadRecurring = async () => {
    try {
      const res = await fetch('/api/recurring-invoices', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      const { recurringInvoices: data } = await res.json()
      setRecurring(data || [])
    } catch (err) {
      console.error('Load recurring error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      const { customers: data } = await res.json()
      setCustomers(data || [])
    } catch (err) {
      console.error('Load customers error:', err)
    }
  }

  const handleAddRecurring = async (e) => {
    e.preventDefault()
    if (!formData.customer_id || !formData.frequency) {
      alert('Customer and frequency are required')
      return
    }

    try {
      const res = await fetch('/api/recurring-invoices', {
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

      const { recurringInvoice } = await res.json()
      setRecurring([recurringInvoice, ...recurring])
      setFormData({
        customer_id: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        auto_charge: false,
      })
      setShowForm(false)
    } catch (err) {
      console.error('Add recurring error:', err)
      alert('Failed to create recurring invoice')
    }
  }

  const handleToggleStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!res.ok) return

      setRecurring(
        recurring.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      )
    } catch (err) {
      console.error('Update error:', err)
    }
  }

  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    completed: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Recurring Invoices</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Set Up Recurring'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Create Recurring Invoice</h2>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Customer *</label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">End Date (Optional)</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.auto_charge}
                  onChange={(e) => setFormData({ ...formData, auto_charge: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Auto-charge customer</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleAddRecurring} className="flex-1">
              Set Up Recurring
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Loading recurring invoices...</div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Customer</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Frequency</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Next Invoice</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Auto-Charge</th>
                  <th className="px-4 py-2 text-center font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {recurring.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">
                      {r.customers?.name || '—'}
                    </td>
                    <td className="px-4 py-2 capitalize text-neutral-600 dark:text-neutral-400">
                      {r.frequency}
                    </td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                      {formatDate(r.next_run_date)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs">
                        {r.auto_charge ? '✓ Yes' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColors[r.status] || statusColors.active}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === 'active' && (
                        <button
                          onClick={() => handleToggleStatus(r.id, 'paused')}
                          className="text-xs text-amber-600 hover:underline"
                        >
                          Pause
                        </button>
                      )}
                      {r.status === 'paused' && (
                        <button
                          onClick={() => handleToggleStatus(r.id, 'active')}
                          className="text-xs text-green-600 hover:underline"
                        >
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recurring.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>No recurring invoices set up yet.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          💡 <strong>Tip:</strong> Recurring invoices are automatically generated every day at 2 AM UTC. You can enable auto-charge to process payments automatically.
        </p>
      </div>
    </div>
  )
}
