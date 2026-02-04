'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'

interface CreateTransferFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data
const mockCompanies = [
  { id: '1', name: 'Straumann Thailand' },
  { id: '2', name: 'Nobel Biocare Thailand' },
  { id: '3', name: 'Osstem Thailand' },
  { id: '4', name: 'Geistlich Thailand' },
]

const mockProducts = [
  { id: '1', name: 'Straumann BLT Implant 4.1x10mm' },
  { id: '2', name: 'Straumann BLT Implant 4.5x10mm' },
  { id: '3', name: 'Nobel Active Implant 3.5x10mm' },
  { id: '4', name: 'Bio-Oss Bone Graft 0.5g' },
  { id: '5', name: 'Osstem TS III Implant 4.0x12mm' },
]

export function CreateTransferForm({ isOpen, onClose, onSuccess }: CreateTransferFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'borrow',
    company_id: '',
    product_id: '',
    quantity: 1,
    due_date: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Creating transfer:', formData)
      onSuccess()
      onClose()
      setFormData({
        type: 'borrow',
        company_id: '',
        product_id: '',
        quantity: 1,
        due_date: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating transfer:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างรายการยืม-คืน/แลกเปลี่ยน" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="ประเภท" required>
          <div className="flex gap-4">
            {[
              { value: 'borrow', label: 'ยืม' },
              { value: 'return', label: 'คืน' },
              { value: 'exchange', label: 'แลกเปลี่ยน' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={formData.type === option.value}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-slate-700">{option.label}</span>
              </label>
            ))}
          </div>
        </FormField>

        <FormField label="บริษัท" required>
          <Select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            required
          >
            <option value="">เลือกบริษัท</option>
            {mockCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="สินค้า" required>
          <Select
            value={formData.product_id}
            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            required
          >
            <option value="">เลือกสินค้า</option>
            {mockProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="จำนวน" required>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              required
            />
          </FormField>

          {formData.type === 'borrow' && (
            <FormField label="กำหนดคืน">
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </FormField>
          )}
        </div>

        <FormField label="หมายเหตุ">
          <Textarea
            placeholder="เหตุผลหรือรายละเอียดเพิ่มเติม..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
