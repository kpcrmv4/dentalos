import { ClipboardList, Plus, Search, Filter, Check, X, Clock } from 'lucide-react'

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
    status: 'pending',
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
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">การจองของสำหรับเคส</h1>
          <p className="text-slate-500 mt-1">จัดการการจองวัสดุและรากเทียมสำหรับเคสผ่าตัด</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
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
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">รอจอง</option>
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
            {mockReservations.map((reservation) => {
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
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {reservation.status === 'reserved' && (
                      <button className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
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
    </div>
  )
}
