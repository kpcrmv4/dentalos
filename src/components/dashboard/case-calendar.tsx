'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Calendar, User, Package, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type CaseData = {
  id: string
  case_number: string
  scheduled_date: string
  traffic_light: string
  status: string
  patient: { full_name: string } | null
  dentist: { full_name: string } | null
}

export function CaseCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cases, setCases] = useState<CaseData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Fetch cases when month changes
  useEffect(() => {
    fetchCases()
  }, [year, month])

  const fetchCases = async () => {
    setLoading(true)
    const supabase = createClient()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const { data: casesData, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        scheduled_date,
        traffic_light,
        status,
        patient:patients (
          full_name
        ),
        dentist:profiles!cases_dentist_id_fkey (
          full_name
        )
      `)
      .gte('scheduled_date', firstDay.toISOString().split('T')[0])
      .lte('scheduled_date', lastDay.toISOString().split('T')[0])
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('scheduled_date', { ascending: true })

    if (error) {
      console.error('Error fetching cases:', error)
    } else {
      setCases((casesData || []) as unknown as CaseData[])
    }
    setLoading(false)
  }

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(new Date().getDate())
  }

  // Handle day click
  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    setShowModal(true)
  }

  // Create calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Group cases by date
  const casesByDate: Record<number, CaseData[]> = {}
  cases.forEach((c) => {
    const day = new Date(c.scheduled_date).getDate()
    if (!casesByDate[day]) casesByDate[day] = []
    casesByDate[day].push(c)
  })

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  // Get selected day cases
  const selectedDayCases = selectedDay ? casesByDate[selectedDay] || [] : []

  // Traffic light colors
  const getTrafficLightColor = (light: string) => {
    switch (light) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-amber-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-slate-300'
    }
  }

  const getTrafficLightText = (light: string) => {
    switch (light) {
      case 'green': return 'วัสดุพร้อม'
      case 'yellow': return 'รอยืนยัน'
      case 'red': return 'วัสดุไม่พร้อม'
      default: return 'ไม่ระบุ'
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <h3 className="font-semibold text-slate-900">ปฏิทินเคสผ่าตัด</h3>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={goToToday}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              วันนี้
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                พร้อม
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                รอยืนยัน
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                ไม่พร้อม
              </span>
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <button 
            onClick={goToPrevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="font-medium text-slate-900">{monthName}</span>
          <button 
            onClick={goToNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day, idx) => (
                  <div
                    key={day}
                    className={`text-center text-xs font-medium py-2 ${
                      idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const isToday = isCurrentMonth && day === today.getDate()
                  const isSelected = day === selectedDay
                  const dayCases = day ? casesByDate[day] || [] : []
                  const hasGreen = dayCases.some((c) => c.traffic_light === 'green')
                  const hasRed = dayCases.some((c) => c.traffic_light === 'red')
                  const hasYellow = dayCases.some((c) => c.traffic_light === 'yellow')
                  const dayOfWeek = (startDayOfWeek + (day || 0) - 1) % 7

                  return (
                    <div
                      key={index}
                      onClick={() => day && handleDayClick(day)}
                      className={`
                        relative min-h-[70px] p-1 rounded-lg text-center transition-all
                        ${day ? 'hover:bg-slate-100 cursor-pointer' : ''}
                        ${isToday ? 'bg-indigo-50 ring-2 ring-indigo-500' : ''}
                        ${isSelected && !isToday ? 'bg-slate-100 ring-2 ring-slate-400' : ''}
                      `}
                    >
                      {day && (
                        <>
                          <span
                            className={`
                              text-sm font-medium
                              ${isToday ? 'text-indigo-600 font-bold' : ''}
                              ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-slate-700'}
                            `}
                          >
                            {day}
                          </span>

                          {/* Traffic light indicators */}
                          {dayCases.length > 0 && (
                            <div className="flex justify-center gap-0.5 mt-1">
                              {hasGreen && (
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                              )}
                              {hasYellow && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                              )}
                              {hasRed && (
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                              )}
                            </div>
                          )}

                          {/* Case count badge */}
                          {dayCases.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                              {dayCases.length} เคส
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              รวมเคสเดือนนี้: <span className="font-semibold text-slate-900">{cases.length} เคส</span>
            </span>
            <span className="text-slate-500">
              คลิกที่วันที่เพื่อดูรายละเอียด
            </span>
          </div>
        </div>
      </div>

      {/* Case Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">
                  เคสวันที่ {selectedDay} {monthName}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedDayCases.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>ไม่มีเคสในวันนี้</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs text-slate-500 font-mono">
                            {caseItem.case_number}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-900">
                              {caseItem.patient?.full_name || 'ไม่ระบุชื่อ'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${getTrafficLightColor(caseItem.traffic_light)}`} />
                          <span className="text-xs text-slate-600">
                            {getTrafficLightText(caseItem.traffic_light)}
                          </span>
                        </div>
                      </div>
                      
                      {caseItem.dentist && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span>ทันตแพทย์: {caseItem.dentist.full_name}</span>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <a
                          href={`/cases/${caseItem.id}/execute`}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          ดูรายละเอียดเคส →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
