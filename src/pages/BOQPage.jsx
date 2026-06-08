import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import Button from '../components/Button'
import Input from '../components/Input'
import {
  searchMaterials,
  getSuggestedPrice,
  calculateBOQTotal,
  generateBOQSuggestions,
  exportBOQToCSV,
  exportBOQToExcel,
  getMaterialCategories,
  MATERIAL_DATABASE,
} from '../utils/boqEngine'
import {
  generateCompleteBOQ,
  comparePrices,
  getShopRecommendations,
  HARDWARE_STORES,
} from '../utils/smartBOQEngine'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '../utils/dateFormat'

// Zimbabwe hardware shops
const ZIMBABWE_SHOPS = [
  'Buildit Zimbabwe', 'Cashbuild Zimbabwe', 'Fastbuild', 'Hardware Centre', 'TM Supermarket',
  'Varun Zimbabwe', 'Big Sky', 'Turnall', 'N.R. Barber', 'Powerspeed Electrical',
  'PG Industries', 'Roofmart', 'Zimtile', 'MacDonald Bricks', 'Beta Bricks',
  'Lafarge Cement Zimbabwe', 'PPC Zimbabwe', 'Zimconcrete', 'Steelnet Zimbabwe',
  'Border Timbers', 'G&D Construction', 'Sino Cement', 'Hardware & General',
  'Willdale Bricks', 'Murray & Roberts', 'Masimba', 'Exodus & Co', 'Other',
]

const DISCIPLINES = [
  'Mechanical Engineering', 'Civil Engineering', 'Mining Engineering', 'Construction Technology',
  'Production Engineering', 'Quantity Surveying', 'Public Works', 'Procurement Departments',
  'Stores Clerk', 'Project Planning and Management', 'Project Proposal', 'School Projects',
]

// Smart AI generation with automatic quantity calculation
const generateFromDescription = (description) => {
  const result = generateCompleteBOQ(description, 'Harare')
  return result.items
}

// Simple CSV parser
const parseCSV = (text) => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  const items = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    if (values.length >= 4) {
      items.push({
        id: `csv-${Date.now()}-${i}`,
        name: values[0] || 'Unknown',
        category: values[1] || 'General',
        quantity: parseFloat(values[2]) || 1,
        unit: values[3] || 'each',
        price: parseFloat(values[4]) || 0,
        type: 'material',
      })
    }
  }
  return items
}

const EMPTY_CUSTOM_BOQ = { name: '', category: '', quantity: 1, unit: 'each', price: '', shop: 'Other' }

