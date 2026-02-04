import { Calendar, Clock, AlertTriangle, Package } from 'lucide-react'

export async function StatsCards() {
  // Mock data matching calendar page - will be replaced with Supabase queries
  const monthCases = 3      // 3 cases in February
  const pendingCases = 2    // 2 cases scheduled (Feb 4 and Feb 5)
  const redCases = 1        // 1 case with red status (missing materials)
  const lowStockCount = 3   // Low stock items

  const stats = [
    {
      title: 'เคสเดือนนี้',
      value: monthCases,
      subtitle: new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'เคสผ่าตัดที่กำลังจะถึง',
      value: pendingCases,
      subtitle: 'เคสที่รอดำเนินการ',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'วัสดุยังไม่พร้อม',
      value: redCases,
      subtitle: 'ต้องเตรียมของ',
      icon: AlertTriangle,
      color: redCases > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
    },
    {
      title: 'รายการใกล้หมด',
      value: lowStockCount,
      subtitle: 'ต้องสั่งซื้อ',
      icon: Package,
      color: lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500">{stat.title}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
            </div>
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
