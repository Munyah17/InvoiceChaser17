/**
 * BOQ/BOM (Bill of Quantities/Bill of Materials) Engine
 * Provides price suggestions and material estimation for construction projects
 * Includes location-based pricing within 150km radius
 */

// Material database with suggested prices (base prices)
export const MATERIAL_DATABASE = {
  // Cement & Concrete
  cement_50kg: { name: 'Cement (50kg)', unit: 'bag', suggestedPrice: 12.50, category: 'Cement & Concrete' },
  sand_per_ton: { name: 'Sand (per ton)', unit: 'ton', suggestedPrice: 45.00, category: 'Cement & Concrete' },
  gravel_per_ton: { name: 'Gravel (per ton)', unit: 'ton', suggestedPrice: 55.00, category: 'Cement & Concrete' },
  concrete_per_m3: { name: 'Ready-mix Concrete (per m³)', unit: 'm³', suggestedPrice: 120.00, category: 'Cement & Concrete' },
  
  // Steel & Metal
  rebar_12mm: { name: 'Steel Rebar 12mm (per meter)', unit: 'm', suggestedPrice: 2.50, category: 'Steel & Metal' },
  rebar_16mm: { name: 'Steel Rebar 16mm (per meter)', unit: 'm', suggestedPrice: 4.50, category: 'Steel & Metal' },
  steel_plate: { name: 'Steel Plate (per kg)', unit: 'kg', suggestedPrice: 3.20, category: 'Steel & Metal' },
  angle_iron: { name: 'Angle Iron (per meter)', unit: 'm', suggestedPrice: 8.00, category: 'Steel & Metal' },
  
  // Wood & Timber
  timber_2x4: { name: 'Timber 2x4 (per meter)', unit: 'm', suggestedPrice: 4.50, category: 'Wood & Timber' },
  plywood_18mm: { name: 'Plywood 18mm (per sheet)', unit: 'sheet', suggestedPrice: 35.00, category: 'Wood & Timber' },
  treated_pine: { name: 'Treated Pine (per meter)', unit: 'm', suggestedPrice: 6.50, category: 'Wood & Timber' },
  
  // Roofing
  ibs_sheets: { name: 'IBS Roofing Sheets (per m²)', unit: 'm²', suggestedPrice: 25.00, category: 'Roofing' },
  roofing_tiles: { name: 'Roofing Tiles (per m²)', unit: 'm²', suggestedPrice: 45.00, category: 'Roofing' },
  gutters: { name: 'Gutters (per meter)', unit: 'm', suggestedPrice: 12.00, category: 'Roofing' },
  
  // Electrical
  cable_2_5mm: { name: 'Electrical Cable 2.5mm (per meter)', unit: 'm', suggestedPrice: 1.80, category: 'Electrical' },
  switch_socket: { name: 'Switch/Socket (each)', unit: 'each', suggestedPrice: 8.50, category: 'Electrical' },
  distribution_board: { name: 'Distribution Board (each)', unit: 'each', suggestedPrice: 150.00, category: 'Electrical' },
  
  // Plumbing
  pvc_pipe_50mm: { name: 'PVC Pipe 50mm (per meter)', unit: 'm', suggestedPrice: 5.50, category: 'Plumbing' },
  water_tank_1000L: { name: 'Water Tank 1000L (each)', unit: 'each', suggestedPrice: 350.00, category: 'Plumbing' },
  taps_fittings: { name: 'Taps & Fittings (set)', unit: 'set', suggestedPrice: 85.00, category: 'Plumbing' },
  
  // Finishing
  paint_20L: { name: 'Paint (20L)', unit: 'bucket', suggestedPrice: 180.00, category: 'Finishing' },
  ceramic_tiles: { name: 'Ceramic Tiles (per m²)', unit: 'm²', suggestedPrice: 35.00, category: 'Finishing' },
  laminate_flooring: { name: 'Laminate Flooring (per m²)', unit: 'm²', suggestedPrice: 55.00, category: 'Finishing' },
}

// Labor rates per hour
const LABOR_RATES = {
  general_worker: { name: 'General Worker', rate: 3.50 },
  skilled_worker: { name: 'Skilled Worker', rate: 6.00 },
  electrician: { name: 'Electrician', rate: 10.00 },
  plumber: { name: 'Plumber', rate: 10.00 },
  carpenter: { name: 'Carpenter', rate: 8.00 },
  mason: { name: 'Mason', rate: 7.50 },
}

// Location-based price adjustments (within 150km radius)
const LOCATION_MULTIPLIERS = {
  'Harare': 1.0,
  'Bulawayo': 0.95,
  'Chitungwiza': 1.05,
  'Mutare': 0.90,
  'Gweru': 0.92,
  'Kwekwe': 0.93,
  'Masvingo': 0.88,
  'Chinhoyi': 0.91,
  'Marondera': 0.94,
  'Norton': 0.96,
}

