'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Check, X, Clock, Camera, Loader2, Package, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateReservationForm } from '@/components/forms/create-reservation-form'
import { Modal, Button } from '@/components/ui/modal'
import { EmergencyAlert } from '@/components/dashboard/emergency-alert'

interface Reservation {
  id: string
  quantity: number
  status: string
  reserved_at: string
  used_at: string | null
  stock_item: {
    id: string
    lot_number: string
    product: {
      name: string
      sku: string
      size: string | null
    }
  }
  case: {
    id: string
    case_number: string
    scheduled_date: string
    patient: {
      full_name: string
    }
    dentist: {
      full_name: string
    } | null
  }
}

interface Stats {
  pending: number
  reserved: number
  usedToday: number
  cancelled: number
}

const statusConfig = {
  pending: { label: 'รอจอง', icon: Clock, className: 'bg-slate-100 text-slate-700' },
  reserved: { label: 'จองแล้ว', icon: Check, className: 'bg-indigo-100 text-indigo-700' },
  used: { label: 'ใช้แล้ว', icon: Check, className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', icon: X, className: 'bg-red-100 text-red-700' },
}

export default function ReservationsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isUseModalOpen, setIsUseModalOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, reserved: 0, usedToday: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [todayStr, setTodayStr] = useState<string>('')
  const [todayCasesCount, setTodayCasesCount] = useState(0)

  const fetchReservations = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        quantity,
        status,
        reserved_at,
        used_at,
        stock_item:stock_items!inner (
          id,
          lot_number,
          product:products!inner (
            name,
            sku,
            size
          )
        ),
        case:cases!inner (
          id,
          case_number,
          scheduled_date,
          patient:patients!inner (
            full_name
          ),
          dentist:profiles!cases_dentist_id_fkey (
            full_name
          )
        )
      `)
      .order('reserved_at', { ascending: false })

    if (error) {
      console.error('Error fetching reservations:', error)
      setLoading(false)
      return
    }

    const items = (data || []) as unknown as Reservation[]
    setReservations(items)

    // Calculate stats
    const today = new Date().toISOString().split('T')[0]
    let pending = 0, reserved = 0, usedToday = 0, cancelled = 0
    items.forEach(r => {
      if (r.status === 'pending') pending++
      else if (r.status === 'reserved') reserved++
      else if (r.status === 'cancelled') cancelled++
      if (r.status === 'used' && r.used_at?.startsWith(today)) usedToday++
    })

    setStats({ pending, reserved, usedToday, cancelled })
    
    // Calculate today's cases count
    const todayDate = new Date().toISOString().split('T')[0]
    const todayCases = items.filter(r => r.case.scheduled_date === todayDate).length
    setTodayCasesCount(todayCases)
    
    setLoading(false)
  }

  useEffect(() => {
    // Set today string on client side to avoid hydration mismatch
    setTodayStr(new Date().toISOString().split('T')[0])
    fetchReservations()
  }, [])

  const handleCreateSuccess = () => {
    fetchReservations()
  }

  const handleUseReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsUseModalOpen(true)
  }

  const handleConfirmUse = async () => {
    if (!selectedReservation) return

    const supabase = createClient()

    // Update reservation status to used
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({
        status: 'used',
        used_at: new Date().toISOString()
      } as never)
      .eq('id', selectedReservation.id)

    if (reservationError) {
      console.error('Error updating reservation:', reservationError)
      alert('เกิดข้อผิดพลาดในการบันทึก')
      return
    }

    // Note: In production, this should use an RPC function to atomically update stock
    // For now, we just mark the reservation as used

    setIsUseModalOpen(false)
    setSelectedReservation(null)
    fetchReservations()
  }

  const handleCancelReservation = async (reservation: Reservation) => {
    if (!confirm('ต้องการยกเลิกการจองนี้?')) return

    const supabase = createClient()

    // Update reservation status
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' } as never)
      .eq('id', reservation.id)

    if (reservationError) {
      console.error('Error cancelling reservation:', reservationError)
      alert('เกิดข้อผิดพลาด')
      return
    }

    // Note: In production, this should use an RPC function to atomically update reserved_quantity

    fetchReservations()
  }

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.case.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.case.patient.full_name.includes(searchQuery) ||
      r.stock_item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || r.status === statusFilter
    const matchesDate = !dateFilter || r.case.scheduled_date === dateFilter
    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            เตรียมวัสดุ
          </h1>
          <p className="text-slate-500 mt-1">เตรียมวัสดุสำหรับเคสผ่าตัดตามรายการจอง</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          จองของใหม่
        </button>
      </div>

      {/* Emergency Alert */}
      <EmergencyAlert />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-slate-500">รอเตรียม</p>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.reserved}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-slate-500">เตรียมแล้ว</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.usedToday}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <p className="text-sm text-slate-500">เคสวันนี้</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{todayCasesCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-slate-500">ยกเลิก</p>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
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
            <option value="pending">รอจอง</option>
            <option value="reserved">จองแล้ว</option>
            <option value="used">ใช้แล้ว</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {reservations.length === 0 ? 'ไม่มีรายการจอง' : 'ไม่พบรายการที่ค้นหา'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เคส</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวน</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันผ่าตัด</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReservations.map((reservation) => {
                const status = statusConfig[reservation.status as keyof typeof statusConfig]
                const StatusIcon = status?.icon || Clock
                return (
                  <tr key={reservation.id} className={`hover:bg-slate-50 ${reservation.status === 'used' ? 'bg-emerald-50' : ''}`}>
                    <td className="px-4 py-3">
                      {reservation.status === 'used' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-slate-300 rounded" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{reservation.case.case_number}</p>
                        <p className="text-sm text-slate-500">
                          {reservation.case.patient.full_name}
                          {reservation.case.dentist && ` • ${reservation.case.dentist.full_name}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {reservation.stock_item.product.name}
                          {reservation.stock_item.product.size && ` ${reservation.stock_item.product.size}`}
                        </p>
                        <p className="text-sm text-slate-500">LOT: {reservation.stock_item.lot_number}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-slate-900">{reservation.quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">
                        {new Date(reservation.case.scheduled_date).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status?.className || 'bg-slate-100 text-slate-700'}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status?.label || reservation.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {reservation.status === 'reserved' && (
                          <>
                            <button
                              onClick={() => handleUseReservation(reservation)}
                              className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              เตรียมแล้ว
                            </button>
                            <button
                              onClick={() => handleCancelReservation(reservation)}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              ยกเลิก
                            </button>
                          </>
                        )}
                        {reservation.status === 'used' && (
                          <span className="text-sm text-emerald-600 font-medium">เตรียมแล้ว</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Reservation Modal */}
      <CreateReservationForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Use Reservation Modal */}
      <Modal isOpen={isUseModalOpen} onClose={() => setIsUseModalOpen(false)} title="ยืนยันการเตรียมวัสดุ" size="md">
        <div className="p-6 space-y-4">
          {selectedReservation && (
            <>
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm text-slate-600">
                  <strong>สินค้า:</strong> {selectedReservation.stock_item.product.name}
                  {selectedReservation.stock_item.product.size && ` ${selectedReservation.stock_item.product.size}`}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>LOT:</strong> {selectedReservation.stock_item.lot_number}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>จำนวน:</strong> {selectedReservation.quantity} ชิ้น
                </p>
                <p className="text-sm text-slate-600">
                  <strong>เคส:</strong> {selectedReservation.case.case_number} - {selectedReservation.case.patient.full_name}
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">ถ่ายรูป Barcode/สินค้า</p>
                <p className="text-sm text-slate-500 mt-1">คลิกเพื่ออัพโหลดหรือถ่ายรูป</p>
                <input type="file" accept="image/*" className="hidden" id="photo-upload" />
                <label
                  htmlFor="photo-upload"
                  className="mt-4 inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  เลือกไฟล์
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setIsUseModalOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleConfirmUse}>ยืนยันเตรียมแล้ว</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
