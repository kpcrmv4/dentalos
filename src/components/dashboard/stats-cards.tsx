import { createClient } from '@/lib/supabase/server'
import { Calendar, Clock, AlertTriangle, Package } from 'lucide-react'

export async function StatsCards() {
  const supabase = await createClient()

  // Get current month cases count
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: monthCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])

  // Get pending cases
  const { count: pendingCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')

  // Get cases with red traffic light
  const { count: redCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('traffic_light', 'red')

  // Get low stock items count
  const { data: lowStockItems } = await supabase
    .from('stock_items')
    .select('id, quantity, reserved_quantity, product:products(reorder_point)')
    .eq('status', 'active')

  const lowStockCount = lowStockItems?.filter(item => {
    const available = item.quantity - item.reserved_quantity
    const reorderPoint = (item.product as { reorder_point: number })?.reorder_point || 5
    return available <= reorderPoint
  }).length || 0

  const stats = [
    {
      title: 'เคสเดือนนี้',
      value: monthCases || 0,
      subtitle: new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'เคสผ่าตัดที่กำลังจะถึง',
      value: pendingCases || 0,
      subtitle: 'เคสที่รอดำเนินการ',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'วัสดุยังไม่พร้อม',
      value: redCases || 0,
      subtitle: 'ต้องเตรียมของ',
      icon: AlertTriangle,
      color: redCases && redCases > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
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
