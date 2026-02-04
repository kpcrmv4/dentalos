import { Calendar, Clock, AlertTriangle, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function StatsCards() {
  const supabase = await createClient()

  // Get current month boundaries
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Fetch all stats in parallel
  const [
    monthCasesResult,
    pendingCasesResult,
    redCasesResult,
    lowStockResult,
  ] = await Promise.all([
    // Cases this month
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endOfMonth),

    // Pending cases (scheduled and upcoming)
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_date', now.toISOString().split('T')[0]),

    // Red light cases (missing materials)
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .eq('traffic_light', 'red'),

    // Low stock items (quantity - reserved_quantity <= reorder_point)
    supabase
      .from('stock_items')
      .select(`
        id,
        quantity,
        reserved_quantity,
        product:products!inner (
          reorder_point
        )
      `)
      .eq('status', 'active'),
  ])

  // Calculate low stock count
  const stockItems = (lowStockResult.data || []) as unknown as {
    id: string
    quantity: number
    reserved_quantity: number
    product: { reorder_point: number }
  }[]
  const lowStockCount = stockItems.filter(item => {
    const available = item.quantity - item.reserved_quantity
    const reorderPoint = item.product?.reorder_point || 5
    return available <= reorderPoint
  }).length

  const monthCases = monthCasesResult.count || 0
  const pendingCases = pendingCasesResult.count || 0
  const redCases = redCasesResult.count || 0

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
