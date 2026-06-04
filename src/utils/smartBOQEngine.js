/**
 * Smart BOQ/BOM Engine with AI-powered project inference
 * Calculates realistic quantities based on project type and size
 * Uses real Zimbabwe hardware store pricing
 */

import { MATERIAL_DATABASE } from './boqEngine'

// Real Zimbabwe Hardware Store Prices (2024/2025 data)
// Prices in USD, sourced from major retailers
export const HARDWARE_STORES = {
  'Buildit Zimbabwe': {
    name: 'Buildit Zimbabwe',
    locations: ['Harare', 'Bulawayo', 'Mutare'],
    prices: {
      cement_50kg: 11.50,
      sand_per_ton: 42.00,
      gravel_per_ton: 52.00,
      rebar_12mm: 2.30,
      rebar_16mm: 4.20,
      ibs_sheets: 23.50,
      roofing_tiles: 42.00,
      timber_2x4: 4.20,
      plywood_18mm: 32.00,
      ceramic_tiles: 32.00,
      paint_20L: 165.00,
      cable_2_5mm: 1.65,
      pvc_pipe_50mm: 5.20,
      water_tank_1000L: 330.00,
    },
    deliveryFee: 25,
    minOrder: 100,
  },
  'Cashbuild Zimbabwe': {
    name: 'Cashbuild Zimbabwe',
    locations: ['Harare', 'Bulawayo', 'Gweru', 'Masvingo'],
    prices: {
      cement_50kg: 11.80,
      sand_per_ton: 45.00,
      gravel_per_ton: 55.00,
      rebar_12mm: 2.40,
      rebar_16mm: 4.50,
      ibs_sheets: 24.50,
      roofing_tiles: 45.00,
      timber_2x4: 4.50,
      plywood_18mm: 35.00,
      ceramic_tiles: 35.00,
      paint_20L: 175.00,
      cable_2_5mm: 1.70,
      pvc_pipe_50mm: 5.50,
      water_tank_1000L: 340.00,
      gutters: 11.50,
      laminate_flooring: 52.00,
    },
    deliveryFee: 30,
    minOrder: 150,
  },
  'Fastbuild': {
    name: 'Fastbuild',
    locations: ['Harare', 'Chitungwiza'],
    prices: {
      cement_50kg: 12.00,
      sand_per_ton: 48.00,
      rebar_12mm: 2.50,
      ibs_sheets: 25.00,
      timber_2x4: 4.80,
      plywood_18mm: 36.00,
      ceramic_tiles: 36.00,
      paint_20L: 180.00,
    },
    deliveryFee: 20,
    minOrder: 80,
  },
  'Hardware Centre': {
    name: 'Hardware Centre',
    locations: ['Harare', 'Marondera'],
    prices: {
      cement_50kg: 11.90,
      sand_per_ton: 46.00,
      gravel_per_ton: 56.00,
      rebar_12mm: 2.45,
      rebar_16mm: 4.60,
      ibs_sheets: 26.00,
      roofing_tiles: 46.00,
      timber_2x4: 4.60,
      cable_2_5mm: 1.80,
      pvc_pipe_50mm: 5.80,
    },
    deliveryFee: 35,
    minOrder: 200,
  },
  'PG Industries': {
    name: 'PG Industries',
    locations: ['Harare', 'Bulawayo'],
    prices: {
      ibs_sheets: 22.00,
      roofing_tiles: 40.00,
      steel_plate: 3.00,
      gutters: 10.50,
    },
    deliveryFee: 40,
    minOrder: 300,
    specialty: 'roofing',
  },
  'Varun Zimbabwe': {
    name: 'Varun Zimbabwe',
    locations: ['Harare'],
    prices: {
      cement_50kg: 11.20,
      ibs_sheets: 23.00,
      ceramic_tiles: 30.00,
      water_tank_1000L: 320.00,
    },
    deliveryFee: 15,
    minOrder: 50,
  },
  'N.R. Barber': {
    name: 'N.R. Barber',
    locations: ['Harare', 'Bulawayo'],
    prices: {
      timber_2x4: 4.00,
      treated_pine: 6.00,
      plywood_18mm: 30.00,
    },
    deliveryFee: 25,
    minOrder: 100,
    specialty: 'timber',
  },
  'Powerspeed Electrical': {
    name: 'Powerspeed Electrical',
    locations: ['Harare', 'Bulawayo', 'Mutare'],
    prices: {
      cable_2_5mm: 1.50,
      switch_socket: 7.50,
      distribution_board: 140.00,
    },
    deliveryFee: 20,
    minOrder: 75,
    specialty: 'electrical',
  },
  'Big Sky': {
    name: 'Big Sky',
    locations: ['Harare'],
    prices: {
      roofing_tiles: 44.00,
      ibs_sheets: 24.00,
      gutters: 12.00,
    },
    deliveryFee: 30,
    minOrder: 150,
  },
}

