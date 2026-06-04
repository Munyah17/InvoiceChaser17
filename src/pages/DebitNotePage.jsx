import { useState } from 'react'
import jsPDF from 'jspdf'
import { formatDate } from '../utils/dateFormat'

export default function DebitNotePage() {
  const [client, setClient] = useState({ name: '', email: '' })
  const [noteNum, setNoteNum] = useState(`DN-${Date.now().toString().slice(-6)}`)
  const [originalInvoice, setOriginalInvoice] = useState('')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('DEBIT NOTE', 14, 20)
    doc.setFontSize(10)
    doc.text(`# ${noteNum}`, 14, 30)
    doc.text(`Date: ${date || formatDate(new Date())}`, 14, 36)
    doc.text(`To: ${client.name}`, 14, 48)
    doc.text(`Email: ${client.email}`, 14, 54)
    doc.text(`Original Invoice: ${originalInvoice}`, 14, 64)
    doc.text(`Reason: ${reason}`, 14, 70)
    doc.text(`Amount: $${parseFloat(amount || 0).toFixed(2)}`, 14, 80)
    doc.setFontSize(12)
    doc.text('This debit note is issued to account for additional charges.', 14, 95)
    doc.save(`DebitNote_${noteNum}.pdf`)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Debit Note</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Issue additional charges to customers</p>
        </div>
        <button onClick={exportPDF} className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">Export PDF</button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-4 max-w-lg mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Note #</label>
            <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={noteNum} onChange={e => setNoteNum(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Date</label>
            <input type="date" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Customer Name</label>
          <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.name} onChange={e => setClient({...client, name: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Customer Email</label>
          <input type="email" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={client.email} onChange={e => setClient({...client, email: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Original Invoice #</label>
          <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={originalInvoice} onChange={e => setOriginalInvoice(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Reason</label>
          <input className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Additional charges for revised scope" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Amount (USD)</label>
          <input type="number" className="w-full mt-1 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex justify-end">
          <div className="text-right">
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">Total Debit</div>
            <div className="text-xl font-semibold text-neutral-900 dark:text-white">${parseFloat(amount || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
