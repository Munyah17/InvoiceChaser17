export default function Button({ variant = 'default', size = 'default', children, className = '', ...props }) {
  const baseStyles = 'inline-flex items-center gap-2 font-medium cursor-pointer border transition-all duration-200 font-sans active:scale-[0.98] rounded-xl'
  
  const variants = {
    default: 'bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400',
    primary: 'bg-neutral-900 border-neutral-900 text-white hover:opacity-90',
    danger: 'bg-red-500 border-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent border-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  }
  
  const sizes = {
    default: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    sm: 'px-3 py-1.5 text-xs',
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