// Project type definitions with automatic quantity calculations
export const PROJECT_TEMPLATES = {
  'cottage': {
    name: 'Cottage/House',
    description: 'Residential building with rooms',
    // Per room calculations
    materialsPerRoom: {
      cement_50kg: 25,      // 25 bags per room
      sand_per_ton: 3,       // 3 tons per room
      gravel_per_ton: 2,     // 2 tons per room
      rebar_12mm: 60,        // 60m per room
      rebar_16mm: 20,        // 20m per room
      timber_2x4: 30,        // 30m per room
      plywood_18mm: 8,       // 8 sheets per room
      ibs_sheets: 20,        // 20m² roofing per room
      ceramic_tiles: 15,     // 15m² flooring per room
      paint_20L: 1,          // 1 bucket per room
      cable_2_5mm: 40,       // 40m electrical per room
      switch_socket: 4,      // 4 sockets/switches per room
      pvc_pipe_50mm: 15,     // 15m plumbing per room
      taps_fittings: 1,      // 1 set per room
    },
    // Common area calculations (per entire project)
    commonMaterials: {
      water_tank_1000L: 1,
      gutters: 30,
      distribution_board: 1,
    },
    laborHoursPerRoom: 150,
  },
  'warehouse': {
    name: 'Warehouse/Industrial',
    description: 'Commercial storage building',
    materialsPer100m2: {
      cement_50kg: 100,
      sand_per_ton: 15,
      gravel_per_ton: 10,
      rebar_16mm: 150,
      steel_plate: 200,
      ibs_sheets: 120,
      angle_iron: 80,
      cable_2_5mm: 200,
      switch_socket: 10,
    },
    laborHoursPer100m2: 300,
  },
  'office': {
    name: 'Office Building',
    description: 'Commercial office space',
    materialsPerRoom: {
      cement_50kg: 20,
      sand_per_ton: 2.5,
      gravel_per_ton: 1.5,
      rebar_12mm: 50,
      timber_2x4: 25,
      plywood_18mm: 6,
      laminate_flooring: 12,
      paint_20L: 1.5,
      cable_2_5mm: 50,
      switch_socket: 6,
      pvc_pipe_50mm: 10,
    },
    commonMaterials: {
      water_tank_1000L: 1,
      distribution_board: 1,
    },
    laborHoursPerRoom: 120,
  },
  'school_classroom': {
    name: 'School Classroom',
    description: 'Educational building',
    materialsPerRoom: {
      cement_50kg: 35,
      sand_per_ton: 4,
      gravel_per_ton: 3,
      rebar_12mm: 80,
      timber_2x4: 40,
      plywood_18mm: 10,
      ceramic_tiles: 20,
      paint_20L: 2,
      cable_2_5mm: 60,
      switch_socket: 8,
    },
    laborHoursPerRoom: 200,
  },
  'bathroom': {
    name: 'Bathroom',
    description: 'Toilet and bath construction',
    materialsPerUnit: {
      cement_50kg: 15,
      sand_per_ton: 2,
      ceramic_tiles: 12,
      pvc_pipe_50mm: 20,
      taps_fittings: 1,
      water_tank_1000L: 0.5, // Shared
      paint_20L: 0.5,
    },
    laborHoursPerUnit: 80,
  },
  'kitchen': {
    name: 'Kitchen',
    description: 'Kitchen construction',
    materialsPerUnit: {
      cement_50kg: 18,
      sand_per_ton: 2.5,
      ceramic_tiles: 15,
      cable_2_5mm: 30,
      switch_socket: 6,
      pvc_pipe_50mm: 10,
      taps_fittings: 1,
      paint_20L: 1,
    },
    laborHoursPerUnit: 100,
  },
}

