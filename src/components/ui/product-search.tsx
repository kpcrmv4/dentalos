'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Package, AlertTriangle, Clock, Check, ChevronDown, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  supplier_name: string | null
  attributes: Record<string, string>
}

interface ProductWithStock extends Product {
  stock_items: StockItem[]
  total_available: number
  earliest_expiry: string | null
  days_until_expiry: number | null
}

interface SimilarProduct extends ProductWithStock {
  similarity_score: number
  similarity_reason: string
}

interface ProductSearchProps {
  onSelect: (product: ProductWithStock, stockItem?: StockItem) => void
  categoryId?: string | null
  supplierId?: string | null
  placeholder?: string
  showSimilar?: boolean
  selectedProductId?: string | null
  excludeProductIds?: string[]
  className?: string
}

export function ProductSearch({
  onSelect,
  categoryId,
  supplierId,
  placeholder = 'พิมพ์เพื่อค้นหาสินค้า เช่น 4.1x10, RC, Straumann...',
  showSimilar = true,
  selectedProductId,
  excludeProductIds = [],
  className = ''
}: ProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null)
  const [showStockSelection, setShowStockSelection] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowStockSelection(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search products
  const searchProducts = useCallback(async (term: string) => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Search products with stock info
      const { data, error } = await supabase.rpc('search_products_with_stock', {
        p_search_term: term || null,
        p_category_id: categoryId || null,
        p_supplier_id: supplierId || null,
        p_limit: 20
      })

      if (error) {
        console.error('Search error:', error)
        // Fallback to basic search
        await fallbackSearch(term)
      } else {
        const filtered = (data || []).filter(
          (p: ProductWithStock) => !excludeProductIds.includes(p.id)
        )
        setProducts(filtered)
      }
    } catch (err) {
      console.error('Search error:', err)
      await fallbackSearch(term)
    }
    
    setLoading(false)
  }, [categoryId, supplierId, excludeProductIds])

  // Fallback search if RPC not available
  const fallbackSearch = async (term: string) => {
    const supabase = createClient()
    
    let query = supabase
      .from('products')
      .select(`
        id, name, display_name, brand, ref_code, category_id,
        category:categories(name),
        supplier:suppliers(name)
      `)
      .eq('is_active', true)
      .limit(20)

    if (term) {
      query = query.or(`name.ilike.%${term}%,ref_code.ilike.%${term}%,brand.ilike.%${term}%,display_name.ilike.%${term}%`)
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    const { data } = await query

    if (data) {
      // Fetch stock for each product
      const productIds = data.map(p => p.id)
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'active')
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      const productsWithStock: ProductWithStock[] = data.map(p => {
        const stocks = (stockData || []).filter(s => s.product_id === p.id)
        const totalAvailable = stocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0)
        const earliestExpiry = stocks.find(s => s.expiry_date)?.expiry_date || null
        
        let daysUntilExpiry: number | null = null
        if (earliestExpiry) {
          const expDate = new Date(earliestExpiry)
          const today = new Date()
          daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          brand: p.brand,
          ref_code: p.ref_code,
          category_id: p.category_id,
          category_name: (p.category as any)?.name || null,
          supplier_name: (p.supplier as any)?.name || null,
          attributes: {},
          stock_items: stocks.map(s => ({
            ...s,
            available: s.quantity - s.reserved_quantity
          })),
          total_available: totalAvailable,
          earliest_expiry: earliestExpiry,
          days_until_expiry: daysUntilExpiry
        }
      })

      // Sort by expiry (FEFO) - items expiring soon first
      productsWithStock.sort((a, b) => {
        // Items with expiry come before items without
        if (a.earliest_expiry && !b.earliest_expiry) return -1
        if (!a.earliest_expiry && b.earliest_expiry) return 1
        if (a.earliest_expiry && b.earliest_expiry) {
          return new Date(a.earliest_expiry).getTime() - new Date(b.earliest_expiry).getTime()
        }
        return 0
      })

      setProducts(productsWithStock.filter(p => !excludeProductIds.includes(p.id)))
    }
  }

  // Find similar products
  const findSimilarProducts = useCallback(async (product: ProductWithStock) => {
    if (!showSimilar) return
    
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('find_similar_products', {
        p_product_id: product.id,
        p_limit: 5
      })

      if (error) {
        console.error('Similar search error:', error)
        // Fallback: find products in same category
        await fallbackSimilarSearch(product)
      } else {
        setSimilarProducts(data || [])
      }
    } catch (err) {
      await fallbackSimilarSearch(product)
    }
  }, [showSimilar])

  // Fallback similar search
  const fallbackSimilarSearch = async (product: ProductWithStock) => {
    if (!product.category_id) {
      setSimilarProducts([])
      return
    }

    const supabase = createClient()
    
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, display_name, brand, ref_code, category_id,
        category:categories(name),
        supplier:suppliers(name)
      `)
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .limit(5)

    if (data) {
      const productIds = data.map(p => p.id)
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'active')
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false })

      const similar: SimilarProduct[] = data.map(p => {
        const stocks = (stockData || []).filter(s => s.product_id === p.id)
        const totalAvailable = stocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0)
        const earliestExpiry = stocks.find(s => s.expiry_date)?.expiry_date || null
        
        let daysUntilExpiry: number | null = null
        if (earliestExpiry) {
          const expDate = new Date(earliestExpiry)
          const today = new Date()
          daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }

        return {
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          brand: p.brand,
          ref_code: p.ref_code,
          category_id: p.category_id,
          category_name: (p.category as any)?.name || null,
          supplier_name: (p.supplier as any)?.name || null,
          attributes: {},
          stock_items: stocks.map(s => ({
            ...s,
            available: s.quantity - s.reserved_quantity
          })),
          total_available: totalAvailable,
          earliest_expiry: earliestExpiry,
          days_until_expiry: daysUntilExpiry,
          similarity_score: 0.5,
          similarity_reason: 'หมวดหมู่เดียวกัน'
        }
      }).filter(p => p.total_available > 0)

      // Sort by expiry date (FEFO)
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

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      if (isOpen) {
        searchProducts(searchTerm)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm, isOpen, searchProducts])

  // Handle product selection
  const handleSelectProduct = (product: ProductWithStock) => {
    setSelectedProduct(product)
    
    // If product has multiple stock items, show selection
    if (product.stock_items.length > 1) {
      setShowStockSelection(true)
      findSimilarProducts(product)
    } else if (product.stock_items.length === 1) {
      // Auto-select single stock item
      onSelect(product, product.stock_items[0])
      setIsOpen(false)
      setSearchTerm(product.display_name || product.name)
    } else {
      // No stock available
      onSelect(product)
      setIsOpen(false)
      setSearchTerm(product.display_name || product.name)
    }
  }

  // Handle stock item selection
  const handleSelectStock = (stockItem: StockItem) => {
    if (selectedProduct) {
      onSelect(selectedProduct, stockItem)
      setIsOpen(false)
      setShowStockSelection(false)
      setSearchTerm(selectedProduct.display_name || selectedProduct.name)
    }
  }

  // Handle similar product selection
  const handleSelectSimilar = (product: SimilarProduct) => {
    handleSelectProduct(product)
  }

  // Get expiry status color
  const getExpiryColor = (daysUntilExpiry: number | null) => {
    if (daysUntilExpiry === null) return 'text-slate-500'
    if (daysUntilExpiry <= 30) return 'text-red-600'
    if (daysUntilExpiry <= 90) return 'text-amber-600'
    return 'text-emerald-600'
  }

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
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            setIsOpen(true)
            if (!searchTerm) searchProducts('')
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedProduct(null)
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : showStockSelection && selectedProduct ? (
            // Stock Selection View
            <div className="divide-y divide-slate-100">
              <div className="p-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {selectedProduct.display_name || selectedProduct.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      เลือก LOT ที่ต้องการใช้
                    </p>
                  </div>
                  <button
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

              {/* Stock Items */}
              <div className="max-h-48 overflow-y-auto">
                {selectedProduct.stock_items.map((stock) => (
                  <button
                    key={stock.id}
                    onClick={() => handleSelectStock(stock)}
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

              {/* Similar Products Suggestion */}
              {showSimilar && similarProducts.length > 0 && (
                <>
                  <div className="p-3 bg-amber-50 border-t border-amber-100">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-sm font-medium">แนะนำวัสดุที่คล้ายกัน (ใกล้หมดอายุ)</p>
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-amber-50/50">
                    {similarProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectSimilar(product)}
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
                          <p className="font-medium text-emerald-600">
                            {product.total_available} ชิ้น
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>ไม่พบสินค้าที่ค้นหา</p>
            </div>
          ) : (
            // Product List
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors ${
                    selectedProductId === product.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {product.display_name || product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {product.ref_code && (
                          <span className="text-xs text-slate-500 font-mono">
                            REF: {product.ref_code}
                          </span>
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
                        <p className="text-xs text-slate-500">
                          {product.stock_items.length} LOTs
                        </p>
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
  )
}

export default ProductSearch
