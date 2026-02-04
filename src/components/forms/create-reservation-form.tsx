'use client'

import { useState, useEffect } from 'react'
import { Modal, FormField, Input, Select, Button } from '@/components/ui/modal'
import { Plus, Trash2, AlertTriangle, Clock, Package, Search, X, Loader2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CreateReservationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface Case {
  id: string
  case_number: string
  patient_name: string
  scheduled_date: string
  tooth_number: string | null
  dentist_name: string | null
}

interface StockItem {
  id: string
  product_id: string
  lot_number: string
  expiry_date: string | null
  quantity: number
  reserved_quantity: number
  available: number
}

interface Product {
  id: string
  name: string
  display_name: string | null
  brand: string | null
  ref_code: string | null
  category_id: string | null
  category_name: string | null
  total_available: number
  earliest_expiry: string | null
  days_until_expiry: number | null
  stock_items: StockItem[]
}

interface SimilarProduct extends Product {
  similarity_score: number
  similarity_reason: string
}

interface ReservationItem {
  product_id: string
  product_name: string
  stock_id: string | null
  lot_number: string | null
  expiry_date: string | null
  quantity: number
  available: number
}

export function CreateReservationForm({ isOpen, onClose, onSuccess }: CreateReservationFormProps) {
  const [loading, setLoading] = useState(false)
  const [cases, setCases] = useState<Case[]>([])
  const [loadingCases, setLoadingCases] = useState(false)
  const [formData, setFormData] = useState({
    case_id: '',
  })
  const [items, setItems] = useState<ReservationItem[]>([
    { product_id: '', product_name: '', stock_id: null, lot_number: null, expiry_date: null, quantity: 1, available: 0 },
  ])

  // Product search states
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showStockSelection, setShowStockSelection] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Fetch cases on open
  useEffect(() => {
    if (isOpen) {
      fetchCases()
    }
  }, [isOpen])

  const fetchCases = async () => {
    setLoadingCases(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('cases')
        .select(`
          id, case_number, patient_name, scheduled_date, tooth_number,
          dentist:users!cases_dentist_id_fkey(full_name)
        `)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(50)

      if (error) throw error

      type CaseRow = {
        id: string;
        case_number: string;
        patient_name: string;
        scheduled_date: string;
        tooth_number: string;
        dentist: { full_name: string } | null;
      }
      const typedData = (data || []) as CaseRow[]
      setCases(typedData.map(c => ({
        id: c.id,
        case_number: c.case_number,
        patient_name: c.patient_name,
        scheduled_date: c.scheduled_date,
        tooth_number: c.tooth_number,
        dentist_name: c.dentist?.full_name || null
      })))
    } catch (err) {
      console.error('Error fetching cases:', err)
      // Use mock data as fallback
      setCases([
        { id: '1', case_number: 'C2026-0001', patient_name: 'คุณสมศักดิ์ ใจดี', scheduled_date: '2026-02-04', tooth_number: '36', dentist_name: 'ทพ.ภาคิน' },
        { id: '2', case_number: 'C2026-0002', patient_name: 'คุณมาลี สุขใจ', scheduled_date: '2026-02-04', tooth_number: '46', dentist_name: 'ทพ.สมหญิง' },
        { id: '3', case_number: 'C2026-0003', patient_name: 'คุณประสิทธิ์ มั่นคง', scheduled_date: '2026-02-05', tooth_number: '16', dentist_name: 'ทพ.ภาคิน' },
      ])
    }
    setLoadingCases(false)
  }

  // Search products with debounce
  useEffect(() => {
    if (activeSearchIndex === null) return

    const timer = setTimeout(() => {
      searchProducts(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, activeSearchIndex])

  const searchProducts = async (term: string) => {
    setSearchLoading(true)
    const supabase = createClient()

    try {
      // Try RPC function first
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
      const { data, error } = await rpcClient.rpc('search_products_with_stock', {
        p_search_term: term || null,
        p_category_id: null,
        p_supplier_id: null,
        p_limit: 15
      })

      if (error) {
        // Fallback to basic search
        await fallbackSearch(term)
      } else {
        setSearchResults((data || []) as Product[])
      }
    } catch (err) {
      await fallbackSearch(term)
    }
    setSearchLoading(false)
  }

  const fallbackSearch = async (term: string) => {
    const supabase = createClient()

    let query = supabase
      .from('products')
      .select(`
        id, name, display_name, brand, ref_code, category_id,
        category:categories(name)
      `)
      .eq('is_active', true)
      .limit(15)

    if (term) {
      query = query.or(`name.ilike.%${term}%,ref_code.ilike.%${term}%,brand.ilike.%${term}%,display_name.ilike.%${term}%`)
    }

    const { data } = await query

    if (data) {
      type ProductRow = {
        id: string;
        name: string;
        display_name: string | null;
        brand: string | null;
        ref_code: string | null;
        category_id: string | null;
        category: { name: string } | null;
      }
      type StockRow = {
        id: string;
        product_id: string;
        quantity: number;
        reserved_quantity: number;
        expiry_date: string | null;
        lot_number: string;
        location: string | null;
      }
      const typedData = data as ProductRow[]
      const productIds = typedData.map(p => p.id)
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'active')
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      const typedStockData = (stockData || []) as StockRow[]
      const products: Product[] = typedData.map(p => {
        const stocks = typedStockData.filter(s => s.product_id === p.id)
        const totalAvailable = stocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0)
        const earliestExpiry = stocks.find(s => s.expiry_date)?.expiry_date || null

        let daysUntilExpiry: number | null = null
        if (earliestExpiry) {
          daysUntilExpiry = Math.ceil((new Date(earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }

        return {
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          brand: p.brand,
          ref_code: p.ref_code,
          category_id: p.category_id,
          category_name: p.category?.name || null,
          total_available: totalAvailable,
          earliest_expiry: earliestExpiry,
          days_until_expiry: daysUntilExpiry,
          stock_items: stocks.map(s => ({
            ...s,
            available: s.quantity - s.reserved_quantity
          }))
        }
      })

      // Sort by FEFO
      products.sort((a, b) => {
        if (a.earliest_expiry && !b.earliest_expiry) return -1
        if (!a.earliest_expiry && b.earliest_expiry) return 1
        if (a.earliest_expiry && b.earliest_expiry) {
          return new Date(a.earliest_expiry).getTime() - new Date(b.earliest_expiry).getTime()
        }
        return 0
      })

      setSearchResults(products)
    }
  }

  const findSimilarProducts = async (product: Product) => {
    const supabase = createClient()

    try {
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
      const { data, error } = await rpcClient.rpc('find_similar_products', {
        p_product_id: product.id,
        p_limit: 5
      })

      if (error) {
        // Fallback
        await fallbackSimilarSearch(product)
      } else {
        setSimilarProducts((data || []) as SimilarProduct[])
      }
    } catch (err) {
      await fallbackSimilarSearch(product)
    }
  }

  const fallbackSimilarSearch = async (product: Product) => {
    if (!product.category_id) {
      setSimilarProducts([])
      return
    }

    const supabase = createClient()

    const { data } = await supabase
      .from('products')
      .select(`
        id, name, display_name, brand, ref_code, category_id,
        category:categories(name)
      `)
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(5)

    if (data) {
      type ProductRow = {
        id: string;
        name: string;
        display_name: string | null;
        brand: string | null;
        ref_code: string | null;
        category_id: string | null;
        category: { name: string } | null;
      }
      type StockRow = {
        id: string;
        product_id: string;
        quantity: number;
        reserved_quantity: number;
        expiry_date: string | null;
        lot_number: string;
        location: string | null;
      }
      const typedData = data as ProductRow[]
      const productIds = typedData.map(p => p.id)
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'active')
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      const typedStockData = (stockData || []) as StockRow[]
      const similar: SimilarProduct[] = typedData.map(p => {
        const stocks = typedStockData.filter(s => s.product_id === p.id)
        const totalAvailable = stocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0)
        const earliestExpiry = stocks.find(s => s.expiry_date)?.expiry_date || null

        let daysUntilExpiry: number | null = null
        if (earliestExpiry) {
          daysUntilExpiry = Math.ceil((new Date(earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }

        return {
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          brand: p.brand,
          ref_code: p.ref_code,
          category_id: p.category_id,
          category_name: p.category?.name || null,
          total_available: totalAvailable,
          earliest_expiry: earliestExpiry,
          days_until_expiry: daysUntilExpiry,
          stock_items: stocks.map(s => ({
            ...s,
            available: s.quantity - s.reserved_quantity
          })),
          similarity_score: 0.5,
          similarity_reason: 'หมวดหมู่เดียวกัน'
        }
      }).filter(p => p.total_available > 0)

      // Sort by FEFO
      similar.sort((a, b) => {
        if (a.earliest_expiry && !b.earliest_expiry) return -1
        if (!a.earliest_expiry && b.earliest_expiry) return 1
        if (a.earliest_expiry && b.earliest_expiry) {
          return new Date(a.earliest_expiry).getTime() - new Date(b.earliest_expiry).getTime()
        }
        return 0
      })

      setSimilarProducts(similar)
    }
  }

  const handleProductSelect = (product: Product, index: number) => {
    setSelectedProduct(product)

    if (product.stock_items.length > 1) {
      // Show stock selection
      setShowStockSelection(true)
      findSimilarProducts(product)
    } else if (product.stock_items.length === 1) {
      // Auto-select single stock
      const stock = product.stock_items[0]
      updateItemWithProduct(index, product, stock)
      closeSearch()
    } else {
      // No stock
      updateItemWithProduct(index, product, null)
      closeSearch()
    }
  }

  const handleStockSelect = (stock: StockItem) => {
    if (selectedProduct && activeSearchIndex !== null) {
      updateItemWithProduct(activeSearchIndex, selectedProduct, stock)
      closeSearch()
    }
  }

  const handleSimilarSelect = (product: SimilarProduct) => {
    if (activeSearchIndex !== null) {
      handleProductSelect(product, activeSearchIndex)
    }
  }

  const updateItemWithProduct = (index: number, product: Product, stock: StockItem | null) => {
    const newItems = [...items]
    newItems[index] = {
      product_id: product.id,
      product_name: product.display_name || product.name,
      stock_id: stock?.id || null,
      lot_number: stock?.lot_number || null,
      expiry_date: stock?.expiry_date || null,
      quantity: 1,
      available: stock?.available || product.total_available
    }
    setItems(newItems)
  }

  const openSearch = (index: number) => {
    setActiveSearchIndex(index)
    setSearchTerm('')
    setSearchResults([])
    setSimilarProducts([])
    setShowStockSelection(false)
    setSelectedProduct(null)
    searchProducts('')
  }

  const closeSearch = () => {
    setActiveSearchIndex(null)
    setSearchTerm('')
    setSearchResults([])
    setSimilarProducts([])
    setShowStockSelection(false)
    setSelectedProduct(null)
  }

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', stock_id: null, lot_number: null, expiry_date: null, quantity: 1, available: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...items]
    newItems[index].quantity = quantity
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    try {
      // Call reserve_stock function for each item
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
      for (const item of items) {
        if (!item.product_id || !item.stock_id) continue

        const { error } = await rpcClient.rpc('reserve_stock', {
          p_case_id: formData.case_id,
          p_stock_item_id: item.stock_id,
          p_quantity: item.quantity
        })

        if (error) throw error
      }

      onSuccess()
      onClose()
      setFormData({ case_id: '' })
      setItems([{ product_id: '', product_name: '', stock_id: null, lot_number: null, expiry_date: null, quantity: 1, available: 0 }])
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  const selectedCase = cases.find((c) => c.id === formData.case_id)

  // Get expiry badge
  const getExpiryBadge = (daysUntilExpiry: number | null, expiryDate: string | null) => {
    if (!expiryDate) return null

    const color = daysUntilExpiry !== null && daysUntilExpiry <= 30
      ? 'bg-red-100 text-red-700'
      : daysUntilExpiry !== null && daysUntilExpiry <= 90
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600'

    return (
      <span className={`px-1.5 py-0.5 text-xs rounded ${color}`}>
        {daysUntilExpiry !== null && daysUntilExpiry <= 90 && (
          <Clock className="w-3 h-3 inline mr-1" />
        )}
        EXP: {new Date(expiryDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
      </span>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="จองของสำหรับเคส" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="เลือกเคส" required>
          <Select
            value={formData.case_id}
            onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
            required
            disabled={loadingCases}
          >
            <option value="">{loadingCases ? 'กำลังโหลด...' : 'เลือกเคส'}</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.case_number} - {c.patient_name} ({c.scheduled_date})
              </option>
            ))}
          </Select>
        </FormField>

        {selectedCase && (
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-700">
              <strong>เคส:</strong> {selectedCase.case_number} |
              <strong> คนไข้:</strong> {selectedCase.patient_name} |
              <strong> ซี่ฟัน:</strong> {selectedCase.tooth_number || '-'} |
              <strong> วันนัด:</strong> {selectedCase.scheduled_date}
              {selectedCase.dentist_name && <> | <strong>ทันตแพทย์:</strong> {selectedCase.dentist_name}</>}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">รายการที่ต้องการจอง</h3>
            <p className="text-xs text-slate-500 mt-1">พิมพ์เพื่อค้นหา เช่น 4.1, RC, Straumann หรือ REF code</p>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Product Search */}
                  <div className="flex-1 relative">
                    <button
                      type="button"
                      onClick={() => openSearch(index)}
                      className={`w-full text-left px-3 py-2.5 border rounded-lg flex items-center justify-between ${
                        item.product_id
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-300 bg-slate-50'
                      }`}
                    >
                      {item.product_id ? (
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 truncate">{item.product_name}</p>
                          {item.lot_number && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              LOT: {item.lot_number}
                              {item.expiry_date && (
                                <span className="ml-2">
                                  {getExpiryBadge(
                                    Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                                    item.expiry_date
                                  )}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">คลิกเพื่อค้นหาสินค้า...</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                    </button>

                    {/* Search Dropdown */}
                    {activeSearchIndex === index && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-200">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="พิมพ์เพื่อค้นหา เช่น 4.1, RC, 021.5308..."
                              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={closeSearch}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {searchLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                          </div>
                        ) : showStockSelection && selectedProduct ? (
                          // Stock Selection
                          <div className="divide-y divide-slate-100">
                            <div className="p-3 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {selectedProduct.display_name || selectedProduct.name}
                                  </p>
                                  <p className="text-sm text-slate-500">เลือก LOT ที่ต้องการใช้</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowStockSelection(false)
                                    setSelectedProduct(null)
                                  }}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            <div className="max-h-40 overflow-y-auto">
                              {selectedProduct.stock_items.map((stock) => (
                                <button
                                  key={stock.id}
                                  type="button"
                                  onClick={() => handleStockSelect(stock)}
                                  disabled={stock.available <= 0}
                                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center justify-between ${
                                    stock.available <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <div>
                                    <p className="font-medium text-slate-900">LOT: {stock.lot_number}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {getExpiryBadge(
                                        stock.expiry_date ? Math.ceil((new Date(stock.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
                                        stock.expiry_date
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-medium ${stock.available > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      คงเหลือ: {stock.available}
                                    </p>
                                    {stock.reserved_quantity > 0 && (
                                      <p className="text-xs text-amber-600">จองแล้ว: {stock.reserved_quantity}</p>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Similar Products */}
                            {similarProducts.length > 0 && (
                              <>
                                <div className="p-3 bg-amber-50 border-t border-amber-100">
                                  <div className="flex items-center gap-2 text-amber-700">
                                    <AlertTriangle className="w-4 h-4" />
                                    <p className="text-sm font-medium">แนะนำวัสดุที่คล้ายกัน (ใกล้หมดอายุ)</p>
                                  </div>
                                </div>
                                <div className="max-h-32 overflow-y-auto bg-amber-50/50">
                                  {similarProducts.map((product) => (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => handleSimilarSelect(product)}
                                      className="w-full px-4 py-3 text-left hover:bg-amber-100 flex items-center justify-between border-b border-amber-100 last:border-0"
                                    >
                                      <div className="flex-1">
                                        <p className="font-medium text-slate-900">
                                          {product.display_name || product.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-slate-500">{product.similarity_reason}</span>
                                          {getExpiryBadge(product.days_until_expiry, product.earliest_expiry)}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-emerald-600">{product.total_available} ชิ้น</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ) : searchResults.length === 0 ? (
                          <div className="py-8 text-center text-slate-500">
                            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p>ไม่พบสินค้าที่ค้นหา</p>
                          </div>
                        ) : (
                          // Product List
                          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductSelect(product, index)}
                                className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">
                                      {product.display_name || product.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {product.ref_code && (
                                        <span className="text-xs text-slate-500 font-mono">REF: {product.ref_code}</span>
                                      )}
                                      {product.category_name && (
                                        <span className="px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                                          {product.category_name}
                                        </span>
                                      )}
                                      {getExpiryBadge(product.days_until_expiry, product.earliest_expiry)}
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className={`font-medium ${
                                      product.total_available > 5 ? 'text-emerald-600' :
                                      product.total_available > 0 ? 'text-amber-600' :
                                      'text-red-600'
                                    }`}>
                                      {product.total_available > 0 ? `${product.total_available} ชิ้น` : 'หมด'}
                                    </p>
                                    {product.stock_items.length > 1 && (
                                      <p className="text-xs text-slate-500">{product.stock_items.length} LOTs</p>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      max={item.available || 999}
                      placeholder="จำนวน"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                      required
                    />
                    {item.available > 0 && (
                      <p className="text-xs text-slate-500 mt-1 text-center">ว่าง: {item.available}</p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Warning if quantity exceeds available */}
                {item.quantity > item.available && item.available > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      จำนวนที่ต้องการ ({item.quantity}) มากกว่าที่มี ({item.available})
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการ
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={loading || !formData.case_id || items.every(i => !i.product_id)}
          >
            {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