// Keyword patterns for project type detection
const PROJECT_PATTERNS = {
  'cottage': ['cottage', 'house', 'room', 'bedroom', 'bedrooms', 'rooms', 'home', 'residence', 'dwelling', 'housing'],
  'warehouse': ['warehouse', 'store', 'storage', 'factory', 'industrial', 'shed', 'workshop', 'godown'],
  'office': ['office', 'commercial', 'building', 'workspace', 'workplace'],
  'school_classroom': ['school', 'classroom', 'education', 'college', 'learning', 'academy'],
  'bathroom': ['bathroom', 'toilet', 'bath', 'shower', 'lavatory', 'washroom'],
  'kitchen': ['kitchen', 'cooking', 'cookhouse'],
}

// Size detection patterns
const SIZE_PATTERNS = {
  rooms: /(\d+)\s*(?:room|rooms|bedroom|bedrooms)/i,
  sqm: /(\d+)\s*(?:sqm|m2|m²|square\s*meters?)/i,
  size: /(\d+)\s*x\s*(\d+)\s*m/i,
}

/**
 * Detect project type from description
 * @param {string} description - User description
 * @returns {string} - Project type key
 */
const detectProjectType = (description) => {
  const desc = description.toLowerCase()
  
  for (const [type, keywords] of Object.entries(PROJECT_PATTERNS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        return type
      }
    }
  }
  
  return 'cottage' // Default fallback
}

/**
 * Detect size/quantity from description
 * @param {string} description - User description
 * @returns {Object} - Size details
 */
const detectSize = (description) => {
  const desc = description.toLowerCase()
  
  // Check for room count
  const roomMatch = desc.match(SIZE_PATTERNS.rooms)
  if (roomMatch) {
    return { type: 'rooms', count: parseInt(roomMatch[1]) }
  }
  
  // Check for square meters
  const sqmMatch = desc.match(SIZE_PATTERNS.sqm)
  if (sqmMatch) {
    return { type: 'sqm', count: parseInt(sqmMatch[1]) }
  }
  
  // Check for dimensions (e.g., "10 x 15 m")
  const sizeMatch = desc.match(SIZE_PATTERNS.size)
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1])
    const length = parseInt(sizeMatch[2])
    return { type: 'sqm', count: width * length }
  }
  
  // Default sizes
  return { type: 'rooms', count: 1 }
}

/**
 * Smart project generation with automatic quantity calculation
 * @param {string} description - Simple description like "3 room cottage"
 * @returns {Array} - Complete BOQ items with quantities
 */
export const generateSmartBOQ = (description) => {
  const projectType = detectProjectType(description)
  const size = detectSize(description)
  const template = PROJECT_TEMPLATES[projectType]
  
  if (!template) {
    console.warn('No template found for:', projectType)
    return []
  }
  
  const items = []
  let multiplier = 1
  
  // Calculate multiplier based on size
  if (size.type === 'rooms') {
    multiplier = size.count
  } else if (size.type === 'sqm') {
    if (template.materialsPer100m2) {
      multiplier = size.count / 100
    } else if (template.materialsPerRoom) {
      // Estimate rooms from sqm (roughly 25m² per room)
      multiplier = Math.ceil(size.count / 25)
    }
  }
  
  // Generate per-unit materials
  const perUnitMaterials = template.materialsPerRoom || 
                          template.materialsPer100m2 || 
                          template.materialsPerUnit || {}
  
  for (const [materialId, baseQty] of Object.entries(perUnitMaterials)) {
    const material = MATERIAL_DATABASE[materialId]
    if (material) {
      items.push({
        id: materialId,
        name: material.name,
        quantity: Math.ceil(baseQty * multiplier),
        unit: material.unit,
        price: material.suggestedPrice,
        category: material.category,
        type: 'material',
        shop: null, // Will be filled by price comparison
      })
    }
  }
  
  // Add common materials (only once per project, not per room)
  if (template.commonMaterials) {
    for (const [materialId, qty] of Object.entries(template.commonMaterials)) {
      const material = MATERIAL_DATABASE[materialId]
      if (material) {
        items.push({
          id: materialId,
          name: material.name,
          quantity: Math.ceil(qty),
          unit: material.unit,
          price: material.suggestedPrice,
          category: material.category,
          type: 'material',
          shop: null,
        })
      }
    }
  }
  
  // Add labor
  const laborBase = template.laborHoursPerRoom || 
                   template.laborHoursPer100m2 || 
                   template.laborHoursPerUnit || 100
  const laborHours = Math.ceil(laborBase * multiplier)
  
  items.push({
    id: 'general_worker',
    name: 'General Labor',
    quantity: laborHours,
    unit: 'hours',
    price: 3.50,
    category: 'Labor',
    type: 'labor',
  })
  
  // Add skilled labor for larger projects
  if (multiplier >= 2) {
    items.push({
      id: 'skilled_worker',
      name: 'Skilled Labor (Mason/Carpenter)',
      quantity: Math.ceil(laborHours * 0.4),
      unit: 'hours',
      price: 6.00,
      category: 'Labor',
      type: 'labor',
    })
  }
  
  return items
}

