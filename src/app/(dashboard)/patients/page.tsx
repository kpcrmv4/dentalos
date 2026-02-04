import { Users, Plus, Search, Filter, MoreHorizontal } from 'lucide-react'

// Mock data for patients
const mockPatients = [
  {
    id: '1',
    hn_number: 'HN-001234',
    full_name: 'คุณสมศักดิ์ ใจดี',
    phone: '081-234-5678',
    email: 'somsak@email.com',
    total_cases: 3,
    last_visit: '2026-01-15',
  },
  {
    id: '2',
    hn_number: 'HN-001235',
    full_name: 'คุณมาลี สุขใจ',
    phone: '082-345-6789',
    email: 'malee@email.com',
    total_cases: 1,
    last_visit: '2026-02-01',
  },
  {
    id: '3',
    hn_number: 'HN-001236',
    full_name: 'คุณประสิทธิ์ มั่นคง',
    phone: '083-456-7890',
    email: 'prasit@email.com',
    total_cases: 5,
    last_visit: '2026-01-28',
  },
  {
    id: '4',
    hn_number: 'HN-001237',
    full_name: 'คุณวิภา รักษ์สุข',
    phone: '084-567-8901',
    email: 'wipa@email.com',
    total_cases: 2,
    last_visit: '2026-02-03',
  },
]

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายชื่อคนไข้</h1>
          <p className="text-slate-500 mt-1">จัดการข้อมูลคนไข้และประวัติการรักษา</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          เพิ่มคนไข้ใหม่
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ, HN, หรือเบอร์โทร..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Filter className="w-4 h-4" />
            กรอง
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">HN</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ชื่อ-นามสกุล</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เบอร์โทร</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">อีเมล</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวนเคส</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เข้ารับการรักษาล่าสุด</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockPatients.map((patient) => (
              <tr key={patient.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-indigo-600">{patient.hn_number}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{patient.full_name}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{patient.phone}</td>
                <td className="px-4 py-3 text-slate-600">{patient.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-medium">
                    {patient.total_cases}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(patient.last_visit).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-slate-100 rounded">
                    <MoreHorizontal className="w-5 h-5 text-slate-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            แสดง <span className="font-medium">1-4</span> จาก <span className="font-medium">4</span> รายการ
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-white disabled:opacity-50" disabled>
              ก่อนหน้า
            </button>
            <button className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-white disabled:opacity-50" disabled>
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
