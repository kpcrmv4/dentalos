'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  ClipboardList, 
  Camera, 
  Check, 
  Clock, 
  Package, 
  User, 
  Calendar,
  ChevronRight,
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Button } from '@/components/ui/modal'

interface TaskItem {
  id: string
  product_name: string
  product_sku: string | null
  product_size: string | null
  quantity: number
  lot_number: string
  location: string | null
  status: 'pending' | 'picked' | 'used'
}

interface Task {
  id: string
  case_id: string
  case_number: string
  patient_name: string
  dentist_name: string | null
  scheduled_date: string
  scheduled_time: string | null
  status: 'pending' | 'in_progress' | 'completed'
  items: TaskItem[]
  photo_evidence: string | null
}

interface Stats {
  pending: number
  inProgress: number
  completed: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, inProgress: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTasks = async () => {
    setLoading(true)
    const supabase = createClient()

    // Fetch reservations for today's cases
    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        scheduled_date,
        scheduled_time,
        status,
        photo_evidence,
        patient:patients!inner (
          full_name
        ),
        dentist:profiles!cases_dentist_id_fkey (
          full_name
        ),
        reservations (
          id,
          quantity,
          status,
          stock_item:stock_items!inner (
            id,
            lot_number,
            location,
            product:products!inner (
              name,
              sku,
              size
            )
          )
        )
      `)
      .eq('scheduled_date', dateFilter)
      .in('status', ['confirmed', 'in_progress', 'completed'])
      .order('scheduled_time', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
      return
    }

    // Transform data to Task format
    const transformedTasks: Task[] = (data || []).map((caseData: any) => {
      const items: TaskItem[] = (caseData.reservations || []).map((res: any) => ({
        id: res.id,
        product_name: res.stock_item?.product?.name || 'ไม่ระบุ',
        product_sku: res.stock_item?.product?.sku,
        product_size: res.stock_item?.product?.size,
        quantity: res.quantity,
        lot_number: res.stock_item?.lot_number || '-',
        location: res.stock_item?.location,
        status: res.status === 'used' ? 'used' : res.status === 'reserved' ? 'picked' : 'pending',
      }))

      let taskStatus: 'pending' | 'in_progress' | 'completed' = 'pending'
      if (caseData.status === 'completed') {
        taskStatus = 'completed'
      } else if (items.some((i: TaskItem) => i.status === 'picked' || i.status === 'used')) {
        taskStatus = 'in_progress'
      }

      return {
        id: caseData.id,
        case_id: caseData.id,
        case_number: caseData.case_number,
        patient_name: caseData.patient?.full_name || 'ไม่ระบุ',
        dentist_name: caseData.dentist?.full_name || null,
        scheduled_date: caseData.scheduled_date,
        scheduled_time: caseData.scheduled_time,
        status: taskStatus,
        items,
        photo_evidence: caseData.photo_evidence,
      }
    })

    setTasks(transformedTasks)

    // Calculate stats
    const pending = transformedTasks.filter(t => t.status === 'pending').length
    const inProgress = transformedTasks.filter(t => t.status === 'in_progress').length
    const completed = transformedTasks.filter(t => t.status === 'completed').length
    setStats({ pending, inProgress, completed })

    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [dateFilter])

  const handleOpenTask = (task: Task) => {
    setSelectedTask(task)
    setIsDetailModalOpen(true)
  }

  const handlePickItem = async (item: TaskItem) => {
    if (!selectedTask) return

    const supabase = createClient()
    
    // Update reservation status to reserved (picked)
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'reserved' } as never)
      .eq('id', item.id)

    if (error) {
      console.error('Error picking item:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }

    // Update local state
    setSelectedTask({
      ...selectedTask,
      items: selectedTask.items.map(i => 
        i.id === item.id ? { ...i, status: 'picked' } : i
      ),
      status: 'in_progress',
    })

    fetchTasks()
  }

  const handleUseItem = async (item: TaskItem) => {
    if (!selectedTask) return

    const supabase = createClient()
    
    // Update reservation status to used
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({ 
        status: 'used',
        used_at: new Date().toISOString()
      } as never)
      .eq('id', item.id)

    if (reservationError) {
      console.error('Error using item:', reservationError)
      alert('เกิดข้อผิดพลาด')
      return
    }

    // Update local state
    setSelectedTask({
      ...selectedTask,
      items: selectedTask.items.map(i => 
        i.id === item.id ? { ...i, status: 'used' } : i
      ),
    })

    // Create notification
    await supabase.from('notifications').insert({
      type: 'stock_used',
      title: 'ตัดสต็อกสำเร็จ',
      message: `ตัดสต็อก ${item.product_name} จำนวน ${item.quantity} ชิ้น สำหรับเคส ${selectedTask.case_number}`,
      data: { 
        case_id: selectedTask.case_id,
        case_number: selectedTask.case_number,
        product_name: item.product_name,
      },
      target_roles: ['inventory'],
    } as never)

    fetchTasks()
  }

  const handleOpenPhotoModal = () => {
    setIsPhotoModalOpen(true)
    setPhotoPreview(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCapturePhoto = () => {
    fileInputRef.current?.click()
  }

  const handleUploadPhoto = async () => {
    if (!selectedTask || !photoPreview) return

    setUploading(true)
    const supabase = createClient()

    try {
      // Convert base64 to blob
      const response = await fetch(photoPreview)
      const blob = await response.blob()
      
      // Upload to Supabase Storage
      const fileName = `case-evidence/${selectedTask.case_id}/${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
        setUploading(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)

      // Update case with photo evidence
      const { error: updateError } = await supabase
        .from('cases')
        .update({ photo_evidence: publicUrl } as never)
        .eq('id', selectedTask.case_id)

      if (updateError) {
        console.error('Update error:', updateError)
        alert('เกิดข้อผิดพลาดในการบันทึก')
        setUploading(false)
        return
      }

      // Update local state
      setSelectedTask({
        ...selectedTask,
        photo_evidence: publicUrl,
      })

      setIsPhotoModalOpen(false)
      setPhotoPreview(null)
      fetchTasks()
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('เกิดข้อผิดพลาด')
    } finally {
      setUploading(false)
    }
  }

