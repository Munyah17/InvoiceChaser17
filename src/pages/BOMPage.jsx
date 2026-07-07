import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import {
  searchMaterials,
  calculateBOQTotal,
  exportBOQToCSV,
  exportBOQToExcel,
  getMaterialCategories,
  MATERIAL_DATABASE,
} from '../utils/boqEngine'
import {
  comparePrices,
  HARDWARE_STORES,
} from '../utils/smartBOQEngine'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from '../utils/dateFormat'

// Zimbabwe hardware shops
const ZIMBABWE_SHOPS = [
  'Buildit Zimbabwe',
  'Cashbuild Zimbabwe',
  'Fastbuild',
  'Hardware Centre',
  'TM Supermarket',
  'Varun Zimbabwe',
  'Big Sky',
  'Turnall',
  'N.R. Barber',
  'Powerspeed Electrical',
  'PG Industries',
  'Roofmart',
  'Zimtile',
  'MacDonald Bricks',
  'Beta Bricks',
  'Lafarge Cement Zimbabwe',
  'PPC Zimbabwe',
  'Zimconcrete',
  'Steelnet Zimbabwe',
  'Border Timbers',
  'G&D Construction',
  'Sino Cement',
  'Hardware & General',
  'Willdale Bricks',
  'Murray & Roberts',
  'Masimba',
  'Exodus & Co',
  'Other',
]

const DISCIPLINES = [
  'Mechanical Engineering',
  'Civil Engineering',
  'Mining Engineering',
  'Construction Technology',
  'Production Engineering',
  'Quantity Surveying',
  'Public Works',
  'Procurement Departments',
  'Stores Clerk',
  'Project Planning and Management',
  'Project Proposal',
  'School Projects',
]

const EMPTY_CUSTOM = { name: '', category: '', quantity: 1, unit: 'each', price: '', shop: 'Other' }

