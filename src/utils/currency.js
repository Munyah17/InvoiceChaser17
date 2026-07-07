export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'ZWG', label: 'Zimbabwe Gold (ZiG)', symbol: 'ZWG' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
]

// Intl.NumberFormat only recognizes ZWG on newer engines (added to ISO 4217 in 2024) —
// fall back to a manual symbol prefix if the runtime doesn't know the code yet.
export function formatCurrency(amount, code = 'USD') {
  const n = parseFloat(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(n)
  } catch {
    const symbol = CURRENCIES.find(c => c.code === code)?.symbol || code
    return `${symbol} ${n.toFixed(2)}`
  }
}
