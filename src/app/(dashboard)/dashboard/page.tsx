import { Suspense } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { Skeleton } from '@/components/ui/skeleton'

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมการผ่าตัดและสต็อก</h1>
          <p className="text-slate-500">ยินดีต้อนรับ, ผู้ดูแลระบบ</p>
        </div>
      </div>

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
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <h3 className="font-semibold text-slate-900">เคสที่วัสดุยังไม่พร้อม</h3>
          </div>
          <p className="text-slate-500 text-sm">เคสที่ต้องเตรียมวัสดุเพิ่ม</p>
          <div className="mt-4 flex items-center justify-center h-20 text-green-600">
            <CheckCircle className="w-8 h-8 mr-2" />
            <span>ทุกเคสพร้อมแล้ว</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-semibold text-slate-900">รายการที่ใกล้หมด</h3>
          </div>
          <p className="text-slate-500 text-sm">รายการที่ต่ำกว่าเกณฑ์ขั้นต่ำ</p>
          <div className="mt-4 space-y-2">
            {/* This will be populated from database */}
          </div>
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
