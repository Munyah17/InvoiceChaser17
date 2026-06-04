import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '../utils/dateFormat'

export default function ProformaPage() {
  const [items, setItems] = useState([{ description: '', qty: 1, price: 0 }])
  const [client, setClient] = useState({ name: '', email: '', address: '' })
  const [proformaNum, setProformaNum] = useState(`PI-${Date.now().toString().slice(-6)}`)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [logo, setLogo] = useState(null)
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days.')

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax

  const updateItem = (idx, field, value) => {
    const copy = [...items]
    copy[idx][field] = field === 'description' ? value : parseFloat(value) || 0
    setItems(copy)
  }

  const addItem = () => setItems([...items, { description: '', qty: 1, price: 0 }])
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    let headerLeftX = 14
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 14, 6, 28, 28)
        headerLeftX = 48
      } catch {
        // fallback: no logo rendered
      }
    }
    doc.setFontSize(20)
    doc.text('PROFORMA INVOICE', headerLeftX, 20)
    doc.setFontSize(10)
    doc.text(`# ${proformaNum}`, headerLeftX, 30)
    doc.text(`Date: ${formatDate(new Date())}`, headerLeftX, 36)
    doc.text(`Delivery: ${deliveryDate || 'TBD'}`, headerLeftX, 42)
    doc.text(`Bill To:`, 14, logo ? 60 : 55)
    doc.text(client.name, 14, logo ? 66 : 61)
    doc.text(client.email, 14, logo ? 72 : 67)
    doc.text(client.address, 14, logo ? 78 : 73)

    const body = items.map(i => [i.description, i.qty.toString(), `$${i.price.toFixed(2)}`, `$${(i.qty * i.price).toFixed(2)}`])
    autoTable(doc, { startY: 82, head: [['Description', 'Qty', 'Unit Price', 'Total']], body, theme: 'grid', headStyles: { fillColor: [0, 0, 0] } })

    const finalY = (doc.lastAutoTable?.finalY || 82) + 10
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 150, finalY, { align: 'right' })
    doc.text(`Tax (15%): $${tax.toFixed(2)}`, 150, finalY + 6, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`Total: $${total.toFixed(2)}`, 150, finalY + 14, { align: 'right' })
    
    if (notes) {
      doc.setFontSize(10)
      doc.text('Notes:', 14, finalY + 25)
      doc.setFontSize(9)
      const noteLines = doc.splitTextToSize(notes, 180)
      doc.text(noteLines, 14, finalY + 31)
    }
    
    if (terms) {
      const termsY = finalY + (notes ? 45 : 25)
      doc.setFontSize(10)
      doc.text('Terms & Conditions:', 14, termsY)
      doc.setFontSize(9)
      const termLines = doc.splitTextToSize(terms, 180)
      doc.text(termLines, 14, termsY + 6)
    }
    
    doc.save(`Proforma_${proformaNum}.pdf`)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Proforma Invoice</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Create pre-payment invoices</p>
        </div>
        <button onClick={exportPDF} className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Export PDF</button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4">
        {/* Logo Upload */}
        <div className="flex items-start gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-14 h-14 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center overflow-hidden ${!logo ? 'bg-neutral-50 dark:bg-neutral-950' : ''}`}>
              {logo ? (
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-neutral-400 fill-none stroke-2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{logo ? 'Change Logo' : 'Upload Logo'}</div>
              <div className="text-[10px] text-neutral-400">PNG, JPG up to 2MB</div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
          {logo && (
            <button onClick={() => setLogo(null)} className="text-xs text-red-500 hover:text-red-600">Remove</button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Proforma #</label>
            <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={proformaNum} onChange={e => setProformaNum(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Delivery Date</label>
            <input type="date" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Client Name</label>
            <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.name} onChange={e => setClient({...client, name: e.target.value})} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Client Email</label>
            <input type="email" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.email} onChange={e => setClient({...client, email: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Address</label>
            <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.address} onChange={e => setClient({...client, address: e.target.value})} />
          </div>
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Line Items</span>
            <button onClick={addItem} className="text-xs text-neutral-900 dark:text-white font-medium hover:underline">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="flex-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                <input type="number" className="w-16 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Qty" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                <input type="number" className="w-24 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" placeholder="Price" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} />
                <span className="text-xs font-medium text-neutral-900 dark:text-white w-16 text-right">${(item.qty * item.price).toFixed(2)}</span>
                <button onClick={() => removeItem(i)} className="text-neutral-400 hover:text-red-500"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Notes</label>
          <textarea className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-16 resize-y" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
        </div>

        {/* Terms & Conditions */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Terms & Conditions</label>
          <textarea className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none h-16 resize-y" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Payment terms, delivery conditions..." />
        </div>

        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex justify-end">
          <div className="text-right space-y-1">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Subtotal: <span className="font-medium text-neutral-900 dark:text-white ml-2">${subtotal.toFixed(2)}</span></div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Tax (15%): <span className="font-medium text-neutral-900 dark:text-white ml-2">${tax.toFixed(2)}</span></div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white pt-1">Total: ${total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
