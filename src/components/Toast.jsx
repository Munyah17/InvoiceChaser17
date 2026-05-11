import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600'

  return (
    <div
      className={`fixed top-[18px] right-[18px] ${bgColor} text-white px-[18px_11px] py-[11px_18px] rounded-lg text-sm font-medium z-[999] flex items-center gap-2.5 animate-fade-in shadow-lg`}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]">
        {type === 'success' ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <circle cx="12" cy="12" r="10" />
        )}
      </svg>
      {message}
    </div>
  )
}
