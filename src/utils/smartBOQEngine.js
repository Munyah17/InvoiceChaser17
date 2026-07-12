/**
 * Smart BOQ/BOM Engine with project inference.
 * Calculates realistic quantities from a project type + size, then sources each
 * material from REAL Zimbabwe suppliers, matched by material category so a
 * supplier is only ever suggested for goods it actually sells.
 */

import { MATERIAL_DATABASE } from './boqEngine'

// ── Real Zimbabwe suppliers, tagged by the material categories they stock ────
// `categories` gates what each supplier can be matched to (so e.g. a steel mill
// is never suggested for paint, and a beverage/again-unrelated firm can never
// appear at all). `priceFactor` is applied to each material's reference price to
// approximate that supplier's pricing — producers/wholesalers are cheaper.
// Material categories come from MATERIAL_DATABASE:
//   'Cement & Concrete', 'Steel & Metal', 'Wood & Timber', 'Roofing',
//   'Electrical', 'Plumbing', 'Finishing'
const BUILDING = ['Cement & Concrete', 'Roofing', 'Plumbing', 'Finishing', 'Wood & Timber']

export const SUPPLIERS = {
  // ── General building-materials & hardware retailers (broad range) ─────────
  'Halsteds Builders Express': {
    name: 'Halsteds Builders Express', type: 'Building materials & hardware',
    locations: ['Harare', 'Bulawayo', 'Gweru', 'Mutare', 'Masvingo', 'Kwekwe', 'Chinhoyi'],
    categories: [...BUILDING, 'Electrical', 'Steel & Metal'],
    priceFactor: 1.02, deliveryFee: 25, minOrder: 100,
  },
  'Electrosales Hardware': {
    name: 'Electrosales Hardware', type: 'Hardware & electrical (nationwide)',
    locations: ['Harare', 'Bulawayo', 'Gweru', 'Mutare', 'Masvingo', 'Kwekwe', 'Chinhoyi', 'Kadoma'],
    categories: [...BUILDING, 'Electrical'],
    priceFactor: 1.00, deliveryFee: 20, minOrder: 80,
  },
  'Bhola Hardware': {
    name: 'Bhola Hardware', type: 'Building materials & home',
    locations: ['Bulawayo', 'Harare'],
    categories: [...BUILDING, 'Electrical'],
    priceFactor: 0.98, deliveryFee: 22, minOrder: 90,
  },
  'N. Richards Group': {
    name: 'N. Richards Group', type: 'General wholesaler / distributor',
    locations: ['Harare', 'Bulawayo', 'Gweru', 'Mutare', 'Masvingo', 'Chinhoyi', 'Bindura'],
    categories: BUILDING,
    priceFactor: 1.03, deliveryFee: 28, minOrder: 120,
  },
  'PG Industries': {
    name: 'PG Industries', type: 'Building materials, glass & timber',
    locations: ['Harare', 'Bulawayo', 'Mutare', 'Gweru'],
    categories: BUILDING,
    priceFactor: 1.05, deliveryFee: 30, minOrder: 120,
  },
  'Buildcon': {
    name: 'Buildcon', type: 'Building & construction supplies',
    locations: ['Harare', 'Chitungwiza'],
    categories: [...BUILDING, 'Steel & Metal'],
    priceFactor: 0.97, deliveryFee: 20, minOrder: 90,
  },
  'Buildit Zimbabwe': {
    name: 'Buildit Zimbabwe', type: 'Building materials retailer',
    locations: ['Harare', 'Bulawayo', 'Mutare'],
    categories: BUILDING,
    priceFactor: 0.99, deliveryFee: 25, minOrder: 100,
  },
  'Cashbuild Zimbabwe': {
    name: 'Cashbuild Zimbabwe', type: 'Building materials retailer',
    locations: ['Harare', 'Bulawayo', 'Gweru', 'Masvingo'],
    categories: ['Cement & Concrete', 'Roofing', 'Plumbing', 'Finishing'],
    priceFactor: 1.00, deliveryFee: 30, minOrder: 150,
  },

  // ── Electrical specialists ────────────────────────────────────────────────
  'Electromaster': {
    name: 'Electromaster', type: 'Electrical supplier',
    locations: ['Harare', 'Bulawayo'],
    categories: ['Electrical'],
    priceFactor: 0.96, deliveryFee: 18, minOrder: 60,
  },
  'Powerspeed Electrical': {
    name: 'Powerspeed Electrical', type: 'Electrical supplier',
    locations: ['Harare', 'Bulawayo', 'Mutare'],
    categories: ['Electrical'],
    priceFactor: 0.98, deliveryFee: 20, minOrder: 75,
  },

  // ── Steel & metal suppliers / processors ──────────────────────────────────
  'DISCO Steel (Dinson Iron & Steel)': {
    name: 'DISCO Steel (Dinson Iron & Steel)', type: 'Integrated steel producer',
    locations: ['Manhize', 'Harare', 'Kwekwe'],
    categories: ['Steel & Metal'],
    priceFactor: 0.90, deliveryFee: 60, minOrder: 500,
  },
  'Steelmate Investments': {
    name: 'Steelmate Investments', type: 'Steel distributor',
    locations: ['Harare', 'Bulawayo'],
    categories: ['Steel & Metal'],
    priceFactor: 0.95, deliveryFee: 40, minOrder: 200,
  },
  'Zimsteel': {
    name: 'Zimsteel', type: 'Steel supply, cutting & bending',
    locations: ['Harare'],
    categories: ['Steel & Metal'],
    priceFactor: 0.96, deliveryFee: 40, minOrder: 200,
  },
  'ZIMASCO': {
    name: 'ZIMASCO', type: 'Ferrochrome / metal processing',
    locations: ['Kwekwe', 'Harare'],
    categories: ['Steel & Metal'],
    priceFactor: 0.93, deliveryFee: 55, minOrder: 400,
  },
  'Zimbabwe Alloys': {
    name: 'Zimbabwe Alloys', type: 'Ferroalloys / metal processing',
    locations: ['Gweru', 'Harare'],
    categories: ['Steel & Metal'],
    priceFactor: 0.94, deliveryFee: 55, minOrder: 400,
  },
  'CDMZ': {
    name: 'CDMZ', type: 'Steel & metal distributor',
    locations: ['Harare'],
    categories: ['Steel & Metal'],
    priceFactor: 0.97, deliveryFee: 45, minOrder: 250,
  },

  // ── Timber specialists ────────────────────────────────────────────────────
  'N.R. Barber': {
    name: 'N.R. Barber', type: 'Timber merchant',
    locations: ['Harare', 'Mutare'],
    categories: ['Wood & Timber'],
    priceFactor: 0.92, deliveryFee: 25, minOrder: 100,
  },
  'Border Timbers': {
    name: 'Border Timbers', type: 'Timber producer',
    locations: ['Mutare', 'Harare'],
    categories: ['Wood & Timber'],
    priceFactor: 0.94, deliveryFee: 35, minOrder: 150,
  },

  // ── Roofing specialist ────────────────────────────────────────────────────
  'Big Sky': {
    name: 'Big Sky', type: 'Roofing supplier',
    locations: ['Harare'],
    categories: ['Roofing'],
    priceFactor: 0.95, deliveryFee: 30, minOrder: 150,
  },
}

