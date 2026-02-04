'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'
import { Plus, Trash2, Search, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ReceiveStockFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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

interface Product {
  id: string
  name: string
  sku: string | null
  ref_code: string | null
  brand: string | null
  size: string | null
  supplier_id: string | null
  category_id: string | null
  standard_cost: number | null
}

interface StockItem {
  product_id: string
  product_name: string
  ref_code: string
  lot_number: string
  expiry_date: string
  quantity: number
  cost_price: string
  location: string
}

type FormStep = 'input' | 'summary'

export function ReceiveStockForm({ isOpen, onClose, onSuccess }: ReceiveStockFormProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<FormStep>('input')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState('')
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    category_id: '',
    invoice_number: '',
    notes: '',
  })
  
  const [items, setItems] = useState<StockItem[]>([
    { product_id: '', product_name: '', ref_code: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' },
  ])

  // Fetch suppliers and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      const [suppliersRes, categoriesRes, productsRes] = await Promise.all([
        supabase.from('suppliers').select('id, name, code').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').order('sort_order'),
        supabase.from('products').select('id, name, sku, ref_code, brand, size, supplier_id, category_id, standard_cost').eq('is_active', true).order('name'),
      ])
      
      if (suppliersRes.data) setSuppliers(suppliersRes.data)
      if (categoriesRes.data) setCategories(categoriesRes.data)
      if (productsRes.data) setProducts(productsRes.data)
    }
    
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  // Filter products based on selected supplier, category, and search
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSupplier = !formData.supplier_id || product.supplier_id === formData.supplier_id
      const matchesCategory = !formData.category_id || product.category_id === formData.category_id
      const matchesSearch = !productSearch || 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
        (product.ref_code && product.ref_code.toLowerCase().includes(productSearch.toLowerCase()))
      return matchesSupplier && matchesCategory && matchesSearch
    })
  }, [products, formData.supplier_id, formData.category_id, productSearch])

  const addItem = () => {
    setItems([
      ...items,
      { product_id: '', product_name: '', ref_code: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof StockItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-fill product info when product is selected
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value)
      if (product) {
        newItems[index].product_name = product.name
        newItems[index].ref_code = product.ref_code || ''
        if (product.standard_cost) {
          newItems[index].cost_price = product.standard_cost.toString()
        }
      }
    }
    
    setItems(newItems)
  }

  const handleProceedToSummary = () => {
    // Validate items
    const validItems = items.filter(item => item.product_id && item.lot_number && item.quantity > 0)
    if (validItems.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ')
      return
    }
    setStep('summary')
  }

  const handleBackToInput = () => {
    setStep('input')
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Insert each stock item
      const validItems = items.filter(item => item.product_id && item.lot_number && item.quantity > 0)
      
      for (const item of validItems) {
        const { error } = await supabase.from('stock_items').insert({
          product_id: item.product_id,
          lot_number: item.lot_number,
          expiry_date: item.expiry_date || null,
          quantity: item.quantity,
          reserved_quantity: 0,
          cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
          location: item.location || null,
          invoice_number: formData.invoice_number || null,
          received_by: user?.id || null,
          status: 'active',
        } as never)
        
        if (error) {
          console.error('Error inserting stock item:', error)
          throw error
        }
      }

      // Create notification for inventory role
      await supabase.from('notifications').insert({
        type: 'stock_received',
        title: 'รับสินค้าเข้าคลังสำเร็จ',
        message: `รับสินค้า ${validItems.length} รายการ จาก Invoice: ${formData.invoice_number || 'ไม่ระบุ'}`,
        data: { 
          invoice_number: formData.invoice_number,
          item_count: validItems.length,
          total_quantity: validItems.reduce((sum, item) => sum + item.quantity, 0)
        },
      } as never)

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error receiving stock:', error)
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('input')
    setFormData({ supplier_id: '', category_id: '', invoice_number: '', notes: '' })
    setItems([{ product_id: '', product_name: '', ref_code: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' }])
    setProductSearch('')
    onClose()
  }

  // Calculate summary
  const validItems = items.filter(item => item.product_id && item.lot_number && item.quantity > 0)
  const totalQuantity = validItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalCost = validItems.reduce((sum, item) => sum + (parseFloat(item.cost_price) || 0) * item.quantity, 0)
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="รับสินค้าเข้าคลัง" size="xl">
      {step === 'input' ? (
        <div className="p-6 space-y-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Supplier" required>
              <Select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                required
              >
                <option value="">เลือก Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.code ? `[${supplier.code}] ` : ''}{supplier.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="เลขที่ใบส่งของ (Invoice)">
              <Input
                placeholder="INV-XXXXX"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </FormField>
          </div>

          {/* Filter Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4" />
              ค้นหาและกรองสินค้า
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="หมวดหมู่">
                <Select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">ทุกหมวดหมู่</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="ค้นหาสินค้า">
                <Input
                  placeholder="ชื่อสินค้า, SKU, หรือ REF..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </FormField>
            </div>
            {formData.supplier_id && (
              <p className="text-sm text-indigo-600">
                แสดงเฉพาะสินค้าจาก: {selectedSupplier?.name} ({filteredProducts.length} รายการ)
              </p>
            )}
          </div>

          {/* Items */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                รายการสินค้า ({items.length} รายการ)
              </h3>
            </div>
            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {items.map((item, index) => (
                <div key={index} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">รายการที่ {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Row 1: Product Selection and REF */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-slate-500 mb-1 block">สินค้า *</label>
                      <Select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">เลือกสินค้า</option>
                        {filteredProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.size ? `(${product.size})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">REF Code</label>
                      <Input
                        placeholder="REF"
                        value={item.ref_code}
                        onChange={(e) => updateItem(index, 'ref_code', e.target.value)}
                        className="bg-slate-50"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: LOT and Expiry */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">LOT Number *</label>
                      <Input
                        placeholder="LOT Number"
                        value={item.lot_number}
                        onChange={(e) => updateItem(index, 'lot_number', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">วันหมดอายุ</label>
                      <Input
                        type="date"
                        value={item.expiry_date}
                        onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Row 3: Quantity, Cost, Location */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">จำนวน *</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="จำนวน"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">ราคาต้นทุน/ชิ้น</label>
                      <Input
                        type="number"
                        placeholder="ราคา"
                        value={item.cost_price}
                        onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">ตำแหน่งจัดเก็บ</label>
                      <Input
                        placeholder="เช่น A-01-01"
                        value={item.location}
                        onChange={(e) => updateItem(index, 'location', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการสินค้า
              </button>
            </div>
          </div>

          {/* Notes */}
          <FormField label="หมายเหตุ">
            <Textarea
              placeholder="หมายเหตุเพิ่มเติม..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={handleClose}>
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleProceedToSummary}>
              ตรวจสอบและยืนยัน
            </Button>
          </div>
        </div>
      ) : (
        /* Summary Step */
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-indigo-900">ตรวจสอบข้อมูลก่อนบันทึก</h3>
              <p className="text-sm text-indigo-700 mt-1">กรุณาตรวจสอบรายการสินค้าด้านล่างให้ถูกต้องก่อนยืนยัน</p>
            </div>
          </div>

          {/* Summary Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-500">Supplier</p>
              <p className="font-semibold text-slate-900">{selectedSupplier?.name || '-'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-500">เลขที่ Invoice</p>
              <p className="font-semibold text-slate-900">{formData.invoice_number || '-'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-500">จำนวนรายการ</p>
              <p className="font-semibold text-slate-900">{validItems.length} รายการ</p>
            </div>
          </div>

          {/* Items Summary Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">#</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ชื่อสินค้า</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">REF / LOT</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวน</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">ราคา/ชิ้น</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {validItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.product_name}</p>
                      {item.expiry_date && (
                        <p className="text-xs text-slate-500">หมดอายุ: {item.expiry_date}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">{item.ref_code || '-'}</p>
                      <p className="text-xs text-slate-500">LOT: {item.lot_number}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.cost_price ? parseFloat(item.cost_price).toLocaleString('th-TH') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {item.cost_price ? (parseFloat(item.cost_price) * item.quantity).toLocaleString('th-TH') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700">รวมทั้งสิ้น</td>
                  <td className="px-4 py-3 text-center font-bold text-indigo-600">{totalQuantity} ชิ้น</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">
                    {totalCost > 0 ? `${totalCost.toLocaleString('th-TH')} ฿` : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {formData.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>หมายเหตุ:</strong> {formData.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={handleBackToInput}>
              ← กลับไปแก้ไข
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการรับสินค้า'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
