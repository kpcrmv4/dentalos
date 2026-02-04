import { Calendar, Clock, AlertTriangle, HelpCircle } from 'lucide-react'
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
    notReadyCasesResult,
    noReservationCasesResult,
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

    // Not ready cases (red OR gray - missing materials or no reservation)
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .in('traffic_light', ['red', 'gray']),

    // Cases with no reservation (gray status)
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .eq('traffic_light', 'gray'),
  ])

  const monthCases = monthCasesResult.count || 0
  const pendingCases = pendingCasesResult.count || 0
  const notReadyCases = notReadyCasesResult.count || 0
  const noReservationCases = noReservationCasesResult.count || 0

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
      value: notReadyCases,
      subtitle: 'ต้องเตรียมของ',
      icon: AlertTriangle,
      color: notReadyCases > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600',
    },
    {
      title: 'รายการที่ยังไม่จอง',
      value: noReservationCases,
      subtitle: 'รอหมอจองวัสดุ',
      icon: HelpCircle,
      color: noReservationCases > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600',
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