// Back-compat alias (older imports referenced HARDWARE_STORES)
export const HARDWARE_STORES = SUPPLIERS

// ── Project templates (materials + quantities per unit) ──────────────────────
export const PROJECT_TEMPLATES = {
  'cottage': {
    name: 'Cottage/House', description: 'Residential building with rooms',
    materialsPerRoom: {
      cement_50kg: 25, sand_per_ton: 3, gravel_per_ton: 2, rebar_12mm: 60,
      rebar_16mm: 20, timber_2x4: 30, plywood_18mm: 8, ibs_sheets: 20,
      ceramic_tiles: 15, paint_20L: 1, cable_2_5mm: 40, switch_socket: 4,
      pvc_pipe_50mm: 15, taps_fittings: 1,
    },
    commonMaterials: { water_tank_1000L: 1, gutters: 30, distribution_board: 1 },
    laborHoursPerRoom: 150,
  },
  'warehouse': {
    name: 'Warehouse/Industrial', description: 'Commercial storage building',
    materialsPer100m2: {
      cement_50kg: 100, sand_per_ton: 15, gravel_per_ton: 10, rebar_16mm: 150,
      steel_plate: 200, ibs_sheets: 120, angle_iron: 80, cable_2_5mm: 200,
      switch_socket: 10,
    },
    laborHoursPer100m2: 300,
  },
  'office': {
    name: 'Office Building', description: 'Commercial office space',
    materialsPerRoom: {
      cement_50kg: 20, sand_per_ton: 2.5, gravel_per_ton: 1.5, rebar_12mm: 50,
      timber_2x4: 25, plywood_18mm: 6, laminate_flooring: 12, paint_20L: 1.5,
      cable_2_5mm: 50, switch_socket: 6, pvc_pipe_50mm: 10,
    },
    commonMaterials: { water_tank_1000L: 1, distribution_board: 1 },
    laborHoursPerRoom: 120,
  },
  'school_classroom': {
    name: 'School Classroom', description: 'Educational building',
    materialsPerRoom: {
      cement_50kg: 35, sand_per_ton: 4, gravel_per_ton: 3, rebar_12mm: 80,
      timber_2x4: 40, plywood_18mm: 10, ceramic_tiles: 20, paint_20L: 2,
      cable_2_5mm: 60, switch_socket: 8,
    },
    laborHoursPerRoom: 200,
  },
  'bathroom': {
    name: 'Bathroom', description: 'Toilet and bath construction',
    materialsPerUnit: {
      cement_50kg: 15, sand_per_ton: 2, ceramic_tiles: 12, pvc_pipe_50mm: 20,
      taps_fittings: 1, water_tank_1000L: 0.5, paint_20L: 0.5,
    },
    laborHoursPerUnit: 80,
  },
  'kitchen': {
    name: 'Kitchen', description: 'Kitchen construction',
    materialsPerUnit: {
      cement_50kg: 18, sand_per_ton: 2.5, ceramic_tiles: 15, cable_2_5mm: 30,
      switch_socket: 6, pvc_pipe_50mm: 10, taps_fittings: 1, paint_20L: 1,
    },
    laborHoursPerUnit: 100,
  },
}

