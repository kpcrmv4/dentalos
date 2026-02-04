import { createClient } from '@/lib/supabase/server'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export async function CaseCalendar() {
  const supabase = await createClient()

  // Get current month
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // Get first and last day of month
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Get cases for this month
  const { data: cases } = await supabase
    .from('cases')
    .select('id, scheduled_date, traffic_light, patient:patients(full_name)')
    .gte('scheduled_date', firstDay.toISOString().split('T')[0])
    .lte('scheduled_date', lastDay.toISOString().split('T')[0])

  // Create calendar grid
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarDays: (number | null)[] = []

  // Add empty cells for days before the first day
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Group cases by date
  const casesByDate: Record<number, typeof cases> = {}
  cases?.forEach((c) => {
    const day = new Date(c.scheduled_date).getDate()
    if (!casesByDate[day]) casesByDate[day] = []
    casesByDate[day].push(c)
  })

  const monthName = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-semibold text-slate-900">ปฏิทินเคสผ่าตัด</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              วัสดุพร้อม
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              วัสดุไม่พร้อม
            </span>
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button className="p-1 hover:bg-slate-100 rounded">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="font-medium text-slate-900">{monthName}</span>
        <button className="p-1 hover:bg-slate-100 rounded">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isToday = day === now.getDate()
            const dayCases = day ? casesByDate[day] : []
            const hasGreen = dayCases?.some((c) => c.traffic_light === 'green')
            const hasRed = dayCases?.some((c) => c.traffic_light === 'red')
            const hasYellow = dayCases?.some((c) => c.traffic_light === 'yellow')

            return (
              <div
                key={index}
                className={`
                  relative min-h-[60px] p-1 rounded-lg text-center
                  ${day ? 'hover:bg-slate-50 cursor-pointer' : ''}
                  ${isToday ? 'bg-indigo-50 ring-2 ring-indigo-500' : ''}
                `}
              >
                {day && (
                  <>
                    <span
                      className={`
                        text-sm
                        ${isToday ? 'font-bold text-indigo-600' : 'text-slate-700'}
                      `}
                    >
                      {day}
                    </span>

                    {/* Traffic light indicators */}
                    {dayCases && dayCases.length > 0 && (
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
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
