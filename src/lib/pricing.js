import { supabase } from './supabase'
import { PLAN_PRICES } from './stripe'

// Single source of truth for plan prices at runtime. Reads the public
// app_pricing table (editable by super admins in the Platform Console) and
// falls back to the hardcoded PLAN_PRICES if the table can't be reached, so
// checkout never breaks.

let _cache = null
let _cacheTs = 0

function fallbackList() {
  return Object.entries(PLAN_PRICES).map(([plan_key, v], i) => ({
    plan_key,
    name: v.name,
    amount_cents: v.monthly ?? v.oneTime ?? 0,
    interval: v.oneTime ? 'once' : 'month',
    display_order: i + 1,
    active: true,
  }))
}

export async function getPlanPrices({ force = false } = {}) {
  if (!force && _cache && Date.now() - _cacheTs < 60_000) return _cache
  try {
    const { data, error } = await supabase
      .from('app_pricing')
      .select('plan_key, name, amount_cents, interval, display_order, active')
      .order('display_order')
    if (error || !data || data.length === 0) throw error || new Error('empty')
    _cache = data
    _cacheTs = Date.now()
    return data
  } catch {
    return fallbackList()
  }
}

// Convenience: cents for a plan key (used at checkout).
export async function getPlanAmountCents(planKey) {
  const list = await getPlanPrices()
  const row = list.find(p => p.plan_key === planKey)
  return row ? row.amount_cents : (PLAN_PRICES[planKey]?.monthly ?? PLAN_PRICES[planKey]?.oneTime ?? 0)
}

export function formatCentsUSD(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`
}
