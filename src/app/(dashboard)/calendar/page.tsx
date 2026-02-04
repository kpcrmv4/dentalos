'use client'

import { useState } from 'react'
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { CreateCaseForm } from '@/components/forms/create-case-form'

// Mock data for cases
const mockCases = [
  {
    id: '1',
    case_number: 'C2026-0001',
    patient_name: 'คุณสมศักดิ์ ใจดี',
    dentist_name: 'ทพ.วิชัย',
    scheduled_date: '2026-02-04',
    scheduled_time: '09:00',
    procedure_type: 'Implant Placement',
    traffic_light: 'green',
    status: 'scheduled',
  },
  {
    id: '2',
    case_number: 'C2026-0002',
    patient_name: 'คุณมาลี สุขใจ',
    dentist_name: 'ทพ.สมหญิง',
    scheduled_date: '2026-02-04',
    scheduled_time: '13:00',
    procedure_type: 'Bone Graft',
    traffic_light: 'yellow',
    status: 'scheduled',
  },
  {
    id: '3',
    case_number: 'C2026-0003',
    patient_name: 'คุณประสิทธิ์ มั่นคง',
    dentist_name: 'ทพ.วิชัย',
    scheduled_date: '2026-02-05',
    scheduled_time: '10:00',
    procedure_type: 'Implant Placement',
    traffic_light: 'red',
    status: 'scheduled',
  },
]

const trafficLightColors = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'พร้อม' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'รอของ' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'ขาด' },
}

export default function CalendarPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const today = new Date()
  const currentMonth = today.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })

  const handleCreateSuccess = () => {
    alert('สร้างเคสสำเร็จ!')
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
            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900">{currentMonth}</h2>
            <button className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              <Filter className="w-4 h-4" />
              กรอง
            </button>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button className="px-3 py-2 bg-indigo-50 text-indigo-600 font-medium">วัน</button>
              <button className="px-3 py-2 text-slate-600 hover:bg-slate-50">สัปดาห์</button>
              <button className="px-3 py-2 text-slate-600 hover:bg-slate-50">เดือน</button>
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

      {/* Cases List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">เคสวันนี้</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {mockCases.map((caseItem) => {
            const light = trafficLightColors[caseItem.traffic_light as keyof typeof trafficLightColors]
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
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {caseItem.patient_name} • {caseItem.dentist_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900">{caseItem.scheduled_time}</p>
                    <p className="text-sm text-slate-500">{caseItem.procedure_type}</p>
                  </div>
                </div>
              </div>
            )
          })}
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
