import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { CaseCalendar } from '@/components/dashboard/case-calendar'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
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
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <RefreshIcon className="w-4 h-4" />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - 2 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<CalendarSkeleton />}>
            <CaseCalendar />
          </Suspense>
        </div>

        {/* Alerts Panel - 1 column */}
        <div>
          <Suspense fallback={<AlertsSkeleton />}>
            <AlertsPanel />
          </Suspense>
        </div>
      </div>

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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
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
  return <Skeleton className="h-96 rounded-xl" />
}

function AlertsSkeleton() {
  return <Skeleton className="h-96 rounded-xl" />
}
