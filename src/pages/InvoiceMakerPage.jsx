import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useStore } from '../store/useStore'
import { CURRENCIES, formatCurrency } from '../utils/currency'

export default function InvoiceMakerPage() {
  const { settings } = useStore()
  const [currency, setCurrency] = useState(settings.default_currency || 'USD')
  const fmt = (n) => formatCurrency(n, currency)

  const [company, setCompany] = useState({
    name: 'Your Company',
    address: '123 Business Street\nCity, Country',
    email: 'hello@yourcompany.com',
    phone: '+1 234 567 890',
    taxId: 'TAX-123456',
  })

  const [client, setClient] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
  })

  const [meta, setMeta] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    poNumber: '',
  })

  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, rate: 0 },
  ])

  const [taxRate, setTaxRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days.')

  const [editingCompany, setEditingCompany] = useState(false)
  const [logo, setLogo] = useState(null)

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', quantity: 1, rate: 0 }])
  }

  const removeItem = (id) => {
    if (items.length === 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.rate), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount - discount

  const exportPDF = () => {
    const doc = new jsPDF()
    const pageW = doc.internal.pageSize.getWidth()

    // Header band
    doc.setFillColor(0, 0, 0)
    doc.rect(0, 0, pageW, 40, 'F')
    doc.setTextColor(255, 255, 255)

    let headerLeftX = 14
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 14, 6, 28, 28)
        headerLeftX = 48
      } catch {
        // fallback: no logo rendered
      }
    }

    doc.setFontSize(22)
    doc.text('INVOICE', headerLeftX, 18)
    doc.setFontSize(10)
    doc.text(`# ${meta.invoiceNumber}`, headerLeftX, 26)
    doc.text(`Date: ${meta.date}`, headerLeftX, 32)

    // Company info (right side of header)
    doc.setFontSize(9)
    const companyLines = [company.name, ...company.address.split('\n'), company.email, company.phone, company.taxId]
    let y = 14
    companyLines.forEach(line => {
      if (line.trim()) {
        doc.text(line, pageW - 14, y, { align: 'right' })
        y += 5
      }
    })

    // Client info
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text('BILL TO', 14, 52)
    doc.setFontSize(10)
    const clientY = 58
    doc.text(client.name || 'Client Name', 14, clientY)
    doc.setFontSize(9)
    let cy = clientY + 5
    if (client.address) {
      client.address.split('\n').forEach(line => {
        doc.text(line, 14, cy)
        cy += 4.5
      })
    }
    if (client.email) { doc.text(client.email, 14, cy); cy += 4.5 }
    if (client.phone) { doc.text(client.phone, 14, cy) }

    // Invoice meta right side
    doc.setFontSize(9)
    let my = 52
    if (meta.dueDate) { doc.text(`Due Date: ${meta.dueDate}`, pageW - 14, my, { align: 'right' }); my += 5 }
    if (meta.poNumber) { doc.text(`PO #: ${meta.poNumber}`, pageW - 14, my, { align: 'right' }); my += 5 }

    // Table
    const body = items.map(i => [
      i.description || '—',
      i.quantity.toString(),
      fmt(i.rate),
      fmt(i.quantity * i.rate),
    ])

    autoTable(doc, {
      startY: 78,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    })

    const finalY = doc.lastAutoTable.finalY + 10
    const rightX = pageW - 14

    doc.setFontSize(10)
    doc.text(`Subtotal:`, rightX - 50, finalY)
    doc.text(fmt(subtotal), rightX, finalY, { align: 'right' })

    if (taxRate > 0) {
      doc.text(`Tax (${taxRate}%):`, rightX - 50, finalY + 6)
      doc.text(fmt(taxAmount), rightX, finalY + 6, { align: 'right' })
    }
    if (discount > 0) {
      doc.text(`Discount:`, rightX - 50, finalY + 12)
      doc.text(`-${fmt(discount)}`, rightX, finalY + 12, { align: 'right' })
    }

    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('TOTAL:', rightX - 50, finalY + 22)
    doc.text(fmt(total), rightX, finalY + 22, { align: 'right' })
    doc.setFont(undefined, 'normal')

    if (notes) {
      doc.setFontSize(9)
      doc.text('Notes:', 14, finalY + 36)
      const noteLines = doc.splitTextToSize(notes, 100)
      doc.text(noteLines, 14, finalY + 42)
    }

    if (terms) {
      doc.setFontSize(9)
      const termsY = notes ? finalY + 55 : finalY + 36
      doc.text('Terms & Conditions:', 14, termsY)
      const termLines = doc.splitTextToSize(terms, 100)
      doc.text(termLines, 14, termsY + 6)
    }

    doc.save(`${meta.invoiceNumber}.pdf`)
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Invoice Maker</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Create and export professional invoices</p>
        </div>
        <button onClick={exportPDF} className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Export PDF</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Company */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">From</h2>
              <button onClick={() => setEditingCompany(!editingCompany)} className="text-[10px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">{editingCompany ? 'Done' : 'Edit'}</button>
            </div>
            {/* Logo upload */}
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-12 h-12 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center overflow-hidden ${!logo ? 'bg-neutral-50 dark:bg-neutral-950' : ''}`}>
                  {logo ? (
                    <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">{logo ? 'Change Logo' : 'Upload Logo'}</div>
                  <div className="text-[10px] text-neutral-400">PNG, JPG up to 2MB</div>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              {logo && (
                <button onClick={() => setLogo(null)} className="text-[10px] text-red-500 hover:text-red-600 mt-1 ml-14">Remove</button>
              )}
            </div>
            {editingCompany ? (
              <div className="space-y-2">
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} placeholder="Company Name" />
                <textarea className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-16 resize-y" value={company.address} onChange={e => setCompany({...company, address: e.target.value})} placeholder="Address" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={company.email} onChange={e => setCompany({...company, email: e.target.value})} placeholder="Email" />
                  <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} placeholder="Phone" />
                </div>
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={company.taxId} onChange={e => setCompany({...company, taxId: e.target.value})} placeholder="Tax ID" />
              </div>
            ) : (
              <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-0.5">
                <div className="font-semibold text-sm text-neutral-900 dark:text-white">{company.name}</div>
                {company.address.split('\n').map((line, i) => line.trim() ? <div key={i}>{line}</div> : null)}
                <div>{company.email}</div>
                <div>{company.phone}</div>
                <div className="text-neutral-500 dark:text-neutral-400">{company.taxId}</div>
              </div>
            )}
          </div>

          {/* Invoice Meta + Client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invoice Details</h2>
              <div>
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Invoice #</label>
                <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={meta.invoiceNumber} onChange={e => setMeta({...meta, invoiceNumber: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={meta.date} onChange={e => setMeta({...meta, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Due Date</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={meta.dueDate} onChange={e => setMeta({...meta, dueDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">PO Number</label>
                <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={meta.poNumber} onChange={e => setMeta({...meta, poNumber: e.target.value})} placeholder="Optional" />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Bill To</h2>
              <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.name} onChange={e => setClient({...client, name: e.target.value})} placeholder="Client Name" />
              <textarea className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-14 resize-y" value={client.address} onChange={e => setClient({...client, address: e.target.value})} placeholder="Client Address" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.email} onChange={e => setClient({...client, email: e.target.value})} placeholder="Email" />
                <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.phone} onChange={e => setClient({...client, phone: e.target.value})} placeholder="Phone" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">Line Items</h2>
            <div className="overflow-x-auto overscroll-x-contain">
            <div className="min-w-[480px] space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min="0" step="0.01" className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none text-right" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2 text-right text-xs font-medium text-neutral-900 dark:text-white py-2">
                    {fmt(item.quantity * item.rate)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(item.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-1">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
            <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Line Item
            </button>
          </div>

          {/* Totals */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Currency</label>
                <select className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={currency} onChange={e => setCurrency(e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Tax Rate (%)</label>
                <input type="number" min="0" step="0.01" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Discount ({currency})</label>
                <input type="number" min="0" step="0.01" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex flex-col justify-end text-right">
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Subtotal {fmt(subtotal)}</div>
                {taxRate > 0 && <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Tax ({taxRate}%) {fmt(taxAmount)}</div>}
                {discount > 0 && <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Discount -{fmt(discount)}</div>}
                <div className="text-lg font-semibold text-neutral-900 dark:text-white mt-1">Total {fmt(total)}</div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Notes</label>
              <textarea className="w-full mt-2 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-20 resize-y" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Thank you for your business..." />
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Terms & Conditions</label>
              <textarea className="w-full mt-2 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-20 resize-y" value={terms} onChange={e => setTerms(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <div className="bg-neutral-900 dark:bg-white px-5 py-4 flex justify-between items-start">
              <div className="flex items-center gap-3">
                {logo && (
                  <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded" />
                )}
                <div>
                  <div className="text-white dark:text-neutral-950 text-lg font-bold">INVOICE</div>
                  <div className="text-neutral-400 dark:text-neutral-500 text-[10px]"># {meta.invoiceNumber}</div>
                </div>
              </div>
              <div className="text-right text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                {company.name}<br />
                {company.email}<br />
                {company.phone}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between">
                <div>
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase">Bill To</div>
                  <div className="text-xs font-medium text-neutral-900 dark:text-white mt-0.5">{client.name || '—'}</div>
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{client.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 dark:text-neutral-500">Date: {meta.date || '—'}</div>
                  {meta.dueDate && <div className="text-[10px] text-neutral-400 dark:text-neutral-500">Due: {meta.dueDate}</div>}
                  {meta.poNumber && <div className="text-[10px] text-neutral-400 dark:text-neutral-500">PO: {meta.poNumber}</div>}
                </div>
              </div>
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
                {items.map(i => (
                  <div key={i.id} className="flex justify-between text-xs py-1">
                    <div className="text-neutral-700 dark:text-neutral-300">{i.description || '—'} <span className="text-neutral-400">x{i.quantity}</span></div>
                    <div className="font-medium text-neutral-900 dark:text-white">{fmt(i.quantity * i.rate)}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">Subtotal</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{fmt(subtotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Tax ({taxRate}%)</span>
                    <span className="font-medium text-neutral-900 dark:text-white">{fmt(taxAmount)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Discount</span>
                    <span className="font-medium text-neutral-900 dark:text-white">-{fmt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">Total</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-white">{fmt(total)}</span>
                </div>
              </div>
              {(notes || terms) && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2">
                  {notes && <div className="text-[10px] text-neutral-500 dark:text-neutral-400"><span className="font-medium text-neutral-700 dark:text-neutral-300">Notes:</span> {notes}</div>}
                  {terms && <div className="text-[10px] text-neutral-500 dark:text-neutral-400"><span className="font-medium text-neutral-700 dark:text-neutral-300">Terms:</span> {terms}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