// Keyword patterns for project type detection
const PROJECT_PATTERNS = {
  'cottage': ['cottage', 'house', 'home', 'residence', 'dwelling', 'housing', 'bungalow', 'flat', 'apartment', 'duplex', 'villa', 'mansion', 'bedroom', 'bedrooms', 'room', 'rooms'],
  'warehouse': ['warehouse', 'store', 'storage', 'factory', 'industrial', 'shed', 'workshop', 'godown', 'depot', 'plant', 'hangar'],
  'office': ['office', 'commercial', 'workspace', 'workplace', 'boardroom', 'complex', 'block'],
  'school_classroom': ['school', 'classroom', 'education', 'college', 'learning', 'academy', 'university', 'creche', 'kindergarten'],
  'bathroom': ['bathroom', 'toilet', 'bath', 'shower', 'lavatory', 'washroom', 'ablution'],
  'kitchen': ['kitchen', 'cooking', 'cookhouse', 'canteen'],
}

const SIZE_PATTERNS = {
  rooms: /(\d+)\s*(?:room|rooms|bedroom|bedrooms|classroom|classrooms|unit|units|office|offices)/i,
  sqm: /(\d+)\s*(?:sqm|sq\s*m|m2|m²|square\s*met(?:er|re)s?)/i,
  size: /(\d+)\s*(?:x|by)\s*(\d+)\s*m?/i,
}