export default function BOQPage() {
  const { userPlan, canGenerateBOQ, incrementBOQGeneration } = useStore()
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [projectDesc, setProjectDesc] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [logo, setLogo] = useState(null)
  const fileInputRef = useRef(null)
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM_BOQ)
  const [customShopInput, setCustomShopInput] = useState('')

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const categories = getMaterialCategories()

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query.length > 0) {
      setSearchResults(searchMaterials(query))
    } else {
      setSearchResults([])
    }
  }

  const handleAddItem = (materialId) => {
    const material = MATERIAL_DATABASE[materialId]
    if (material) {
      setItems([...items, {
        id: materialId,
        name: material.name,
        quantity: 1,
        unit: material.unit,
        price: material.suggestedPrice,
        category: material.category,
        type: 'material',
        shop: ZIMBABWE_SHOPS[Math.floor(Math.random() * (ZIMBABWE_SHOPS.length - 1))],
      }])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleAddCustomItem = () => {
    setItems([...items, {
      id: `custom-${Date.now()}`,
      name: 'Custom Item',
      quantity: 1,
      unit: 'each',
      price: 0,
      category: 'Custom',
      type: 'custom',
      shop: 'Other',
    }])
  }

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleAIGenerate = () => {
    setError('')
    if (!projectDesc.trim()) {
      setError('Please describe your project first')
      return
    }
    
    if (!canGenerateBOQ()) {
      setError(`Free plan: 1 BOQ generation per week. Upgrade to generate more.`)
      return
    }
    
    setGenerating(true)
    setTimeout(() => {
      const generated = generateFromDescription(projectDesc)
      if (generated.length === 0) {
        setError('Could not detect materials from description. Try being more specific (e.g., "house with cement, steel, roofing")')
      } else {
        setItems([...items, ...generated])
        incrementBOQGeneration()
      }
      setGenerating(false)
    }, 1200)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target.result
          // Extract text-like content from PDF binary
          const extracted = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
          const meaningful = extracted.slice(0, 2000)
          if (meaningful.length > 50) {
            setProjectDesc(`Extracted from PDF (${file.name}): ${meaningful.slice(0, 500)}...`)
            setError('')
          } else {
            setError('Could not extract readable text from PDF. Try typing the description manually.')
          }
        } catch (err) {
          setError('Error reading PDF')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const parsed = parseCSV(text)
        if (parsed.length > 0) {
          setItems([...items, ...parsed])
        } else {
          setError('Could not parse CSV. Ensure format: Name,Category,Quantity,Unit,Price')
        }
      } catch (err) {
        setError('Error parsing file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportCSV = () => {
    const csv = exportBOQToCSV(items)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BOQ_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const totals = calculateBOQTotal(items)
    const xml = exportBOQToExcel(items, totals)
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BOQ_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (items.length === 0) {
      alert('Please add items to the BOQ before exporting.')
      return
    }

    try {
      const doc = new jsPDF()
      const totals = calculateBOQTotal(items)

      // Add logo if exists
      if (logo) {
        try {
          doc.addImage(logo, 'JPEG', 14, 6, 28, 28)
        } catch (e) {
          console.warn('Logo could not be added:', e)
        }
      }

      // Header
      doc.setFontSize(18)
      doc.text('Bill of Quantities', logo ? 48 : 14, 20)
      doc.setFontSize(10)
      doc.text(`Discipline: ${discipline || 'General'}`, logo ? 48 : 14, 28)
      doc.text(`Generated: ${formatDate(new Date())}`, logo ? 48 : 14, 34)
      doc.text(`Plan: ${userPlan?.toUpperCase() || 'FREE'}`, logo ? 48 : 14, 40)

      // Table body
      const body = items.map(item => [
        item.name?.substring(0, 30) || '',
        item.category || '',
        String(item.quantity || 0),
        item.unit || '',
        `$${Number(item.price || 0).toFixed(2)}`,
        `$${(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}`,
        item.shop || 'Other',
      ])

      // Generate table
      autoTable(doc, {
        startY: logo ? 48 : 46,
        head: [['Item', 'Category', 'Qty', 'Unit', 'Price', 'Total', 'Shop']],
        body,
        theme: 'grid',
        headStyles: { fillColor: [26, 26, 26] },
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25 },
        },
        margin: { top: 50, left: 10, right: 10 },
      })

      // Summary
      const finalY = doc.lastAutoTable?.finalY || 100
      doc.text(`Material Cost: $${Number(totals.materialCost || 0).toFixed(2)}`, 14, finalY + 10)
      doc.text(`Labor Cost: $${Number(totals.laborCost || 0).toFixed(2)}`, 14, finalY + 16)
      doc.text(`Contingency (15%): $${Number(totals.contingency || 0).toFixed(2)}`, 14, finalY + 22)
      doc.setFontSize(12)
      doc.text(`Grand Total: $${Number(totals.grandTotal || 0).toFixed(2)}`, 14, finalY + 32)

      doc.save(`BOQ_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      alert(`PDF export failed: ${error.message || 'Unknown error'}`)
    }
  }

  const handleFetchPrices = () => {
    // Fetch real prices from Zimbabwe hardware stores with smart matching
    setItems(items.map(item => {
      if (item.type === 'labor') return item
      
      // Find best shop for this item
      const comparisons = comparePrices(item.id)
      if (comparisons.length > 0) {
        // Get cheapest option
        const best = comparisons[0]
        return { 
          ...item, 
          price: best.price,
          shop: best.shop
        }
      }
      
      // Fallback to database price if no shop has it
      const material = MATERIAL_DATABASE[item.id]
      if (material) {
        return { ...item, price: material.suggestedPrice, shop: 'Other' }
      }
      
      return item
    }))
  }

  const totals = calculateBOQTotal(items)

  return (
    <div className="animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Bill of Quantities (BOQ)</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">AI-powered construction cost estimation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">CSV</button>
          <button onClick={handleExportExcel} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Excel</button>
          <button onClick={handleExportPDF} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">PDF</button>
          <button onClick={handleAddCustomItem} className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:opacity-90 transition-opacity">+ Add</button>
        </div>
      </div>

      {/* Discipline & Logo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Discipline / Field / Industry</label>
          <select className="w-full mt-1.5 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={discipline} onChange={e => setDiscipline(e.target.value)}>
            <option value="">Select discipline...</option>
            {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Company Logo</label>
          <div className="flex items-center gap-2 mt-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`w-10 h-10 rounded border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center overflow-hidden ${!logo ? 'bg-neutral-50 dark:bg-neutral-950' : ''}`}>
                {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain" /> : <span className="text-xs text-neutral-400">+</span>}
              </div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{logo ? 'Change' : 'Upload'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            {logo && <button onClick={() => setLogo(null)} className="text-[10px] text-red-500">Remove</button>}
          </div>
        </div>
      </div>

      {/* Plan restriction notice */}
      {userPlan === 'free' && (
        <div className="mb-4 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span>Free plan: 1 AI generation per week.</span>
            <a href="/app/plans" className="font-semibold underline text-neutral-900 dark:text-white">Upgrade</a>
          </div>
        </div>
      )}

      {/* AI Project Description */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-900 dark:stroke-white fill-none stroke-2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">AI Project Generator</h3>
          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full font-medium">Beta</span>
        </div>
        <textarea
          className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500 h-20 resize-y leading-relaxed placeholder:text-neutral-400"
          placeholder="Simply describe your project: '3 room cottage', 'warehouse 200 sqm', 'school with 4 classrooms', 'office building 5 rooms'..."
          value={projectDesc}
          onChange={(e) => { setProjectDesc(e.target.value); setError('') }}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-neutral-400">Quick examples:</span>
          {['3 bedroom house', 'warehouse 150sqm', '2 room cottage', 'school classroom', 'office 5 rooms'].map(example => (
            <button
              key={example}
              onClick={() => setProjectDesc(example)}
              className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1.5">{error}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="text-[10px] text-neutral-400">
            Or <button onClick={() => fileInputRef.current?.click()} className="text-neutral-900 dark:text-white font-medium hover:underline">upload CSV, Excel, or PDF</button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFileUpload} className="hidden" />
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate BOQ'
            )}
          </button>
        </div>
      </div>

      {/* Material Search */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4">
        <div className="relative">
          <input
            type="text"
            className="w-full px-3 py-2 pl-9 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500 placeholder:text-neutral-400"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2 absolute left-3 top-2.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {searchResults.map((material) => (
                <button
                  key={material.id}
                  onClick={() => handleAddItem(material.id)}
                  className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
                >
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">{material.name}</div>
                  <div className="text-[10px] text-neutral-500">{material.category} · ${material.suggestedPrice}/{material.unit}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nearby Prices Button */}
      {items.length > 0 && (
        <div className="mb-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
          <button
            onClick={handleFetchPrices}
            className="flex items-center gap-2 text-xs text-neutral-900 dark:text-white font-medium hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors mb-2"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            Compare prices from real hardware stores
          </button>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(HARDWARE_STORES).slice(0, 6).map(shop => (
              <span key={shop.name} className="text-[9px] bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                {shop.name}
              </span>
            ))}
            <span className="text-[9px] text-neutral-400 px-1">+more</span>
          </div>
        </div>
      )}

      {/* BOQ Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Item</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Category</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-20">Qty</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-16">Unit</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-24">Price</th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-20">Total</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-32">Shop</th>
              <th className="px-4 py-2 text-center text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500"
                      value={item.name}
                      onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400">{item.category}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      className="w-16 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400">{item.unit}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      className="w-20 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none transition-all focus:border-neutral-400 dark:focus:border-neutral-500"
                      value={item.price.toFixed(2)}
                      onChange={(e) => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs font-semibold text-neutral-900 dark:text-white text-right">
                    ${(item.quantity * item.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <select className="w-full px-1 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-[10px] outline-none" value={item.shop || 'Other'} onChange={e => handleUpdateItem(index, 'shop', e.target.value)}>
                      {ZIMBABWE_SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="inline-flex items-center p-1 rounded text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-neutral-900 dark:text-white">No items yet</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Use AI generator or add items manually</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Cost Summary */}
      {items.length > 0 && (
        <div className="bg-neutral-900 dark:bg-white rounded-xl p-5 text-white dark:text-neutral-900">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">Cost Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 dark:text-neutral-500">Materials</span>
              <span className="font-medium">${totals.materialCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 dark:text-neutral-500">Labor</span>
              <span className="font-medium">${totals.laborCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 dark:text-neutral-500">Subtotal</span>
              <span className="font-medium">${totals.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 dark:text-neutral-500">Contingency (15%)</span>
              <span className="font-medium">${totals.contingency.toFixed(2)}</span>
            </div>
            <div className="border-t border-neutral-700 dark:border-neutral-200 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold">Grand Total</span>
              <span className="text-lg font-bold">${totals.grandTotal.toFixed(2)}</span>
            </div>
            {items.length > 0 && (
              <div className="pt-3 flex gap-1.5">
                <button onClick={handleExportCSV} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">CSV</button>
                <button onClick={handleExportExcel} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">Excel</button>
                <button onClick={handleExportPDF} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">PDF</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
