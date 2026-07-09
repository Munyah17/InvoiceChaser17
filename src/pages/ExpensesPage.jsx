import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import { formatDate } from '../utils/dateFormat'

export default function ExpensesPage() {
  const { user } = useStore()
  const [expenses, setExpenses] = useState([])
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    vendor_id: '',
    amount: '',
    category: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (user) {
      loadExpenses()
      loadVendors()
    }
  }, [user?.id])

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/expenses', {
        headers: { Authorization: `Bearer ${user?.token}` },
      })
      const { expenses: data } = await res.json()
      setExpenses(data || [])
    } catch (err) {
      console.error('Load expenses error:', err)
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

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!formData.amount) {
      alert('Amount is required')
      return
    }

    try {
      const res = await fetch('/api/expenses', {
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

      const { expense } = await res.json()
      setExpenses([expense, ...expenses])
      setFormData({
        vendor_id: '',
        amount: '',
        category: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
      })
      setShowForm(false)
    } catch (err) {
      console.error('Add expense error:', err)
      alert('Failed to create expense')
    }
  }

  const categoryColors = {
    travel: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    meals: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    office: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    utilities: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    other: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Expenses</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Expense'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Record Expense</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Vendor (Optional)</label>
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
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            >
              <option value="">Select category...</option>
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="office">Office Supplies</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <input
            type="date"
            value={formData.expense_date}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
          />

          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description"
            rows={3}
            className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none resize-none"
          />

          <div className="flex gap-3">
            <Button onClick={handleAddExpense} className="flex-1">
              Save Expense
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Loading expenses...</div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Vendor</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Description</th>
                  <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    <td className="px-4 py-2">{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{expense.vendor_id ? 'Vendor' : '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[expense.category] || categoryColors.other}`}>
                        {expense.category || 'Other'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{expense.description}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium text-neutral-900 dark:text-white">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expenses.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>No expenses recorded yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
