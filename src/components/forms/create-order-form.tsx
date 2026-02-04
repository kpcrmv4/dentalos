'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'
import { Plus, Trash2 } from 'lucide-react'

interface CreateOrderFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data
const mockSuppliers = [
  { id: '1', name: 'Straumann', lead_time: 14 },
  { id: '2', name: 'Nobel Biocare', lead_time: 14 },
  { id: '3', name: 'Osstem', lead_time: 7 },
  { id: '4', name: 'Geistlich', lead_time: 10 },
]

const mockProducts = [
  { id: '1', name: 'Straumann BLT Implant 4.1x10mm', supplier_id: '1', price: 15000 },
  { id: '2', name: 'Straumann BLT Implant 4.5x10mm', supplier_id: '1', price: 15000 },
  { id: '3', name: 'Nobel Active Implant 3.5x10mm', supplier_id: '2', price: 15000 },
  { id: '4', name: 'Bio-Oss Bone Graft 0.5g', supplier_id: '4', price: 5000 },
  { id: '5', name: 'Osstem TS III Implant 4.0x12mm', supplier_id: '3', price: 6000 },
]

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: string
}

export function CreateOrderForm({ isOpen, onClose, onSuccess }: CreateOrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_at: '',
    notes: '',
  })
  const [items, setItems] = useState<OrderItem[]>([
    { product_id: '', quantity: 1, unit_price: '' },
  ])

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-fill price when product is selected
    if (field === 'product_id') {
      const product = mockProducts.find((p) => p.id === value)
      if (product) {
        newItems[index].unit_price = product.price.toString()
      }
    }

    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Creating order:', { ...formData, items })
      onSuccess()
      onClose()
      setFormData({ supplier_id: '', expected_at: '', notes: '' })
      setItems([{ product_id: '', quantity: 1, unit_price: '' }])
    } catch (error) {
      console.error('Error creating order:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = formData.supplier_id
    ? mockProducts.filter((p) => p.supplier_id === formData.supplier_id)
    : mockProducts

  const totalAmount = items.reduce((sum, item) => {
    return sum + (parseFloat(item.unit_price) || 0) * item.quantity
  }, 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างใบสั่งซื้อ" size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Supplier" required>
            <Select
              value={formData.supplier_id}
              onChange={(e) => {
                setFormData({ ...formData, supplier_id: e.target.value })
                // Reset items when supplier changes
                setItems([{ product_id: '', quantity: 1, unit_price: '' }])
              }}
              required
            >
              <option value="">เลือก Supplier</option>
              {mockSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} (Lead time: {supplier.lead_time} วัน)
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="คาดว่าจะได้รับ">
            <Input
              type="date"
              value={formData.expected_at}
              onChange={(e) => setFormData({ ...formData, expected_at: e.target.value })}
            />
          </FormField>
        </div>

        {/* Items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">รายการสินค้า</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => (
              <div key={index} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <Select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    required
                    disabled={!formData.supplier_id}
                  >
                    <option value="">เลือกสินค้า</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    placeholder="จำนวน"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    placeholder="ราคา/หน่วย"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                    required
                  />
                </div>
                <div className="w-28 text-right">
                  <span className="font-medium text-slate-900">
                    {((parseFloat(item.unit_price) || 0) * item.quantity).toLocaleString('th-TH')} ฿
                  </span>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              disabled={!formData.supplier_id}
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการ
            </button>
            <div className="text-right">
              <span className="text-sm text-slate-500">รวมทั้งหมด: </span>
              <span className="text-lg font-bold text-slate-900">
                {totalAmount.toLocaleString('th-TH')} ฿
              </span>
            </div>
          </div>
        </div>

        <FormField label="หมายเหตุ">
          <Textarea
            placeholder="หมายเหตุเพิ่มเติม..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="secondary" disabled={loading}>
            บันทึกร่าง
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'สร้างและส่ง PO'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
