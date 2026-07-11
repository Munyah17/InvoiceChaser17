import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { authFetch } from '../lib/authFetch'
import { supabase } from '../lib/supabase'
import Button from '../components/Button'
import Input from '../components/Input'

export default function AccountsPage() {
  const { user } = useStore()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    account_number: '',
    name: '',
    type: 'asset',
    subtype: '',
    currency: 'USD',
    description: '',
  })

  useEffect(() => {
    if (user) loadAccounts()
  }, [user?.id])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/chart-of-accounts', {
      })
      const { accounts: data } = await res.json()
      setAccounts(data || [])
    } catch (err) {
      console.error('Load accounts error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      alert('Account name is required')
      return
    }

    try {
      const res = await authFetch('/api/chart-of-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const { error } = await res.json()
        alert(`Error: ${error}`)
        return
      }

      const { account } = await res.json()
      setAccounts([...accounts, account])
      setFormData({
        account_number: '',
        name: '',
        type: 'asset',
        subtype: '',
        currency: 'USD',
        description: '',
      })
      setShowForm(false)
    } catch (err) {
      console.error('Add account error:', err)
      alert('Failed to create account')
    }
  }

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = []
    acc[account.type].push(account)
    return acc
  }, {})

  const typeLabels = {
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    income: 'Income',
    expense: 'Expenses',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Chart of Accounts</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Account'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">New Account</h2>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Account Number"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="e.g., 1010"
            />
            <Input
              label="Account Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Operating Bank Account"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              >
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <Input
              label="Subtype"
              value={formData.subtype}
              onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
              placeholder="e.g., checking, revenue"
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="flex gap-3">
            <Button onClick={handleAddAccount} className="flex-1">
              Create Account
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Loading accounts...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([type, accts]) => (
            <div key={type} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <div className="bg-neutral-50 dark:bg-neutral-800 px-5 py-3 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{typeLabels[type]}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">#</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-neutral-600 dark:text-neutral-400">Subtype</th>
                      <th className="px-4 py-2 text-right font-medium text-neutral-600 dark:text-neutral-400">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {accts.map((account) => (
                      <tr key={account.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                        <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{account.account_number}</td>
                        <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">{account.name}</td>
                        <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">{account.subtype}</td>
                        <td className="px-4 py-2 text-right font-mono text-neutral-900 dark:text-white">
                          {parseFloat(account.balance).toFixed(2)} {account.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {Object.keys(groupedAccounts).length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <p>No accounts yet. Create your first account to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
