'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Textarea, Button } from '@/components/ui/modal'

interface CreatePatientFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreatePatientForm({ isOpen, onClose, onSuccess }: CreatePatientFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    hn_number: '',
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    allergies: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Creating patient:', formData)
      onSuccess()
      onClose()
      setFormData({
        hn_number: '',
        full_name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        allergies: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating patient:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มคนไข้ใหม่" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="HN">
            <Input
              placeholder="HN-XXXXXX (ปล่อยว่างเพื่อสร้างอัตโนมัติ)"
              value={formData.hn_number}
              onChange={(e) => setFormData({ ...formData, hn_number: e.target.value })}
            />
          </FormField>

          <FormField label="ชื่อ-นามสกุล" required>
            <Input
              placeholder="ชื่อ นามสกุล"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="เบอร์โทรศัพท์">
            <Input
              type="tel"
              placeholder="08X-XXX-XXXX"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </FormField>

          <FormField label="อีเมล">
            <Input
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="วันเกิด">
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
        </FormField>

        <FormField label="ประวัติแพ้ยา/อาหาร">
          <Textarea
            placeholder="ระบุประวัติการแพ้ยาหรืออาหาร..."
            value={formData.allergies}
            onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
          />
        </FormField>

        <FormField label="หมายเหตุ">
          <Textarea
            placeholder="รายละเอียดเพิ่มเติม..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'เพิ่มคนไข้'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
