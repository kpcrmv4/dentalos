'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  User, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Search,
  X,
  Loader2,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface Case {
  id: string;
  case_number: string;
  scheduled_date: string;
  scheduled_time: string | null;
  procedure_type: string | null;
  tooth_number: string | null;
  traffic_light: string;
  patient: {
    full_name: string;
    hn_number: string | null;
  };
  dentist: {
    full_name: string;
  };
}

interface Product {
  id: string;
  name: string;
  display_name: string | null;
  brand: string | null;
  ref_code: string | null;
  category_name: string | null;
  total_available: number;
  earliest_expiry: string | null;
  stock_items: Array<{
    id: string;
    lot_number: string;
    expiry_date: string | null;
    quantity: number;
    reserved_quantity: number;
    available: number;
  }>;
}

interface ReservationItem {
  product_id: string;
  product_name: string;
  stock_id: string | null;
  lot_number: string;
  quantity: number;
  available: number;
}

function ReservationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caseId = searchParams.get('case_id');
  const supabase = createClient();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Fetch case data
  useEffect(() => {
    if (!caseId) return;

    const fetchCase = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('cases')
          .select(`
            id,
            case_number,
            scheduled_date,
            scheduled_time,
            procedure_type,
            tooth_number,
            traffic_light,
            patient:patients!cases_patient_id_fkey(full_name, hn_number),
            dentist:profiles!cases_dentist_id_fkey(full_name)
          `)
          .eq('id', caseId)
          .single();

        if (error) throw error;
        setCaseData(data as unknown as Case);
      } catch (error) {
        console.error('Error fetching case:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId, supabase]);

  // Search products
  const searchProducts = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Simple search using products table
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          display_name,
          brand,
          ref_code,
          category:categories(name)
        `)
        .or(`name.ilike.%${term}%,display_name.ilike.%${term}%,ref_code.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      // Get stock for each product
      const productsWithStock: Product[] = [];
      const productList = (data || []) as Array<{
        id: string;
        name: string;
        display_name: string | null;
        brand: string | null;
        ref_code: string | null;
        category: { name: string } | null;
      }>;
      
      for (const product of productList) {
        const { data: stockData } = await supabase
          .from('stock_items')
          .select('id, lot_number, expiry_date, quantity, reserved_quantity')
          .eq('product_id', product.id)
          .gt('quantity', 0)
          .order('expiry_date', { ascending: true });

        const stockItems = ((stockData || []) as Array<{
          id: string;
          lot_number: string;
          expiry_date: string | null;
          quantity: number;
          reserved_quantity: number;
        }>).map(s => ({
          ...s,
          available: s.quantity - s.reserved_quantity
        }));

        const totalAvailable = stockItems.reduce((sum, s) => sum + s.available, 0);

        if (totalAvailable > 0) {
          productsWithStock.push({
            id: product.id,
            name: product.name,
            display_name: product.display_name,
            brand: product.brand,
            ref_code: product.ref_code,
            category_name: product.category?.name || null,
            total_available: totalAvailable,
            earliest_expiry: stockItems[0]?.expiry_date || null,
            stock_items: stockItems
          });
        }
      }

      setSearchResults(productsWithStock);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSearch) {
        searchProducts(searchTerm);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, showSearch, searchProducts]);

  // Add item
  const addItem = (product: Product) => {
    const bestStock = product.stock_items[0]; // FEFO - first expiry first out
    if (!bestStock) return;

    setItems(prev => [...prev, {
      product_id: product.id,
      product_name: product.display_name || product.name,
      stock_id: bestStock.id,
      lot_number: bestStock.lot_number,
      quantity: 1,
      available: bestStock.available
    }]);

    setShowSearch(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update quantity
  const updateQuantity = (index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: Math.max(1, Math.min(quantity, item.available)) } : item
    ));
  };

  // Submit reservation
  const handleSubmit = async () => {
    if (!caseId || items.length === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use any type to bypass strict type checking
      const db = supabase as unknown as {
        from: (table: string) => {
          insert: (data: Record<string, unknown>) => Promise<{ error: Error | null }>;
          select: (columns: string) => {
            eq: (col: string, val: string) => {
              single: () => Promise<{ data: { reserved_quantity: number } | null }>;
            };
          };
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: Error | null }>;
          };
        };
      };

      for (const item of items) {
        if (!item.stock_id) continue;

        // Insert reservation
        const { error: reservationError } = await db
          .from('reservations')
          .insert({
            case_id: caseId,
            stock_item_id: item.stock_id,
            quantity: item.quantity,
            status: 'reserved',
            reserved_by: user.id
          });

        if (reservationError) throw reservationError;

        // Update stock reserved_quantity
        const { data: stockItem } = await db
          .from('stock_items')
          .select('reserved_quantity')
          .eq('id', item.stock_id)
          .single();

        if (stockItem) {
          await db
            .from('stock_items')
            .update({ 
              reserved_quantity: stockItem.reserved_quantity + item.quantity 
            })
            .eq('id', item.stock_id);
        }
      }

      // Update case traffic light
      await db
        .from('cases')
        .update({ traffic_light: 'green' })
        .eq('id', caseId);

      alert('จองวัสดุสำเร็จ');
      router.push('/dentist-dashboard');
    } catch (error) {
      console.error('Error saving reservation:', error);
      alert('เกิดข้อผิดพลาดในการจองวัสดุ');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!caseId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">ไม่พบรหัสเคส กรุณาเลือกเคสจาก Dashboard</p>
        <Link 
          href="/dentist-dashboard" 
          className="text-blue-600 hover:underline"
        >
          กลับไปหน้า Dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูลเคส...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">ไม่พบข้อมูลเคส</p>
        <Link 
          href="/dentist-dashboard" 
          className="text-blue-600 hover:underline"
        >
          กลับไปหน้า Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Case Info */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">เคส</p>
            <p className="font-semibold">{caseData.case_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">คนไข้</p>
            <p className="font-semibold">{caseData.patient?.full_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">วันผ่าตัด</p>
            <p className="font-semibold">{formatDate(caseData.scheduled_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ซี่ฟัน</p>
            <p className="font-semibold">{caseData.tooth_number || '-'}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">รายการวัสดุ</h3>
          <button
            onClick={() => setShowSearch(true)}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มวัสดุ
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">ยังไม่มีรายการวัสดุ</p>
            <p className="text-sm text-gray-400">กดปุ่ม &quot;เพิ่มวัสดุ&quot; เพื่อเริ่มจอง</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                <div className="flex-grow">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-gray-500">Lot: {item.lot_number} | คงเหลือ: {item.available}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-16 text-center border rounded px-2 py-1"
                      min="1"
                      max={item.available}
                    />
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      {items.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                ยืนยันการจอง ({items.length} รายการ)
              </>
            )}
          </button>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">ค้นหาวัสดุ</h3>
              <button onClick={() => setShowSearch(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="พิมพ์ชื่อวัสดุ, รหัส, หรือยี่ห้อ..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm.length >= 2 ? 'ไม่พบวัสดุที่ค้นหา' : 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา'}
                </div>
              ) : (
                <div className="divide-y">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{product.display_name || product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.brand && `${product.brand} | `}
                          {product.ref_code && `Ref: ${product.ref_code}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-600 font-medium">{product.total_available} ชิ้น</p>
                        {product.earliest_expiry && (
                          <p className="text-xs text-gray-400">
                            หมดอายุ: {new Date(product.earliest_expiry).toLocaleDateString('th-TH')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewReservationPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Link 
          href="/dentist-dashboard" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          กลับไปหน้า Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">จองวัสดุสำหรับเคส</h1>
          <p className="text-gray-600 mt-1">เลือกวัสดุที่ต้องการใช้สำหรับการผ่าตัด</p>
        </div>

        <Suspense fallback={
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-600">กำลังโหลด...</p>
          </div>
        }>
          <ReservationContent />
        </Suspense>
      </div>
    </div>
  );
}
