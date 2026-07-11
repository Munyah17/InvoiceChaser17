import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { authFetch } from '../lib/authFetch'
import Button from '../components/Button'

export default function VendorsPage() {
  const { user } = useStore()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    tax_id: '',
    payment_terms: 'Net 30',
  })

  useEffect(() => {
    if (user) loadVendors()
  }, [user?.id])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/vendors', {
      })
      const { vendors: data } = await res.json()
      setVendors(data || [])
    } catch (err) {
      console.error('Load vendors error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddVendor = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      alert('Vendor name is required')
      return
    }

    try {
      const res = await authFetch('/api/vendors', {
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

      const { vendor } = await res.json()
      setVendors([vendor, ...vendors])
      setFormData({
        name: '',
        email: '',
        phone: '',
        city: '',
        country: '',
        tax_id: '',
        payment_terms: 'Net 30',
      })
      setShowForm(false)
    } catch (err) {
      console.error('Add vendor error:', err)
      alert('Failed to create vendor')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Vendors</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Vendor'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Add Vendor</h2>

          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Vendor Name *"
            className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
          />

          <div className="grid grid-cols-2 gap-4">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email"
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone"
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            />
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Country"
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              placeholder="Tax ID"
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            />
            <select
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
              className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 60">Net 60</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleAddVendor} className="flex-1">
              Save Vendor
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-neutral-500">Loading vendors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">{vendor.name}</h3>
              <div className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {vendor.email && (
                  <p>
                    📧 <a href={`mailto:${vendor.email}`} className="hover:underline">
                      {vendor.email}
                    </a>
                  </p>
                )}
                {vendor.phone && <p>📱 {vendor.phone}</p>}
                {vendor.city && <p>📍 {vendor.city}, {vendor.country}</p>}
                {vendor.tax_id && <p>🏛️ {vendor.tax_id}</p>}
                {vendor.payment_terms && <p>💳 {vendor.payment_terms}</p>}
              </div>
            </div>
          ))}

          {vendors.length === 0 && (
            <div className="col-span-full text-center py-12 text-neutral-500">
              <p>No vendors yet. Add your first vendor to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
