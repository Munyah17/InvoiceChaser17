import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { formatCurrency } from '../utils/currency'

export default function PayInvoicePage() {
  const { invoiceNumber } = useParams()
  const [searchParams] = useSearchParams()
  const paidRedirect = searchParams.get('paid') === '1'

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingWith, setPayingWith] = useState(null)

  const gatewayParam = searchParams.get('gateway')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/get-invoice?invoice_number=${encodeURIComponent(invoiceNumber)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invoice not found')
        setInvoice(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [invoiceNumber])

  // A reminder email's link carries ?gateway=stripe|paynow so each of the
  // two links jumps straight into that provider's checkout.
  useEffect(() => {
    if (invoice && invoice.status !== 'paid' && ['stripe', 'paynow'].includes(gatewayParam)) {
      handlePay(gatewayParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice])

  const handlePay = async (gateway) => {
    setPayingWith(gateway)
    try {
      const res = await fetch('/api/pay-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_number: invoiceNumber, gateway }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start payment')
      window.location.href = data.url
    } catch (err) {
      setError(err.message)
      setPayingWith(null)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 bg-neutral-950 dark:bg-white rounded-md flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white dark:fill-neutral-950">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="font-semibold text-neutral-900 dark:text-white text-sm tracking-tight">InvoiceChaser</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-6">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">{error}</p>
            <p className="text-xs text-neutral-500">Double-check the payment link, or contact whoever sent it to you.</p>
          </div>
        )}

        {!loading && !error && invoice && paidRedirect && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-emerald-600 dark:stroke-emerald-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Payment received</h1>
            <p className="text-sm text-neutral-500">Thank you — invoice {invoice.invoice_number} is settled with {invoice.creditor_name}.</p>
          </div>
        )}

        {!loading && !error && invoice && !paidRedirect && (
          <>
            {invoice.status === 'paid' ? (
              <div className="text-center py-6">
                <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Already paid</h1>
                <p className="text-sm text-neutral-500">Invoice {invoice.invoice_number} has already been settled. No further action needed.</p>
              </div>
            ) : (
              <>
                <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Invoice {invoice.invoice_number}</h1>
                <p className="text-xs text-neutral-500 mb-5">From {invoice.creditor_name}{invoice.description ? ` — ${invoice.description}` : ''}</p>

                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-5 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Invoice amount</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">Card/payment processing fee ({(invoice.fee_rate * 100).toFixed(1)}%)</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{formatCurrency(invoice.fee, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    <span className="font-semibold text-neutral-900 dark:text-white">Total due</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(invoice.total, invoice.currency)}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handlePay('stripe')}
                    disabled={!!payingWith}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#635bff] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {payingWith === 'stripe' ? 'Redirecting…' : 'Pay via Card (Stripe)'}
                  </button>
                  <button
                    onClick={() => handlePay('paynow')}
                    disabled={!!payingWith}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#00a651] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {payingWith === 'paynow' ? 'Redirecting…' : 'Pay via Paynow (EcoCash / Bank)'}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 text-center mt-4">
                  You'll be redirected to your chosen payment provider's secure checkout. InvoiceChaser never sees your card or PIN.
                </p>
              </>
            )}
          </>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Powered by InvoiceChaser</Link>
        </div>
      </div>
    </div>
  )
}
