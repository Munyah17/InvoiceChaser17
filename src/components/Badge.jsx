export default function Badge({ status }) {
  const styles = {
    paid: 'bg-brand-light text-brand border border-brand/20',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    overdue: 'bg-red-100 text-red-700 border border-red-200',
    draft: 'bg-slate-100 text-slate-600 border border-slate-200',
    cancelled: 'bg-slate-100 text-slate-400 border border-slate-200',
  }
  const labels = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    draft: 'Draft',
    cancelled: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}
