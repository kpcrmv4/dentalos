'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { CreateCaseForm } from '@/components/forms/create-case-form'
import { createClient } from '@/lib/supabase/client'

type CaseItem = {
  id: string
  case_number: string
  patient_name: string
  dentist_name: string
  scheduled_date: string
  scheduled_time: string | null
  procedure_type: string | null
  traffic_light: string
  status: string
}

const trafficLightColors = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'พร้อม' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'รอของ' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'ขาด' },
}

type ViewMode = 'day' | 'week' | 'month'

export default function CalendarPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Fetch cases from Supabase
  const fetchCases = async () => {
    setLoading(true)
    const supabase = createClient()

    // Calculate date range based on view mode
    let startDate: Date
    let endDate: Date

    if (viewMode === 'day') {
      startDate = new Date(currentDate)
      endDate = new Date(currentDate)
    } else if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay()
      startDate = new Date(currentDate)
      startDate.setDate(currentDate.getDate() - dayOfWeek)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    } else {
      // month
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    }

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        scheduled_date,
        scheduled_time,
        procedure_type,
        traffic_light,
        status,
        patient:patients (
          full_name
        ),
        dentist:profiles!cases_dentist_id_fkey (
          full_name
        )
      `)
      .gte('scheduled_date', startDate.toISOString().split('T')[0])
      .lte('scheduled_date', endDate.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })

    if (!error && data) {
      const formattedCases: CaseItem[] = data.map((c: any) => ({
        id: c.id,
        case_number: c.case_number,
        patient_name: c.patient?.full_name || 'ไม่ระบุ',
        dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
        scheduled_date: c.scheduled_date,
        scheduled_time: c.scheduled_time,
        procedure_type: c.procedure_type,
        traffic_light: c.traffic_light || 'red',
        status: c.status,
      }))
      setCases(formattedCases)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCases()
  }, [viewMode, currentDate])

  const handleCreateSuccess = () => {
    fetchCases()
  }

  const navigatePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('th-TH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } else if (viewMode === 'week') {
      const dayOfWeek = currentDate.getDay()
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - dayOfWeek)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      return `${startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
    }
  }

  // Group cases by date for week/month view
  const groupCasesByDate = () => {
    const grouped: Record<string, CaseItem[]> = {}
    cases.forEach((c) => {
      if (!grouped[c.scheduled_date]) {
        grouped[c.scheduled_date] = []
      }
      grouped[c.scheduled_date].push(c)
    })
    return grouped
  }

  const formatTime = (time: string | null) => {
    if (!time) return '--:--'
    return time.substring(0, 5)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ปฏิทินเคสผ่าตัด</h1>
          <p className="text-slate-500 mt-1">จัดการนัดหมายและติดตามสถานะการเตรียมของ</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          สร้างเคสใหม่
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 min-w-[280px] text-center">
              {getDateRangeText()}
            </h2>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
            >
              วันนี้
            </button>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-2 text-sm ${viewMode === 'day' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                วัน
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 text-sm ${viewMode === 'week' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                สัปดาห์
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 text-sm ${viewMode === 'month' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                เดือน
              </button>
            </div>
          </div>
        </div>

        {/* Traffic Light Legend */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">สถานะ:</span>
          {Object.entries(trafficLightColors).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${value.dot}`} />
              <span className="text-slate-600">{value.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-500 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* Day View */}
          {viewMode === 'day' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">
                  เคสวันที่ {currentDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>
              {cases.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  ไม่มีเคสในวันนี้
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {cases.map((caseItem) => {
                    const light = trafficLightColors[caseItem.traffic_light as keyof typeof trafficLightColors] || trafficLightColors.red
                    return (
                      <div key={caseItem.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${light.dot}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{caseItem.case_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${light.bg} ${light.text}`}>
                                  {light.label}
                                </span>
                                {caseItem.status === 'completed' && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                    เสร็จสิ้น
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-0.5">
                                {caseItem.patient_name} • {caseItem.dentist_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-900">{formatTime(caseItem.scheduled_time)}</p>
                            <p className="text-sm text-slate-500">{caseItem.procedure_type || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              {(() => {
                const dayOfWeek = currentDate.getDay()
                const startOfWeek = new Date(currentDate)
                startOfWeek.setDate(currentDate.getDate() - dayOfWeek)
                const weekDays = []
                for (let i = 0; i < 7; i++) {
                  const day = new Date(startOfWeek)
                  day.setDate(startOfWeek.getDate() + i)
                  weekDays.push(day)
                }
                const groupedCases = groupCasesByDate()

                return (
                  <div className="grid grid-cols-7 divide-x divide-slate-200">
                    {weekDays.map((day, index) => {
                      const dateStr = day.toISOString().split('T')[0]
                      const dayCases = groupedCases[dateStr] || []
                      const isToday = day.toDateString() === new Date().toDateString()

                      return (
                        <div key={index} className={`min-h-[400px] ${isToday ? 'bg-indigo-50/50' : ''}`}>
                          <div className={`p-2 text-center border-b border-slate-200 ${isToday ? 'bg-indigo-100' : 'bg-slate-50'}`}>
                            <div className="text-xs text-slate-500">
                              {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][day.getDay()]}
                            </div>
                            <div className={`text-lg font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                              {day.getDate()}
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            {dayCases.map((c) => {
                              const light = trafficLightColors[c.traffic_light as keyof typeof trafficLightColors] || trafficLightColors.red
                              return (
                                <div
                                  key={c.id}
                                  className={`p-2 rounded-lg text-xs ${light.bg} cursor-pointer hover:opacity-80`}
                                >
                                  <div className="font-medium">{formatTime(c.scheduled_time)}</div>
                                  <div className="truncate">{c.case_number}</div>
                                  <div className="truncate text-slate-600">{c.patient_name}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              {(() => {
                const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                const startDayOfWeek = firstDay.getDay()
                const daysInMonth = lastDay.getDate()
                const groupedCases = groupCasesByDate()

                const calendarDays: (Date | null)[] = []
                for (let i = 0; i < startDayOfWeek; i++) {
                  calendarDays.push(null)
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))
                }

                return (
                  <>
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                      {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-slate-600">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                      {calendarDays.map((day, index) => {
                        if (!day) {
                          return <div key={index} className="min-h-[100px] bg-slate-50/50" />
                        }
                        const dateStr = day.toISOString().split('T')[0]
                        const dayCases = groupedCases[dateStr] || []
                        const isToday = day.toDateString() === new Date().toDateString()

                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] p-2 ${isToday ? 'bg-indigo-50' : ''}`}
                          >
                            <div className={`text-sm font-medium mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-900'}`}>
                              {day.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayCases.slice(0, 3).map((c) => {
                                const light = trafficLightColors[c.traffic_light as keyof typeof trafficLightColors] || trafficLightColors.red
                                return (
                                  <div
                                    key={c.id}
                                    className={`px-1.5 py-0.5 rounded text-xs truncate ${light.bg} ${light.text}`}
                                  >
                                    {c.case_number}
                                  </div>
                                )
                              })}
                              {dayCases.length > 3 && (
                                <div className="text-xs text-slate-500">
                                  +{dayCases.length - 3} เคส
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </>
      )}

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900">{cases.length}</p>
            <p className="text-sm text-slate-500">เคสทั้งหมด</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">
              {cases.filter((c) => c.traffic_light === 'green').length}
            </p>
            <p className="text-sm text-slate-500">พร้อม</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {cases.filter((c) => c.traffic_light === 'yellow').length}
            </p>
            <p className="text-sm text-slate-500">รอของ</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {cases.filter((c) => c.traffic_light === 'red').length}
            </p>
            <p className="text-sm text-slate-500">ขาด</p>
          </div>
        </div>
      </div>

      {/* Create Case Modal */}
      <CreateCaseForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
