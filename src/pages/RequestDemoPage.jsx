import { useState } from 'react'
import { Link } from 'react-router-dom'

const INTEREST_OPTIONS = [
  'Invoicing & Reminders',
  'Quotations & Proforma',
  'BOQ / BOM Estimating',
  'Accounting & Reports',
  'Inventory & Procurement',
  'Payroll & HR',
  'Tax Compliance / Fiscalisation',
]

const BUSINESS_TYPES = ['Sole Trader', 'SME', 'Agency / Consultancy', 'Contractor / Construction', 'Retail', 'Other']
const COMPANY_SIZES = ['Just me', '2-10', '11-50', '51-200', '200+']

export default function RequestDemoPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', company_name: '',
    business_type: '', company_size: '', interests: [], message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleInterest = (label) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(label) ? f.interests.filter(i => i !== label) : [...f.interests, label],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.full_name || !form.email) {
      setError('Please fill in your name and email.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/request-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not submit request')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mb-8 w-fit">
          <div className="w-7 h-7 bg-neutral-950 dark:bg-white rounded-md flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white dark:fill-neutral-950"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          </div>
          <span className="font-semibold text-neutral-900 dark:text-white text-sm tracking-tight">InvoiceChaser</span>
        </Link>

        {submitted ? (
          <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-emerald-600 dark:stroke-emerald-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="font-display font-bold text-xl text-neutral-950 dark:text-white mb-2">Request received</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Our team will review what you need and get back to you shortly with the right setup for your business.</p>
          </div>
        ) : (
          <>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-neutral-950 dark:text-white mb-2 tracking-tight">Request a demo</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8">Tell us about your business and what you need — we'll review it and set you up with the right tools.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">About you</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Full name *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                  <input type="email" className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  <input className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none sm:col-span-2" placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Your business</div>
                <input className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Company name" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}>
                    <option value="">Business type…</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={form.company_size} onChange={e => setForm({ ...form, company_size: e.target.value })}>
                    <option value="">Company size…</option>
                    {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">What are you interested in?</div>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(label => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => toggleInterest(label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.interests.includes(label)
                          ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-950 dark:border-white'
                          : 'bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none resize-none" rows={3} placeholder="Anything else we should know?" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              </div>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

              <button type="submit" disabled={loading} className="w-full px-4 py-3 rounded-lg text-sm font-semibold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-opacity disabled:opacity-60">
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