const detectProjectType = (description) => {
  const desc = (description || '').toLowerCase()

  // Word-boundary scoring so "warehouse" never matches the "house" keyword and
  // collapses everything to a cottage. Strongest keyword match wins.
  let best = null
  let bestScore = 0
  for (const [type, keywords] of Object.entries(PROJECT_PATTERNS)) {
    let score = 0
    for (const keyword of keywords) {
      const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (re.test(desc)) score++
    }
    if (score > bestScore) { bestScore = score; best = type }
  }
  if (best) return best

  // Partial-word fallback (e.g. "3-roomed")
  for (const [type, keywords] of Object.entries(PROJECT_PATTERNS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) return type
    }
  }
  return 'cottage'
}

// Realistic default footprint per type so an un-numbered description doesn't
// collapse every project to a single 1-room cottage.
const DEFAULT_SIZE = {
  cottage:          { type: 'rooms', count: 3 },
  office:           { type: 'rooms', count: 6 },
  warehouse:        { type: 'sqm',   count: 300 },
  school_classroom: { type: 'rooms', count: 4 },
  bathroom:         { type: 'rooms', count: 1 },
  kitchen:          { type: 'rooms', count: 1 },
}

const detectSize = (description, projectType = 'cottage') => {
  const desc = (description || '').toLowerCase()

  const sizeMatch = desc.match(SIZE_PATTERNS.size)
  if (sizeMatch) return { type: 'sqm', count: parseInt(sizeMatch[1]) * parseInt(sizeMatch[2]) }

  const sqmMatch = desc.match(SIZE_PATTERNS.sqm)
  if (sqmMatch) return { type: 'sqm', count: parseInt(sqmMatch[1]) }

  const roomMatch = desc.match(SIZE_PATTERNS.rooms)
  if (roomMatch) return { type: 'rooms', count: parseInt(roomMatch[1]) }

  const bareNum = desc.match(/\b(\d{1,3})\b/)
  if (bareNum) return { type: 'rooms', count: parseInt(bareNum[1]) }

  return DEFAULT_SIZE[projectType] || { type: 'rooms', count: 1 }
}

export const generateSmartBOQ = (description) => {
  const projectType = detectProjectType(description)
  const size = detectSize(description, projectType)
  const template = PROJECT_TEMPLATES[projectType]
  if (!template) return []

  const items = []
  let multiplier = 1
  if (size.type === 'rooms') {
    multiplier = size.count
  } else if (size.type === 'sqm') {
    if (template.materialsPer100m2) multiplier = size.count / 100
    else if (template.materialsPerRoom) multiplier = Math.ceil(size.count / 25)
  }
  if (!multiplier || multiplier < 1) multiplier = 1

  const perUnitMaterials =
    template.materialsPerRoom || template.materialsPer100m2 || template.materialsPerUnit || {}

  for (const [materialId, baseQty] of Object.entries(perUnitMaterials)) {
    const material = MATERIAL_DATABASE[materialId]
    if (material) {
      items.push({
        id: materialId, name: material.name, quantity: Math.ceil(baseQty * multiplier),
        unit: material.unit, price: material.suggestedPrice, category: material.category,
        type: 'material', shop: null,
      })
    }
  }

  if (template.commonMaterials) {
    for (const [materialId, qty] of Object.entries(template.commonMaterials)) {
      const material = MATERIAL_DATABASE[materialId]
      if (material) {
        items.push({
          id: materialId, name: material.name, quantity: Math.max(1, Math.ceil(qty * (multiplier >= 2 ? Math.ceil(multiplier / 3) : 1))),
          unit: material.unit, price: material.suggestedPrice, category: material.category,
          type: 'material', shop: null,
        })
      }
    }
  }

  const laborBase =
    template.laborHoursPerRoom || template.laborHoursPer100m2 || template.laborHoursPerUnit || 100
  const laborHours = Math.ceil(laborBase * multiplier)
  items.push({ id: 'general_worker', name: 'General Labor', quantity: laborHours, unit: 'hours', price: 3.50, category: 'Labor', type: 'labor' })
  if (multiplier >= 2) {
    items.push({ id: 'skilled_worker', name: 'Skilled Labor (Mason/Carpenter)', quantity: Math.ceil(laborHours * 0.4), unit: 'hours', price: 6.00, category: 'Labor', type: 'labor' })
  }

  return items
}

