import { ShoppingCart, Plus, Search, Filter, Eye, FileText, Truck } from 'lucide-react'

// Mock data for purchase orders
const mockOrders = [
  {
    id: '1',
    po_number: 'PO-2026-0001',
    supplier_name: 'Straumann',
    status: 'sent',
    items_count: 5,
    total_amount: 250000,
    ordered_at: '2026-01-28',
    expected_at: '2026-02-10',
  },
  {
    id: '2',
    po_number: 'PO-2026-0002',
    supplier_name: 'Nobel Biocare',
    status: 'draft',
    items_count: 3,
    total_amount: 180000,
    ordered_at: null,
    expected_at: null,
  },
  {
    id: '3',
    po_number: 'PO-2026-0003',
    supplier_name: 'Osstem',
    status: 'received',
    items_count: 8,
    total_amount: 120000,
    ordered_at: '2026-01-15',
    expected_at: '2026-01-22',
    received_at: '2026-01-21',
  },
  {
    id: '4',
    po_number: 'PO-2026-0004',
    supplier_name: 'Geistlich',
    status: 'partial',
    items_count: 4,
    total_amount: 85000,
    ordered_at: '2026-01-20',
    expected_at: '2026-01-30',
  },
]

const statusConfig = {
  draft: { label: 'ร่าง', className: 'bg-slate-100 text-slate-700' },
  sent: { label: 'ส่งแล้ว', className: 'bg-indigo-100 text-indigo-700' },
  partial: { label: 'รับบางส่วน', className: 'bg-amber-100 text-amber-700' },
  received: { label: 'รับครบแล้ว', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบสั่งซื้อ</h1>
          <p className="text-slate-500 mt-1">จัดการใบสั่งซื้อและติดตามการจัดส่ง</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          สร้างใบสั่งซื้อ
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">2</p>
              <p className="text-sm text-slate-500">ร่าง</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">3</p>
              <p className="text-sm text-slate-500">รอรับของ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">1</p>
              <p className="text-sm text-slate-500">รับบางส่วน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">15</p>
              <p className="text-sm text-slate-500">รับครบเดือนนี้</p>
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
              placeholder="ค้นหาด้วยเลข PO หรือชื่อ Supplier..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Supplier ทั้งหมด</option>
            <option value="straumann">Straumann</option>
            <option value="nobel">Nobel Biocare</option>
            <option value="osstem">Osstem</option>
            <option value="geistlich">Geistlich</option>
          </select>
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">สถานะทั้งหมด</option>
            <option value="draft">ร่าง</option>
            <option value="sent">ส่งแล้ว</option>
            <option value="partial">รับบางส่วน</option>
            <option value="received">รับครบแล้ว</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เลข PO</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Supplier</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">รายการ</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">มูลค่า</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันสั่ง</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">คาดว่าจะได้รับ</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockOrders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig]
              return (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-indigo-600">{order.po_number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{order.supplier_name}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-slate-600">{order.items_count} รายการ</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-medium text-slate-900">
                      {order.total_amount.toLocaleString('th-TH')} ฿
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.ordered_at ? (
                      <span className="text-slate-600">
                        {new Date(order.ordered_at).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.expected_at ? (
                      <span className="text-slate-600">
                        {new Date(order.expected_at).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
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
                  <td className="px-4 py-3">
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <Eye className="w-5 h-5 text-slate-400" />
                    </button>
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
