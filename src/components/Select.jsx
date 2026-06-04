export default function Select({ label, className = '', children, ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-neutral-700">{label}</label>}
      <select
        className="px-4 py-2.5 text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer bg-neutral-900"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
