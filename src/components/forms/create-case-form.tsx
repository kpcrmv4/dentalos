'use client'

import { useState } from 'react'
import { Modal, FormField, Input, Select, Textarea, Button } from '@/components/ui/modal'

interface CreateCaseFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock data - replace with actual data from Supabase
const mockPatients = [
  { id: '1', full_name: 'คุณสมศักดิ์ ใจดี', hn_number: 'HN-001234' },
  { id: '2', full_name: 'คุณมาลี สุขใจ', hn_number: 'HN-001235' },
  { id: '3', full_name: 'คุณประสิทธิ์ มั่นคง', hn_number: 'HN-001236' },
]

const mockDentists = [
  { id: '1', full_name: 'ทพ.วิชัย สุขสวัสดิ์' },
  { id: '2', full_name: 'ทพ.สมหญิง รักษาดี' },
  { id: '3', full_name: 'ทพ.ประสิทธิ์ มานะ' },
]

const procedureTypes = [
  'Implant Placement',
  'Bone Graft',
  'Sinus Lift',
  'Abutment Installation',
  'Crown Delivery',
  'อื่นๆ',
]

export function CreateCaseForm({ isOpen, onClose, onSuccess }: CreateCaseFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    dentist_id: '',
    scheduled_date: '',
    scheduled_time: '',
    procedure_type: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log('Creating case:', formData)
      onSuccess()
      onClose()
      setFormData({
        patient_id: '',
        dentist_id: '',
        scheduled_date: '',
        scheduled_time: '',
        procedure_type: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating case:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="สร้างเคสใหม่" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="คนไข้" required>
            <Select
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              required
            >
              <option value="">เลือกคนไข้</option>
              {mockPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} ({patient.hn_number})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="ทันตแพทย์" required>
            <Select
              value={formData.dentist_id}
              onChange={(e) => setFormData({ ...formData, dentist_id: e.target.value })}
              required
            >
              <option value="">เลือกทันตแพทย์</option>
              {mockDentists.map((dentist) => (
                <option key={dentist.id} value={dentist.id}>
                  {dentist.full_name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="วันที่นัด" required>
            <Input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              required
            />
          </FormField>

          <FormField label="เวลา">
            <Input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="ประเภทหัตถการ" required>
          <Select
            value={formData.procedure_type}
            onChange={(e) => setFormData({ ...formData, procedure_type: e.target.value })}
            required
          >
            <option value="">เลือกประเภท</option>
            {procedureTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
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
            {loading ? 'กำลังบันทึก...' : 'สร้างเคส'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
