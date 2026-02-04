import { Suspense } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { EmergencyAlert } from '@/components/dashboard/emergency-alert'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch cases that are not ready (red or gray)
  const { data: notReadyCases } = await supabase
    .from('cases')
    .select(`
      id,
      case_number,
      scheduled_date,
      traffic_light,
      patient:patients!cases_patient_id_fkey(full_name),
      dentist:profiles!cases_dentist_id_fkey(full_name)
    `)
    .eq('status', 'scheduled')
    .in('traffic_light', ['red', 'gray'])
    .order('scheduled_date', { ascending: true })
    .limit(5)

  // Fetch cases with no reservation (gray status)
  const { data: noReservationCases } = await supabase
    .from('cases')
    .select(`
      id,
      case_number,
      scheduled_date,
      traffic_light,
      patient:patients!cases_patient_id_fkey(full_name),
      dentist:profiles!cases_dentist_id_fkey(full_name)
    `)
    .eq('status', 'scheduled')
    .eq('traffic_light', 'gray')
    .order('scheduled_date', { ascending: true })
    .limit(5)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมการผ่าตัด</h1>
          <p className="text-slate-500">ยินดีต้อนรับ, ผู้ดูแลระบบ</p>
        </div>
      </div>

      {/* Emergency Alert - Cases within 48 hours with red status */}
      <EmergencyAlert />

      {/* Stats Cards */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Main Content Grid - Calendar with Side Panel */}
      <Suspense fallback={<CalendarSkeleton />}>
        <DashboardClient />
      </Suspense>

      {/* Bottom Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cases not ready (red or gray) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="font-semibold text-slate-900">เคสที่วัสดุยังไม่พร้อม</h3>
          </div>
          <p className="text-slate-500 text-sm">เคสที่ต้องเตรียมวัสดุหรือยังไม่ได้จอง</p>
          
          {notReadyCases && notReadyCases.length > 0 ? (
            <div className="mt-4 space-y-2">
              {notReadyCases.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/reservations/new?case_id=${c.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.traffic_light === 'red' ? 'bg-red-500' : 'bg-slate-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.case_number}</p>
                      <p className="text-xs text-slate-500">{c.patient?.full_name || 'ไม่ระบุ'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{formatDate(c.scheduled_date)}</p>
                    <p className="text-xs text-slate-400">
                      {c.traffic_light === 'red' ? 'วัสดุไม่พอ' : 'ยังไม่จอง'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center h-20 text-green-600">
              <CheckCircle className="w-8 h-8 mr-2" />
              <span>ทุกเคสพร้อมแล้ว</span>
            </div>
          )}
        </div>

        {/* Cases with no reservation */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <h3 className="font-semibold text-slate-900">รายการที่ยังไม่จอง</h3>
          </div>
          <p className="text-slate-500 text-sm">เคสที่หมอยังไม่ได้จองวัสดุ</p>
          
          {noReservationCases && noReservationCases.length > 0 ? (
            <div className="mt-4 space-y-2">
              {noReservationCases.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/reservations/new?case_id=${c.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.case_number}</p>
                      <p className="text-xs text-slate-500">{c.patient?.full_name || 'ไม่ระบุ'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{formatDate(c.scheduled_date)}</p>
                    <p className="text-xs text-slate-400">ทพ.{c.dentist?.full_name || 'ไม่ระบุ'}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center h-20 text-green-600">
              <CheckCircle className="w-8 h-8 mr-2" />
              <span>ทุกเคสจองวัสดุแล้ว</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
