'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Search, Package, AlertTriangle, Clock, Check, ChevronDown, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Types
interface StockItem {
  id: string;
  product_id: string;
  lot_number: string;
  expiry_date: string | null;
  quantity: number;
  reserved_quantity: number;
  available: number;
}

interface Product {
  id: string;
  name: string;
  display_name: string | null;
  brand: string | null;
  ref_code: string | null;
  category_id: string | null;
  category_name: string | null;
  supplier_name: string | null;
  attributes: Record<string, string>;
}

interface ProductWithStock extends Product {
  stock_items: StockItem[];
  total_available: number;
  earliest_expiry: string | null;
  days_until_expiry: number | null;
}

interface SimilarProduct extends ProductWithStock {
  similarity_score: number;
  similarity_reason: string;
}

interface ProductSearchProps {
  onSelect: (product: ProductWithStock, stockItem?: StockItem) => void;
  categoryId?: string | null;
  supplierId?: string | null;
  placeholder?: string;
  showSimilar?: boolean;
  selectedProductId?: string | null;
  excludeProductIds?: string[];
  className?: string;
}

// Memoized expiry badge component
const ExpiryBadge = memo(function ExpiryBadge({ 
  daysUntilExpiry 
}: { 
  daysUntilExpiry: number | null 
}) {
  const config = useMemo(() => {
    if (daysUntilExpiry === null) {
      return null;
    }
    if (daysUntilExpiry <= 30) {
      return { className: 'bg-red-100 text-red-700', label: `หมดอายุใน ${daysUntilExpiry} วัน` };
    }
    if (daysUntilExpiry <= 90) {
      return { className: 'bg-amber-100 text-amber-700', label: `หมดอายุใน ${daysUntilExpiry} วัน` };
    }
    return { className: 'bg-slate-100 text-slate-600', label: `หมดอายุใน ${daysUntilExpiry} วัน` };
  }, [daysUntilExpiry]);

  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.className}`}>
      <Clock className="w-3 h-3" />
      {config.label}
    </span>
  );
});

// Memoized product item component
const ProductItem = memo(function ProductItem({
  product,
  isSelected,
  onClick
}: {
  product: ProductWithStock;
  isSelected: boolean;
  onClick: () => void;
}) {
  const displayName = useMemo(() => 
    product.display_name || product.name, 
    [product.display_name, product.name]
  );

  const availabilityClass = useMemo(() => {
    if (product.total_available <= 0) return 'text-red-600';
    if (product.total_available <= 5) return 'text-amber-600';
    return 'text-emerald-600';
  }, [product.total_available]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
        isSelected ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{displayName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {product.ref_code && (
              <span className="text-xs text-slate-500">REF: {product.ref_code}</span>
            )}
            {product.brand && (
              <span className="text-xs text-slate-500">{product.brand}</span>
            )}
            {product.category_name && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                {product.category_name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`font-semibold ${availabilityClass}`}>
            {product.total_available > 0 ? `${product.total_available} ชิ้น` : 'หมด'}
          </p>
          <ExpiryBadge daysUntilExpiry={product.days_until_expiry} />
        </div>
      </div>
    </button>
  );
});

// Memoized stock item component
const StockItemRow = memo(function StockItemRow({
  stock,
  onSelect
}: {
  stock: StockItem;
  onSelect: () => void;
}) {
  const daysUntilExpiry = useMemo(() => {
    if (!stock.expiry_date) return null;
    const expDate = new Date(stock.expiry_date);
    const today = new Date();
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [stock.expiry_date]);

  const expiryClass = useMemo(() => {
    if (!daysUntilExpiry) return '';
    if (daysUntilExpiry <= 30) return 'bg-red-50 border-red-200';
    if (daysUntilExpiry <= 90) return 'bg-amber-50 border-amber-200';
    return '';
  }, [daysUntilExpiry]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors ${expiryClass}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">LOT: {stock.lot_number}</p>
          {stock.expiry_date && (
            <p className="text-sm text-slate-500">
              หมดอายุ: {stock.expiry_date}
              {daysUntilExpiry !== null && daysUntilExpiry <= 90 && (
                <span className={`ml-2 ${daysUntilExpiry <= 30 ? 'text-red-600' : 'text-amber-600'}`}>
                  ({daysUntilExpiry} วัน)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{stock.available} ชิ้น</p>
          <p className="text-xs text-slate-500">
            (จอง {stock.reserved_quantity}/{stock.quantity})
          </p>
        </div>
      </div>
    </button>
  );
});

// Memoized similar product component
const SimilarProductItem = memo(function SimilarProductItem({
  product,
  onSelect
}: {
  product: SimilarProduct;
  onSelect: () => void;
}) {
  const displayName = useMemo(() => 
    product.display_name || product.name, 
    [product.display_name, product.name]
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full p-3 text-left border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
              แนะนำ
            </span>
            <span className="text-xs text-amber-700">{product.similarity_reason}</span>
          </div>
          <p className="font-medium text-slate-900 truncate">{displayName}</p>
          {product.ref_code && (
            <p className="text-xs text-slate-500">REF: {product.ref_code}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-emerald-600">{product.total_available} ชิ้น</p>
          <ExpiryBadge daysUntilExpiry={product.days_until_expiry} />
        </div>
      </div>
    </button>
  );
});

// Main ProductSearch component
export const ProductSearch = memo(function ProductSearch({
  onSelect,
  categoryId,
  supplierId,
  placeholder = 'พิมพ์เพื่อค้นหาสินค้า เช่น 4.1x10, RC, Straumann...',
  showSimilar = true,
  selectedProductId,
  excludeProductIds = [],
  className = ''
}: ProductSearchProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [showStockSelection, setShowStockSelection] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Memoized exclude set for O(1) lookup
  const excludeSet = useMemo(() => new Set(excludeProductIds), [excludeProductIds]);

  // Memoized filtered products
  const filteredProducts = useMemo(() => 
    products.filter(p => !excludeSet.has(p.id)),
    [products, excludeSet]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowStockSelection(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search products with fallback
  const searchProducts = useCallback(async (term: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.rpc('search_products_with_stock', {
        p_search_term: term || null,
        p_category_id: categoryId || null,
        p_supplier_id: supplierId || null,
        p_limit: 20
      });

      if (error) {
        console.error('Search error:', error);
        await fallbackSearch(term, supabase);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      await fallbackSearch(term, createClient());
    }

    setLoading(false);
  }, [categoryId, supplierId]);

  // Fallback search
  const fallbackSearch = useCallback(async (term: string, supabase: ReturnType<typeof createClient>) => {
    let query = supabase
      .from('products')
      .select(`
        id, name, display_name, brand, ref_code, category_id,
        category:categories(name),
        supplier:suppliers(name)
      `)
      .eq('is_active', true)
      .limit(20);

    if (term) {
      query = query.or(`name.ilike.%${term}%,ref_code.ilike.%${term}%,brand.ilike.%${term}%,display_name.ilike.%${term}%`);
    }
    if (categoryId) query = query.eq('category_id', categoryId);
    if (supplierId) query = query.eq('supplier_id', supplierId);

    const { data } = await query;

    if (data) {
      const productIds = data.map(p => p.id);
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 'active')
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      // Process in single pass
      const productsWithStock: ProductWithStock[] = data.map(p => {
        const stocks = (stockData || []).filter(s => s.product_id === p.id);
        const { totalAvailable, earliestExpiry } = stocks.reduce(
          (acc, s) => ({
            totalAvailable: acc.totalAvailable + (s.quantity - s.reserved_quantity),
            earliestExpiry: !acc.earliestExpiry && s.expiry_date ? s.expiry_date : acc.earliestExpiry
          }),
          { totalAvailable: 0, earliestExpiry: null as string | null }
        );

        let daysUntilExpiry: number | null = null;
        if (earliestExpiry) {
          daysUntilExpiry = Math.ceil(
            (new Date(earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
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
          stock_items: stocks.map(s => ({ ...s, available: s.quantity - s.reserved_quantity })),
          total_available: totalAvailable,
          earliest_expiry: earliestExpiry,
          days_until_expiry: daysUntilExpiry
        };
      });

      // Sort by FEFO
      productsWithStock.sort((a, b) => {
        if (a.earliest_expiry && !b.earliest_expiry) return -1;
        if (!a.earliest_expiry && b.earliest_expiry) return 1;
        if (a.earliest_expiry && b.earliest_expiry) {
          return new Date(a.earliest_expiry).getTime() - new Date(b.earliest_expiry).getTime();
        }
        return 0;
      });

      setProducts(productsWithStock);
    }
  }, [categoryId, supplierId]);

  // Find similar products
  const findSimilarProducts = useCallback(async (product: ProductWithStock) => {
    if (!showSimilar) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase.rpc('find_similar_products', {
        p_product_id: product.id,
        p_limit: 5
      });

      if (error) {
        // Fallback: same category products
        if (product.category_id) {
          const { data: fallbackData } = await supabase
            .from('products')
            .select('id, name, display_name, brand, ref_code, category_id')
            .eq('category_id', product.category_id)
            .eq('is_active', true)
            .neq('id', product.id)
            .limit(5);

          if (fallbackData) {
            setSimilarProducts(fallbackData.map(p => ({
              ...p,
              category_name: null,
              supplier_name: null,
              attributes: {},
              stock_items: [],
              total_available: 0,
              earliest_expiry: null,
              days_until_expiry: null,
              similarity_score: 0.5,
              similarity_reason: 'หมวดหมู่เดียวกัน'
            })));
          }
        }
      } else {
        setSimilarProducts(data || []);
      }
    } catch (err) {
      console.error('Similar search error:', err);
    }
  }, [showSimilar]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (isOpen) searchProducts(searchTerm);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, isOpen, searchProducts]);

  // Handlers
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
    if (products.length === 0) searchProducts('');
  }, [products.length, searchProducts]);

  const handleProductSelect = useCallback((product: ProductWithStock) => {
    setSelectedProduct(product);
    if (product.stock_items.length > 1) {
      setShowStockSelection(true);
    } else {
      onSelect(product, product.stock_items[0]);
      setSearchTerm(product.display_name || product.name);
      setIsOpen(false);
    }
    findSimilarProducts(product);
  }, [onSelect, findSimilarProducts]);

  const handleStockSelect = useCallback((stock: StockItem) => {
    if (selectedProduct) {
      onSelect(selectedProduct, stock);
      setSearchTerm(selectedProduct.display_name || selectedProduct.name);
      setIsOpen(false);
      setShowStockSelection(false);
    }
  }, [selectedProduct, onSelect]);

  const handleSimilarSelect = useCallback((product: SimilarProduct) => {
    handleProductSelect(product);
  }, [handleProductSelect]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    setSelectedProduct(null);
    setSimilarProducts([]);
    inputRef.current?.focus();
  }, []);

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
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="ml-2 text-slate-500">กำลังค้นหา...</span>
            </div>
          ) : showStockSelection && selectedProduct ? (
            /* Stock Selection View */
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">เลือก LOT</h3>
                <button
                  type="button"
                  onClick={() => setShowStockSelection(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                {selectedProduct.display_name || selectedProduct.name}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedProduct.stock_items
                  .filter(s => s.available > 0)
                  .map((stock) => (
                    <StockItemRow
                      key={stock.id}
                      stock={stock}
                      onSelect={() => handleStockSelect(stock)}
                    />
                  ))}
              </div>

              {/* Similar Products */}
              {showSimilar && similarProducts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    วัสดุที่คล้ายกัน (เรียงตามวันหมดอายุ)
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {similarProducts.map((product) => (
                      <SimilarProductItem
                        key={product.id}
                        product={product}
                        onSelect={() => handleSimilarSelect(product)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Product List View */
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>ไม่พบสินค้า</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    isSelected={product.id === selectedProductId}
                    onClick={() => handleProductSelect(product)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