export default function BOMPage() {
  const { userPlan } = useStore()
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [discipline, setDiscipline] = useState('')
  const [logo, setLogo] = useState(null)
  const fileInputRef = useRef(null)
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM)
  const [customShopInput, setCustomShopInput] = useState('')

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query.length > 0) setSearchResults(searchMaterials(query))
    else setSearchResults([])
  }

  const handleAddItem = (materialId) => {
    const material = MATERIAL_DATABASE[materialId]
    if (material) {
      setItems([...items, {
        id: materialId + '-' + Date.now(),
        name: material.name,
        quantity: 1,
        unit: material.unit,
        price: material.suggestedPrice,
        category: material.category,
        shop: 'Other',
      }])
      setSearchQuery('')
      setSearchResults([])
    }
  }

  const handleAddCustomItem = () => {
    setItems([...items, { id: `custom-${Date.now()}`, name: 'Custom Item', quantity: 1, unit: 'each', price: 0, category: 'Custom', shop: 'Other' }])
  }

  const handleSubmitCustom = () => {
    if (!customForm.name.trim()) return
    const shop = customForm.shop === 'Other' && customShopInput.trim() ? customShopInput.trim() : customForm.shop
    setItems([...items, {
      id: `custom-${Date.now()}`,
      name: customForm.name.trim(),
      category: customForm.category.trim() || 'Custom',
      quantity: parseFloat(customForm.quantity) || 1,
      unit: customForm.unit.trim() || 'each',
      price: parseFloat(customForm.price) || 0,
      shop,
    }])
    setCustomForm(EMPTY_CUSTOM)
    setCustomShopInput('')
  }

  const handleUpdateItem = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index))

  const handleExportCSV = () => {
    const csv = exportBOQToCSV(items)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BOM_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportExcel = () => {
    const totals = calculateBOQTotal(items)
    const xml = exportBOQToExcel(items.map(i => ({...i, type: 'material'})), totals)
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BOM_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    if (items.length === 0) {
      alert('Please add items to the BOM before exporting.')
      return
    }

    try {
      const doc = new jsPDF()

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
      doc.text('Bill of Materials', logo ? 48 : 14, 20)
      doc.setFontSize(10)
      doc.text(`Discipline: ${discipline || 'General'}`, logo ? 48 : 14, 28)
      doc.text(`Generated: ${formatDate(new Date())}`, logo ? 48 : 14, 34)

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
      doc.setFontSize(12)
      const total = items.reduce((s, i) => s + (Number(i.quantity || 0) * Number(i.price || 0)), 0)
      doc.text(`Grand Total: $${total.toFixed(2)}`, 14, finalY + 10)

      doc.save(`BOM_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF Export Error:', error)
      alert(`PDF export failed: ${error.message || 'Unknown error'}`)
    }
  }

  const grandTotal = items.reduce((sum, i) => sum + (i.quantity * i.price), 0)

  const handleFetchPrices = () => {
    // Fetch real prices from Zimbabwe hardware stores with smart matching
    setItems(items.map(item => {
      // Find best shop for this item
      const comparisons = comparePrices(item.id.replace(/-\d+$/, ''))
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
      return item
    }))
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-semibold text-lg text-neutral-900 dark:text-white">Bill of Materials (BOM)</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Pure materials list for manufacturing & procurement</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportCSV} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">CSV</button>
          <button onClick={handleExportExcel} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Excel</button>
          <button onClick={handleExportPDF} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">PDF</button>
          <button onClick={handleAddCustomItem} className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-lg hover:opacity-90 transition-opacity">+ Add</button>
        </div>
      </div>

      {/* Plan restriction notice */}
      {userPlan === 'free' && (
        <div className="mb-4 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <span>Free plan: 1 BOM per week.</span>
            <a href="/app/plans" className="font-semibold underline text-neutral-900 dark:text-white">Upgrade</a>
          </div>
        </div>
      )}

      {/* Discipline & Logo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Discipline / Field / Industry</label>
          <select
            className="w-full mt-1.5 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none"
            value={discipline}
            onChange={e => setDiscipline(e.target.value)}
          >
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

      {/* Search */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4">
        <div className="relative">
          <input type="text" className="w-full px-3 py-2 pl-9 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none placeholder:text-neutral-400"
            placeholder="Search materials..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2 absolute left-3 top-2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg max-h-48 overflow-y-auto overscroll-y-contain z-10">
              {searchResults.map(m => (
                <button key={m.id} onClick={() => handleAddItem(m.id)} className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                  <div className="text-xs font-medium text-neutral-900 dark:text-white">{m.name}</div>
                  <div className="text-[10px] text-neutral-500">{m.category} · ${m.suggestedPrice}/{m.unit}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Material Entry Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-neutral-500 fill-none stroke-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <h3 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Add Custom Material</h3>
          <span className="text-[10px] text-neutral-400">Type in any material not in the database</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="text" placeholder="Material name *" value={customForm.name}
            onChange={e => setCustomForm(f => ({...f, name: e.target.value}))}
            className="col-span-2 px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400" />
          <input type="text" placeholder="Category (e.g. Cement)" value={customForm.category}
            onChange={e => setCustomForm(f => ({...f, category: e.target.value}))}
            className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400" />
          <div className="flex gap-1">
            <input type="number" placeholder="Qty" min="0" value={customForm.quantity}
              onChange={e => setCustomForm(f => ({...f, quantity: e.target.value}))}
              className="w-16 px-2 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" />
            <input type="text" placeholder="Unit" value={customForm.unit}
              onChange={e => setCustomForm(f => ({...f, unit: e.target.value}))}
              className="flex-1 px-2 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none" />
          </div>
          <input type="number" placeholder="Price ($)" min="0" step="0.01" value={customForm.price}
            onChange={e => setCustomForm(f => ({...f, price: e.target.value}))}
            className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400" />
          <div className="flex gap-1">
            {!ZIMBABWE_SHOPS.slice(0, -1).includes(customForm.shop) ? (
              <input type="text" placeholder="Shop name" value={customShopInput}
                onChange={e => setCustomShopInput(e.target.value)}
                onBlur={() => { if (!customShopInput.trim()) setCustomForm(f => ({...f, shop: 'Other'})) }}
                className="flex-1 px-2 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400" />
            ) : (
              <select value={customForm.shop} onChange={e => {
                if (e.target.value === '__custom__') { setCustomForm(f => ({...f, shop: ''})); setCustomShopInput('') }
                else setCustomForm(f => ({...f, shop: e.target.value}))
              }} className="flex-1 px-2 py-2 text-[10px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none">
                {ZIMBABWE_SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__custom__">Type custom…</option>
              </select>
            )}
            <button onClick={handleSubmitCustom} disabled={!customForm.name.trim()}
              className="px-3 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              + Add
            </button>
          </div>
        </div>
      </div>

      {/* Price Comparison Button */}
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

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Item</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800">Category</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-20">Qty</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-16">Unit</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-24">Price</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-20">Total</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-32">Shop</th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-neutral-200 dark:border-neutral-800 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {items.length > 0 ? items.map((item, index) => (
              <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={item.name} onChange={e => handleUpdateItem(index, 'name', e.target.value)} /></td>
                <td className="px-3 py-2"><input type="text" className="w-full px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={item.category} onChange={e => handleUpdateItem(index, 'category', e.target.value)} /></td>
                <td className="px-3 py-2"><input type="number" className="w-16 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={item.quantity} onChange={e => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                <td className="px-3 py-2"><input type="text" className="w-14 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={item.unit} onChange={e => handleUpdateItem(index, 'unit', e.target.value)} /></td>
                <td className="px-3 py-2"><input type="number" className="w-20 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-xs outline-none" value={item.price.toFixed(2)} onChange={e => handleUpdateItem(index, 'price', parseFloat(e.target.value) || 0)} /></td>
                <td className="px-3 py-2 text-xs font-semibold text-neutral-900 dark:text-white text-right">${(item.quantity * item.price).toFixed(2)}</td>
                <td className="px-3 py-2">
                  {!ZIMBABWE_SHOPS.includes(item.shop) ? (
                    <div className="flex items-center gap-1">
                      <input type="text" value={item.shop} onChange={e => handleUpdateItem(index, 'shop', e.target.value)}
                        className="flex-1 px-2 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-[10px] outline-none" placeholder="Shop name" />
                      <button onClick={() => handleUpdateItem(index, 'shop', 'Other')} className="text-neutral-400 hover:text-neutral-600 text-[10px] px-1" title="Pick from list">↩</button>
                    </div>
                  ) : (
                    <select className="w-full px-1 py-1 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white text-[10px] outline-none"
                      value={item.shop} onChange={e => { if (e.target.value === '__custom__') handleUpdateItem(index, 'shop', ''); else handleUpdateItem(index, 'shop', e.target.value) }}>
                      {ZIMBABWE_SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="__custom__">Type custom…</option>
                    </select>
                  )}
                </td>
                <td className="px-3 py-2 text-center"><button onClick={() => handleRemoveItem(index)} className="inline-flex items-center p-1 rounded text-neutral-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg></button></td>
              </tr>
            )) : (
              <tr><td colSpan="8"><div className="flex flex-col items-center justify-center py-10 text-center"><div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div><p className="text-xs font-medium text-neutral-900 dark:text-white">No items yet</p><p className="text-[10px] text-neutral-500 mt-0.5">Search materials or add manually</p></div></td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Total */}
      {items.length > 0 && (
        <div className="bg-neutral-900 dark:bg-white rounded-xl p-5 text-white dark:text-neutral-900">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">Cost Summary</h3>
          <div className="border-t border-neutral-700 dark:border-neutral-200 pt-2 flex justify-between items-center">
            <span className="text-sm font-semibold">Grand Total</span>
            <span className="text-lg font-bold">${grandTotal.toFixed(2)}</span>
          </div>
          {items.length > 0 && (
            <div className="pt-3 flex gap-1.5">
              <button onClick={handleExportCSV} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">CSV</button>
              <button onClick={handleExportExcel} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">Excel</button>
              <button onClick={handleExportPDF} className="flex-1 py-1.5 text-[10px] font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">PDF</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
