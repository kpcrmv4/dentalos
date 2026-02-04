'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'
import { Plus, Trash2 } from 'lucide-react'

interface ReceiveStockFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data
const mockSuppliers = [
  { id: '1', name: 'Straumann' },
  { id: '2', name: 'Nobel Biocare' },
  { id: '3', name: 'Osstem' },
  { id: '4', name: 'Geistlich' },
]

const mockProducts = [
  { id: '1', name: 'Straumann BLT Implant 4.1x10mm', sku: 'STR-BLT-410' },
  { id: '2', name: 'Nobel Active Implant 3.5x10mm', sku: 'NB-ACT-350' },
  { id: '3', name: 'Bio-Oss Bone Graft 0.5g', sku: 'BIO-OSS-05' },
  { id: '4', name: 'Osstem TS III Implant 4.0x12mm', sku: 'OSS-TS3-412' },
]

interface StockItem {
  product_id: string
  lot_number: string
  expiry_date: string
  quantity: number
  cost_price: string
  location: string
}

export function ReceiveStockForm({ isOpen, onClose, onSuccess }: ReceiveStockFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    notes: '',
  })
  const [items, setItems] = useState<StockItem[]>([
    { product_id: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' },
  ])

  const addItem = () => {
    setItems([
      ...items,
      { product_id: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' },
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
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Receiving stock:', { ...formData, items })
      onSuccess()
      onClose()
      setFormData({ supplier_id: '', invoice_number: '', notes: '' })
      setItems([{ product_id: '', lot_number: '', expiry_date: '', quantity: 1, cost_price: '', location: '' }])
    } catch (error) {
      console.error('Error receiving stock:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="รับสินค้าเข้าคลัง" size="xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Supplier" required>
            <Select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              required
            >
              <option value="">เลือก Supplier</option>
              {mockSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="เลขที่ใบส่งของ">
            <Input
              placeholder="INV-XXXXX"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            />
          </FormField>

          <FormField label="หมายเหตุ">
            <Input
              placeholder="หมายเหตุ..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              <div key={index} className="p-4 space-y-3">
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
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    required
                  >
                    <option value="">เลือกสินค้า</option>
                    {mockProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="LOT Number"
                    value={item.lot_number}
                    onChange={(e) => updateItem(index, 'lot_number', e.target.value)}
                    required
                  />
                  <Input
                    type="date"
                    placeholder="วันหมดอายุ"
                    value={item.expiry_date}
                    onChange={(e) => updateItem(index, 'expiry_date', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="number"
                    min="1"
                    placeholder="จำนวน"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                  <Input
                    type="number"
                    placeholder="ราคาต้นทุน"
                    value={item.cost_price}
                    onChange={(e) => updateItem(index, 'cost_price', e.target.value)}
                  />
                  <Input
                    placeholder="ตำแหน่งจัดเก็บ (เช่น A-01-01)"
                    value={item.location}
                    onChange={(e) => updateItem(index, 'location', e.target.value)}
                  />
                </div>
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
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'รับสินค้าเข้า'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
