'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, X, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'

interface EmergencyCase {
  id: string
  case_number: string
  scheduled_date: string
  scheduled_time: string | null
  patient_name: string
  dentist_name: string
  hours_until: number
}

export function EmergencyAlert() {
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCase[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEmergencyCases()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEmergencyCases, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchEmergencyCases = async () => {
    const supabase = createClient()
    
    // Get cases within 48 hours that are still red (not ready)
    const now = new Date()
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        scheduled_date,
        scheduled_time,
        traffic_light,
        patient:patients(name),
        dentist:profiles!cases_dentist_id_fkey(full_name)
      `)
      .eq('traffic_light', 'red')
      .eq('status', 'scheduled')
      .gte('scheduled_date', now.toISOString().split('T')[0])
      .lte('scheduled_date', in48Hours.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: false })

    if (!error && data) {
      const casesWithHours = data.map((c: any) => {
        const caseDateTime = new Date(`${c.scheduled_date}T${c.scheduled_time || '09:00:00'}`)
        const hoursUntil = Math.max(0, Math.floor((caseDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)))
        
        return {
          id: c.id,
          case_number: c.case_number,
          scheduled_date: c.scheduled_date,
          scheduled_time: c.scheduled_time,
          patient_name: c.patient?.name || 'ไม่ระบุ',
          dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
          hours_until: hoursUntil
        }
      }).filter((c: EmergencyCase) => c.hours_until <= 48)

      setEmergencyCases(casesWithHours)
    }
    
    setIsLoading(false)
  }

  if (isLoading || emergencyCases.length === 0 || !isVisible) {
    return null
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 animate-pulse-slow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              แจ้งเตือนฉุกเฉิน
              <span className="px-2 py-0.5 text-xs bg-red-600 text-white rounded-full">
                {emergencyCases.length} เคส
              </span>
            </h3>
            <p className="text-sm text-red-700 mt-1">
              มีเคสที่วัสดุยังไม่พร้อมภายใน 48 ชั่วโมง
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-red-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-red-600" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {emergencyCases.slice(0, 5).map((c) => (
          <Link
            key={c.id}
            href={`/cases/${c.id}/execute`}
            className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-lg hover:border-red-300 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-red-600">
                <Clock className="w-4 h-4" />
                <span className="font-semibold text-sm">
                  {c.hours_until < 24 
                    ? `${c.hours_until} ชม.` 
                    : `${Math.floor(c.hours_until / 24)} วัน`}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{c.case_number}</p>
                <p className="text-sm text-slate-500">
                  {c.patient_name} • ทพ.{c.dentist_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {formatDate(c.scheduled_date)} {formatTime(c.scheduled_time)}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
            </div>
          </Link>
        ))}
        
        {emergencyCases.length > 5 && (
          <p className="text-center text-sm text-red-600 pt-2">
            และอีก {emergencyCases.length - 5} เคส
          </p>
        )}
      </div>
    </div>
  )
}
