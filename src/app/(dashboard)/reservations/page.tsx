'use client'

import { useState } from 'react'
import { Plus, Search, Check, X, Clock, Camera } from 'lucide-react'
import { CreateReservationForm } from '@/components/forms/create-reservation-form'
import { Modal, Button } from '@/components/ui/modal'

// Mock data for reservations
const mockReservations = [
  {
    id: '1',
    case_number: 'C2026-0001',
    patient_name: 'คุณสมศักดิ์ ใจดี',
    dentist_name: 'ทพ.วิชัย',
    scheduled_date: '2026-02-04',
    product_name: 'Straumann BLT Implant 4.1x10mm',
    lot_number: 'LOT-2026-001',
    quantity: 1,
    status: 'reserved',
    reserved_at: '2026-02-01T10:30:00',
  },
  {
    id: '2',
    case_number: 'C2026-0001',
    patient_name: 'คุณสมศักดิ์ ใจดี',
    dentist_name: 'ทพ.วิชัย',
    scheduled_date: '2026-02-04',
    product_name: 'Bio-Oss Bone Graft 0.5g',
    lot_number: 'LOT-2026-003',
    quantity: 2,
    status: 'reserved',
    reserved_at: '2026-02-01T10:30:00',
  },
  {
    id: '3',
    case_number: 'C2026-0002',
    patient_name: 'คุณมาลี สุขใจ',
    dentist_name: 'ทพ.สมหญิง',
    scheduled_date: '2026-02-04',
    product_name: 'Nobel Active Implant 3.5x10mm',
    lot_number: 'LOT-2026-002',
    quantity: 1,
    status: 'used',
    reserved_at: '2026-02-02T14:00:00',
    used_at: '2026-02-04T09:15:00',
  },
  {
    id: '4',
    case_number: 'C2026-0003',
    patient_name: 'คุณประสิทธิ์ มั่นคง',
    dentist_name: 'ทพ.วิชัย',
    scheduled_date: '2026-02-05',
    product_name: 'Osstem TS III Implant 4.0x12mm',
    lot_number: 'LOT-2026-004',
    quantity: 2,
    status: 'reserved',
    reserved_at: '2026-02-03T16:45:00',
  },
]

const statusConfig = {
  pending: { label: 'รอจอง', icon: Clock, className: 'bg-slate-100 text-slate-700' },
  reserved: { label: 'จองแล้ว', icon: Check, className: 'bg-indigo-100 text-indigo-700' },
  used: { label: 'ใช้แล้ว', icon: Check, className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', icon: X, className: 'bg-red-100 text-red-700' },
}

export default function ReservationsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUseModalOpen, setIsUseModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<(typeof mockReservations)[0] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleCreateSuccess = () => {
    alert('จองสำเร็จ!')
  }

  const handleUseReservation = (reservation: (typeof mockReservations)[0]) => {
    setSelectedReservation(reservation)
    setIsUseModalOpen(true)
  }

  const handleConfirmUse = () => {
    alert(`บันทึกการใช้งาน ${selectedReservation?.product_name} สำเร็จ!`)
    setIsUseModalOpen(false)
    setSelectedReservation(null)
  }

  const filteredReservations = mockReservations.filter((r) => {
    const matchesSearch =
      r.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patient_name.includes(searchQuery) ||
      r.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">การจองของสำหรับเคส</h1>
          <p className="text-slate-500 mt-1">จัดการการจองวัสดุและรากเทียมสำหรับเคสผ่าตัด</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          จองของใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">รอจอง</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">5</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">จองแล้ว</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">12</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">ใช้แล้ววันนี้</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">3</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">ยกเลิก</p>
          <p className="text-2xl font-bold text-red-600 mt-1">1</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขเคส, ชื่อคนไข้, หรือชื่อสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="reserved">จองแล้ว</option>
            <option value="used">ใช้แล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <input
            type="date"
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เคส</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวน</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันนัด</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredReservations.map((reservation) => {
              const status = statusConfig[reservation.status as keyof typeof statusConfig]
              const StatusIcon = status.icon
              return (
                <tr key={reservation.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{reservation.case_number}</p>
                      <p className="text-sm text-slate-500">
                        {reservation.patient_name} • {reservation.dentist_name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{reservation.product_name}</p>
                      <p className="text-sm text-slate-500">LOT: {reservation.lot_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">{reservation.quantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600">
                      {new Date(reservation.scheduled_date).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {reservation.status === 'reserved' && (
                      <button
                        onClick={() => handleUseReservation(reservation)}
                        className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        บันทึกใช้งาน
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Create Reservation Modal */}
      <CreateReservationForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Use Reservation Modal */}
      <Modal isOpen={isUseModalOpen} onClose={() => setIsUseModalOpen(false)} title="บันทึกการใช้งาน" size="md">
        <div className="p-6 space-y-4">
          {selectedReservation && (
            <>
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm text-slate-600">
                  <strong>สินค้า:</strong> {selectedReservation.product_name}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>LOT:</strong> {selectedReservation.lot_number}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>จำนวน:</strong> {selectedReservation.quantity} ชิ้น
                </p>
                <p className="text-sm text-slate-600">
                  <strong>เคส:</strong> {selectedReservation.case_number} - {selectedReservation.patient_name}
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">ถ่ายรูป Barcode/สินค้า</p>
                <p className="text-sm text-slate-500 mt-1">คลิกเพื่ออัพโหลดหรือถ่ายรูป</p>
                <input type="file" accept="image/*" className="hidden" />
                <button
                  type="button"
                  onClick={() => alert('เลือกไฟล์รูปภาพ...')}
                  className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  เลือกไฟล์
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setIsUseModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleConfirmUse}>ยืนยันการใช้งาน</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