  const handleCompleteTask = async () => {
    if (!selectedTask) return

    // Check if all items are used
    const allUsed = selectedTask.items.every(i => i.status === 'used')
    if (!allUsed) {
      alert('กรุณาตัดสต็อกให้ครบทุกรายการก่อน')
      return
    }

    // Check if photo evidence is uploaded
    if (!selectedTask.photo_evidence) {
      const proceed = confirm('ยังไม่ได้อัปโหลดรูปหลักฐาน ต้องการดำเนินการต่อหรือไม่?')
      if (!proceed) return
    }

    const supabase = createClient()
    
    // Update case status to completed
    const { error } = await supabase
      .from('cases')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      } as never)
      .eq('id', selectedTask.case_id)

    if (error) {
      console.error('Error completing task:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }

    // Create notification
    await supabase.from('notifications').insert({
      type: 'case_completed',
      title: 'เคสเสร็จสิ้น',
      message: `เคส ${selectedTask.case_number} (${selectedTask.patient_name}) เสร็จสิ้นแล้ว`,
      data: { 
        case_id: selectedTask.case_id,
        case_number: selectedTask.case_number,
      },
      target_roles: ['cs', 'dentist', 'admin'],
    } as never)

    setIsDetailModalOpen(false)
    setSelectedTask(null)
    fetchTasks()
  }

  const formatTime = (time: string | null) => {
    if (!time) return '-'
    return time.substring(0, 5)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">รอดำเนินการ</span>
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">กำลังดำเนินการ</span>
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">เสร็จสิ้น</span>
      default:
        return null
    }
  }

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">รอหยิบ</span>
      case 'picked':
        return <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">หยิบแล้ว</span>
      case 'used':
        return <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">ตัดสต็อกแล้ว</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">งานวันนี้</h1>
          <p className="text-slate-500 mt-1">รายการเคสและการจัดเตรียมวัสดุ</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Stats Cards - Mobile Friendly */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            <p className="text-xs text-slate-500">รอดำเนินการ</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
            <p className="text-xs text-slate-500">กำลังทำ</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">เสร็จสิ้น</p>
          </div>
        </div>
      </div>

      {/* Task List - Mobile Optimized */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">ไม่มีงานในวันที่เลือก</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleOpenTask(task)}
              className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:border-indigo-300 transition-colors ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-indigo-600">{task.case_number}</span>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <User className="w-4 h-4" />
                    <span>{task.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(task.scheduled_time)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>{task.items.length} รายการ</span>
                    </div>
                    {task.photo_evidence && (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <ImageIcon className="w-4 h-4" />
                        <span>มีรูป</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`เคส ${selectedTask?.case_number || ''}`}
        size="lg"
      >
        {selectedTask && (
          <div className="p-4 space-y-4">
            {/* Case Info */}
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-indigo-600 mb-1">คนไข้</p>
                  <p className="font-medium text-indigo-900">{selectedTask.patient_name}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 mb-1">ทันตแพทย์</p>
                  <p className="font-medium text-indigo-900">{selectedTask.dentist_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 mb-1">เวลานัด</p>
                  <p className="font-medium text-indigo-900">{formatTime(selectedTask.scheduled_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-600 mb-1">สถานะ</p>
                  {getStatusBadge(selectedTask.status)}
                </div>
              </div>
            </div>

            {/* Picking List */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5" />
                รายการวัสดุ (Picking List)
              </h3>
              <div className="space-y-2">
                {selectedTask.items.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 ${
                      item.status === 'used' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : item.status === 'picked'
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">{item.product_name}</p>
                          {getItemStatusBadge(item.status)}
                        </div>
                        <div className="text-sm text-slate-500 space-y-1">
                          {item.product_size && <p>ขนาด: {item.product_size}</p>}
                          <p>LOT: {item.lot_number}</p>
                          {item.location && <p>ตำแหน่ง: <span className="font-medium text-indigo-600">{item.location}</span></p>}
                          <p>จำนวน: <span className="font-bold text-slate-900">{item.quantity}</span> ชิ้น</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handlePickItem(item)}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                          >
                            หยิบ
                          </button>
                        )}
                        {item.status === 'picked' && (
                          <button
                            onClick={() => handleUseItem(item)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                          >
                            ตัดสต็อก
                          </button>
                        )}
                        {item.status === 'used' && (
                          <CheckCircle className="w-6 h-6 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo Evidence Section */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                รูปหลักฐาน
              </h3>
              {selectedTask.photo_evidence ? (
                <div className="relative">
                  <img
                    src={selectedTask.photo_evidence}
                    alt="หลักฐานการใช้วัสดุ"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={handleOpenPhotoModal}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 text-slate-700 text-sm rounded-lg hover:bg-white"
                  >
                    เปลี่ยนรูป
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOpenPhotoModal}
                  className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Camera className="w-8 h-8" />
                  <span>ถ่ายรูปหลักฐาน</span>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)} className="flex-1">
                ปิด
              </Button>
              {selectedTask.status !== 'completed' && (
                <Button onClick={handleCompleteTask} className="flex-1">
                  เสร็จสิ้นเคส
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Photo Capture Modal */}
      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="ถ่ายรูปหลักฐาน"
        size="md"
      >
        <div className="p-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleCapturePhoto}
              className="w-full h-64 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Camera className="w-12 h-12" />
              <span className="text-lg">แตะเพื่อถ่ายรูป</span>
              <span className="text-sm">หรือเลือกจากคลังรูปภาพ</span>
            </button>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">คำแนะนำการถ่ายรูป</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>ถ่ายให้เห็นวัสดุที่ใช้ชัดเจน</li>
                <li>รวมรหัส LOT ในภาพถ้าเป็นไปได้</li>
                <li>ถ่ายในที่มีแสงสว่างเพียงพอ</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setIsPhotoModalOpen(false)} className="flex-1">
              ยกเลิก
            </Button>
            <Button 
              onClick={handleUploadPhoto} 
              disabled={!photoPreview || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  กำลังอัปโหลด...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  บันทึกรูป
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
