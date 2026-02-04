'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Package, Filter, AlertCircle, Check, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'

interface Product {
  id: string
  name: string
  sku: string | null
  ref_code: string | null
  brand: string | null
  size: string | null
  unit: string | null
  description: string | null
  standard_cost: number | null
  reorder_point: number
  is_active: boolean
  supplier_id: string | null
  category_id: string | null
  supplier?: { name: string } | null
  category?: { name: string } | null
  created_at: string
}

interface Supplier {
  id: string
  name: string
  code: string | null
}

interface Category {
  id: string
  name: string
}

interface DuplicateCheck {
  field: string
  value: string
  exists: boolean
  existingProduct?: Product
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active')
  const [duplicateChecks, setDuplicateChecks] = useState<DuplicateCheck[]>([])
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    ref_code: '',
    brand: '',
    size: '',
    unit: 'ชิ้น',
    description: '',
    standard_cost: '',
    reorder_point: '5',
    supplier_id: '',
    category_id: '',
    is_active: true,
  })

  const fetchProducts = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        supplier:suppliers(name),
        category:categories(name)
      `)
      .order('name')
    
    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  const fetchMasterData = async () => {
    const supabase = createClient()
    
    const [suppliersRes, categoriesRes] = await Promise.all([
      supabase.from('suppliers').select('id, name, code').eq('is_active', true).order('name'),
      supabase.from('categories').select('id, name').order('sort_order'),
    ])
    
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
  }

  useEffect(() => {
    fetchProducts()
    fetchMasterData()
  }, [])

  // Check for duplicates when name, sku, or ref_code changes
  const checkDuplicates = async (field: 'name' | 'sku' | 'ref_code', value: string) => {
    if (!value.trim()) {
      setDuplicateChecks(prev => prev.filter(c => c.field !== field))
      return
    }

    setCheckingDuplicate(true)
    const supabase = createClient()
    
    let query = supabase.from('products').select('id, name, sku, ref_code, brand, size')
    
    if (field === 'name') {
      query = query.ilike('name', `%${value}%`)
    } else if (field === 'sku') {
      query = query.eq('sku', value)
    } else if (field === 'ref_code') {
      query = query.eq('ref_code', value)
    }
    
    // Exclude current product if editing
    if (editingProduct) {
      query = query.neq('id', editingProduct.id)
    }
    
    const { data } = await query.limit(1)
    
    setDuplicateChecks(prev => {
      const filtered = prev.filter(c => c.field !== field)
      if (data && data.length > 0) {
        return [...filtered, { field, value, exists: true, existingProduct: data[0] as Product }]
      }
      return filtered
    })
    
    setCheckingDuplicate(false)
  }

  // Debounced duplicate check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) checkDuplicates('name', formData.name)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.name])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.sku) checkDuplicates('sku', formData.sku)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.sku])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.ref_code) checkDuplicates('ref_code', formData.ref_code)
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.ref_code])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.ref_code && product.ref_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesCategory = !filterCategory || product.category_id === filterCategory
      const matchesSupplier = !filterSupplier || product.supplier_id === filterSupplier
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && product.is_active) ||
        (filterStatus === 'inactive' && !product.is_active)
      
      return matchesSearch && matchesCategory && matchesSupplier && matchesStatus
    })
  }, [products, searchQuery, filterCategory, filterSupplier, filterStatus])

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        sku: product.sku || '',
        ref_code: product.ref_code || '',
        brand: product.brand || '',
        size: product.size || '',
        unit: product.unit || 'ชิ้น',
        description: product.description || '',
        standard_cost: product.standard_cost?.toString() || '',
        reorder_point: product.reorder_point.toString(),
        supplier_id: product.supplier_id || '',
        category_id: product.category_id || '',
        is_active: product.is_active,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        sku: '',
        ref_code: '',
        brand: '',
        size: '',
        unit: 'ชิ้น',
        description: '',
        standard_cost: '',
        reorder_point: '5',
        supplier_id: '',
        category_id: '',
        is_active: true,
      })
    }
    setDuplicateChecks([])
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setDuplicateChecks([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check for exact duplicates
    const exactDuplicates = duplicateChecks.filter(c => c.exists && (c.field === 'sku' || c.field === 'ref_code'))
    if (exactDuplicates.length > 0) {
      alert('พบข้อมูลซ้ำ กรุณาตรวจสอบ SKU หรือ REF Code')
      return
    }
    
    const supabase = createClient()
    
    const productData = {
      name: formData.name,
      sku: formData.sku || null,
      ref_code: formData.ref_code || null,
      brand: formData.brand || null,
      size: formData.size || null,
      unit: formData.unit,
      description: formData.description || null,
      standard_cost: formData.standard_cost ? parseFloat(formData.standard_cost) : null,
      reorder_point: parseInt(formData.reorder_point) || 5,
      supplier_id: formData.supplier_id || null,
      category_id: formData.category_id || null,
      is_active: formData.is_active,
    }
    
    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)
      
      if (error) {
        console.error('Error updating product:', error)
        alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล')
        return
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData)
      
      if (error) {
        console.error('Error creating product:', error)
        alert('เกิดข้อผิดพลาดในการสร้างสินค้า')
        return
      }
    }
    
    handleCloseModal()
    fetchProducts()
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`ต้องการลบสินค้า "${product.name}" หรือไม่?`)) return
    
    const supabase = createClient()
    
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', product.id)
    
    if (error) {
      console.error('Error deleting product:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }
    
    fetchProducts()
  }

  const getDuplicateWarning = (field: string) => {
    const check = duplicateChecks.find(c => c.field === field && c.exists)
    if (!check) return null
    
    return (
      <div className="mt-1 flex items-start gap-1 text-amber-600 text-xs">
        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          พบสินค้าที่คล้ายกัน: {check.existingProduct?.name}
          {check.existingProduct?.size && ` (${check.existingProduct.size})`}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการสินค้า</h1>
          <p className="text-slate-500 mt-1">เพิ่ม แก้ไข และจัดการรายการสินค้าทั้งหมดในระบบ</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          เพิ่มสินค้าใหม่
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้า, SKU, REF, หรือแบรนด์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ทุก Supplier</option>
            {suppliers.map((sup) => (
              <option key={sup.id} value={sup.id}>{sup.name}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">เฉพาะที่ใช้งาน</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        
        <div className="mt-3 text-sm text-slate-500">
          พบ {filteredProducts.length} รายการ จากทั้งหมด {products.length} รายการ
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>ไม่พบสินค้าที่ค้นหา</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">SKU / REF</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">หมวดหมู่</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Supplier</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">ราคาต้นทุน</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className={`hover:bg-slate-50 ${!product.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        {product.brand && `${product.brand} • `}
                        {product.size && `${product.size} • `}
                        {product.unit}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900">{product.sku || '-'}</p>
                    <p className="text-xs text-slate-500">REF: {product.ref_code || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                      {product.category?.name || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {product.supplier?.name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-900">
                    {product.standard_cost ? `${product.standard_cost.toLocaleString('th-TH')} ฿` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        <Check className="w-3 h-3" />
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">
                        <X className="w-3 h-3" />
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="แก้ไข"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Search Warning */}
          {!editingProduct && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Search className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">ค้นหาก่อนเพิ่ม</p>
                <p>ระบบจะตรวจสอบสินค้าที่คล้ายกันอัตโนมัติเพื่อป้องกันการซ้ำซ้อน</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormField label="ชื่อสินค้า" required>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ชื่อสินค้า"
                  required
                />
                {getDuplicateWarning('name')}
              </FormField>
            </div>

            <FormField label="SKU">
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="รหัสสินค้า (SKU)"
              />
              {getDuplicateWarning('sku')}
            </FormField>

            <FormField label="REF Code">
              <Input
                value={formData.ref_code}
                onChange={(e) => setFormData({ ...formData, ref_code: e.target.value })}
                placeholder="รหัสอ้างอิงจากผู้ผลิต"
              />
              {getDuplicateWarning('ref_code')}
            </FormField>

            <FormField label="แบรนด์">
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="แบรนด์"
              />
            </FormField>

            <FormField label="ขนาด/รุ่น">
              <Input
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="เช่น 4.1x10mm"
              />
            </FormField>

            <FormField label="หน่วยนับ">
              <Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="ชิ้น">ชิ้น</option>
                <option value="กล่อง">กล่อง</option>
                <option value="ชุด">ชุด</option>
                <option value="ขวด">ขวด</option>
                <option value="ซอง">ซอง</option>
              </Select>
            </FormField>

            <FormField label="ราคาต้นทุนมาตรฐาน">
              <Input
                type="number"
                value={formData.standard_cost}
                onChange={(e) => setFormData({ ...formData, standard_cost: e.target.value })}
                placeholder="ราคาต่อหน่วย"
              />
            </FormField>

            <FormField label="หมวดหมู่">
              <Select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">เลือกหมวดหมู่</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Supplier">
              <Select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              >
                <option value="">เลือก Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="จุดสั่งซื้อ (Reorder Point)">
              <Input
                type="number"
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                placeholder="จำนวนขั้นต่ำที่ต้องแจ้งเตือน"
              />
            </FormField>

            <div className="col-span-2">
              <FormField label="รายละเอียด">
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม"
                  rows={2}
                />
              </FormField>
            </div>

            {editingProduct && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">เปิดใช้งานสินค้านี้</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={checkingDuplicate}>
              {editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
