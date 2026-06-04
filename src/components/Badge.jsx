export default function Badge({ status }) {
  const styles = {
    paid: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700',
    pending: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700',
    overdue: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700',
    draft: 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700',
    cancelled: 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700',
  }
  const labels = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    draft: 'Draft',
    cancelled: 'Cancelled',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}