const round2 = (n) => Math.round(n * 100) / 100

// Suppliers that legitimately stock a given material category.
const suppliersForCategory = (category) =>
  Object.values(SUPPLIERS).filter(s => s.categories.includes(category))

/**
 * Assign each material to the cheapest supplier that actually sells its
 * category, preferring suppliers that deliver to the user's location. Materials
 * with no matching supplier are labeled honestly rather than pinned on an
 * unrelated shop.
 */
export const assignBestShops = (items, location = 'Harare') => {
  return items.map(item => {
    if (item.type === 'labor') return item

    const candidates = suppliersForCategory(item.category)
    let bestShop = null
    let bestPrice = item.price
    let bestScore = Infinity

    for (const supplier of candidates) {
      const price = round2(item.price * (supplier.priceFactor ?? 1))
      const delivers = supplier.locations.includes(location)
      const score = price + (delivers ? 0 : 5) // like-for-like penalty for no local delivery
      if (score < bestScore) {
        bestScore = score
        bestShop = supplier.name
        bestPrice = price
      }
    }

    return {
      ...item,
      price: bestPrice,
      shop: bestShop || 'Market avg (no listed supplier)',
      inStock: !!bestShop,
    }
  })
}

/**
 * Price comparison for a single material across all suppliers that stock its
 * category.
 */
export const comparePrices = (materialId, location = 'Harare') => {
  const material = MATERIAL_DATABASE[materialId]
  if (!material) return []
  return suppliersForCategory(material.category)
    .map(s => ({
      shop: s.name,
      type: s.type,
      price: round2(material.suggestedPrice * (s.priceFactor ?? 1)),
      locations: s.locations,
      delivers: s.locations.includes(location),
      deliveryFee: s.deliveryFee,
      minOrder: s.minOrder,
    }))
    .sort((a, b) => a.price - b.price)
}

/**
 * Aggregate a BOQ into per-supplier totals (only real shops that carry the
 * assigned items).
 */
export const getShopRecommendations = (items, location = 'Harare') => {
  const shopTotals = {}
  items.forEach(item => {
    if (item.type === 'labor' || !item.shop || item.inStock === false) return
    if (!shopTotals[item.shop]) {
      shopTotals[item.shop] = { shop: item.shop, items: [], subtotal: 0, deliveryFee: 0, total: 0 }
    }
    shopTotals[item.shop].items.push(item)
    shopTotals[item.shop].subtotal += item.quantity * item.price
  })

  for (const shopName of Object.keys(shopTotals)) {
    const shop = Object.values(SUPPLIERS).find(s => s.name === shopName)
    if (shop) {
      const delivers = shop.locations.includes(location)
      shopTotals[shopName].deliveryFee = delivers ? shop.deliveryFee : shop.deliveryFee * 2
      shopTotals[shopName].delivers = delivers
      shopTotals[shopName].type = shop.type
      shopTotals[shopName].total = shopTotals[shopName].subtotal + shopTotals[shopName].deliveryFee
    }
  }

  return Object.values(shopTotals).sort((a, b) => a.total - b.total)
}

export const generateCompleteBOQ = (description, location = 'Harare') => {
  const items = generateSmartBOQ(description)
  const itemsWithShops = assignBestShops(items, location)
  const shopRecommendations = getShopRecommendations(itemsWithShops, location)
  const projectType = detectProjectType(description)
  return {
    items: itemsWithShops,
    shopRecommendations,
    projectType,
    size: detectSize(description, projectType),
  }
}

export default {
  generateSmartBOQ,
  assignBestShops,
  comparePrices,
  getShopRecommendations,
  generateCompleteBOQ,
  SUPPLIERS,
  HARDWARE_STORES,
  PROJECT_TEMPLATES,
}
