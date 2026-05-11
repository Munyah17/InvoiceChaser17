export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        className={`px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
