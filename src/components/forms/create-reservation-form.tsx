'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Select, Button } from '@/components/ui/modal'
import { Plus, Trash2 } from 'lucide-react'

interface CreateReservationFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data
const mockCases = [
  { id: '1', case_number: 'C2026-0001', patient_name: 'คุณสมศักดิ์ ใจดี', scheduled_date: '2026-02-04' },
  { id: '2', case_number: 'C2026-0002', patient_name: 'คุณมาลี สุขใจ', scheduled_date: '2026-02-04' },
  { id: '3', case_number: 'C2026-0003', patient_name: 'คุณประสิทธิ์ มั่นคง', scheduled_date: '2026-02-05' },
]

const mockProducts = [
  { id: '1', name: 'Straumann BLT Implant 4.1x10mm', available: 7 },
  { id: '2', name: 'Nobel Active Implant 3.5x10mm', available: 2 },
  { id: '3', name: 'Bio-Oss Bone Graft 0.5g', available: 8 },
  { id: '4', name: 'Osstem TS III Implant 4.0x12mm', available: 10 },
]

interface ReservationItem {
  product_id: string
  quantity: number
}

export function CreateReservationForm({ isOpen, onClose, onSuccess }: CreateReservationFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    case_id: '',
  })
  const [items, setItems] = useState<ReservationItem[]>([
    { product_id: '', quantity: 1 },
  ])

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ReservationItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase call to reserve_stock function
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Creating reservation:', { ...formData, items })
      onSuccess()
      onClose()
      setFormData({ case_id: '' })
      setItems([{ product_id: '', quantity: 1 }])
    } catch (error) {
      console.error('Error creating reservation:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCase = mockCases.find((c) => c.id === formData.case_id)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="จองของสำหรับเคส" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="เลือกเคส" required>
          <Select
            value={formData.case_id}
            onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
            required
          >
            <option value="">เลือกเคส</option>
            {mockCases.map((c) => (
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
              <strong> วันนัด:</strong> {selectedCase.scheduled_date}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <h3 className="font-medium text-slate-900">รายการที่ต้องการจอง</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, index) => (
              <div key={index} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <Select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    required
                  >
                    <option value="">เลือกสินค้า</option>
                    {mockProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (ว่าง: {product.available})
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
            {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