// Price cache with location and timestamp
const PRICE_CACHE = new Map()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Search for materials by name or category
 * @param {string} query - Search query
 * @returns {Array} - Matching materials
 */
export const searchMaterials = (query) => {
  const lowerQuery = query.toLowerCase()
  return Object.entries(MATERIAL_DATABASE)
    .filter(([key, material]) => 
      material.name.toLowerCase().includes(lowerQuery) ||
      material.category.toLowerCase().includes(lowerQuery)
    )
    .map(([key, material]) => ({
      id: key,
      ...material,
    }))
}

/**
 * Get suggested price for a material with location-based adjustment
 * @param {string} materialId - Material ID
 * @param {string} location - Location city
 * @returns {number} - Suggested price with location adjustment
 */
export const getSuggestedPrice = (materialId, location = 'Harare') => {
  const basePrice = MATERIAL_DATABASE[materialId]?.suggestedPrice || 0
  const multiplier = LOCATION_MULTIPLIERS[location] || 1.0
  return basePrice * multiplier
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if location is within 150km radius
 * @param {string} fromLocation - Starting location
 * @param {string} toLocation - Target location
 * @returns {boolean} - Is within 150km
 */
export const isWithinRadius = (fromLocation, toLocation) => {
  // Simplified location check - in production, use actual coordinates
  const distance = calculateDistance(
    -17.8292, 31.0522, // Harare coordinates
    -17.8292, 31.0522  // Would replace with actual coordinates
  )
  return distance <= 150
}

/**
 * Fetch real-time prices from external APIs (placeholder)
 * @param {string} materialId - Material ID
 * @param {string} location - Location
 * @returns {Promise<number>} - Real-time price or null
 */
export const fetchRealTimePrice = async (materialId, location) => {
  const cacheKey = `${materialId}-${location}`
  const cached = PRICE_CACHE.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.price
  }

  try {
    // Placeholder for API call to fetch real-time prices
    // In production, integrate with building materials APIs
    // Example: fetch from local suppliers, hardware stores, etc.
    const response = await fetch(`https://api.materials.example.com/price/${materialId}?location=${location}`)
    const data = await response.json()
    
    if (data.price) {
      PRICE_CACHE.set(cacheKey, {
        price: data.price,
        timestamp: Date.now()
      })
      return data.price
    }
  } catch (error) {
    console.log('Failed to fetch real-time price, using suggested price')
  }

  return null
}

/**
 * Get price with real-time fallback to suggested price
 * @param {string} materialId - Material ID
 * @param {string} location - Location
 * @returns {Promise<number>} - Price
 */
export const getPriceWithFallback = async (materialId, location) => {
  const realTimePrice = await fetchRealTimePrice(materialId, location)
  return realTimePrice || getSuggestedPrice(materialId, location)
}

/**
 * Calculate total cost for BOQ items
 * @param {Array} items - Array of items with quantity and price
 * @returns {Object} - Total cost and breakdown
 */
export const calculateBOQTotal = (items) => {
  let materialCost = 0
  let laborCost = 0
  let totalCost = 0
  
  const breakdown = items.map(item => {
    const itemTotal = (item.quantity || 0) * (item.price || 0)
    totalCost += itemTotal
    
    if (item.type === 'labor') {
      laborCost += itemTotal
    } else {
      materialCost += itemTotal
    }
    
    return {
      ...item,
      total: itemTotal,
    }
  })
  
  // Add 15% for contingencies
  const contingency = totalCost * 0.15
  const grandTotal = totalCost + contingency
  
  return {
    breakdown,
    materialCost,
    laborCost,
    contingency,
    totalCost,
    grandTotal,
  }
}

/**
 * Generate a complete BOQ from project specifications
 * @param {Object} projectSpec - Project specifications
 * @returns {Array} - Suggested BOQ items
 */
