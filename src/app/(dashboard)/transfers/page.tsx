import { ArrowLeftRight, Plus, Search, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react'

// Mock data for transfers
const mockTransfers = [
  {
    id: '1',
    transfer_number: 'TR-2026-0001',
    type: 'borrow',
    company: 'Straumann Thailand',
    product_name: 'Straumann BLT Implant 4.5x10mm',
    quantity: 2,
    status: 'pending_return',
    borrowed_at: '2026-01-20',
    due_date: '2026-02-20',
    notes: 'ยืมเพื่อ Demo ให้คนไข้',
  },
  {
    id: '2',
    transfer_number: 'TR-2026-0002',
    type: 'exchange',
    company: 'Nobel Biocare Thailand',
    product_name: 'Nobel Active 3.5x10mm',
    quantity: 1,
    status: 'completed',
    borrowed_at: '2026-01-15',
    returned_at: '2026-01-25',
    notes: 'แลกเปลี่ยนขนาด',
  },
  {
    id: '3',
    transfer_number: 'TR-2026-0003',
    type: 'return',
    company: 'Osstem Thailand',
    product_name: 'Osstem TS III 4.0x8mm',
    quantity: 3,
    status: 'in_transit',
    borrowed_at: null,
    sent_at: '2026-02-01',
    notes: 'คืนของใกล้หมดอายุ',
  },
]

const typeConfig = {
  borrow: { label: 'ยืม', icon: ArrowLeft, className: 'bg-blue-100 text-blue-700' },
  return: { label: 'คืน', icon: ArrowRight, className: 'bg-amber-100 text-amber-700' },
  exchange: { label: 'แลกเปลี่ยน', icon: RotateCcw, className: 'bg-purple-100 text-purple-700' },
}

const statusConfig = {
  pending: { label: 'รอดำเนินการ', className: 'bg-slate-100 text-slate-700' },
  pending_return: { label: 'รอคืน', className: 'bg-amber-100 text-amber-700' },
  in_transit: { label: 'กำลังจัดส่ง', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-emerald-100 text-emerald-700' },
}

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ยืม-คืน/แลกเปลี่ยนกับบริษัท</h1>
          <p className="text-slate-500 mt-1">จัดการการยืม คืน และแลกเปลี่ยนสินค้ากับ Supplier</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          สร้างรายการใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-sm text-slate-500">ยืมอยู่</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">2</p>
              <p className="text-sm text-slate-500">รอคืน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">1</p>
              <p className="text-sm text-slate-500">แลกเปลี่ยน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">1</p>
              <p className="text-sm text-slate-500">เกินกำหนด</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขรายการ, บริษัท, หรือสินค้า..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">ประเภททั้งหมด</option>
            <option value="borrow">ยืม</option>
            <option value="return">คืน</option>
            <option value="exchange">แลกเปลี่ยน</option>
          </select>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="pending_return">รอคืน</option>
            <option value="in_transit">กำลังจัดส่ง</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เลขรายการ</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ประเภท</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">บริษัท</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวน</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">กำหนดคืน</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockTransfers.map((transfer) => {
              const type = typeConfig[transfer.type as keyof typeof typeConfig]
              const status = statusConfig[transfer.status as keyof typeof statusConfig]
              const TypeIcon = type.icon
              return (
                <tr key={transfer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-indigo-600">{transfer.transfer_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type.className}`}>
                      <TypeIcon className="w-3 h-3" />
                      {type.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{transfer.company}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600">{transfer.product_name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">{transfer.quantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    {transfer.due_date ? (
                      <span className="text-slate-600">
                        {new Date(transfer.due_date).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
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