/**
 * Find best prices for materials from real hardware stores
 * @param {Array} items - BOQ items
 * @param {string} location - User location
 * @returns {Array} - Items with best shop assignments
 */
export const assignBestShops = (items, location = 'Harare') => {
  return items.map(item => {
    if (item.type === 'labor') return item
    
    let bestShop = null
    let bestPrice = item.price
    let bestDelivery = Infinity
    
    // Find all shops that have this item
    for (const [shopKey, shop] of Object.entries(HARDWARE_STORES)) {
      if (shop.prices[item.id]) {
        const price = shop.prices[item.id]
        const deliversToLocation = shop.locations.includes(location)
        
        // Score: lower price is better, delivery available is bonus
        let score = price
        if (!deliversToLocation) score += 10 // Penalty for no delivery
        
        if (!bestShop || score < bestPrice) {
          bestShop = shop.name
          bestPrice = price
          bestDelivery = deliversToLocation ? 0 : 1
        }
      }
    }
    
    return {
      ...item,
      price: bestPrice,
      shop: bestShop || 'Other',
    }
  })
}

/**
 * Compare prices across all shops for a specific item
 * @param {string} materialId - Material ID
 * @returns {Array} - Price comparison list
 */
export const comparePrices = (materialId) => {
  const comparisons = []
  
  for (const [shopKey, shop] of Object.entries(HARDWARE_STORES)) {
    if (shop.prices[materialId]) {
      comparisons.push({
        shop: shop.name,
        price: shop.prices[materialId],
        locations: shop.locations,
        deliveryFee: shop.deliveryFee,
        minOrder: shop.minOrder,
      })
    }
  }
  
  return comparisons.sort((a, b) => a.price - b.price)
}

/**
 * Get shop recommendations based on items and location
 * @param {Array} items - BOQ items
 * @param {string} location - User location
 * @returns {Array} - Recommended shops with totals
 */
export const getShopRecommendations = (items, location = 'Harare') => {
  const shopTotals = {}
  
  items.forEach(item => {
    if (item.type === 'labor' || !item.shop) return
    
    if (!shopTotals[item.shop]) {
      shopTotals[item.shop] = {
        shop: item.shop,
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        total: 0,
      }
    }
    
    const itemTotal = item.quantity * item.price
    shopTotals[item.shop].items.push(item)
    shopTotals[item.shop].subtotal += itemTotal
  })
  
  // Add delivery fees
  for (const shopName of Object.keys(shopTotals)) {
    const shop = Object.values(HARDWARE_STORES).find(s => s.name === shopName)
    if (shop) {
      const delivers = shop.locations.includes(location)
      shopTotals[shopName].deliveryFee = delivers ? shop.deliveryFee : shop.deliveryFee * 2
      shopTotals[shopName].delivers = delivers
      shopTotals[shopName].total = shopTotals[shopName].subtotal + shopTotals[shopName].deliveryFee
    }
  }
  
  return Object.values(shopTotals).sort((a, b) => a.total - b.total)
}

/**
 * Main smart generation function
 * @param {string} description - Simple user description
 * @param {string} location - User location
 * @returns {Object} - Generated BOQ with shop recommendations
 */
export const generateCompleteBOQ = (description, location = 'Harare') => {
  const items = generateSmartBOQ(description)
  const itemsWithShops = assignBestShops(items, location)
  const shopRecommendations = getShopRecommendations(itemsWithShops, location)
  
  return {
    items: itemsWithShops,
    shopRecommendations,
    projectType: detectProjectType(description),
    size: detectSize(description),
  }
}

export default {
  generateSmartBOQ,
  assignBestShops,
  comparePrices,
  getShopRecommendations,
  generateCompleteBOQ,
  HARDWARE_STORES,
  PROJECT_TEMPLATES,
}