export const generateBOQSuggestions = (projectSpec) => {
  const suggestions = []
  
  // Foundation
  if (projectSpec.foundationArea) {
    const concreteVolume = projectSpec.foundationArea * 0.3 // 30cm depth
    suggestions.push({
      id: 'concrete_per_m3',
      name: MATERIAL_DATABASE.concrete_per_m3.name,
      quantity: concreteVolume,
      unit: MATERIAL_DATABASE.concrete_per_m3.unit,
      suggestedPrice: MATERIAL_DATABASE.concrete_per_m3.suggestedPrice,
      category: 'Foundation',
    })
    
    suggestions.push({
      id: 'rebar_12mm',
      name: MATERIAL_DATABASE.rebar_12mm.name,
      quantity: concreteVolume * 20, // 20m per m³
      unit: MATERIAL_DATABASE.rebar_12mm.unit,
      suggestedPrice: MATERIAL_DATABASE.rebar_12mm.suggestedPrice,
      category: 'Foundation',
    })
  }
  
  // Walls
  if (projectSpec.wallArea) {
    suggestions.push({
      id: 'cement_50kg',
      name: MATERIAL_DATABASE.cement_50kg.name,
      quantity: projectSpec.wallArea * 5, // 5 bags per m²
      unit: MATERIAL_DATABASE.cement_50kg.unit,
      suggestedPrice: MATERIAL_DATABASE.cement_50kg.suggestedPrice,
      category: 'Walls',
    })
    
    suggestions.push({
      id: 'sand_per_ton',
      name: MATERIAL_DATABASE.sand_per_ton.name,
      quantity: projectSpec.wallArea * 0.5,
      unit: MATERIAL_DATABASE.sand_per_ton.unit,
      suggestedPrice: MATERIAL_DATABASE.sand_per_ton.suggestedPrice,
      category: 'Walls',
    })
  }
  
  // Roofing
  if (projectSpec.roofArea) {
    suggestions.push({
      id: 'ibs_sheets',
      name: MATERIAL_DATABASE.ibs_sheets.name,
      quantity: projectSpec.roofArea * 1.1, // 10% wastage
      unit: MATERIAL_DATABASE.ibs_sheets.unit,
      suggestedPrice: MATERIAL_DATABASE.ibs_sheets.suggestedPrice,
      category: 'Roofing',
    })
    
    suggestions.push({
      id: 'timber_2x4',
      name: MATERIAL_DATABASE.timber_2x4.name,
      quantity: projectSpec.roofArea * 3,
      unit: MATERIAL_DATABASE.timber_2x4.unit,
      suggestedPrice: MATERIAL_DATABASE.timber_2x4.suggestedPrice,
      category: 'Roofing',
    })
  }
  
  // Labor estimation
  const estimatedHours = projectSpec.totalArea * 2 // 2 hours per m²
  suggestions.push({
    id: 'general_worker',
    name: LABOR_RATES.general_worker.name,
    quantity: estimatedHours,
    unit: 'hours',
    suggestedPrice: LABOR_RATES.general_worker.rate,
    type: 'labor',
    category: 'Labor',
  })
  
  return suggestions
}

/**
 * Export BOQ to CSV format
 * @param {Array} items - BOQ items
 * @returns {string} - CSV string
 */
export const exportBOQToCSV = (items) => {
  const headers = ['Item', 'Description', 'Quantity', 'Unit', 'Price', 'Total', 'Category']
  const rows = items.map(item => [
    item.id || '',
    item.name || '',
    item.quantity || 0,
    item.unit || '',
    item.price || 0,
    ((item.quantity || 0) * (item.price || 0)).toFixed(2),
    item.category || '',
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')
  
  return csvContent
}

/**
 * Export BOQ to Excel (SpreadsheetML .xls)
 * @param {Array} items - BOQ items
 * @param {Object} totals - Cost totals
 * @returns {string} - XML string
 */
export const exportBOQToExcel = (items, totals) => {
  const escapeXml = (str) => String(str).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])
  const rows = items.map(item => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
      <Cell><Data ss:Type="Number">${item.quantity}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.unit)}</Data></Cell>
      <Cell><Data ss:Type="Number">${item.price}</Data></Cell>
      <Cell><Data ss:Type="Number">${(item.quantity * item.price).toFixed(2)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(item.category)}</Data></Cell>
    </Row>`).join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="BOQ">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Item</Data></Cell>
        <Cell><Data ss:Type="String">Qty</Data></Cell>
        <Cell><Data ss:Type="String">Unit</Data></Cell>
        <Cell><Data ss:Type="String">Price</Data></Cell>
        <Cell><Data ss:Type="String">Total</Data></Cell>
        <Cell><Data ss:Type="String">Category</Data></Cell>
      </Row>
      ${rows}
      <Row></Row>
      <Row>
        <Cell><Data ss:Type="String">Materials</Data></Cell>
        <Cell><Data ss:Type="Number">${totals.materialCost.toFixed(2)}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Labor</Data></Cell>
        <Cell><Data ss:Type="Number">${totals.laborCost.toFixed(2)}</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">Grand Total</Data></Cell>
        <Cell><Data ss:Type="Number">${totals.grandTotal.toFixed(2)}</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`
}

/**
 * Get all material categories
 * @returns {Array} - Unique categories
 */
export const getMaterialCategories = () => {
  const categories = new Set(
    Object.values(MATERIAL_DATABASE).map(m => m.category)
  )
  return Array.from(categories).sort()
}

/**
 * Get materials by category
 * @param {string} category - Category name
 * @returns {Array} - Materials in category
 */
export const getMaterialsByCategory = (category) => {
  return Object.entries(MATERIAL_DATABASE)
    .filter(([key, material]) => material.category === category)
    .map(([key, material]) => ({
      id: key,
      ...material,
    }))
}

export default {
  searchMaterials,
  getSuggestedPrice,
  calculateBOQTotal,
  generateBOQSuggestions,
  exportBOQToCSV,
  getMaterialCategories,
  getMaterialsByCategory,
  MATERIAL_DATABASE,
  LABOR_RATES,
}
